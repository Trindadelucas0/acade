# ORNY/AVAGYM — Checklist de validação UX

Data: 20/10/2026

## Automatizado

- [x] Testes unitários/componentes após o lote: 30 arquivos e 310 testes aprovados.
- [x] Build de produção após o lote: concluído com Vite 8.1.5.
- [x] E2E direcionado de treino: edição direta de carga/repetições, série, conclusão e progresso aprovado com respostas controladas.
- [x] Suíte autenticada controlada: 17 cenários aprovados em 320/390/768/1280 px, claro/escuro, bloqueios, ativação, treino e #TáPago.
- [ ] E2E autenticado amplo: catálogo ausente no banco local; suíte agora pula apenas o aluno com aviso de `SEED_PROGRAMS=1`, sem abortar profissional/admin.
- [x] Landing pública: 18 cenários Playwright aprovados, incluindo axe e ausência de overflow em 375, 800 e 1280 px.
- [ ] Axe nas jornadas autenticadas principais.
- [ ] PWA/offline e atualização de service worker.

## Matriz visual

- [ ] 360 × 800 — claro e escuro autenticado.
- [ ] 390 × 844 — claro e escuro.
- [ ] 768 × 1024 — claro e escuro.
- [x] Landing inspecionada em 375 e 1280 px; cenários automatizados também passaram em 800 px.
- [ ] 1440 × 900 — claro e escuro autenticado.
- [ ] Teclado virtual sem cobrir carga/repetições.
- [ ] Zoom 200% e ausência de rolagem horizontal indevida.

## Jornadas

- [ ] Cadastro e onboarding preservam os dados em erro.
- [ ] Início prioriza continuar/começar/encontrar treino.
- [ ] Ficha profissional continua prioritária.
- [ ] Carga e repetições funcionam por digitação e botões.
- [ ] Repetir série anterior não conclui a série automaticamente.
- [ ] Pausa, retomada, descanso e recuperação mantêm uma sessão única.
- [ ] Conclusão offline mantém os dados no aparelho.
- [ ] #TáPago não publica sem confirmação.
- [ ] Progresso não inventa tendência com menos de dois treinos.
- [ ] Aluno não alcança rotas de profissional/admin.

## Não validado neste trabalho

- Cobrança real e webhook.
- Banco de produção.
- Publicação externa real.
- Android/iOS físico e Capacitor standalone.
- Leitor de tela em dispositivo físico.
- Jornada autenticada completa: API e PostgreSQL locais iniciaram fora do sandbox, mas o catálogo local não possuía programas para criar uma sessão de treino. O seed de programas é deliberadamente restrito a bases de teste com `SEED_PROGRAMS=1`. Não foi aplicado seed nem alterado o banco de uso para contornar o bloqueio.

