# ORNY/AVAGYM — Relatório final de implementação

Data: 20/10/2026  
Versão: frontend 1.10.1

## Correção local posterior — cadastro, planos e aceite jurídico

- Corrigida a divergência em que o catálogo local exibia planos precificados, mas cadastro e contratação ainda exigiam a flag de venda real mesmo usando o simulador.
- A exceção ficou limitada a ambiente não produtivo com provedor `simulado`; produção continua exigindo plano explicitamente vendável.
- A configuração jurídica padrão passou a completar apenas campos ausentes, preservando valores personalizados.
- Carregamento e erro de rede dos documentos receberam estados próprios e ação de nova tentativa.
- A configuração local passou a aceitar tanto `localhost:4449` quanto `127.0.0.1:4449`; ambos foram confirmados com login HTTP 200.
- A conta `TESTE@TESTE.COM` recebeu concessão de QA local sem assinatura ou cobrança. O backend reconhece essa concessão apenas fora de produção com o provedor simulado; a trava de pagamento real da VPS permanece inalterada.
- Validação local: migration 068 aplicada e repetida sem nova alteração; endpoints de saúde, planos e dados jurídicos aprovados; 310/310 testes de frontend e build de produção aprovados; 6/6 testes focados da correção aprovados.
- Não houve acesso, deploy ou alteração na VPS e nenhuma cobrança real foi criada.

## Telas modificadas

- **Início:** o treino e sua ação principal aparecem antes do progresso semanal.
- **Execução:** carga e repetições ganharam edição direta, mantendo os botões de ajuste.
- **Execução:** a partir da segunda série, os valores da série anterior podem ser reaplicados.
- **Progresso:** o gráfico semanal só aparece quando há pelo menos dois treinos.
- **Carregamento:** telas de aluno, profissional e administração passaram a ser carregadas por rota, sem alterar URLs ou permissões.

## Componentes reutilizados

- `NumberField`, `Icon`, botões e feedback existentes.
- Armazenamento local e sincronização da sessão já existentes.
- Estados de loading, bloqueio, offline, diálogo e toast já existentes.

## Contratos preservados

- O lote inicial não alterou rotas, preços ou permissões. A correção 1.10.1 adicionou a migration jurídica 068 e uma regra exclusivamente local para permitir testes com o simulador, preservando as travas de produção.
- Nenhum dado existente é removido ou convertido.
- #TáPago continua publicando somente após confirmação explícita.

## Validação

Testes unitários/componentes: 30 arquivos e 310 testes aprovados, incluindo as garantias específicas deste lote. Build Vite 8.1.5 aprovado para a versão 1.10.0. Com carregamento por rota, o bundle principal caiu de aproximadamente 2.008 MB (442 KB gzip) para 519 KB (161 KB gzip), redução aproximada de 74% no arquivo inicial. Body3D permanece isolado em 950 KB (256 KB gzip) e só é solicitado na visualização 3D.

A suíte Playwright autenticada com respostas controladas passou em 17 cenários: 320, 390, 768 e 1280 px, temas claro/escuro, bloqueios comerciais, ativação, falha e nova tentativa, treino e #TáPago. O treino confirmou edição direta de carga com vírgula decimal, edição de repetições, início e conclusão da série e chegada ao progresso. A execução também encontrou e corrigiu um efeito assíncrono antigo do #TáPago que devolvia uma Promise como limpeza e podia derrubar a tela ao navegar.

Na landing pública, 18 cenários Playwright passaram: conteúdo, navegação, planos, tema, acessibilidade e ausência de overflow em 375, 800 e 1280 px. As capturas de 375 e 1280 px foram inspecionadas.

A auditoria autenticada ampla foi iniciada com API e PostgreSQL locais, mas o perfil de aluno não chegou à sessão porque o catálogo desse banco não devolveu programas. A causa foi confirmada: programas de demonstração só são carregados em banco de teste iniciado com `SEED_PROGRAMS=1`. A suíte visual agora registra esse pré-requisito como cenário não executado, sem abortar as verificações de profissional e administrador. Não foi aplicado seed nem alterado o banco de uso para mascarar a ausência. As telas autenticadas ainda permanecem sem aprovação visual completa em todos os perfis e resoluções.

Não houve deploy, migration, cobrança ou acesso a produção.

## Riscos restantes

- Body3D e os pacotes de idiomas continuam grandes, embora estejam fora do carregamento inicial.
- E2E autenticado amplo requer ambiente e contas de teste por perfil.
- Aparelhos físicos e leitores de tela permanecem pendentes.

