// Monetizacao F5: painel "Minhas indicações" (link /convite/CODIGO, cupom, números e pessoas indicadas - D5:
// nome, @, data do cadastro e status; nunca telefone ou e-mail).
import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

const ST = { assinante: 'Assinante', teste: 'Em teste', teste_encerrado: 'Teste encerrado', cadastrado: 'Cadastrado' }
export const REF_KEY = 'avagym_ref'
export function readRef() {
  try { const r = JSON.parse(localStorage.getItem(REF_KEY) || 'null'); if (r && Date.now() - r.at < (r.window_days || 30) * 864e5) return r; localStorage.removeItem(REF_KEY) } catch { /* */ }
  return null
}
export function saveRef(d) { try { const cur = readRef(); if (!cur) localStorage.setItem(REF_KEY, JSON.stringify({ code: d.code, coupon: d.coupon, name: d.referrer?.first_name, window_days: d.window_days, at: Date.now() })) } catch { /* */ } }   // primeiro clique vence

export default function ReferralPanel() {
  const [d, setD] = useState(null), [copied, setCopied] = useState('')
  useEffect(() => { api('/api/referral/me').then(setD).catch(() => setD(false)) }, [])
  if (!d) return null
  const copy = async (t, k) => { try { await navigator.clipboard.writeText(t); setCopied(k); setTimeout(() => setCopied(''), 1500) } catch { /* */ } }
  return <section className="bl-card" data-testid="referral-panel" style={{ marginTop: 16 }}>
    <h2 className="bl-h2">Minhas indicações</h2>
    <p className="bl-fine">Compartilhe seu link. Quem se cadastrar por ele fica registrado como sua indicação (vale o primeiro link usado, por até 30 dias).</p>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <code data-testid="referral-link" style={{ wordBreak: 'break-all' }}>{d.link}</code>
      <button className="bl-btn ghost" onClick={() => copy(d.link, 'link')}>{copied === 'link' ? 'Copiado!' : 'Copiar link'}</button>
    </div>
    {d.coupons?.filter(c => c.status === 'ativo').map(c => <p key={c.code} className="bl-fine">Seu cupom: <b>{c.code}</b> (7 dias de teste para quem usar) <button className="bl-btn ghost" onClick={() => copy(c.code, c.code)}>{copied === c.code ? 'Copiado!' : 'Copiar'}</button></p>)}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 8, margin: '10px 0' }} data-testid="referral-metrics">
      {[['Cliques', d.cliques], ['Cadastros', d.cadastros], ['Testes', d.testes], ['Assinantes', d.assinantes]].map(([k, v]) => <div key={k} className="bl-card" style={{ padding: 10, textAlign: 'center' }}><b style={{ fontSize: 20 }}>{v}</b><br /><span className="bl-fine">{k}</span></div>)}
    </div>
    {d.pessoas?.length ? <table className="bl-table" data-testid="referral-people" style={{ width: '100%' }}><thead><tr><th>Nome</th><th>@</th><th>Cadastro</th><th>Status</th></tr></thead>
      <tbody>{d.pessoas.map((p, i) => <tr key={i}><td>{p.name}</td><td>{p.handle ? '@' + p.handle : '-'}</td><td>{new Date(p.cadastro).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td><td>{ST[p.status] || p.status}</td></tr>)}</tbody></table>
      : <p className="bl-fine">Ninguém se cadastrou pelo seu link ainda.</p>}
    <p className="bl-fine">Por privacidade, telefone e e-mail das pessoas indicadas não são exibidos.</p>
  </section>
}
