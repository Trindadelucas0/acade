# Guia de Deploy no Cloudflare (Workers + Pages)

Este guia explica como colocar o **openGym** no ar utilizando a infraestrutura gratuita da Cloudflare.

---

## Pré-requisitos
1. Uma conta gratuita na [Cloudflare](https://dash.cloudflare.com).
2. Node.js (versão 18 ou superior) instalado na sua máquina.

---

## Passo 1: Configurar e Fazer Deploy do Worker (Backend API)

1. Entre no diretório do Worker e instale as dependências:
   ```bash
   cd worker
   npm install
   ```

2. Faça login na Cloudflare via linha de comando:
   ```bash
   npx wrangler login
   ```

3. Crie o Banco de Dados Serverless (Cloudflare D1):
   ```bash
   npx wrangler d1 create opengym-db
   ```
   *O terminal exibirá um trecho com o `database_id`. Abra o arquivo `worker/wrangler.jsonc` e substitua `"local-opengym-db"` pelo seu `database_id` real.*

4. Execute o script de criação das tabelas no banco remoto:
   ```bash
   npx wrangler d1 execute opengym-db --remote --file=./schema.sql
   ```

5. Faça o deploy do Worker:
   ```bash
   npx wrangler deploy
   ```
   *Anote a URL gerada (exemplo: `https://opengym-api.seu-usuario.workers.dev`).*

---

## Passo 2: Configurar e Fazer Deploy do Frontend (Cloudflare Pages)

1. Entre no diretório do frontend e instale as dependências:
   ```bash
   cd ../frontend
   npm install
   ```

2. Compile a aplicação:
   ```bash
   npm run build
   ```

3. Publique no Cloudflare Pages:
   ```bash
   npx wrangler pages deploy dist --project-name=opengym
   ```
   *Anote o domínio gerado pelo Pages (exemplo: `https://opengym.pages.dev`).*

---

## Passo 3: Configurar Variáveis de Ambiente e Passkeys (WebAuthn)

Para que o login por biometria (Passkeys) funcione perfeitamente no seu novo domínio:

1. Acesse o painel da Cloudflare -> **Workers & Pages** -> selecione `opengym-api` -> **Settings** -> **Variables**.
2. Adicione / atualize as variáveis:
   - `RP_ID`: `opengym.pages.dev` (ou o seu domínio próprio)
   - `ORIGIN`: `https://opengym.pages.dev` (ou a URL completa com https)
   - `RP_NAME`: `openGym`
   - `INVITE_ONLY`: `false` (ou `true` se quiser restringir a novos cadastros via código de convite)

3. No painel do Cloudflare Pages (projeto `opengym`), adicione a rota para vincular a API:
   - Vincule a rota `/api/*` ao Worker `opengym-api` nas configurações do projeto Pages, garantindo **Single Origin** (sem problemas de CORS ou bloqueio de cookies de sessão).

---

## Teste e Desenvolvimento Local

Para testar localmente na sua máquina:
1. No diretório `worker`:
   ```bash
   npm run d1:init
   npm run dev
   ```
2. Em outro terminal, no diretório `frontend`:
   ```bash
   npm run dev
   ```
3. Acesse `http://localhost:5173`.
