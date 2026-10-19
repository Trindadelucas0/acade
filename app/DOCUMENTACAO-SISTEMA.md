# ORNY — Documentação do sistema

Fonte oficial de comportamento. Versão frontend: 1.7.4. Atualização: 19/10/2026.
O inventário em `docs/INVENTARIO-FUNCIONAL.md` preserva o levantamento histórico e seus limites de validação; este documento consolida os fluxos atualizados.

## Bloqueio comercial — somente pagamento confirmado (19/10/2026)

O acesso às áreas e operações autenticadas do aluno ou profissional exige uma assinatura não gratuita, vigente e com cobrança marcada como paga e confirmada. Plano selecionado, teste/cupom gratuito, cortesia, cobrança pendente ou cobrança simulada não liberam o sistema. A configuração `monetizacao_ativa` não desliga essa proteção; administradores mantêm a isenção operacional. O checkout, a consulta/regularização da assinatura, gestão da conta e documentos legais continuam disponíveis sem pagamento.

A confirmação do provedor é a autoridade: cobrança pendente ou recusada não libera acesso; cobranças `simulado` não contam. O middleware de API aplica o bloqueio no servidor (HTTP 402 `ACCESS_REQUIRED`), preservando os dados. A interface de assinatura apresenta planos e pagamento, mas não substitui a validação de servidor.

Onde olhar no código: `api/access.js` (origem paga, allowlist e middleware global), `api/server.js` (aplicação do middleware), `frontend/src/views/billing/Access.jsx` (mensagem de bloqueio) e `frontend/src/views/billing/Premium.jsx` (cadeados).

### Como usar

1. Sem cobrança confirmada, a pessoa pode entrar na conta e abrir **Assinatura** para escolher/concluir o pagamento, mas não acessar treinos, progresso ou recursos internos.
2. Após confirmação real pelo provedor e período vigente, o acesso é liberado automaticamente. Se o pagamento estiver pendente, deve aguardar a confirmação ou regularizar a cobrança.

## Cadastro e aceite legal — correção 1.7.4 (19/10/2026)

No cadastro de aluno, o código de personal fica fechado por padrão e só é enviado ao servidor depois de a pessoa escolher **Tenho código do meu personal**. Nome, e-mail ou outro preenchimento automático do navegador não podem mais ser interpretados como código nem impedir quem escolheu um plano, cupom ou **Decidir depois**. A confirmação mostra o vínculo somente quando essa opção foi aberta e recebeu um código.

O aceite de documentos continua bloqueado quando faltam dados jurídicos obrigatórios da empresa. A tela agora identifica junto ao botão quais campos precisam ser concluídos em **Sistema → Dados da empresa**, em vez de parecer que **Continuar** não responde. O servidor permanece como autoridade e não aceita documentos incompletos.

Onde olhar no código: cadastro em `frontend/src/views/Login.jsx`, contrato de cadastro em `frontend/src/lib/api.js` e aceite em `frontend/src/views/app/Legal.jsx`/`api/legal.js`.

### Como usar

1. No cadastro, só abra **Tenho código do meu personal** se recebeu um código do profissional; caso contrário, prossiga normalmente e selecione o plano, cupom ou **Decidir depois**.
2. Se o aceite mostrar **Aguardando dados da empresa**, o administrador deve abrir **Sistema → Dados da empresa**, preencher os campos indicados e salvar. Depois, a pessoa recarrega a tela, marca os aceites obrigatórios e toca em **Continuar**.

## Landing pública e instalação da ORNY — 1.7.2 (19/10/2026)

A landing pública das rotas `/` e `/conheca` usa apresentação clara, com proposta principal, benefícios por perfil, funcionamento, catálogo real de planos, instalação opcional, dúvidas e chamada final. O seletor de perfil altera a mensagem, benefícios e planos exibidos para aluno ou profissional; os links continuam usando o cadastro existente.

### Instalação no celular

Na seção **Instale quando quiser. Use desde já.**, a ORNY explica que funciona normalmente no navegador. Android usa Chrome e pode abrir o prompt real de instalação quando o navegador oferece `beforeinstallprompt`; quando não oferece, o visitante segue pelo menu `⋮` e escolhe **Instalar app** ou **Adicionar à tela inicial**. iPhone usa Safari e o caminho manual **Compartilhar → Adicionar à Tela de Início → Adicionar**.

Depois do cadastro, `DeviceSetupFlow` usa os mesmos passos do tutorial público. A instalação pode ser adiada. Notificações são uma etapa separada, opcionais e nunca bloqueiam o uso; podem ser ativadas depois em Perfil → Configurações.

Onde olhar no código: landing em `frontend/src/views/landing/Landing.jsx` e `frontend/src/views/landing/landing.css`; passos compartilhados em `frontend/src/components/install-guide.js`; fluxo autenticado em `frontend/src/components/DeviceSetupFlow.jsx`; botão de instalação em `frontend/src/components/InstallButton.jsx`.

## Planos e pagamento — correção visual 1.7.1 (19/10/2026)

Os cartões públicos e autenticados de planos mantêm seus botões de ação visíveis com texto contrastante no tema claro. A correção é somente visual; não altera preço, venda, pagamento ou liberação de acesso.

## Entrada e cadastro — correção visual 1.7.3 (19/10/2026)

Login, cadastro e recuperação mantêm o mesmo fluxo e os mesmos campos. No tema claro, a camada sobre a imagem de fundo da tela de entrada passou a ser translúcida, preservando a visibilidade da foto sem remover o contraste necessário para o formulário. Não houve alteração de autenticação, validação, dados ou permissões.

Onde olhar no código: `frontend/src/views/Login.jsx` e `frontend/src/styles/orny.css`.

## #TáPago 2.0 — editor social e campanha de 30 dias — 1.7.0 (19/10/2026)

Depois que o servidor confirma um treino válido, a conclusão apresenta **Treino pago. Evolução garantida.** e abre o editor em **Criar meu card**. A rota `/compartilhar` oferece seis estilos: Treino, Minha foto, Semana, Músculos, Recorde e Sequência. Treino específico é validado pelo servidor; sessão apenas na fila offline ainda não gera card oficial. Recorde só aparece quando supera uma marca anterior comparável e identifica o critério de 1RM estimado; sequência usa dias distintos válidos no fuso do produto. Ausência de volume, músculos ou recorde não produz valor inventado.

