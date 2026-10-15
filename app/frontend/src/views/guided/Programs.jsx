import { useEffect, useState } from 'react'
import ProgramBadges from '../../components/ProgramBadges.jsx'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { G, GOALS, GOAL_PT, LEVEL_PT, LOC_PT, RESTR_PT, mediaOf, minutesLabel, repsLabel } from '../../lib/guided.js'
import './guided.css'
import { ask, notifyError } from '../../lib/dialog.js'

export const Spin = () => <div className="ag"><div className="g-center g-dim" style={{ paddingTop: '40vh' }}><Icon name="dumbbell" /></div></div>

export function Cover({ p, big, badge }) {
  const m = mediaOf(p.cover_url)
  return <div className={'g-cover' + (big ? ' g-lg' : '')}>
    {m && <img src={m.img} alt="" loading="lazy" />}
    {badge && <span className="g-badge">{badge}</span>}
    {!big && <div className="g-ttl">{p.title}</div>}
  </div>
}
const Meta = ({ p }) => <div className="g-chips">
  <span className="g-chip">{p.weeks} semanas</span><span className="g-chip">{p.days_per_week}x por semana</span>
  <span className="g-chip">{minutesLabel(p)}</span><span className="g-chip">{LOC_PT[p.location]}</span><span className="g-chip">{LEVEL_PT[p.level]}</span>
</div>

export function ProgramCard({ p, badge, why, onClick }) {
  return <button className="g-pcard" onClick={onClick} data-testid="program-card">
    <Cover p={p} badge={badge} />
    <div className="g-pbody">
      <Meta p={p} />
      <ProgramBadges p={p} compact />
      {p.description && <p className="g-mut g-sm" style={{ marginTop: 10 }}>{p.description}</p>}
      {why && why.length > 0 && <div className="g-why"><b>POR QUE ESTE PROGRAMA</b><ul>{why.map((w, i) => <li key={i}>{w}</li>)}</ul></div>}
    </div>
  </button>
}

export function Recommendations() {
  const nav = useNavigate()
  const [d, setD] = useState(null), [err, setErr] = useState('')
  useEffect(() => { G.recs().then(setD).catch(e => { if (e.status === 400) nav('/onboarding', { replace: true }); else setErr(e.message) }) }, [nav])
  if (err) return <div className="ag"><p className="g-warn">{err}</p></div>
  if (!d) return <Spin />
  const p = d.profile
  return <div className="ag" data-testid="recs">
    <span className="g-eyebrow">Encontramos para você</span>
    <h1>Seus 3 melhores programas</h1>
    <div className="g-chips" style={{ margin: '8px 0 4px' }}>
      <span className="g-chip g-on">{GOAL_PT[p.objetivo]}</span><span className="g-chip">{LEVEL_PT[p.nivel]}</span><span className="g-chip">{LOC_PT[p.local]}</span>
      <span className="g-chip">{p.dias} dias</span><span className="g-chip">{p.minutos} min</span>
      {(p.restricoes || []).map(r => <span key={r} className="g-chip">Cuidado: {RESTR_PT[r]}</span>)}
    </div>
    {d.notes.map((n, i) => <p key={i} className="g-note" style={{ marginTop: 10 }}>{n}</p>)}
    <div style={{ marginTop: 16 }}>
      {d.recommendations.length ? d.recommendations.map((r, i) => <ProgramCard key={r.id} p={r} why={r.why} badge={i === 0 ? 'Mais indicado' : null} onClick={() => nav('/programa/' + r.id)} />)
        : <div className="g-card"><p>Não encontramos um programa ideal com essas respostas.</p><button className="g-link" onClick={() => nav('/onboarding')}>Refazer perguntas</button></div>}
    </div>
    <div className="g-row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
      <button className="g-link" onClick={() => nav('/onboarding')}>Refazer perguntas</button>
      <button className="g-link" onClick={() => nav('/programas')}>Ver todos os programas</button>
    </div>
  </div>
}

export function Library() {
  const nav = useNavigate()
  const [goal, setGoal] = useState('')
  const [list, setList] = useState(null)
  useEffect(() => { setList(null); G.programs(goal).then(r => setList(r.programs)).catch(() => setList([])) }, [goal])
  return <div className="ag" data-testid="library">
    <span className="g-eyebrow">Programas</span>
    <h1>Escolha seu objetivo</h1>
    <p className="g-mut">Programas prontos, montados por profissionais. É só seguir.</p>
    <button className="g-card g-row" style={{ width: '100%', margin: '14px 0', color: 'inherit', cursor: 'pointer', textAlign: 'left' }} onClick={() => nav('/recomendados')}>
      <span className="g-ico" style={{ fontSize: 22, color: 'var(--ag-acc)' }}><Icon name="sparkles" /></span>
      <span><b>Recomendados para você</b><br /><span className="g-mut g-sm">Com base nas suas respostas</span></span>
      <span className="g-sp" /><Icon name="play" />
    </button>
    <div className="g-scrollx">
      <button className={'g-chipbtn' + (!goal ? ' g-on' : '')} onClick={() => setGoal('')}>Todos</button>
      {GOALS.map(([v, l]) => <button key={v} className={'g-chipbtn' + (goal === v ? ' g-on' : '')} onClick={() => setGoal(v)}>{v === 'rehab' ? 'Fisioterapia' : l}</button>)}
    </div>
    <div style={{ marginTop: 12 }}>
      {!list ? <p className="g-dim g-center">Carregando…</p> : list.map(p => <ProgramCard key={p.id} p={p} onClick={() => nav('/programa/' + p.id)} />)}
    </div>
  </div>
}

