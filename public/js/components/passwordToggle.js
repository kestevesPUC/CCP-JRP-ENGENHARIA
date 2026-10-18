import { icon } from '../icons.js';

/** Envolve um campo de senha com o botão "olho" que mostra/oculta o que foi digitado. */
function enhance(input) {
  if (input.dataset.pwToggle) return;
  input.dataset.pwToggle = '1';

  const wrap = document.createElement('span');
  wrap.className = 'pw-wrap';
  input.replaceWith(wrap);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pw-toggle';
  button.setAttribute('aria-pressed', 'false');
  const paint = (visible) => {
    button.innerHTML = icon(visible ? 'eyeOff' : 'eye');
    button.setAttribute('aria-label', visible ? 'Ocultar senha' : 'Mostrar senha');
    button.title = visible ? 'Ocultar senha' : 'Mostrar senha';
    button.setAttribute('aria-pressed', String(visible));
  };
  paint(false);
  button.addEventListener('click', () => {
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    paint(visible);
    input.focus();
  });
  wrap.append(input, button);
}

/**
 * Adiciona o botão de mostrar/ocultar a TODO campo de senha da aplicação (login, troca de senha, novo usuário…),
 * inclusive os criados depois (diálogos), observando o DOM.
 */
export function initPasswordToggles() {
  const scan = (root) => root.querySelectorAll?.('input[type="password"]').forEach(enhance);
  scan(document);
  new MutationObserver((mutations) => {
    for (const m of mutations) m.addedNodes.forEach((node) => { if (node.nodeType === 1) { if (node.matches?.('input[type="password"]')) enhance(node); scan(node); } });
  }).observe(document.body, { childList: true, subtree: true });
}