O editor gera Story 9:16, Feed 4:5 e Quadrado 1:1 em PNG. Nome, avatar e indicadores podem ser ocultados; o modelo com foto permite zoom, deslocamento, posição dos dados e intensidade do gradiente. A foto escolhida é processada somente no aparelho e não é enviada ao perfil ou à comunidade. No navegador, usa compartilhamento de arquivo quando suportado e download como alternativa; no shell Capacitor, usa Filesystem temporário e Share. A captura contém somente o canvas do card.

A campanha promocional é independente dos cards e nasce **inativa**. Em **Administração → Marketing → Campanha #TáPago**, o administrador configura perfil oficial, instruções, vigência, campos obrigatórios, retenção e uma versão dos termos. Ativar exige perfil e termos completos. O aluno elegível aceita os termos, informa Instagram/link e envia uma captura privada. As situações são pendente, aprovada, rejeitada ou cancelada; rejeição permite nova comprovação enquanto a campanha estiver ativa.

A aprovação exige administrador do mesmo ambiente, bloqueia autoaprovação e roda em transação. Índices únicos e identidades protegidas por hash impedem recompensa repetida ou duas concessões concorrentes. O prêmio cria duas concessões temporárias de aluno (`acesso` e `catalogo_completo`) por 30 dias, sem ampliar a capacidade do personal. Havendo período Individual pago com término confiável, o prêmio começa depois dele; se o término ainda não for confiável, o direito fica reservado e o administrador pode usar **Tentar aplicar crédito pendente** sem conceder um segundo benefício. Revogação exige justificativa e não apaga o histórico. Evidências ficam no storage privado, passam por validação real de imagem/limite/dimensões e são removidas após a retenção configurada, preservando o evento de auditoria.

Contratos: `GET /api/me/share-card?kind=treino|semana|musculos|recorde|sequencia`, `GET /api/tapago/me`, `POST /api/tapago/preferences`, `POST /api/tapago/submissions`, `GET /api/tapago/evidence?id=`, `GET /api/adm/tapago`, `POST /api/adm/tapago/config`, `POST /api/adm/tapago/decide` e `POST /api/adm/tapago/revoke`. Implementação em `api/social.js`, `api/tapago.js`, `frontend/src/views/guided/ShareCard.jsx` e `frontend/src/views/admin/TapagoAdmin.jsx`; persistência na migration aditiva `064_tapago_2.sql`.

### Como usar

1. Aluno: conclua e sincronize um treino; em **Treino concluído**, toque em **Criar meu card**.
2. Escolha Treino, Minha foto, Semana, Músculos, Recorde ou Sequência. Modelos sem dado confiável explicam por que ainda não estão disponíveis.
3. Se desejar, abra **Personalizar**, ajuste o formato e os itens visíveis; no modelo Minha foto, escolha uma imagem e posicione-a.
4. Use **Compartilhar treino** ou **Salvar imagem**. Nada é publicado automaticamente.
5. Se a campanha estiver ativa e a conta elegível, abra **Como participar**, leia os termos e envie a comprovação. O resultado aparece no mesmo módulo e em notificações.
6. Administrador: abra **Administração → Marketing → Campanha #TáPago** para configurar, analisar, aprovar, rejeitar ou revogar. Nunca ative publicamente sem validação jurídica e operacional.

### Validação desta versão

Build do frontend aprovado. Vitest: 292 testes aprovados. A migration 064 foi aplicada com sucesso somente no banco isolado `avagym_tapago_test_20261019`. O teste `api/test/tapago.integration.mjs` aprovou configuração segura, comprovante privado, aprovação concorrente com recompensa única e bloqueio de autoaprovação. Banco de uso, VPS e produção não foram alterados. Compartilhamento físico em iPhone/Android, revisão jurídica e ativação operacional continuam pendentes.

## Conteúdo oficial da Comunidade — 1.5.0 (18/10/2026)

A administração dispõe de **Comunidade → Publicações e moderação → Conteúdo oficial** para criar, editar, agendar, publicar imediatamente ou cancelar publicações institucionais. A autoria pública é sempre **Equipe ORNY — Perfil oficial**; não são criados nomes de pessoas, contas sociais, curtidas ou comentários artificiais. Os contadores do feed continuam refletindo somente ações reais de usuários autenticados.

O botão **Carregar calendário inicial** registra doze conteúdos editoriais idempotentes: três ficam publicados e nove são programados ao longo das quatro semanas seguintes. Repetir a ação informa que o calendário já existe e não duplica registros. Conteúdo agendado não aparece no feed nem aceita interação antes de `publish_at`; cancelamento remove o conteúdo do feed sem apagar seu histórico. Respostas feitas por uma conta administrativa aparecem como **Equipe ORNY — Perfil oficial**, deixando explícito que são respostas institucionais reais.

As rotas `GET /api/adm/community/editorial` e `POST /api/adm/community/editorial/{seed|save|publish|cancel}` exigem administrador autenticado e filtram leitura e alteração pelo `tenant_id` da sessão. A migration aditiva `061_conteudo_oficial_comunidade.sql` acrescenta `official`, `publish_at`, `official_key` e `canceled_at` em `posts`; a chave editorial por comunidade garante a idempotência. Criação, edição, agendamento, publicação, cancelamento e carga inicial são registrados em `audit_log` com o administrador responsável.

### Como usar

1. Abra **Administração → Comunidade → Publicações e moderação → Conteúdo oficial**.
2. Use **Carregar calendário inicial** uma vez para preparar os doze conteúdos ou **Novo conteúdo** para escrever outro.
3. Preencha Título, Assunto, Conteúdo e Data e hora da publicação. Uma data futura agenda; uma data atual ou passada publica imediatamente.
4. Abra um item agendado para alterar a data, usar **Publicar agora** ou **Cancelar conteúdo**.
5. Confira o resultado em **Ver comunidade**. Publicações e respostas oficiais mostram o selo **Perfil oficial**; curtidas e comentários começam em zero.

### Validação desta versão

