import { applyTheme, loadTheme } from './lib/theme.js'
import { useEffect, lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { bindUI } from './components/ui.jsx'
import { ACCENTS } from './lib/format.js'
import { setLang, useLang } from './lib/i18n.js'
import { setNav } from './lib/nav.js'
import { useWakeLock } from './lib/wakelock.js'
import { startFlow } from './sheets.jsx'
import Icon from './components/Icon.jsx'
import TabBar from './components/TabBar.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Modals from './components/Modals.jsx'
import Toast from './components/Toast.jsx'
import DialogHost from './components/DialogHost.jsx'
import RestTimer from './components/RestTimer.jsx'
import Login from './views/Login.jsx'
import Workout from './views/Workout.jsx'
import Stats from './views/Stats.jsx'
import History from './views/History.jsx'
import Library from './views/Library.jsx'
import Settings from './views/Settings.jsx'
const MuscleMap = lazy(() => import('./views/MuscleMap.jsx'))
// treino guiado (AVAGYM)
import GuidedTabBar, { isProAccount, isAdminAccount } from './views/guided/TabBar.jsx'
import Onboarding from './views/guided/Onboarding.jsx'
import Today from './views/guided/Today.jsx'
import { Recommendations, Library as ProgramLibrary, ProgramDetail } from './views/guided/Programs.jsx'
import MyProgram from './views/guided/MyProgram.jsx'
import Train from './views/guided/Train.jsx'
import Done from './views/guided/Done.jsx'
import Progress from './views/guided/Progress.jsx'
import Profile from './views/guided/Profile.jsx'
import MyEquipment from './views/guided/MyEquipment.jsx'
import AdminPrograms from './views/guided/AdminPrograms.jsx'
// AVADESK Fitness
import Treinos from './views/app/Treinos.jsx'
import Comunidade, { PostPage, ProfessionalPage } from './views/app/Comunidade.jsx'
import Ranking from './views/app/Ranking.jsx'
import './views/app/AdminCommunity.jsx'
import Gate from './views/app/Locked.jsx'
import Acompanhamento, { Conversa } from './views/app/Acompanhamento.jsx'
import Avisos from './views/app/Avisos.jsx'
import AdminApp from './views/admin/AdminApp.jsx'
import { TermsGate } from './views/app/Terms.jsx'
import ProPortal from './views/pro/Portal.jsx'
import MyPrograms from './views/pro/MyPrograms.jsx'
import { GroupPage } from './views/app/Grupos.jsx'
import { ChallengePage, ChallengeWizard } from './views/app/Desafios.jsx'
import Builder from './views/builder/WorkoutBuilder.jsx'
import PlanErrorHost from './views/v3/PlanErrorHost.jsx'
import { MustChangePassword, AccessLockHost, LockBanner, ScopeGate } from './views/v3/V42.jsx'
import './styles/v42.css'
import './styles/tours.css'
import { TourHost } from './components/Tour.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import Plans from './views/v3/Plans.jsx'
import { NavigationAccess } from './components/NavigationAccess.jsx'
import AcceptInvite from './views/v3/AcceptInvite.jsx'

bindUI(useUI)   // lets the shared controls open sheets without importing the store at module scope

// V4.1: tema claro/escuro salvo no perfil (Postgres) — ver lib/theme.js
function applyPrefs() { applyTheme() }

function Shell() {
  const navigate = useNavigate()
  const loc = useLocation()
  const { S, user, ready } = useStore()
  const isGuest = useStore(s => s.isGuest())
  const langV = useLang()   // re-renders the whole shell when the language (pack) changes
  useEffect(() => { setNav(navigate) }, [navigate])
  useEffect(() => { applyPrefs() }, [])
  useEffect(() => { if (user) loadTheme() }, [user?.id]) // eslint-disable-line
  useEffect(() => { setLang(S.lang || 'pt') }, [S.lang])
  useEffect(() => { document.documentElement.lang = (S.lang || 'pt') === 'pt' ? 'pt-BR' : S.lang }, [langV, S.lang])
  // every tab/route change starts at the top of the page
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])
  // bound to the workout, not to the route — checking Stats mid-session keeps the screen on
  useWakeLock(!!S.active && S.keepAwake !== false)

  const authed = user || isGuest
  if (!ready && !authed) return (
    <div id="app">
      <div style={{ paddingTop: '44vh', display: 'flex', justifyContent: 'center', fontSize: 34, color: 'var(--label-3)' }}>
        <Icon name="dumbbell" />
      </div>
    </div>
  )

  return (
    <>
      {/* keyed on the route: a view that throws is contained, and switching tabs
          re-mounts the boundary, so the tab bar is always a way out */}
      <div id="app" className="vfade" key={loc.pathname}>
        {authed && !user?.must_change_password && <LockBanner />}
        <ErrorBoundary>
          {!authed ? <Login /> : user?.must_change_password ? <MustChangePassword /> : user?.needs_terms ? <TermsGate onAccepted={() => useStore.getState().setUser({ ...user, needs_terms: false })} /> : isAdminAccount(user) ? (
            <Routes>
              <Route path="/admin/painel" element={<AdminApp />} />
              <Route path="/pro/treino" element={<Builder />} />
              <Route path="/admin/programas" element={<Navigate to="/admin/painel?tab=programas" replace />} />
              <Route path="/comunidade" element={<Gate title="Comunidade"><Comunidade /></Gate>} />
              <Route path="/grupo/:id" element={<Gate title="Comunidade"><GroupPage /></Gate>} />
              <Route path="/desafio/:id" element={<Gate title="Comunidade"><ChallengePage /></Gate>} />
              <Route path="/desafios/criar" element={<Gate title="Comunidade"><ChallengeWizard /></Gate>} />
              <Route path="/post/:id" element={<Gate title="Comunidade"><PostPage /></Gate>} />
              <Route path="/profissional/:id" element={<Gate title="Comunidade"><ProfessionalPage /></Gate>} />
              <Route path="/conversa/:id" element={<Gate title="Conversa"><Conversa /></Gate>} />
              <Route path="/avisos" element={<Avisos />} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/planos" element={<Plans />} />
              <Route path="/convite/:code" element={<AcceptInvite />} />
              <Route path="*" element={<Navigate to="/admin/painel" replace />} />
            </Routes>
          ) : isProAccount(user) ? (
            <Routes>
              <Route path="/pro" element={<Gate title="AVADESK PRO"><ProPortal /></Gate>} />
              <Route path="/pro/programas" element={<Gate title="AVADESK PRO"><MyPrograms /></Gate>} />
              <Route path="/pro/treino" element={<Gate title="AVADESK PRO"><Builder /></Gate>} />
              <Route path="/comunidade" element={<Gate title="Comunidade"><Comunidade /></Gate>} />
              <Route path="/grupo/:id" element={<Gate title="Comunidade"><GroupPage /></Gate>} />
              <Route path="/desafio/:id" element={<Gate title="Comunidade"><ChallengePage /></Gate>} />
              <Route path="/desafios/criar" element={<Gate title="Comunidade"><ChallengeWizard /></Gate>} />
              <Route path="/post/:id" element={<Gate title="Comunidade"><PostPage /></Gate>} />
              <Route path="/profissional/:id" element={<Gate title="Comunidade"><ProfessionalPage /></Gate>} />
              <Route path="/conversa/:id" element={<Gate title="Conversa"><Conversa /></Gate>} />
              <Route path="/avisos" element={<Avisos />} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/planos" element={<Plans />} />
              <Route path="/convite/:code" element={<AcceptInvite />} />
              <Route path="*" element={<Navigate to="/pro" replace />} />
            </Routes>
          ) : (
            <Routes>
              <Route path="/pro/treino" element={user?.admin ? <Builder /> : <Navigate to="/hoje" replace />} />
              <Route path="/hoje" element={<Today />} />
              <Route path="/treinos" element={<Gate title="Treinos"><Treinos /></Gate>} />
              <Route path="/comunidade" element={<Gate title="Comunidade"><Comunidade /></Gate>} />
              <Route path="/acompanhamento" element={<Gate title="Acompanhamento"><Acompanhamento /></Gate>} />
              <Route path="/conversa/:id" element={<Gate title="Conversa"><Conversa /></Gate>} />
              <Route path="/avisos" element={<Avisos />} />
              <Route path="/grupo/:id" element={<ScopeGate title="Grupos"><Gate title="Comunidade"><GroupPage /></Gate></ScopeGate>} />
              <Route path="/desafio/:id" element={<Gate title="Comunidade"><ChallengePage /></Gate>} />
              <Route path="/desafios/criar" element={<Gate title="Comunidade"><ChallengeWizard /></Gate>} />
              <Route path="/post/:id" element={<Gate title="Comunidade"><PostPage /></Gate>} />
              <Route path="/profissional/:id" element={<Gate title="Comunidade"><ProfessionalPage /></Gate>} />
              <Route path="/ranking" element={<ScopeGate title="Ranking"><Gate title="Ranking"><Ranking /></Gate></ScopeGate>} />
              <Route path="/pro" element={user?.pro || user?.admin ? <Gate title="AVADESK PRO"><ProPortal /></Gate> : <Navigate to="/hoje" replace />} />
              <Route path="/pro/programas" element={<Gate title="AVADESK PRO"><MyPrograms /></Gate>} />
              <Route path="/admin/painel" element={user?.admin ? <AdminApp /> : <Navigate to="/hoje" replace />} />
              <Route path="/onboarding" element={<Gate title="Treinos"><Onboarding /></Gate>} />
              <Route path="/recomendados" element={<ScopeGate title="Recomendados"><Recommendations /></ScopeGate>} />
              <Route path="/programas" element={<ScopeGate title="Programas"><ProgramLibrary /></ScopeGate>} />
              <Route path="/programa/:id" element={<ScopeGate title="Programa"><ProgramDetail /></ScopeGate>} />
              <Route path="/meu-programa" element={<ScopeGate title="Meu programa"><MyProgram /></ScopeGate>} />
              <Route path="/treinar" element={<Gate title="Treinos"><Train /></Gate>} />
              <Route path="/concluido" element={<Done />} />
              <Route path="/progresso" element={<Gate title="Progresso"><Progress /></Gate>} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/perfil/equipamentos" element={<ScopeGate title="Equipamentos"><MyEquipment /></ScopeGate>} />
              <Route path="/planos" element={<Plans />} />
              <Route path="/convite/:code" element={<AcceptInvite />} />
              <Route path="/admin/programas" element={user ? <AdminPrograms /> : <Navigate to="/hoje" replace />} />
              {/* V4: sem montagem de treino nem treino livre. Rotas antigas levam às rotinas antigas (só consulta);
                  /workout só abre para concluir um treino livre que já estava em andamento no aparelho. */}
              <Route path="/home" element={<Navigate to="/treinos?aba=historico" replace />} />
              <Route path="/plan" element={<Navigate to="/treinos?aba=historico" replace />} />
              <Route path="/plan/r/:id" element={<Navigate to="/treinos?aba=historico" replace />} />
              <Route path="/workout" element={S.active ? <Workout /> : <Navigate to="/treinos" replace />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/history" element={<History />} />
              <Route path="/library" element={<ScopeGate title="Biblioteca"><Library /></ScopeGate>} />
              <Route path="/muscles" element={<ScopeGate title="Músculos"><Suspense fallback={null}><MuscleMap /></Suspense></ScopeGate>} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<Navigate to={user?.admin ? '/admin/painel' : '/hoje'} replace />} />
              <Route path="*" element={<Navigate to="/hoje" replace />} />
            </Routes>
          )}
        </ErrorBoundary>
      </div>
      {/* barra principal = treino guiado; a antiga só aparece no treino manual em execução */}
      {authed && !isAdminAccount(user) && !loc.pathname.startsWith('/admin/painel') && !loc.pathname.startsWith('/pro/treino') && <GuidedTabBar />}
      {authed && isAdminAccount(user) && !user?.needs_terms && !loc.pathname.startsWith('/admin/painel') && !loc.pathname.startsWith('/pro/treino') && <button className="adm-btn" style={{ position: 'fixed', left: 12, bottom: 12, minHeight: 44, zIndex: 50 }} onClick={() => navigate('/admin/painel')} data-testid="back-admin">← Painel admin</button>}
      <RestTimer />
      <Modals />
      {authed && <PlanErrorHost />}
      {authed && <AccessLockHost />}
      {authed && <TourHost />}
      {!(authed && ['/hoje', '/pro'].includes(loc.pathname) && !user?.must_change_password && !user?.needs_terms && !isAdminAccount(user)) && !['/treinar', '/concluido', '/pro/treino'].includes(loc.pathname) && <ThemeToggle className="g-bell g-theme-fab" />}
      <Toast />
      <DialogHost />
    </>
  )
}

export default function App() {
  const boot = useStore(s => s.boot)
  useEffect(() => { boot() }, [boot])
  return <HashRouter><NavigationAccess><Shell /></NavigationAccess></HashRouter>
}
