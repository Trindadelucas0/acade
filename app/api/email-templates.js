// Templates transacionais: somente texto escapado e links construídos pelo servidor.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
export function appLink(path = '/perfil') {
  const origin = new URL(process.env.ORIGIN || 'http://localhost:4449')
  if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('ORIGIN inválida')
  return origin.origin + '/#' + (String(path).startsWith('/') ? path : '/perfil')
}
export function renderEmail({ subject, body, actionUrl, actionLabel = 'Abrir AVAGYM', preview = false }) {
  const safeUrl = actionUrl && /^https?:\/\//.test(actionUrl) ? actionUrl : null
  const text = `${preview ? '[TESTE — dados fictícios]\n\n' : ''}${subject}\n\n${body}${safeUrl ? '\n\n' + actionLabel + ': ' + safeUrl : ''}\n\nAVAGYM · Mensagem automática`
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(subject)}</title></head><body style="margin:0;background:#111318;color:#edf0f5;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#1c2028;border:1px solid #363d49;border-radius:16px"><tr><td style="padding:32px"><div style="color:#d5f65b;font-size:24px;font-weight:800;letter-spacing:2px">AVAGYM</div>${preview ? '<p style="color:#d5f65b">TESTE · Dados fictícios · Sem acesso válido</p>' : ''}<h1 style="font-size:25px;line-height:1.3;color:#ffffff;margin:28px 0 20px">${escape(subject)}</h1><p style="font-size:16px;line-height:1.7;color:#e2e6ed">${escape(body).replace(/\n/g, '<br>')}</p>${safeUrl ? `<p style="margin:28px 0"><a href="${escape(safeUrl)}" style="display:inline-block;background:#d5f65b;color:#171b12;padding:15px 22px;border-radius:8px;text-decoration:none;font-weight:bold">${escape(actionLabel)}</a></p><p style="font-size:12px;line-height:1.6;color:#bdc5d1;word-break:break-all">Se o botão não abrir, copie este endereço:<br>${escape(safeUrl)}</p>` : ''}<p style="border-top:1px solid #363d49;padding-top:20px;margin-top:28px;font-size:12px;line-height:1.6;color:#bdc5d1">AVAGYM · Mensagem automática<br>Se você não reconhece esta ação, procure a administração.</p></td></tr></table></td></tr></table></body></html>`
  return { html, text }
}
export const previewModels = [
  ['cadastro', 'Bem-vindo ao AVAGYM', 'Olá, Lucas!\nSua conta foi criada. As ações do aplicativo dependem da liberação de acesso pela administração.', 'Abrir aplicativo'],
  ['primeiro_acesso', 'Defina sua senha', 'Olá, Lucas!\nSeu personal criou sua conta. Escolha sua senha pelo link enviado. O link real tem validade de 24 horas e uso único.', 'Definir minha senha'],
  ['recuperacao', 'Redefina sua senha', 'Recebemos uma solicitação para redefinir sua senha. O link real tem validade de 24 horas e uso único. Se não foi você, ignore esta mensagem.', 'Redefinir senha'],
  ['senha_alterada', 'Sua senha foi alterada', 'Sua senha foi alterada e as sessões anteriores foram encerradas. Se não reconhece esta ação, recupere sua conta e procure a administração.', 'Abrir aplicativo'],
  ['liberacao', 'Sua conta foi liberada', 'Olá, Lucas!\nAgora você pode usar as ações liberadas no seu plano.', 'Acessar minha conta'],
  ['recusa', 'Pedido de liberação recusado', 'Seu pedido de liberação foi analisado. Procure a administração para conhecer as orientações.', 'Ver minha conta'],
  ['bloqueio', 'Acesso bloqueado', 'A administração alterou a situação de acesso da sua conta. Procure a administração para mais informações.', 'Ver minha conta'],
  ['convite', 'Convite de acompanhamento', 'Um profissional convidou você para acompanhamento. Abra o aplicativo para analisar o convite.', 'Ver convite'],
  ['vinculo', 'Vínculo de acompanhamento atualizado', 'A situação do seu acompanhamento foi atualizada. Consulte os detalhes no aplicativo.', 'Ver acompanhamento'],
  ['treino', 'Novo treino disponível', 'Sua ficha foi publicada ou atualizada. Consulte os exercícios e orientações no aplicativo.', 'Ver meus treinos'],
  ['lgpd_export', 'Exportação dos seus dados (LGPD)', 'Olá, Lucas!\nO envio real inclui o arquivo JSON com seus dados pessoais. Esta amostra inclui apenas dados fictícios.', 'Abrir aplicativo']
]
