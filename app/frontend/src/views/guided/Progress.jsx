import { useEffect, useState } from 'react'
import TimingSummary from '../../components/TimingSummary.jsx'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { G, mediaOf, fmtMin, fmtKg } from '../../lib/guided.js'
import { Spin } from './Programs.jsx'
import MuscleStatus from './MuscleStatus.jsx'
import './guided.css'

const monday = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }
export default function Progress() {
  const nav = useNavigate()
  const [d, setD] = useState(null)
  useEffect(() => { G.progress().then(setD).catch(() => setD(false)) }, [])
  if (d === false) return <div className="ag"><h1>Progresso</h1><p className="g-mut">Sem conexão.</p></div>
  if (!d) return <Spin />
  const now = monday(new Date()), map = Object.fromEntries(d.weeks.map(w => [String(w.wk).slice(0, 10), w.n]))
  const weeks = Array.from({ length: 8 }, (_, i) => { const x = new Date(now); x.setDate(x.getDate() - (7 - i) * 7); const k = x.toISOString().slice(0, 10)
    const n = map[k] || map[new Date(x.getTime() - x.getTimezoneOffset() * 6e4).toISOString().slice(0, 10)] || 0; return { k, n, l: x.getDate() + '/' + (x.getMonth() + 1) } })
  const max = Math.max(3, ...weeks.map(w => w.n))
  return <div className="ag" data-testid="progress">
    <span className="g-eyebrow">Progresso</span>
    <h1>Você está evoluindo</h1>
    <div className="g-stat" style={{ marginTop: 14 }}>
      <div><b>{d.totals.n}</b><span>Treinos</span></div><div><b>{fmtMin(d.totals.secs)}</b><span>Treinando</span></div><div><b>{(d.totals.vol / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t</b><span>Levantadas</span></div>
    </div>
    <h2>Músculos trabalhados</h2>
    <MuscleStatus />
    <div className="g-card g-list" style={{ marginTop: 12 }}>
      <button className="g-li" onClick={() => nav('/muscles')} data-testid="open-3d"><span className="g-ico"><Icon name="person" /></span><span><b>Corpo 3D</b><br /><span className="g-mut g-xs">Veja no modelo anatômico o que você treinou</span></span></button>
      <button className="g-li" onClick={() => nav('/stats')}><span className="g-ico"><Icon name="chart" /></span><span><b>Estatísticas detalhadas</b><br /><span className="g-mut g-xs">1RM, volume e gráficos (registros antigos)</span></span></button>
      <button className="g-li" onClick={() => nav('/history')}><span className="g-ico"><Icon name="history" /></span><span><b>Histórico antigo (somente consulta)</b></span></button>
    </div>
    <h2>Treinos por semana</h2>
    <div className="g-card"><div className="g-bars">{weeks.map(w => <div key={w.k}><b>{w.n || ''}</b><i className={w.n ? '' : 'g-z'} style={{ height: (w.n / max * 100) + '%' }} />{w.l}</div>)}</div></div>
    <h2>Recordes</h2>
    <div className="g-card g-list">{d.records.length ? d.records.map(r => { const m = mediaOf(r.media)
      return <div key={r.exercise_id} className="g-li">{m ? <img className="g-thumb" src={m.img} alt="" /> : <span className="g-ico"><Icon name="trophy" /></span>}
        <span style={{ minWidth: 0 }}><b>{r.name}</b><br /><span className="g-mut g-xs">{new Date(r.started_at).toLocaleDateString('pt-BR')}</span></span>
        <b className="g-acc" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>{fmtKg(r.weight)} × {r.reps}</b></div> })
      : <p className="g-mut g-sm">Seus recordes aparecem aqui depois dos primeiros treinos com carga.</p>}</div>
    <h2>Histórico</h2>
    <div className="g-card g-list">{d.history.length ? d.history.map(h => <div key={h.id} className="g-li">
        <span className="g-ico"><Icon name="check" /></span>
        <span style={{ minWidth: 0 }}><b>{h.workout_name}</b><br /><span className="g-mut g-xs">{new Date(h.started_at).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })} · {fmtMin(h.corrected && h.manual_sec != null ? h.manual_sec : h.duration_sec)}{h.corrected ? ' (tempo corrigido)' : ''} · {h.sets_count} séries{h.pain ? ' · dor registrada' : ''}{h.origin === 'legado' ? ' · registro antigo' : ''}{h.counts_in_metrics === false ? ' · fora das métricas' : ''}</span>{h.timing && !h.corrected && <><br /><TimingSummary t={h.timing} compact /></>}</span>
        <span className="g-mut g-sm" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>{fmtKg(h.volume)}</span></div>)
      : <><p className="g-mut g-sm">Nenhum treino ainda.</p><button className="g-btn" style={{ marginTop: 10 }} onClick={() => nav('/hoje')}>Começar agora</button></>}</div>
  </div>
}
