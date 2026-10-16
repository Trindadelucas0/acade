import { useEffect, useState } from 'react'
import { useUI } from '../store/useUI.js'

let deferred = null
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; window.dispatchEvent(new Event('avagym-installable')) })
}
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

function Steps({ ios, close }) {
  const step = { display: 'flex', gap: 10, alignItems: 'center', margin: '10px 0', textAlign: 'left' }
  const n = { flex: '0 0 26px', height: 26, borderRadius: 13, background: 'var(--acc)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13 }
  return <>
    <h3>Adicionar {'\u00e0'} tela inicial</h3>
    <div className="muted small" style={{ marginBottom: 8 }}>Instale o AVAGYM para abrir como um app, em tela cheia.</div>
    {ios ? <>
      <div style={step}><span style={n}>1</span><span>Toque em <b>Compartilhar</b> <span style={{ fontSize: 18 }}>{'\u2b06'}</span> na barra do Safari</span></div>
      <div style={step}><span style={n}>2</span><span>Escolha <b>Adicionar {'\u00e0'} Tela de In{'\u00ed'}cio</b></span></div>
      <div style={step}><span style={n}>3</span><span>Toque em <b>Adicionar</b></span></div>
    </> : <>
      <div style={step}><span style={n}>1</span><span>Toque no menu <b>{'\u22ee'}</b> do navegador</span></div>
      <div style={step}><span style={n}>2</span><span>Escolha <b>Adicionar {'\u00e0'} tela inicial</b> ou <b>Instalar app</b></span></div>
    </>}
    <div style={{ height: 12 }} />
    <button className="btn primary" style={{ width: '100%' }} onClick={close}>Entendi</button>
  </>
}

export default function InstallButton() {
  const [installed, setInstalled] = useState(isStandalone())
  const [, force] = useState(0)
  useEffect(() => {
    const r = () => force(x => x + 1)
    const done = () => { deferred = null; setInstalled(true) }
    window.addEventListener('avagym-installable', r)
    window.addEventListener('appinstalled', done)
    return () => { window.removeEventListener('avagym-installable', r); window.removeEventListener('appinstalled', done) }
  }, [])
  if (installed) return null
  const click = async () => {
    if (deferred) {
      deferred.prompt()
      try { const c = await deferred.userChoice; if (c?.outcome === 'accepted') setInstalled(true) } catch {}
      deferred = null; force(x => x + 1); return
    }
    useUI.getState().openSheet(close => <Steps ios={isIOS()} close={close} />)
  }
  return (
    <button onClick={click} style={{ marginTop: 18, alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 999, border: '1.5px solid var(--acc)', background: 'transparent', color: 'var(--acc)', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>{'\uff0b'}</span> Adicionar {'\u00e0'} tela inicial
    </button>
  )
}