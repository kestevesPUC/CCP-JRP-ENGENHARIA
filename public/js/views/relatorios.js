import { api, queryString } from '../api.js';
import { esc, brl, dt, currentMonthRange } from '../format.js';
import { icon } from '../icons.js';
import { state, loadLists, options } from '../state.js';
import { view, fail } from '../ui.js';

// [tipo, rótulo, lista de apoio (ou null quando não exige escolha de item)]
const RELATORIOS = [
  ['vencimentos', 'Vencimentos do período', null], ['pagamentos', 'Pagamentos do período', null], ['reprogramados', 'Reprogramados do período', null],
  ['fornecedor', 'Ficha do fornecedor', 'fornecedores'], ['natureza', 'Ficha da natureza', 'naturezas'], ['centro', 'Ficha do centro de custo', 'centros'],
  ['baixas', 'Geral de baixas', null],
];

const renderRelatorio = (r) => `<div class="card"><h2>${esc(r.titulo)}</h2>${r.de || r.ate ? `<p>Período: ${dt(r.de) || '…'} a ${dt(r.ate) || '…'}</p>` : ''}
  <div class="wrap"><table><tr><th>Venc.</th><th>Fornecedor</th><th>Doc.</th><th>Histórico</th><th class="n">Valor</th><th>Pagamento</th><th class="n">Pago</th></tr>
  ${r.rows.map((t) => `<tr><td>${dt(t.dtvec)}</td><td>${esc(t.fornecedor)}</td><td>${esc(t.docum)}</td><td>${esc(t.histo)}</td><td class="n">${brl(t.valor)}</td><td>${dt(t.baixa?.dtpag)}</td><td class="n">${t.baixa ? brl(t.baixa.receb) : ''}</td></tr>`).join('')}
  <tr><th colspan="4">TOTAL (${r.rows.length} títulos)</th><th class="n">${brl(r.total)}</th><th></th><th></th></tr></table></div></div>`;

export async function viewRelatorios() {
  await loadLists();
  const month = currentMonthRange();
  view().innerHTML = `<div class="card noprint"><form id="rf" class="row">
    <label>Relatório<select name="tipo">${RELATORIOS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
    <label id="sel">Item<select name="id"></select></label>
    <label>De<input type="date" name="de" value="${month.de}"></label><label>Até<input type="date" name="ate" value="${month.ate}"></label>
    <button class="btn">Gerar</button>
    <button type="button" class="btn alt" id="csv">${icon('download')}Exportar CSV</button>
    <button type="button" class="btn alt" id="print">${icon('printer')}Imprimir</button></form></div><div id="rel"></div>`;

  const form = document.getElementById('rf');
  const syncItem = () => {
    const [, , listName] = RELATORIOS.find(([k]) => k === form.tipo.value);
    document.getElementById('sel').style.display = listName ? '' : 'none';
    form.id.innerHTML = listName ? options(state.lists[listName]) : '';
  };
  form.tipo.onchange = syncItem;
  syncItem();

  const params = () => Object.fromEntries(new FormData(form));
  form.onsubmit = async (event) => {
    event.preventDefault();
    const { tipo, ...rest } = params();
    try {
      document.getElementById('rel').innerHTML = renderRelatorio(await api('GET', `/api/relatorios/${tipo}?${queryString(rest)}`));
    } catch (error) { fail(error); }
  };
  document.getElementById('csv').onclick = () => {
    const { tipo, ...rest } = params();
    location.href = `/api/relatorios/${tipo}?${queryString({ ...rest, formato: 'csv' })}`;
  };
  document.getElementById('print').onclick = () => print();
}
