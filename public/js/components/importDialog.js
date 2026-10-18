import { api } from '../api.js';
import { esc } from '../format.js';
import { icon } from '../icons.js';
import { notify, openDialog } from '../ui.js';

/** Lê o arquivo como UTF-8; se não for válido (Excel antigo salva em ANSI), tenta Windows-1252. */
async function readText(file) {
  const bytes = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

function renderPreview(result) {
  const ok = result.totalErros === 0 && result.validos > 0;
  const errors = result.erros.map((e) => `<li><b>Linha ${e.linha}:</b> ${esc(e.mensagem)}</li>`).join('');
  return `<div class="import-summary ${ok ? 'ok' : 'bad'}">${icon(ok ? 'check' : 'alert')}<span>
      ${result.total} linha(s) lidas · <b>${result.validos} válida(s)</b> · <b>${result.totalErros} com erro</b>.
      ${ok ? 'Tudo certo: confirme para importar.' : result.totalErros ? 'Corrija o arquivo e selecione-o novamente. Nada é importado enquanto houver erros.' : 'Nenhuma linha para importar.'}</span></div>
    ${errors ? `<ul class="import-errors">${errors}</ul>${result.totalErros > result.erros.length ? `<small>… e mais ${result.totalErros - result.erros.length} erro(s).</small>` : ''}` : ''}
    ${result.amostra.length ? `<p class="import-sample-title">Exemplo do que será importado:</p><ul class="import-sample">${result.amostra.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}`;
}

/**
 * Modal de importação por CSV: baixar modelo → escolher arquivo → conferir (validação sem gravar) → importar.
 * @param {{entity:string, title:string, onDone:()=>void}} options
 */
export function openImportDialog({ entity, title, onDone }) {
  let imported = 0;
  openDialog(
    `<h2>${esc(title)}</h2>
    <ol class="import-steps">
      <li><span><b>1.</b> Baixe o modelo, preencha e salve como CSV.</span>
        <a class="btn alt sm" href="/api/importar/${entity}/modelo" download>${icon('download')}Baixar modelo (CSV)</a>
        <small>O modelo traz uma linha de exemplo: apague-a antes de importar.</small></li>
      <li><span><b>2.</b> Selecione o arquivo preenchido.</span>
        <input type="file" id="importFile" accept=".csv,text/csv,.txt"></li>
      <li><span><b>3.</b> Confira o resultado e confirme.</span></li>
    </ol>
    <p class="import-columns" id="importColumns"></p>
    <input type="hidden" name="csv">
    <div id="importResult" aria-live="polite"></div>`,
    async (data) => {
      const result = await api('POST', `/api/importar/${entity}`, { csv: data.csv, confirmar: true });
      imported = result.importados;
    },
    () => { onDone(); notify(`${imported} registro(s) importado(s) com sucesso`); },
    { confirmLabel: 'Importar' },
  );

  const form = document.getElementById('df');
  const confirm = form.querySelector('.row button:not([type="button"])');
  confirm.disabled = true;

  api('GET', `/api/importar/${entity}`).then((info) => {
    document.getElementById('importColumns').innerHTML = `<b>Colunas do modelo:</b> ${info.colunas.map((c) => `${esc(c.header)}${c.obrigatoria ? '<abbr title="obrigatória">*</abbr>' : ''}`).join(' · ')}`;
  }).catch(() => {});

  document.getElementById('importFile').onchange = async (event) => {
    const [file] = event.target.files;
    const result = document.getElementById('importResult');
    confirm.disabled = true;
    form.elements.csv.value = '';
    if (!file) { result.innerHTML = ''; return; }
    result.innerHTML = '<p class="chart-sub">Validando arquivo…</p>';
    try {
      const csv = await readText(file);
      const preview = await api('POST', `/api/importar/${entity}`, { csv, confirmar: false });
      result.innerHTML = renderPreview(preview);
      if (preview.totalErros === 0 && preview.validos > 0) {
        form.elements.csv.value = csv;
        confirm.disabled = false;
        confirm.textContent = `Importar ${preview.validos} registro(s)`;
      }
    } catch (error) {
      result.innerHTML = `<div class="import-summary bad">${icon('alert')}<span>${esc(error.message)}</span></div>`;
    }
  };
}
