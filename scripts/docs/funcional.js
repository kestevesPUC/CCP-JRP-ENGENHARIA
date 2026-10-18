'use strict';
const path = require('node:path');
const { DocBuilder } = require('./lib');

const pkg = require('../../package.json');

/** Conteúdo da Documentação Funcional do CCP. */
async function buildFuncional(file) {
  const d = new DocBuilder({
    titulo: 'CCP — Controle de Contas a Pagar',
    subtitulo: 'Funcionalidades, regras de negócio, perfis de acesso e fluxos de uso',
    tipo: 'Documentação Funcional',
    versaoDoc: '1.0',
    versaoSistema: pkg.version,
    data: '18/10/2026',
    autor: 'Kaio Gomes',
    logo: path.join(__dirname, '..', '..', 'build', 'icon.png'),
  });

  // ───────────────────────── 1
  d.h1('Introdução');
  d.h2('Objetivo');
  d.p('Descrever **o que o CCP faz** e **como se usa**: perfis de acesso, telas, regras de negócio, requisitos e casos de uso. O documento serve de referência para usuários, gestores e analistas, e como base para treinamento e homologação.');
  d.h2('Público-alvo');
  d.bullets(['**Gestores:** acompanhar o contas a pagar pelo Dashboard e pelos relatórios;', '**Operadores financeiros:** cadastrar, lançar, baixar e reprogramar títulos;', '**Administradores:** usuários, backup, auditoria e atualizações;', '**Analistas:** conferir regras e requisitos.']);
  d.h2('O que é o CCP');
  d.p('O CCP — Controle de Contas a Pagar — é o sistema da JRP Engenharia e Projetos para controlar os títulos (contas) a pagar: quem é o fornecedor, quanto, quando vence, para qual obra/centro de custo vai o gasto, e se já foi pago. Substitui o programa antigo (CCP.EXE, em Clipper), mantendo suas regras e acrescentando painel gerencial, auditoria, importação por planilha e atualização automática.');

  // ───────────────────────── 2
  d.h1('Visão geral funcional');
  d.h2('Ciclo de vida de uma conta a pagar');
  d.numbered([
    '**Cadastros de apoio:** fornecedor, natureza de pagamento e centro de custo.',
    '**Inclusão do título** no Movimento (com rateio entre centros de custo).',
    '**Acompanhamento:** o título aparece como *Em aberto*, *Vence hoje* ou *Vencido*; o Dashboard destaca o que exige atenção.',
    '**Reprogramação**, quando o vencimento é adiado.',
    '**Baixa:** registro do pagamento (data, valor pago, juros, desconto, banco e cheque). O título passa a *Pago*.',
    '**Estorno** (somente administrador), se a baixa foi lançada por engano.',
    '**Relatórios, exportação e auditoria** para conferência e prestação de contas.',
  ]);
  d.h2('Mapa das telas');
  d.table(['Tela', 'Para que serve', 'Quem acessa'], [
    ['Dashboard', 'Visão gerencial: indicadores, gráficos e pontos de atenção.', 'Todos'],
    ['Movimento', 'Lançar e acompanhar títulos; baixar, reprogramar, excluir.', 'Todos (edição: A e B)'],
    ['Fornecedores', 'Cadastro de fornecedores (com busca do CNPJ na Receita).', 'Todos (edição: A e B)'],
    ['Naturezas', 'Classificação dos pagamentos.', 'Todos (edição: A e B)'],
    ['Centros de custo', 'Destinos do gasto (obras, setores) usados no rateio.', 'Todos (edição: A e B)'],
    ['Relatórios', 'Consultas por período, fornecedor, natureza e centro; imprimir ou exportar.', 'Todos'],
    ['Usuários', 'Cadastrar/excluir usuários e baixar backup.', 'Administrador'],
    ['Auditoria', 'Quem fez o quê e quando.', 'Administrador'],
    ['Meu perfil / Sobre', 'Foto, versão do sistema e atualizações.', 'Todos (atualizar: A)'],
  ], [2, 5.4, 2.4]);

  // ───────────────────────── 3
  d.h1('Perfis de acesso');
  d.table(['Nível', 'Nome', 'Resumo'], [
    ['A', 'Administrador', 'Acesso total: usuários, backup, auditoria, atualizações, estorno de baixa e exclusão de títulos baixados.'],
    ['B', 'Operador', 'Lança, altera, baixa, reprograma e exclui títulos em aberto; mantém cadastros; importa CSV.'],
    ['C', 'Consulta', 'Somente visualiza telas, relatórios e dashboard e exporta CSV; não altera nada.'],
  ], [0.8, 2.2, 7]);
  d.h2('Matriz de permissões');
  d.table(['Funcionalidade', 'A', 'B', 'C'], [
    ['Ver Dashboard, Movimento, Cadastros e Relatórios', 'Sim', 'Sim', 'Sim'],
    ['Exportar CSV (telas e relatórios)', 'Sim', 'Sim', 'Sim'],
    ['Incluir/alterar títulos e cadastros', 'Sim', 'Sim', 'Não'],
    ['Baixar e reprogramar título', 'Sim', 'Sim', 'Não'],
    ['Excluir título em aberto / cadastro sem uso', 'Sim', 'Sim', 'Não'],
    ['Excluir título já baixado', 'Sim', 'Não', 'Não'],
    ['Estornar baixa', 'Sim', 'Não', 'Não'],
    ['Importar CSV', 'Sim', 'Sim', 'Não'],
    ['Gerenciar usuários e fazer backup', 'Sim', 'Não', 'Não'],
    ['Consultar e exportar a auditoria', 'Sim', 'Não', 'Não'],
    ['Verificar/instalar atualizações', 'Sim', 'Não', 'Não'],
    ['Trocar a própria senha e foto', 'Sim', 'Sim', 'Sim'],
  ], [6, 1, 1, 1]);

  // ───────────────────────── 4
  d.h1('Requisitos');
  d.h2('Requisitos funcionais');
  d.table(['ID', 'Requisito', 'Perfil'], [
    ['RF-01', 'Autenticar usuários por usuário e senha, com bloqueio após 3 tentativas erradas.', 'Todos'],
    ['RF-02', 'Exigir a troca da senha provisória no primeiro acesso.', 'Todos'],
    ['RF-03', 'Permitir mostrar/ocultar a senha digitada.', 'Todos'],
    ['RF-04', 'Permitir ao usuário definir sua foto de perfil.', 'Todos'],
    ['RF-05', 'Exibir Dashboard com indicadores, gráficos e pontos de atenção.', 'Todos'],
    ['RF-06', 'Cadastrar, alterar, excluir e consultar fornecedores.', 'A, B'],
    ['RF-07', 'Preencher automaticamente os dados do fornecedor a partir do CNPJ (Receita Federal), mantendo os campos editáveis.', 'A, B'],
    ['RF-08', 'Cadastrar, alterar, excluir e consultar naturezas e centros de custo.', 'A, B'],
    ['RF-09', 'Impedir a exclusão de cadastros com títulos vinculados.', 'A, B'],
    ['RF-10', 'Incluir título com rateio entre até 4 centros de custo.', 'A, B'],
    ['RF-11', 'Alterar e excluir títulos em aberto.', 'A, B'],
    ['RF-12', 'Baixar título informando pagamento, juros, desconto, banco e cheque.', 'A, B'],
    ['RF-13', 'Reprogramar o vencimento de título em aberto.', 'A, B'],
    ['RF-14', 'Estornar baixa e excluir título baixado.', 'A'],
    ['RF-15', 'Pesquisar por texto livre e filtrar por critérios específicos em todas as tabelas.', 'Todos'],
    ['RF-16', 'Ordenar as colunas das tabelas.', 'Todos'],
    ['RF-17', 'Emitir relatórios (vencimentos, pagamentos, reprogramados, fichas e geral de baixas), imprimir e exportar.', 'Todos'],
    ['RF-18', 'Exportar os dados de cada tela em CSV.', 'Todos'],
    ['RF-19', 'Importar dados por CSV a partir de modelo disponibilizado para cada tela, com validação prévia.', 'A, B'],
    ['RF-20', 'Cadastrar e excluir usuários, definindo o nível de acesso.', 'A'],
    ['RF-21', 'Gerar backup do banco de dados.', 'A'],
    ['RF-22', 'Registrar toda modificação feita por qualquer usuário (auditoria) e permitir sua consulta.', 'A'],
    ['RF-23', 'Alternar entre tema claro e escuro.', 'Todos'],
    ['RF-24', 'Verificar e instalar atualizações do sistema.', 'A'],
    ['RF-25', 'Manter os dados ao desinstalar, reinstalar ou atualizar o programa.', 'Todos'],
  ], [1, 7.4, 1.6]);
  d.h2('Requisitos não funcionais');
  d.table(['ID', 'Requisito'], [
    ['RNF-01', 'Funcionar em Windows 64 bits, sem servidor, internet ou banco externo (a internet só é usada para consultar CNPJ e para atualizações).'],
    ['RNF-02', 'Guardar os dados localmente em arquivo SQLite, com backup automático diário.'],
    ['RNF-03', 'Proteger senhas com criptografia irreversível e bloquear tentativas repetidas de acesso.'],
    ['RNF-04', 'Registrar auditoria imutável das modificações, sem armazenar senhas.'],
    ['RNF-05', 'Interface responsiva, acessível (foco visível, não depender só de cor) e com tema escuro.'],
    ['RNF-06', 'Textos da interface e mensagens em português do Brasil; valores em R$ e datas dd/mm/aaaa.'],
    ['RNF-07', 'Instalação simples, sem exigir administrador, e atualização automática.'],
  ], [1.2, 8.8]);

  // ───────────────────────── 5
  d.h1('Acesso ao sistema');
  d.h2('Entrar');
  d.numbered(['Abra o CCP pelo atalho na área de trabalho ou no menu Iniciar.', 'Informe o **usuário** e a **senha** e clique em **Entrar**. O botão com o ícone de olho mostra ou oculta a senha digitada.', 'Se errar a senha 3 vezes, o acesso daquele usuário fica bloqueado por 5 minutos.']);
  d.h2('Primeiro acesso');
  d.p('Na primeira vez que o programa é aberto num computador, ele cria o usuário **ADMIN** e mostra uma **senha provisória** numa janela — anote-a. Todo usuário novo (ou com senha redefinida) também recebe uma senha provisória e, ao entrar, o sistema pede para **definir uma nova senha** (mínimo de 6 caracteres) antes de continuar.');
  d.h2('Meu perfil e foto');
  d.p('Clique no seu nome no rodapé do menu lateral para abrir **Meu perfil**. Escolha uma imagem (PNG, JPEG ou WebP): ela é recortada em quadrado automaticamente; confirme para salvar. Há também a opção **Remover foto**. A foto aparece no menu e na lista de usuários.');
  d.h2('Sair e sessão expirada');
  d.p('Use **Sair** no menu lateral. Se a sessão expirar (ou o programa for reiniciado), o sistema volta à tela de login com o aviso “Sua sessão expirou”.');
  d.h2('Tema claro e escuro');
  d.p('O botão **Tema escuro / Tema claro** (menu lateral e tela de login) alterna a aparência; a escolha fica guardada.');

  // ───────────────────────── 6
  d.h1('Navegação e padrão das telas');
  d.p('Todas as telas de tabela (Movimento, Fornecedores, Naturezas, Centros de custo, Usuários e Auditoria) funcionam da mesma forma:');
  d.table(['Elemento', 'Como funciona'], [
    ['Pesquisar', 'Digite qualquer parte do texto: o sistema encontra por todas as palavras, sem diferenciar maiúsculas e acentos. A tecla **/** leva o cursor à pesquisa.'],
    ['Filtros', 'Abre uma janela com filtros específicos da tela. O botão mostra quantos filtros estão ativos e, abaixo da barra, aparece um resumo. **Limpar filtros** volta ao padrão.'],
    ['Novo … (canto superior direito)', 'Abre o formulário de cadastro em uma janela (modal). Clique fora, em Cancelar ou Esc para fechar sem salvar.'],
    ['Importar CSV / Exportar CSV', 'Importa dados de uma planilha ou baixa os dados da tela (respeitando pesquisa e filtros no Movimento).'],
    ['Cabeçalhos das colunas', 'Clique para ordenar crescente/decrescente.'],
    ['Ações da linha', 'A ação principal fica visível; as demais ficam no menu “⋯”. Ações destrutivas (excluir, estornar) pedem confirmação.'],
    ['Contador de registros', 'Mostra quantas linhas aparecem e, no Movimento, o total em R$.'],
    ['Avisos', 'Mensagens de sucesso somem sozinhas; mensagens de erro permanecem até a próxima ação.'],
  ], [2.8, 7.2]);
  d.p('A pesquisa e os filtros de cada tela são lembrados enquanto você navega pelo menu.');
  d.p('O nível **Consulta** não vê os botões de Novo, Importar, Editar e Excluir.');

  // ───────────────────────── 7
  d.h1('Dashboard');
  d.p('Tela inicial para decisão gerencial. Mostra a posição na data de hoje e permite escolher o **período dos gráficos** (3, 6 ou 12 meses).');
  d.h2('Pontos de atenção');
  d.p('Lista de alertas calculados automaticamente (cada um com ícone e texto):');
  d.table(['Alerta', 'Quando aparece'], [
    ['Títulos vencidos', 'Existe título em aberto com vencimento anterior a hoje; mostra quantidade, valor e o percentual do total em aberto.'],
    ['Vencidos há mais de 90 dias', 'Há títulos com mais de 90 dias de atraso: priorizar negociação.'],
    ['Vence hoje', 'Há títulos vencendo hoje.'],
    ['Próximos 7 dias', 'Há títulos vencendo na semana: programar o caixa.'],
    ['Juros pagos no mês', 'Houve pagamento de juros neste mês (custo do atraso).'],
    ['Concentração em um fornecedor', 'Um fornecedor representa 30% ou mais do valor em aberto.'],
    ['Pico de vencimentos', 'Um mês concentra 40% ou mais do que vence no período.'],
  ], [3, 7]);
  d.h2('Indicadores (cartões)');
  d.table(['Cartão', 'Significado'], [
    ['Em aberto', 'Soma e quantidade de títulos ainda não pagos.'],
    ['Vencidos', 'Em aberto com vencimento anterior a hoje, e % do total em aberto.'],
    ['Vencem em 7 dias', 'Em aberto com vencimento de hoje até os próximos 7 dias.'],
    ['Pago no mês', 'Total pago (inclui juros) com data de pagamento neste mês, comparado ao mês anterior.'],
    ['Juros pagos no mês', 'Juros dos pagamentos do mês e descontos obtidos.'],
  ], [2.6, 7.4]);
  d.p('Os cartões são **clicáveis**: abrem o Movimento já filtrado (em aberto, vencidos, próximos 7 dias ou pagos).');
  d.h2('Gráficos e rankings');
  d.bullets(['**A vencer por mês:** valor dos títulos em aberto que vencem em cada mês a partir de hoje.', '**Pagamentos realizados por mês:** valor pago em cada mês.', '**Vencidos por faixa de atraso:** 1–30, 31–60, 61–90 e mais de 90 dias.', '**Maiores fornecedores em aberto**, **em aberto por natureza** e **por centro de custo** (usa o valor rateado).', '**Próximos vencimentos:** os 8 títulos em aberto mais urgentes (vencidos primeiro).']);

  // ───────────────────────── 8
  d.h1('Movimento (títulos)');
  d.p('Tela principal de trabalho. Lista os títulos com **Vencimento, Documento, Fornecedor, Histórico, Valor e Situação**.');
  d.h2('Situações do título');
  d.table(['Situação', 'Quando'], [
    ['Em aberto', 'Não pago e vencimento depois de hoje.'],
    ['Vence hoje', 'Não pago e vencimento igual a hoje.'],
    ['Vencido', 'Não pago e vencimento anterior a hoje.'],
    ['Pago', 'Possui baixa (mostra a data do pagamento).'],
  ], [2.4, 7.6]);
  d.h2('Pesquisa e filtros');
  d.p('A pesquisa procura em documento, histórico, fornecedor, natureza, nota fiscal, local e **valor** (ex.: “1.003,12”). O botão **Filtros** oferece: Situação (padrão *Em aberto*), Fornecedor, Natureza, Centro de custo, Nº do título, Valor exato e período de vencimento.');
  d.h2('Campos do título');
  d.table(['Campo', 'Obrigatório', 'Regra'], [
    ['Fornecedor', 'Sim', 'Deve estar cadastrado.'],
    ['Nº documento', 'Sim', 'Até 8 caracteres; gravado em maiúsculas.'],
    ['Vencimento', 'Sim', 'Data válida, a partir de 1990.'],
    ['Emissão', 'Não', 'Se vazia, assume o vencimento.'],
    ['Valor', 'Sim', 'Maior que zero.'],
    ['Histórico', 'Sim', 'Até 52 caracteres.'],
    ['Local/forma', 'Não', 'Até 20 caracteres (ex.: boleto, cartão).'],
    ['Nota fiscal', 'Não', 'Até 6 dígitos.'],
    ['Natureza', 'Sim', 'Deve estar cadastrada.'],
    ['Centro de custo 1 a 4 e valores', 'Pelo menos 1', 'Não repetir centro; a soma dos valores deve ser igual ao valor do título.'],
  ], [3, 1.6, 5.4]);
  d.h2('Incluir um título');
  d.numbered(['Clique em **Incluir título** (canto superior direito).', 'Preencha fornecedor, documento, vencimento, valor, histórico e natureza.', 'No **rateio**, escolha o Centro de custo 1. O valor é preenchido com o total; se houver mais de um centro, divida os valores. Um aviso ao vivo mostra “Rateado R$ x de R$ y — falta/excede …” ou “Rateio completo”.', 'Clique em **Confirmar**. Se algum dado estiver errado, a mensagem aparece na própria janela.']);
  d.h2('Alterar e excluir');
  d.bullets(['**Alterar:** menu “⋯” da linha → *Alterar*. Só títulos **em aberto** podem ser alterados.', '**Excluir:** menu “⋯” → *Excluir* (com confirmação). Título baixado só o administrador exclui.']);
  d.h2('Baixar (registrar o pagamento)');
  d.numbered(['Na linha do título, clique em **Baixar**.', 'Informe a data de pagamento, o **valor pago**, os **juros**, o **desconto**, o nº do cheque, o banco e o valor do cheque.', 'Regra: **valor pago − juros + desconto = valor do título**; e o valor do cheque não pode ser menor que o valor pago.', 'Confirme: o título passa a *Pago* e deixa de aparecer em “Em aberto”.']);
  d.h2('Reprogramar vencimento');
  d.p('Menu “⋯” → *Reprogramar vencimento*: informe a nova data (e, se quiser, o novo valor). O vencimento original é preservado; a linha mostra “reprog. dd/mm/aaaa”.');
  d.h2('Estornar baixa (administrador)');
  d.p('Menu “⋯” → *Estornar baixa* (com confirmação): remove os dados do pagamento e o título volta a *Em aberto*.');

  // ───────────────────────── 9
  d.h1('Cadastros');
  d.h2('Fornecedores');
  d.table(['Campo', 'Observação'], [
    ['CNPJ/CPF', 'Primeiro campo do formulário; recebe máscara automática. Para CNPJ, aciona a busca na Receita.'],
    ['Nome / Razão social', 'Obrigatório (até 52 caracteres).'],
    ['Pessoa (F/J)', 'Física ou Jurídica; deduzida do documento na importação.'],
    ['Insc. estadual, Endereço, Bairro, Cidade, UF, CEP, Fone, Fax, Contato 1 e 2', 'Opcionais.'],
  ], [4, 6]);
  d.h3('Busca automática do CNPJ');
  d.numbered(['Em **Novo fornecedor**, digite o CNPJ e saia do campo (Tab ou clique em outro campo).', 'O sistema consulta a Receita Federal e preenche nome, endereço, bairro, cidade, UF, CEP e telefone **apenas nos campos vazios**. Todos os campos continuam editáveis.', 'Se o CNPJ não for encontrado, for inválido, o limite de consultas for atingido ou não houver internet, um **aviso** aparece e você preenche manualmente. Se a situação cadastral não for “ATIVA”, o sistema avisa para conferir antes de salvar.']);
  d.p('Também é aceito CPF (11 dígitos), sem consulta automática, e o CNPJ alfanumérico.');
  d.h2('Naturezas de pagamento e centros de custo');
  d.p('Cadastros de uma coluna (descrição, até 25 caracteres). A coluna **Uso** mostra “Em uso” quando existem títulos vinculados; esses registros **não podem ser excluídos**. O filtro *Utilização* separa os em uso dos sem uso.');
  d.h2('Filtros dos cadastros');
  d.table(['Tela', 'Filtros'], [
    ['Fornecedores', 'Tipo de pessoa, UF, Cidade contém e Utilização.'],
    ['Naturezas e Centros de custo', 'Utilização (em uso / sem uso).'],
  ], [3, 7]);

  // ───────────────────────── 10
  d.h1('Relatórios');
  d.p('Escolha o relatório, o período (e o item, quando necessário), clique em **Gerar** e depois em **Imprimir** ou **Exportar CSV**.');
  d.table(['Relatório', 'O que mostra', 'Parâmetros'], [
    ['Vencimentos do período', 'Títulos em aberto com vencimento no período, em ordem de data, e o total.', 'De / Até'],
    ['Pagamentos do período', 'Títulos pagos no período, em ordem de pagamento, e o total.', 'De / Até'],
    ['Reprogramados do período', 'Títulos em aberto com nova data de vencimento no período (total pelo valor reprogramado).', 'De / Até'],
    ['Ficha do fornecedor', 'Histórico completo dos títulos de um fornecedor.', 'Fornecedor'],
    ['Ficha da natureza', 'Histórico dos títulos de uma natureza de pagamento.', 'Natureza'],
    ['Ficha do centro de custo', 'Histórico dos títulos que têm rateio no centro escolhido.', 'Centro de custo'],
    ['Geral de baixas', 'Todos os títulos pagos, com os dados do pagamento.', '—'],
  ], [2.6, 5.6, 1.8]);

  // ───────────────────────── 11
  d.h1('Importação por CSV');
  d.p('Disponível em **Movimento, Fornecedores, Naturezas e Centros de custo** (perfis A e B) pelo botão **Importar CSV**. Cada tela tem seu próprio **modelo** para baixar, preencher e importar.');
  d.h2('Passo a passo');
  d.numbered([
    'Clique em **Importar CSV** e em **Baixar modelo (CSV)**.',
    'Abra o modelo no Excel, **apague a linha de exemplo**, preencha seus dados e salve como CSV (pode ser “CSV UTF-8” ou o CSV comum do Excel).',
    'Selecione o arquivo na janela. O sistema **confere tudo sem gravar** e informa: linhas lidas, válidas e com erro; os erros linha a linha; e um exemplo do que será importado.',
    'Havendo erro, corrija a planilha e selecione novamente — **nada é importado enquanto existir erro**.',
    'Sem erros, clique em **Importar N registro(s)**. A importação é “tudo ou nada” e fica registrada na auditoria.',
  ]);
  d.h2('Formatos aceitos');
  d.bullets(['Datas: {{31/12/2026}} ou {{2026-12-31}}.', 'Valores: {{1.234,56}}, {{1234,56}}, {{1234.56}} ou {{R$ 1.234,56}}.', 'Textos são gravados em maiúsculas; fornecedor, natureza e centros podem ser informados por **código ou nome exato**.', 'Limite de 5.000 linhas por arquivo; linhas em branco são ignoradas.']);
  d.h2('Colunas de cada modelo (* obrigatória)');
  d.table(['Tela', 'Colunas'], [
    ['Fornecedores', 'CNPJ/CPF · **Nome*** · Pessoa (F/J) · Inscrição estadual · Endereço · Bairro · Cidade · UF · CEP · Telefone · Fax · Contato 1 · Contato 2'],
    ['Naturezas / Centros de custo', '**Descrição***'],
    ['Movimento (títulos)', '**Fornecedor*** (código, CNPJ ou nome) · **Documento*** · **Vencimento*** · Emissão · **Valor*** · **Histórico*** · **Natureza*** · Local · Nota fiscal · **Centro de custo 1*** · Valor centro 1 · Centro de custo 2 a 4 e valores · Data pagamento · Valor pago · Juros · Desconto · Banco · Nº cheque · Valor do cheque'],
  ], [2.4, 7.6]);
  d.h2('Regras específicas');
  d.bullets([
    '**Fornecedores:** CNPJ com dígitos inválidos ou documento já cadastrado/repetido no arquivo gera erro; a pessoa (F/J) é deduzida do documento se vier vazia.',
    '**Naturezas e centros:** descrição repetida (no sistema ou no arquivo) gera erro.',
    '**Títulos:** com um único centro de custo, o valor do rateio pode ficar vazio; com mais de um, a soma deve fechar o valor do título. Preencher **Data pagamento** importa o título já baixado (valor pago assume o valor do título; juros e desconto, zero). Título igual (mesmo fornecedor, documento, vencimento e valor) é recusado.',
  ]);
  d.h2('Mensagens de erro frequentes');
  d.table(['Mensagem', 'Como resolver'], [
    ['Coluna obrigatória ausente no arquivo: “Nome”', 'Use o modelo da tela; não renomeie nem apague colunas obrigatórias.'],
    ['Fornecedor “X” não encontrado(a) nos cadastros', 'Cadastre o fornecedor antes ou corrija o nome/código/CNPJ.'],
    ['CNPJ inválido', 'Confira os dígitos do CNPJ.'],
    ['… já cadastrado', 'O registro já existe; remova a linha do arquivo.'],
    ['A soma do rateio deve ser igual ao valor do título', 'Ajuste os valores dos centros de custo.'],
    ['Data/valor inválido(a)', 'Use dd/mm/aaaa e valores numéricos (ex.: 1.234,56).'],
  ], [4.4, 5.6]);

  // ───────────────────────── 12
  d.h1('Exportação em CSV');
  d.p('O botão **Exportar CSV** existe em Movimento, Fornecedores, Naturezas, Centros de custo e Auditoria, e na tela de Relatórios. No Movimento e na Auditoria a exportação respeita a **pesquisa e os filtros** em uso. Os arquivos abrem direto no Excel (separador “;”, vírgula decimal e datas dd/mm/aaaa).');

  // ───────────────────────── 13
  d.h1('Usuários (administrador)');
  d.h2('Cadastrar usuário');
  d.numbered(['Em **Usuários**, clique em **Novo usuário**.', 'Informe o usuário (até 10 caracteres), o **nível** (A, B ou C — a janela explica cada um) e uma **senha provisória** (mínimo 6).', 'O usuário será obrigado a trocar a senha no primeiro acesso.']);
  d.h2('Excluir usuário');
  d.p('Menu da linha → *Excluir*. Não é possível excluir o próprio usuário. O histórico de auditoria do usuário é mantido.');
  d.h2('Backup');
  d.p('O botão **Backup (SQLite)** baixa uma cópia completa do banco de dados. O sistema também faz uma cópia automática por dia em *Documentos\\CCP Backups* (guarda as 14 mais recentes).');
  d.h2('Filtros da tela');
  d.p('Pesquisa por usuário ou nível; filtros por Nível e por Foto de perfil (com/sem).');

  // ───────────────────────── 14
  d.h1('Auditoria (administrador)');
  d.p('Toda modificação feita por qualquer usuário gera um registro **imutável** com data/hora, usuário, ação, entidade e descrição. Senhas nunca são gravadas.');
  d.table(['Grupo', 'O que é registrado'], [
    ['Títulos', 'Criar, alterar, baixar, estornar, reprogramar e excluir.'],
    ['Cadastros', 'Fornecedores, naturezas e centros: criar, alterar e excluir.'],
    ['Usuários', 'Criar, excluir, trocar senha e alterar foto.'],
    ['Acesso', 'Entrada, saída, falha de login e bloqueio por tentativas.'],
    ['Sistema', 'Importações CSV, backups e verificação/instalação de atualizações.'],
  ], [2, 8]);
  d.p('Em **Auditoria** é possível pesquisar, filtrar por usuário, ação, entidade e período, ordenar, **exportar em CSV** e abrir **Detalhes** de um registro para ver, em tabela, o que mudou (**Antes → Depois**).');

  // ───────────────────────── 15
  d.h1('Instalação, dados e atualizações');
  d.bullets([
    '**Instalar:** execute o instalador {{CCP-Contas-a-Pagar-Setup-<versão>.exe}}; não exige administrador e cria atalhos na área de trabalho e no menu Iniciar.',
    '**Dados:** ficam no próprio computador e **são mantidos** ao desinstalar, reinstalar ou atualizar o programa. Há cópia automática diária em *Documentos\\CCP Backups*.',
    '**Atualizar:** o sistema procura versões novas sozinho. Quando baixa uma, pergunta “Reiniciar e instalar agora” ou “Depois”; escolhendo *Depois*, instala ao fechar o programa. Em *Sobre e atualizações* o administrador pode verificar manualmente.',
    '**Sobre:** o rodapé de todas as telas tem o link **Sobre e atualizações** (versão instalada e crédito do desenvolvedor).',
    '**Uma janela por vez:** o programa não abre duas janelas ao mesmo tempo; usar o atalho de novo leva à janela já aberta.',
  ]);

  // ───────────────────────── 16
  d.h1('Mensagens do sistema e como resolver');
  d.table(['Mensagem', 'Significado / ação'], [
    ['Usuário ou senha incorretos', 'Confira os dados. Após 3 erros o acesso é bloqueado por 5 minutos.'],
    ['Troque a senha provisória antes de continuar', 'Defina uma nova senha na tela exibida.'],
    ['Seu nível (Consulta) permite apenas visualizar', 'Peça a um administrador o nível adequado.'],
    ['Acesso restrito ao nível A', 'A função é só do administrador.'],
    ['A soma do rateio deve ser igual ao valor do título', 'Ajuste os valores dos centros de custo.'],
    ['Recebido − juros + desconto deve ser igual ao valor do título', 'Corrija valor pago, juros ou desconto na baixa.'],
    ['O título está baixado, não poderá ser alterado', 'Peça ao administrador para estornar a baixa, se necessário.'],
    ['Registro possui títulos vinculados e não pode ser excluído', 'Há títulos usando o cadastro; mantenha-o.'],
    ['CNPJ não encontrado na Receita Federal', 'Confira o CNPJ ou preencha manualmente.'],
    ['Limite de consultas da Receita atingido', 'Aguarde cerca de 1 minuto ou preencha manualmente.'],
    ['Sua sessão expirou', 'Entre novamente.'],
  ], [4.6, 5.4]);

  // ───────────────────────── 17
  d.h1('Regras de negócio consolidadas');
  d.table(['ID', 'Regra'], [
    ['RN-01', 'Um título exige fornecedor, documento (até 8), histórico (até 52), vencimento, valor > 0, natureza e ao menos um centro de custo.'],
    ['RN-02', 'Datas devem ser válidas e a partir de 1990; a emissão assume o vencimento se não informada.'],
    ['RN-03', 'O rateio usa de 1 a 4 centros distintos e a soma dos valores é igual ao valor do título.'],
    ['RN-04', 'Baixa: valor pago − juros + desconto = valor do título; valor do cheque ≥ valor pago.'],
    ['RN-05', 'Título baixado não pode ser alterado nem reprogramado, e não pode ser baixado de novo.'],
    ['RN-06', 'Somente o administrador estorna baixa e exclui título baixado.'],
    ['RN-07', 'Cadastros com títulos vinculados não podem ser excluídos.'],
    ['RN-08', 'Textos de cadastro e título são gravados em maiúsculas.'],
    ['RN-09', 'A situação do título é calculada pela data de hoje: em aberto, vence hoje, vencido ou pago.'],
    ['RN-10', 'Usuários novos têm senha provisória e devem trocá-la no primeiro acesso; 3 senhas erradas bloqueiam por 5 minutos.'],
    ['RN-11', 'O nível Consulta não altera dados; o Operador não faz estorno nem administra usuários.'],
    ['RN-12', 'Toda modificação é auditada; o registro de auditoria não pode ser alterado nem excluído.'],
    ['RN-13', 'Importação CSV: validar antes de gravar, relatar erros por linha e gravar tudo ou nada; recusar duplicidades.'],
    ['RN-14', 'CNPJ informado deve ter dígitos verificadores válidos; a busca na Receita só preenche campos vazios.'],
  ], [1.2, 8.8]);

  // ───────────────────────── 18
  d.h1('Casos de uso');
  const uc = (id, nome, ator, pre, fluxo, alt) => {
    d.h2(`${id} — ${nome}`);
    d.table(['', ''], [['Ator', ator], ['Pré-condição', pre], ['Fluxo principal', fluxo.map((f, i) => `${i + 1}. ${f}`)], ['Fluxos alternativos', alt]], [2, 8]);
  };
  uc('UC-01', 'Entrar no sistema', 'Qualquer usuário', 'Usuário cadastrado.',
    ['Abrir o programa.', 'Informar usuário e senha.', 'Se for senha provisória, definir nova senha.', 'O sistema abre o Dashboard.'],
    ['Senha incorreta: mensagem de erro; após 3 tentativas, bloqueio de 5 minutos.']);
  uc('UC-02', 'Cadastrar fornecedor com CNPJ', 'Administrador ou Operador', 'Estar logado.',
    ['Abrir Fornecedores → Novo fornecedor.', 'Digitar o CNPJ e sair do campo.', 'O sistema preenche os dados da Receita.', 'Conferir/ajustar e clicar em Confirmar.'],
    ['CNPJ inválido/não encontrado/limite/sem internet: aviso e preenchimento manual.', 'Fornecedor já existente: usar Editar.']);
  uc('UC-03', 'Incluir título com rateio', 'Administrador ou Operador', 'Fornecedor, natureza e centro de custo cadastrados.',
    ['Abrir Movimento → Incluir título.', 'Informar fornecedor, documento, vencimento, valor, histórico e natureza.', 'Escolher os centros de custo e dividir o valor.', 'Confirmar; o título aparece como Em aberto.'],
    ['Rateio diferente do valor: o aviso ao vivo mostra quanto falta ou excede e o sistema recusa.']);
  uc('UC-04', 'Baixar título', 'Administrador ou Operador', 'Título em aberto.',
    ['Na linha do título, clicar em Baixar.', 'Informar data, valor pago, juros, desconto e dados do cheque.', 'Confirmar; o título passa a Pago.'],
    ['Valores que não fecham: mensagem de erro e nada é gravado.', 'Lançamento errado: o administrador estorna a baixa.']);
  uc('UC-05', 'Reprogramar vencimento', 'Administrador ou Operador', 'Título em aberto.',
    ['Menu “⋯” → Reprogramar vencimento.', 'Informar nova data (e valor, se desejado).', 'Confirmar; a linha mostra a data reprogramada.'],
    ['Título já baixado: não é possível reprogramar.']);
  uc('UC-06', 'Importar títulos por CSV', 'Administrador ou Operador', 'Cadastros de fornecedor, natureza e centros existentes.',
    ['Movimento → Importar CSV → Baixar modelo.', 'Preencher a planilha e selecionar o arquivo.', 'Conferir o resultado da validação.', 'Clicar em Importar N registro(s).'],
    ['Há erros: corrigir a planilha e selecionar de novo; nada é importado.']);
  uc('UC-07', 'Acompanhar pelo Dashboard', 'Qualquer usuário', 'Estar logado.',
    ['Abrir o Dashboard e escolher o período.', 'Ler os pontos de atenção e os indicadores.', 'Clicar em um cartão (ex.: Vencidos) para abrir o Movimento já filtrado.'],
    ['Sem títulos em aberto: o painel informa que não há pontos críticos.']);
  uc('UC-08', 'Auditar uma alteração', 'Administrador', 'Estar logado como nível A.',
    ['Abrir Auditoria.', 'Pesquisar ou filtrar por usuário, ação, entidade ou período.', 'Clicar em Detalhes no registro desejado.', 'Conferir o Antes → Depois e, se preciso, exportar em CSV.'],
    ['Usuário sem nível A: a tela não está disponível.']);

  // ───────────────────────── 19
  d.h1('Glossário');
  d.table(['Termo', 'Significado'], [
    ['Título', 'Conta a pagar: documento com fornecedor, valor e vencimento.'],
    ['Baixa', 'Registro do pagamento de um título.'],
    ['Estorno', 'Desfazer a baixa; o título volta para “Em aberto”.'],
    ['Reprogramação', 'Nova data de vencimento para um título em aberto.'],
    ['Rateio', 'Divisão do valor do título entre até 4 centros de custo.'],
    ['Natureza', 'Classificação do pagamento (ex.: carteira, boleto, cheque).'],
    ['Centro de custo', 'Destino do gasto (ex.: obra, setor).'],
    ['Faixa de atraso', 'Agrupamento dos vencidos por dias de atraso.'],
    ['Auditoria', 'Registro de quem fez cada alteração e quando.'],
    ['CSV', 'Planilha em texto, aberta pelo Excel, usada para importar e exportar.'],
    ['Modal', 'Janela que abre sobre a tela (formulários e filtros).'],
  ], [2.4, 7.6]);

  // ───────────────────────── Apêndice
  d.h1('Apêndice — Exemplo de planilha para importar títulos');
  d.p('Cabeçalho e uma linha de exemplo (separador “;”):');
  d.code('Fornecedor;Documento;Vencimento;Emissão;Valor;Histórico;Natureza;Local;Nota fiscal;Centro de custo 1;Valor centro 1\nACME MATERIAIS LTDA;NF1234;31/12/2026;01/12/2026;1.234,56;COMPRA DE MATERIAL;BOLETO;BOLETO;1234;OBRA CENTRO;');
  d.p('Para o mesmo título dividido em dois centros de custo, preencha também as colunas “Centro de custo 2” e “Valor centro 2” e informe o valor de cada centro (a soma deve fechar o valor do título).');

  return d.save(file);
}

module.exports = { buildFuncional };
