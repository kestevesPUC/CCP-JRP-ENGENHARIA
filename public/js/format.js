export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const dt = (s) => (s ? s.split('-').reverse().join('/') : '');
export const today = () => new Date().toISOString().slice(0, 10);

const pad = (n) => String(n).padStart(2, '0');
const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Primeiro e último dia do mês atual (data local do computador), em ISO: { de, ate }. */
export function currentMonthRange(now = new Date()) {
  return { de: isoLocal(new Date(now.getFullYear(), now.getMonth(), 1)), ate: isoLocal(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
}
