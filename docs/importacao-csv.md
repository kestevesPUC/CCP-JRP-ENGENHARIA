# Importação por CSV

Disponível nas telas **Movimento, Fornecedores, Naturezas e Centros de custo** (botão **Importar CSV**, níveis A e B).

## Como usar

1. Clique em **Importar CSV** e em **Baixar modelo (CSV)**.
2. Abra no Excel, **apague a linha de exemplo**, preencha e salve como CSV (qualquer variante serve: UTF-8 ou ANSI; separador `;`, `,` ou tab).
3. Selecione o arquivo: o sistema **valida sem gravar** e mostra linhas lidas/válidas/com erro, os erros por linha e um exemplo.
4. Com **zero erros**, o botão **Importar N registro(s)** é liberado. A gravação é **tudo ou nada** e fica na auditoria.

Limite: 5.000 linhas por arquivo. Linhas totalmente vazias são ignoradas. Os cabeçalhos aceitam variações (sem acento/maiúsculas, apelidos como *Fone* = *Telefone*).
Coluna obrigatória ausente = arquivo recusado. Os mesmos modelos podem ser baixados pela API (`GET /api/importar/:entidade/modelo`).

## Formatos

- **Datas:** `31/12/2026` ou `2026-12-31`. **Valores:** `1.234,56`, `1234,56`, `1234.56` ou `R$ 1.234,56`.
- **Textos** são gravados em maiúsculas. Códigos podem ser informados por **código ou nome exato** (sem diferenciar acentos/maiúsculas).

## Colunas por tela (* obrigatória)

### Fornecedores
`CNPJ/CPF` · `Nome*` · `Pessoa (F/J)` · `Inscrição estadual` · `Endereço` · `Bairro` · `Cidade` · `UF` · `CEP` · `Telefone` · `Fax` · `Contato 1` · `Contato 2`

Recusa: CNPJ com dígitos inválidos, documento com tamanho diferente de 11/14, documento já cadastrado ou repetido no arquivo, pessoa diferente de F/J.
Se `Pessoa` estiver vazia, é deduzida (14 → J, 11 → F) e o documento é gravado com máscara.

### Naturezas de pagamento / Centros de custo
`Descrição*` (apelido: `Nome`). Recusa descrições já existentes ou repetidas.

### Títulos
`Fornecedor*` (código, CNPJ/CPF ou nome) · `Documento*` · `Vencimento*` · `Emissão` · `Valor*` · `Histórico*` · `Natureza*` (código ou nome) · `Local` · `Nota fiscal` ·
`Centro de custo 1*` / `Valor centro 1` … `Centro de custo 4` / `Valor centro 4` ·
`Data pagamento` · `Valor pago` · `Juros` · `Desconto` · `Banco` · `Nº cheque` · `Valor do cheque`

- Com **um** centro de custo, o valor do rateio pode ficar vazio (assume o valor do título). Com mais de um, informe o valor de cada e a **soma deve fechar o valor do título**.
- Preencher `Data pagamento` importa o título **já baixado** (`Valor pago` assume o valor do título; `Juros`/`Desconto` assumem 0; `Valor do cheque` assume o valor pago).
  A regra `pago − juros + desconto = valor` continua valendo.
- Recusa título duplicado (mesmo fornecedor + documento + vencimento + valor), fornecedor/natureza/centro inexistentes e qualquer violação das regras de [título e baixa](regras-de-negocio.md).

## Implementação

`CsvParser` (infra) lê o arquivo; `CsvImportService` mapeia colunas e coordena validar/confirmar; cada tela tem um importador
(`FornecedorImporter`, `NaturezaImporter`, `CentroImporter`, `TituloImporter` em `src/application/import`) com `columns`, `begin`, `parse` e `commit`.
Para importar outra entidade, crie um importador e registre-o em `compositionRoot.js`.
