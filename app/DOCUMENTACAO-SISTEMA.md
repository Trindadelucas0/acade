# AVAGYM — Documentação do sistema

Fonte oficial de comportamento. Versão frontend: 1.2.7. Atualização: 15/10/2026.
O inventário em `docs/INVENTARIO-FUNCIONAL.md` preserva o levantamento histórico e seus limites de validação; este documento consolida os fluxos atualizados.

## Tecnologias e mapa
Frontend React/Vite; API em `api/`. A rota `/treinar` usa `frontend/src/views/guided/Train.jsx`; sessão e integração ficam em `frontend/src/lib/guided.js`.

## Treino: preparação e início
Programas do sistema e fichas do profissional mostram “Defina os pesos” antes de iniciar uma nova sessão. Cada exercício de repetições exige um peso numérico não negativo em kg. Cargas sugeridas vêm preenchidas e precisam de confirmação; 0 kg indica exercício sem carga. Exercícios por tempo dispensam esse campo.
“Confirmar pesos e iniciar treino” solicita o início ao servidor e só então salva a sessão local. O horário local é renovado ao confirmar; quando disponível, prevalece o horário de início retornado pelo servidor. Preparar as cargas não cria sessão nem conta como tempo de treino. Voltar abandona essa preparação sem salvar. Uma sessão já existente segue o fluxo de retomada, sem repetir a preparação.
As cargas continuam ajustáveis durante a execução. Metas por série da ficha continuam sendo aplicadas nas séries seguintes conforme a prescrição existente.

## Como usar / Guia
1. Em Treinos, escolha o programa ou a ficha e toque para começar.
2. Confira ou informe o peso de cada exercício; use 0 para sem carga.
3. Toque em “Confirmar pesos e iniciar treino”. O cronômetro total começa.
4. Use “Iniciar série” para acionar o cronômetro da série.

## Validação e ambiente
Conferir que esperar na preparação não cria sessão; campos vazios/negativos bloqueiam a confirmação; cargas sugeridas e 0 são aceitos; exercícios por tempo e retomada continuam funcionando. Validação de navegador e publicação devem ser registradas separadamente dos testes locais.
O início utiliza `startRemote`, que preserva a autorização existente e a continuidade offline. Nenhuma alteração de permissão ou banco nesta versão.

## Histórico
- 1.2.7 (15/10/2026): revisão da linguagem portuguesa da interface e do catálogo inicial; registros existentes e publicação não alterados.
- 1.2.5 (15/10/2026): confirmação das cargas antes de iniciar nova sessão e cronômetro.

## Manutenção
Atualizar este documento quando mudar comportamento e manter o guia acima alinhado ao código. Não incluir credenciais.

## Linguagem da interface — revisão de 15/10/2026

Os textos revisados adotam linguagem profissional, direta e compreensível. No catálogo inicial (`api/db/seed-programs.js`), “Parte de cima” e “Corpo de cima” passam a “Membros superiores”; os treinos “Pernas 1/2” passam a “Membros inferiores 1/2”. Os títulos “Emagrecimento rápido (intervalado)” e “Mobilidade — Corpo solto” passam a “Condicionamento intervalado (HIIT)” e “Mobilidade articular”. Identificadores, objetivos, exercícios e prescrição são preservados.

Na tradução portuguesa (`frontend/src/locales/pt.js`), mensagens motivacionais, estimativas e progressão deixam de usar expressões como “bora”, “chute” e “suba de novo”. Mensagens de falha e nova tentativa usam “Tente novamente”. Em Perfil → Ajuda, o botão para repetir o tour passa a “Rever orientações”, com a mesma ação anterior; as dicas do tour acompanham o novo rótulo. As mensagens administrativas de termos e de configuração do envio de e-mail também foram revisadas.

Como usar: o fluxo permanece igual. Use “Tentar novamente” após uma falha ou Perfil → Ajuda → “Rever orientações” para repetir as dicas.

Limite: a alteração do catálogo inicial não atualiza os registros já existentes nem as revisões editoriais publicadas no banco. A atualização desses conteúdos deve respeitar o fluxo editorial e os históricos existentes; não executar o seed completo apenas para substituir textos. Esta revisão não alterou banco nem publicou o aplicativo. Conferir o build do frontend e a sintaxe do catálogo; a redação cadastrada no ambiente de uso exige conferência separada.

## Painel de gestão — 15/10/2026

