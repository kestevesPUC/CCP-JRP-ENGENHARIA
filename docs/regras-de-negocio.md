# Regras de negócio

Extraídas do programa Clipper original (módulos MVLER, MVLER1, MOVBAI, MOVEXC, MOVREP, SENHA) e ampliadas.

## Níveis de acesso

| Nível | Nome | Pode |
| --- | --- | --- |
| **A** | Administrador | Tudo: usuários, backup, atualizações, auditoria, estornar baixas, excluir títulos baixados |
| **B** | Operador | Incluir, alterar, baixar, reprogramar e excluir títulos **em aberto**; manter cadastros; importar CSV |
| **C** | Consulta | Somente visualizar telas, relatórios, dashboard e exportar CSV. Pode trocar a própria senha e foto |

Regras: o nível **C** é bloqueado pelo servidor em qualquer requisição que não seja `GET` (exceto ações do próprio perfil);
a interface também esconde os botões de edição. Usuários novos nascem com senha provisória e **precisam trocá-la** no primeiro acesso.
Após **3 senhas erradas** o usuário fica bloqueado por 5 minutos (`LoginThrottle`).

## Título (conta a pagar)

Campos obrigatórios: fornecedor, nº do documento (até 8), histórico (até 52), vencimento, valor > 0, natureza e ao menos 1 centro de custo.

- Datas válidas e a partir de **1990**; emissão assume o vencimento quando vazia.
- Textos são gravados em **maiúsculas**; nota fiscal só aceita dígitos (6).
- **Rateio:** de 1 a **4** centros de custo, sem repetir; a **soma dos valores deve igualar o valor do título** (comparação em centavos).
- Título **baixado não pode ser alterado nem reprogramado**.

### Baixa (pagamento)

`valor pago − juros + desconto = valor do título` e `valor do cheque ≥ valor pago`. Data de pagamento válida.
Somente o nível A **estorna** uma baixa (o título volta para “Em aberto”).

### Reprogramação

Define uma nova data (e valor opcional) para um título em aberto; o vencimento original é preservado.

### Exclusão

Título em aberto: qualquer nível que edite. Título baixado: somente nível A.
Cadastro com títulos vinculados **não pode ser excluído** (a tela mostra “Em uso”).

## Fornecedores

- CNPJ/CPF é o primeiro campo; ao sair do campo com um CNPJ válido, a **ReceitaWS** preenche nome, endereço, bairro, cidade, UF, CEP e telefone
  (somente campos vazios; tudo continua editável). Falhas (CNPJ inexistente, limite de consultas, rede) apenas avisam o usuário.
- Suporta o **CNPJ alfanumérico** (12 caracteres + 2 dígitos verificadores).

## Auditoria

Toda modificação feita por qualquer usuário gera um registro: **quem, quando, ação, entidade e antes/depois**.

| Registrado | Exemplos |
| --- | --- |
| Títulos | criar, alterar, baixar, estornar, reprogramar, excluir |
| Cadastros | fornecedores, naturezas e centros: criar, alterar, excluir |
| Usuários | criar, excluir, trocar senha, alterar foto |
| Acesso | login, logout, falha de login, login bloqueado |
| Sistema | importação CSV, backup, verificação/instalação de atualização |

Senhas, hashes e o conteúdo das fotos **nunca** vão para o log. O registro é imutável (gatilhos no banco) e só o nível A consulta/exporta.

## Importação CSV

Validação prévia **sem gravar**, relatório de erros por linha e importação **tudo ou nada** (transação). Duplicidades são recusadas
(CNPJ/CPF já cadastrado, descrição repetida, título igual por fornecedor+documento+vencimento+valor). Detalhes em [importacao-csv.md](importacao-csv.md).

## Dashboard

Calculado no servidor (`DashboardService`) com a data de hoje: totais em aberto/vencidos/hoje/7 dias, faixas de atraso (1–30, 31–60, 61–90, >90 dias),
a vencer por mês, pagamentos por mês (com juros e descontos), top fornecedores, natureza e centro de custo (pelo valor **rateado**).
Os “pontos de atenção” são gerados na tela a partir desses números (vencidos, >90 dias, vence hoje/7 dias, juros do mês, concentração ≥ 30% em um fornecedor, pico de vencimentos).
