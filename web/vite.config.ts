import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type ProxyOptions } from 'vite'

// The Go API (see ../api). Requests to /api go through Vite's server, so the
// browser sees a single origin — also when the app is opened from a phone on the LAN.
const apiProxy: Record<string, ProxyOptions> = {
  '/api': {
    target: process.env.API_PROXY_TARGET ?? 'http://localhost:8080',
    changeOrigin: true,
    configure: (proxy) => {
      // Proxied calls are same-origin for the browser, so drop Origin; otherwise the
      // API's CORS check rejects any dev origin it doesn't list (other ports, LAN IPs).
      proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'))
    },
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // "@/…" = src/… (mirrored in tsconfig.app.json)
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
})
