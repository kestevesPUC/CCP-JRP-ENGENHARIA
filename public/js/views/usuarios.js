import { api } from '../api.js';
import { esc } from '../format.js';
import { view, notify, fail, openDialog, confirmDialog } from '../ui.js';
import { NIVEIS, nivelNome } from '../niveis.js';
import { avatarHtml } from '../avatar.js';
import { matchesSearch } from '../text.js';
import { createGrid } from '../components/grid.js';
import { openFilterDialog } from '../components/filterDialog.js';

const memory = { q: '', filters: {} };

/** Tela de usuários (nível A) no padrão de grid; o cadastro abre em modal e o backup fica no botão de exportação. */
export async function viewUsuarios() {
  const users = await api('GET', '/api/usuarios');
  const reload = () => viewUsuarios().catch(fail);

  const grid = createGrid(view(), {
    search: memory.q,
    searchPlaceholder: 'Pesquisar por usuário ou nível…',
    columns: [
      { label: 'Usuário', cell: (u) => `<span class="user-cell">${avatarHtml(u, 'avatar sm')}${esc(u.usuario)}</span>` },
      { label: 'Nível', cell: (u) => `${u.nivel} — ${nivelNome(u.nivel)}` },
    ],
    rowActions: () => [{ a: 'del', label: 'Excluir', danger: true }],
    newLabel: 'Novo usuário',
    onNew: () => openForm(reload),
    onExport: () => { location.href = '/api/backup'; },
    exportLabel: 'Backup (SQLite)',
    onSearch: (q) => { memory.q = q; apply(); },
    onFilters: () => openFilterDialog({
      title: 'Filtros — usuários',
      fields: [
        { name: 'nivel', label: 'Nível', type: 'select', options: [{ value: '', label: 'Todos' }, ...NIVEIS.map((n) => ({ value: n.id, label: `${n.id} — ${n.nome}` }))] },
        { name: 'foto', label: 'Foto de perfil', type: 'select', options: [{ value: '', label: 'Todos' }, { value: 'sim', label: 'Com foto' }, { value: 'nao', label: 'Sem foto' }] },
      ],
      values: memory.filters,
      onApply: (values) => { memory.filters = values; apply(); },
    }),
    onAction: async (_action, user) => {
      if (!await confirmDialog({ title: 'Excluir usuário', message: `Excluir o usuário ${user.usuario}? Ele perderá o acesso ao sistema.`, confirmLabel: 'Excluir', danger: true })) return;
      try { await api('DELETE', `/api/usuarios/${user.id}`); await reload(); notify('Usuário excluído'); } catch (error) { fail(error); }
    },
  });

  function apply() {
    const f = memory.filters;
    const rows = users.filter((u) => matchesSearch(`${u.usuario} ${u.nivel} ${nivelNome(u.nivel)}`, memory.q)
      && (!f.nivel || u.nivel === f.nivel) && (!f.foto || (f.foto === 'sim') === u.temFoto));
    const labels = [f.nivel && `Nível: ${f.nivel}`, f.foto && `Foto: ${f.foto === 'sim' ? 'com' : 'sem'}`].filter(Boolean);
    grid.setRows(rows, labels.join(' · '));
    grid.setFilterCount(Object.keys(f).length);
  }
  apply();
}

function openForm(reload) {
  openDialog(`<h2>Novo usuário</h2><div class="form-grid">
    <label>Usuário<input name="usuario" maxlength="10" required autocomplete="off"></label>
    <label>Nível<select name="nivel">${NIVEIS.map((n) => `<option value="${n.id}" ${n.id === 'C' ? 'selected' : ''}>${n.id} — ${n.nome}</option>`).join('')}</select></label>
    <label>Senha provisória<input name="senha" type="password" minlength="6" autocomplete="new-password" required></label></div>
    <dl class="niveis">${NIVEIS.map((n) => `<dt>${n.id} — ${n.nome}</dt><dd>${n.descricao}</dd>`).join('')}</dl>`,
  (data) => api('POST', '/api/usuarios', data),
  async () => { await reload(); notify('Usuário cadastrado'); });
}
