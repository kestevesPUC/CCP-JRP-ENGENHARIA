# Arquitetura

O sistema é uma aplicação Node.js em **camadas**, empacotada como app de desktop (Electron). O Electron apenas sobe o
servidor HTTP local numa porta livre e abre uma janela apontando para ele — o mesmo código roda no navegador com `npm start`.

```
┌──────────────┐   HTTP/JSON   ┌────────────────────────────────────────────────────┐
│ Interface    │ ────────────▶ │ presentation  (HttpServer, Router, controllers)    │
│ public/js    │ ◀──────────── │ application   (serviços / casos de uso)            │
└──────────────┘               │ domain        (regras puras, validadores, erros)   │
                               │ infrastructure(SQLite, repositórios, CSV, etc.)    │
                               └────────────────────────────────────────────────────┘
```

## Camadas (dependências apontam para dentro)

| Camada | Pasta | Responsabilidade | Conhece |
| --- | --- | --- | --- |
| Domínio | `src/domain` | Regras de negócio puras: validação de título e baixa, políticas de permissão, CNPJ, dinheiro, datas, níveis, erros | nada externo |
| Aplicação | `src/application` | Casos de uso: `TituloService`, `CadastroService`, `AuthService`, `DashboardService`, `CsvImportService`, `ExportService`, `AuditTrail`… | domínio (e portas) |
| Infraestrutura | `src/infrastructure` | Detalhes técnicos: `SqliteDatabase`, repositórios, `CsvParser/Writer`, segurança, Receita WS, backup, importador do legado | domínio |
| Apresentação | `src/presentation/http` | `HttpServer`, `Router`, controladores, arquivos estáticos | aplicação |
| Composição | `src/compositionRoot.js` | Único lugar que instancia classes concretas e as injeta | todas |
| Desktop | `electron-main.js`, `src/desktop` | Janela, pasta de dados, atualizador, backup diário | composição |

## Princípios aplicados

- **Uma classe por arquivo**; arquivos auxiliares são módulos de funções.
- **S — Responsabilidade única:** validar (`TituloValidator`), autorizar (`TituloPolicy`), persistir (`TituloRepository`),
  orquestrar (`TituloService`), traduzir HTTP (`TituloController`) e auditar (`AuditTrail`) são classes distintas.
- **O — Aberto/fechado:** novos relatórios, exportações e importações entram em mapas/estratégias
  (`RelatorioService.tipos`, `ExportService.entidades`, importadores em `application/import`) sem alterar o código existente.
  `CadastroService` e `CadastroController` atendem fornecedores, naturezas e centros por configuração.
- **L — Substituição:** `NoUpdater` e `ElectronUpdater` cumprem a mesma porta; `CrudRepository` é base de três repositórios.
- **I — Segregação de interfaces:** serviços recebem só o que usam (ex.: `TituloValidator` recebe apenas `exists(id)` dos cadastros).
- **D — Inversão de dependência:** serviços dependem de repositórios/portas injetados; o `compositionRoot` decide as implementações
  (nos testes entram `:memory:`, relógio e gateway falsos).

## Fluxo de uma requisição

1. `HttpServer` lê cookie de sessão → `AuthService.resolveUser`.
2. Autorização pelas opções da rota: `public`, `nivel` (ex.: `A`), `allowMustChange`, `selfService`; nível **Consulta** só faz `GET`
   (exceto ações do próprio perfil).
3. Controlador chama o serviço passando `ctx.user` (o *autor* da ação).
4. Serviço valida (domínio), grava (repositório) e registra a **auditoria**.
5. Erros de negócio (`AppError` e filhas) viram resposta HTTP com o status da própria exceção; o resto vira `500` genérico.

## Transversais

- **Auditoria:** `AuditTrail.record({ actor, acao, entidade, descricao, antes, depois })` é chamado pelos serviços após cada modificação.
- **Dinheiro:** valores trafegam em reais e são gravados em **centavos inteiros** (`domain/money.js`).
- **Segurança:** senhas com scrypt + sal; sessões em memória com cookie `HttpOnly; SameSite=Strict`; bloqueio após 3 falhas de login por 5 min;
  serviço de arquivos estáticos impede sair da pasta `public`; fotos validadas por assinatura (magic bytes); CSV neutraliza injeção de fórmula.
- **Desktop:** o servidor escuta só em `127.0.0.1`; a janela bloqueia navegação externa (links abrem no navegador do sistema).
