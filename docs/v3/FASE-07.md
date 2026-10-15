# Fase 7 â€” dados do usuÃ¡rio no PostgreSQL (fim do armazenamento no navegador/arquivo)

## InventÃ¡rio
| Onde | Chave / arquivo | O que Ã© | ClassificaÃ§Ã£o | Destino |
|---|---|---|---|---|
| API `server.js` | `DATA_DIR/state-<uuid>.json` (`GET/PUT /api/data`) | treino livre: rotinas, semana, treinos livres, pesos, metas, preferÃªncias, lembrete | dado do usuÃ¡rio | **Postgres `user_app_state.state`** |
| API `PUT /api/data` | `state.active` (descartado antes) | treino livre em andamento | dado do usuÃ¡rio | **`user_app_state.active_workout`** |
| front `lib/guided.js` | `avagym_guided_session_v1` | treino guiado/ficha em andamento (retomar) | dado do usuÃ¡rio | **`guided_live_sessions`** (localStorage = cache offline) |
| front `Onboarding/Today` | `ag_onb_skip` | "Agora nÃ£o" do onboarding | preferÃªncia da conta | **`users.onboarding_skipped_at`** |
| front `store/useStore.js` | `gym_state_v1` | cÃ³pia local do treino livre | cache | fica como cache offline; fonte = banco |
| front `useStore.js` | `gym_dirty` | marcador "falta sincronizar" | tÃ©cnico/offline | fica |
| front `useStore.js` | `gym_user` | cache do usuÃ¡rio logado para abrir rÃ¡pido | cache de UI | fica (o login real Ã© o cookie/JWT) |
| front `useStore.js` | `gym_guest` | modo visitante ("Usar sem conta") | modo visitante | fica (ver decisÃ£o) |
| front `lib/guided.js` | `avagym_guided_queue_v1` | fila de treinos salvos sem internet | offline | fica (precisa existir sem rede) |
| front `lib/guided.js` | `avagym_guided_last_v1` | Ãºltimo resumo para reabrir "ConcluÃ­do" | cache de UI | fica (o treino salvo jÃ¡ estÃ¡ em `sessions`) |
| front `views/app/Desafios.jsx` | sessionStorage `DRAFT_KEY` | rascunho do assistente de desafio na aba | efÃªmero de UI | fica |
| front `lib/demo.js`, `lib/mobile.js` | build demo / app nativo | sem servidor | fora do escopo web | fica |
| API `db.json` | `users` (ponte do cookie `gymsid`), `subs` (push), `invites` legados | legado openGym | tÃ©cnico | **pendente** (prÃ³xima fase: push_subscriptions e fim do gymsid) |
| Auth | cookie httpOnly `avagym_token` (JWT) | sessÃ£o | jÃ¡ correto | â€” |
IndexedDB: nÃ£o usado.

## Implementado
- MigraÃ§Ã£o `023_estado_app_postgres.sql` (+ `down/023_down.sql`): `user_app_state` (user_id PK, tenant_id, state jsonb,
  active_workout jsonb, client_ts, timestamps, Ã­ndices tenant e lembrete, RLS por tenant), `guided_live_sessions`
  (idem), `users.onboarding_skipped_at`. Grants para `avagym_app`.
- `app/api/appstate.js`: `GET/PUT /api/data` (agora Postgres; aceita JWT e o cookie legado), `GET/PUT /api/me/live-session`,
  `POST /api/me/live-session/clear`, `POST /api/me/onboarding/skip`. ValidaÃ§Ã£o de formato e tamanho; 401 sem login.
  Leitura com importaÃ§Ã£o preguiÃ§osa do arquivo legado se a conta ainda nÃ£o tem linha.
