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
import RestTimer from './components/RestTimer.jsx'
import Login from './views/Login.jsx'
import Home from './views/Home.jsx'
import Plan from './views/Plan.jsx'
import RoutineEdit from './views/RoutineEdit.jsx'
import Workout from './views/Workout.jsx'
import Stats from './views/Stats.jsx'
import History from './views/History.jsx'
import Library from './views/Library.jsx'
import Settings from './views/Settings.jsx'
import Admin from './views/Admin.jsx'
const MuscleMap = lazy(() => import('./views/MuscleMap.jsx'))
// treino guiado (AVAGYM)
import GuidedTabBar from './views/guided/TabBar.jsx'
import Onboarding from './views/guided/Onboarding.jsx'
import Today from './views/guided/Today.jsx'
import { Recommendations, Library as ProgramLibrary, ProgramDetail } from './views/guided/Programs.jsx'
import MyProgram from './views/guided/MyProgram.jsx'
import Train from './views/guided/Train.jsx'
import Done from './views/guided/Done.jsx'
import Progress from './views/guided/Progress.jsx'
import Profile from './views/guided/Profile.jsx'
import AdminPrograms from './views/guided/AdminPrograms.jsx'
// AVADESK Fitness
import Treinos from './views/app/Treinos.jsx'
import Comunidade from './views/app/Comunidade.jsx'
import Gate from './views/app/Locked.jsx'
import Acompanhamento, { Conversa } from './views/app/Acompanhamento.jsx'
import Avisos from './views/app/Avisos.jsx'
import Pro from './views/app/Pro.jsx'
import AdminPanel from './views/app/AdminPanel.jsx'

bindUI(useUI)   // lets the shared controls open sheets without importing the store at module scope

function applyPrefs(theme, accent) {
  const de = document.documentElement
  de.dataset.theme = theme === 'light' ? 'light' : 'dark'
  de.dataset.accent = ACCENTS[accent] ? accent : 'avadesk'
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = de.dataset.theme === 'light' ? '#F8FAFC' : '#0E2439'
}

function Shell() {
  const navigate = useNavigate()
  const loc = useLocation()
  const { S, user, ready } = useStore()
  const isGuest = useStore(s => s.isGuest())
  const langV = useLang()   // re-renders the whole shell when the language (pack) changes
  useEffect(() => { setNav(navigate) }, [navigate])
  useEffect(() => { applyPrefs(S.theme, S.accent) }, [S.theme, S.accent])
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
        <ErrorBoundary>
          {!authed ? <Login /> : (
            <Routes>
              <Route path="/hoje" element={<Today />} />
              <Route path="/treinos" element={<Gate title="Treinos"><Treinos /></Gate>} />
              <Route path="/comunidade" element={<Gate title="Comunidade"><Comunidade /></Gate>} />
              <Route path="/acompanhamento" element={<Gate title="Acompanhamento"><Acompanhamento /></Gate>} />
              <Route path="/conversa/:id" element={<Gate title="Conversa"><Conversa /></Gate>} />
              <Route path="/avisos" element={<Avisos />} />
              <Route path="/pro" element={user?.pro || user?.admin ? <Gate title="Área profissional"><Pro /></Gate> : <Navigate to="/hoje" replace />} />
              <Route path="/admin/painel" element={user?.admin ? <AdminPanel /> : <Navigate to="/hoje" replace />} />
              <Route path="/onboarding" element={<Gate title="Treinos"><Onboarding /></Gate>} />
              <Route path="/recomendados" element={<Recommendations />} />
              <Route path="/programas" element={<ProgramLibrary />} />
              <Route path="/programa/:id" element={<ProgramDetail />} />
              <Route path="/meu-programa" element={<MyProgram />} />
              <Route path="/treinar" element={<Gate title="Treinos"><Train /></Gate>} />
              <Route path="/concluido" element={<Done />} />
              <Route path="/progresso" element={<Gate title="Progresso"><Progress /></Gate>} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/admin/programas" element={user ? <AdminPrograms /> : <Navigate to="/hoje" replace />} />
              <Route path="/home" element={<Home />} />
              <Route path="/plan" element={<Plan />} />
              <Route path="/plan/r/:id" element={<RoutineEdit />} />
              <Route path="/workout" element={<Workout />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/history" element={<History />} />
              <Route path="/library" element={<Library />} />
              <Route path="/muscles" element={<Suspense fallback={null}><MuscleMap /></Suspense>} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={user?.admin ? <Admin /> : <Navigate to="/hoje" replace />} />
              <Route path="*" element={<Navigate to="/hoje" replace />} />
            </Routes>
          )}
        </ErrorBoundary>
      </div>
      {/* barra principal = treino guiado; a antiga só aparece no treino manual em execução */}
      {authed && <GuidedTabBar />}
      <RestTimer />
      <Modals />
      <Toast />
    </>
  )
}

export default function App() {
  const boot = useStore(s => s.boot)
  useEffect(() => { boot() }, [boot])
  return <HashRouter><Shell /></HashRouter>
}
