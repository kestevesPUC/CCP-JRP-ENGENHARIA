# CCP — Controle de Contas a Pagar

Sistema de contas a pagar da **JRP Engenharia**, recriado em Node.js a partir do programa original em Clipper (CCP.EXE).
Aplicativo de desktop para Windows (instalador), com dados em SQLite no próprio computador.

Desenvolvido por [Kaio Gomes](https://kaio-gomes-site.vercel.app).

## O que o sistema faz

| Área | Recursos |
| --- | --- |
| **Dashboard** | Indicadores (em aberto, vencidos, vencem em 7 dias, pago no mês, juros), gráficos mensais, vencidos por faixa de atraso, rankings por fornecedor/natureza/centro de custo e “pontos de atenção” para o gestor |
| **Movimento** | Incluir, alterar, excluir, **baixar**, estornar e reprogramar títulos; rateio por até 4 centros de custo |
| **Cadastros** | Fornecedores (com busca do CNPJ na Receita), naturezas de pagamento e centros de custo |
| **Relatórios** | Vencimentos, pagamentos, reprogramados, fichas por fornecedor/natureza/centro e geral de baixas (tela, impressão e CSV) |
| **Importar / Exportar** | Importação por **CSV** com modelo por tela e validação antes de gravar; exportação CSV de tudo |
| **Auditoria** | Registro imutável de toda modificação (quem, quando, antes/depois) — nível A |
| **Usuários** | Níveis Administrador, Operador e Consulta; foto de perfil; backup |
| **Atualizações** | Publicou uma nova versão → os computadores instalados se atualizam |

## Instalação (usuário final)

1. Execute `CCP-Contas-a-Pagar-Setup-<versão>.exe` (instalação por usuário; não pede administrador).
2. No primeiro acesso o programa cria o usuário `ADMIN` e mostra a **senha provisória**; a troca é obrigatória.
3. Os dados ficam em `%APPDATA%\ccp-node\ccp.sqlite` e **são mantidos ao desinstalar, reinstalar ou atualizar**.
   Há também uma cópia automática diária em `Documentos\CCP Backups`.

## Desenvolvimento

```bash
npm install
npm start          # servidor em http://localhost:3000 (banco em data/ccp.sqlite)
npm test           # testes automatizados
npm run dist       # gera instalador + versão portátil em dist/
```

Requer Node.js 22.13 ou superior (usa o SQLite embutido, `node:sqlite`).

## Documentação

- [Arquitetura](docs/arquitetura.md) — camadas, SOLID, composição e fluxo de uma requisição
- [Banco de dados](docs/banco-de-dados.md) — tabelas, migrações e backup
- [Regras de negócio](docs/regras-de-negocio.md) — níveis, títulos, baixa, rateio, auditoria
- [API HTTP](docs/api.md) — todas as rotas
- [Interface](docs/interface.md) — padrão de grid, componentes e dashboard
- [Importação CSV](docs/importacao-csv.md) — modelos e colunas de cada tela
- [Desenvolvimento](docs/desenvolvimento.md) — estrutura de pastas, convenções e testes
- [Publicação e atualizações](docs/publicacao.md) — instalador, versões e auto-atualização
