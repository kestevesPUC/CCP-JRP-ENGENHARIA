import { api } from './api.js';
import { esc } from './format.js';

// Estado compartilhado da interface: usuário logado e listas de cadastros usadas em selects.
export const state = { me: null, lists: { fornecedores: [], naturezas: [], centros: [] } };

export async function loadLists() {
  const [fornecedores, naturezas, centros] = await Promise.all([api('GET', '/api/fornecedores'), api('GET', '/api/naturezas'), api('GET', '/api/centros')]);
  state.lists = { fornecedores, naturezas, centros };
}

export const options = (list, selected, blank = '') => (blank ? `<option value="">${blank}</option>` : '')
  + list.map((x) => `<option value="${x.id}" ${x.id == selected ? 'selected' : ''}>${x.id} - ${esc(x.nome)}</option>`).join('');
