import { api, queryString } from '../api.js';
import { esc, dt } from '../format.js';
import { icon } from '../icons.js';
import { view, fail, openDialog } from '../ui.js';
import { createGrid } from '../components/grid.js';
import { openFilterDialog } from '../components/filterDialog.js';

const ACTION_LABEL = {
  criar: 'Criou', alterar: 'Alterou', excluir: 'Excluiu', baixar: 'Baixou', estornar: 'Estornou', reprogramar: 'Reprogramou', importar: 'Importou',
  login: 'Entrou', logout: 'Saiu', login_falha: 'Falha de login', login_bloqueado: 'Login bloqueado', senha: 'Trocou senha', backup: 'Backup',
  verificar_atualizacao: 'Verificou atualização', atualizar: 'Atualizou o sistema',
};
const ACTION_TONE = { excluir: 'venc', estornar: 'venc', login_falha: 'venc', login_bloqueado: 'venc', criar: 'pago', importar: 'pago', baixar: 'pago' };
const ENTITY_LABEL = { titulo: 'Título', fornecedor: 'Fornecedor', natureza: 'Natureza', centro: 'Centro de custo', usuario: 'Usuário', sessao: 'Sessão', sistema: 'Sistema' };

const label = (map, key) => map[key] || key;
const when = (iso) => new Date(iso).toLocaleString('pt-BR');

// Pesquisa e filtros mantidos ao navegar entre telas.
const current = { q: '', filters: {} };

const FIELD_LABEL = { dtvec: 'Vencimento', dtemi: 'Emissão', valor: 'Valor', histo: 'Histórico', docum: 'Documento', codig: 'Fornecedor (cód.)', natur: 'Natureza (cód.)', local: 'Local', notaf: 'Nota fiscal', nome: 'Nome', baixa: 'Baixa', dtrep: 'Reprogramado para', valre: 'Valor reprogramado', rateio: 'Rateio', nivel: 'Nível', usuario: 'Usuário' };
const show = (v) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));

/** Tabela "campo: antes → depois" apenas com o que mudou (ou todos os campos quando só há um dos lados). */
function diffTable(antes, depois) {
  const keys = [...new Set([...Object.keys(antes || {}), ...Object.keys(depois || {})])].filter((k) => !['id', 'fornecedor', 'natureza'].includes(k));
  const rows = keys.filter((k) => !antes || !depois || JSON.stringify(antes[k]) !== JSON.stringify(depois[k]));
  if (!rows.length) return '<p class="chart-sub">Sem alterações de campos.</p>';
  return `<div class="wrap"><table><thead><tr><th>Campo</th><th>Antes</th><th>Depois</th></tr></thead><tbody>${rows.map((k) => `<tr><td>${esc(FIELD_LABEL[k] || k)}</td><td>${esc(show(antes?.[k]))}</td><td>${esc(show(depois?.[k]))}</td></tr>`).join('')}</tbody></table></div>`;
}

async function openDetails(entry) {
  try {
    const full = await api('GET', `/api/auditoria/${entry.id}`);
    openDialog(`<h2>Registro #${full.id}</h2>
      <dl class="detail"><dt>Quando</dt><dd>${esc(when(full.em))}</dd><dt>Quem</dt><dd>${esc(full.usuario)}</dd>
      <dt>Ação</dt><dd>${esc(label(ACTION_LABEL, full.acao))} · ${esc(label(ENTITY_LABEL, full.entidade))}${full.entidadeId ? ` #${full.entidadeId}` : ''}</dd>
      <dt>Descrição</dt><dd>${esc(full.descricao)}</dd></dl>
      ${full.antes || full.depois ? `<h3>O que mudou</h3>${diffTable(full.antes, full.depois)}` : ''}`, async () => {}, () => {}, { confirmLabel: 'Fechar' });
    document.getElementById('dc').remove();
  } catch (error) { fail(error); }
}

/** Auditoria (nível A): quem fez o quê e quando, com busca, filtros, detalhes antes/depois e exportação CSV. */
export async function viewAuditoria() {
  const options = await api('GET', '/api/auditoria/opcoes');
  const query = () => queryString({ ...current.filters, q: current.q });
  const choices = (values, blank, text = (v) => v) => [{ value: '', label: blank }, ...values.map((v) => ({ value: v, label: text(v) }))];

  const grid = createGrid(view(), {
    search: current.q,
    searchPlaceholder: 'Pesquisar por usuário, ação, entidade ou descrição…',
    debounceMs: 300,
    columns: [
      { label: 'Data/hora', sort: (e) => e.em, cell: (e) => esc(when(e.em)) },
      { label: 'Usuário', sort: (e) => e.usuario, cell: (e) => esc(e.usuario) },
      { label: 'Ação', sort: (e) => e.acao, cell: (e) => `<span class="tag ${ACTION_TONE[e.acao] || ''}">${esc(label(ACTION_LABEL, e.acao))}</span>` },
      { label: 'Entidade', sort: (e) => e.entidade, cell: (e) => `${esc(label(ENTITY_LABEL, e.entidade))}${e.entidadeId ? ` <small>#${e.entidadeId}</small>` : ''}` },
      { label: 'Descrição', cell: (e) => esc(e.descricao) },
    ],
    rowActions: () => [{ a: 'detalhes', label: 'Detalhes' }],
    onExport: () => { location.href = `/api/exportar/auditoria?${query()}`; },
    onSearch: (q) => { current.q = q; refresh(); },
    onFilters: () => openFilterDialog({
      title: 'Filtros da auditoria',
      fields: [
        { name: 'usuario', label: 'Usuário', type: 'select', options: choices(options.usuarios, 'Todos') },
        { name: 'acao', label: 'Ação', type: 'select', options: choices(options.acoes, 'Todas', (v) => label(ACTION_LABEL, v)) },
        { name: 'entidade', label: 'Entidade', type: 'select', options: choices(options.entidades, 'Todas', (v) => label(ENTITY_LABEL, v)) },
        { name: 'de', label: 'De (data)', type: 'date' },
        { name: 'ate', label: 'Até (data)', type: 'date' },
      ],
      values: current.filters,
      onApply: (values) => { current.filters = values; refresh(); },
    }),
    onAction: (_action, entry) => openDetails(entry),
    emptyText: 'Nenhum registro de auditoria com esses critérios.',
  });

  async function refresh() {
    try {
      const rows = await api('GET', `/api/auditoria?${query()}`);
      const f = current.filters;
      const parts = [f.usuario && `Usuário: ${f.usuario}`, f.acao && `Ação: ${label(ACTION_LABEL, f.acao)}`, f.entidade && `Entidade: ${label(ENTITY_LABEL, f.entidade)}`, f.de && `De ${dt(f.de)}`, f.ate && `Até ${dt(f.ate)}`].filter(Boolean);
      grid.setRows(rows, `${parts.join(' · ') || 'Mais recentes primeiro'}${rows.length >= 1000 ? ' · exibindo os 1000 mais recentes' : ''}`);
      grid.setFilterCount(Object.keys(f).length);
    } catch (error) { fail(error); }
  }
  grid.setLoading();
  await refresh();
}
