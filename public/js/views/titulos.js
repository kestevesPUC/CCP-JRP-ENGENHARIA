import { api, queryString } from '../api.js';
import { esc, brl, dt, today } from '../format.js';
import { icon } from '../icons.js';
import { state, loadLists, options } from '../state.js';
import { view, notify, fail, openDialog, confirmDialog } from '../ui.js';
import { podeEditar } from '../niveis.js';
import { createGrid } from '../components/grid.js';
import { openFilterDialog } from '../components/filterDialog.js';
import { openImportDialog } from '../components/importDialog.js';
import { maskAttrs, formatMoneyInput, parseMoney } from '../masks.js';

const DEFAULT_FILTERS = { status: 'abertos' };
const STATUS_LABEL = { abertos: 'Em aberto', pagos: 'Pagos', '': 'Todos' };

// Pesquisa e filtros persistem enquanto o usuário navega entre telas.
const current = { q: '', filters: { ...DEFAULT_FILTERS } };

/** Define os filtros do Movimento antes de abrir a tela (usado pelos cartões do dashboard). */
export function setTituloFilters(filters) {
  current.filters = { ...filters };
  current.q = '';
}

const statusTag = (t, hoje) => {
  if (t.baixa) return `<span class="tag pago">${icon('check')}Pago ${dt(t.baixa.dtpag)}</span>`;
  if (t.dtvec < hoje) return `<span class="tag venc">${icon('alert')}Vencido</span>`;
  if (t.dtvec === hoje) return `<span class="tag hoje">${icon('calendar')}Vence hoje</span>`;
  return `<span class="tag aberto">${icon('clock')}Em aberto</span>`;
};

/** Ações da linha: a primeira fica visível, as demais vão para o menu "⋯" do grid. */
const rowActions = (t, nivel) => {
  const actions = [];
  if (!t.baixa) actions.push({ a: 'baixa', label: 'Baixar' }, { a: 'edit', label: 'Alterar' }, { a: 'rep', label: 'Reprogramar vencimento' });
  if (t.baixa && nivel === 'A') actions.push({ a: 'est', label: 'Estornar baixa' });
  if (!t.baixa || nivel === 'A') actions.push({ a: 'del', label: 'Excluir', danger: true });
  return actions;
};

const nameOf = (list, id) => list.find((x) => String(x.id) === String(id))?.nome || id;

/** Filtros ativos além do padrão (situação "Em aberto"), para o contador do botão. */
const activeCount = () => Object.entries(current.filters).filter(([k, v]) => v && !(k === 'status' && v === 'abertos')).length;

function summary(lists) {
  const f = current.filters;
  const parts = [`Situação: ${STATUS_LABEL[f.status ?? ''] ?? 'Todos'}`];
  if (f.codig) parts.push(`Fornecedor: ${nameOf(lists.fornecedores, f.codig)}`);
  if (f.natur) parts.push(`Natureza: ${nameOf(lists.naturezas, f.natur)}`);
  if (f.cc) parts.push(`Centro de custo: ${nameOf(lists.centros, f.cc)}`);
  if (f.docum) parts.push(`Nº título: ${f.docum}`);
  if (f.valor) parts.push(`Valor: ${brl(f.valor)}`);
  if (f.de) parts.push(`Venc. de ${dt(f.de)}`);
  if (f.ate) parts.push(`Venc. até ${dt(f.ate)}`);
  return parts.join(' · ');
}

const filterFields = (lists) => [
  { name: 'status', label: 'Situação', type: 'select', options: [{ value: 'abertos', label: 'Em aberto' }, { value: 'pagos', label: 'Pagos' }, { value: '', label: 'Todos' }] },
  { name: 'codig', label: 'Fornecedor', type: 'select', options: [{ value: '', label: 'Todos' }, ...lists.fornecedores.map((x) => ({ value: x.id, label: `${x.id} - ${x.nome}` }))] },
  { name: 'natur', label: 'Natureza', type: 'select', options: [{ value: '', label: 'Todas' }, ...lists.naturezas.map((x) => ({ value: x.id, label: `${x.id} - ${x.nome}` }))] },
  { name: 'cc', label: 'Centro de custo', type: 'select', options: [{ value: '', label: 'Todos' }, ...lists.centros.map((x) => ({ value: x.id, label: `${x.id} - ${x.nome}` }))] },
  { name: 'docum', label: 'Nº do título', type: 'text' },
  { name: 'valor', label: 'Valor exato (R$)', type: 'money' },
  { name: 'de', label: 'Vencimento de', type: 'date' },
  { name: 'ate', label: 'Vencimento até', type: 'date' },
];

