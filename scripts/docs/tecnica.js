'use strict';
const path = require('node:path');
const { DocBuilder } = require('./lib');

const pkg = require('../../package.json');

/** Conteúdo da Documentação Técnica do CCP. */
async function buildTecnica(file) {
  const d = new DocBuilder({
    titulo: 'CCP — Controle de Contas a Pagar',
    subtitulo: 'Arquitetura, banco de dados, API, segurança, operação e publicação',
    tipo: 'Documentação Técnica',
    versaoDoc: '1.0',
    versaoSistema: pkg.version,
    data: '18/10/2026',
    autor: 'Kaio Gomes',
    logo: path.join(__dirname, '..', '..', 'build', 'icon.png'),
  });

  // ───────────────────────── 1
  d.h1('Introdução');
  d.h2('Objetivo');
  d.p('Este documento descreve a **implementação** do CCP — Controle de Contas a Pagar: arquitetura, componentes, banco de dados, API HTTP, segurança, empacotamento, publicação de versões e operação. É a referência para quem vai manter, estender ou implantar o sistema.');
  d.h2('Escopo');
  d.p('Cobre o aplicativo desktop (Electron) e o servidor local em Node.js que ele executa, o front-end em JavaScript, o banco SQLite e o processo de instalação e atualização. O comportamento visto pelo usuário (telas, fluxos e regras) está na **Documentação Funcional**.');
  d.h2('Público-alvo');
  d.bullets(['Desenvolvedores que darão manutenção ao código;', 'Responsáveis por TI que instalam, atualizam e fazem backup do sistema;', 'Analistas que precisam entender como as regras de negócio foram implementadas.']);
  d.h2('Convenções');
  d.bullets(['Nomes de arquivos, classes, comandos e rotas aparecem em {{fonte monoespaçada}}.', 'Valores monetários são reais na API e **centavos inteiros** no banco; datas seguem o padrão ISO {{AAAA-MM-DD}}.', 'Os caminhos são relativos à pasta {{ccp-node/}} do projeto.']);

  // ───────────────────────── 2
  d.h1('Visão geral do sistema');
  d.h2('Contexto e origem');
  d.p('O CCP é a recriação, em Node.js, do sistema de contas a pagar desenvolvido em **Clipper/FoxPlus** para a JRP Engenharia e Projetos (executável {{CCP.EXE}}, versão 1.0, 2001). A recriação foi feita a partir do código-fonte {{.PRG}} e dos arquivos de dados {{.DBF}} do sistema original, preservando suas regras e acrescentando recursos modernos (dashboard, auditoria, importação CSV, atualização automática).');
  d.h2('Funcionalidades');
  d.table(['Área', 'Descrição'], [
    ['Dashboard', 'Indicadores, gráficos e pontos de atenção para o gestor decidir.'],
    ['Movimento', 'Inclusão, alteração, exclusão, baixa, estorno e reprogramação de títulos, com rateio por centro de custo.'],
    ['Cadastros', 'Fornecedores (com consulta de CNPJ na Receita), naturezas de pagamento e centros de custo.'],
    ['Relatórios', 'Vencimentos, pagamentos, reprogramados, fichas e geral de baixas — tela, impressão e CSV.'],
    ['Importação / Exportação', 'CSV com modelo por tela e validação antes de gravar; exportação CSV de todas as telas.'],
    ['Auditoria', 'Registro imutável de toda modificação (quem, quando, antes/depois).'],
    ['Usuários e perfil', 'Três níveis de acesso, foto de perfil, troca de senha e backup.'],
    ['Instalação e atualização', 'Instalador Windows, dados preservados e atualização automática via GitHub Releases.'],
  ], [2, 7]);
  d.h2('Mapeamento do sistema legado');
  d.table(['Clipper (original)', 'Equivalente no CCP atual'], [
    ['{{CCP.PRG}} — menu principal (Cadastro, Movimento, Relatórios, Utilitários)', 'Menu lateral da interface'],
    ['{{CADFOR / CADNAT / CADCC.PRG}}', 'Telas de Fornecedores, Naturezas e Centros de custo'],
    ['{{MOVINC / MOVALT / MOVEXC / MOVBAI / MOVREP / MOVCON.PRG}}', 'Movimento: incluir, alterar, excluir, baixar, reprogramar e consultar'],
    ['{{MVLER / MVLER1.PRG}} — leitura e validação de campos', '{{TituloValidator}} e {{BaixaValidator}}'],
    ['{{RI* / RV*.PRG}} — relatórios em impressora e vídeo', 'Tela de Relatórios ({{RelatorioService}})'],
    ['{{SENHA / SENCAS / UTUSU.PRG}} — acesso e usuários', 'Autenticação, níveis A/B/C e tela de Usuários'],
    ['{{INDEXA.PRG}} e arquivos {{.NTX}}', 'Índices do SQLite'],
    ['{{ccp.dbf, forn.dbf, natu.dbf, cc.dbf, t.dbf}}', 'Tabelas {{titulos}}, {{fornecedores}}, {{naturezas}}, {{centros}}, {{usuarios}}'],
  ], [5, 4]);

  // ───────────────────────── 3
  d.h1('Stack tecnológica');
  d.table(['Componente', 'Tecnologia', 'Observação'], [
    ['Runtime', `Node.js ${pkg.engines.node.replace('>=', '')}+`, 'Usa o SQLite embutido ({{node:sqlite}}); sem banco externo.'],
    ['Banco de dados', 'SQLite (WAL, chaves estrangeiras ligadas)', 'Arquivo {{ccp.sqlite}}.'],
    ['Servidor HTTP', '{{node:http}} próprio (Router, controladores)', 'Escuta apenas em 127.0.0.1.'],
    ['Interface', 'JavaScript puro (ES modules), HTML e CSS', 'Sem framework nem bundler; temas claro/escuro.'],
    ['Desktop', `Electron ${pkg.devDependencies.electron.replace('^', '')}`, 'Janela + servidor local numa porta livre.'],
    ['Instalador', `electron-builder ${pkg.devDependencies['electron-builder'].replace('^', '')}`, 'NSIS (instalador) e versão portátil.'],
    ['Atualização', `electron-updater ${pkg.dependencies['electron-updater'].replace('^', '')}`, 'Provedor GitHub Releases.'],
    ['Consulta de CNPJ', 'ReceitaWS (HTTPS)', 'Limite do serviço gratuito: poucas consultas por minuto.'],
    ['Testes', '{{node:test}}', '53 testes automatizados.'],
    ['Documentos', 'docx (dependência de desenvolvimento)', 'Gera estes documentos ({{npm run docs:docx}}).'],
  ], [2.2, 3.4, 4]);
  d.note('Dependências em produção', 'O aplicativo instalado tem **uma** dependência de execução além do Electron: o {{electron-updater}}. Todo o restante (servidor, SQLite, CSV, segurança) usa apenas recursos nativos do Node.');

  // ───────────────────────── 4
  d.h1('Arquitetura');
  d.h2('Visão em camadas');
  d.p('A aplicação é organizada em camadas; as dependências apontam para dentro (a apresentação conhece a aplicação, que conhece o domínio; a infraestrutura implementa o que a aplicação precisa).');
  d.table(['Camada', 'Pasta', 'Responsabilidade'], [
    ['Domínio', '{{src/domain}}', 'Regras puras: validação de título e baixa, políticas de permissão, CNPJ, dinheiro, datas, níveis e erros de negócio.'],
    ['Aplicação', '{{src/application}}', 'Casos de uso (serviços), auditoria, exportação e importação CSV.'],
    ['Infraestrutura', '{{src/infrastructure}}', 'SQLite, repositórios, segurança, CSV, Receita WS, backup diário, importador do legado.'],
    ['Apresentação', '{{src/presentation/http}}', '{{HttpServer}}, {{Router}} e controladores (traduzem HTTP ⇄ serviços).'],
    ['Composição', '{{src/compositionRoot.js}}', 'Único lugar que instancia as classes concretas e injeta as dependências.'],
    ['Desktop', '{{electron-main.js}}, {{src/desktop}}', 'Janela, pasta de dados, atualizador e backup diário.'],
    ['Interface', '{{public/}}', 'SPA (HTML, CSS e módulos JavaScript).'],
  ], [1.6, 3, 6]);
  d.h2('Princípios SOLID aplicados');
  d.p('Cada classe fica em seu próprio arquivo; arquivos auxiliares são módulos de funções.');
  d.table(['Princípio', 'Como foi aplicado', 'Exemplo'], [
    ['S — Responsabilidade única', 'Validar, autorizar, persistir, orquestrar, traduzir HTTP e auditar são classes diferentes.', '{{TituloValidator}}, {{TituloPolicy}}, {{TituloRepository}}, {{TituloService}}, {{TituloController}}, {{AuditTrail}}'],
    ['O — Aberto/fechado', 'Novos relatórios, exportações e importações entram em mapas/estratégias, sem alterar o código existente.', '{{RelatorioService.tipos}}, {{ExportService.entidades}}, importadores em {{application/import}}'],
    ['L — Substituição de Liskov', 'Implementações trocáveis atrás da mesma interface.', '{{NoUpdater}} e {{ElectronUpdater}}; {{CrudRepository}} e seus filhos'],
    ['I — Segregação de interfaces', 'Cada serviço recebe só o que usa.', '{{TituloValidator}} recebe apenas {{exists(id)}} dos cadastros'],
    ['D — Inversão de dependência', 'Serviços dependem de abstrações injetadas; o composition root decide as implementações.', 'Testes injetam SQLite em memória, relógio e gateway da Receita falsos'],
  ], [2.2, 4, 4]);
  d.h2('Composição e injeção de dependências');
  d.p('{{buildApplication(opções)}} em {{src/compositionRoot.js}} cria o banco, os repositórios, os serviços, os controladores, o roteador e o servidor HTTP. As opções permitem trocar peças sem tocar no código de produção:');
  d.table(['Opção', 'Uso'], [
    ['{{dbFile}}', 'Caminho do SQLite ou {{:memory:}} (testes).'],
    ['{{cnpjGateway}}', 'Substitui a consulta à ReceitaWS (testes).'],
    ['{{clock}}', 'Data de “hoje” usada pelo dashboard (testes).'],
    ['{{updater}}', 'Atualizador; o Electron injeta o {{ElectronUpdater}}, os demais modos usam o {{NoUpdater}}.'],
    ['{{version}}', 'Versão exibida (padrão: {{package.json}}).'],
    ['{{logger}}', 'Destino dos erros inesperados.'],
  ], [2.2, 7.4]);
  d.h2('Fluxo de uma requisição');
  d.numbered([
    '{{HttpServer}} localiza a rota no {{Router}}; rotas inexistentes respondem 404.',
    'Lê o cookie de sessão {{sid}} e carrega o usuário ({{AuthService.resolveUser}}).',
    'Autoriza pelas opções da rota: {{public}}, {{nivel}}, {{allowMustChange}} e {{selfService}}. O nível **Consulta** só executa {{GET}} (exceto ações do próprio perfil).',
    'Lê o corpo JSON (limite de 1 MB) e chama o controlador, que repassa {{ctx.user}} ao serviço como autor da ação.',
    'O serviço valida (domínio), grava (repositório) e **registra a auditoria** ({{AuditTrail}}).',
    'O resultado volta como JSON ou {{FileResponse}} (CSV, backup, imagem). Erros de negócio ({{AppError}} e filhas) viram a resposta HTTP com o status da própria exceção; erros inesperados viram 500 genérico e são logados.',
  ]);
  d.h2('Estrutura de pastas');
  d.code(`ccp-node/
├─ electron-main.js            janela, pasta de dados, atualizador e backup diário
├─ electron-builder.config.js  instalador (NSIS), portátil e canal de atualização
├─ release.config.json         canal de atualização (GitHub)
├─ src/
│  ├─ compositionRoot.js       injeção de dependências
│  ├─ server.js                inicialização web (npm start)
│  ├─ domain/                  validation/, policies/, errors/, money, dates, cnpj, niveis, cadastros
│  ├─ application/             serviços; import/ (importadores CSV)
│  ├─ infrastructure/          database/, repositories/, security/, csv/, http/, backup/, update/, legacy/
│  ├─ presentation/http/       HttpServer, Router, controllers/
│  └─ desktop/                 ElectronUpdater
├─ public/                     index.html, style.css, js/ (views/, components/), img/
├─ scripts/                    import-legacy, reset-password, release, docs/
├─ test/                       testes + helpers/createTestApp.js
├─ docs/                       documentação
└─ build/icon.png              ícone do aplicativo`);
  d.h2('Principais classes por camada');
  d.table(['Camada', 'Classes'], [
    ['Domínio', '{{AppError}} e filhas ({{ValidationError}} 400, {{UnauthorizedError}} 401, {{ForbiddenError}} 403, {{NotFoundError}} 404, {{ConflictError}} 409, {{TooManyAttemptsError}} 429, {{ExternalServiceError}} 502); {{TituloValidator}}, {{BaixaValidator}}, {{FieldSanitizer}}, {{ProfilePhotoValidator}}, {{TituloPolicy}}'],
    ['Aplicação', '{{AuthService}}, {{AdminBootstrap}}, {{CadastroService}}, {{TituloService}}, {{RelatorioService}}, {{DashboardService}}, {{UsuarioService}}, {{ExportService}}, {{BackupService}}, {{CnpjLookupService}}, {{ProfilePhotoService}}, {{SystemService}}, {{AuditTrail}}, {{AuditService}}, {{CsvImportService}} e importadores ({{FornecedorImporter}}, {{NaturezaImporter}}, {{CentroImporter}}, {{TituloImporter}}, {{SimpleCadastroImporter}})'],
    ['Infraestrutura', '{{SqliteDatabase}}, {{CrudRepository}} ({{FornecedorRepository}}, {{NaturezaRepository}}, {{CentroRepository}}), {{UsuarioRepository}}, {{TituloRepository}}, {{DashboardRepository}}, {{AuditRepository}}, {{PasswordHasher}}, {{SessionStore}}, {{LoginThrottle}}, {{CsvWriter}}, {{CsvParser}}, {{ReceitaWsGateway}}, {{DailyBackup}}, {{NoUpdater}}, {{DbfReader}}, {{LegacyImporter}}'],
    ['Apresentação', '{{HttpServer}}, {{Router}}, {{StaticFileHandler}}, {{FileResponse}} e controladores: Auth, Cadastro, Titulo, Relatorio, Export, Import, Usuario, Dashboard, Audit, Cnpj, Profile, System'],
    ['Desktop', '{{ElectronUpdater}} e {{electron-main.js}}'],
  ], [1.6, 8]);

  // ───────────────────────── 5
  d.h1('Banco de dados');
  d.h2('Características gerais');
  d.bullets(['SQLite via {{node:sqlite}}; {{journal_mode = WAL}} e {{foreign_keys = ON}}.', 'Valores monetários em **centavos** ({{*_cents}}); datas em texto ISO; textos de cadastro em maiúsculas.', 'Transações: {{SqliteDatabase.transaction}} (aceita aninhamento); a importação CSV e as migrações são transacionais.']);
  d.table(['Modo de execução', 'Local do banco'], [
    ['Aplicativo instalado', '{{%APPDATA%\\ccp-node\\ccp.sqlite}} (preservado ao desinstalar, reinstalar e atualizar)'],
    ['{{npm start}} (desenvolvimento)', '{{data/ccp.sqlite}} ou o caminho da variável {{CCP_DB}}'],
    ['Testes', '{{:memory:}}'],
  ], [3, 7]);
  d.h2('Tabelas');
  d.table(['Tabela', 'Colunas principais', 'Observações'], [
    ['{{usuarios}}', 'id, usuario (único), nivel (A/B/C), senha_hash, must_change, data_cad, foto (BLOB), foto_tipo, foto_em', 'Senha com scrypt + sal; foto até 300 KB.'],
    ['{{fornecedores}}', 'id, nome, pess (F/J), ende, bair, cida, esta, cep, fone, fax, cgc (CNPJ/CPF), insc, con1, con2', 'Códigos do legado preservados na importação.'],
    ['{{naturezas}}', 'id, nome', 'Natureza de pagamento.'],
    ['{{centros}}', 'id, nome', 'Centro de custo.'],
    ['{{titulos}}', 'id, fornecedor_id, natureza_id, docum, histo, dt_venc, dt_emi, valor_cents, local_pg, notaf, dt_rep, valre_cents, dt_pag, receb_cents, juros_cents, desco_cents, noche, banco, vrche_cents', 'Em aberto = {{dt_pag IS NULL}}. Baixa e reprogramação ficam na própria linha.'],
    ['{{titulo_rateio}}', 'titulo_id, centro_id, valor_cents', 'Chave composta (título, centro); até 4 por título; removida junto com o título.'],
    ['{{auditoria}}', 'id, em (UTC), usuario_id, usuario, acao, entidade, entidade_id, descricao, antes (JSON), depois (JSON)', 'Imutável (gatilhos). Sem FK para usuário, para preservar o histórico.'],
  ], [1.8, 5.6, 3.4]);
  d.h2('Índices');
  d.p('{{titulos}}: {{dt_venc}}, {{dt_pag}}, {{fornecedor_id}}, {{natureza_id}} e {{docum}}; {{titulo_rateio}}: {{centro_id}}; {{auditoria}}: {{em}}, {{usuario}} e ({{entidade}}, {{entidade_id}}).');
  d.h2('Migrações');
  d.p('As migrações ficam em {{src/infrastructure/database/migrations.js}} (lista ordenada); a versão aplicada é guardada em {{PRAGMA user_version}}. Ao abrir o banco, as pendentes rodam automaticamente, cada uma em transação.');
  d.table(['#', 'Mudança'], [
    ['1', 'Estrutura inicial: usuários, cadastros, títulos, rateio e índices.'],
    ['2', 'Foto de perfil dos usuários ({{foto}}, {{foto_tipo}}, {{foto_em}}).'],
    ['3', 'Tabela de auditoria e gatilhos de imutabilidade.'],
  ], [1, 9]);
  d.note('Regra de ouro', 'Nunca edite uma migração já publicada: acrescente uma nova ao final da lista. Bancos de usuários que já receberam a anterior não rodariam a alteração.', 'warn');
  d.h2('Backup e restauração');
  d.bullets([
    '**Manual (nível A):** Usuários → *Backup (SQLite)* baixa uma cópia consistente ({{VACUUM INTO}}); o evento fica na auditoria.',
    '**Automático:** {{DailyBackup}} grava {{ccp-AAAA-MM-DD.sqlite}} uma vez por dia em {{Documentos\\CCP Backups}}, mantendo as 14 cópias mais recentes.',
    '**Restaurar:** feche o programa e copie o arquivo de backup sobre {{%APPDATA%\\ccp-node\\ccp.sqlite}}.',
  ]);

  // ───────────────────────── 6
  d.h1('Regras de negócio implementadas');
  d.table(['Tema', 'Regra', 'Onde'], [
    ['Título', 'Documento, histórico, vencimento, valor > 0, natureza e fornecedor obrigatórios; datas ≥ 1990; textos em maiúsculas.', '{{TituloValidator}}'],
    ['Rateio', '1 a 4 centros distintos; soma dos valores = valor do título (comparação em centavos).', '{{TituloValidator}}'],
    ['Baixa', 'pago − juros + desconto = valor do título; valor do cheque ≥ valor pago; data válida.', '{{BaixaValidator}}'],
    ['Edição', 'Título baixado não pode ser alterado nem reprogramado; baixa já feita não repete.', '{{TituloService}}'],
    ['Exclusão e estorno', 'Excluir título baixado e estornar baixa: somente nível A.', '{{TituloPolicy}}'],
    ['Cadastros', 'Registro com títulos vinculados não pode ser excluído (indicador {{emUso}}).', '{{CadastroService}}'],
    ['Níveis', 'A: tudo; B: opera títulos em aberto e cadastros; C: somente consulta.', '{{HttpServer}}, {{TituloPolicy}}'],
    ['Login', 'Senha provisória exige troca; 3 falhas bloqueiam por 5 minutos.', '{{AuthService}}, {{LoginThrottle}}'],
    ['CNPJ', 'Dígitos verificadores (inclusive CNPJ alfanumérico).', '{{domain/cnpj.js}}'],
    ['Importação', 'Validação prévia, erros por linha, tudo ou nada, sem duplicidades.', '{{CsvImportService}}'],
  ], [1.6, 6, 2.6]);
  d.p('O detalhamento funcional de cada regra está na Documentação Funcional.');

  // ───────────────────────── 7
  d.h1('Segurança');
  d.table(['Tema', 'Medida'], [
    ['Senhas', 'scrypt com sal aleatório de 16 bytes ({{PasswordHasher}}); comparação em tempo constante; mínimo de 6 caracteres; troca obrigatória da senha provisória.'],
    ['Sessão', 'Token aleatório de 24 bytes em memória ({{SessionStore}}), validade de 8 horas, cookie {{HttpOnly; SameSite=Strict}}.'],
    ['Força bruta', '{{LoginThrottle}}: 3 falhas por usuário bloqueiam o login por 5 minutos; falhas e bloqueios são auditados.'],
    ['Autorização', 'Por nível, aplicada no servidor ({{nivel}}, {{selfService}}); a interface apenas esconde botões.'],
    ['SQL injection', 'Todas as consultas são parametrizadas; nomes de tabela/coluna dinâmicos vêm de listas fixas no código.'],
    ['XSS', 'Todo texto vindo do usuário passa por {{esc()}} antes de entrar no HTML; cabeçalho {{X-Content-Type-Options: nosniff}}.'],
    ['Arquivos estáticos', '{{StaticFileHandler}} impede sair da pasta {{public}} (path traversal).'],
    ['Upload de foto', 'Apenas PNG/JPEG/WebP, até 300 KB, validado por assinatura dos bytes ({{ProfilePhotoValidator}}).'],
    ['CSV', 'Neutralização de injeção de fórmula (células iniciadas por = + − @); limite de 5.000 linhas na importação; corpo de requisição limitado a 1 MB.'],
    ['Auditoria', 'Tabela imutável por gatilhos; nunca registra senhas, hashes nem o conteúdo de fotos.'],
    ['Rede', 'O servidor escuta somente em {{127.0.0.1}}; nenhuma porta é exposta na rede local.'],
    ['Electron', '{{contextIsolation}} e {{sandbox}} ligados; navegação para fora do app é bloqueada e links externos abrem no navegador do sistema; instância única.'],
  ], [2, 8]);
  d.h2('Limitações conhecidas');
  d.bullets([
    'O arquivo do banco **não é criptografado**; quem tem acesso ao computador e à pasta do usuário pode copiá-lo (considere criptografia de disco).',
    'Sessões ficam em memória: reiniciar o programa encerra os logins.',
    'O executável **não é assinado digitalmente**; o Windows SmartScreen pode avisar na primeira instalação.',
    'O aplicativo é de uso **local** (um computador, um banco). Não há sincronização entre computadores.',
  ]);

  // ───────────────────────── 8
  d.h1('API HTTP');
  d.p('JSON sobre HTTP em {{127.0.0.1}}, autenticada por cookie. Erros retornam {{{ "error": "mensagem" }}} com o status adequado: 400 validação, 401 não autenticado, 403 sem permissão, 404 não encontrado, 409 conflito, 429 muitas tentativas ou limite de serviço, 502 serviço externo, 500 erro interno. “Todos” = qualquer usuário logado (nível C somente em {{GET}}, salvo self-service).');
  d.h2('Acesso e perfil');
  d.table(['Método', 'Rota', 'Acesso', 'Descrição'], [
    ['POST', '/api/login', 'público', 'Entra com {{usuario}} e {{senha}}; define o cookie.'],
    ['POST', '/api/logout', 'público', 'Encerra a sessão.'],
    ['GET', '/api/me', 'todos', 'Dados do usuário logado.'],
    ['POST', '/api/me/senha', 'todos', 'Troca a própria senha ({{atual}}, {{nova}}).'],
    ['POST / DELETE', '/api/me/foto', 'todos', 'Envia (data URL) ou remove a própria foto.'],
    ['GET', '/api/usuarios/:id/foto', 'todos', 'Imagem do usuário.'],
  ], [1.6, 3.2, 1.4, 4.4]);
  d.h2('Movimento');
  d.table(['Método', 'Rota', 'Acesso', 'Descrição'], [
    ['GET', '/api/titulos', 'todos', 'Lista (máx. 1000). Filtros: q, status, codig, natur, cc, docum, valor, de, ate.'],
    ['POST', '/api/titulos', 'A/B', 'Inclui título.'],
    ['PUT', '/api/titulos/:id', 'A/B', 'Altera título em aberto.'],
    ['DELETE', '/api/titulos/:id', 'A/B*', 'Exclui (*baixado: somente A).'],
    ['POST', '/api/titulos/:id/baixa', 'A/B', 'Baixa o título.'],
    ['POST', '/api/titulos/:id/estorno', 'A', 'Desfaz a baixa.'],
    ['POST', '/api/titulos/:id/reprogramar', 'A/B', 'Define nova data e valor.'],
  ], [1.6, 3.6, 1.2, 4.2]);
  d.h2('Cadastros, CNPJ, dashboard e relatórios');
  d.table(['Método', 'Rota', 'Acesso', 'Descrição'], [
    ['GET / POST', '/api/fornecedores, /api/naturezas, /api/centros', 'todos / A,B', 'Lista (com {{emUso}}) e inclui.'],
    ['PUT / DELETE', '/api/<cadastro>/:id', 'A/B', 'Altera e exclui (409 se houver títulos vinculados).'],
    ['GET', '/api/cnpj/:cnpj', 'todos', 'Consulta a ReceitaWS e devolve o fornecedor sugerido.'],
    ['GET', '/api/dashboard?meses=3|6|12', 'todos', 'Indicadores, séries, faixas de atraso, rankings e próximos vencimentos.'],
    ['GET', '/api/relatorios/:tipo', 'todos', 'Tipos: vencimentos, pagamentos, reprogramados, fornecedor, natureza, centro, baixas. {{formato=csv}} baixa o CSV.'],
  ], [1.6, 3.8, 1.3, 3.9]);
  d.h2('Exportação e importação CSV');
  d.table(['Método', 'Rota', 'Acesso', 'Descrição'], [
    ['GET', '/api/exportar/:entidade', 'todos (auditoria: A)', 'fornecedores, naturezas, centros, titulos (aceita os filtros da lista), auditoria.'],
    ['GET', '/api/importar/:entidade/modelo', 'todos', 'Modelo CSV (cabeçalho + exemplo).'],
    ['GET', '/api/importar/:entidade', 'todos', 'Colunas do modelo e obrigatoriedade.'],
    ['POST', '/api/importar/:entidade', 'A/B', '{{{csv, confirmar}}}: valida ou importa.'],
  ], [1.4, 3.8, 1.8, 3.6]);
  d.h2('Administração');
  d.table(['Método', 'Rota', 'Acesso', 'Descrição'], [
    ['GET / POST', '/api/usuarios', 'A', 'Lista e cria usuários.'],
    ['DELETE', '/api/usuarios/:id', 'A', 'Exclui (não o próprio).'],
    ['GET', '/api/backup', 'A', 'Baixa uma cópia do banco.'],
    ['GET', '/api/auditoria, /api/auditoria/opcoes, /api/auditoria/:id', 'A', 'Consulta, filtros disponíveis e detalhe com antes/depois.'],
    ['GET', '/api/sistema', 'todos', 'Versão e estado da atualização.'],
    ['POST', '/api/sistema/atualizacoes/verificar, /instalar', 'A', 'Procura e instala atualização.'],
  ], [1.6, 4.4, 0.8, 3.8]);

  // ───────────────────────── 9
  d.h1('Interface (front-end)');
  d.p('SPA em módulos ES carregada de {{public/index.html}} ({{public/js/main.js}}). O estilo usa tokens de cor ({{:root}}) para os temas claro e escuro, automático pelo sistema com alternância manual guardada no navegador.');
  d.h2('Módulos');
  d.table(['Módulo', 'Função'], [
    ['{{main.js}}', 'Login, troca de senha, menu lateral, navegação, sessão expirada e atalho “/”.'],
    ['{{views/*}}', 'Telas: dashboard, titulos, cadastro (3 recursos), relatorios, usuarios, auditoria, sobre.'],
    ['{{components/grid.js}}', 'Grid padrão: pesquisa, filtros, exportar/importar/novo, ordenação e menu de ações.'],
    ['{{components/filterDialog.js}}', 'Modal de filtros específicos de cada tela.'],
    ['{{components/importDialog.js}}', 'Modal de importação CSV (modelo → arquivo → conferência → importar).'],
    ['{{components/charts.js}}', 'Gráficos de colunas (SVG) e barras horizontais; sem bibliotecas.'],
    ['{{components/passwordToggle.js}}', 'Botão “olho” em todo campo de senha.'],
    ['{{ui.js}}', 'Avisos, modal ({{openDialog}}) e confirmação ({{confirmDialog}}).'],
    ['{{api.js}}, {{state.js}}, {{niveis.js}}, {{cnpj.js}}, {{theme.js}}, {{icons.js}}', 'Cliente HTTP, estado, níveis, consulta de CNPJ, tema e ícones.'],
  ], [3.4, 6.6]);
  d.h2('Padrão de grid');
  d.p('Todas as tabelas seguem o mesmo padrão ({{createGrid}}): barra com **pesquisa** e botão **Filtros** (com contador) à esquerda; **Exportar CSV**, **Importar CSV** e **Novo …** à direita; abaixo, somente a tabela com cabeçalhos ordenáveis e ações por linha (a principal visível; as demais no menu “⋯”). Novo e editar abrem **modal**. Pesquisa e filtros são lembrados ao navegar entre telas.');
  d.bullets(['Cadastros: a pesquisa e os filtros são feitos no navegador; Movimento e Auditoria consultam o servidor (parâmetro {{q}}, com atraso de 300 ms).', 'Acessibilidade: foco visível, alvos ≥ 40 px, estados com ícone + texto (não só cor), {{aria-live}} nos avisos, respeito a {{prefers-reduced-motion}}.']);

  // ───────────────────────── 10
  d.h1('Funcionalidades técnicas detalhadas');
  d.h2('Dashboard');
  d.p('{{DashboardService.obter(meses)}} agrega, via {{DashboardRepository}}, os dados do banco para a data de hoje (relógio injetável):');
  d.bullets([
    '**Indicadores:** em aberto, vencidos, vence hoje, próximos 7 dias, pago no mês e no anterior, juros e descontos do mês, concentração do maior fornecedor.',
    '**Séries:** a vencer por mês (a partir de hoje) e pagamentos por mês, nas janelas de 3, 6 ou 12 meses.',
    '**Vencidos por faixa:** 1–30, 31–60, 61–90 e mais de 90 dias.',
    '**Rankings:** maiores fornecedores, naturezas e centros de custo (pelo valor **rateado**), e os 8 próximos vencimentos.',
  ]);
  d.p('Os “pontos de atenção” são montados na tela ({{views/dashboard.js}}) a partir desses números.');
  d.h2('Importação e exportação CSV');
  d.bullets([
    '{{CsvParser}}: separador automático ({{;}}, {{,}} ou tab), aspas, quebras de linha em células e BOM UTF-8. A tela lê o arquivo como UTF-8 e, se inválido, como Windows-1252 (Excel antigo).',
    '{{CsvImportService}} mapeia os cabeçalhos (sem acentos/maiúsculas, com apelidos) e delega cada linha ao importador da tela: {{begin()}} prepara o contexto, {{parse(linha)}} valida e {{commit(registros)}} grava.',
    'Fluxo: **validar sem gravar** → relatório (linhas válidas, erros por linha, amostra) → **confirmar**. A gravação é tudo ou nada (transação) e vai para a auditoria.',
    '{{CsvWriter}}: UTF-8 com BOM, separador {{;}}, decimais com vírgula, datas dd/mm/aaaa — abre direto no Excel pt-BR.',
  ]);
  d.h2('Consulta de CNPJ (ReceitaWS)');
  d.bullets([
    'Ao sair do campo CNPJ (14 caracteres), a tela chama {{GET /api/cnpj/:cnpj}}; o servidor valida os dígitos ({{isValidCnpj}}, com suporte ao CNPJ alfanumérico) e consulta {{https://receitaws.com.br/v1/cnpj/{cnpj}}} ({{ReceitaWsGateway}}, timeout de 10 s).',
    'Mapeamento ({{CnpjLookupService}}): razão social → nome; logradouro + número → endereço; bairro, município, UF, CEP e primeiro telefone. Somente campos vazios são preenchidos; tudo continua editável.',
    'Falhas viram avisos: CNPJ inválido (400), não encontrado (404), limite de consultas (429) e serviço indisponível (502).',
  ]);
  d.h2('Foto de perfil');
  d.p('O navegador recorta o centro da imagem em quadrado de 256 px e envia JPEG em data URL; o servidor valida tipo, tamanho (300 KB) e assinatura e grava no BLOB. A tela usa {{fotoVersao}} na URL para evitar cache antigo.');
  d.h2('Importação do sistema legado');
  d.code('node scripts/import-legacy.js "<pasta do CCP original>" [destino.sqlite]');
  d.p('{{DbfReader}} lê os {{.DBF}} (codificação CP850) e {{LegacyImporter}} grava fornecedores, naturezas, centros, usuários e títulos preservando os códigos. As senhas antigas (cifra por substituição) não são reaproveitadas: todos recebem uma senha provisória. Não sobrescreve um banco existente.');
  d.h2('Auditoria');
  d.p('{{AuditTrail.record({ actor, acao, entidade, entidadeId, descricao, antes, depois })}} é chamado pelos serviços após cada modificação (títulos, cadastros, usuários, foto, senha, login/logout/falhas, importação, backup e atualização). {{AuditRepository}} só insere e consulta; os gatilhos {{auditoria_sem_update}} e {{auditoria_sem_delete}} impedem alteração. A consulta (nível A) tem busca, filtros por usuário, ação, entidade e período, detalhe “antes → depois” e exportação CSV.');

  // ───────────────────────── 11
  d.h1('Aplicativo desktop e instalação');
  d.h2('Execução');
  d.p('{{electron-main.js}} cria a aplicação ({{buildApplication}}), garante o usuário ADMIN na primeira execução (senha provisória exibida em janela), sobe o servidor numa porta livre de {{127.0.0.1}}, abre a janela e agenda o backup diário e a verificação de atualizações. Apenas **uma instância** roda por vez.');
  d.h2('Pasta de dados');
  d.p('A pasta de dados do usuário é **fixada** no código ({{%APPDATA%\\ccp-node}}) e **não é removida** pelo desinstalador ({{deleteAppDataOnUninstall: false}}). Por isso, desinstalar, reinstalar e atualizar mantêm o banco. A opção {{--user-data-dir}} (ou a variável {{CCP_USER_DATA}}) serve apenas para testes.');
  d.h2('Instalador');
  d.table(['Arquivo', 'Uso'], [
    ['{{CCP-Contas-a-Pagar-Setup-<versão>.exe}}', 'Instalador NSIS por usuário (não exige administrador): atalhos na área de trabalho e no menu Iniciar, escolha da pasta e entrada em “Aplicativos”.'],
    ['{{CCP-Contas-a-Pagar-Portatil-<versão>.exe}}', 'Versão portátil (não se atualiza sozinha).'],
    ['{{latest.yml}} e {{*.blockmap}}', 'Metadados de atualização (gerados quando há canal configurado).'],
  ], [4.2, 5.8]);
  d.p('Instalação silenciosa: {{CCP-Contas-a-Pagar-Setup-<versão>.exe /S}}. Local padrão: {{%LOCALAPPDATA%\\Programs\\CCP Contas a Pagar}}.');

  // ───────────────────────── 12
  d.h1('Publicação e atualização automática');
  d.h2('Canal de atualização');
  d.p('Configurado em {{release.config.json}}, lido por {{electron-builder.config.js}} e embutido no instalador ({{app-update.yml}}):');
  d.code('{ "provider": "github", "owner": "kestevesPUC", "repo": "CCP-JRP-ENGENHARIA",\n  "private": false, "releaseType": "release" }');
  d.h2('Publicar uma nova versão');
  d.numbered([
    'Defina o token do GitHub (permissão **Contents: Read and write**) no arquivo {{.env}} da pasta do projeto: {{GH_TOKEN=github_pat_...}} (modelo em {{.env.example}}).',
    'Faça o commit do código e rode {{npm run publicar}} (ou {{npm run publicar:minor}} para uma versão intermediária).',
    'O script ({{scripts/release.js}}) confere o token e o acesso ao repositório, roda os testes, sobe a versão (2.1.0 → 2.1.1), compila e cria a release {{v2.1.1}} no GitHub com o instalador, o {{.blockmap}} e o {{latest.yml}}. Se algo falhar depois de subir a versão, o número anterior é restaurado.',
    'Envie o código ({{git push}}).',
  ]);
  d.note('Requisitos', ['A versão do {{package.json}} deve ser **maior** que a instalada; nunca reaproveite um número.', 'O repositório precisa ser **público** (ou use um segundo repositório público só para os instaladores): com repositório privado os computadores não conseguem baixar a atualização.', 'A primeira versão com o canal configurado precisa ser instalada manualmente uma vez em cada computador.'], 'warn');
  d.h2('O que acontece nos computadores');
  d.numbered([
    '{{ElectronUpdater}} verifica atualizações 15 segundos após abrir o programa e a cada 6 horas (e sob demanda em *Sobre e atualizações*, nível A).',
    'Se houver versão maior, baixa em segundo plano; ao terminar, pergunta: *Reiniciar e instalar agora* ou *Depois*.',
    'Com *Depois*, a atualização é instalada automaticamente ao fechar o programa. As migrações do banco rodam na primeira abertura da versão nova.',
    'Verificações e instalações ficam na auditoria. Estados: idle, verificando, disponivel, baixado, atual, indisponivel e erro.',
  ]);

  // ───────────────────────── 13
  d.h1('Operação e manutenção');
  d.h2('Rotina');
  d.table(['Item', 'Detalhe'], [
    ['Backup', 'Automático diário em {{Documentos\\CCP Backups}}; manual em Usuários → Backup (nível A).'],
    ['Logs', 'Erros inesperados vão ao console do processo; os eventos de negócio ficam na tabela {{auditoria}}.'],
    ['Redefinir senha', '{{node scripts/reset-password.js <arquivo.sqlite> <USUARIO> <nova-senha>}} (o usuário troca a senha no próximo acesso).'],
    ['Restaurar dados', 'Feche o programa e copie o backup sobre {{%APPDATA%\\ccp-node\\ccp.sqlite}}.'],
    ['Migração de computador', 'Copie o {{ccp.sqlite}} para a mesma pasta no novo computador após instalar.'],
  ], [2.2, 7.8]);
  d.h2('Problemas comuns');
  d.table(['Sintoma', 'Causa provável', 'Solução'], [
    ['Não consigo entrar (primeiro acesso)', 'Senha provisória perdida.', 'Redefinir com {{reset-password.js}}.'],
    ['“Número de tentativas esgotado”', '3 senhas erradas.', 'Aguardar 5 minutos.'],
    ['A segunda janela não abre', 'Já existe uma instância aberta (instância única).', 'Usar a janela aberta.'],
    ['Consulta de CNPJ falha', 'Limite da ReceitaWS, CNPJ inexistente ou sem internet.', 'Aguardar 1 minuto ou preencher manualmente.'],
    ['Atualização “indisponível”', 'Versão gerada sem canal ou execução fora do instalado.', 'Instalar a versão gerada com {{release.config.json}}.'],
    ['{{npm run publicar}} falha', 'Token ausente/sem permissão, repositório inacessível ou release já existente.', 'Seguir a mensagem do script; veja a seção de publicação.'],
    ['Build falha por arquivo em uso', 'Programa aberto a partir da pasta {{dist/}}.', 'Fechar o programa ou usar outra pasta de saída.'],
  ], [2.6, 3.6, 3.8]);

  // ───────────────────────── 14
  d.h1('Testes');
  d.p('Os testes ({{npm test}}) sobem a aplicação completa com SQLite em memória e um cliente HTTP com cookie ({{test/helpers/createTestApp.js}}), com relógio e gateway da Receita substituíveis. Total atual: **53 testes**.');
  d.table(['Arquivo', 'Cobertura'], [
    ['{{api.test.js}}', 'Autenticação, bloqueio, rateio, baixa, permissões por nível, cadastros em uso, backup.'],
    ['{{domain.test.js}}', 'Validadores, política, hash de senha, throttle e sessões.'],
    ['{{audit.test.js}}', 'Registros de cada ação, antes/depois, ausência de senhas, imutabilidade, filtros e exportação.'],
    ['{{import.test.js}}', 'Parser CSV, formatos de data e valor, modelos, validação, tudo ou nada e importadores.'],
    ['{{export.test.js}}', 'CSV (BOM, separador, decimais, fórmulas) e exportações.'],
    ['{{dashboard.test.js}}', 'Indicadores, faixas de atraso, séries e rankings.'],
    ['{{search.test.js}}', 'Busca livre e indicador de uso dos cadastros.'],
    ['{{cnpj.test.js}}', 'Dígitos verificadores, mapeamento da Receita e tratamento de erros.'],
    ['{{profile.test.js}}', 'Foto de perfil, nível Consulta e migrações.'],
    ['{{system.test.js}}', 'Atualizador, rotas de sistema e backup diário.'],
  ], [2.6, 7.4]);

  // ───────────────────────── 15
  d.h1('Guia de extensão');
  d.table(['Quero…', 'Faça'], [
    ['Um novo relatório', 'Acrescente uma entrada em {{RelatorioService.tipos}} e a opção em {{views/relatorios.js}}.'],
    ['Uma nova exportação', 'Acrescente em {{ExportService.entidades}}.'],
    ['Importar outra tela', 'Crie um importador em {{application/import}}, registre-o em {{compositionRoot.js}} e passe {{onImport}} ao grid.'],
    ['Um novo cadastro simples', 'Migração da tabela + repositório ({{CrudRepository}}) + {{FieldSanitizer}} + {{CadastroController}} no composition root + entrada em {{views/cadastro.js}}.'],
    ['Uma nova tela em grid', 'Use {{createGrid}}, {{openFilterDialog}} e {{openDialog}}.'],
    ['Alterar o banco', 'Acrescente uma migração ao final de {{migrations.js}}; nunca edite as publicadas.'],
    ['Auditar uma nova ação', 'Chame {{audit.record(...)}} no serviço, com o autor ({{ctx.user}}) e antes/depois; não registre senhas.'],
  ], [2.6, 7.4]);
  d.h2('Convenções de código');
  d.bullets(['Uma classe por arquivo; o nome da classe é o nome do arquivo.', 'Serviços recebem dependências no construtor; só o composition root usa {{new}} em classes concretas.', 'Regras de negócio no domínio/aplicação; controladores só traduzem HTTP.', 'Erros de negócio: lance subclasses de {{AppError}} (carregam o status HTTP).', 'Front-end: módulos ES, {{esc()}} em todo texto do usuário, estados com ícone + texto.']);

  // ───────────────────────── 16
  d.h1('Glossário');
  d.table(['Termo', 'Significado'], [
    ['Título', 'Conta a pagar (documento com fornecedor, valor e vencimento).'],
    ['Baixa', 'Registro do pagamento de um título.'],
    ['Estorno', 'Desfazer a baixa; o título volta a “em aberto”.'],
    ['Reprogramação', 'Nova data de vencimento (e valor) para um título em aberto.'],
    ['Rateio', 'Divisão do valor do título entre até 4 centros de custo.'],
    ['Natureza', 'Classificação do pagamento (ex.: carteira, boleto, cheque).'],
    ['Centro de custo', 'Destino contábil do gasto (ex.: obra, setor).'],
    ['Nível', 'Perfil de acesso: A (Administrador), B (Operador), C (Consulta).'],
    ['Migração', 'Script versionado que atualiza a estrutura do banco.'],
    ['Composition root', 'Ponto único que monta e liga todas as classes.'],
    ['NSIS', 'Tecnologia do instalador do Windows usada pelo electron-builder.'],
  ], [2.4, 7.6]);

  // ───────────────────────── Apêndice
  d.h1('Apêndice — Pontos em aberto');
  d.p('Itens que dependem de decisão ou informação do responsável pelo sistema:');
  d.table(['Item', 'Situação'], [
    ['Contato de suporte / responsável técnico', 'A informar.'],
    ['Visibilidade do repositório no GitHub', 'Atualmente privado; precisa ser público (ou outro repositório de binários) para a atualização automática funcionar.'],
    ['Assinatura digital do instalador', 'Não configurada; recomendada para eliminar o aviso do SmartScreen.'],
    ['Criptografia do banco / do disco', 'Não implementada; avaliar conforme a política de segurança da empresa.'],
    ['Política de retenção da auditoria', 'Sem limpeza automática (a tabela é imutável); definir arquivamento, se necessário.'],
  ], [4, 6]);

  return d.save(file);
}

module.exports = { buildTecnica };
