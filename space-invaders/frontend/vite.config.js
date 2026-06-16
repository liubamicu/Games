import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// dev (`npm run dev`) serves at "/"; production build is served under "/banana/" by the one-port server.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/banana/' : '/',
  server: { port: 5173 }
}))
