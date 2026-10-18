import { api } from '../api.js';
import { esc, dt } from '../format.js';
import { maskAttrs } from '../masks.js';
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
    searchPlaceholder: 'Pesquisar por nome, usuário, e-mail ou nível…',
    columns: [
      { label: 'Usuário', cell: (u) => `<span class="user-cell">${avatarHtml(u, 'avatar sm')}${esc(u.usuario)}</span>` },
      { label: 'Nome', cell: (u) => esc(u.nome) },
      { label: 'Nível', cell: (u) => `${u.nivel} — ${nivelNome(u.nivel)}` },
      { label: 'E-mail', cell: (u) => esc(u.email) },
      { label: 'Telefone', cell: (u) => esc(u.telefone) },
      { label: 'Nascimento', cell: (u) => dt(u.nascimento) },
    ],
    rowActions: () => [{ a: 'edit', label: 'Editar' }, { a: 'pwd', label: 'Redefinir senha' }, { a: 'del', label: 'Excluir', danger: true }],
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
    onAction: async (action, user) => {
      if (action === 'edit') return openForm(reload, user);
      if (action === 'pwd') return openPasswordForm(user);
      if (!await confirmDialog({ title: 'Excluir usuário', message: `Excluir o usuário ${user.usuario}? Ele perderá o acesso ao sistema.`, confirmLabel: 'Excluir', danger: true })) return;
      try { await api('DELETE', `/api/usuarios/${user.id}`); await reload(); notify('Usuário excluído'); } catch (error) { fail(error); }
      return undefined;
    },
  });

  function apply() {
    const f = memory.filters;
    const rows = users.filter((u) => matchesSearch(`${u.usuario} ${u.nome} ${u.email} ${u.nivel} ${nivelNome(u.nivel)}`, memory.q)
      && (!f.nivel || u.nivel === f.nivel) && (!f.foto || (f.foto === 'sim') === u.temFoto));
    const labels = [f.nivel && `Nível: ${f.nivel}`, f.foto && `Foto: ${f.foto === 'sim' ? 'com' : 'sem'}`].filter(Boolean);
    grid.setRows(rows, labels.join(' · '));
    grid.setFilterCount(Object.keys(f).length);
  }
  apply();
}

/** Cadastro (user == null) ou edição dos dados pessoais; o nível e a senha são definidos só na criação (senha: "Redefinir senha"). */
function openForm(reload, user = null) {
  const v = (field) => esc(user?.[field] ?? '');
  openDialog(`<h2>${user ? `Editar usuário ${esc(user.usuario)}` : 'Novo usuário'}</h2><div class="form-grid">
    <label>Nome completo<input name="nome" maxlength="60" required autocomplete="off" value="${v('nome')}"></label>
    ${user ? '' : `<label>Usuário (login)<input name="usuario" maxlength="10" required autocomplete="off"></label>
    <label>Nível<select name="nivel">${NIVEIS.map((n) => `<option value="${n.id}" ${n.id === 'C' ? 'selected' : ''}>${n.id} — ${n.nome}</option>`).join('')}</select></label>
    <label>Senha provisória<input name="senha" type="password" minlength="6" autocomplete="new-password" required></label>`}
    <label>E-mail<input name="email" type="email" maxlength="80" autocomplete="off" placeholder="nome@empresa.com.br" value="${v('email')}"></label>
    <label>Telefone<input name="telefone" ${maskAttrs('phone')} value="${v('telefone')}"></label>
    <label>Data de nascimento<input name="nascimento" type="date" min="1900-01-01" max="${new Date().toISOString().slice(0, 10)}" value="${v('nascimento')}"></label></div>
    ${user ? '' : `<dl class="niveis">${NIVEIS.map((n) => `<dt>${n.id} — ${n.nome}</dt><dd>${n.descricao}</dd>`).join('')}</dl>`}`,
  (data) => (user ? api('PUT', `/api/usuarios/${user.id}`, data) : api('POST', '/api/usuarios', data)),
  async () => { await reload(); notify(user ? 'Usuário atualizado' : 'Usuário cadastrado'); });
}

/** O administrador define uma nova senha provisória para qualquer usuário (ele precisará trocá-la no próximo acesso). */
function openPasswordForm(user) {
  openDialog(`<h2>Redefinir senha de ${esc(user.usuario)}</h2>
    <p>Defina uma senha provisória. ${esc(user.nome || user.usuario)} será desconectado e precisará criar uma nova senha ao entrar.</p>
    <div class="form-grid"><label>Nova senha provisória<input name="senha" type="password" minlength="6" autocomplete="new-password" required></label></div>`,
  (data) => api('POST', `/api/usuarios/${user.id}/senha`, data),
  () => notify(`Senha de ${user.usuario} redefinida`), { confirmLabel: 'Redefinir senha' });
}
