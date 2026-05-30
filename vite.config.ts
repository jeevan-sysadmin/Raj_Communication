import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      // Remove babel plugin for now - it's causing issues
      // babel: {
      //   plugins: [['babel-plugin-react-compiler']]
      // }
    })
  ],

  // Base path for relative imports
  base: "./",
  
  // Server configuration
  server: {
    port: 5173,
    host: true,
    open: false,
    cors: true,
    // Proxy for API requests
    proxy: {
      '/api': {
        target: 'http://cloud.anyrdp.in:3001/sun_computers/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: true,
    target: 'es2018',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          motion: ['framer-motion'],
          icons: ['react-icons'],
          utils: ['file-saver']
        }
      }
    }
  },

  // Resolve paths
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@css': path.resolve(__dirname, './src/css'),
      '@assets': path.resolve(__dirname, './src/assets')
    }
  },

  // CSS configuration
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCase'
    }
  }
})
