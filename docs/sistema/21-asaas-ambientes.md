# 21 — Asaas: simulador, sandbox e produção

O ORNY pode ser publicado sem ativar cobranças reais. O ambiente só muda quando as quatro variáveis abaixo são preenchidas no `.env` privado da API e o processo é reiniciado com `--update-env`.

## Dados necessários no `.env`

Arquivo da VPS: `/opt/avagym/app/api/.env`. Ele não é versionado, não deve ser copiado para chamado ou documentação e deve ficar com permissão restrita (`chmod 600`).

```env
BILLING_PROVIDER=simulado
ASAAS_ENV=sandbox
ASAAS_API_KEY=
ASAAS_WEBHOOK_TOKEN=
```

Para a ativação real:

```env
BILLING_PROVIDER=asaas
ASAAS_ENV=producao
ASAAS_API_KEY=<chave de produção>
ASAAS_WEBHOOK_TOKEN=<token exclusivo do webhook>
```

Regras verificadas na inicialização:

- produção aceita somente chave com prefixo `$aact_prod_`;
- sandbox aceita somente chave com prefixo `$aact_hmlg_`;
- o token do webhook deve ter de 32 a 255 caracteres, sem espaços e ser diferente da API Key;
- quando `BILLING_PROVIDER=asaas`, qualquer ausência ou incompatibilidade impede a API de iniciar e informa somente o nome/configuração inválida;
- não existe retorno automático ao simulador;
- endpoints, painel e logs exibem apenas estado, provedor e ambiente, nunca chave ou token.

## Preparar a conta Asaas

Antes de alterar a VPS:

