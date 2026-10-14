// Tipos de conta (contas separadas): aluno treina; profissional e admin não têm fluxo de treino
export const isProAccount = u => !!u && !!u.pro && !u.admin && !(u.roles || []).includes('aluno')
export const isAdminAccount = u => !!u && !!u.admin && !(u.roles || []).includes('aluno')
export const isNonTrainee = u => isProAccount(u) || isAdminAccount(u)
