import { useCallback, useEffect, useRef, useState } from 'react'
import type { Msg } from './types'

/** Studio side of the relay: auto-reconnecting socket to the Vite dev server. */
export function useRelay(onMsg: (m: Msg) => void) {
  const ws = useRef<WebSocket | null>(null)
  const [phones, setPhones] = useState(0)
  const cb = useRef(onMsg)
  cb.current = onMsg

  useEffect(() => {
    let closed = false
    const connect = () => {
      const sock = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/relay?role=studio`)
      sock.onmessage = (e) => {
        const m = JSON.parse(e.data) as Msg
        if (m.type === 'peers') setPhones(m.phones)
        cb.current(m)
      }
      sock.onclose = () => !closed && setTimeout(connect, 1000)
      ws.current = sock
    }
    connect()
    return () => {
      closed = true
      ws.current?.close()
    }
  }, [])

  const send = useCallback((m: Msg) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(m))
  }, [])

  return { phones, send }
}
