import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split the heavy vendor libraries so a visiting parent downloads the
        // marketing page without the whole Firestore/animation payload.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('firebase/firestore') || id.includes('@firebase/firestore'))
            return 'firebase-data'
          if (id.includes('firebase/') || id.includes('@firebase/')) return 'firebase-core'
          if (id.includes('framer-motion') || id.includes('motion-dom')) return 'motion'
          if (id.includes('recharts') || id.includes('d3-')) return 'charts'
          if (id.includes('react-router')) return 'router'
        },
      },
    },
  },
})
