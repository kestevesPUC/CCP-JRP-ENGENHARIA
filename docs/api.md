# API HTTP

JSON sobre HTTP, servida em `127.0.0.1`. Autenticação por cookie de sessão `sid` (`HttpOnly`). Erros: `{ "error": "mensagem" }` com o status adequado
(400 validação, 401 não autenticado, 403 sem permissão, 404, 409 conflito, 429 muitas tentativas/limite, 502 serviço externo, 500 erro interno).
Valores monetários em reais (número); datas `AAAA-MM-DD`.

**Quem acessa:** `todos` = qualquer usuário logado (nível **C** só em `GET`, exceto *self-service*); `A` = somente Administrador.
Enquanto a senha provisória não for trocada, só `/api/me` e `/api/me/senha` respondem.

## Acesso e perfil

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| POST | `/api/login` | público | `{usuario, senha}` → usuário; define o cookie |
| POST | `/api/logout` | público | encerra a sessão |
| GET | `/api/me` | todos | usuário logado (`id, usuario, nivel, mustChange, temFoto, fotoVersao`) |
| POST | `/api/me/senha` | todos | `{atual, nova}` (mín. 6) |
| POST | `/api/me/foto` | todos | `{foto: "data:image/png|jpeg|webp;base64,…"}` até 300 KB |
| DELETE | `/api/me/foto` | todos | remove a própria foto |
| GET | `/api/usuarios/:id/foto` | todos | imagem do usuário (404 se não houver) |

## Movimento

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| GET | `/api/titulos` | todos | filtros: `q` (texto livre), `status` (`abertos`/`pagos`), `codig`, `natur`, `cc`, `docum`, `valor`, `de`, `ate` (vencimento); máx. 1000 |
| POST | `/api/titulos` | A/B | cria (`codig, docum, histo, dtvec, dtemi, valor, local, notaf, natur, rateio:[{cc, valor}]`) |
| PUT | `/api/titulos/:id` | A/B | altera título em aberto |
| DELETE | `/api/titulos/:id` | A/B* | exclui (*baixado: só A) |
| POST | `/api/titulos/:id/baixa` | A/B | `{dtpag, receb, juros, desco, noche, banco, vrche}` |
| POST | `/api/titulos/:id/estorno` | A | desfaz a baixa |
| POST | `/api/titulos/:id/reprogramar` | A/B | `{dtrep, valre?}` |

## Cadastros

`/api/fornecedores`, `/api/naturezas`, `/api/centros` — `GET` lista (com `emUso`), `POST` cria, `PUT /:id` altera, `DELETE /:id` exclui
(409 se houver títulos vinculados). Escrita: A/B.

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| GET | `/api/cnpj/:cnpj` | todos | consulta a ReceitaWS e devolve `{fornecedor, situacao}` (400 CNPJ inválido, 404 não encontrado, 429/502 serviço) |

## Dashboard e relatórios

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| GET | `/api/dashboard?meses=3\|6\|12` | todos | indicadores, séries mensais, faixas de atraso, rankings e próximos vencimentos |
| GET | `/api/relatorios/:tipo` | todos | `vencimentos`, `pagamentos`, `reprogramados`, `fornecedor`, `natureza`, `centro`, `baixas`; parâmetros `de`, `ate`, `id`; `formato=csv` baixa o CSV |

## Exportar e importar (CSV)

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| GET | `/api/exportar/:entidade` | todos (`auditoria`: A) | `fornecedores`, `naturezas`, `centros`, `titulos` (aceita os filtros da listagem), `auditoria` |
| GET | `/api/importar/:entidade/modelo` | todos | modelo CSV (cabeçalho + exemplo) — `fornecedores`, `naturezas`, `centros`, `titulos` |
| GET | `/api/importar/:entidade` | todos | colunas do modelo e quais são obrigatórias |
| POST | `/api/importar/:entidade` | A/B | `{csv, confirmar}`; `confirmar:false` só valida e devolve `{total, validos, totalErros, erros[], amostra[]}`; `true` importa tudo ou nada |

## Administração

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| GET/POST | `/api/usuarios` | A | lista / cria `{usuario, nivel, senha}` |
| DELETE | `/api/usuarios/:id` | A | exclui (não o próprio usuário) |
| GET | `/api/backup` | A | baixa uma cópia do banco SQLite |
| GET | `/api/auditoria` | A | filtros `q, usuario, acao, entidade, entidadeId, de, ate, limit` (mais recentes primeiro) |
| GET | `/api/auditoria/opcoes` | A | usuários, ações e entidades existentes (para filtros) |
| GET | `/api/auditoria/:id` | A | registro completo com `antes`/`depois` |
| GET | `/api/sistema` | todos | `{versao, atualizacao:{estado, versao, progresso, mensagem}}` |
| POST | `/api/sistema/atualizacoes/verificar` | A | procura atualização |
| POST | `/api/sistema/atualizacoes/instalar` | A | fecha, instala e reabre (se já baixada) |

Estados de atualização: `idle`, `verificando`, `disponivel` (baixando), `baixado`, `atual`, `indisponivel`, `erro`.
