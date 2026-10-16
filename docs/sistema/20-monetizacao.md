# 20 - Monetização (F2–F4): teste, cupons, indicação e motor de acesso

Decisões do Lucas D1–D9 (16/10/2026). Tudo fica **desligado** até a virada: com `monetizacao_ativa = false` nada muda para o usuário.

## Teste de 168h (F2/F4)
- O teste só existe via cupom: **cupom de teste** ou **cupom de indicação** (D2: a indicação também concede o teste).
- Duração fixa de **168h**, contada no servidor. Aluno recebe o **Individual** completo; profissional recebe o **PRO** completo (D3/D7). O overlay está em `entitlements.resolve()`.
- **Teste único por titular** (D6, sem SMS):
  - `trial_grants` é único por conta;
  - `trial_identities` usa a PK (tenant, tipo, hash), com hash HMAC de e-mail normalizado (Gmail sem pontos/+tag), telefone normalizado e CPF opcional.
  - Um conflito retorna `TRIAL_ALREADY_USED` e grava em `fraud_signals` (`teste_reuso_identidade`). Dispositivo e IP só geram alerta.
- **Concorrência**:
  - o resgate trava o código **e** a campanha (`for update of pc, cp`);
  - os índices únicos fecham as corridas (clique duplo, contas paralelas).
- **Indicação**:
  - `referral_attributions` é única por usuário: vale o **primeiro indicador válido**, que nunca é sobrescrito;
  - autoindicação é recusada (`SELF_REFERRAL`);
  - `referral_conversions` registra o 'teste'.
- **Admin**:
  - cupom com tipo (`teste` | `indicacao`), responsável (obrigatório na indicação), perfil e planos elegíveis, canal e observações;
  - histórico em `coupon_changes`.

## Motor de acesso (F3): `app/api/access.js`
- **Origens de acesso:**
  - `propria`: assinatura paga ativa, em teste, inadimplente ou em carência;
  - `teste`;
  - `concessao`: `entitlement_grants` com key `acesso`, usada na transição D1 e em cortesias do admin;
  - `personal`: aluno vinculado a um personal com acesso (D4).
- `monetizationGate` (no `server.js`): com a monetização ligada, **nega por padrão** toda rota fora de `ALWAYS_ALLOWED` e responde `402 ACCESS_REQUIRED`.
  - Continuam liberados (D3): login, assinatura e pagamento, perfil, configurações, LGPD, gestão da conta e aceite de convite de personal.
  - Rotas `/api/pro/*` exigem acesso de profissional. O admin nunca é bloqueado.
- `GET /api/access/me` devolve as origens, o teste (ativo e restante) e a elegibilidade.
- O interruptor `monetizacao_ativa` tem cache de 5 s, limpo quando o admin salva a configuração.

## Testes
`app/api/test/v6-monetizacao-cupons.mjs`, com 13 cenários da seção 13: 168h, inválido/expirado/revogado/esgotado, mesmo titular (telefone e Gmail), 20 resgates simultâneos, limite da campanha sob concorrência, indicação + primeiro indicador, autoindicação, teste PRO, permissões de admin, gate ligado/desligado/expirado, patrocínio do personal.

## Pendente (próximas fases)
- F5: link `/convite/CODIGO` e cliques.
- F6: estados `pendente`/`vencida` e bloqueio do teste sem cupom no checkout.
- F7: Admin > Monetização.
- F8: telas.
- F9: fila de fraude.
- F10: virada e transição D1, só com o OK do Lucas.
