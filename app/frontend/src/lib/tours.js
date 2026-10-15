// V4.3 · definições dos guided tours (ver /workspace/avagym/v4/PLANO-TOURS.md). Estado salvo no Postgres via /api/me/tours.
import { api } from './api.js'
const S = (target, title, text) => ({ target, title, text })
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
    welcome: [S(null, 'Central administrativa', 'Tudo o que precisa de decisão fica aqui.'),
      S('adm-dashboard', 'Dashboard', 'Números do dia e filas pendentes.'),
      S('adm-liberacoes', 'Liberação de contas', 'Aprove ou recuse pedidos e trave ou libere contas. Nada é apagado.'),
      S('adm-verificacoes', 'Verificação profissional', 'Valide o cadastro dos personais.'),
      S('adm-lgpd', 'LGPD', 'Pedidos de dados e de exclusão.')],
    liberacoes: [S('adm-liberacoes', 'Pedidos de liberação', 'Pendentes aparecem primeiro. Ao recusar, escreva o motivo: a pessoa vê.')]
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