export function ProgramDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [p, setP] = useState(null), [st, setSt] = useState(null), [busy, setBusy] = useState(false), [open, setOpen] = useState(0)
  useEffect(() => { G.program(id).then(r => setP(r.program)).catch(() => setP(false)); G.state().then(setSt).catch(() => {}) }, [id])
  if (p === false) return <div className="ag"><p>Programa não encontrado.</p></div>
  if (!p) return <Spin />
  const isActive = st?.active?.program_id === p.id
  const restr = st?.profile?.restricoes || []
  const start = async () => {
    if (st?.active && !isActive && !await ask(`Trocar "${st.active.title}" por "${p.title}"?`, { text: 'Seu histórico continua salvo.', ok: 'Trocar programa', cancel: 'Manter atual' })) return
    setBusy(true)
    try { await G.start(p.id); nav('/hoje', { replace: true }) } catch (e) { notifyError(e) } finally { setBusy(false) }
  }
  return <div className="ag" data-testid="program-detail">
    <div className="g-row" style={{ marginBottom: 10 }}>
      <button className="g-icbtn" onClick={() => nav(-1)} aria-label="Voltar"><span style={{ transform: 'scaleX(-1)', display: 'flex' }}><Icon name="play" /></span></button>
      <span className="g-eyebrow">{p.is_rehab ? 'Fisioterapia' : GOAL_PT[p.goal]}</span>
    </div>
    <Cover p={p} big badge={isActive ? 'Seu programa' : null} />
    <h1>{p.title}</h1>
    <Meta p={p} />
    <p className="g-mut" style={{ marginTop: 12 }}>{p.description}</p>
    {p.is_rehab && <p className="g-note" style={{ marginTop: 12 }}>Este programa não substitui a avaliação de um profissional. Se a dor aumentar, pare e procure um fisioterapeuta ou médico.</p>}
    <div className="g-card" style={{ marginTop: 16 }}>
      <div className="g-row g-xs g-mut" style={{ marginBottom: 6 }}><Icon name="dumbbell" /> Equipamentos</div>
      <p className="g-sm">{p.equipment_pt.join(' · ') || 'Nenhum'}</p>
      <div className="g-row g-xs g-mut" style={{ margin: '12px 0 6px' }}><Icon name="target" /> Músculos trabalhados</div>
      <p className="g-sm">{p.muscles_pt.join(' · ')}</p>
      <div className="g-row g-xs g-mut" style={{ margin: '12px 0 6px' }}><Icon name="person" /> Autor</div>
      <p className="g-sm">{p.author_name || 'Equipe AVADESK'} · versão {p.version}{p.origin_kind === 'seed' && !p.author_verified ? ' · autoria ainda não verificada' : ''}</p>
      <ProgramBadges p={p} />
    </div>
    <h2>{p.workouts.length} treinos que se repetem na semana</h2>
    {p.workouts.map((w, i) => <div className="g-card" key={w.id}>
      <button className="g-row" style={{ width: '100%', background: 'none', border: 0, color: 'inherit', padding: 0, cursor: 'pointer', textAlign: 'left', minHeight: 44 }} onClick={() => setOpen(open === i ? -1 : i)}>
        <span className="g-chip g-on" style={{ fontWeight: 800 }}>{w.day_label || i + 1}</span>
        <span><b>{w.name}</b><br /><span className="g-mut g-xs">{w.exercises.length} exercícios</span></span>
        <span className="g-sp" /><span className="g-dim">{open === i ? '−' : '+'}</span>
      </button>
      {open === i && <div style={{ marginTop: 8 }}>{w.exercises.map(e => {
        const m = mediaOf(e.media)
        const c = e.cautions.filter(c => restr.includes(c.code))
        return <div className="g-exrow" key={e.id}>
          {m ? <img className="g-thumb" src={m.img} alt="" loading="lazy" /> : <div className="g-thumb g-x"><Icon name="dumbbell" /></div>}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 650 }}>{e.name}</div>
            <div className="g-mut g-sm">{e.sets} séries · {repsLabel(e)} · descanso {e.rest_sec}s</div>
            {c.length > 0 && <div className="g-warn">Faça com cuidado ({c.map(x => RESTR_PT[x.code]).join(', ')}). Pare se doer.</div>}
          </div>
        </div>
      })}</div>}
    </div>)}
    <div className="g-bottom">
      {isActive ? <button className="g-btn" onClick={() => nav('/hoje')}>Ir para o treino de hoje</button>
        : <button className="g-btn g-xl" disabled={busy} onClick={start} data-testid="start-program">{busy ? 'Preparando…' : 'COMEÇAR PROGRAMA'}</button>}
    </div>
  </div>
}