O teste isolado `api/test/community-editorial.test.mjs` cobre os doze itens únicos, idempotência, ausência de gravação em curtidas/comentários, bloqueio para usuário comum e filtro obrigatório pela comunidade autenticada. O build do frontend valida a integração da nova aba. A migration não foi aplicada ao banco de uso e a funcionalidade não foi publicada nesta entrega local.

## Catálogo oficial de treinos — 18/10/2026

O catálogo público possui 18 programas oficiais: ganho de massa, emagrecimento, força, condicionamento, mobilidade e bem-estar e treino em casa, cada um nos níveis Iniciante, Intermediário e Avançado. Os cartões informam objetivo, semanas, frequência, duração, local, nível e equipamentos. O detalhe acrescenta a orientação de progressão. Mobilidade é conteúdo geral de bem-estar e não substitui avaliação, diagnóstico ou tratamento clínico; Reabilitação/Fisioterapia não é uma categoria pública.

Os programas antigos com origem `seed` são arquivados, nunca apagados. Eles deixam de aceitar novas adesões e somem das recomendações e do catálogo, mas o aluno que já começou continua usando a revisão vinculada até concluir ou trocar; sessões, cargas e histórico permanecem. Preferências antigas de reabilitação passam para mobilidade. O sincronizador idempotente fica em `api/db/official-programs.js`; a estrutura e a transição ficam na migration 059.

Iniciar um programa oficial exige `catalogo_completo` no servidor, além do bloqueio comercial vigente: somente assinatura paga confirmada libera o uso em produção. Teste ou concessão não substituem o pagamento. Cobertura pelo PRO mantém fichas e recursos do personal somente quando o plano PRO está pago e confirmado. Administradores permanecem isentos conforme o motor central.

### Criação orientada da ficha — 1.6.0 (19/10/2026)

Depois da confirmação do Individual, o atalho principal **Encontrar minha ficha** abre a recomendação. Se ainda não houver perfil, o aluno responde objetivo, nível, local, frequência, duração, equipamentos e restrições. A primeira recomendação apresenta **Ativar treino recomendado** e só cria a ficha depois da confirmação explícita do aluno.

A rota `POST /api/guided/start-recommended` não recebe identificador de aluno nem confia em um programa escolhido pelo navegador: usa a conta autenticada, relê o próprio perfil, recalcula a melhor opção entre programas publicados e compatíveis e aplica o mesmo direito `catalogo_completo` do início manual. Perfil incompleto e ausência de programa compatível não criam vínculo. Uma ficha do personal ativa continua com prioridade e não é substituída; programas anteriores são desvinculados para o histórico antes de uma troca confirmada.

### Como usar

1. Abra Treinos → Explorar programas.
2. Combine Objetivo, Nível e Local ou abra Recomendados para você.
3. Confira frequência, duração, equipamentos e Como evoluir.
4. Em Recomendados, confira a opção marcada como Mais indicado e toque em Ativar treino recomendado. Confirme para criar a ficha e abrir Meu treino. Para escolher outra opção, abra seu detalhe e use Começar programa. Se o catálogo estiver bloqueado, abra Meu plano e contrate o Individual.

### Validação local

O catálogo passou na validação estrutural com 18 combinações únicas e sem exercício ausente ou prescrição incompleta. A migration 059 foi aplicada na base isolada `orny_catalog_test_20261018` e a carga foi repetida: permaneceram 18 programas publicados, sem duplicação, todos com revisão e treinos materializados, e Individual com `catalogo_completo`. Uma segunda base isolada simulou o seed anterior e confirmou 18 oficiais publicados mais os 21 antigos arquivados. Passaram 289 testes unitários do frontend, 6 testes direcionados da API, o build e 26 cenários de navegador em 320/390/768/1280px, temas claro/escuro e papéis aluno/profissional/admin. Banco de uso, publicação e produção não foram alterados.

## Acesso premium, Início e Progresso — conclusão de 17/10/2026

### Comportamento e guia do aluno

- Início mantém a data, o cumprimento e as notificações no cabeçalho. Minha semana é o primeiro cartão, com rolagem normal. Abaixo ficam treino ativo, ação para começar/continuar, sequência de dias, volume, tempo, recordes recentes e mapa do próximo treino.
- O mapa usa os exercícios e as séries da próxima sessão do programa ativo ou da ficha do personal, que tem prioridade. Na ficha, a sequência sugere um dia; o aluno ainda pode escolher outro em Treinos. Preparar este treino abre exatamente o dia exibido e mantém a confirmação de pesos antes de iniciar. Repetições do mesmo exercício em blocos diferentes somam as séries.
- Sem origem paga válida, Treinos, Comunidade, Progresso e páginas premium mostram cadeado e acesso à assinatura. Músculos trabalhados tem bloqueio explícito. Conta sem pagamento confirmado vê a situação cadastral. Administradores continuam isentos; teste e concessão não liberam recursos em produção. Cobertura pelo personal só vale quando houver plano PRO pago e confirmado. Monetização desligada não desativa o bloqueio em produção.
- A interface aguarda a consulta de acesso antes de montar conteúdo premium. Falha inicial oferece Tentar novamente. Respostas atrasadas de outra conta ou anteriores a uma atualização de acesso são ignoradas. A confirmação de acesso é vinculada à conta atual.
- Após assinatura confirmada, o agradecimento informa o plano e os atalhos permitidos para aquele público, recursos e contexto. O pagamento confirmado libera o uso imediatamente, sem análise administrativa. O agradecimento aguarda a saída de Treinar e o registro de exibição só é enviado depois de aparecer; fechar ou usar um atalho também confirma a apresentação. Não repete após registro bem-sucedido; falha de rede pode levar a nova tentativa em outra entrada. O modal permite teclado, mantém o foco e fecha com Escape.
- Programas permite combinar Objetivo, Nível e Local, com Limpar filtros, ausência de resultados e nova tentativa após falha. O catálogo oficial e sua transição estão descritos na seção acima; a antiga auditoria de 21 programas de seed foi substituída pela coleção editorial de 18 combinações.
- Progresso mantém resumo, histórico, recordes e acesso a Estatísticas detalhadas. Estatísticas oferece 7/30/90/180/365 dias ou Tudo, volume e frequência semanais, tempo, cargas e 1RM estimado, distribuição muscular e calendário. Erros permitem Tentar novamente. O aluno coberto pelo PRO usa fichas, comunidade e desafios do personal; recursos fora desse escopo exigem plano Individual.
- Notificações internas e push de treino permanecem em português. O lembrete local do aplicativo instalado usa texto português com o nome original do treino. Títulos/observações escritos pelos usuários não são traduzidos nem regravados. A permissão e a entrega física de notificações dependem do aparelho.

