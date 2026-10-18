import { esc } from '../format.js';
import { openDialog } from '../ui.js';

/**
 * Modal de filtros específicos de uma tela.
 * Campos: { name, label, type: 'select'|'text'|'date'|'number', options?: {value,label}[], placeholder? }.
 * `onApply(values)` recebe só os campos preenchidos; "Limpar filtros" aplica `defaults`.
 */
export function openFilterDialog({ title = 'Filtros', fields, values, defaults = {}, onApply }) {
  const control = (field) => {
    const value = values[field.name] ?? '';
    if (field.type === 'select') {
      return `<select name="${field.name}">${field.options.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
    }
    const step = field.type === 'number' ? ' step="0.01" min="0"' : '';
    return `<input type="${field.type}" name="${field.name}" value="${esc(value)}" placeholder="${esc(field.placeholder || '')}"${step}>`;
  };

  const clean = (data) => Object.fromEntries(Object.entries(data).filter(([, v]) => String(v).trim() !== ''));

  openDialog(
    `<h2>${esc(title)}</h2><div class="form-grid">${fields.map((f) => `<label>${esc(f.label)}${control(f)}</label>`).join('')}</div>`,
    async (data) => onApply(clean(data)),
    () => {},
    { confirmLabel: 'Aplicar filtros', extraButtons: '<button type="button" class="btn alt" id="filterClear">Limpar filtros</button>' },
  );

  document.getElementById('filterClear').onclick = () => {
    document.getElementById('dlg').close();
    onApply({ ...defaults });
  };
}
