import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { G, loadSession, saveSessionLocal, newSession, payloadOf, mediaOf, RESTR_PT } from '../../lib/guided.js'
import { Spin } from './Programs.jsx'
import { C } from '../../lib/care.js'
import { ReportSheet, AskSheet } from '../app/Acompanhamento.jsx'
import './guided.css'

const mmss = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') }
const beep = () => { try { const c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.value = .15; o.start(); o.stop(c.currentTime + .25); navigator.vibrate?.(200) } catch { /* */ } }

export default function Train() {
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const [s, setS] = useState(() => loadSession())
  const [err, setErr] = useState(''), [, tick] = useState(0), [how, setHow] = useState(false), [bad, setBad] = useState({})
  const syncTm = useRef(null)
  const [blocks, setBlocks] = useState(new Set()), [sheet, setSheet] = useState(null), [flash, setFlash] = useState('')
  useEffect(() => { C.blocks().then(r => setBlocks(new Set(r.blocks.map(b => b.exercise_id)))).catch(() => {}) }, [])

  // carrega o treino de hoje se não houver sessão salva no aparelho
  useEffect(() => {
    if (s) return
    // plano prescrito por um profissional (Treinos → plano do profissional)
    if (sp.get('plan')) { C.plan(sp.get('plan')).then(({ plan }) => {
      const n = newSession({ active: { id: null, title: plan.title + ' · ' + plan.owner_name }, workout: { id: null, name: plan.title, exercises: plan.exercises.map(e => ({ ...e, reps_min: e.reps_min, reps_max: e.reps_max })) } })
      n.plan_id = plan.id; saveSessionLocal(n); setS(n) }).catch(e => setErr(e.message || 'Plano indisponível')); return }
    G.today(sp.get('w')).then(t => {
      if (!t.active) return nav('/recomendados', { replace: true })
      if (!t.workout) return setErr('Este programa não tem treinos.')
      const n = newSession(t); saveSessionLocal(n); setS(n)
    }).catch(() => setErr('Sem conexão para baixar o treino. Tente de novo.'))
  }, [s, sp, nav])
  // sessão retomada criada antes de a mídia existir: completa mídia/instruções pelo servidor
  useEffect(() => {
    if (!s || !s.exercises.some(e => !e.media)) return
    G.today(s.program_workout_id).then(t => {
      const by = Object.fromEntries((t.workout?.exercises || []).map(e => [e.exercise_id, e]))
      if (Object.values(by).some(e => e.media)) update(x => { x.exercises.forEach(e => { const n = by[e.exercise_id]; if (n) { e.media = e.media || n.media; e.instructions = e.instructions || n.instructions } }) })
    }).catch(() => {})
  }, [s?.client_id]) // eslint-disable-line
  useEffect(() => { if (s?.finishing) nav('/concluido', { replace: true }) }, [s?.finishing, nav])
  useEffect(() => { const i = setInterval(() => tick(x => x + 1), 500); return () => clearInterval(i) }, [])
  // fim do descanso -> aviso sonoro e segue
  useEffect(() => {
    if (s?.rest && Date.now() >= s.rest.until) { beep(); update(x => { x.rest = null }) }
  })

  if (err) return <div className="ag g-full"><p className="g-warn">{err}</p><button className="g-btn" style={{ marginTop: 16 }} onClick={() => nav('/hoje')}>Voltar</button></div>
  if (!s) return <Spin />

  function update(fn) {
    setS(prev => {
      const n = JSON.parse(JSON.stringify(prev)); fn(n); saveSessionLocal(n)
      // sincronização em segundo plano (melhor esforço): o aparelho é a fonte da verdade até concluir
      clearTimeout(syncTm.current); syncTm.current = setTimeout(() => { G.saveSession(payloadOf(n)).catch(() => {}) }, 1500)
      return n
    })
  }
  const ex = s.exercises[s.exIdx]
  const isBlocked = blocks.has(ex.exercise_id)
  const setNo = Math.min(ex.done.length + 1, ex.sets)
  const allDoneEx = ex.done.length >= ex.sets
  const totalSets = s.exercises.reduce((a, e) => a + e.sets, 0), doneSets = s.exercises.reduce((a, e) => a + e.done.length, 0)
  const m = mediaOf(ex.media)
  const elapsed = (Date.now() - new Date(s.started_at)) / 1000
  const isLastEx = s.exIdx >= s.exercises.length - 1
  const restLeft = s.rest ? (s.rest.until - Date.now()) / 1000 : 0
  const wStep = (ex.weight || 0) >= 20 ? 2 : 1

  const adj = (k, d) => update(x => { const e = x.exercises[x.exIdx]; e[k] = Math.max(0, Math.round(((+e[k] || 0) + d) * 10) / 10) })
  const goNext = () => update(x => { x.rest = null; if (x.exIdx < x.exercises.length - 1) x.exIdx++ ; else x.finishing = true })
  const finishSet = () => {
    update(x => {
      const e = x.exercises[x.exIdx]
      e.done.push({ weight: e.weight, reps: e.reps, at: new Date().toISOString() })
      const last = e.done.length >= e.sets
      if (last && x.exIdx >= x.exercises.length - 1) { x.finishing = true; x.rest = null; return }
      x.rest = { until: Date.now() + (e.rest_sec || 60) * 1000, total: e.rest_sec || 60, afterNext: last }
      if (last) x.exIdx++
    })
  }
  if (s.finishing) return <Spin />
  const pause = () => nav('/hoje')
  const quit = () => { if (confirm('Encerrar o treino agora? As séries feitas serão salvas.')) update(x => { x.finishing = true }) }

  return <div className="ag g-full g-run" data-testid="train">
    <div className="g-runtop">
      <button className="g-icbtn" onClick={pause} aria-label="Pausar e sair"><Icon name="pause" /></button>
      <div style={{ flex: 1 }}>
        <div className="g-row g-xs g-mut"><span>Exercício {s.exIdx + 1} de {s.exercises.length}</span><span className="g-sp" /><span><Icon name="g-clock" /> {mmss(elapsed)}</span></div>
        <div className="g-bar" style={{ marginTop: 6 }}><i style={{ width: doneSets / totalSets * 100 + '%' }} /></div>
      </div>
      <button className="g-icbtn" onClick={quit} aria-label="Encerrar treino"><Icon name="flag" /></button>
    </div>

    {m && !bad[ex.exercise_id] ? <div className="g-media" onClick={() => setHow(h => !h)}>
      <img key={ex.exercise_id} src={m.gif || m.img} alt={ex.name} data-testid="ex-media"
        onError={e => { if (m.img && e.currentTarget.src !== new URL(m.img, location.href).href) e.currentTarget.src = m.img; else setBad(b => ({ ...b, [ex.exercise_id]: 1 })) }} />
    </div> : <div className="g-media g-x g-noimg" data-testid="ex-media-placeholder">
      <Icon name="stretch" /><span className="g-xs g-mut">Sem vídeo para este exercício — siga as instruções abaixo</span>
    </div>}
    <div className="g-row"><h1 style={{ fontSize: 24, margin: 0 }} data-testid="ex-name">{ex.name}</h1><span className="g-sp" /><button className="g-link" onClick={() => setHow(h => !h)}>{how ? 'Fechar' : 'Como fazer'}</button></div>
    {(how || !m || bad[ex.exercise_id]) && <p className="g-mut g-sm" style={{ marginTop: 6 }}>{ex.instructions || 'Faça o movimento devagar e com controle. Pare se sentir dor.'}</p>}
    {ex.cautions?.length > 0 && <p className="g-warn" style={{ marginTop: 6 }}>Atenção: faça com cuidado se sente {ex.cautions.map(c => RESTR_PT[c.code]?.toLowerCase()).join(', ')}. Pare se doer.</p>}

    <div style={{ marginTop: 12 }}>
      <div className="g-setlbl" data-testid="set-label">Série <b>{setNo}</b> de {ex.sets} · meta {ex.timed ? `${ex.duration_sec} s` : `${ex.reps_min || ''}${ex.reps_max && ex.reps_max !== ex.reps_min ? '–' + ex.reps_max : ''} repetições`}</div>
      <div className="g-dots">{Array.from({ length: ex.sets }, (_, i) => <i key={i} className={i < ex.done.length ? 'g-on' : i === ex.done.length ? 'g-cur' : ''} />)}</div>
      {ex.last && <p className="g-dim g-xs" style={{ marginTop: 8 }}>Última vez: {ex.last.map(l => ex.timed ? `${l.reps ?? '—'}` : `${l.weight ? l.weight + ' kg × ' : ''}${l.reps}`).join(' · ')}</p>}
      {ex.note && <p className="g-acc g-xs" style={{ marginTop: 4 }}>Sugestão: {ex.note}</p>}
    </div>

    <div className="g-steppers" style={ex.timed ? { gridTemplateColumns: '1fr' } : null}>
      {!ex.timed && <div className="g-stp"><div className="g-lb">Carga</div>
        <div className="g-val" data-testid="weight">{ex.weight || 0}<small>kg</small></div>
        <div className="g-pm"><button onClick={() => adj('weight', -wStep)} aria-label="Diminuir carga">−</button><button onClick={() => adj('weight', wStep)} aria-label="Aumentar carga">+</button></div></div>}
      <div className="g-stp"><div className="g-lb">{ex.timed ? 'Segundos' : 'Repetições'}</div>
        <div className="g-val" data-testid="reps">{ex.reps}</div>
        <div className="g-pm"><button onClick={() => adj('reps', ex.timed ? -5 : -1)} aria-label="Diminuir">−</button><button onClick={() => adj('reps', ex.timed ? 5 : 1)} aria-label="Aumentar">+</button></div></div>
    </div>

    {isBlocked && <div className="g-blocked" data-testid="ex-blocked"><b>Exercício pausado</b><p className="g-mut g-sm">Você relatou dor ou desconforto. Ele fica bloqueado até seu profissional registrar uma orientação explícita. Siga para o próximo exercício.</p></div>}
    {flash && <p className="g-note" style={{ marginTop: 8 }}>{flash}</p>}
    {isBlocked ? null : !allDoneEx ? <button className="g-btn g-xl" onClick={finishSet} data-testid="finish-set"><Icon name="check" /> CONCLUIR SÉRIE</button>
      : <button className="g-btn g-xl" onClick={goNext}>{isLastEx ? 'FINALIZAR TREINO' : 'PRÓXIMO EXERCÍCIO'}</button>}
    <button className="g-btn g-ghost g-sm" style={{ marginTop: 10 }} onClick={goNext} data-testid="next-ex">{isLastEx ? 'Finalizar treino' : 'Pular para o próximo exercício'}</button>

    <div className="g-actions">
      <button className="g-btn g-ghost g-sm" onClick={() => setSheet('ask')} data-testid="ask"><Icon name="chat" /> Tenho uma dúvida</button>
      <button className="g-btn g-ghost g-sm" onClick={() => setSheet('report')} data-testid="report"><Icon name="flag" /> Relatar problema</button>
    </div>
    {sheet === 'ask' && <AskSheet ctx={{ exercise_id: ex.exercise_id, exercise_name: ex.name, plan_id: s.plan_id, context_type: 'exercicio' }} onClose={() => setSheet(null)} onDone={() => { setSheet(null); setFlash('Dúvida enviada ao profissional responsável.') }} />}
    {sheet === 'report' && <ReportSheet ctx={{ exercise_id: ex.exercise_id, exercise_name: ex.name, plan_id: s.plan_id, session_client_id: s.client_id }} onClose={() => setSheet(null)}
      onDone={r => { setSheet(null); if (r.blocked) setBlocks(b => new Set([...b, ex.exercise_id])); setFlash(r.blocked ? 'Relato enviado. O exercício foi pausado até a orientação profissional.' : 'Relato enviado ao profissional responsável.'); update(x => { x.rest = null }) }} />}
    {s.rest && <div className="g-rest" data-testid="rest">
      <span className="g-eyebrow">Descanse</span>
      <div className="g-clock" data-testid="rest-clock">{mmss(restLeft)}</div>
      <div className="g-bar" style={{ width: '100%', maxWidth: 360, flex: 'none' }}><i style={{ width: (1 - restLeft / s.rest.total) * 100 + '%' }} /></div>
      <div className="g-pmrow">
        <button className="g-btn g-ghost" onClick={() => update(x => { x.rest.until -= 15000 })}>−15 s</button>
        <button className="g-btn g-ghost" onClick={() => update(x => { x.rest.until += 15000; x.rest.total += 15 })}>+15 s</button>
      </div>
      <div className="g-nextup g-card"><span className="g-mut g-xs">{s.rest.afterNext ? 'Próximo exercício' : 'Próxima série'}</span><br /><b>{ex.name}</b> · série {setNo} de {ex.sets}</div>
      <button className="g-btn" style={{ maxWidth: 360 }} onClick={() => update(x => { x.rest = null })} data-testid="skip-rest">Pular descanso</button>
    </div>}
  </div>
}