### Regras dos indicadores e mapa do código

`api/stats.js` mantém `GET /api/guided/stats?dias=7|30|90|180|365|0` e `GET /api/guided/home`, com autenticação e bloqueios centrais do servidor. As consultas de sessões/séries usam usuário e comunidade, ignoram datas futuras e aplicam `countsInMetrics`: concluídas, não anuladas, sem correção manual de tempo e fora do legado. Séries removidas não entram nos detalhes. Falta de acesso retorna 402 pelo motor de monetização; período inválido retorna 400.

Períodos finitos incluem hoje e os N-1 dias anteriores em America/Sao_Paulo. As semanas começam na segunda-feira; semanas vazias aparecem com zero, inclusive antes do primeiro treino dentro do período escolhido. Tudo começa na semana do primeiro treino válido, ou na semana atual quando vazio. Consistência é semanas que atingiram a meta atual divididas por todas as semanas do recorte, inclusive semanas parciais nas bordas; isso é explicado na tela. Não há comparação com metas históricas que não foram registradas. `api/stats-calendar.js` centraliza dias e preenchimento das semanas.

O 1RM usa Epley, apenas com carga positiva e 1 a 12 repetições. Uma superação conta uma vez por exercício/sessão, comparada ao melhor resultado anterior; a primeira carga estabelece a base. `kpis.records_count` conta as superações do período, independentemente da lista de melhores marcas de todo o histórico. Os recordes do Início usam os últimos 14 dias de calendário, sem o antigo limite de três resultados. A sequência de dias aceita hoje ou ontem como último dia treinado; não obriga treino hoje para manter a sequência de ontem. O calendário visual mostra no máximo 18 semanas, enquanto os indicadores usam o período inteiro.

O campo adicional `next.to` em `/api/guided/home` aponta para o treino exibido, incluindo o índice real do dia na ficha. As ações mantêm as validações existentes ao preparar/iniciar. Apresentação em `frontend/src/views/guided/Today.jsx`, `HomeWidgets.jsx`, `Estatisticas.jsx` e `Programs.jsx`; acesso em `frontend/src/views/billing/Premium.jsx`, `Access.jsx` e `frontend/src/components/NavigationAccess.jsx`.

Boas-vindas: `api/access.js` / `api/welcome-features.js`, `GET /api/access/welcome` retorna `welcome` ou null, com `resources` contendo os destinos liberados. `POST /api/access/welcome/seen` aceita a chave da ativação da própria conta; chave inválida retorna 400, chave alheia/não pendente retorna 409 e repetição já registrada retorna 200. A tabela `access_welcome` é definida na migration 056; sua ausência produz 503 `WELCOME_SCHEMA_PENDING` na consulta. As chaves existentes identificam assinatura por assinatura+plano e teste por concessão. Concessões administrativas/transição não disparam agradecimento. A migration marca ativações anteriores como vistas, evitando agradecimento retroativo. Interface em `frontend/src/views/billing/Welcome.jsx`.

### Validação e disponibilidade

Implementação local, sem publicação e sem alteração do banco de uso. A consulta somente leitura encontrou o banco `avagym` com histórico de migrations até 047 e sem `access_welcome`. Reconciliar o esquema completo antes de disponibilizar as novas rotas nesse banco; não executar migration/seed às cegas. A 056 foi testada duas vezes na base exclusiva `avagym_improvements_test_20261017`, criada a partir de `avagym_test`, sem duplicar registros de boas-vindas.

- Unitários do frontend: 289 testes passaram; quatro novos casos verificam respostas atrasadas, logout, ativação e falha de consulta do acesso. No Windows, usar TEMP/TMP locais se o cache do Vitest retornar EPERM.
- API: 4 testes de calendário/recursos e 34 verificações de integração passaram, incluindo isolamento, períodos, superações, mapa do próximo treino, acessos, expiração, concessão, agradecimento e idempotência.
- Navegador: 42 cenários passaram (16 novos e 26 de regressão de navegação). `frontend/e2e/premium-progress.spec.js` cobre matriz 320/390/768/1280px, temas claro/escuro, filtros, cadeados, agradecimento adiado, erros e programa → pesos → série → conclusão → Progresso. APIs simuladas nesses cenários; persistência e autorização são verificadas separadamente na integração PostgreSQL.
- Comandos: frontend `npm test`, `npm run build`, `npx playwright test e2e/premium-progress.spec.js e2e/navigation-layout.spec.js`; API `node --test test/improvements.test.mjs`, `DB_NAME=avagym_improvements_test_20261017 node test/improvements.integration.mjs`. Auditoria de catálogo: `node scripts/review-programs.mjs` (somente leitura).

O build local passou com os avisos de tamanho de bundle/importação dinâmica. A validação de viewport não equivale a teste em celular físico ou entrega real de push. O guia diário fica em `../docs/como-usar-o-sistema.md`.

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
- 1.6.0 (19/10/2026): assinatura Individual direciona ao perfil e à recomendação; a ficha é calculada no servidor e ativada somente após confirmação do aluno.
- 1.5.0 (18/10/2026): calendário de conteúdo oficial da Comunidade, doze publicações iniciais idempotentes, agendamento, selo institucional e engajamento exclusivamente real.
- 1.4.0 (18/10/2026): catálogo oficial com 18 programas, seis objetivos em três níveis, progressão, arquivamento seguro do seed e acesso completo pelo Individual.
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
- Pessoas: Contas (Contas, Pendências, Suspensões de acesso); Profissionais e verificação (Perfis e habilitações, Verificação profissional); Vínculos e convites (Vínculos, Convites).
- Planos e capacidade: Assinaturas, Limites de acompanhamento, Solicitações de vagas (Pedidos de vagas e Histórico).
- Treinos: Programas guiados, Modelos de treino, Biblioteca e mídia.
- Comunidade: Publicações e moderação (Publicações e comentários, Moderação), Grupos e desafios (Grupos, Desafios), Ranking.
- Operação: Atendimentos e prazos. Sistema: Privacidade e termos (Privacidade e pedidos, Termos de uso), Auditoria, Configurações.
- Composição: `frontend/src/views/admin/AdminApp.jsx`; formulários existentes são reaproveitados. `?tab=alunos|liberacoes|verificacoes|moderacao|desafios|termos|visao` redirecionam para o grupo/aba equivalente. O administrador que acessa `#/admin/programas` é direcionado ao novo menu; o acesso do profissional continua independente.

