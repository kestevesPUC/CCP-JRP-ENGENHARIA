'use strict';
// Migrações versionadas (PRAGMA user_version). Valores monetários em centavos inteiros; datas ISO (TEXT).

const MIGRATIONS = [
  `
  CREATE TABLE usuarios (
    id            INTEGER PRIMARY KEY,
    usuario       TEXT NOT NULL UNIQUE,
    nivel         TEXT NOT NULL CHECK (nivel IN ('A','B','C')),
    senha_hash    TEXT NOT NULL,
    must_change   INTEGER NOT NULL DEFAULT 1,
    data_cad      TEXT
  );
  CREATE TABLE fornecedores (
    id INTEGER PRIMARY KEY, nome TEXT NOT NULL, pess TEXT NOT NULL DEFAULT '', ende TEXT NOT NULL DEFAULT '',
    bair TEXT NOT NULL DEFAULT '', cida TEXT NOT NULL DEFAULT '', esta TEXT NOT NULL DEFAULT '', cep TEXT NOT NULL DEFAULT '',
    fone TEXT NOT NULL DEFAULT '', fax TEXT NOT NULL DEFAULT '', cgc TEXT NOT NULL DEFAULT '', insc TEXT NOT NULL DEFAULT '',
    con1 TEXT NOT NULL DEFAULT '', con2 TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE naturezas (id INTEGER PRIMARY KEY, nome TEXT NOT NULL);
  CREATE TABLE centros   (id INTEGER PRIMARY KEY, nome TEXT NOT NULL);
  CREATE TABLE titulos (
    id            INTEGER PRIMARY KEY,
    fornecedor_id INTEGER NOT NULL REFERENCES fornecedores(id),
    natureza_id   INTEGER NOT NULL REFERENCES naturezas(id),
    docum         TEXT NOT NULL,
    histo         TEXT NOT NULL,
    dt_venc       TEXT NOT NULL,
    dt_emi        TEXT NOT NULL,
    valor_cents   INTEGER NOT NULL CHECK (valor_cents > 0),
    local_pg      TEXT NOT NULL DEFAULT '',
    notaf         TEXT NOT NULL DEFAULT '',
    dt_rep        TEXT,
    valre_cents   INTEGER NOT NULL DEFAULT 0,
    dt_pag        TEXT,
    receb_cents   INTEGER,
    juros_cents   INTEGER,
    desco_cents   INTEGER,
    noche         INTEGER,
    banco         TEXT,
    vrche_cents   INTEGER
  );
  CREATE INDEX idx_titulos_venc ON titulos(dt_venc);
  CREATE INDEX idx_titulos_pag ON titulos(dt_pag);
  CREATE INDEX idx_titulos_fornecedor ON titulos(fornecedor_id);
  CREATE INDEX idx_titulos_natureza ON titulos(natureza_id);
  CREATE INDEX idx_titulos_docum ON titulos(docum);
  CREATE TABLE titulo_rateio (
    titulo_id   INTEGER NOT NULL REFERENCES titulos(id) ON DELETE CASCADE,
    centro_id   INTEGER NOT NULL REFERENCES centros(id),
    valor_cents INTEGER NOT NULL CHECK (valor_cents > 0),
    PRIMARY KEY (titulo_id, centro_id)
  );
  CREATE INDEX idx_rateio_centro ON titulo_rateio(centro_id);
  `,
  `
  ALTER TABLE usuarios ADD COLUMN foto BLOB;
  ALTER TABLE usuarios ADD COLUMN foto_tipo TEXT;
  ALTER TABLE usuarios ADD COLUMN foto_em TEXT;
  `,
  // Trilha de auditoria: imutável (gatilhos impedem alterar ou excluir registros).
  `
  CREATE TABLE auditoria (
    id          INTEGER PRIMARY KEY,
    em          TEXT NOT NULL,
    usuario_id  INTEGER,
    usuario     TEXT NOT NULL,
    acao        TEXT NOT NULL,
    entidade    TEXT NOT NULL,
    entidade_id INTEGER,
    descricao   TEXT NOT NULL,
    antes       TEXT,
    depois      TEXT
  );
  CREATE INDEX idx_auditoria_em ON auditoria(em);
  CREATE INDEX idx_auditoria_usuario ON auditoria(usuario);
  CREATE INDEX idx_auditoria_entidade ON auditoria(entidade, entidade_id);
  CREATE TRIGGER auditoria_sem_update BEFORE UPDATE ON auditoria
  BEGIN SELECT RAISE(ABORT, 'Registros de auditoria não podem ser alterados'); END;
  CREATE TRIGGER auditoria_sem_delete BEFORE DELETE ON auditoria
  BEGIN SELECT RAISE(ABORT, 'Registros de auditoria não podem ser excluídos'); END;
  `,
  // Dados pessoais dos usuários e data de aniversário (usuários e fornecedores) para os lembretes do painel.
  `
  ALTER TABLE usuarios ADD COLUMN nome TEXT NOT NULL DEFAULT '';
  ALTER TABLE usuarios ADD COLUMN email TEXT NOT NULL DEFAULT '';
  ALTER TABLE usuarios ADD COLUMN telefone TEXT NOT NULL DEFAULT '';
  ALTER TABLE usuarios ADD COLUMN nascimento TEXT NOT NULL DEFAULT '';
  ALTER TABLE fornecedores ADD COLUMN nasc TEXT NOT NULL DEFAULT '';
  `,
];

module.exports = MIGRATIONS;
