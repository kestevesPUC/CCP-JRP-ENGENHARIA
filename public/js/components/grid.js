import { esc } from '../format.js';
import { icon } from '../icons.js';

/**
 * Grid padrão das telas: barra com pesquisa e "Filtros" à esquerda; exportação e novo item (abre modal)
 * à direita; abaixo, só a tabela, com ordenação por coluna e ações por linha.
 *
 * @param {HTMLElement} host
 * @param {object} config
 * @param {{label:string, align?:'right', cell:(row:object)=>string, sort?:(row:object)=>string|number}[]} config.columns
 *        `sort` habilita a ordenação ao clicar no cabeçalho.
 * @param {(row:object)=>{a:string,label:string,danger?:boolean}[]} [config.rowActions] ações da linha: a primeira fica
 *        visível e as demais vão para o menu "⋯" (com 2 ou menos, todas ficam visíveis).
 * @param {string} [config.search] texto inicial da pesquisa
 * @param {string} [config.searchPlaceholder]
 * @param {number} [config.debounceMs] atraso da pesquisa (use > 0 quando a busca vai ao servidor)
 * @param {(query:string)=>void} config.onSearch
 * @param {()=>void} config.onFilters abre o modal de filtros
 * @param {()=>void} [config.onExport] mostra o botão de exportação
 * @param {string} [config.exportLabel]
 * @param {()=>void} [config.onImport] mostra o botão "Importar CSV" (abre o modal de importação)
 * @param {()=>void} [config.onNew] mostra o botão de novo item (canto superior direito)
 * @param {string} [config.newLabel]
 * @param {(action:string,row:object)=>void} [config.onAction] clique nas ações de linha
 * @param {string} [config.emptyText]
 * @returns {{setRows(rows:object[], summary?:string): void, setFilterCount(n:number): void, setLoading(): void}}
 */
export function createGrid(host, config) {
  const {
    columns, rowActions, search = '', searchPlaceholder = 'Pesquisar…', debounceMs = 0, onSearch, onFilters,
    onExport, exportLabel = 'Exportar CSV', onImport, onNew, newLabel = 'Novo', onAction, emptyText = 'Nenhum registro encontrado.',
  } = config;
  const colSpan = columns.length + (rowActions ? 1 : 0);
  let rows = [];
  let sort = { index: -1, dir: 1 };

  const header = (c, i) => (c.sort
    ? `<th class="${c.align === 'right' ? 'n' : ''}" data-col="${i}" aria-sort="none"><button type="button" class="th-sort" data-sort="${i}">${esc(c.label)}<span class="sort-ind" aria-hidden="true"></span></button></th>`
    : `<th class="${c.align === 'right' ? 'n' : ''}">${esc(c.label)}</th>`);

  host.innerHTML = `<div class="card grid">
    <div class="grid-toolbar noprint">
      <label class="grid-search">
        <span class="visually-hidden">Pesquisar</span>${icon('search')}
        <input type="search" value="${esc(search)}" placeholder="${esc(searchPlaceholder)}" title="Atalho: tecla /" autocomplete="off" data-grid="search">
      </label>
      <button type="button" class="btn alt" data-grid="filters">${icon('filter')}Filtros<span class="badge" hidden></span></button>
      <div class="grid-actions">
        ${onExport ? `<button type="button" class="btn alt" data-grid="export">${icon('download')}${esc(exportLabel)}</button>` : ''}
        ${onImport ? `<button type="button" class="btn alt" data-grid="import">${icon('upload')}Importar CSV</button>` : ''}
        ${onNew ? `<button type="button" class="btn" data-grid="new">${icon('plus')}${esc(newLabel)}</button>` : ''}
      </div>
    </div>
    <p class="grid-info" aria-live="polite"></p>
    <div class="wrap"><table>
      <thead><tr>${columns.map(header).join('')}${rowActions ? '<th></th>' : ''}</tr></thead>
      <tbody></tbody>
    </table></div></div>`;

  const input = host.querySelector('[data-grid="search"]');
  const badge = host.querySelector('.badge');
  const info = host.querySelector('.grid-info');
  const tbody = host.querySelector('tbody');

  const actionButton = (action, inMenu) => `<button type="button" class="${inMenu ? 'menu-item' : 'btn alt sm'}${action.danger ? ' danger' : ''}" data-a="${action.a}">${esc(action.label)}</button>`;
  const actionsCell = (row) => {
    const actions = rowActions(row);
    if (actions.length <= 2) return actions.map((a) => actionButton(a, false)).join('');
    const [primary, ...rest] = actions;
    return `${actionButton(primary, false)}<details class="row-menu"><summary class="btn alt sm" aria-label="Mais ações">⋯</summary><div class="menu-list">${rest.map((a) => actionButton(a, true)).join('')}</div></details>`;
  };

  const sortedRows = () => {
    if (sort.index < 0) return rows;
    const key = columns[sort.index].sort;
    return [...rows].sort((a, b) => {
      const [x, y] = [key(a), key(b)];
      const result = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR', { numeric: true });
      return result * sort.dir;
    });
  };

  const paintHeaders = () => {
    host.querySelectorAll('th[data-col]').forEach((th) => {
      const active = Number(th.dataset.col) === sort.index;
      th.setAttribute('aria-sort', active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none');
      th.querySelector('.sort-ind').textContent = active ? (sort.dir === 1 ? ' ▲' : ' ▼') : '';
    });
  };

  const paintRows = () => {
    tbody.innerHTML = rows.length
      ? sortedRows().map((row) => `<tr data-id="${row.id}">${columns.map((c) => `<td class="${c.align === 'right' ? 'n' : ''}">${c.cell(row)}</td>`).join('')}${rowActions
        ? `<td class="n"><div class="actions">${actionsCell(row)}</div></td>` : ''}</tr>`).join('')
      : `<tr><td colspan="${colSpan}" class="empty">${esc(emptyText)}</td></tr>`;
  };

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => onSearch(input.value.trim()), debounceMs);
  });
  host.querySelector('[data-grid="filters"]').onclick = onFilters;
  if (onExport) host.querySelector('[data-grid="export"]').onclick = onExport;
  if (onImport) host.querySelector('[data-grid="import"]').onclick = onImport;
  if (onNew) host.querySelector('[data-grid="new"]').onclick = onNew;

  host.querySelector('thead').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-sort]');
    if (!button) return;
    const index = Number(button.dataset.sort);
    sort = sort.index === index ? { index, dir: -sort.dir } : { index, dir: 1 };
    paintHeaders();
    paintRows();
  });

  tbody.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-a]');
    if (!button || !onAction) return;
    button.closest('details')?.removeAttribute('open');
    const row = rows.find((r) => String(r.id) === button.closest('tr').dataset.id);
    if (row) onAction(button.dataset.a, row);
  });

  // Fecha o menu "⋯" ao clicar fora dele.
  document.addEventListener('click', (event) => {
    host.querySelectorAll('details.row-menu[open]').forEach((d) => { if (!d.contains(event.target)) d.removeAttribute('open'); });
  });

  return {
    setRows(newRows, summary = '') {
      rows = newRows;
      paintRows();
      info.textContent = `${rows.length} registro${rows.length === 1 ? '' : 's'}${summary ? ` · ${summary}` : ''}`;
    },
    setFilterCount(count) {
      badge.hidden = count === 0;
      badge.textContent = String(count);
    },
    setLoading() {
      tbody.innerHTML = `<tr><td colspan="${colSpan}" class="empty">Carregando…</td></tr>`;
    },
  };
}
