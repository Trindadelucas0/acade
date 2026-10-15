// V3 · Meu plano: assinatura por área (aluno/profissional), uso × limites, OVER_LIMIT e catálogo (sem preços definidos).
import Icon from '../../components/Icon.jsx'
import { V, SUB_PT, AUD_PT, METRIC_PT, FEAT_PT } from '../../lib/v3.js'
import { Load, Err, Empty, useLoad } from '../app/kit.jsx'
import '../guided/guided.css'

export default function Plans() {
  const [mine, err, reload] = useLoad(() => V.mySubs())
  const [cat, err2] = useLoad(() => V.plans())
  return <div className="ag" data-testid="plans">
    <span className="g-eyebrow">Conta</span><h1>Meu plano</h1>
    {err ? <Err msg={err} retry={reload} /> : !mine ? <Load /> : !Object.keys(mine.subscriptions).length ? <Empty icon="info">Nenhum plano nesta conta.</Empty> :
      Object.entries(mine.subscriptions).map(([aud, s]) => <div key={aud} className="g-card" style={{ marginTop: 12 }} data-testid={'sub-' + aud}>
        <span className="g-eyebrow">{AUD_PT[aud]}</span>
        <div className="g-row"><h3 style={{ margin: '4px 0' }}>{s.plan_name}</h3><span className="g-sp" /><span className={'g-chip' + (s.active ? ' g-on' : '')}>{SUB_PT[s.status]}</span></div>
        {s.over_limit && <p className="g-warn g-sm" data-testid="over-limit">Acima do limite do plano: nada foi apagado, mas novas criações ficam bloqueadas até regularizar.</p>}
        {Object.entries(s.limits).map(([m, lim]) => { const used = s.usage?.[m] || 0, pct = lim ? Math.min(100, Math.round(used / lim * 100)) : 0
          return <div key={m} style={{ marginTop: 8 }}><div className="g-row g-sm"><span>{METRIC_PT[m] || m}</span><span className="g-sp" /><b>{used} / {lim}</b></div>
            <div style={{ height: 8, borderRadius: 8, background: '#ffffff14', marginTop: 4 }}><i style={{ display: 'block', height: 8, borderRadius: 8, width: pct + '%', background: pct >= 100 ? 'var(--ag-warn, #f5a524)' : 'var(--ag-acc)' }} /></div></div> })}
        {s.grants?.length > 0 && <p className="g-xs g-mut" style={{ marginTop: 8 }}>Concessão temporária ativa até {new Date(s.grants[0].expires_at).toLocaleDateString('pt-BR')}.</p>}
        <div className="g-chips" style={{ marginTop: 10 }}>{Object.entries(s.features).filter(([, v]) => v).map(([k]) => <span key={k} className="g-chip">{FEAT_PT[k] || k}</span>)}</div>
      </div>)}
    <h2>Planos disponíveis</h2>
    {err2 ? <Err msg={err2} /> : !cat ? <Load /> : cat.plans.map(p => <div key={p.id} className="g-card" style={{ marginTop: 10, opacity: p.is_placeholder ? .8 : 1 }} data-testid={'plan-' + p.id}>
      <div className="g-row"><b>{p.name}</b><span className="g-sp" /><span className="g-chip">{p.price_label}</span></div>
      <p className="g-xs g-mut" style={{ margin: '4px 0' }}>{AUD_PT[p.audience]} · {p.description}</p>
      {Object.entries(p.current?.limits || {}).map(([m, v]) => <span key={m} className="g-xs"><Icon name="check" /> {METRIC_PT[m] || m}: {v} </span>)}
    </div>)}
    <p className="g-xs g-mut" style={{ marginTop: 12 }}>Contratação online ainda não disponível. Para mudar de plano, fale com a administração.</p>
  </div>
}
