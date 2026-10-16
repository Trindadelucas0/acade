// Monetizacao F5 (revisado 16/10): indicacao por CODIGO de cupom (sem link). O amigo digita o codigo no campo de cupom
// do cadastro (etapa 4) ou de Planos e pagamento. Mostra numeros e pessoas indicadas - D5:
// nome, @, data do cadastro e status; nunca telefone ou e-mail).
import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import './plans.css'

const ST = { assinante: 'Assinante', teste: 'Em teste', teste_encerrado: 'Teste encerrado', cadastrado: 'Cadastrado' }
export const REF_KEY = 'avagym_ref'
export function readRef() {
  try { const r = JSON.parse(localStorage.getItem(REF_KEY) || 'null'); if (r && Date.now() - r.at < (r.window_days || 30) * 864e5) return r; localStorage.removeItem(REF_KEY) } catch { /* */ }
  return null
}
export function saveRef(d) { try { const cur = readRef(); if (!cur) localStorage.setItem(REF_KEY, JSON.stringify({ code: d.code, coupon: d.coupon, name: d.referrer?.first_name, window_days: d.window_days, at: Date.now() })) } catch { /* */ } }   // primeiro clique vence

export default function ReferralPanel({ compact }) {
  const [d, setD] = useState(null), [copied, setCopied] = useState(false)
  useEffect(() => { api('/api/referral/me').then(setD).catch(() => setD(false)) }, [])
  if (!d || !d.code) return null
  const copy = async () => { try { await navigator.clipboard.writeText(d.code) } catch { /* sem permissao: o codigo continua visivel */ } setCopied(true); setTimeout(() => setCopied(false), 1800) }
  return <section className="g-card" data-testid="referral-panel" style={{ marginTop: 16 }}>
    <span className="g-eyebrow">Indique um amigo</span>
    <h3 style={{ margin: '4px 0' }}>Seu código de indicação</h3>
    <p className="g-mut g-sm" style={{ margin: 0 }}>Quem usar seu código no campo de cupom ganha 7 dias de teste e fica registrado como sua indicação.</p>
    <div className="rf-code"><b data-testid="referral-code">{d.code}</b><button className="g-btn" onClick={copy} data-testid="referral-copy">{copied ? 'Copiado!' : 'Copiar código'}</button></div>
    <div className="rf-metrics" data-testid="referral-metrics">{[['Cadastros', d.cadastros], ['Testes', d.testes], ['Assinantes', d.assinantes]].map(([k, v]) => <div key={k}><b>{v ?? 0}</b><span>{k}</span></div>)}</div>
    {compact ? <a className="g-link g-sm" href="#/perfil?secao=indicacoes" data-testid="referral-more">Ver pessoas indicadas</a> : <>
      {d.pessoas?.length ? <ul className="rf-people" data-testid="referral-people">{d.pessoas.map((p, i) => <li key={i}><span><b>{p.name}</b>{p.handle ? ' @' + p.handle : ''}<br /><small className="g-mut">Cadastro em {new Date(p.cadastro).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</small></span><span className={'rf-st ' + p.status}>{ST[p.status] || p.status}</span></li>)}</ul>
        : <p className="g-mut g-sm">Ninguém usou seu código ainda.</p>}
      <p className="g-xs g-mut">Por privacidade, telefone e e-mail das pessoas indicadas não são exibidos.</p></>}
  </section>
}