1. Concluir o cadastro, a aprovação e a prova de vida da conta Asaas.
2. Cadastrar uma chave Pix na conta.
3. Solicitar ao suporte/comercial do Asaas a habilitação da tokenização de cartão em produção.
4. Em **Integrações → Chaves de API**, criar a chave de produção e guardá-la no gerenciador de segredos assim que for exibida.
5. Gerar um token exclusivo para o webhook, com 32 a 255 caracteres, sem espaços e diferente da API Key.
6. Em **Integrações → Webhooks**, cadastrar `https://ornygym.avadesk.com.br/api/billing/webhook/asaas`.
7. Habilitar envio sequencial e estes eventos: `PAYMENT_CREATED`, `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`, `PAYMENT_REPROVED_BY_RISK_ANALYSIS`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`, `PAYMENT_REFUNDED` e `PAYMENT_CHARGEBACK_REQUESTED`.
8. Confirmar no painel do Asaas que as entregas recebem resposta HTTP de sucesso.

Referências oficiais: [chaves de API](https://docs.asaas.com/docs/api-keys), [Webhooks](https://docs.asaas.com/docs/about-webhooks), [cartão de crédito e tokenização](https://docs.asaas.com/docs/cobrancas-via-cartao-de-credito) e [Pix](https://docs.asaas.com/docs/pix).

## Diferença entre os ambientes

| Ambiente | Configuração | Efeito |
|---|---|---|
| Simulador | `BILLING_PROVIDER=simulado` | Testes locais, sem chamada ao Asaas e sem receita real. |
| Sandbox | `BILLING_PROVIDER=asaas`, `ASAAS_ENV=sandbox` e credenciais de homologação completas | Chama a conta sandbox; cartões e clientes não valem em produção. |
| Produção | `BILLING_PROVIDER=asaas`, `ASAAS_ENV=producao` e credenciais de produção completas | Gera cobranças reais. |

Assinaturas e cartões do simulador/sandbox não são convertidos em cobranças reais. O cartão precisa ser cadastrado novamente depois da virada. Nenhum número ou CVV é persistido; o banco guarda somente o token devolvido pelo Asaas e os dados de exibição permitidos.

## Cartão e Pix

- Cartão: assinatura mensal e renovação automática. Aprovação ativa; recusa não libera o plano.
- Pix inicial: QR Code e copia e cola com validade de 24 horas. O plano só é liberado após confirmação do webhook.
- Pix expirado: o titular pode gerar outro; a cobrança anterior é cancelada logicamente e não cria uma segunda assinatura.
- Renovação Pix: uma nova cobrança é gerada cinco dias antes do vencimento. O acesso continua até o fim do período pago e depois segue a carência configurada.
- Uma assinatura Pix nunca tenta cobrança em cartão.
- O QR Code e o copia e cola são retornados somente ao dono autenticado da assinatura e aos fluxos administrativos autorizados.
- Webhooks usam token comparado em tempo constante, idempotência pelo identificador do evento e vínculo da cobrança ao usuário/empresa.

## Checklist de ativação

1. Confirmar conta aprovada, chave Pix e tokenização de cartão.
2. Confirmar os preços oficiais: Individual R$ 12,90/mês, Personal 15 R$ 39,90/mês e Personal Ilimitado R$ 79,90/mês. Durante a homologação, todos permanecem fora de venda.
3. Conferir monetização, carência e regras comerciais.
4. Fazer backup do banco e do `.env`.
5. Aplicar as migrations pendentes, inclusive `057_cobranca_pix.sql` e `062_cupons_indicacao_personalizados.sql`. A 062 preserva concessões antigas, remove teste automático de planos e pausa a distribuição automática anterior.
6. Preencher as quatro variáveis no `.env` privado.
7. Executar `pm2 restart avagym-api --update-env`.
8. Abrir **Admin → Cobrança, preços e cupons → Visão geral** e confirmar **Asaas (produção)**.
9. Fazer uma cobrança real controlada de baixo valor e confirmar cobrança, assinatura e entrega do webhook no Asaas.
10. Só depois da homologação, marcar os planos como vendáveis e habilitar a monetização pública.

Qualquer API Key ou token de webhook compartilhado em chat, chamado, print ou log deve ser revogado. A substituição deve ser criada no painel Asaas e gravada diretamente no `.env` privado; o valor não entra em documentação nem no histórico Git.

## Preparação executada em 18/10/2026

- Backup prévio criado em `/opt/avagym-backups/20261018_164911_pre-asaas-production`, com dump e `.env` protegidos por permissão 600; catálogo do dump validado dentro do container PostgreSQL.
- Produção: Individual R$ 12,90, Personal 15 R$ 39,90 e Personal Ilimitado R$ 79,90, todos `sellable=false`; Personal 15 com 15 alunos e Personal Ilimitado com capacidade sem limite numérico.
- `monetizacao_ativa=false`; catálogo público confirmou os dois planos pagos como não compráveis.
- O endpoint de webhook respondeu 401 sem token, conforme esperado.
- O ambiente permanece Asaas sandbox. A virada real aguarda revogação dos segredos expostos e criação das novas credenciais diretamente no painel Asaas.

A publicação do código, sozinha, não ativa o Asaas. Sem a troca explícita do provedor, o sistema permanece no simulador.

## Ativação comercial executada em 19/10/2026

A pedido do responsável, a venda pública foi aberta na VPS sem executar o script de transição gratuita: Individual (R$ 12,90/mês), Personal 15 (R$ 39,90/mês) e Personal Ilimitado (R$ 79,90/mês) ficaram vendáveis e `monetizacao_ativa=true`. Não foram alteradas contas ou assinaturas, nem concedidos testes/cortesias. Backup PostgreSQL, `.env` protegido, configuração PM2 e commit foram preservados em `/opt/avagym-backups/20261019_132934_pre-plan-sales/`; o catálogo do dump foi validado (`TOC Entries: 1423`).

Verificações: `/api/public/plans` retornou HTTP 200, `test_mode=false` e os três planos como `purchasable=true`; `/api/health` retornou HTTP 200. A API Asaas de produção confirmou, em consulta somente leitura, o webhook ORNY ativo, não interrompido, sequencial e com todos os eventos configurados. O banco ainda não tinha evento real Asaas recebido (somente um evento simulado), e não foi criada cobrança real de teste. Assim, vendas estão abertas, mas a primeira confirmação real e o desbloqueio subsequente ainda precisam ser observados antes de declarar a jornada ponta a ponta homologada.

O middleware de acesso permanece fail-closed: somente cobrança real (`provider` diferente de `simulado`), paga e confirmada, com assinatura vigente, libera as áreas protegidas. Não confundir cadastro/plano escolhido, pagamento pendente ou simulação com pagamento confirmado.

## Voltar ao modo de teste

1. Fazer backup do `.env` atual sem imprimir seu conteúdo.
2. Definir `BILLING_PROVIDER=simulado`, `ASAAS_ENV=sandbox` e deixar as duas credenciais Asaas vazias.
3. Executar `pm2 restart avagym-api --update-env`.
4. Confirmar **Simulador** no painel administrativo.

O retorno ao simulador não estorna nem cancela cobranças já existentes no Asaas. Trate essas cobranças no painel do provedor antes da troca, quando necessário.

## Diagnóstico seguro

- Se a API não iniciar, consulte a mensagem de configuração: ela identifica a variável ou incompatibilidade, sem exibir o valor.
- Confira apenas se cada variável está preenchida e se o prefixo corresponde ao ambiente; não use `cat .env`, `pm2 env` ou prints em chamados.
- No Asaas, confira a entrega do webhook e o código HTTP. No ORNY, confira o evento pelo identificador, status da cobrança e horário, nunca pelo token.
- Em caso de indisponibilidade do provedor, o sistema retorna erro controlado e não muda para o simulador.
