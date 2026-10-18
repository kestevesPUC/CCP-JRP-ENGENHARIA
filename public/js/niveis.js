// Níveis de acesso (espelha src/domain/niveis.js).
export const NIVEIS = [
  { id: 'A', nome: 'Administrador', descricao: 'Acesso total: gerencia usuários e backup, estorna baixas e exclui títulos baixados.' },
  { id: 'B', nome: 'Operador', descricao: 'Inclui, altera, baixa, reprograma e exclui títulos em aberto; mantém os cadastros.' },
  { id: 'C', nome: 'Consulta', descricao: 'Somente visualiza telas, relatórios e exportações CSV; não altera nada.' },
];

export const nivelNome = (id) => NIVEIS.find((n) => n.id === id)?.nome || id;
export const podeEditar = (nivel) => nivel !== 'C';
