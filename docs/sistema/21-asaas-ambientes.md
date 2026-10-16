# 21 - Asaas: sandbox x produção (D9)

O gateway é o **Asaas**, já integrado (`app/api/billing/providers/asaas.js`). O simulador (`BILLING_PROVIDER=simulado`) existe só para testes, e as cobranças dele ficam marcadas como `live=false` nas conversões, sem nunca contar como receita.

## Variáveis no `.env` da API (nunca commitadas)
| Variável | Sandbox | Produção |
|---|---|---|
| `BILLING_PROVIDER` | `asaas` | `asaas` |
| `ASAAS_ENV` | `sandbox` (padrão) | `producao` |
| `ASAAS_API_KEY` | chave `$aact_hmlg_...` | chave `$aact_prod_...` |
| `ASAAS_WEBHOOK_TOKEN` | token do webhook do sandbox | token do webhook de produção |

- Proteção na partida: uma chave de produção com `ASAAS_ENV` diferente de `producao`, ou uma chave de sandbox com `ASAAS_ENV=producao`, é **recusada**. Isso evita cobrança real por engano.
- Webhook: `POST /api/billing/webhook/asaas`, com o cabeçalho `asaas-access-token` comparado em tempo constante e idempotência por `(provider, event_id)`.

## Como alternar
1. Faça um backup do banco (`pg_dump -Fc`).
2. Edite o `.env` com as 4 variáveis acima, sem mostrar valores em log nem em relatório.
3. Rode `pm2 restart avagym-api --update-env`.
4. Confira em Admin > Cobrança que o provedor e o modo aparecem corretos (`GET /api/billing/config`).
5. Cadastre no painel do Asaas a URL do webhook e o mesmo token.

## Configurações comerciais (Admin, `POST /api/adm/billing/settings`)
- `monetizacao_ativa`: o interruptor geral, que fica **desligado** até a virada aprovada pelo Lucas.
- `teste_so_cupom` (padrão `true`): o teste só existe por cupom; o "teste do plano" no checkout fica desligado.
- `transicao_dias` (padrão 7) e `transicao_conta_como_teste` (padrão `false`): regras da transição D1. **Aguardando a decisão do Lucas** sobre contar a transição como teste.
- Preços e vagas: definidos pelo admin em Planos (D8). Nada é inventado no código.