export async function viewTitulos() {
  await loadLists();
  const { lists, me } = state;
  const editable = podeEditar(me.nivel);
  const hoje = today();
  const query = () => queryString({ ...current.filters, q: current.q });

  const grid = createGrid(view(), {
    search: current.q,
    searchPlaceholder: 'Pesquisar por documento, fornecedor, histórico, natureza ou valor…',
    debounceMs: 300,
    columns: [
      { label: 'Venc.', sort: (t) => t.dtvec, cell: (t) => `${dt(t.dtvec)}${t.dtrep ? `<br><small>reprog. ${dt(t.dtrep)}</small>` : ''}` },
      { label: 'Doc.', sort: (t) => t.docum, cell: (t) => esc(t.docum) },
      { label: 'Fornecedor', sort: (t) => t.fornecedor, cell: (t) => esc(t.fornecedor) },
      { label: 'Histórico', sort: (t) => t.histo, cell: (t) => esc(t.histo) },
      { label: 'Valor', align: 'right', sort: (t) => t.valor, cell: (t) => brl(t.valor) },
      { label: 'Situação', sort: (t) => (t.baixa ? 2 : t.dtvec < hoje ? 0 : 1), cell: (t) => statusTag(t, hoje) },
    ],
    rowActions: editable ? (t) => rowActions(t, me.nivel) : undefined,
    newLabel: 'Incluir título',
    onNew: editable ? () => formTitulo(null, refresh) : undefined,
    onExport: () => { location.href = `/api/exportar/titulos?${query()}`; },
    onImport: editable ? () => openImportDialog({ entity: 'titulos', title: 'Importar títulos', onDone: refresh }) : undefined,
    onSearch: (q) => { current.q = q; refresh(); },
    onFilters: () => openFilterDialog({
      title: 'Filtros do movimento',
      fields: filterFields(lists),
      values: current.filters,
      defaults: DEFAULT_FILTERS,
      // Campos vazios são descartados pelo diálogo; sem "status" significa "Todos".
      onApply: (values) => { current.filters = { status: '', ...values }; refresh(); },
    }),
    onAction: (action, titulo) => runAction(action, titulo, refresh),
    emptyText: 'Nenhum título encontrado com esses critérios.',
  });

  async function refresh() {
    try {
      const rows = await api('GET', `/api/titulos?${query()}`);
      const total = rows.reduce((sum, t) => sum + Math.round(t.valor * 100), 0) / 100;
      grid.setRows(rows, `Total: ${brl(total)} · ${summary(lists)}`);
      grid.setFilterCount(activeCount());
    } catch (error) { fail(error); }
  }
  grid.setLoading();
  await refresh();
}

async function runAction(action, titulo, reload) {
  try {
    if (action === 'edit') return formTitulo(titulo, reload);
    if (action === 'baixa') return formBaixa(titulo, reload);
    if (action === 'rep') return formReprogramacao(titulo, reload);
    if (action === 'del' && await confirmDialog({ title: 'Excluir título', message: `Excluir o título ${titulo.docum} de ${titulo.fornecedor}? Esta ação não pode ser desfeita.`, confirmLabel: 'Excluir', danger: true })) {
      await api('DELETE', `/api/titulos/${titulo.id}`);
      await reload();
      notify('Título excluído');
    }
    if (action === 'est' && await confirmDialog({ title: 'Estornar baixa', message: `Estornar a baixa do título ${titulo.docum}? Ele volta para "Em aberto".`, confirmLabel: 'Estornar', danger: true })) {
      await api('POST', `/api/titulos/${titulo.id}/estorno`, {});
      await reload();
      notify('Baixa estornada');
    }
  } catch (error) { fail(error); }
  return undefined;
}