Público: alunos independentes, alunos de personal e profissionais/personal. Academias, empresas e cobrança automática não fazem parte desta entrega. Interface usa os tokens existentes grafite/limão e respeita o tema do aplicativo.

### Mapa da navegação e do código
- Visão geral: Visão geral (`#/admin/painel`), em `frontend/src/views/admin/ManagementDashboard.jsx`.
- Pessoas: Contas (Contas, Pendências, Liberação das ações); Profissionais e verificação (Perfis e habilitações, Verificação profissional); Vínculos e convites (Vínculos, Convites).
- Planos e capacidade: Assinaturas, Limites de acompanhamento, Solicitações de vagas (Pedidos de vagas e Histórico).
- Treinos: Programas guiados, Modelos de treino, Biblioteca e mídia.
- Comunidade: Publicações e moderação (Publicações e comentários, Moderação), Grupos e desafios (Grupos, Desafios), Ranking.
- Operação: Atendimentos e prazos. Sistema: Privacidade e termos (Privacidade e pedidos, Termos de uso), Auditoria, Configurações.
- Composição: `frontend/src/views/admin/AdminApp.jsx`; formulários existentes são reaproveitados. `?tab=alunos|liberacoes|verificacoes|moderacao|desafios|termos|visao` redirecionam para o grupo/aba equivalente. O administrador que acessa `#/admin/programas` é direcionado ao novo menu; o acesso do profissional continua independente.

### Conta e acesso
Situação cadastral (`users.status`) e liberação de ações (`users.access_unlocked_at`) são controles distintos. Ativar uma conta não destrava as ações. Usuários mostra ambos; Liberação das ações permite aprovar, recusar, liberar e travar conforme as regras existentes. Administradores são isentos do cadeado de ações. Pendências reúne cadastro pendente OU ações travadas; conta com as duas condições conta uma vez. As listas existentes de usuários/convites mantêm o limite de 200 registros mais recentes; os indicadores agregam todos os registros elegíveis.

### Planos e capacidade
Limites de acompanhamento (antigos planos de acesso) controlam quantos profissionais podem acompanhar o aluno. Assinaturas controlam recursos e limites por área. A tela informa gestão sem cobrança automática; situações de assinatura são cadastrais, não prova de pagamento.
A fonte de capacidade é `capacitySummary` em `api/entitlements.js`: limite do plano + concessões iniciadas, não revogadas e não expiradas. A capacidade manual antiga não autoriza vagas e não entra no painel nem na Central de solicitações. Concessões preservam planos ilimitados. No resumo, vagas e ocupação finitas são somadas separadamente dos profissionais sem limite. Vagas disponíveis nunca são negativas; excesso é identificado. A ocupação é a situação atual, sem comparação histórica inventada.
Convites são criados pelo profissional e aceitos pelo aluno. O admin consulta os últimos 200 convites sem exibir códigos. Pedidos antigos de vínculo são consultados em Histórico, não apresentados como solicitações atuais de vagas. Nenhum histórico é apagado.

### Indicadores e contrato
`GET /api/adm/management?period=7|30|90` (padrão 30) em `api/management.js`: somente admin autenticado, restrito à comunidade da sessão. Período inválido retorna 400; anônimo 401; aluno/profissional 403. Nenhuma permissão global é concedida.
Resposta: `period`, `timezone`, `generated_at`, `start_date`, `end_date` (último dia incluído), `previous_start`, `indicators`, `comparison`, `series`, `subscriptions`, `occupancy`, `capacity`, `pending`.
- `indicators.accounts`: contas não anonimizadas, uma vez por identidade. Segmentos de aluno respeitam o papel aluno e o tipo `personal_client` ou independente. Identidade com dois papéis pode aparecer nos segmentos correspondentes, uma vez no total.
- `indicators.trainees`: alunos distintos com sessão elegível no período. `professionals`: perfil profissional ativo com cadastro ativo e não desativado. `links`: vínculos ativos. `subscriptions`: assinaturas com situação ativa, contadas por área e não por pessoa.
- `comparison.signups` e `comparison.sessions`: `current`, `previous`, `percent`. Percentual = (atual - anterior) / anterior × 100, com uma casa decimal; base anterior zero resulta em null, exibido como indisponível.
- `series.signups` e `series.sessions`: `{day: YYYY-MM-DD, n}` por dia, incluindo zeros. O período inclui hoje e os N-1 dias anteriores; o anterior tem N dias completos imediatamente anteriores. Datas obedecem ao fuso configurado; inválido/ausente usa America/Sao_Paulo. O dia atual pode estar incompleto. Os números são apurados por consulta, não por snapshots históricos.
- Sessões usam `countsInMetrics` em `api/metrics.js`: apenas status done, sem anulação, sem correção manual de tempo e sem origem legado. A mesma regra serve para ranking e métricas atuais.
- `subscriptions`: distribuição atual por plano, área e situação; não mede receita.
- `pending`: contas a liberar, verificações pendentes, solicitações de vagas abertas, ocorrências não encerradas e mensagens aguardando com prazo vencido. Os atalhos abrem as áreas responsáveis; o resumo de atrasos não impõe filtro novo na fila existente.
- `GET /api/adm/management/invites`: consulta administrativa de convites da comunidade; pendente vencido é exibido expirado sem alterar o registro.
`GET /api/adm/kpis` permanece disponível com os campos anteriores; `capacity` usa a regra atual e acrescenta `finite_used` e `unlimited`.