### Conta e acesso
O acesso de uso vem de assinatura paga confirmada e vigente ou cobertura pelo PRO pago e confirmado. Não existe aprovação manual para começar a usar. `users.access_suspended_at` registra somente suspensão administrativa excepcional, com responsável e motivo; a suspensão prevalece sobre o plano sem apagar assinatura ou dados. A aba Suspensões de acesso permite suspender e reativar. Pedidos antigos de liberação ficam apenas no histórico e a migration 058 encerra os pendentes como cancelados.

Aluno coberto pelo PRO acessa fichas, comunidade e desafios disponibilizados pelo personal. Programas e áreas fora desse escopo apresentam a contratação do Individual. Ao adquirir acesso Individual próprio, o aluno passa a usar esses recursos sem análise. A verificação profissional permanece cadastral e informativa: não impede convidar alunos, criar fichas ou publicar; limites do plano, moderação e suspensão continuam sendo aplicados pelo servidor.

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
- `pending`: contas cadastralmente pendentes ou suspensas, verificações cadastrais pendentes, solicitações de vagas abertas, ocorrências não encerradas e mensagens aguardando com prazo vencido. Os atalhos abrem as áreas responsáveis; o resumo de atrasos não impõe filtro novo na fila existente.
- `GET /api/adm/management/invites`: consulta administrativa de convites da comunidade; pendente vencido é exibido expirado sem alterar o registro.
`GET /api/adm/kpis` permanece disponível com os campos anteriores; `capacity` usa a regra atual e acrescenta `finite_used` e `unlimited`.

### Guia do administrador
Abra Visão geral; escolha 7, 30 ou 90 dias. Os gráficos de cadastros e treinos acompanham o período; estoques e capacidade são identificados como situação atual. Em Contas, use Suspensões de acesso somente para fraude, abuso ou violação, informando o motivo; Reativar devolve o acesso ao plano vigente. Para vagas extras, use concessão com motivo e validade; para alterar recursos e plano, use Assinaturas. Guia detalhado em `../docs/como-usar-o-sistema.md`.

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
- Perfil (/perfil): identificação e contexto, Conta, Preferências, Meu plano, Privacidade e segurança, Notificações, Ajuda e Sair. Subpáginas: ?secao=dados|preferencias|privacidade|ajuda. Código e convites em Conta; senha, aparelhos e pedidos de dados em Privacidade e segurança; reiniciar tour em Ajuda. O fluxo de solicitação de liberação foi retirado.
- Notificações (/avisos): Não lidas/Todas; marcar todas como lidas preservado.
- Meu plano (/planos): assinatura, pagamento, recursos atuais e catálogo. Somente pagamento confirmado libera o uso automaticamente em produção.
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
Os grupos atuais são Visão geral, Pessoas, Planos e capacidade, Treinos, Comunidade, Operação e Sistema. Pessoas → Contas reúne Contas, Pendências e Suspensões de acesso. Visão geral mostra pendências e indicadores; análises detalhadas abrem sob demanda, sem repetir atalhos no rodapé.
No celular, tabelas mostram três campos por registro; Ver mais campos expande os demais. Ordenação em seletor, busca, paginação e CSV preservados. Detalhes também abrem por teclado. Desktop mantém tabelas.

### Contratos e código
- frontend/src/lib/navigation.js: destinos e seleção por rota/contexto. frontend/src/components/NavigationAccess.jsx: visibilidade usando GET /api/me/subscriptions. Sem confirmação de um recurso de assinatura, seu atalho opcional fica oculto; Meu plano continua disponível. client_locked restringe programas, biblioteca, músculos, grupos, ranking e diretório.
- frontend/src/styles/organization.css: composição adaptável e detalhes progressivos. As telas existentes continuam responsáveis pelos formulários.
- Extensão necessária: GET /api/pro/dashboard?include_history=1 inclui encerrados/decididos, até 200 por categoria. Sem parâmetro mantém abertos. Profissional e comunidade vêm da autenticação; IDs da URL não alteram o escopo. Não muda endpoints de gravação.
- frontend/src/lib/tours.js: dicas com os novos destinos e acesso por e-mail.

### Validação e limites
Build e testes de frontend locais. frontend/e2e/organization.spec.js usa dados controlados e intercepta todas as APIs, cobrindo navegação por perfil, links restritos, cargas, recuperação de erros, layouts 360/390/768/1440px e temas claro/escuro. Não comprova entrega de e-mail nem persistência no Postgres. Executar após build: npx playwright test --config playwright.organization.config.js, com dependências de teste disponíveis.
api/test/dashboard-history.test.mjs valida a rota isoladamente: visitante/aluno negados, escopo de profissional/comunidade e compatibilidade dos callers anteriores. Executar na API: node --experimental-test-module-mocks --test test/dashboard-history.test.mjs. Não acessa banco real. Validação integrada com dados reais e publicação são etapas separadas.


## Identidade ORNY — 1.2.8 (17/10/2026)

Nome comercial ORNY e slogan “Seu progresso começa aqui”. O símbolo oficial está preservado em `frontend/public/brand/orny-original.png`; os derivados mantêm proporção e gradiente sobre preto. A assinatura completa é extraída do manual visual fornecido. Montserrat identifica títulos/botões e Inter identifica textos, hospedadas no próprio build.