function formTitulo(t, reload) {
  const { lists } = state;
  const rateio = t ? t.rateio : [];
  const ccRows = [0, 1, 2, 3].map((i) => `<div class="row"><label>Centro de custo ${i + 1}<select name="cc${i}">${options(lists.centros, rateio[i]?.cc, '—')}</select></label>
    <label>Valor (R$)<input name="vr${i}" ${maskAttrs('money')} value="${formatMoneyInput(rateio[i]?.valor)}"></label></div>`).join('');
  openDialog(`<h2>${t ? 'Alterar' : 'Incluir'} título</h2><div class="row">
    <label>Fornecedor<select name="codig" required>${options(lists.fornecedores, t?.codig, 'Selecione')}</select></label>
    <label>Nº documento<input name="docum" maxlength="8" required value="${esc(t?.docum)}"></label>
    <label>Vencimento<input type="date" name="dtvec" required value="${t?.dtvec || today()}"></label>
    <label>Emissão<input type="date" name="dtemi" value="${t?.dtemi || today()}"></label>
    <label>Valor (R$)<input name="valor" ${maskAttrs('money')} required value="${formatMoneyInput(t?.valor)}"></label></div>
    <div class="row"><label style="flex:1">Histórico<input name="histo" maxlength="52" required value="${esc(t?.histo)}"></label>
    <label>Local/forma<input name="local" maxlength="20" value="${esc(t?.local)}"></label><label>Nota fiscal<input name="notaf" maxlength="6" value="${esc(t?.notaf)}"></label>
    <label>Natureza<select name="natur" required>${options(lists.naturezas, t?.natur, 'Selecione')}</select></label></div>
    <h3>Rateio por centro de custo (soma = valor)</h3>${ccRows}
    <div id="rateioInfo" class="field-status" role="status" aria-live="polite"></div>`, async (b) => {
    const itens = [0, 1, 2, 3].map((i) => ({ cc: b[`cc${i}`], valor: b[`vr${i}`] })).filter((x) => x.cc);
    if (itens.length === 1 && !itens[0].valor) itens[0].valor = b.valor;
    await api(t ? 'PUT' : 'POST', `/api/titulos${t ? `/${t.id}` : ''}`, { ...b, rateio: itens });
  }, async () => { await reload(); notify(t ? 'Título alterado' : 'Título incluído'); });
  wireRateioHelper(document.getElementById('df'));
  if (!lists.fornecedores.length || !lists.naturezas.length || !lists.centros.length) {
    document.getElementById('dmsg').innerHTML = `<div class="msg err" role="alert">${icon('alert')}<span>Cadastre ao menos um fornecedor, uma natureza e um centro de custo antes de incluir títulos.</span></div>`;
  }
}

/** Mostra ao vivo quanto já foi rateado e preenche o valor do 1º centro de custo com o total do título. */
function wireRateioHelper(form) {
  const info = document.getElementById('rateioInfo');
  const cents = (name) => Math.round(Number(parseMoney(form.elements[name].value) || 0) * 100);
  const update = () => {
    const total = cents('valor');
    const rateado = [0, 1, 2, 3].reduce((sum, i) => sum + (form.elements[`cc${i}`].value ? cents(`vr${i}`) : 0), 0);
    const onlyFirst = form.elements.cc0.value && ![1, 2, 3].some((i) => form.elements[`cc${i}`].value) && !form.elements.vr0.value;
    if (!total || (!rateado && !onlyFirst)) { info.className = 'field-status'; info.innerHTML = ''; return; }
    const ok = onlyFirst || rateado === total;
    info.className = `field-status ${ok ? 'ok' : 'warn'}`;
    info.innerHTML = `${icon(ok ? 'check' : 'alert')}<span>${ok ? 'Rateio completo.' : `Rateado ${brl(rateado / 100)} de ${brl(total / 100)} — ${rateado < total ? 'falta' : 'excede'} ${brl(Math.abs(total - rateado) / 100)}.`}</span>`;
  };
  form.elements.cc0.addEventListener('change', () => {
    if (form.elements.cc0.value && !form.elements.vr0.value && form.elements.valor.value) form.elements.vr0.value = form.elements.valor.value;
    update();
  });
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
}

function formBaixa(t, reload) {
  openDialog(`<h2>Baixar título ${esc(t.docum)} — ${esc(t.fornecedor)}</h2><p>Valor do título: <b>${brl(t.valor)}</b> (pago − juros + desconto deve igualar o valor)</p><div class="row">
    <label>Data pagamento<input type="date" name="dtpag" required value="${today()}"></label>
    <label>Valor pago (R$)<input name="receb" ${maskAttrs('money')} required value="${formatMoneyInput(t.valor)}"></label>
    <label>Juros (R$)<input name="juros" ${maskAttrs('money')} value="0,00"></label>
    <label>Desconto (R$)<input name="desco" ${maskAttrs('money')} value="0,00"></label></div><div class="row">
    <label>Nº cheque<input name="noche" maxlength="6"></label><label>Banco<input name="banco" maxlength="21"></label>
    <label>Valor do cheque (R$)<input name="vrche" ${maskAttrs('money')} value="${formatMoneyInput(t.valor)}"></label></div>`,
  (b) => api('POST', `/api/titulos/${t.id}/baixa`, b),
  async () => { await reload(); notify('Título baixado'); });
}

function formReprogramacao(t, reload) {
  openDialog(`<h2>Reprogramar vencimento — ${esc(t.docum)}</h2><div class="row">
    <label>Nova data<input type="date" name="dtrep" required value="${t.dtrep || t.dtvec}"></label>
    <label>Valor reprogramado (R$)<input name="valre" ${maskAttrs('money')} value="${formatMoneyInput(t.valre || t.valor)}"></label></div>`,
  (b) => api('POST', `/api/titulos/${t.id}/reprogramar`, b),
  async () => { await reload(); notify('Vencimento reprogramado'); });
}
