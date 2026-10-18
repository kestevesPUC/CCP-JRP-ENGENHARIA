import { api } from '../api.js';
import { esc } from '../format.js';
import { icon } from '../icons.js';
import { state, loadLists } from '../state.js';
import { view, notify, fail, openDialog, confirmDialog } from '../ui.js';
import { podeEditar } from '../niveis.js';
import { matchesSearch, normalize } from '../text.js';
import { attachCnpjLookup } from '../cnpj.js';
import { createGrid } from '../components/grid.js';
import { openFilterDialog } from '../components/filterDialog.js';
import { openImportDialog } from '../components/importDialog.js';

const USO_FIELD = {
  name: 'uso', label: 'Utilização', type: 'select',
  options: [{ value: '', label: 'Todos' }, { value: 'sim', label: 'Em uso (com títulos)' }, { value: 'nao', label: 'Sem uso (podem ser excluídos)' }],
};
const usoTag = (r) => (r.emUso ? `<span class="tag aberto">${icon('check')}Em uso</span>` : '<span class="tag">—</span>');
const usoMatches = (r, f) => !f.uso || (f.uso === 'sim') === r.emUso;

import { maskAttrs } from '../masks.js';

const SIMPLE_FIELDS = [['nome', 'Descrição', 25]];

/** Configuração de cada cadastro: formulário, colunas, texto pesquisável e filtros específicos. */
const RESOURCES = {
  fornecedores: {
    singular: 'fornecedor', plural: 'fornecedores', newLabel: 'Novo fornecedor', placeholder: 'Pesquisar por nome, CNPJ/CPF, cidade ou telefone…',
    fields: [['cgc', 'CNPJ/CPF', 18], ['nome', 'Nome / Razão social', 52], ['pess', 'Tipo de pessoa', 1], ['insc', 'Insc. estadual', 16], ['ende', 'Endereço', 40], ['bair', 'Bairro', 15], ['cida', 'Cidade', 19], ['esta', 'UF', 2], ['cep', 'CEP', 9], ['fone', 'Fone', 15], ['fax', 'Fax', 15], ['con1', 'Contato 1', 25], ['con2', 'Contato 2', 25], ['nasc', 'Aniversário / fundação', 10]],
    columns: [
      { label: 'Cód.', cell: (r) => r.id },
      { label: 'CNPJ/CPF', cell: (r) => esc(r.cgc) },
      { label: 'Nome', cell: (r) => esc(r.nome) },
      { label: 'Cidade/UF', cell: (r) => esc([r.cida, r.esta].filter(Boolean).join('/')) },
      { label: 'Fone', cell: (r) => esc(r.fone) },
      { label: 'Uso', cell: usoTag },
    ],
    searchText: (r) => [r.id, r.nome, r.cgc, r.insc, r.ende, r.bair, r.cida, r.esta, r.cep, r.fone, r.fax, r.con1, r.con2].join(' '),
    filterFields: () => [
      { name: 'pess', label: 'Tipo de pessoa', type: 'select', options: [{ value: '', label: 'Todas' }, { value: 'F', label: 'Física' }, { value: 'J', label: 'Jurídica' }] },
      { name: 'esta', label: 'UF', type: 'text', placeholder: 'Ex.: MG' },
      { name: 'cida', label: 'Cidade contém', type: 'text' },
      USO_FIELD,
    ],
    filterRow: (r, f) => usoMatches(r, f) && (!f.pess || r.pess === f.pess) && (!f.esta || normalize(r.esta) === normalize(f.esta)) && (!f.cida || normalize(r.cida).includes(normalize(f.cida))),
  },
  naturezas: {
    singular: 'natureza', plural: 'naturezas', newLabel: 'Nova natureza', placeholder: 'Pesquisar por código ou descrição…', fields: SIMPLE_FIELDS,
    columns: [{ label: 'Cód.', cell: (r) => r.id }, { label: 'Descrição', cell: (r) => esc(r.nome) }, { label: 'Uso', cell: usoTag }],
    searchText: (r) => `${r.id} ${r.nome}`, filterFields: () => [USO_FIELD], filterRow: usoMatches,
  },
  centros: {
    singular: 'centro de custo', plural: 'centros de custo', newLabel: 'Novo centro de custo', placeholder: 'Pesquisar por código ou descrição…', fields: SIMPLE_FIELDS,
    columns: [{ label: 'Cód.', cell: (r) => r.id }, { label: 'Descrição', cell: (r) => esc(r.nome) }, { label: 'Uso', cell: usoTag }],
    searchText: (r) => `${r.id} ${r.nome}`, filterFields: () => [USO_FIELD], filterRow: usoMatches,
  },
};

