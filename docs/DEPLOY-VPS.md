# Deploy V5 na VPS (AVAGYM): checklist

> Preparado em 2026-10-16 **sem conectar na VPS**. Nada aqui foi executado na VPS.
> Executar só com o Lucas acompanhando e com aprovação de cada comando marcado **[APROVAR]**.
> A senha root **não** é gravada em arquivo, log, variável ou script. Ela só é digitada pelo Lucas, no terminal dele, uma única vez (passo A3).

## Como o deploy é feito hoje (conferido no repositório)
- **Produção não usa Docker.** `ATUALIZAR-VPS.txt` e `docs/v3/DEPLOY-V3.md`: código em `/opt/acade` (checkout git), **PM2** com `/opt/acade-runtime/ecosystem.config.cjs` e os processos `acade-api` (API Node) e `acade` (front), site `https://avagym.avadesk.com.br`, atalho `/opt/acade-deploy.sh` (faz `git pull`, `npm ci`, build e restart; **não** roda migrations).
- `app/docker-compose.yml`, `app/Dockerfile`, `app/api/Dockerfile` e `app/web/Dockerfile` são herança do openGym (imagens `ghcr.io/duartesantos8/opengym-*`; o Dockerfile da API copia só `server.js`, então **não serve para a V5**). Não usar.
- `app/web/nginx.conf` e `app/web/security-headers.inc` são da imagem Docker. **O nginx da VPS é do host** e a configuração dele não está no repositório: o HSTS (BUG-008) precisa ser conferido ou incluído lá (passo B3/F).
- Como aqui trabalhamos sem git, o envio é por **pacote** (`app/scripts/deploy-pack.ps1`), e não por `git pull`. Os arquivos sobrescritos ficam como alteração local no checkout da VPS; o commit de antes fica guardado para o rollback.

## A. Acesso: chave SSH a partir do PC do Lucas (uma vez)
O PC já tem `~/.ssh/id_ed25519` (usada para outros hosts). Proposta: uma chave **só para a VPS**.
1. **[APROVAR]** Gerar a chave (local, não conecta):
   `ssh-keygen -t ed25519 -f $HOME\.ssh\id_ed25519_avagym -C "lucas-pc avagym-vps" -N '""'`
   (sem frase-senha para os comandos poderem rodar sem digitar nada; alternativa mais segura: com frase-senha + `ssh-agent`).
2. Conferir a impressão digital do servidor, que já está no `known_hosts` (local): `ssh-keygen -F 187.127.3.250 -l`. O Lucas compara com o painel da VPS. Se não bater, **parar**.
3. **[O LUCAS EXECUTA no terminal dele, digitando a senha quando pedir]**: instala a chave pública (o Windows não tem `ssh-copy-id`):
   `type $HOME\.ssh\id_ed25519_avagym.pub | ssh root@187.127.3.250 "umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys"`
   Eu não posso digitar a senha (meu terminal não é interativo) e nem devo recebê-la.
4. **[APROVAR]** Atalho no `~/.ssh/config` (local):
   ```
   Host avagym-vps
       HostName 187.127.3.250
       User root
       IdentityFile ~/.ssh/id_ed25519_avagym
       IdentitiesOnly yes
   ```
5. **[APROVAR]** Testar sem senha: `ssh -o BatchMode=yes avagym-vps "echo ok; hostname"`.
6. (Opcional, decisão do Lucas, **depois** de o passo 5 funcionar) desligar login root por senha (`PasswordAuthentication no` / `PermitRootLogin prohibit-password`). Não está no plano padrão: se a chave se perder, só o console do provedor resolve.

## B. Levantamento na VPS (somente leitura)
1. **[APROVAR]** `ssh avagym-vps "cd /opt/acade && git rev-parse HEAD && git status --short | head -50; node -v; pm2 ls; cat /opt/acade-runtime/ecosystem.config.cjs; cat /opt/acade-deploy.sh"`
2. **[APROVAR]** `.env` **sem segredos** (só os nomes e as variáveis não sensíveis):
   `ssh avagym-vps "sed -E 's/^((DB_PASSWORD|JWT_SECRET|STORAGE_SIGNING_SECRET|RESEND_API_KEY|SMTP_PASS|ASAAS[A-Z_]*)=).*/\1***/' /opt/acade/app/api/.env"`
3. **[APROVAR]** nginx e HSTS: `ssh avagym-vps "nginx -T 2>/dev/null | grep -nE 'server_name|Strict-Transport|proxy_pass|root |include' | head -60"`
4. **[APROVAR]** Migrations e mídia: `ssh avagym-vps "cd /opt/acade/app/api && sudo -u postgres psql -d \$(grep ^DB_NAME= .env | cut -d= -f2) -Atc 'select name from schema_migrations order by name' | tail -5; ls -la \$(grep ^DATA_DIR= .env | cut -d= -f2); du -sh uploads private 2>/dev/null; df -h /"`
   Esperado: última migration 042 ou anterior (a V5 local vai até a **044**).

