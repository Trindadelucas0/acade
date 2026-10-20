-- Completa apenas campos legais ausentes/vazios da empresa padrão ORNY.
-- Valores já personalizados permanecem com precedência.
insert into app_settings(tenant_id, key, value, updated_at)
select t.id, 'empresa_legal', jsonb_build_object(
  'razao_social', 'ORNYGYM',
  'nome_fantasia', 'ORNYGYM',
  'cnpj', '67.790.913/0001-20',
  'chave_pix', '67.790.913/0001-20',
  'endereco', 'SETOR HABITACIONAL ARNIQUEIRA, BRASILIA/DF, CEP 71995-517',
  'email_suporte', 'avadesktech@gmail.com',
  'email_dpo', 'avadesktech@gmail.com',
  'email_financeiro', 'avadesktech@gmail.com',
  'email_moderacao', 'avadesktech@gmail.com',
  'url_cancelamento', 'https://ornygym.avadesk.com.br/#/assinatura',
  'foro', 'Brasília/DF',
  'hosting_provider_country', 'Hostinger - Brasil',
  'doc_version', '1.1',
  'doc_vigencia', '2026-10-18'
), now()
from tenants t
where t.slug = 'avadesk'
on conflict (tenant_id, key) do update
set value = excluded.value || coalesce((
      select jsonb_object_agg(item.key, item.value)
      from jsonb_each(app_settings.value) item
      where btrim(item.value #>> '{}') <> ''
    ), '{}'::jsonb),
    updated_at = now();