- `server.js`: lembretes push, admin "treinos do aluno" e LGPD (exportar/apagar) leem/apagam no banco.
- `guided.js` (API): `GET /api/guided/state` devolve `onboarding_skipped`.
- `scripts/importar-estado-legado.mjs`: importaÃ§Ã£o Ãºnica dos `state-*.json` (idempotente, nÃ£o sobrescreve estado mais
  novo, preserva os arquivos). Rodado localmente: **3 contas importadas**.
- Front: `pullState` recupera tambÃ©m o treino livre em andamento do banco; treino guiado em andamento sobe para o banco
  (debounce) e Ã© recuperado em outro aparelho; "Agora nÃ£o" grava na conta.
- **ImportaÃ§Ã£o Ãºnica no cliente** (`lib/localImport.js`, chamada apÃ³s o login no `pullState`): se o banco nÃ£o tem estado
  e o navegador tem, o treino livre local sobe (`PUT /api/data`); `ag_onb_skip` antigo vira `onboarding_skipped_at` e a
  chave Ã© apagada; treino guiado em andamento do banco Ã© restaurado no aparelho.

## Visitante ("Usar sem conta") â€” decisÃ£o
Visitante continua sÃ³ no aparelho (sem conta nÃ£o hÃ¡ onde gravar no banco). Ao criar conta/entrar, o `pullState` envia
os dados locais para o banco se a conta ainda estiver vazia (migraÃ§Ã£o no cadastro). Registrado como decisÃ£o.

## Removido da interface â€” "Sobre e licenÃ§a" e crÃ©ditos
**DecisÃ£o explÃ­cita do Lucas, mesmo com o aviso de que AGPL-3.0 (openGym) e CC BY-SA 4.0 (Z-Anatomy) exigem
atribuiÃ§Ã£o/oferta do cÃ³digo-fonte aos usuÃ¡rios.** Removido de: `views/guided/Profile.jsx` (bloco "Sobre e licenÃ§a" +
link CÃ³digo-fonte), `views/Login.jsx` (linha de crÃ©dito Z-Anatomy/openGym), `views/Settings.jsx` ("About & license"),
`views/MuscleMap.jsx` (crÃ©dito do modelo 3D na tela Corpo 3D). `LICENSE`, `` e `public/models/CREDITS.md`
continuam no repositÃ³rio, intocados. Risco jurÃ­dico: ver `docs/v3/03-MATRIZ-RASTREABILIDADE.md` (bloqueio AGPL).

## Testes
- `v3-fase7` 25/25 (401 sem login, salvar/ler estado, treino livre em andamento, linha com tenant/carimbo, isolamento
  entre contas, estado invÃ¡lido, admin lÃª do banco, aluno sem acesso Ã  rota admin, sessÃ£o guiada salvar/recuperar/limpar/
  isolada, "Agora nÃ£o" por conta, importador: sÃ³ usuÃ¡rios existentes, nÃ£o sobrescreve mais novo, preserva arquivo, idempotente).
- RegressÃ£o: v3-fase6 23/23, v3-fase5 35/35, v3-fase4 36/36, v3-fase3 27/27, v3-fase2 34/34, **smoke 451/451**,
  vitest 226/226, `vite build` ok. API local reiniciada com o cÃ³digo novo (4449/8787 no ar).

## Rollback
`023_down.sql` (apaga as tabelas novas â€” exportar antes) â†’ `git revert`. Backup: `backups/avagym_20261015_115103_antes_v3_fase07.dump`.
Os `state-*.json` originais nÃ£o foram alterados.

## PendÃªncias / nÃ£o definido
- `db.json` ainda guarda a ponte do cookie `gymsid`, inscriÃ§Ãµes de push e convites legados â†’ mover para Postgres (prÃ³xima fase).
- Cache local (`gym_state_v1`, `gym_user`, fila offline) mantido por funcionar sem internet; decidir se o app deve exigir conexÃ£o.
- Conflito entre aparelhos: vence o carimbo mais novo (`_ts`), como antes; sem mesclagem campo a campo.
- Deploy: checklist em `docs/v3/DEPLOY-V3.md` (nÃ£o executado).