Mapa: login/cadastro/recuperação em `frontend/src/views/Login.jsx`; marca compartilhada em `frontend/src/components/Brand.jsx` e `frontend/src/lib/brand.js`; temas e componentes em `frontend/src/styles/orny.css`; administração em `frontend/src/views/admin/AdminApp.jsx`. A paleta usa verde #20F51B, preto #000000, grafite #1E1E1E e branco. No tema claro, links e textos verdes usam verde escuro para legibilidade; ações primárias verdes usam texto preto. A preferência de tema existente permanece salva no mesmo local e servidor.

PWA: `frontend/public/manifest.json` e `frontend/index.html` definem nome ORNY, fundo preto, favicon e apresentação de compartilhamento. Ícones 180, 192 e 512 pixels e adaptável 512 usam o símbolo com margem; o favicon usa 32 pixels. O original não tem transparência: a apresentação em fundo claro mantém área preta. O nome de exibição Capacitor é ORNY; appId, id/scope/start_url do PWA e chaves de armazenamento não mudam.

A abertura HTML identifica a marca antes de carregar React; falha de script ou espera superior a 20 segundos oferece Tentar novamente. A espera de inicialização React também oferece nova tentativa após 20 segundos, sem atraso mínimo artificial. A tela nativa de abertura é gerada conforme o navegador/aparelho. O mecanismo de atualização existente continua adiando recarga durante treino ativo. Não limpar dados nem desinstalar para aplicar a marca como procedimento padrão.

Comunicações: modelos em `api/email-templates.js` usam ORNY, preto/grafite e verde. Textos comerciais de acesso/assinatura e exportação usam ORNY; remetentes, URLs, razão social, aceites e registros não foram migrados. Conteúdos históricos já gravados e catálogos existentes não são reescritos por esta entrega.

Como usar: entrar e navegar normalmente; usar o controle de tema existente. Instalar pelo botão disponível ou recurso do navegador. A mudança do ícone/nome em instalações antigas depende da plataforma e precisa de conferência em aparelho. Nutrição e IA ilustradas no manual não foram acrescentadas. Nenhum banco, permissão, identificador interno ou regra de treino foi alterado pela identidade. Deploy e distribuição nativa não realizados nesta entrega.

Validação: build, testes unitários, modelos de e-mail e testes de navegador com respostas simuladas; resultados finais registrados abaixo após execução. Teste físico de instalação/atualização e confirmação em produção permanecem separados.

Resultados locais ORNY: build de produção aprovado; 285 testes unitários aprovados; 36 cenários Playwright aprovados com API simulada (login, aluno/profissional/admin, temas claro/escuro, larguras 320/375/768/1280, manifesto/ícones, falha de carregamento e duas prévias de e-mail). A revisão visual incluiu capturas de login e áreas internas. A instalação física e atualização do ícone em PWA existente não foram testadas. Sem deploy ou envio real de e-mails. Não existem scripts de lint/typecheck no pacote frontend; o build verifica a compilação.

Modelos de e-mail: 10 testes aprovados, incluindo escape de conteúdo, links e idempotência. As duas prévias visuais (375 e 1280 pixels) foram aprovadas sem envio de mensagens. A imagem original foi conferida por hash e a margem do ícone adaptável por geometria.

Compatibilidade de produção (17/10/2026): a abertura usa `frontend/public/orny-boot.js` externo e botão com evento registrado por script; não depende de JavaScript inline, bloqueado pela CSP do gateway. A política de segurança é preservada.

## Publicação ORNY — 17/10/2026

Publicada na VPS em https://ornygym.avadesk.com.br/, repositório `/opt/avagym`, commit `1353db7`, build `20261017135618`. Serviços `avagym-api` e `avagym-web` online. Migração pendente `056_boas_vindas.sql` aplicada com `--no-seed`; nenhuma outra migration estava pendente. Backup prévio do banco avagym em formato pg_dump, configuração e dist em `/opt/avagym-backups/20261017_135457_pre-orny`; catálogo do dump verificado com pg_restore --list (não foi executada restauração).

Validação pública: HTTP 200 no site, API /api/health e manifesto ORNY; login mobile abriu com logo carregada, slogan correto e sem erros JavaScript. Nenhuma autenticação, alteração de usuários ou envio real de e-mail foi feito nesta conferência. Instalação física e propagação do ícone em PWA antigo continuam sem confirmação.

Compatibilidade CSP: a publicação externalizou o script de abertura em `dist/orny-boot.js` e removeu onclick inline do HTML gerado, preservando a política de segurança. A mesma correção está salva no código local (`frontend/index.html` e `frontend/public/orny-boot.js`) e precisa integrar o próximo push; o checkout da VPS permaneceu limpo no commit publicado. Até esse push, novo build na VPS precisa preservar essa transformação. Não usar o script antigo /opt/acade-deploy.sh: seus caminhos /opt/acade estão desatualizados; runtime atual fica em /opt/avagym-runtime.

## Cupons personalizados com link de indicação — 1.6.0 (19/10/2026)

Nenhum plano inicia período gratuito automaticamente. Em **Cobrança, preços e cupons → Cupons e campanhas**, o administrador usa **Gerar cupom de indicação**, escolhe qualquer conta do mesmo ambiente como responsável, define um único público — **Aluno — Individual** ou **Profissional — PRO** —, de 1 a 90 dias de acesso, limite positivo de beneficiados e validade opcional. O sistema gera código e link `#/convite/CODIGO`; o código digitado e o link usam a mesma regra.

O link público mostra somente o primeiro nome do responsável, público, dias, validade e disponibilidade. Ao concluir o cadastro, o servidor relê e trava o código e a campanha, valida público, validade, limite, autoindicação e identidade já beneficiada e só então concede o período. Clique, conta existente e cadastro que não recebe o benefício não consomem vaga. No último uso, o bloqueio transacional impede ultrapassar o limite. Cupom pausado, vencido ou esgotado não impede criar a conta; o cadastro termina sem benefício e informa o motivo.

A conta responsável consulta seu próprio código, link, dias, público e usados/limite mesmo sem assinatura ativa. Ela vê nome, identificador público, data e situação dos indicados, nunca telefone ou e-mail. O administrador pode copiar código/link e pausar, reativar ou encerrar a distribuição. Períodos já concedidos conservam a data de encerramento gravada.

