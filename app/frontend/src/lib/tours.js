// V4.3 · definições dos guided tours (ver /workspace/avagym/v4/PLANO-TOURS.md). Estado salvo no Postgres via /api/me/tours.
import { api } from './api.js'
const S = (target, title, text) => ({ target, title, text })
const M = (target, title, text) => ({ target, title, text, reveal: 'adm-menu' })   // admin: abre o menu lateral no celular se preciso
const common = {
  progresso: [S('progress', 'Seu progresso', 'Volume, frequência e músculos trabalhados ao longo das semanas.')],
  perfil: [S('security', 'Segurança', 'Troque a senha e saia de todos os aparelhos.'), S('meus-dados', 'Seus dados', 'Peça uma cópia dos seus dados por e-mail ou a exclusão da conta.'), S('tour-restart', 'Ver tour de novo', 'Quando quiser rever estas dicas, toque aqui.')]
}
export const TOURS = {
  normal: {
    welcome: [S(null, 'Bem-vindo ao AVAGYM', 'Um minuto para conhecer o app. Você pode pular quando quiser.'),
      S('week-ring', 'Minha semana', 'Aqui você vê quantos treinos fez nesta semana e o que falta para a meta.'),
      S('bell', 'Notificações', 'Avisos do personal, desafios e lembretes chegam aqui.'),
      S('tab-treinos', 'Treinos', 'Seus programas e as fichas do personal ficam nesta aba. Só um treino fica ativo por vez.'),
      S('tab-perfil', 'Perfil', 'Tema claro ou escuro, segurança, seus dados e "Ver tour de novo".')],
    treinos: [S('tab-programas', 'Programas do sistema', 'Escolha um programa pronto para o seu objetivo.'),
      S('tab-profissionais', 'Fichas do personal', 'Quando um personal enviar uma ficha, ela aparece aqui e passa a ser o treino ativo.'),
      S('tab-historico', 'Histórico', 'Todos os treinos que você já fez.')],
    comunidade: [S('new-post', 'Publicar', 'Compartilhe um treino ou uma conquista.'), S('com-shortcuts', 'Desafios e grupos', 'Entre em desafios e acompanhe o ranking.')],
    ...common
  },
  client: {
    welcome: [S(null, 'Bem-vindo! Seu personal criou sua conta', 'Você treina com as fichas dele, participa da comunidade e dos desafios dele.'),
      S(['start-pro-card', 'client-wait'], 'Sua ficha', 'A ficha do personal aparece aqui. Uma ficha nova substitui a anterior.'),
      S('lock-banner', 'Áreas com cadeado', 'Algumas áreas ficam fora do plano do seu personal. Toque em "Solicitar liberação" para pedir acesso.'),
      S('tab-treinos', 'Treinos', 'Ficha ativa e fichas anteriores (só para consulta).'),
      S('tab-perfil', 'Perfil', 'Tema, senha, seus dados e "Ver tour de novo".')],
    treinos: [S('tab-profissionais', 'Ficha ativa', 'Aqui fica a ficha que o seu personal enviou.'), S('plan-history', 'Fichas anteriores', 'As fichas antigas ficam só para leitura.')],
    comunidade: [S('new-post', 'Comunidade do seu personal', 'Publique e acompanhe os colegas do seu personal.')],
    ...common
  },
  pro: {
    welcome: [S(null, 'Bem-vindo ao AVADESK PRO', 'Aqui você acompanha seus alunos e envia fichas.'),
      S('ptab-alunos', 'Alunos', 'Lista dos alunos vinculados, com treinos e evolução.'),
      S('ptab-atendimentos', 'Atendimentos', 'Dúvidas e ocorrências dos alunos, com prazo.'),
      S('pt-convites', 'Convidar ou cadastrar aluno', 'Convide pelo código ou crie a conta do aluno com senha provisória.'),
      S('capacity', 'Limite de alunos', 'Quantas vagas você usa do seu plano.')],
    convites: [S('pro-clients', 'Cadastrar aluno', 'A senha provisória aparece uma vez só. Copie e envie ao aluno.'), S('pc-create', 'Criar a conta', 'No primeiro acesso o aluno cria a senha dele.')],
    alunos: [S('stu-search', 'Buscar aluno', 'Encontre um aluno pelo nome.'), S('stu-card', 'Abrir o aluno', 'Crie a ficha, veja o histórico e converse.')],
    perfil: common.perfil
  },
  admin: {
    welcome: [S(null, 'Central administrativa', 'Aqui você cuida das contas, das liberações e dos personais. Vamos ver onde fica cada coisa.'),
      M('adm-usuarios', 'Usuários', 'Lista de todas as contas. Toque em uma pessoa para ver o resumo, a mensalidade e as ações.'),
      M('adm-liberacoes', 'Liberação de contas', 'Pedidos, contas aguardando, liberadas e travadas, num lugar só. Dá para liberar várias de uma vez.'),
      M('adm-verificacoes', 'Verificação profissional', 'Confira o registro (CREF) dos personais antes de eles enviarem treinos.'),
      M('adm-assinaturas', 'Assinaturas dos personais', 'Quantos alunos cada personal pode ter.'),
      M('adm-lgpd', 'LGPD', 'Pedidos de cópia dos dados e de exclusão de conta.')],
    usuarios: [S('dt-search', 'Buscar', 'Digite nome, e-mail ou código para achar a pessoa.'),
      S('usr-status', 'Filtrar', 'Mostre só contas pendentes, ativas ou bloqueadas.'),
      S('nu-open', 'Novo usuário', 'Crie uma conta já liberada (aluno ou personal).'),
      S('dt-row', 'Abrir um usuário', 'Toque na linha para abrir o painel da pessoa.')],
    usuario: [S('upn-resumo', 'Resumo', 'Tipo de conta, situação, liberação e último acesso.'),
      S('upn-mensalidade', 'Mensalidade', 'Enquanto o pagamento não está no app, você marca à mão: "em dia" libera, "pendente" trava. Aluno do personal é coberto por ele.'),
      S('upn-assinatura', 'Trocar assinatura do personal', 'Escolha a assinatura no seletor para mudar quantos alunos o personal pode ter.'),
      S('upn-treino', 'Treino atual e vínculos', 'Que ficha ou programa está ativo e quem é o personal.'),
      S('upn-link-senha', 'Link de nova senha', 'Gera um link de uso único (24 h). Copie e envie para a pessoa.'),
      S('upn-papel-pro', 'Papéis', 'Dê ou remova o papel de personal. A mesma conta pode treinar e atender.'),
      S('upn-risco', 'Zona de risco', 'Suspender impede o login. Nada é apagado e dá para reativar.'),
      S('upn-avancado', 'Detalhes avançados', 'Código público, edição da conta e dados técnicos ficam aqui, recolhidos.')],
    liberacoes: [S('lib-tabs', 'Abas', 'Pedidos: quem pediu liberação. Aguardando: contas novas. Liberadas e Travadas: o estado atual.'),
      S('lib-pedidos', 'Aprovar ou recusar', 'Pendentes aparecem primeiro. Ao recusar, escreva o motivo: a pessoa vê.'),
      S('lib-tab-aguardando', 'Liberar em lote', 'Nas outras abas, marque várias contas e use "Liberar selecionadas" ou "Travar selecionadas".')],
    verificacoes: [S('adm-verifications', 'Fila de verificação', 'Abra cada pedido, confira o documento e aprove ou peça correção.')],
    assinaturas: [S('adm-subs', 'Assinaturas dos personais', 'Veja e troque a assinatura de cada personal. "A definir" = limite ainda não decidido.')],
    lgpd: [S('adm-title', 'LGPD', 'Pedidos de cópia dos dados (enviados por e-mail) e de exclusão. Nada é apagado sem a sua análise.')]
  }
}
// tela atual → chave do tour (por perfil)
export function screenOf(profile, pathname, search) {
  const tab = new URLSearchParams(search).get('tab')
  if (profile === 'admin') return pathname.startsWith('/admin/painel') ? (!tab || tab === 'dashboard' ? 'welcome' : tab) : null
  if (profile === 'pro') return pathname === '/pro' ? (!tab || tab === 'painel' ? 'welcome' : tab) : pathname === '/perfil' ? 'perfil' : null
  const m = { '/hoje': 'welcome', '/treinos': 'treinos', '/comunidade': 'comunidade', '/progresso': 'progresso', '/perfil': 'perfil' }
  return m[pathname] || null
}
export const NEVER = ['/treinar', '/concluido', '/pro/treino', '/onboarding']
export const TourAPI = {
  state: () => api('/api/me/tours').then(r => r.tours),
  save: (key, status, step) => api('/api/me/tours', { method: 'POST', body: JSON.stringify({ key, status, step }) }),
  reset: () => api('/api/me/tours/reset', { method: 'POST', body: '{}' })
}
