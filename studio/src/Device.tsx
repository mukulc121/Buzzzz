import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/** Pairing card: a QR that opens the preview app straight onto this machine's relay. Collapses once a phone is in. */
export function Device({ phones }: { phones: number }) {
  const [wsUrl, setWsUrl] = useState('')
  const [qr, setQr] = useState('')
  const [showQr, setShowQr] = useState(false)

  useEffect(() => {
    fetch('/lan')
      .then((r) => r.json())
      .then(async ({ ip, port }: { ip: string; port: number }) => {
        const url = `ws://${ip}:${port}/relay`
        setWsUrl(url)
        setQr(await QRCode.toDataURL(`rivehaptics://connect?url=${encodeURIComponent(url)}`, { margin: 1, width: 320 }))
      })
  }, [])

  const open = !phones || showQr
  return (
    <section className="card">
      <header className="card-head">
        <h3>Phone</h3>
        <span className={phones ? 'status on' : 'status'}>
          <i className="dot" key={phones ? 'on' : 'off'} />
          {phones ? `${phones} connected` : 'Waiting'}
        </span>
      </header>
      {phones > 0 && (
        <button className="link" onClick={() => setShowQr((s) => !s)}>{showQr ? 'Hide pairing code' : 'Pair another phone'}</button>
      )}
      {open && (
        <div className="pair">
          {qr ? <img className="qr" src={qr} alt="QR code that opens Haptics Preview on this relay" /> : <div className="qr skeleton" />}
          <ol className="steps">
            <li>Join the same Wi-Fi as this Mac</li>
            <li>Scan with the iPhone camera</li>
            <li>Or paste into the app: <code>{wsUrl}</code></li>
          </ol>
        </div>
      )}
    </section>
  )
}
