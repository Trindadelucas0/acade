import { useEffect, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { G, GOAL_PT, LEVEL_PT, LOC_PT } from '../../lib/guided.js'
import './guided.css'

const ST = [['rascunho', 'Rascunho'], ['revisao', 'Em revisão'], ['publicado', 'Publicado'], ['arquivado', 'Arquivado']]
export default function AdminPrograms() {
  const user = useStore(s => s.user)
  const [list, setList] = useState(null), [msg, setMsg] = useState('')
  const load = () => G.adminPrograms().then(r => setList(r.programs)).catch(e => setMsg(e.message))
  useEffect(() => { load() }, [])
  const change = async (id, status) => { try { await G.setStatus(id, status); setMsg('Status atualizado'); load() } catch (e) { setMsg(e.message) } }
  return <div className="ag" data-testid="admin-programs">
    <span className="g-eyebrow">Profissionais</span>
    <h1>Programas</h1>
    <p className="g-mut g-sm">Só programas publicados aparecem para os alunos.</p>
    {msg && <p className="g-note" style={{ marginTop: 10 }}>{msg}</p>}
    <div className="g-card g-list" style={{ marginTop: 14 }}>{(list || []).map(p => <div key={p.id} className="g-li" style={{ cursor: 'default' }}>
      <span style={{ minWidth: 0, flex: 1 }}><b>{p.title}</b><br /><span className="g-mut g-xs">{p.is_rehab ? 'Fisioterapia' : GOAL_PT[p.goal]} · {LEVEL_PT[p.level]} · {LOC_PT[p.location]} · {p.days_per_week}x · v{p.version} · {p.active_users} aluno(s)</span></span>
      <select value={p.status} disabled={!user?.admin} onChange={e => change(p.id, e.target.value)}>{ST.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    </div>)}</div>
  </div>
}
