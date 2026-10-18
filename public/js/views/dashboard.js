import { api } from '../api.js';
import { esc, brl, dt } from '../format.js';
import { icon } from '../icons.js';
import { view, fail } from '../ui.js';
import { columnChart, barList } from '../components/charts.js';
import { setTituloFilters } from './titulos.js';

const PERIODS = [3, 6, 12];
let period = 6;

const compactBrl = (n) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.', ',')} mi` : n >= 10_000 ? `${Math.round(n / 1000)} mil` : n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} mil` : String(Math.round(n)));
const monthLabel = (ym) => new Date(`${ym}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '').replace(' de ', '/');
const monthLong = (ym) => new Date(`${ym}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
const pct = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const addDays = (iso, days) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** Pontos de atenção para o gestor, calculados a partir dos dados (ícone + texto; a cor é só reforço). */
function insights(d) {
  const i = d.indicadores;
  const list = [];
  if (i.vencidos.qtd > 0) {
    list.push({ tone: 'bad', text: `${plural(i.vencidos.qtd, 'título vencido soma', 'títulos vencidos somam')} ${brl(i.vencidos.valor)} (${pct(i.vencidos.valor, i.abertos.valor)}% do valor em aberto).` });
  }
  const old = d.vencidosPorFaixa.find((f) => f.faixa === 'Mais de 90 dias');
  if (old?.qtd > 0) list.push({ tone: 'bad', text: `${plural(old.qtd, 'título está vencido', 'títulos estão vencidos')} há mais de 90 dias (${brl(old.valor)}): priorize negociar ou regularizar.` });
  if (i.hoje.qtd > 0) list.push({ tone: 'warn', text: `${plural(i.hoje.qtd, 'título vence', 'títulos vencem')} hoje, totalizando ${brl(i.hoje.valor)}.` });
  if (i.semana.qtd > i.hoje.qtd) list.push({ tone: 'warn', text: `Nos próximos 7 dias vencem ${plural(i.semana.qtd, 'título', 'títulos')} (${brl(i.semana.valor)}): programe o caixa.` });
  if (i.jurosMes > 0) list.push({ tone: 'warn', text: `Juros pagos neste mês: ${brl(i.jurosMes)} — custo de pagamentos em atraso.` });
  if (i.concentracaoTopFornecedor >= 0.3 && d.topFornecedores[0]) {
    list.push({ tone: 'info', text: `${d.topFornecedores[0].nome} concentra ${Math.round(i.concentracaoTopFornecedor * 100)}% do valor em aberto (dependência de um só credor).` });
  }
  const totalAVencer = d.aVencerPorMes.reduce((s, m) => s + m.valor, 0);
  const peak = [...d.aVencerPorMes].sort((a, b) => b.valor - a.valor)[0];
  if (peak && totalAVencer > 0 && d.aVencerPorMes.filter((m) => m.valor > 0).length > 1 && pct(peak.valor, totalAVencer) >= 40) {
    list.push({ tone: 'info', text: `Pico de vencimentos em ${monthLong(peak.mes)}: ${brl(peak.valor)} (${pct(peak.valor, totalAVencer)}% do que vence no período).` });
  }
  if (!list.length) list.push({ tone: 'ok', text: 'Nenhum ponto crítico: sem títulos vencidos e sem concentração relevante.' });
  return list;
}

const TONE_ICON = { bad: 'alert', warn: 'clock', info: 'info', ok: 'check' };

function kpi({ label, value, hint, tone = '', iconName, action }) {
  return `<${action ? 'button type="button"' : 'div'} class="card kpi ${tone}" ${action ? `data-kpi="${action}"` : ''}>
    <span class="kpi-ico ${tone}">${icon(iconName)}</span>
    <span class="kpi-body"><span class="kpi-label">${esc(label)}</span><b>${esc(value)}</b><small>${esc(hint)}</small></span></${action ? 'button' : 'div'}>`;
}

function render(d) {
  const i = d.indicadores;
  const delta = i.pagoMesAnterior > 0 ? Math.round(((i.pagoMes - i.pagoMesAnterior) / i.pagoMesAnterior) * 100) : null;
  const deltaText = delta === null ? 'sem base no mês anterior' : `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}% vs. mês anterior`;

  view().innerHTML = `
    <div class="dash-toolbar noprint"><p class="dash-date">Posição em ${dt(d.hoje)}</p>
      <label>Período dos gráficos<select id="period">${PERIODS.map((p) => `<option value="${p}" ${p === d.periodo ? 'selected' : ''}>${p} meses</option>`).join('')}</select></label></div>

    <section class="card attention" aria-labelledby="att"><h2 id="att">Pontos de atenção</h2>
      <ul>${insights(d).map((x) => `<li class="${x.tone}">${icon(TONE_ICON[x.tone])}<span>${esc(x.text)}</span></li>`).join('')}</ul></section>

    <div class="kpis">
      ${kpi({ label: 'Em aberto', value: brl(i.abertos.valor), hint: plural(i.abertos.qtd, 'título', 'títulos'), iconName: 'wallet', action: 'abertos' })}
      ${kpi({ label: 'Vencidos', value: brl(i.vencidos.valor), hint: `${plural(i.vencidos.qtd, 'título', 'títulos')} · ${pct(i.vencidos.valor, i.abertos.valor)}% do aberto`, tone: i.vencidos.qtd ? 'bad' : '', iconName: 'alert', action: 'vencidos' })}
      ${kpi({ label: 'Vencem em 7 dias', value: brl(i.semana.valor), hint: `${plural(i.semana.qtd, 'título', 'títulos')} (hoje: ${brl(i.hoje.valor)})`, tone: i.semana.qtd ? 'warn' : '', iconName: 'calendar', action: 'semana' })}
      ${kpi({ label: 'Pago no mês', value: brl(i.pagoMes), hint: deltaText, tone: 'ok', iconName: 'trend', action: 'pagos' })}
      ${kpi({ label: 'Juros pagos no mês', value: brl(i.jurosMes), hint: `descontos obtidos: ${brl(i.descontosMes)}`, tone: i.jurosMes ? 'warn' : '', iconName: 'cash' })}
    </div>

    <div class="dash-grid">
      <section class="card"><h2>A vencer por mês</h2><p class="chart-sub">Títulos em aberto a partir de hoje</p>
        ${columnChart(d.aVencerPorMes.map((m) => ({ label: monthLabel(m.mes), value: m.valor, sub: plural(m.qtd, 'título', 'títulos') })), { format: brl, compact: compactBrl, ariaLabel: 'Valor a vencer por mês' })}</section>
      <section class="card"><h2>Pagamentos realizados por mês</h2><p class="chart-sub">Total pago (inclui juros)</p>
        ${columnChart(d.pagamentosPorMes.map((m) => ({ label: monthLabel(m.mes), value: m.pago, sub: `${plural(m.qtd, 'título', 'títulos')}; juros ${brl(m.juros)}` })), { tone: 'ok', format: brl, compact: compactBrl, ariaLabel: 'Valor pago por mês' })}</section>
      <section class="card"><h2>Vencidos por faixa de atraso</h2><p class="chart-sub">Quanto mais antigo, maior o risco</p>
        ${columnChart(d.vencidosPorFaixa.map((f) => ({ label: f.faixa.replace(' dias', ' d').replace('Mais de', '>'), value: f.valor, sub: plural(f.qtd, 'título', 'títulos') })), { tone: 'bad', format: brl, compact: compactBrl, ariaLabel: 'Valor vencido por faixa de atraso' })}</section>
      <section class="card"><h2>Maiores fornecedores em aberto</h2><p class="chart-sub">Concentração do que falta pagar</p>
        ${barList(d.topFornecedores.map((f) => ({ label: f.nome, value: f.valor, extra: plural(f.qtd, 'título', 'títulos') })), { format: brl, emptyText: 'Nenhum título em aberto.' })}</section>
      <section class="card"><h2>Em aberto por natureza</h2><p class="chart-sub">Para onde vai o dinheiro</p>
        ${barList(d.porNatureza.map((n) => ({ label: n.nome, value: n.valor, extra: plural(n.qtd, 'título', 'títulos') })), { tone: 'warn', format: brl, emptyText: 'Nenhum título em aberto.' })}</section>
      <section class="card"><h2>Em aberto por centro de custo</h2><p class="chart-sub">Valor rateado de cada título</p>
        ${barList(d.porCentroCusto.map((c) => ({ label: c.nome, value: c.valor, extra: plural(c.qtd, 'título', 'títulos') })), { format: brl, emptyText: 'Nenhum título em aberto.' })}</section>
    </div>

    <section class="card"><h2>Próximos vencimentos</h2><p class="chart-sub">Os títulos em aberto mais urgentes (vencidos primeiro)</p>
      <div class="wrap"><table><thead><tr><th>Vencimento</th><th>Fornecedor</th><th>Documento</th><th>Histórico</th><th class="n">Valor</th><th>Situação</th></tr></thead><tbody>
      ${d.proximosVencimentos.map((t) => `<tr><td>${dt(t.dtvec)}</td><td>${esc(t.fornecedor)}</td><td>${esc(t.docum)}</td><td>${esc(t.histo)}</td><td class="n">${brl(t.valor)}</td>
        <td>${t.dtvec < d.hoje ? `<span class="tag venc">${icon('alert')}Vencido</span>` : t.dtvec === d.hoje ? `<span class="tag hoje">${icon('calendar')}Vence hoje</span>` : `<span class="tag aberto">${icon('clock')}Em aberto</span>`}</td></tr>`).join('')
        || '<tr><td colspan="6" class="empty">Nenhum título em aberto.</td></tr>'}</tbody></table></div>
      <p class="dash-more"><button type="button" class="btn alt sm" data-kpi="abertos">Ver todos no Movimento</button></p></section>`;

  document.getElementById('period').onchange = (event) => { period = Number(event.target.value); load(); };
  view().querySelectorAll('[data-kpi]').forEach((el) => {
    el.onclick = () => {
      const { hoje } = d;
      const filters = {
        abertos: { status: 'abertos' },
        vencidos: { status: 'abertos', ate: addDays(hoje, -1) },
        semana: { status: 'abertos', de: hoje, ate: addDays(hoje, 7) },
        pagos: { status: 'pagos' },
      }[el.dataset.kpi];
      setTituloFilters(filters);
      window.dispatchEvent(new CustomEvent('ccp:navigate', { detail: { section: 'titulos' } }));
    };
  });
}

async function load() {
  try {
    render(await api('GET', `/api/dashboard?meses=${period}`));
  } catch (error) { fail(error); }
}

/** Dashboard gerencial: indicadores, gráficos e pontos de atenção para apoiar a tomada de decisão. */
export async function viewDashboard() {
  view().innerHTML = '<p class="chart-empty">Carregando painel…</p>';
  await load();
}
