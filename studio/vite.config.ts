import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { WebSocketServer, WebSocket } from 'ws'
import { networkInterfaces } from 'node:os'
import { createHash } from 'node:crypto'
import type { AddressInfo } from 'node:net'

// Dev-server plugin: a WebSocket relay between the studio tab and paired phones,
// plus an in-memory .riv store the phone downloads from.
function relay(): Plugin {
  return {
    name: 'haptics-relay',
    configureServer(server) {
      const wss = new WebSocketServer({ noServer: true })
      // ponytail: in-memory, lost on restart; the studio re-uploads on every send
      const rivs = new Map<string, Buffer>()

      server.httpServer?.on('upgrade', (req, socket, head) => {
        if (!req.url?.startsWith('/relay')) return // leave Vite's HMR socket alone
        wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
      })

      const roles = new WeakMap<WebSocket, string>()
      const broadcastPeers = () => {
        const phones = [...wss.clients].filter((c) => roles.get(c) === 'phone').length
        for (const c of wss.clients) c.send(JSON.stringify({ type: 'peers', phones }))
      }

      wss.on('connection', (ws, req) => {
        roles.set(ws, new URL(req.url!, 'http://x').searchParams.get('role') ?? 'phone')
        ws.on('message', (data) => {
          for (const c of wss.clients) {
            if (c !== ws && c.readyState === WebSocket.OPEN) c.send(data.toString())
          }
        })
        ws.on('close', broadcastPeers)
        broadcastPeers()
      })

      server.middlewares.use((req, res, next) => {
        if (req.url === '/lan') {
          const ip = Object.values(networkInterfaces())
            .flat()
            .find((a) => a && a.family === 'IPv4' && !a.internal)?.address
          const { port } = server.httpServer!.address() as AddressInfo
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ ip: ip ?? 'localhost', port }))
          return
        }
        if (req.url === '/riv' && req.method === 'POST') {
          const chunks: Buffer[] = []
          req.on('data', (c: Buffer) => chunks.push(c))
          req.on('end', () => {
            const buf = Buffer.concat(chunks)
            const name = createHash('sha1').update(buf).digest('hex').slice(0, 12) + '.riv'
            rivs.set(name, buf)
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ path: '/riv/' + name }))
          })
          return
        }
        const m = req.url?.match(/^\/riv\/([\w.]+)$/)
        if (m && rivs.has(m[1])) {
          res.setHeader('content-type', 'application/octet-stream')
          res.end(rivs.get(m[1]))
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), relay()],
  server: { host: true }, // reachable from phones on the same Wi-Fi
})
