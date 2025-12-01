import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces for development
    port: 5173,
    proxy: { 
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Optimize bundle size
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          tiptap: ['@tiptap/react', '@tiptap/core', '@tiptap/starter-kit']
        }
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 4173
  }
})
