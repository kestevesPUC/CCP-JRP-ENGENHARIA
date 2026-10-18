'use strict';
// Abre o app instalado com um banco de DEMONSTRAÇÃO, percorre as telas e salva capturas (PNG) via DevTools Protocol.
// Uso: node scripts/demo/capture.js <pasta-com-ccp.sqlite-demo> <pasta-de-saida> [caminho-do-exe]
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const [userData, outDir, exeArg] = process.argv.slice(2);
if (!userData || !outDir) {
  console.error('Uso: node scripts/demo/capture.js <pasta-demo> <saida> [exe]');
  process.exit(1);
}
const exe = exeArg || path.join(process.env.LOCALAPPDATA, 'Programs', 'CCP Contas a Pagar', 'CCP Contas a Pagar.exe');
const PORT = 9333;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(outDir, { recursive: true });

async function connect() {
  for (let i = 0; i < 60; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = targets.find((t) => t.type === 'page' && t.url.startsWith('http://127.0.0.1'));
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* ainda subindo */ }
    await wait(500);
  }
  throw new Error('O app não abriu a porta de depuração.');
}

(async () => {
  const child = spawn(exe, [`--user-data-dir=${userData}`, `--remote-debugging-port=${PORT}`], { detached: true, stdio: 'ignore' });
  child.unref();
  const ws = new WebSocket(await connect());
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  const ev = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`${expression.slice(0, 80)} -> ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
    return r.result.value;
  };
  const shot = async (name) => {
    await wait(500);
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(data, 'base64'));
    console.log('capturada:', name);
  };
  const closeDialogs = () => ev("document.querySelectorAll('dialog[open]').forEach((d) => d.close())");
  const fill = (selector, value) => ev(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  const click = (selector) => ev(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const nav = async (section, ms = 1300) => { await closeDialogs(); await click(`[data-t="${section}"]`); await wait(ms); };
  const login = async (user, pass) => {
    await fill('input[name=usuario]', user);
    await fill('input[name=senha]', pass);
    await ev("document.getElementById('f').requestSubmit()");
    await wait(1800);
  };

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await ev("localStorage.setItem('ccp-theme', 'light'); location.reload()");
  await wait(1500);

  // 1) Login e primeiro acesso
  await shot('01-login');
  await login('EXEMPLO', 'Provisoria1');
  await fill('input[name=atual]', 'Provisoria1');
  await fill('input[name=nova]', 'MinhaSenha2026');
  await click('.pw-wrap:last-of-type .pw-toggle, label:nth-of-type(2) .pw-toggle');
  await shot('02-troca-senha');
  await ev("fetch('/api/logout', { method: 'POST' }).then(() => location.reload())");
  await wait(1500);

  // 2) Entra como administrador
  await login('ADMIN', 'Demo1234');
  await wait(1200);
  await shot('03-dashboard');
  await click('#about');
  await wait(900);
  await shot('04-sobre');
  await closeDialogs();
  await ev("document.querySelector('.dash-grid').scrollIntoView({ block: 'start' }); window.scrollBy(0, -20)");
  await shot('05-dashboard-graficos');
  await ev("[...document.querySelectorAll('.card h2')].find((h) => h.textContent.includes('Próximos'))?.scrollIntoView({ block: 'start' })");
  await shot('06-dashboard-proximos');
  await ev('window.scrollTo(0, 0)');

  // 3) Movimento
  await nav('titulos');
  await shot('07-movimento');
  await click('tbody tr details.row-menu summary');
  await shot('08-movimento-acoes');
  await ev("document.querySelectorAll('details.row-menu[open]').forEach((d) => d.removeAttribute('open'))");
  await click('[data-grid=filters]');
  await wait(500);
  await shot('09-movimento-filtros');
  await closeDialogs();
  await click('[data-grid=new]');
  await wait(600);
  await ev(`(() => {
    const f = document.getElementById('df');
    const set = (n, v) => { f.elements[n].value = v; f.elements[n].dispatchEvent(new Event('input', { bubbles: true })); f.elements[n].dispatchEvent(new Event('change', { bubbles: true })); };
    set('codig', f.elements.codig.options[2].value); set('docum', 'NF3001'); set('valor', '1500'); set('histo', 'COMPRA DE MATERIAL HIDRAULICO');
    set('natur', f.elements.natur.options[1].value); set('cc0', f.elements.cc0.options[1].value); set('vr0', '900');
    set('cc1', f.elements.cc1.options[2].value); set('vr1', '600');
  })()`);
  await shot('10-incluir-titulo');
  await closeDialogs();
  await click('tbody tr [data-a="baixa"]');
  await wait(600);
  await fill('#df input[name=juros]', '12.5');
  await fill('#df input[name=receb]', '1512.5');
  await shot('11-baixar-titulo');
  await closeDialogs();

  // 4) Cadastros
  await nav('fornecedores');
  await shot('12-fornecedores');
  await click('[data-grid=new]');
  await wait(600);
  await fill('#df input[name=cgc]', '00000000000191');
  await ev("document.querySelector('#df input[name=cgc]').dispatchEvent(new Event('blur'))");
  await wait(6500);
  await shot('13-fornecedor-cnpj');
  await closeDialogs();
  await nav('naturezas');
  await shot('14-naturezas');
  await nav('centros');
  await shot('15-centros');

  // 5) Relatórios
  await nav('relatorios');
  await ev("document.querySelector('#rf').requestSubmit()");
  await wait(1200);
  await shot('16-relatorios');

  // 6) Importar CSV
  await nav('titulos');
  await click('[data-grid=import]');
  await wait(700);
  await ev(`(() => {
    const csv = 'Fornecedor;Documento;Vencimento;Valor;Histórico;Natureza;Centro de custo 1\\nACME MATERIAIS DE CONSTRUCAO LTDA;NF9001;15/12/2026;1.250,00;COMPRA DE CIMENTO;BOLETO;ESCRITORIO\\nFORNECEDOR INEXISTENTE;NF9002;20/12/2026;300,00;MATERIAL;BOLETO;ESCRITORIO\\nALFA CONCRETO USINADO S/A;NF9003;10/01/2027;2.800,00;CONCRETO;PIX;OBRA COMERCIAL BETA\\n';
    const dt = new DataTransfer();
    dt.items.add(new File([csv], 'titulos.csv', { type: 'text/csv' }));
    const input = document.getElementById('importFile');
    input.files = dt.files;
    input.dispatchEvent(new Event('change'));
  })()`);
  await wait(1500);
  await shot('17-importar-csv');
  await closeDialogs();

  // 7) Usuários e auditoria
  await nav('usuarios');
  await shot('18-usuarios');
  await click('[data-grid=new]');
  await wait(600);
  await shot('19-novo-usuario');
  await closeDialogs();
  await nav('auditoria');
  await shot('20-auditoria');
  await ev("[...document.querySelectorAll('tbody tr')].find((r) => r.textContent.includes('Reprogramou'))?.querySelector('button[data-a=detalhes]')?.click()");
  await wait(900);
  await shot('21-auditoria-detalhes');
  await closeDialogs();

  // 8) Perfil e tema escuro
  await click('#profile');
  await wait(600);
  await shot('22-meu-perfil');
  await closeDialogs();
  await ev("localStorage.setItem('ccp-theme', 'dark'); document.documentElement.dataset.theme = 'dark'");
  await nav('dashboard', 1800);
  await shot('23-dashboard-escuro');
  await nav('titulos', 1500);
  await shot('24-movimento-escuro');

  await send('Browser.close').catch(() => {});
  ws.close();
  console.log('Concluído.');
})().catch((error) => { console.error('ERRO:', error.message); process.exit(1); });
