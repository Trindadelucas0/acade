# ORNY/AVAGYM — Auditoria de UX/UI

Data: 20/10/2026  
Checkout auditado: `F:\academia\acade\app`  
Base: commit `51176ffe` (frontend 1.9.1 antes deste lote)

## Método e limites

A auditoria cruzou a documentação oficial, as rotas React, a navegação por perfil, os componentes compartilhados e os testes existentes. O código atual é a fonte para comportamento implementado; documentos históricos são apenas apoio. A landing foi conferida por Playwright em 375, 800 e 1280 px, com inspeção das capturas mobile e desktop.

Perfis mapeados: visitante, aluno, aluno vinculado a profissional, profissional e administrador. Não houve acesso a contas reais ou dados de produção. A API e o PostgreSQL locais foram acessados somente para teste; o catálogo local vazio impediu criar uma sessão guiada. Cobrança real, publicação externa e aparelho físico não fazem parte desta validação.

## Inventário das experiências

| Público | Entrada e navegação principal | Superfícies condicionais |
| --- | --- | --- |
| Visitante | Landing, login, cadastro, preços e documentos legais | Recuperação de senha, convite e checkout hospedado |
| Aluno | Início, Treinos, Comunidade, Progresso e Perfil | Onboarding, recomendações, programa, execução, conclusão, #TáPago, acompanhamento, grupos, desafios, ranking e assinatura |
| Aluno acompanhado | Mesma navegação do aluno | Ficha profissional prioritária, conversas, ocorrências e bloqueio de programas conforme cobertura |
| Profissional | Painel, Alunos, Treinos, Atendimentos e Mais | Convites, ficha, biblioteca, programas, comunidade, assinatura e verificação |
| Administrador | Painel administrativo | Usuários, profissionais, monetização, catálogo, programas, comunidade, mídia, auditoria e configurações |

As rotas históricas `/home`, `/plan`, `/plan/r/:id`, `/workout`, `/stats` e `/history` continuam como compatibilidade ou consulta. Elas não definem a navegação oficial.

## Achados priorizados

| Prioridade | Superfície | Evidência | Impacto | Tratamento |
| --- | --- | --- | --- | --- |
| P1 | Início | O bloco “Minha semana” aparecia antes do treino e do CTA principal | A pergunta “qual treino faço hoje?” não era respondida primeiro | Corrigido: treino/retomada/escolha vem antes das métricas |
| P1 | Execução | Carga e repetições eram mostradas como texto e só mudavam por `+`/`−` | Muitas interações para cargas altas e pouca flexibilidade na academia | Corrigido: edição numérica direta preservada localmente, mantendo incrementos |
| P1 | Execução | Não existia ação explícita para repetir os valores da série concluída | Repetição manual em exercícios estáveis | Corrigido: “Repetir valores da série anterior” |
| P2 | Progresso | O gráfico de oito semanas era desenhado mesmo com zero ou um treino | Aparência de comparação sem base suficiente | Corrigido: estado de dados insuficientes e próximo passo |
| P2 | Sistema visual | Tokens existentes misturavam nomes de marca, legado e semântica | Dificulta consistência entre claro/escuro e componentes novos | Corrigido: aliases semânticos documentados, sem trocar a identidade |
| P2 | Performance | Bundle principal superava 2 MB; divisão por rota reduziu o inicial para 519 KB. Body3D permanece próximo de 950 KB, isolado sob demanda | Primeiro carregamento foi reduzido; a visualização 3D ainda exige descarga grande | Parcialmente resolvido: medir Lighthouse e avaliar Body3D/pacotes de idioma em lote próprio |
| P2 | Validação | Jornadas autenticadas dependem de contas e dados adequados | Não é possível afirmar auditoria visual integral sem essas condições | Registrado no checklist; não tratado como aprovado |
| P3 | Compatibilidade | Telas guiadas e consultas históricas coexistem | Pode gerar linguagem e densidade diferentes | Preservado; remoção exige decisão posterior e telemetria |

## Funcionalidades preservadas

- Prioridade da sessão aberta, ficha profissional e programa do sistema.
- Regras server-side de acesso, assinatura, suspensão e permissões.
- Salvamento local durante o treino, fila offline e sincronização posterior.
- Alertas de dor/desconforto e comunicação com o profissional.
- Confirmação explícita antes de publicar #TáPago na Comunidade.
- Rotas públicas, rotas por perfil e URLs históricas.

## Evidências técnicas

- Rotas e gates: `frontend/src/App.jsx`.
- Navegação: `frontend/src/lib/navigation.js` e `frontend/src/views/guided/TabBar.jsx`.
- Fluxos principais: `Today.jsx`, `Treinos.jsx`, `Train.jsx`, `Done.jsx`, `Progress.jsx` e `ShareCard.jsx`.
- Design e temas: `frontend/src/views/guided/guided.css` e `frontend/src/styles/orny.css`.
- Fonte oficial: `DOCUMENTACAO-SISTEMA.md`.

