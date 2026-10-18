import { api } from './api.js';
import { esc } from './format.js';
import { icon } from './icons.js';
import { restoreTheme, themeButton, wireThemeButtons } from './theme.js';
import { state, loadLists } from './state.js';
import { notify, fail } from './ui.js';
import { nivelNome } from './niveis.js';
import { avatarHtml } from './avatar.js';
import { openProfile } from './perfil.js';
import { viewDashboard } from './views/dashboard.js';
import { viewAuditoria } from './views/auditoria.js';
import { openAbout } from './views/sobre.js';
import { initPasswordToggles } from './components/passwordToggle.js';
import { viewTitulos } from './views/titulos.js';
import { viewCadastro } from './views/cadastro.js';
import { viewRelatorios } from './views/relatorios.js';
import { viewUsuarios } from './views/usuarios.js';

const root = document.getElementById('app');

// Crédito do desenvolvedor, exibido no rodapé do app e na tela de login.
const CREDIT = '<p class="credit">Desenvolvido por <a href="https://kaio-gomes-site.vercel.app" target="_blank" rel="noopener noreferrer"><b>Kaio Gomes</b></a></p>';

// [id, rótulo, ícone, subtítulo, tela, somente nível A?]
const SECTIONS = [
  ['dashboard', 'Dashboard', 'home', 'Indicadores e gráficos para decidir', viewDashboard],
  ['titulos', 'Movimento', 'file', 'Incluir, baixar e reprogramar títulos', viewTitulos],
  ['fornecedores', 'Fornecedores', 'truck', 'Cadastro de fornecedores', () => viewCadastro('fornecedores')],
  ['naturezas', 'Naturezas', 'tag', 'Naturezas de pagamento', () => viewCadastro('naturezas')],
  ['centros', 'Centros de custo', 'layers', 'Centros de custo para rateio', () => viewCadastro('centros')],
  ['relatorios', 'Relatórios', 'chart', 'Consultas, impressão e exportação CSV', viewRelatorios],
  ['usuarios', 'Usuários', 'users', 'Acesso e backup', viewUsuarios, true],
  ['auditoria', 'Auditoria', 'shield', 'Quem fez o quê e quando', viewAuditoria, true],
];
let current = 'dashboard';

function authShell(title, subtitle, body) {
  root.innerHTML = `<div class="auth"><section class="hero"><div class="brand-logo" role="img" aria-label="JRP Engenharia"></div>
    <h1>Controle de Contas a Pagar</h1><p>Títulos, vencimentos, baixas e rateio por centro de custo em um só lugar.</p>${CREDIT}</section>
    <section class="panel"><form id="f"><h2>${title}</h2><p>${subtitle}</p>${body}</form></section></div>${themeButton('btn alt sm theme-fab')}`;
  wireThemeButtons();
}

function renderLogin(error = '') {
  authShell('Bem-vindo de volta', 'Acesse o controle de contas a pagar.', `<div id="msg"></div>
    <label>Usuário<input name="usuario" autocomplete="username" required autofocus></label>
    <label>Senha<input name="senha" type="password" autocomplete="current-password" required></label>
    <button class="btn">Entrar</button>`);
  if (error) notify(error, 'err');
  document.getElementById('f').onsubmit = async (event) => {
    event.preventDefault();
    try {
      state.me = await api('POST', '/api/login', Object.fromEntries(new FormData(event.target)));
      start();
    } catch (e) { fail(e); }
  };
}

function renderChangePassword() {
  authShell('Defina uma nova senha', 'A senha provisória precisa ser trocada antes de continuar.', `<div id="msg"></div>
    <label>Senha atual<input name="atual" type="password" autocomplete="current-password" required autofocus></label>
    <label>Nova senha (mín. 6 caracteres)<input name="nova" type="password" minlength="6" autocomplete="new-password" required></label>
    <button class="btn">Salvar senha</button>`);
  document.getElementById('f').onsubmit = async (event) => {
    event.preventDefault();
    try {
      await api('POST', '/api/me/senha', Object.fromEntries(new FormData(event.target)));
      state.me.mustChange = false;
      start();
    } catch (e) { fail(e); }
  };
}

async function start() {
  const { me } = state;
  if (me.mustChange) return renderChangePassword();
  await loadLists();
  const visible = SECTIONS.filter(([, , , , , adminOnly]) => !adminOnly || me.nivel === 'A');
  root.innerHTML = `<div class="shell"><aside class="side"><div class="brand-wrap"><div class="brand-logo" role="img" aria-label="JRP Engenharia"></div><small>Contas a Pagar</small></div>
    <nav aria-label="Principal">${visible.map(([id, label, ic]) => `<button data-t="${id}">${icon(ic)}<span>${label}</span></button>`).join('')}</nav>
    <div class="foot"><button type="button" class="who" id="profile" title="Meu perfil" aria-label="Meu perfil">${whoHtml(me)}</button>
    ${themeButton()}<button id="out">${icon('out')}<span>Sair</span></button></div></aside>
    <main class="content"><div class="page-head"><div><h1 id="ptitle"></h1><p id="psub"></p></div></div><div id="msg"></div><div id="view"></div><footer class="app-footer noprint">${CREDIT}<button type="button" class="link-btn" id="about">Sobre e atualizações</button></footer></main></div>`;
  document.querySelectorAll('.side nav button').forEach((b) => { b.onclick = () => show(b.dataset.t); });
  document.getElementById('out').onclick = async () => {
    await api('POST', '/api/logout');
    state.me = null;
    renderLogin();
  };
  wireThemeButtons();
  document.getElementById('profile').onclick = openProfile;
  document.getElementById('about').onclick = () => openAbout().catch(fail);
  show(current);
  return undefined;
}

const whoHtml = (me) => `${avatarHtml(me)}<span>${esc(me.usuario)} · ${nivelNome(me.nivel)}</span>`;

// Atualiza o bloco do usuário no menu quando a foto muda.
window.addEventListener('ccp:me-updated', () => {
  const who = document.getElementById('profile');
  if (who) who.innerHTML = whoHtml(state.me);
});

function show(id) {
  current = id;
  const section = SECTIONS.find(([key]) => key === id);
  document.querySelectorAll('.side nav button').forEach((b) => {
    b.classList.toggle('on', b.dataset.t === id);
    b.toggleAttribute('aria-current', b.dataset.t === id);
  });
  document.getElementById('ptitle').textContent = section[1];
  document.getElementById('psub').textContent = section[3];
  notify('');
  section[4]().catch(fail);
}

// Sessão expirada (401 em qualquer chamada): volta ao login com aviso.
window.addEventListener('ccp:session-expired', () => {
  if (!state.me) return;
  state.me = null;
  renderLogin('Sua sessão expirou. Entre novamente.');
});

// Atalho: a tecla "/" foca a pesquisa da tela atual.
document.addEventListener('keydown', (event) => {
  const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  const search = document.querySelector('[data-grid="search"]');
  if (event.key === '/' && !typing && search && !document.querySelector('dialog[open]')) {
    event.preventDefault();
    search.focus();
  }
});

// Navegação pedida por outras telas (ex.: cartões do Resumo).
window.addEventListener('ccp:navigate', (event) => show(event.detail.section));

restoreTheme();
initPasswordToggles();
api('GET', '/api/me').then((me) => { state.me = me; start(); }).catch(() => renderLogin());
