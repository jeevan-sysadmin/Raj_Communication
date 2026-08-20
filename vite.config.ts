import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const rawBasePath = String(env.VITE_APP_BASE_PATH || '/raj').trim()
  const normalizedBasePath = rawBasePath === '/'
    ? '/'
    : `/${rawBasePath.replace(/^\/+|\/+$/g, '')}/`
  const proxyTarget = String(env.VITE_DEV_PROXY_TARGET || '').trim().replace(/\/+$/, '')
  const proxy = proxyTarget
    ? {
        '/api': {
          target: `${proxyTarget}/api`,
          changeOrigin: true,
          rewrite: (proxyPath: string) => proxyPath.replace(/^\/api/, '')
        },
        '/api_sync': {
          target: `${proxyTarget}/api_sync`,
          changeOrigin: true,
          rewrite: (proxyPath: string) => proxyPath.replace(/^\/api_sync/, '')
        }
      }
    : undefined

  return {
    plugins: [
      react({
        // Remove babel plugin for now - it's causing issues
        // babel: {
        //   plugins: [['babel-plugin-react-compiler']]
        // }
      })
    ],

    base: normalizedBasePath,

    server: {
      port: 5173,
      host: true,
      cors: true,
      proxy
    },

    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            charts: ['recharts'],
            three: ['three', '@react-three/fiber', '@react-three/drei'],
            utils: ['framer-motion', 'file-saver'],
            pdf: ['jspdf', 'jspdf-autotable', 'html2canvas']
          }
        }
      }
    },

    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'framer-motion', 'axios'],
      exclude: ['three', '@react-three/fiber', '@react-three/drei', 'jspdf', 'jspdf-autotable', 'html2canvas'],
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@css': path.resolve(__dirname, './src/css'),
        '@assets': path.resolve(__dirname, './src/assets')
      }
    },

    css: {
      devSourcemap: false,
      modules: {
        localsConvention: 'camelCase'
      }
    }
  }
})
