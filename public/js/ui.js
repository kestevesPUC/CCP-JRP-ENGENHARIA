import { esc } from './format.js';
import { icon } from './icons.js';

export const view = () => document.getElementById('view');

let noticeTimer;

/** Aviso no topo da tela; mensagens de sucesso somem sozinhas, erros ficam até a próxima ação. */
export function notify(text, kind = 'ok') {
  const el = document.getElementById('msg');
  if (!el) return;
  clearTimeout(noticeTimer);
  if (text && kind === 'ok') noticeTimer = setTimeout(() => { el.innerHTML = ''; }, 5000);
  el.innerHTML = text
    ? `<div class="msg ${kind}" role="${kind === 'err' ? 'alert' : 'status'}">${icon(kind === 'err' ? 'alert' : 'check')}<span>${esc(text)}</span></div>`
    : '';
}
export const fail = (error) => notify(error.message, 'err');

/** Link de download (CSV, backup); `href` é servido pela API com Content-Disposition. */
export const downloadLink = (href, label) => `<a class="btn alt" href="${esc(href)}" download>${icon('download')}${label}</a>`;

/** Fecha o diálogo ao clicar fora dele (no fundo escurecido); cliques dentro, inclusive arrastar para selecionar texto, não fecham. */
function closeOnOutsideClick(dialog) {
  const outside = (event) => {
    const box = dialog.getBoundingClientRect();
    return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  };
  let pressedOutside = false;
  dialog.onmousedown = (event) => { pressedOutside = outside(event); };
  dialog.onclick = (event) => {
    if (pressedOutside && outside(event)) dialog.close();
    pressedOutside = false;
  };
}

/**
 * Abre um diálogo modal com formulário; `onSubmit` recebe os dados, e `onDone` roda após fechar com sucesso.
 * Opções: `confirmLabel` (texto do botão principal) e `extraButtons` (HTML de botões adicionais, ex.: "Limpar").
 */
export function openDialog(html, onSubmit, onDone, { confirmLabel = 'Confirmar', extraButtons = '' } = {}) {
  let dialog = document.getElementById('dlg');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'dlg';
    document.body.append(dialog);
  }
  dialog.innerHTML = `<form id="df"><div id="dmsg"></div>${html}<div class="row" style="margin-top:12px"><button class="btn">${esc(confirmLabel)}</button>${extraButtons}<button type="button" class="btn alt" id="dc">Cancelar</button></div></form>`;
  dialog.showModal();
  closeOnOutsideClick(dialog);
  document.getElementById('dc').onclick = () => dialog.close();
  document.getElementById('df').onsubmit = async (event) => {
    event.preventDefault();
    try {
      await onSubmit(Object.fromEntries(new FormData(event.target)));
      dialog.close();
      onDone();
    } catch (error) {
      document.getElementById('dmsg').innerHTML = `<div class="msg err" role="alert">${icon('alert')}<span>${esc(error.message)}</span></div>`;
    }
  };
}

/**
 * Confirmação no estilo do app (substitui o confirm() do navegador). Resolve true ao confirmar.
 * @param {{title?:string, message:string, confirmLabel?:string, danger?:boolean}} options
 */
export function confirmDialog({ title = 'Confirmar', message, confirmLabel = 'Confirmar', danger = false }) {
  return new Promise((resolve) => {
    let dialog = document.getElementById('confirmDlg');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'confirmDlg';
      dialog.className = 'confirm';
      document.body.append(dialog);
    }
    dialog.innerHTML = `<h2>${esc(title)}</h2><p>${esc(message)}</p>
      <div class="row"><button type="button" class="btn${danger ? ' danger' : ''}" id="cOk">${esc(confirmLabel)}</button><button type="button" class="btn alt" id="cNo">Cancelar</button></div>`;
    let answer = false;
    dialog.onclose = () => resolve(answer);
    document.getElementById('cOk').onclick = () => { answer = true; dialog.close(); };
    document.getElementById('cNo').onclick = () => dialog.close();
    closeOnOutsideClick(dialog);
    dialog.showModal();
    document.getElementById('cNo').focus();
  });
}
