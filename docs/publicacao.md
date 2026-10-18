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
  com acesso a este repositório e permissão **Contents: Read and write**, e o defina antes de rodar o release:
  `setx GH_TOKEN "github_pat_..."` (abra um novo terminal) ou, só na sessão atual, `$env:GH_TOKEN = "github_pat_..."` no PowerShell. **Nunca** coloque o token em arquivos do projeto.
- **Para os computadores se atualizarem** o repositório precisa ser **público** (ou use um segundo repositório público só para os binários, apontando `owner`/`repo` para ele).
  Com repositório privado, cada computador precisaria de um token embutido — não recomendado. O código-fonte versionado não contém dados da empresa (`data/` e `*.sqlite` ficam fora do Git).

**Servidor próprio / site estático**
```json
{ "provider": "generic", "url": "https://seu-site.com/ccp-atualizacoes/" }
```
Depois de cada build, envie para essa pasta o instalador `…Setup-<versão>.exe`, o `.blockmap` e o **`latest.yml`**.

Sem `release.config.json` o app é gerado normalmente, porém sem atualização automática (a tela “Sobre” informa “indisponível”).

## Publicar uma nova versão

```bash
npm test                      # tudo verde?
npm run versao:patch          # 2.1.0 -> 2.1.1  (ou versao:minor para 2.2.0)
npm run release               # GitHub: gera e publica a release (precisa GH_TOKEN)
# ou, com servidor próprio:
npm run dist                  # e envie dist/latest.yml + Setup + blockmap para a URL configurada
```

A **versão do `package.json` precisa ser maior** que a instalada, senão ninguém recebe a atualização.

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
