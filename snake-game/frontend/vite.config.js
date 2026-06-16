import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// dev (`npm run dev`) serves at "/"; production build is served under "/snake/" by the one-port server.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/snake/' : '/',
  server: {
    port: 5174,
  },
}))
