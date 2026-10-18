const digits = (value) => String(value ?? '').replace(/\D/g, '');

/** Dinheiro em reais, digitado da direita para a esquerda: "123456" → "1.234,56". */
export function maskMoney(value) {
  const d = digits(value).replace(/^0+(?=\d)/, '');
  if (!d) return '';
  const padded = d.padStart(3, '0');
  const reais = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${reais},${padded.slice(-2)}`;
}

/** Número (reais) → texto mascarado, para valores iniciais de campos. */
export const formatMoneyInput = (n) => (n === null || n === undefined || n === '' ? '' : maskMoney(String(Math.round(Number(n) * 100))));

/** Texto mascarado ("1.234,56") → número com ponto decimal ("1234.56"); vazio permanece vazio. */
export const parseMoney = (text) => {
  const d = digits(text);
  return d ? (Number(d) / 100).toFixed(2) : '';
};

export const maskCep = (value) => digits(value).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');

/** Telefone fixo (10 dígitos) ou celular (11): "(31) 3269-3100" / "(31) 99999-9999". */
export function maskPhone(value) {
  const d = digits(value).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  const split = d.length > 10 ? 7 : 6;
  return `(${d.slice(0, 2)}) ${d.slice(2, split)}${d.length > 2 + (split - 2) ? `-${d.slice(split)}` : ''}`;
}

const MASKS = { money: maskMoney, cep: maskCep, phone: maskPhone };

/** Atributos HTML de um campo mascarado: `<input ${maskAttrs('money')}>`. */
export const maskAttrs = (kind) => ({
  money: 'type="text" inputmode="numeric" autocomplete="off" placeholder="0,00" data-mask="money"',
  cep: 'type="text" inputmode="numeric" autocomplete="off" placeholder="00000-000" maxlength="9" data-mask="cep"',
  phone: 'type="text" inputmode="tel" autocomplete="off" placeholder="(00) 00000-0000" maxlength="15" data-mask="phone"',
}[kind]);

/** Converte os campos monetários do formulário para número antes de enviar à API. */
export function unmaskForm(form, data) {
  const out = { ...data };
  for (const input of form.querySelectorAll('[data-mask="money"]')) out[input.name] = parseMoney(input.value);
  return out;
}

/** Aplica as máscaras a qualquer campo com `data-mask` (inclusive os criados depois, em diálogos). */
export function initMasks() {
  document.addEventListener('input', (event) => {
    const input = event.target;
    const mask = input?.dataset?.mask && MASKS[input.dataset.mask];
    if (mask) input.value = mask(input.value);
  });
}
