# Mapa real de funções da ORNY para publicidade

Este documento delimita o que pode e o que não pode ser prometido nos anúncios. Foi levantado a partir da documentação oficial e do código atual do sistema.

## Para alunos

| Função comprovada | Como pode aparecer na publicidade | Evidência no sistema |
|---|---|---|
| Treino do dia e próximo treino | “Veja o treino do dia” e “Saiba qual é o próximo treino” | `frontend/src/views/guided/Today.jsx`, `HomeWidgets.jsx` e `GET /api/guided/home` |
| Treino guiado | “Siga seu treino pelo celular” | `frontend/src/views/guided/Train.jsx` |
| Registro de cargas, repetições e séries | “Registre séries, cargas e repetições” | `Train.jsx`, com confirmação de pesos antes do início |
| Cronômetro de treino, série e descanso | “Cronometre as séries” | fluxo de treino em `Train.jsx` |
| Histórico e progresso | “Consulte seu histórico e acompanhe seus registros” | `Progress.jsx`, `Estatisticas.jsx` e `GET /api/guided/stats` |
| Estatísticas | “Visualize frequência, volume, tempo, cargas e recordes registrados” | `Estatisticas.jsx` e regras oficiais da documentação |
| Programas guiados | “Explore programas por objetivo, nível e local” | `Programs.jsx` e catálogo oficial |
| Recomendação com confirmação | “Receba uma recomendação baseada no seu perfil e confirme antes de ativar” | `POST /api/guided/start-recommended` |
| Ficha do personal | “Receba e execute a ficha criada pelo seu personal” | prioridade da ficha profissional no treino ativo |
| Comunidade, desafios e mensagens | Pode ser citado apenas conforme o plano/acesso do aluno | navegação e bloqueios de recursos do servidor |

## Para personal trainers

| Função comprovada | Como pode aparecer na publicidade | Evidência no sistema |
|---|---|---|
| Lista de alunos vinculados | “Organize seus alunos no sistema” | área profissional `Pro.jsx` |
| Fichas de treino | “Crie e edite fichas com exercícios, séries, repetições, cargas e orientações” | `PlanEditor` em `Pro.jsx` |
| Biblioteca de exercícios | “Busque exercícios para montar a ficha” | `searchEx` e recurso `biblioteca` exclusivo de profissional/admin |
| Sessões recentes | “Veja as sessões recentes do aluno” | detalhe do aluno em `Pro.jsx` |
| Mensagens | “Converse com o aluno no sistema” | conversas e `proThread` em `Pro.jsx` |
| Ocorrências e orientações | “Centralize pendências e orientações do atendimento” | `Atendimentos` e `Assess` em `Pro.jsx` |
| Propostas de alteração | “Registre e avalie propostas de alteração da ficha” | `ProposalForm` e decisão registrada |
| Indicadores operacionais | “Veja alunos, vagas e pendências” | painel profissional em `Pro.jsx` |
| Perfil profissional | “Mantenha apresentação, especialidades e modalidades de atendimento” | `ProProfile` em `Pro.jsx` |

## Promessas proibidas sem nova prova

- Resultado físico garantido, emagrecimento garantido ou ganho de massa garantido.
- “Inteligência artificial monta seu treino” ou ajuste automático de treino.
- Dieta, plano alimentar, consulta nutricional ou cálculo de alimentação.
- Videochamada, aula ao vivo, localização de academias ou integração com relógio inteligente.
- Substituição de avaliação médica, fisioterapêutica ou profissional.
- Número de usuários, depoimentos, avaliações, economia de tempo ou aumento de faturamento sem dados reais.
- Cobrança real, teste gratuito, preço ou limite de alunos sem consultar o catálogo público vigente.
- Notificação garantida: depende de permissão e suporte do aparelho.
- Funcionamento offline completo ou sincronização em segundo plano garantida.

## Linguagem aprovada para a campanha

- “Pare de treinar no improviso.”
- “Veja o treino do dia, registre séries e cargas e acompanhe seu histórico.”
- “A ficha não precisa ficar no WhatsApp.”
- “Crie treinos, acompanhe sessões recentes e responda seus alunos no mesmo sistema.”
- “Treino no celular. Sem adivinhar o próximo passo.”
- “Da ficha ao acompanhamento. No mesmo sistema.”

As frases acima descrevem funções presentes. Elas não prometem transformação corporal, resultado financeiro nem disponibilidade de recurso fora das regras de plano e acesso.
