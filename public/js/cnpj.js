import { api } from './api.js';
import { esc } from './format.js';
import { icon } from './icons.js';

const strip = (value) => String(value || '').toUpperCase().replace(/[^0-9A-Z]/g, '');

/** Máscara progressiva: CPF (até 11) ou CNPJ numérico/alfanumérico (14). */
export function maskDocument(value) {
  const d = strip(value).slice(0, 14);
  if (d.length <= 11) return d.replace(/^(.{3})(.{1,3})?(.{1,3})?(.{1,2})?.*/, (_, a, b, c, e) => [a, b && `.${b}`, c && `.${c}`, e && `-${e}`].filter(Boolean).join(''));
  return d.replace(/^(.{2})(.{3})(.{3})(.{4})(.{0,2}).*/, '$1.$2.$3/$4-$5');
}

const STATUS_ICON = { ok: 'check', warn: 'alert', err: 'alert', info: 'clock' };

function showStatus(el, kind, text) {
  el.className = `field-status ${kind}`;
  el.innerHTML = text ? `${icon(STATUS_ICON[kind])}<span>${esc(text)}</span>` : '';
}

/**
 * Liga ao formulário de fornecedor: ao sair do campo CNPJ (cgc) consulta a Receita via API e preenche
 * somente os campos vazios. Todos os campos continuam editáveis; falhas apenas avisam o usuário.
 */
export function attachCnpjLookup(form, statusEl) {
  const input = form.elements.cgc;
  let lastLookup = '';
  let ticket = 0;

  input.addEventListener('input', () => { input.value = maskDocument(input.value); });

  input.addEventListener('blur', async () => {
    const digits = strip(input.value);
    if (!digits) return showStatus(statusEl, 'info', '');
    if (digits.length === 11) {
      if (!form.elements.pess.value) form.elements.pess.value = 'F';
      return showStatus(statusEl, 'info', 'CPF informado: a consulta automática vale apenas para CNPJ. Preencha os demais campos manualmente.');
    }
    if (digits.length !== 14) return showStatus(statusEl, 'warn', 'Documento incompleto: informe os 14 caracteres do CNPJ (ou 11 dígitos do CPF).');
    if (digits === lastLookup) return undefined;

    const current = ++ticket;
    showStatus(statusEl, 'info', 'Consultando CNPJ na Receita Federal…');
    try {
      const { fornecedor, situacao } = await api('GET', `/api/cnpj/${digits}`);
      if (current !== ticket) return undefined;
      lastLookup = digits;
      let filled = 0;
      for (const [name, value] of Object.entries(fornecedor)) {
        const field = form.elements[name];
        if (name !== 'cgc' && field && value && !field.value) { field.value = value; filled += 1; }
      }
      const inactive = situacao && situacao.toUpperCase() !== 'ATIVA';
      if (inactive) showStatus(statusEl, 'warn', `CNPJ encontrado, mas a situação cadastral é "${situacao}". Confira antes de salvar.`);
      else showStatus(statusEl, 'ok', filled ? 'Dados preenchidos pela Receita Federal. Confira e ajuste se necessário.' : 'CNPJ encontrado. Os campos já estavam preenchidos e foram mantidos.');
    } catch (error) {
      if (current !== ticket) return undefined;
      lastLookup = '';
      showStatus(statusEl, 'warn', `${error.message} Você pode preencher os campos manualmente.`);
    }
    return undefined;
  });
}