## C. Backup (obrigatório, antes de tudo)
**[APROVAR]** (um comando só; `DB_NAME` e `DATA_DIR` lidos do `.env` da VPS):
```
ssh avagym-vps 'set -e; cd /opt/acade/app/api; TS=$(date +%Y%m%d_%H%M%S); B=/opt/acade-backups; mkdir -p $B;
DB=$(grep ^DB_NAME= .env | cut -d= -f2); DD=$(grep ^DATA_DIR= .env | cut -d= -f2);
sudo -u postgres pg_dump -Fc -d "$DB" -f $B/avagym_${TS}_antes_v5.dump;
tar czf $B/data_${TS}.tgz -C "$(dirname "$DD")" "$(basename "$DD")";
tar czf $B/midia_api_${TS}.tgz -C /opt/acade/app/api uploads private 2>/dev/null || true;
cp .env $B/env_${TS}.bak; chmod 600 $B/env_${TS}.bak;
cd /opt/acade && git rev-parse HEAD > $B/commit_antes_${TS}.txt && tar czf $B/codigo_${TS}.tgz app/api app/frontend --exclude=node_modules --exclude=uploads --exclude=private;
ls -la $B | tail -8; echo TS=$TS'
```
Conferir: o dump tem tamanho maior que zero e `pg_restore -l` lista as tabelas. **[APROVAR]** `ssh avagym-vps "pg_restore -l /opt/acade-backups/avagym_<TS>_antes_v5.dump | head"`.

## D. Enviar só os arquivos do app
1. **[APROVAR]** Montar o pacote (local, não conecta): `powershell -File F:\academia\acade\app\scripts\deploy-pack.ps1`
   Inclui: `api/*.js`, `api/package*.json`, `api/.env.example`, `api/billing`, `api/db` (migrations, down, `migrate.js`, seeds), `api/scripts`, `api/storage`, `frontend/src`, `frontend/public`, `frontend/index.html`, `frontend/package*.json`, `frontend/vite.config.js`.
   Fica de fora (e o script **falha** se aparecer): `test/`, `e2e/`, `prints/`, `test-artifacts`, `uploads/`, `private/`, `data/`, `node_modules`, `.env`, `*.bak*`, logs, `dist` (o build é feito na VPS).
   Ensaio de hoje: `deploy/avagym_20261016_153041.tgz`, 11,1 MB, 385 arquivos, com manifesto e `.sha256`.
2. **[APROVAR]** `scp F:\academia\acade\deploy\avagym_<stamp>.tgz F:\academia\acade\deploy\avagym_<stamp>.tgz.sha256 avagym-vps:/opt/acade-backups/`
3. **[APROVAR]** Conferir e extrair por cima do checkout (não apaga nada que já exista):
   `ssh avagym-vps "cd /opt/acade-backups && sha256sum -c avagym_<stamp>.tgz.sha256 && tar xzf avagym_<stamp>.tgz -C /opt/acade/app && cd /opt/acade/app/api && npm ci --omit=dev && cd ../frontend && npm ci && npm run build"`

## E. Variáveis de ambiente novas ou revistas (`/opt/acade/app/api/.env`)
Editar **na VPS**, com o Lucas. Segredo gerado lá mesmo, sem passar por aqui:
`ssh avagym-vps "node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\""`. O valor vai direto para o `.env` (nano/sed), sem ser colado no chat.
| Variável | Valor | Por quê |
|---|---|---|
| `JWT_SECRET` | já existe (≥ 32 caracteres). **Não trocar** (derruba todas as sessões) | também assina as URLs de mídia se não houver a próxima |
| `STORAGE_SIGNING_SECRET` | novo segredo aleatório (recomendado) | URLs assinadas de mídia privada; antes vinha do arquivo `DATA_DIR/secret`, que agora foi para o banco |
| `DATA_DIR` | manter o atual (onde estão `db.json`, `state-*.json`, `secret`, `vapid.json`) | na primeira subida da V5 esses arquivos são importados para o Postgres e renomeados `*.importado-*`; uploads novos vão para `DATA_DIR/uploads`, documentos para `DATA_DIR/private-docs` e avatares para `DATA_DIR/public-media` |
| `TRUST_PROXY` | não definir (padrão: confia em `X-Real-IP`/`CF-Connecting-IP`) | atrás do nginx do host é o certo. Só use `off` se a API ficar exposta direto (aí o IP vem do socket) |
| `CSRF_ALLOWED_ORIGINS` | vazio, ou `https://www.avagym.avadesk.com.br` se houver outro domínio | o `ORIGIN` já é aceito; lista extra separada por vírgula |
| `ORIGIN` | `https://avagym.avadesk.com.br` | links, passkeys, CSRF |
| `RP_NAME` | `AVAGYM` | BUG-007 |
| `NODE_ENV` | `production` (conferir no ecosystem) | desliga o atalho de desbloqueio de e-mail de teste e a rota de reset do rate limit |
| `HOST` | `127.0.0.1` | API só atrás do nginx |
| `AUDIT_RETENTION_DAYS` | opcional (padrão 180; também ajustável na tela Logs) | retenção do `request_audit` |
| **não** colocar | `RATE_LIMIT=off`, `TEST_RL_RESET`, `E2E_AUTO_UNLOCK_DOMAIN`, `SEED_PROGRAMS` | só para teste |