Contratos principais: `GET /api/convite?code=`, `GET /api/referral/me`, `POST /api/auth/register` com `coupon`, e `POST /api/adm/billing/referral-coupons`. A migration aditiva `062_cupons_indicacao_personalizados.sql` remove `trial_days` dos planos e pausa somente a campanha automática histórica e seus códigos ainda ativos; não apaga campanhas, resgates ou concessões. Esta implementação e a migration estão preparadas localmente; banco de uso, VPS e produção não foram alterados.

### Como usar

1. Abra **Administração → Cobrança, preços e cupons → Cupons e campanhas** e clique em **Gerar cupom de indicação**.
2. Selecione a pessoa responsável, o público, os dias, o limite e, se necessário, a validade e um código personalizado.
3. Clique em **Gerar cupom e link** e copie o formato que será distribuído.
4. Acompanhe usados/limite na lista; use Pausar ou Reativar sem apagar o histórico.
5. A pessoa responsável abre seu painel de indicação para copiar o próprio link e acompanhar resultados sem dados de contato.

### Validação local

O build de produção do frontend passou e 291 testes unitários passaram. Os arquivos alterados da API passaram na validação sintática e o diff não contém erro de whitespace. Os cenários integrados de cupom foram atualizados, mas não foram executados porque o checkout possui somente configuração de banco de uso e os próprios testes exigem uma base cujo nome termine em `_test`. Nenhuma migration foi aplicada, nenhum serviço foi reiniciado e a produção não foi alterada.

## Pagamentos Asaas — cartão e Pix preparados para produção (17/10/2026)

### Preços oficiais e preparação da produção — 18/10/2026

Os preços oficiais do beta são Individual por R$ 12,90/mês, Personal 15 por R$ 39,90/mês e Personal Ilimitado por R$ 79,90/mês. O Personal 15 permite até 15 alunos ativos; o Personal Ilimitado não impõe limite numérico. A migration 063 registra os dois planos profissionais com a venda fechada (`sellable=false`), para que aplicar o banco ou configurar o provedor não abra cobranças ao público antes da homologação.

O webhook de produção é `POST https://ornygym.avadesk.com.br/api/billing/webhook/asaas`, autenticado pelo cabeçalho `asaas-access-token`. API Key e token do webhook são segredos distintos e ficam somente no `.env` privado da VPS. Segredo exposto em chat, chamado, print ou log deve ser revogado e substituído antes do uso. Asaas em produção, plano vendável e monetização pública são três controles separados: a venda só é aberta depois de cobrança real controlada, confirmação do webhook, idempotência, conciliação e estorno.

Estado operacional em 18/10/2026: backup `/opt/avagym-backups/20261018_164911_pre-asaas-production` criado e validado pelo catálogo do `pg_restore`. O banco de produção recebeu os preços anteriores mantendo os planos fora de venda. A migration 063 substitui a oferta profissional por Personal 15 e Personal Ilimitado, também com `sellable=false`. A resposta pública confirmou `purchasable=false` e o webhook sem token respondeu 401. O provedor continua `asaas` em `sandbox` e a monetização continua desligada. A troca para produção não foi feita porque a API Key e o token informados em chat precisam ser revogados e substituídos no painel Asaas; nenhum dos valores expostos foi reutilizado.

Na troca do Personal Ilimitado para o Personal 15, alunos existentes não são removidos. Se houver mais de 15 ativos, a conta fica acima do limite e novos vínculos são bloqueados até liberar vagas ou retornar ao Ilimitado. No plano ilimitado, `effective_limit` e `available` são `null` na API e aparecem como **Ilimitado** na interface, nunca como zero. Cupons de período gratuito para profissionais continuam concedendo o Personal 15.

O checkout permite escolher cartão de crédito ou Pix. Cartão mantém assinatura mensal e renovação automática. Pix inicial gera QR Code e copia e cola com validade de 24 horas e não libera o plano antes da confirmação do webhook. Um Pix vencido pode ser regenerado sem criar outra assinatura; na renovação, o sistema gera nova cobrança cinco dias antes do fim do período pago, avisa o usuário e respeita a carência configurada. Assinatura Pix nunca tenta cobrar cartão.

Contratos: `POST /api/billing/subscribe` aceita `payment_type` igual a `card` ou `pix`; `card_id` é obrigatório somente para cartão. `GET /api/billing/me` informa o tipo e o Pix pendente ao titular. `POST /api/billing/pix/regenerate` exige propriedade da assinatura; `POST /api/billing/pix/confirm-test` existe apenas no simulador. A migration aditiva `057_cobranca_pix.sql` identifica o meio de pagamento e guarda somente apresentação/expiração da cobrança Pix. Cartões guardam apenas o token do provedor, nunca número ou CVV.

Uma conta pode cadastrar o meio de pagamento e adquirir um plano sem aprovação administrativa. Quando a contratação é confirmada, o plano fica disponível imediatamente; pagamentos recusados ou pendentes não liberam os recursos pagos. Teste válido e cobertura pelo PRO seguem a mesma regra automática. Suspensão administrativa explícita continua prevalecendo até a reativação.

Contrato transitório: `GET /api/me/unlock-request` informa que o fluxo foi aposentado e expõe apenas eventual suspensão; `POST /api/me/unlock-request` retorna 410 com `UNLOCK_FLOW_RETIRED` ou `ACCESS_SUSPENDED`. O bloqueio comercial usa `ACCESS_REQUIRED`, o escopo do aluno PRO usa `CLIENT_SCOPE` e a suspensão usa `ACCESS_SUSPENDED`. A migration aditiva `058_acesso_comercial_suspensao.sql` cria os campos explícitos, ativa perfis profissionais antigos em análise e cancela solicitações pendentes sem apagar histórico.

Segurança: o webhook Asaas valida token em tempo constante e eventos repetidos são idempotentes. QR Code e copia e cola ficam sob autenticação e vínculo do usuário. O provedor Asaas exige API Key e token de webhook completos; ambiente e prefixo da chave precisam corresponder. Configuração inválida impede a API de iniciar e nunca retorna silenciosamente ao simulador. Segredos ficam somente no `.env` privado da API e não aparecem em endpoint, frontend, documentação ou log.