### Guia do administrador
Abra Visão geral; escolha 7, 30 ou 90 dias. Os gráficos de cadastros e treinos acompanham o período; estoques e capacidade são identificados como situação atual. Clique nos indicadores/atalhos para abrir a área responsável. Em Usuários, confira separadamente a situação e as ações; para destravar use Liberação das ações. Para vagas extras, use concessão com motivo e validade; para alterar recursos e plano, use Assinaturas. Consulte pedidos antigos em Histórico. Guia detalhado em `../docs/como-usar-o-sistema.md`.

### Validação desta entrega
Implementação local. Testes de API: `api/test/management.integration.mjs`, exclusivos da base `avagym_management_test_20261015`. Testes de navegador: `frontend/e2e/management.spec.js`, com fixtures geradas na mesma base e API separada em 8791; não apontar para dados reais. Nenhuma migration nova é necessária para o painel, mas o banco precisa estar alinhado ao esquema atual do repositório. Aplicação das migrations existentes em ambiente de uso e publicação são etapas separadas.

Verificação de 15/10/2026: 35 verificações de integração passaram na base isolada; 243 testes unitários passaram; 2 cenários de navegador passaram no Chrome (desktop e celular, períodos, aliases, abas e erro/retry). Build passou com avisos existentes de tamanho de bundle/importação dinâmica. A consulta somente leitura ao banco local de uso constatou ausência de `sessions.origin` e `sessions.time_corrected_at`; o histórico tem migrations mais recentes aplicadas sem todas as intermediárias. Nenhuma migration foi aplicada ao banco de uso nesta entrega. Antes de disponibilizar o novo painel nesse ambiente, reconciliar o histórico e aplicar as migrations existentes pertinentes, com backup e validação próprios. Quando faltar esquema, a nova API retorna 503 com aviso de atualização pendente em vez de apresentar métricas incompletas.

## Navegação e filtros — 1.2.6 (15/10/2026)

As abas internas e os filtros curtos se acomodam em linhas, com rótulos completos e seleção destacada. Os menus principais e as regras de acesso de aluno, profissional e administrador são preservados. O menu administrativo continua agrupado e abre como lista vertical no celular.

- Comunidade: Publicações, Desafios, Grupos e Ranking continuam condicionados ao acesso da conta. Os atalhos duplicados do feed foram removidos. Todos limpa os filtros do feed; Seguindo e Minhas publicações (quando autorizado) mantêm o comportamento de alternância. O campo Assunto mostra a seleção atual; Todos os assuntos remove somente a categoria e preserva o modo escolhido. Nova publicação fica após os filtros, quando permitido.
- Programas: Objetivo é um campo de seleção, com Todos os objetivos para remover o filtro. Biblioteca de exercícios e a janela de adicionar exercícios usam seletores de Grupo muscular e Equipamento; a criação de exercício também usa Grupo muscular.
- Progresso, grupos, desafios, área profissional e administração: abas e filtros curtos ficam visíveis em linhas; a seleção e os destinos existentes são mantidos.
- Editor de treinos: os dias e o botão de adicionar dia se acomodam em linhas, sem faixa horizontal.
- Os componentes usam as cores dos temas existentes. Não há mudança de API, banco, autorização ou registros gravados. Rolagem de tabelas e conteúdos de mídia não representa navegação ou filtro.

