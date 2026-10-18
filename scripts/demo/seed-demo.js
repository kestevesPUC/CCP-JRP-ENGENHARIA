'use strict';
// Cria um banco de DEMONSTRAÇÃO (dados fictícios) para apresentações e capturas de tela.
// Uso: node scripts/demo/seed-demo.js <arquivo.sqlite>
// Usuários: ADMIN (A), MARIA (B), JOAO (C) — senha Demo1234 — e EXEMPLO (senha provisória Provisoria1, exige troca).
const fs = require('node:fs');
const path = require('node:path');
const { buildApplication } = require('../../src/compositionRoot');

const target = process.argv[2];
if (!target) {
  console.error('Uso: node scripts/demo/seed-demo.js <arquivo.sqlite>');
  process.exit(1);
}
fs.rmSync(target, { force: true });
fs.rmSync(`${target}-wal`, { force: true });
fs.rmSync(`${target}-shm`, { force: true });

/** Gera um CNPJ numérico válido a partir de 8 dígitos-base (filial 0001). */
function cnpj(base) {
  const digits = `${String(base).padStart(8, '0')}0001`.split('').map(Number);
  const dv = (list, weights) => { const r = list.reduce((s, n, i) => s + n * weights[i], 0) % 11; return r < 2 ? 0 : 11 - r; };
  digits.push(dv(digits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
  digits.push(dv(digits, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
  const s = digits.join('');
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`;
}

const iso = (offsetDays) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

(async () => {
  const app = buildApplication({ dbFile: target, logger: { error() {} } });
  const { usuarios } = app.repositories;
  const hash = (p) => app.hasher.hash(p);
  usuarios.create({ usuario: 'ADMIN', nivel: 'A', senha: hash('Demo1234'), mustChange: false });
  usuarios.create({ usuario: 'MARIA', nivel: 'B', senha: hash('Demo1234'), mustChange: false });
  usuarios.create({ usuario: 'JOAO', nivel: 'C', senha: hash('Demo1234'), mustChange: false });
  usuarios.create({ usuario: 'EXEMPLO', nivel: 'B', senha: hash('Provisoria1'), mustChange: true });

  const { port } = await app.httpServer.listen(0);
  const base = `http://127.0.0.1:${port}`;
  let cookie = '';
  const call = async (method, url, body) => {
    const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${method} ${url}: ${json.error}`);
    return json;
  };
  await call('POST', '/api/login', { usuario: 'ADMIN', senha: 'Demo1234' });

  const names = [
    ['ACME MATERIAIS DE CONSTRUCAO LTDA', 'BELO HORIZONTE', 'MG'], ['ALFA CONCRETO USINADO S/A', 'CONTAGEM', 'MG'], ['BETA ACO E FERRAGENS LTDA', 'BETIM', 'MG'],
    ['GAMA LOCACAO DE EQUIPAMENTOS', 'BELO HORIZONTE', 'MG'], ['DELTA ELETRICA E HIDRAULICA', 'NOVA LIMA', 'MG'], ['OMEGA TRANSPORTES E LOGISTICA', 'SETE LAGOAS', 'MG'],
    ['SIGMA TOPOGRAFIA E PROJETOS', 'BELO HORIZONTE', 'MG'], ['PRIME PAPELARIA E ESCRITORIO', 'BELO HORIZONTE', 'MG'], ['VISTA CORRETORA DE SEGUROS', 'SAO PAULO', 'SP'],
    ['RIO DE AREIA E BRITA LTDA', 'SANTA LUZIA', 'MG'], ['MADEIREIRA PINHEIRO', 'IBIRITE', 'MG'], ['TECNO SISTEMAS E SOFTWARE', 'BELO HORIZONTE', 'MG'],
  ];
  const fornecedores = [];
  for (const [i, [nome, cida, esta]] of names.entries()) {
    fornecedores.push(await call('POST', '/api/fornecedores', { nome, cida, esta, pess: 'J', cgc: cnpj(11_000_000 + i * 137_731), fone: `(31) 3${200 + i}-${1000 + i * 37}`, ende: `RUA EXEMPLO, ${100 + i * 12}`, bair: 'CENTRO', cep: '30000-000' }));
  }
  const naturezas = [];
  for (const nome of ['BOLETO', 'CARTEIRA', 'CARTAO', 'CHEQUE', 'DEBITO EM CONTA', 'PIX']) naturezas.push(await call('POST', '/api/naturezas', { nome }));
  const centros = [];
  for (const nome of ['OBRA RESIDENCIAL ALPHA', 'OBRA COMERCIAL BETA', 'ESCRITORIO', 'FROTA E EQUIPAMENTOS']) centros.push(await call('POST', '/api/centros', { nome }));

  const histos = ['COMPRA DE CIMENTO', 'CONCRETO FCK 30', 'VERGALHOES CA-50', 'LOCACAO DE ANDAIME', 'MATERIAL ELETRICO', 'FRETE DE MATERIAIS', 'LEVANTAMENTO TOPOGRAFICO', 'MATERIAL DE ESCRITORIO', 'SEGURO DE OBRA', 'AREIA E BRITA', 'MADEIRA PARA FORMAS', 'LICENCAS DE SOFTWARE'];
  let seq = 1000;
  const addTitle = async ({ f, venc, valor, centro = 0, split = false, paga = null, juros = 0 }) => {
    const rateio = split
      ? [{ cc: centros[0].id, valor: Math.round(valor * 60) / 100 }, { cc: centros[1].id, valor: Math.round((valor - Math.round(valor * 60) / 100) * 100) / 100 }]
      : [{ cc: centros[centro].id, valor }];
    const t = await call('POST', '/api/titulos', {
      codig: fornecedores[f].id, docum: `NF${seq++}`, histo: histos[f % histos.length], dtvec: venc, dtemi: iso(-40), valor, natur: naturezas[f % naturezas.length].id, local: 'BOLETO', rateio,
    });
    if (paga) await call('POST', `/api/titulos/${t.id}/baixa`, { dtpag: paga, receb: Math.round((valor + juros) * 100) / 100, juros, desco: 0, banco: 'BANCO DO BRASIL', vrche: Math.round((valor + juros) * 100) / 100 });
    return t;
  };

  // Vencidos (diferentes faixas de atraso)
  for (const [f, d, v] of [[0, -5, 3250.9], [2, -12, 8120], [4, -25, 1480.5], [1, -40, 15600], [5, -70, 2290], [9, -101, 4780.25]]) await addTitle({ f, venc: iso(d), valor: v, centro: f % 4, split: f === 1 });
  // Vencem hoje e nos próximos 7 dias
  for (const [f, d, v] of [[3, 0, 5400], [6, 0, 1250.4], [7, 2, 380.9], [8, 4, 2150], [10, 6, 9800]]) await addTitle({ f, venc: iso(d), valor: v, centro: f % 4, split: f === 10 });
  // Meses seguintes
  const futuros = [[11, 20, 890], [0, 28, 6420], [1, 35, 22800], [2, 42, 7350.6], [3, 48, 5400], [4, 55, 3180], [5, 63, 4100], [9, 70, 2750], [10, 78, 11200], [1, 92, 18500], [2, 105, 8900], [6, 118, 3600]];
  for (const [f, d, v] of futuros) await addTitle({ f, venc: iso(d), valor: v, centro: f % 4, split: f % 5 === 0 });
  // Pagos nos últimos meses (alguns com juros)
  const pagos = [[0, -150, 4200, 0], [1, -140, 12500, 0], [2, -120, 6800, 65.5], [3, -110, 5400, 0], [4, -95, 3300, 0], [5, -88, 2100, 18.9], [6, -75, 1900, 0], [7, -66, 450, 0], [8, -55, 2300, 0], [9, -48, 5100, 41.2],
    [10, -40, 9100, 0], [11, -34, 980, 0], [0, -28, 7700, 120], [1, -21, 14300, 0], [3, -15, 5400, 0], [2, -9, 6100, 35]];
  for (const [f, d, v, j] of pagos) await addTitle({ f, venc: iso(d - 4), valor: v, centro: f % 4, split: f % 3 === 0, paga: iso(d), juros: j });

  // Algumas ações para a auditoria
  const aberto = (await call('GET', '/api/titulos?status=abertos&q=NF1000'))[0];
  if (aberto) await call('POST', `/api/titulos/${aberto.id}/reprogramar`, { dtrep: iso(10) });
  await call('POST', '/api/logout');
  await call('POST', '/api/login', { usuario: 'MARIA', senha: 'Demo1234' });
  await call('POST', '/api/titulos', { codig: fornecedores[7].id, docum: 'NF2001', histo: 'CANETAS E PAPEL A4', dtvec: iso(15), dtemi: iso(-1), valor: 210.4, natur: naturezas[1].id, rateio: [{ cc: centros[2].id, valor: 210.4 }] });

  await app.httpServer.close();
  app.db.close();
  console.log(`Base de demonstração criada em ${path.resolve(target)}`);
})().catch((error) => { console.error(error); process.exit(1); });
