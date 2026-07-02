// vite.config.js
import { defineConfig } from 'vite'
import { createHtmlPlugin } from 'vite-plugin-html'

export default defineConfig({
  plugins: [
    createHtmlPlugin({
      inject: {
        data: {
          // Estas variáveis serão injetadas no HTML
          SUPABASE_URL: process.env.VITE_SUPABASE_URL,
          SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
        }
      }
    })
  ],
  server: {
    port: 3000,  // Porta onde vai rodar
    open: true   // Abre automaticamente no navegador
  }
})