### Como usar / Guia de navegação
Abra a área pelo menu principal. Toque no botão da seção desejada; no celular as opções podem ocupar mais de uma linha. Na Comunidade, escolha Todos, Seguindo ou Minhas publicações e depois selecione um Assunto. Escolher Todos os assuntos mantém o modo; Todos limpa ambos. Em Programas, escolha Objetivo. Na administração, toque em Menu e escolha uma área na lista vertical; o menu fecha ao selecionar o destino.

### Onde olhar no código
O padrão visual fica em frontend/src/styles/organization.css, carregado após os estilos anteriores em frontend/src/main.jsx. As abas são compostas por Tabs em frontend/src/views/app/kit.jsx. Os filtros específicos ficam em frontend/src/views/app/Comunidade.jsx e frontend/src/views/guided/Programs.jsx. Dias do editor: frontend/src/views/builder/builder.css.

### Validação desta versão
Verificação local de build e testes de navegação responsiva em frontend/e2e/navigation-layout.spec.js. Os cenários de navegador usam respostas de API simuladas para isolar apresentação, filtros e permissões de exibição, sem alterar dados reais. Resultado: build passou; 246 testes unitários passaram; 26 cenários de navegador passaram no Chrome: 24 combinando aluno/profissional/admin, 320/390/768/1280 pixels e temas claro/escuro. Dois cenários adicionais conferiram os seletores da biblioteca em 320 e 1280 pixels. A matriz cobre Comunidade, Grupos, Desafios, Programas, Progresso, área profissional, sete dias no editor e navegação administrativa conforme o perfil. Publicação não realizada nesta entrega.

## Organização por tarefas — aluno, profissional e administração (15/10/2026)

A reorganização preserva identidade, dados e regras. Ocultar um recurso no menu é apresentação: autorização, vínculo, limites e bloqueios continuam sendo conferidos na API. Não há migration nova nesta entrega.

### Aluno: mapa de telas e ações
- Início (/hoje): saudação e sino, treino com Começar/Continuar, Minha semana e Acompanhamento com quantidade de ocorrências em aberto. Ranking, músculos e atalhos repetidos saem dessa tela.
- Treinos (/treinos): ficha ativa, início/retomada, Fichas anteriores e Rotinas antigas — consulta. Explorar programas e Biblioteca aparecem conforme acesso. Os parâmetros antigos aba=programas|profissionais|historico|rotinas continuam aceitos; Voltar ao treino ativo recupera a visão principal.
- Programa (/meu-programa): dias e exercícios; troca/desvinculação em Gerenciar programa com confirmação. Ficha de profissional continua sem retirada pelo aluno.
- Catálogo e recomendados continuam nas rotas anteriores, acessados por Treinos → Explorar programas. Perguntas e equipamentos ficam em Perfil → Preferências. Bloqueios para iniciar programas com ficha do profissional são mantidos.
- Preparação e execução (/treinar): Defina os pesos → Confirmar pesos e iniciar treino, preservando o início e a retomada documentados acima. Nome do exercício antes da demonstração; mídias extras em Como fazer. Pausa, relato de dor, série, descanso e conclusão usam os mesmos registros.
- Conclusão (/concluido): resumo, sensação, dor e salvamento, preservando sincronização e histórico.
- Progresso (/progresso?aba=resumo|historico|recordes|musculos|trofeus): frequência semanal, sessões, recordes, músculos e troféus em abas. Corpo 3D em Músculos; estatísticas e histórico antigos no Resumo como consulta.
- Acompanhamento (/acompanhamento): responsáveis, conversas e ocorrências recolhidas. Encontrar profissional aparece quando permitido. /comunidade?tab=profissionais encaminha o aluno para esse diretório; no contexto profissional/admin o acesso anterior permanece válido.
- Comunidade: Publicações, Grupos, Desafios e Ranking conforme acesso. Grupos e desafios mantêm a seleção de Comunidade na navegação; links diretos restritos mostram a explicação existente.
- Desafios: Meu progresso/Resumo, Regras e Classificação/Progresso separam consulta e participação das ferramentas de Gestão. Comprovação e gestão continuam dependendo de fase, participação e permissão.
- Ranking: posição e classificação primeiro; Como pontua recolhido. Privacidade continua em painel próprio.
- Perfil (/perfil): identificação e contexto, Conta, Preferências, Meu plano, Privacidade e segurança, Notificações, Ajuda e Sair. Subpáginas: ?secao=dados|preferencias|privacidade|ajuda. Código e convites em Conta; senha, aparelhos e pedidos de dados em Privacidade e segurança; reiniciar tour em Ajuda. O link antigo ?liberacao=1 abre privacidade com solicitação de acesso.
- Notificações (/avisos): Não lidas/Todas; marcar todas como lidas preservado.
- Meu plano (/planos): assinatura/recursos atuais e solicitação de liberação; catálogo adicional recolhido. Sem contratação ou pagamento automático.
- Entrada: login, cadastro e recuperação em etapas distintas, mantendo endpoints, troca obrigatória de senha e termos.

