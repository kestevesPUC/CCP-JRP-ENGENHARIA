# Publicação, instalação e atualizações

## Instalador

`npm run dist` (em `ccp-node/`, com o programa fechado) gera em `dist/`:

| Arquivo | Uso |
| --- | --- |
| `CCP-Contas-a-Pagar-Setup-<versão>.exe` | **instalador** (por usuário, sem administrador; atalhos na área de trabalho e no menu Iniciar; permite escolher a pasta) |
| `CCP-Contas-a-Pagar-Portatil-<versão>.exe` | versão portátil (não atualiza sozinha) |
| `latest.yml` e `*.blockmap` | metadados de atualização (só existem com canal configurado) |

## Onde ficam os dados (e por que sobrevivem)

- Banco: `%APPDATA%\ccp-node\ccp.sqlite`, fora da pasta do programa. O instalador está configurado com `deleteAppDataOnUninstall: false`,
  então **desinstalar e reinstalar mantém os dados**; atualizar também.
- A pasta é fixada no código (`electron-main.js`); **não a altere**, ou o programa passaria a abrir um banco vazio em outro local.
- Cópia automática diária: `Documentos\CCP Backups\ccp-AAAA-MM-DD.sqlite` (14 mais recentes).
- Migrações de esquema rodam sozinhas ao abrir uma versão nova.

## Canal de atualização (uma vez)

O desenvolvedor escolhe onde as versões ficam publicadas. Copie `release.config.example.json` para **`release.config.json`** e mantenha UM bloco:

**GitHub Releases** (configurado neste projeto: `kestevesPUC/CCP-JRP-ENGENHARIA`)
```json
{ "provider": "github", "owner": "kestevesPUC", "repo": "CCP-JRP-ENGENHARIA", "private": false, "releaseType": "release" }
```
- `releaseType: "release"` publica a versão direto (sem ficar como *rascunho*, que os aplicativos não enxergam).
- **Para publicar** (só no computador do desenvolvedor): crie um token em GitHub → *Settings → Developer settings → Personal access tokens → Fine-grained*,
  com acesso a este repositório e permissão **Contents: Read and write**. Na pasta do projeto crie o arquivo **`.env`** (já ignorado pelo Git; modelo em `.env.example`) com a linha
  `GH_TOKEN=github_pat_...`. Alternativa: `$env:GH_TOKEN = "github_pat_..."` no PowerShell. **Nunca** coloque o token em arquivos versionados.
  O comando `npm run publicar` confere o token e o acesso ao repositório **antes** de mexer em qualquer coisa e explica o que falta.
- **Para os computadores se atualizarem** o repositório precisa ser **público** (ou use um segundo repositório público só para os binários, apontando `owner`/`repo` para ele).
  Com repositório privado, cada computador precisaria de um token embutido — não recomendado. O código-fonte versionado não contém dados da empresa (`data/` e `*.sqlite` ficam fora do Git).

**Servidor próprio / site estático**
```json
{ "provider": "generic", "url": "https://seu-site.com/ccp-atualizacoes/" }
```
Depois de cada build, envie para essa pasta o instalador `…Setup-<versão>.exe`, o `.blockmap` e o **`latest.yml`**.

Sem `release.config.json` o app é gerado normalmente, porém sem atualização automática (a tela “Sobre” informa “indisponível”).

## Publicar uma nova versão

**Roteiro de sempre** (com `GH_TOKEN` definido, veja acima):

```bash
git add -A && git commit -m "descreva a mudança"   # guarde o código
npm run publicar                                   # testa, sobe a versão (patch) e publica a release no GitHub
git push                                           # envia o código e a nova versão do package.json
```

`npm run publicar` (script `scripts/release.js`) = confere token/repositório → `npm test` → sobe a versão (2.1.0 → 2.1.1) → compila e cria a release `v2.1.1` no GitHub, anexando
`Setup.exe`, `.blockmap` e `latest.yml`). Para uma mudança maior use `npm run publicar:minor` (2.1.0 → 2.2.0). Se a publicação falhar depois de subir a versão, o script **restaura** o número anterior.

Só compilar, sem publicar: `npm run dist` (com o programa fechado). Com servidor próprio (provider `generic`): rode `npm run dist` e envie `dist/latest.yml` + `Setup` + `.blockmap` para a URL.

### Atualizar sem o usuário reinstalar

É o fluxo normal: os programas instalados **baixam a versão nova sozinhos** (veja abaixo). Regras:

- **A versão do `package.json` precisa ser MAIOR** que a instalada. Corrigiu algo? Publique 2.1.1, nunca reaproveite 2.1.0: quem já tem 2.1.0 não enxerga uma release com o mesmo número.
- A primeira versão com o canal configurado precisa ser instalada **manualmente uma vez** em cada computador (a 2.1.0 deste projeto já foi gerada assim). Dali em diante, tudo é automático.
- Se uma release saiu com problema: publique uma versão corrigida (2.1.2). Para retirar a ruim, apague a release no GitHub (*Releases → ⋯ → Delete*) — quem já atualizou fica com ela até receber a próxima.
- Os dados e as migrações do banco não exigem reinstalação: o banco é atualizado na primeira abertura da versão nova.

## O que acontece nos computadores

1. O app instalado verifica atualizações ~15 s após abrir e a cada 6 h (e em **Sobre e atualizações → Verificar atualização**, nível A).
2. Se houver versão nova, ela é **baixada em segundo plano**; ao terminar, aparece um aviso: *Reiniciar e instalar agora* ou *Depois*.
3. Se escolher *Depois*, a atualização é instalada **automaticamente ao fechar** o programa. Os dados são preservados e as migrações do banco rodam na abertura.
4. As verificações e instalações ficam na auditoria.

## Cuidados

- Teste cada versão instalando por cima da anterior antes de publicar (os dados devem continuar lá).
- O executável não é assinado digitalmente: o Windows SmartScreen pode avisar na primeira instalação (“Mais informações → Executar assim mesmo”).
  Para eliminar o aviso é necessário um certificado de assinatura de código (configure `win.certificateFile`/`CSC_LINK` no `electron-builder.config.js`).
- Nunca edite uma migração já publicada; acrescente uma nova (veja [banco-de-dados.md](banco-de-dados.md)).