Ativação: o código pode ser publicado mantendo `BILLING_PROVIDER=simulado`. Para cobrança real, concluir aprovação/prova de vida da conta, chave Pix e tokenização de cartão; cadastrar chave e webhook no Asaas; conferir preços, venda, monetização e carência; aplicar migrations; preencher as quatro variáveis privadas; executar `pm2 restart avagym-api --update-env`; confirmar **Asaas (produção)** no admin e realizar cobrança controlada de baixo valor. O checklist, retorno ao teste e diagnóstico seguro ficam em `docs/sistema/21-asaas-ambientes.md` e `docs/DEPLOY-VPS.md`.

Estado desta entrega: publicada na VPS em 17/10/2026 no commit `288793a`. A migration `057_cobranca_pix.sql` foi aplicada após backup validado, o frontend foi recompilado e `avagym-api`/`avagym-web` foram reiniciados. Saúde da API e site retornaram sucesso, a coluna `payment_type` foi confirmada no banco e o build publicado contém o fluxo Pix. O provedor permaneceu em simulador; nenhuma chave Asaas real foi usada e nenhuma cobrança real foi ativada. A confirmação visual autenticada do rótulo no painel administrativo continua sendo uma conferência operacional do administrador.

Backup pré-publicação: `/opt/avagym-backups/20261017_223142_pre-asaas-pix`, contendo dump PostgreSQL validado pelo catálogo do `pg_restore`, `.env`, configuração PM2 e commit anterior. O backup do `.env` permanece com permissão restrita.

## Ajuda, suporte e identificação da ORNY (17/10/2026)

Perfil → Ajuda passa a aparecer como **Ajuda e suporte**. A tela mantém **Rever orientações** e consulta `GET /api/legal/company` para mostrar **Enviar e-mail ao suporte** quando o administrador informou um e-mail válido. O botão usa o aplicativo de e-mail do aparelho (`mailto:`); o sistema não envia a mensagem nem armazena seu conteúdo. Sem e-mail configurado, a tela informa claramente que o contato ainda não foi cadastrado.

No painel administrativo, Sistema → Dados da empresa continua sendo a fonte dos marcadores usados nos documentos legais. Quando o cadastro estiver vazio, o sistema apresenta como base a razão social `67.790.913 LUCAS RODRIGUES DA TRINDADE`, nome fantasia ORNY, CNPJ `67.790.913/0001-20`, foro Brasília/DF e a mesma inscrição como **Chave Pix da empresa**. O botão **Preencher pela Receita** permanece restrito ao administrador, valida o CNPJ e traz somente dados públicos para revisão antes de salvar. A consulta confirmou situação cadastral ativa, mas não forneceu e-mail nem endereço completo; esses dados permanecem sob preenchimento e conferência do administrador.

Onde olhar no código: contato em `frontend/src/views/guided/Profile.jsx`; formulário administrativo e apresentação dos documentos em `frontend/src/views/app/Legal.jsx`; validação, valores-base, consulta externa e persistência por tenant em `api/legal.js`.

Validação desta entrega: build de produção aprovado; 289 testes unitários do frontend aprovados; 2 testes unitários específicos da identificação empresarial, formatação e validade do CNPJ aprovados. A primeira execução do Vitest dentro do sandbox falhou antes de carregar os testes por `EPERM` ao renomear o cache temporário; a repetição no runtime normal passou integralmente. Nenhum dado foi gravado em produção e nenhum e-mail foi enviado.

## Auditoria 360° de prontidão SaaS (18/10/2026)

A auditoria funcional, técnica, de segurança, monetização, operação e mercado está registrada em `docs/auditoria-saas/`. Ela avaliou principalmente o corte `1353db7` e as alterações locais de cobrança existentes no início do trabalho; durante a execução, o checkout avançou externamente até `ae28831`, com publicação de PIX documentada no commit `288793a` e provedor mantido em simulador. Os relatórios preservam essa separação e não tratam o avanço posterior como revalidação automática.

Decisão da auditoria: manter somente beta controlado e adiar lançamento comercial amplo até provar o fluxo cadastro → contratação → confirmação → acesso sem liberação manual, validar provedor real e idempotência, estabilizar as fixtures E2E, concluir configuração legal e fechar os itens P1. A auditoria não alterou regra de negócio, funcionalidade, infraestrutura, dados de produção ou configuração de cobrança.

### Correções posteriores à auditoria — candidato local (18/10/2026)

O candidato local permite contratação pelas rotas de cobrança mesmo quando existe suspensão de acesso, sem liberar as demais ações. Conta nova segue o plano comercial e não depende mais da antiga fila manual; suspensão administrativa continua separada, explícita e auditável. As suites do simulador passaram 14/14 em cobrança e 7/7 em assinatura.

A migration `058_acesso_comercial_suspensao.sql` teve o backfill reescrito com CTE para ser aceito pelo PostgreSQL e foi validada junto de todas as migrations em banco novo isolado. As fixtures locais agora registram `legal_acceptances` para administrador e profissionais. Dados legais obrigatórios, incluindo provedor e país da hospedagem, são validados antes de salvar; em produção, cadastro e aceite ficam bloqueados enquanto a identificação legal estiver incompleta. Desenvolvimento pode manter `REQUIRE_LEGAL_CONFIG=false`, mas `NODE_ENV=production` sempre exige completude.

Dependências do frontend/mobile foram atualizadas na linha compatível do Capacitor 7, Vitest foi atualizado e `@capacitor/assets` deixou de ser dependência permanente (continua disponível sob demanda conforme `docs/MOBILE.md`). O `npm audit` passou sem vulnerabilidades. Cobrança permanece em `BILLING_PROVIDER=simulado` e `ASAAS_ENV=sandbox`; nenhuma cobrança real ou publicação foi feita nesta correção.

### Parecer de distribuição e viabilidade — revalidação de 18/10/2026

O parecer vigente autoriza somente **beta controlado por convite no sandbox**. A venda pública ampla continua condicionada à definição dos preços, retirada do estado “Em breve” do PRO, homologação ponta a ponta do Asaas, dados legais reais completos, backup/restore testado e jornada E2E de cadastro e assinatura aprovada. O estudo financeiro não promete lucro: apresenta cenários de receita e exige validação com clientes pagantes. Detalhes e critérios em `docs/auditoria-saas/14-DECISAO-DISTRIBUICAO-E-VIABILIDADE.md`.
