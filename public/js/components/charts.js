import { esc } from '../format.js';

// Gráficos leves em SVG/HTML (sem bibliotecas, funcionam offline). Cores vêm de tokens CSS (.bar.brand/.ok/.bad/.warn),
// então acompanham o tema claro/escuro. Cada barra tem <title> (dica ao passar o mouse) e o gráfico tem descrição textual.

const W = 640;
const H = 230;
const PAD = { top: 26, bottom: 34, left: 8, right: 8 };

/**
 * Gráfico de colunas.
 * @param {{label:string, value:number, sub?:string}[]} data
 * @param {{tone?:'brand'|'ok'|'bad'|'warn', format:(n:number)=>string, compact?:(n:number)=>string, ariaLabel:string, onBarLabel?:string}} options
 */
export function columnChart(data, { tone = 'brand', format, compact = format, ariaLabel }) {
  const max = Math.max(...data.map((d) => d.value), 0);
  if (max === 0) return '<p class="chart-empty">Sem valores no período.</p>';
  const slot = (W - PAD.left - PAD.right) / data.length;
  const barW = Math.min(64, slot * 0.62);
  const plotH = H - PAD.top - PAD.bottom;

  const bars = data.map((d, i) => {
    const h = Math.max(d.value > 0 ? 3 : 0, (d.value / max) * plotH);
    const x = PAD.left + i * slot + (slot - barW) / 2;
    const y = PAD.top + plotH - h;
    return `<g>
      <rect class="bar ${tone}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="4"><title>${esc(d.label)}: ${esc(format(d.value))}${d.sub ? ` — ${esc(d.sub)}` : ''}</title></rect>
      ${d.value > 0 ? `<text class="chart-value" x="${(x + barW / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle">${esc(compact(d.value))}</text>` : ''}
      <text class="chart-label" x="${(x + barW / 2).toFixed(1)}" y="${H - 12}" text-anchor="middle">${esc(d.label)}</text>
    </g>`;
  }).join('');

  const summary = data.map((d) => `${d.label}: ${format(d.value)}`).join('; ');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ariaLabel)}. ${esc(summary)}">
    <line class="chart-axis" x1="${PAD.left}" x2="${W - PAD.right}" y1="${PAD.top + plotH}" y2="${PAD.top + plotH}"/>${bars}</svg>`;
}

/**
 * Barras horizontais com rótulo e valor (rankings).
 * @param {{label:string, value:number, extra?:string}[]} rows
 */
export function barList(rows, { tone = 'brand', format, emptyText = 'Sem dados.' }) {
  const max = Math.max(...rows.map((r) => r.value), 0);
  if (!rows.length || max === 0) return `<p class="chart-empty">${esc(emptyText)}</p>`;
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  return `<ul class="bar-list">${rows.map((r) => `<li>
      <div class="bar-list-head"><span class="bar-list-label" title="${esc(r.label)}">${esc(r.label)}</span><span class="bar-list-value">${esc(format(r.value))}<small> · ${Math.round((r.value / total) * 100)}%</small></span></div>
      <div class="bar-track" role="presentation"><div class="bar-fill ${tone}" style="width:${((r.value / max) * 100).toFixed(1)}%"></div></div>
      ${r.extra ? `<small class="bar-list-extra">${esc(r.extra)}</small>` : ''}</li>`).join('')}</ul>`;
}
