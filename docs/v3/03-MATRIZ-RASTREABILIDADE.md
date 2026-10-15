# Matriz de rastreabilidade — AVAGYM V3

Legenda: ✅ feito e testado · 🟡 parcial · ⏳ fase futura · ⛔ bloqueado / decisão do usuário

| Requisito (V3 / PRD) | Fase | Status | Implementação | Evidência |
|---|---|---|---|---|
| Uma conta com várias capacidades (aluno + profissional) | 2 | ✅ | `user_roles`, `/api/me/capacities`, cadastro com `intent` | v3-fase2 |
| Perfis, memberships (organização/tenant), estados | 2 | ✅ | `tenant_memberships` + gatilho de sincronização | v3-fase2 |
| Troca de contexto de navegação | 2 | ✅ | `users.active_context`, `/api/me/context`, `ContextSwitch` | v3-fase2 |
| Verificação profissional (dados, documento, especialidades, estados) | 2 | ✅ | `identity.js`, `professional_verifications/documents` | v3-fase2 |
| Não verificado treina, mas não prescreve | 2 | ✅ | bloqueio em `/api/pro/plans` e publicar | v3-fase2 |
| Cadastro "Quero treinar" × "Sou profissional" | 2 | ✅ | `Login.jsx`, `/api/auth/register` | v3-fase2 |
| Migração segura das contas (tenant atual = organização padrão) | 2 | ✅ | backfill na 018 | v3-fase2 |
| tenant_id + RLS | 2 | 🟡 | políticas nas tabelas novas; API ainda superusuário | v3-fase2 (SET ROLE) |
| Super-admin sem acesso a dados clínicos | — | ⏳ | console é fase futura | — |
| Pagamentos, cupons, afiliados, console, offline | — | ⏳ | fora deste lote | — |
| Duplicar treino no construtor | — | ⛔ | conflito: o usuário pediu antes **sem** opção de duplicar | decisão pendente |
| AGPL em uso comercial (SaaS) | — | ⛔ | bloqueio jurídico: AGPL §13 exige oferecer o código-fonte aos usuários da rede | consulta jurídica |
| Créditos AGPL + Z-Anatomy | — | ✅ | mantidos (Login, Perfil) | — |
