# Banco de dados

SQLite via `node:sqlite` (sem dependências nativas). Arquivo: `ccp.sqlite`.

| Modo | Local |
| --- | --- |
| Aplicativo instalado | `%APPDATA%\ccp-node\ccp.sqlite` (**preservado** ao desinstalar/reinstalar/atualizar) |
| `npm start` | `data/ccp.sqlite` (ou o caminho da variável `CCP_DB`) |
| Testes | `:memory:` |

Configuração da conexão: `journal_mode = WAL`, `foreign_keys = ON`. Valores monetários em **centavos** (`*_cents`); datas ISO `AAAA-MM-DD`.

## Tabelas

| Tabela | Conteúdo |
| --- | --- |
| `usuarios` | `usuario` (único), `nivel` (A/B/C), `senha_hash` (scrypt), `must_change`, `data_cad`, `foto`/`foto_tipo`/`foto_em` |
| `fornecedores` | `nome`, `pess` (F/J), `cgc` (CNPJ/CPF), `insc`, endereço, contatos |
| `naturezas` | `nome` |
| `centros` | `nome` |
| `titulos` | fornecedor, natureza, `docum`, `histo`, `dt_venc`, `dt_emi`, `valor_cents`, `local_pg`, `notaf`, reprogramação (`dt_rep`, `valre_cents`) e baixa (`dt_pag`, `receb_cents`, `juros_cents`, `desco_cents`, `noche`, `banco`, `vrche_cents`) — título em aberto tem `dt_pag IS NULL` |
| `titulo_rateio` | `(titulo_id, centro_id)` único + `valor_cents`; até 4 por título; apagado junto com o título |
| `auditoria` | `em` (UTC), `usuario_id`, `usuario`, `acao`, `entidade`, `entidade_id`, `descricao`, `antes`/`depois` (JSON) |

A tabela **`auditoria` é imutável**: gatilhos (`auditoria_sem_update`, `auditoria_sem_delete`) abortam qualquer `UPDATE`/`DELETE`.
`usuario_id` não tem chave estrangeira de propósito: o histórico sobrevive à exclusão do usuário.

## Migrações

`src/infrastructure/database/migrations.js` é uma lista ordenada; a versão aplicada fica em `PRAGMA user_version`.
Ao abrir o banco, as migrações pendentes rodam automaticamente (cada uma em transação). **Nunca edite uma migração já publicada**:
acrescente uma nova ao final da lista.

| # | Mudança |
| --- | --- |
| 1 | Estrutura inicial (usuários, cadastros, títulos, rateio, índices) |
| 2 | Foto de perfil (`foto`, `foto_tipo`, `foto_em`) |
| 3 | Auditoria + gatilhos de imutabilidade |

## Backups

- **Manual (nível A):** Usuários → *Backup (SQLite)* baixa uma cópia consistente (`VACUUM INTO`); fica registrado na auditoria.
- **Automático:** `DailyBackup` grava `ccp-AAAA-MM-DD.sqlite` uma vez por dia em `Documentos\CCP Backups`, mantendo os 14 mais recentes.
- **Restaurar:** feche o programa e copie o arquivo de backup para `%APPDATA%\ccp-node\ccp.sqlite`.

## Importar dados do sistema antigo (Clipper)

```bash
node scripts/import-legacy.js "<pasta do CCP original>" [destino.sqlite]
```

Lê os `.DBF` (codificação CP850), preserva os códigos e gera uma senha provisória para os usuários (as senhas antigas não são reaproveitadas).
Não sobrescreve um banco existente. Para trocar a senha de qualquer usuário: `node scripts/reset-password.js <arquivo.sqlite> <USUARIO> <nova-senha>`.
