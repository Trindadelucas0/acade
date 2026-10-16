// Monetizacao F7/F9: fila "Suspeitas de fraude" (somente leitura na F7; acoes de revisao na F9).
import { useState, useEffect } from 'react'
import { api } from '../../lib/api.js'
export default function AdmFraude() {
  const [d, setD] = useState(null)
  useEffect(() => { api('/api/adm/monetizacao/fraude').then(setD).catch(() => setD({ sinais: [] })) }, [])
  return <div className="ag" data-testid="mon-fraude"><p className="g-xs g-mut">Sinais automáticos só alertam; nenhuma conta é bloqueada automaticamente.</p>
    {!d ? <p>Carregando…</p> : !d.sinais?.length ? <p className="g-mut">Nenhuma suspeita aberta.</p> : <ul>{d.sinais.map(s => <li key={s.id}>{s.kind} · {s.score} pontos</li>)}</ul>}</div>
}