const FILTER_LABELS = { pess: 'Pessoa', esta: 'UF', cida: 'Cidade', uso: 'Utilização' };
const USO_LABEL = { sim: 'Em uso', nao: 'Sem uso' };

// Pesquisa e filtros por cadastro, mantidos ao navegar entre telas.
const memory = {};

/** Tela de cadastro (fornecedores, naturezas, centros de custo) no padrão de grid: só a tabela; o formulário abre em modal. */
export async function viewCadastro(resource) {
  await loadLists();
  const cfg = RESOURCES[resource];
  const editable = podeEditar(state.me.nivel);
  const mem = (memory[resource] ||= { q: '', filters: {} });
  const records = state.lists[resource];

  const summary = () => Object.entries(mem.filters).map(([k, v]) => `${FILTER_LABELS[k] || k}: ${USO_LABEL[v] || v}`).join(' · ');
  const reload = () => viewCadastro(resource).catch(fail);

  const grid = createGrid(view(), {
    search: mem.q,
    searchPlaceholder: cfg.placeholder,
    columns: cfg.columns,
    rowActions: editable ? () => [{ a: 'edit', label: 'Editar' }, { a: 'del', label: 'Excluir', danger: true }] : undefined,
    newLabel: cfg.newLabel,
    onNew: editable ? () => openForm(resource, cfg, null, reload) : undefined,
    onExport: () => { location.href = `/api/exportar/${resource}`; },
    onImport: editable ? () => openImportDialog({ entity: resource, title: `Importar ${cfg.plural}`, onDone: reload }) : undefined,
    onSearch: (q) => { mem.q = q; apply(); },
    onFilters: () => openFilterDialog({
      title: `Filtros — ${cfg.singular}`, fields: cfg.filterFields(), values: mem.filters,
      onApply: (values) => { mem.filters = values; apply(); },
    }),
    onAction: (action, record) => (action === 'edit' ? openForm(resource, cfg, record, reload) : removeRecord(resource, record, reload)),
    emptyText: 'Nenhum registro encontrado.',
  });

  function apply() {
    const rows = records.filter((r) => matchesSearch(cfg.searchText(r), mem.q) && cfg.filterRow(r, mem.filters));
    grid.setRows(rows, summary());
    grid.setFilterCount(Object.keys(mem.filters).length);
  }
  apply();
}

function openForm(resource, cfg, record, reload) {
  const personSelect = (name, label) => `<label>${label}<select name="${name}">${[['', 'Selecione'], ['J', 'Jurídica'], ['F', 'Física']]
    .map(([value, text]) => `<option value="${value}"${record?.[name] === value ? ' selected' : ''}>${text}</option>`).join('')}</select></label>`;
  const dateField = (name, label) => `<label>${label}<input name="${name}" type="date" min="1900-01-01" max="${new Date().toISOString().slice(0, 10)}" value="${esc(record?.[name])}"></label>`;
  const MASK_BY_FIELD = { cep: 'cep', fone: 'phone', fax: 'phone' };
  const inputs = cfg.fields.map(([name, label, max]) => (name === 'pess' ? personSelect(name, label) : name === 'nasc' ? dateField(name, label) : `<label>${label}<input name="${name}" ${MASK_BY_FIELD[name] ? maskAttrs(MASK_BY_FIELD[name]) : `maxlength="${max}"`} value="${esc(record?.[name])}" ${name === 'nome' ? 'required' : ''}
    ${name === 'cgc' ? 'autocomplete="off" placeholder="00.000.000/0000-00"' : ''}></label>${name === 'cgc' ? '<div id="cnpjStatus" class="field-status" role="status" aria-live="polite"></div>' : ''}`)).join('');

  openDialog(
    `<h2>${record ? 'Alterar' : 'Novo'} ${cfg.singular}</h2><div class="form-grid">${inputs}</div>`,
    (data) => api(record ? 'PUT' : 'POST', `/api/${resource}${record ? `/${record.id}` : ''}`, data),
    async () => { await reload(); notify(record ? 'Registro alterado' : 'Registro cadastrado'); },
  );
  if (resource === 'fornecedores') attachCnpjLookup(document.getElementById('df'), document.getElementById('cnpjStatus'));
}

async function removeRecord(resource, record, reload) {
  if (!await confirmDialog({ title: 'Excluir registro', message: `Excluir "${record.nome}"? Esta ação não pode ser desfeita.`, confirmLabel: 'Excluir', danger: true })) return;
  try {
    await api('DELETE', `/api/${resource}/${record.id}`);
    await reload();
    notify('Registro excluído');
  } catch (error) { fail(error); }
}
