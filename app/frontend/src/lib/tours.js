// V4.3 · definições dos guided tours (ver /workspace/avagym/v4/PLANO-TOURS.md). Estado salvo no Postgres via /api/me/tours.
import { api } from './api.js'
const S = (target, title, text) => ({ target, title, text })
const common = {
  progresso: [S('progress', 'Seu progresso', 'Volume, frequência e músculos trabalhados ao longo das semanas.')],
  perfil: [S('profile-preferences', 'Preferências', 'Aparência, idioma e preferências de treino ficam aqui.'), S('profile-security', 'Privacidade e segurança', 'Troque a senha, confira aparelhos e solicite seus dados.')]
}
export const TOURS = {
  normal: {
    welcome: [S(null, 'Bem-vindo ao AVAGYM', 'Um minuto para conhecer o app. Você pode pular quando quiser.'),
      S('week-ring', 'Minha semana', 'Aqui você vê quantos treinos fez nesta semana e o que falta para a meta.'),
      S('bell', 'Notificações', 'Avisos do personal, desafios e lembretes chegam aqui.'),
      S('tab-treinos', 'Treinos', 'Seus programas e as fichas do personal ficam nesta aba. Só um treino fica ativo por vez.'),
      S('tab-perfil', 'Perfil', 'Preferências, privacidade e segurança ficam separados. Para rever as dicas, abra Ajuda.')],
    treinos: [S('active-training', 'Treino ativo', 'Sua ficha atual aparece primeiro. Só uma ficha fica ativa por vez.'), S('tab-profissionais', 'Ficha do profissional', 'As fichas do personal aparecem aqui. As anteriores são só consulta.')],
    comunidade: [S('comunidade', 'Comunidade', 'Publicações, grupos, desafios e ranking ficam nesta área.'), S('com-shortcuts', 'Desafios e grupos', 'Entre em desafios e acompanhe o ranking.')],
    ...common
  },
  client: {
    welcome: [S(null, 'Bem-vindo! Seu personal criou sua conta', 'Você treina com as fichas dele, participa da comunidade e dos desafios dele.'),
      S(['start-pro-card', 'client-wait'], 'Sua ficha', 'A ficha do personal aparece aqui. Uma ficha nova substitui a anterior.'),
      S('lock-banner', 'Áreas com cadeado', 'Algumas áreas ficam fora do plano do seu personal. Toque em "Solicitar liberação" para pedir acesso.'),
      S('tab-treinos', 'Treinos', 'Ficha ativa e fichas anteriores (só para consulta).'),
      S('tab-perfil', 'Perfil', 'Tema, senha, seus dados e "Rever orientações".')],
    treinos: [S('tab-profissionais', 'Ficha ativa', 'Aqui fica a ficha que o seu personal enviou.'), S('plan-history', 'Fichas anteriores', 'As fichas antigas ficam só para leitura.')],
    comunidade: [S('comunidade', 'Comunidade do seu personal', 'Acompanhe publicações, colegas e desafios do seu personal.')],
    ...common
  },
  pro: {
    welcome: [S(null, 'Bem-vindo ao AVADESK PRO', 'Aqui você acompanha seus alunos e envia fichas.'),
      S('ptab-alunos', 'Alunos', 'Lista dos alunos vinculados, com treinos e evolução.'),
      S('ptab-atendimentos', 'Atendimentos', 'Dúvidas e ocorrências dos alunos, com prazo.'),
      S('ptab-alunos', 'Convidar ou cadastrar aluno', 'Em Alunos, use Adicionar aluno: cadastrar conta ou convidar por código.'),
      S('ptab-mais', 'Mais', 'Comunidade, perfil, verificação e plano com vagas ficam aqui.')],
    cadastrar: [S('pro-clients', 'Cadastrar aluno', 'A conta recebe um link por e-mail para definir a senha.'), S('pc-create', 'Criar a conta', 'O envio segue a fila de e-mails do sistema.')],
    alunos: [S('stu-search', 'Buscar aluno', 'Encontre um aluno pelo nome.'), S('stu-card', 'Abrir o aluno', 'Crie a ficha, veja o histórico e converse.')],
    perfil: common.perfil
  },
  admin: {
    welcome: [S(null, 'Central administrativa', 'Tudo o que precisa de decisão fica aqui.'),
      S('adm-dashboard', 'Visão geral', 'Indicadores, gráficos de crescimento e pendências da gestão.'),
      S('adm-usuarios', 'Usuários e liberações', 'Confira o cadastro e a liberação das ações em abas separadas. Nada é apagado.'),
      S('adm-profissionais', 'Profissionais e verificação', 'Confira perfis, habilitações e envios dos personais.'),
      S('adm-lgpd', 'Privacidade e termos', 'Pedidos de exclusão e versões dos termos de uso.')],
    liberacoes: [S('adm-usuarios', 'Pedidos de liberação', 'Pendentes aparecem primeiro. Ao recusar, escreva o motivo: a pessoa vê.')]
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