## F. Migrations até a 044 e mídia
1. **[APROVAR]** `ssh avagym-vps "cd /opt/acade/app/api && node db/migrate.js --no-seed"`
   Aplica as pendentes (até `043_estado_banco_auditoria`, `044_ponte_legada_nomes`). Lição do BUG-018: a API **só** sobe depois da 044.
2. **[APROVAR]** Mídia para o `DATA_DIR`. Primeiro a simulação, depois aplicar (copia só o que o banco cita e **nunca apaga**):
   `ssh avagym-vps "cd /opt/acade/app/api && node scripts/migrar-midia-data-dir.mjs --lista /opt/acade-backups/midia_simulacao.tsv"`
   `ssh avagym-vps "cd /opt/acade/app/api && node scripts/migrar-midia-data-dir.mjs --aplicar --lista /opt/acade-backups/midia_aplicada.tsv"`
3. **[APROVAR]** HSTS no nginx do host (BUG-008), se o passo B3 mostrou que falta: incluir `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;` no `server` 443 do site (o comando exato depende do arquivo encontrado em B3), depois `nginx -t && systemctl reload nginx`.

## G. Reinício
**[APROVAR]** `ssh avagym-vps "pm2 restart /opt/acade-runtime/ecosystem.config.cjs --update-env && pm2 save && sleep 5 && pm2 logs acade-api --lines 40 --nostream && pm2 logs acade --lines 20 --nostream"`
Esperado no log: `[legacy] db.json importado…`, `chave vapid importada…`, `state-*.json importados`, `gym-api on 127.0.0.1:…`, sem erro.

## H. Smoke test (sem criar contas em produção)
**[APROVAR]**
```
curl -sS https://avagym.avadesk.com.br/api/health
curl -sSI https://avagym.avadesk.com.br/ | grep -iE "^HTTP|strict-transport|content-security|x-frame"
curl -sS https://avagym.avadesk.com.br/manifest.json | grep -E '"name"|theme_color|background_color'
curl -sS https://avagym.avadesk.com.br/ | grep -o "<title>[^<]*</title>"
curl -sS -o /dev/null -w "%{http_code}\n" https://avagym.avadesk.com.br/api/adm/logs   # esperado 401
```
Esperado: health `ok` com o mesmo número de usuários de antes; `strict-transport-security` presente; manifest AVAGYM com as duas cores `#0b0b0c`; `<title>AVAGYM</title>`; 401.
Manual (Lucas, no navegador): login admin → Admin › **Logs e auditoria** (o próprio login aparece); `/settings` no admin e no personal; um aluno existente abre Início e o treino; avatar e uma mídia antiga abrem.
Conferência no banco: **[APROVAR]** `ssh avagym-vps "cd /opt/acade/app/api && sudo -u postgres psql -d \$(grep ^DB_NAME= .env | cut -d= -f2) -Atc 'select (select count(*) from legacy_session_users),(select count(*) from legacy_webauthn_credentials),(select count(*) from server_keys),(select count(*) from request_audit)'"`
Testes de API/E2E **não** rodam contra produção (criam contas).

## I. Rollback
Gatilho: a API não sobe, o health falha ou o login quebra.
**[APROVAR]** (com o `TS` do passo C):
```
ssh avagym-vps 'set -e; B=/opt/acade-backups; TS=<TS>; cd /opt/acade/app/api; DB=$(grep ^DB_NAME= .env | cut -d= -f2); DD=$(grep ^DATA_DIR= .env | cut -d= -f2);
pm2 stop acade-api acade;
sudo -u postgres pg_restore --clean --if-exists -d "$DB" $B/avagym_${TS}_antes_v5.dump;
rm -rf /tmp/rb && mkdir /tmp/rb && tar xzf $B/data_${TS}.tgz -C /tmp/rb && cp -a /tmp/rb/$(basename "$DD")/. "$DD"/;
cd /opt/acade && tar xzf $B/codigo_${TS}.tgz && cp $B/env_${TS}.bak app/api/.env;
cd app/api && npm ci --omit=dev && cd ../frontend && npm ci && npm run build;
pm2 restart /opt/acade-runtime/ecosystem.config.cjs --update-env && pm2 save'
```
O restore do `data_*.tgz` devolve `db.json`, `secret`, `vapid.json` e `state-*.json` com os nomes originais, e a API antiga volta a ler os arquivos. Os `*.importado-*` podem ficar. Mídia: as pastas antigas `api/uploads` e `api/private` não são apagadas pelo deploy, então não precisam de restore.

## J. Depois
- QA: `curl -I` do HSTS (fecha o BUG-008) e reteste dos BUG-012 a BUG-018 em produção, sem criar contas.
- Lucas: preencher "Dados da empresa" (ver `docs/QA-pendencias-2026-10-16.md`) e decidir o BUG-017.
