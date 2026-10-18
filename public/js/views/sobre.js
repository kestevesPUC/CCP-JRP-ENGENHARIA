import { api } from '../api.js';
import { esc } from '../format.js';
import { icon } from '../icons.js';
import { state } from '../state.js';
import { notify, openDialog, confirmDialog } from '../ui.js';

const STATE_TONE = { baixado: 'ok', atual: 'ok', disponivel: 'warn', erro: 'bad', verificando: 'info', idle: 'info', indisponivel: 'info' };

const statusBlock = (info) => {
  const u = info.atualizacao;
  const progress = u.estado === 'disponivel' ? ` (${u.progresso}%)` : '';
  const version = u.versao && ['disponivel', 'baixado'].includes(u.estado) ? ` Versão ${esc(u.versao)}.` : '';
  return `<div class="import-summary ${STATE_TONE[u.estado] === 'bad' ? 'bad' : 'ok'}">${icon(u.estado === 'erro' ? 'alert' : 'info')}<span>${esc(u.mensagem)}${progress}${version}</span></div>`;
};

/** Diálogo "Sobre": versão instalada, crédito do desenvolvedor e (nível A) verificação/instalação de atualizações. */
export async function openAbout() {
  const info = await api('GET', '/api/sistema');
  const admin = state.me.nivel === 'A';
  openDialog(`<h2>CCP — Controle de Contas a Pagar</h2>
    <dl class="detail"><dt>Versão</dt><dd><b>${esc(info.versao)}</b></dd>
    <dt>Desenvolvido por</dt><dd><a href="https://kaio-gomes-site.vercel.app" target="_blank" rel="noopener noreferrer"><b>Kaio Gomes</b></a></dd>
    <dt>Dados</dt><dd>Gravados neste computador (SQLite) e mantidos ao atualizar, desinstalar ou reinstalar o programa.</dd></dl>
    <h3>Atualizações</h3><div id="updateStatus">${statusBlock(info)}</div>
    ${admin ? `<div class="row"><button type="button" class="btn alt" id="checkUpdate">${icon('download')}Verificar atualização</button>
      <button type="button" class="btn" id="installUpdate" ${info.atualizacao.estado === 'baixado' ? '' : 'hidden'}>Reiniciar e instalar</button></div>`
    : '<p><small>Somente administradores (nível A) verificam e instalam atualizações.</small></p>'}`,
  async () => {}, () => {}, { confirmLabel: 'Fechar' });
  document.getElementById('dc').remove();
  if (!admin) return;

  const paint = (next) => {
    document.getElementById('updateStatus').innerHTML = statusBlock(next);
    document.getElementById('installUpdate').hidden = next.atualizacao.estado !== 'baixado';
  };
  document.getElementById('checkUpdate').onclick = async () => {
    document.getElementById('updateStatus').innerHTML = '<p class="chart-sub">Procurando atualizações…</p>';
    try {
      paint(await api('POST', '/api/sistema/atualizacoes/verificar', {}));
      // O download corre em segundo plano: consulta o progresso por alguns instantes.
      for (let i = 0; i < 30 && document.getElementById('updateStatus'); i++) {
        await new Promise((r) => setTimeout(r, 2000));
        if (!document.getElementById('updateStatus')) break;
        const next = await api('GET', '/api/sistema');
        paint(next);
        if (!['verificando', 'disponivel'].includes(next.atualizacao.estado)) break;
      }
    } catch (error) { notify(error.message, 'err'); }
  };
  document.getElementById('installUpdate').onclick = async () => {
    if (!await confirmDialog({ title: 'Instalar atualização', message: 'O programa será fechado e reaberto já atualizado. Seus dados são preservados.', confirmLabel: 'Reiniciar e instalar' })) return;
    try { await api('POST', '/api/sistema/atualizacoes/instalar', {}); } catch (error) { notify(error.message, 'err'); }
  };
}
