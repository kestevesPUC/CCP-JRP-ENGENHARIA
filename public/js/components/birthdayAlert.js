import { api } from '../api.js';
import { esc } from '../format.js';
import { icon } from '../icons.js';

const when = (a) => {
  if (a.dias === 0) return 'hoje';
  if (a.dias === 1) return 'amanhã';
  const [, month, day] = a.data.split('-');
  return `${day}/${month}`;
};
const kind = (a) => (a.tipo === 'usuario' ? 'usuário' : 'fornecedor');
const years = (a) => (a.anos > 0 && a.anos < 130 ? `, ${a.anos} anos` : '');

/** Alerta aos administradores: aniversariantes (usuários e fornecedores) de hoje até os próximos 7 dias. Pode ser dispensado na sessão. */
export async function showBirthdayAlert(host, today) {
  host.innerHTML = '';
  const dismissed = sessionStorageGet(`ccp-bday-${today}`);
  if (dismissed) return;
  let result;
  try { result = await api('GET', '/api/aniversarios'); } catch { return; }
  const list = result.aniversarios;
  if (!list.length) return;
  host.innerHTML = `<section class="msg birthday" role="status" aria-label="Aniversários da semana">${icon('gift')}
    <div><b>Aniversários nesta semana</b><ul>${list.map((a) => `<li><b>${esc(a.nome)}</b> <small>(${kind(a)}${years(a)})</small> — ${when(a)}</li>`).join('')}</ul></div>
    <button type="button" class="btn alt sm" data-dismiss>Dispensar</button></section>`;
  host.querySelector('[data-dismiss]').onclick = () => { sessionStorageSet(`ccp-bday-${today}`, '1'); host.innerHTML = ''; };
}

function sessionStorageGet(key) { try { return sessionStorage.getItem(key); } catch { return null; } }
function sessionStorageSet(key, value) { try { sessionStorage.setItem(key, value); } catch { /* sem armazenamento: o alerta só reaparece */ } }
