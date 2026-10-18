# Desenvolvimento

## Requisitos e comandos

- Node.js **22.13+** (usa `node:sqlite`). Sem banco externo.

| Comando | O que faz |
| --- | --- |
| `npm install` | instala dependências |
| `npm start` | servidor em `http://localhost:3000`; `PORT` e `CCP_DB` mudam porta e arquivo do banco |
| `npm test` | roda todos os testes (`node:test`), com SQLite em memória |
| `npm run dist` | gera instalador e versão portátil em `dist/` |
| `npm run release` | idem, publicando no canal de atualização (veja [publicacao.md](publicacao.md)) |
| `npm run versao:patch` / `versao:minor` | sobe a versão no `package.json` |
| `npm run import -- "<pasta>"` | importa os `.DBF` do sistema antigo |

Na primeira execução sem usuários, o servidor cria `ADMIN` e imprime a senha provisória no terminal.

## Estrutura de pastas

```
electron-main.js            janela, pasta de dados, atualizador e backup diário (Electron)
electron-builder.config.js  instalador (NSIS), portátil e canal de atualização
src/
  compositionRoot.js        injeção de dependências
  server.js                 inicialização web (npm start)
  domain/                   regras puras (validation/, policies/, errors/, money, dates, cnpj, niveis, cadastros)
  application/              serviços e casos de uso (+ import/ com os importadores CSV)
  infrastructure/           database/, repositories/, security/, csv/, http/ (ReceitaWS), backup/, update/, legacy/
  presentation/http/        HttpServer, Router, controllers/
  desktop/                  ElectronUpdater
public/                     interface (index.html, style.css, js/ com views/ e components/, img/)
scripts/                    import-legacy.js, reset-password.js
test/                       testes automatizados + helpers/createTestApp.js
docs/                       esta documentação
build/icon.png              ícone do aplicativo
```

## Convenções

- **Uma classe por arquivo**, nome da classe = nome do arquivo; helpers em módulos de funções.
- Serviços **recebem dependências no construtor** e nunca instanciam infraestrutura; só o `compositionRoot` usa `new` em classes concretas.
- Regras de negócio no domínio/aplicação; controladores só traduzem HTTP.
- Erros de negócio: lance `ValidationError`, `NotFoundError`, `ConflictError`, `ForbiddenError`… (subclasses de `AppError`, que carregam o status HTTP).
- **Toda modificação** deve chamar `audit.record(...)` com o autor (`ctx.user`) e, quando fizer sentido, `antes`/`depois`. Nunca registre senhas.
- Banco: dinheiro em centavos; mude o esquema **somente** acrescentando migração (`migrations.js`).
- Front-end: módulos ES, HTML montado com `esc()` para qualquer texto vindo do usuário, estados com ícone + texto (não só cor).

## Testes

`test/*.test.js` sobem a aplicação completa com SQLite `:memory:` e um cliente HTTP com cookie (`createTestApp`), aceitando relógio e gateway da Receita falsos.
Cobrem API e regras (títulos, baixa, rateio, níveis), auditoria (inclusive imutabilidade), importação/exportação CSV, dashboard, CNPJ, foto de perfil,
atualizador, backup diário e unidades de domínio/segurança.

## Adicionando coisas

| Quero… | Faça |
| --- | --- |
| um novo relatório | acrescente uma entrada em `RelatorioService.tipos` e a opção em `views/relatorios.js` |
| uma nova exportação | acrescente em `ExportService.entidades` |
| importar uma nova tela | crie um importador em `application/import` e registre em `compositionRoot.js`; adicione `onImport` no grid |
| um novo cadastro simples | tabela (migração) + repositório (`CrudRepository`) + `FieldSanitizer` + `CadastroController` no `compositionRoot` + entrada em `views/cadastro.js` |
| uma nova tela em grid | use `createGrid` + `openFilterDialog` + `openDialog` (veja [interface.md](interface.md)) |
