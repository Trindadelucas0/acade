// AVAGYM V5 - #TáPago: cartões Treino do dia, Minha semana e Músculos (1:1, 4:5, 9:16), com prévia, ocultar indicadores e identidade,
// compartilhar com arquivo (Web Share API) e "Salvar imagem" como alternativa. Números vêm do servidor.
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { api } from '../../lib/api.js'
import { CARD_FORMATS } from '../../lib/socialRules.js'
import { drawCard } from '../../lib/shareCard.js'
import './guided.css'

const KINDS = [['treino', 'Treino do dia'], ['semana', 'Minha semana'], ['musculos', 'Músculos']]
const accentColor = () => { const el = document.querySelector('.ag') || document.documentElement; return getComputedStyle(el).getPropertyValue('--ag-acc').trim() || '#b6f23a' }

export default function ShareCard() {
  const [sp, setSp] = useSearchParams(), nav = useNavigate()
  const kind = KINDS.some(([k]) => k === sp.get('tipo')) ? sp.get('tipo') : 'treino'
  const [fmt, setFmt] = useState('9:16'), [showStats, setShowStats] = useState(true), [showWho, setShowWho] = useState(true)
  const [d, setD] = useState(null), [err, setErr] = useState(''), [msg, setMsg] = useState(''), [avatar, setAvatar] = useState(null), [busy, setBusy] = useState(false)
  const ref = useRef(null)
  useEffect(() => { setD(null); setErr(''); setMsg(''); api('/api/me/share-card?kind=' + kind).then(setD).catch(e => setErr(e.message)) }, [kind])
  useEffect(() => { const url = d?.who?.avatar; if (!url) { setAvatar(null); return } const i = new Image(); i.onload = () => setAvatar(i); i.onerror = () => setAvatar(null); i.src = url }, [d?.who?.avatar])
  useEffect(() => {
    if (!d?.eligible || !ref.current) return
    const [w, h] = CARD_FORMATS[fmt], c = ref.current; c.width = w; c.height = h
    drawCard(c.getContext('2d'), { kind, data: d.data, who: d.who, showStats, showWho, avatar, accent: accentColor() })
  }, [d, fmt, showStats, showWho, avatar, kind])
  const fileName = 'tapago-' + kind + '-' + fmt.replace(':', 'x') + '.png'
  const toBlob = () => new Promise(r => ref.current.toBlob(r, 'image/png'))
  const save = async b0 => {
    const b = b0 instanceof Blob ? b0 : await toBlob(), url = URL.createObjectURL(b), a = document.createElement('a')
    a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000)
  }
  const share = async () => {
    setMsg(''); setBusy(true)
    try {
      const b = await toBlob(), file = new File([b], fileName, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: '#TáPago', text: '#TáPago no AVAGYM' }) } catch (e) { if (e?.name !== 'AbortError') setMsg('Não foi possível abrir o compartilhamento. Use "Salvar imagem".') } }
      else { await save(b); setMsg('Seu aparelho não envia arquivos direto para outros apps. A imagem foi salva para você publicar onde quiser.') }
    } finally { setBusy(false) }
  }
  const chip = (on, label, onClick, testid) => <button key={testid} className={'g-chipbtn' + (on ? ' g-on' : '')} aria-pressed={on} onClick={onClick} data-testid={testid}>{label}</button>
  return <div className="ag" data-testid="share-card">
    <button className="g-link org-back" onClick={() => nav(-1)}>‹ Voltar</button>
    <span className="g-eyebrow">Compartilhar</span><h1>#TáPago</h1>
    <div className="g-filters" role="group" aria-label="Tipo de cartão">{KINDS.map(([k, l]) => chip(kind === k, l, () => setSp({ tipo: k }), 'card-kind-' + k))}</div>
    {err ? <p className="g-warn">{err}</p> : !d ? <p className="g-mut" role="status">Carregando.</p> : !d.eligible ? <div className="g-card" data-testid="card-ineligible"><p className="g-sm">{d.reason}</p></div> : <>
      <div className="g-filters" role="group" aria-label="Formato" style={{ marginTop: 8 }}>{Object.keys(CARD_FORMATS).map(k => chip(fmt === k, k, () => setFmt(k), 'card-fmt-' + k.replace(':', 'x')))}</div>
      <div style={{ margin: '12px auto', maxWidth: fmt === '9:16' ? 260 : 340 }}><canvas ref={ref} data-testid="card-canvas" data-format={fmt} style={{ width: '100%', height: 'auto', borderRadius: 16, display: 'block', boxShadow: '0 6px 24px rgba(0,0,0,.25)' }} aria-label="Prévia do cartão" /></div>
      <label className="g-row g-sm" style={{ gap: 8, minHeight: 44 }}><input type="checkbox" checked={showStats} onChange={e => setShowStats(e.target.checked)} data-testid="card-toggle-stats" /> Mostrar indicadores (tempo, séries, volume)</label>
      <label className="g-row g-sm" style={{ gap: 8, minHeight: 44 }}><input type="checkbox" checked={showWho} onChange={e => setShowWho(e.target.checked)} data-testid="card-toggle-who" /> Mostrar meu nome e foto</label>
      <div className="g-row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <button className="g-btn" disabled={busy} onClick={share} data-testid="card-share"><Icon name="sparkles" /> Compartilhar</button>
        <button className="g-btn g-ghost" disabled={busy} onClick={save} data-testid="card-save">Salvar imagem</button>
      </div>
      <p className="g-xs g-mut" style={{ marginTop: 8 }}>Só treinos válidos entram no cartão; treinos com tempo corrigido ficam de fora. Nada é publicado automaticamente.</p>
      {msg && <p className="g-sm" role="status" data-testid="card-msg">{msg}</p>}
    </>}
  </div>
}