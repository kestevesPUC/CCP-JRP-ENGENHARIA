# Interface

SPA em JavaScript puro (ES modules), sem bundler: `public/index.html` carrega `public/js/main.js`.
Estilo em `public/style.css` com **tokens** de cor (`:root`) para os temas **claro e escuro**
(automático pelo sistema, com alternância manual guardada no navegador).

## Telas

| Tela | Arquivo | Observações |
| --- | --- | --- |
| Dashboard | `views/dashboard.js` | KPIs clicáveis (abrem o Movimento já filtrado), gráficos, pontos de atenção, período 3/6/12 meses |
| Movimento | `views/titulos.js` | grid + modais de título, baixa e reprogramação |
| Fornecedores, Naturezas, Centros | `views/cadastro.js` | uma tela configurável por recurso |
| Relatórios | `views/relatorios.js` | gerar, imprimir e exportar CSV |
| Usuários (A) | `views/usuarios.js` | grid + modal de novo usuário; botão de backup |
| Auditoria (A) | `views/auditoria.js` | grid + detalhes “antes → depois” |
| Sobre e atualizações | `views/sobre.js` | versão, crédito e atualização (A) |
| Meu perfil | `perfil.js` | foto (recorte quadrado 256 px no navegador) |

## Padrão de grid (todas as tabelas)

`components/grid.js` — barra de ferramentas + só a tabela:

```
[ 🔍 Pesquisar… ] [ Filtros ② ]                    [ Exportar CSV ] [ Importar CSV ] [ + Novo … ]
 N registros · resumo dos filtros ativos
 ┌ colunas ordenáveis ───────────────────────────────────────────────────────────┬─ ações ┐
```

- **Pesquisa** por termos (sem acentos/maiúsculas). Nos cadastros é feita no navegador; no Movimento e na Auditoria vai ao servidor (`q`), com atraso de 300 ms.
  A tecla `/` foca a pesquisa.
- **Filtros** abrem um modal (`components/filterDialog.js`) com os filtros específicos da tela; o botão mostra quantos estão ativos e o resumo aparece sob a barra.
  “Limpar filtros” volta ao padrão. Pesquisa e filtros são lembrados ao navegar entre telas.
- **Novo item** (canto superior direito) abre o formulário em **modal**; editar também usa o modal.
- **Importar CSV** abre `components/importDialog.js` (modelo → arquivo → conferência → importar).
- **Ações da linha:** a principal fica visível; as demais vão para o menu “⋯”. Excluir/estornar pedem confirmação em diálogo próprio (`confirmDialog`).
- Cabeçalhos clicáveis ordenam; **Consulta** não vê botões de edição.

## Componentes e utilitários

| Módulo | Função |
| --- | --- |
| `ui.js` | `notify` (avisos que somem em 5 s), `openDialog` (modal; fecha ao clicar fora/Esc), `confirmDialog` |
| `components/charts.js` | `columnChart` (colunas em SVG) e `barList` (barras horizontais); cores por token, dica em cada barra e descrição textual |
| `api.js` | `fetch` com erros em português; **401** dispara `ccp:session-expired` (volta ao login) |
| `state.js` | usuário logado e listas de cadastros |
| `niveis.js` | nomes/descrições dos níveis e `podeEditar` |
| `cnpj.js` | máscara de CNPJ/CPF e consulta ao sair do campo |
| `theme.js` | tema claro/escuro |

## Acessibilidade e UX

Foco visível, alvos de toque ≥ 40 px, estados nunca só por cor (ícone + texto), `aria-live` em avisos, respeito a `prefers-reduced-motion`,
layout responsivo (menu vira barra no topo em telas estreitas) e impressão sem menus.
