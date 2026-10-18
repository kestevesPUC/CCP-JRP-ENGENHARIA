'use strict';
// Configuração de empacotamento (electron-builder). Veja docs/publicacao.md.
//
// Canal de atualização: crie release.config.json (modelo em release.config.example.json). Sem esse arquivo o
// instalador é gerado normalmente, porém sem atualização automática.
const fs = require('node:fs');
const path = require('node:path');

const releaseFile = path.join(__dirname, 'release.config.json');
const publish = fs.existsSync(releaseFile) ? [JSON.parse(fs.readFileSync(releaseFile, 'utf8'))] : undefined;

module.exports = {
  appId: 'br.com.jrpengenharia.ccp',
  productName: 'CCP Contas a Pagar',
  copyright: 'Desenvolvido por Kaio Gomes',
  // Lista PERMITIDA (nada além disto entra no instalador): evita empacotar .env (token), pastas de build, dados e documentos.
  // As dependências de produção (node_modules) são incluídas automaticamente pelo electron-builder.
  files: ['electron-main.js', 'package.json', 'public/**/*', 'src/**/*'],
  directories: { output: 'dist' },
  ...(publish && { publish }),
  win: {
    target: ['nsis', 'portable'],
    icon: 'build/icon.png',
  },
  nsis: {
    // Instalação por usuário (sem pedir administrador), com atalhos; desinstalar NÃO apaga os dados (AppData\ccp-node).
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'CCP Contas a Pagar',
    deleteAppDataOnUninstall: false,
    artifactName: 'CCP-Contas-a-Pagar-Setup-${version}.${ext}',
    language: '1046', // português (Brasil)
  },
  portable: {
    artifactName: 'CCP-Contas-a-Pagar-Portatil-${version}.${ext}',
  },
};
