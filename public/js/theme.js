import { icon } from './icons.js';

// Tema automático (prefers-color-scheme) com alternância manual guardada neste navegador.
const STORAGE_KEY = 'ccp-theme';
const root = document.documentElement;

const current = () => root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

export function restoreTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) root.dataset.theme = saved;
  } catch { /* storage indisponível: segue o tema do sistema */ }
}

function paint(button) {
  const dark = current() === 'dark';
  button.innerHTML = `${icon(dark ? 'sun' : 'moon')}<span>${dark ? 'Tema claro' : 'Tema escuro'}</span>`;
  button.setAttribute('aria-label', dark ? 'Mudar para tema claro' : 'Mudar para tema escuro');
}

function toggle() {
  const next = current() === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignora */ }
  document.querySelectorAll('[data-theme-btn]').forEach(paint);
}

export const themeButton = (cls = '') => `<button type="button" class="${cls}" data-theme-btn></button>`;

export function wireThemeButtons() {
  document.querySelectorAll('[data-theme-btn]').forEach((button) => {
    paint(button);
    button.onclick = toggle;
  });
}