### Profissional: mapa e compatibilidade
- Navegação única: Painel, Alunos, Treinos, Atendimentos e Mais. Barra inferior no celular; lateral no desktop a partir de 1000px. Sem faixa superior duplicada.
- Painel: atenção necessária e indicadores; plano/vagas recolhidos; atividade recente. Cálculos preservados.
- Alunos: busca/filtros na URL, preservados ao abrir e voltar do detalhe. Adicionar aluno oferece Cadastrar conta e Convidar aluno existente. Convites pendentes têm tela própria; contas criadas e reenvio de acesso ficam recolhidos na lista de alunos.
- Cadastro preserva o fluxo local mais recente: enfileira link por e-mail para definir senha. Não restaura geração/exibição de senha provisória.
- Detalhe: Resumo, Treinos, Evolução e Atendimento. Evolução reúne sessões/gráficos; Atendimento reúne conversas, ocorrências e propostas. Os valores antigos sub=historico|conversas|ocorrencias|propostas abrem o grupo correspondente.
- Treinos: Fichas dos alunos, Modelos e Programas públicos. Modelos são consultados e aplicados no construtor. Construtor: dados gerais → dias/exercícios → revisar/enviar. Ajustes avançados recolhidos por exercício; confirmação de alterações não salvas preservada.
- Atendimentos: Pendentes, Em andamento e Encerrados, com busca por aluno/assunto. Encerrados e propostas decididas não oferecem novas decisões. Histórico inclui até os 200 registros mais recentes por categoria, sem apagar os demais.
- Mais: Comunidade, Perfil profissional, Verificação, Meu plano e vagas, Minha conta e preferências. Rotas anteriores do portal e programas públicos preservadas com seleção correta do menu.

### Administração e mobile
Os grupos atuais são Visão geral, Pessoas, Planos e capacidade, Treinos, Comunidade, Operação e Sistema. Esta organização substitui os rótulos Gestão, Planos e limites, Treinos e conteúdo e Administração descritos no histórico acima. Pessoas → Contas reúne Contas/Pendências/Liberação das ações. Preserva formulários e redirecionamentos existentes. Visão geral mostra pendências e indicadores; análises detalhadas abrem sob demanda, sem repetir atalhos no rodapé.
No celular, tabelas mostram três campos por registro; Ver mais campos expande os demais. Ordenação em seletor, busca, paginação e CSV preservados. Detalhes também abrem por teclado. Desktop mantém tabelas.

### Contratos e código
- frontend/src/lib/navigation.js: destinos e seleção por rota/contexto. frontend/src/components/NavigationAccess.jsx: visibilidade usando GET /api/me/subscriptions. Sem confirmação de um recurso de assinatura, seu atalho opcional fica oculto; Meu plano continua disponível. client_locked restringe programas, biblioteca, músculos, grupos, ranking e diretório.
- frontend/src/styles/organization.css: composição adaptável e detalhes progressivos. As telas existentes continuam responsáveis pelos formulários.
- Extensão necessária: GET /api/pro/dashboard?include_history=1 inclui encerrados/decididos, até 200 por categoria. Sem parâmetro mantém abertos. Profissional e comunidade vêm da autenticação; IDs da URL não alteram o escopo. Não muda endpoints de gravação.
- frontend/src/lib/tours.js: dicas com os novos destinos e acesso por e-mail.

### Validação e limites
Build e testes de frontend locais. frontend/e2e/organization.spec.js usa dados controlados e intercepta todas as APIs, cobrindo navegação por perfil, links restritos, cargas, recuperação de erros, layouts 360/390/768/1440px e temas claro/escuro. Não comprova entrega de e-mail nem persistência no Postgres. Executar após build: npx playwright test --config playwright.organization.config.js, com dependências de teste disponíveis.
api/test/dashboard-history.test.mjs valida a rota isoladamente: visitante/aluno negados, escopo de profissional/comunidade e compatibilidade dos callers anteriores. Executar na API: node --experimental-test-module-mocks --test test/dashboard-history.test.mjs. Não acessa banco real. Validação integrada com dados reais e publicação são etapas separadas.
