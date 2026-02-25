// @ts-ignore -- @tailwindcss/vite types may not resolve in some IDE configurations
import { defineConfig } from 'vite'
// @ts-ignore -- @tailwindcss/vite types may not resolve in some IDE configurations
import react from '@vitejs/plugin-react'
// @ts-ignore -- @tailwindcss/vite types may not resolve in some IDE configurations
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { fileURLToPath, URL } from 'url'

export default defineConfig({
  base: './',
  plugins: [
    TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
