import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  if (mode === 'scripts') {
    return {
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        rollupOptions: {
          input: {
            background: resolve(__dirname, 'src/background/index.ts'),
            content: resolve(__dirname, 'src/content/index.ts'),
          } as Record<string, string>,
          output: {
            entryFileNames: '[name].js',
            format: 'es',
          },
        },
      },
    }
  }

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'popup.html'),
          dashboard: resolve(__dirname, 'dashboard.html'),
          options: resolve(__dirname, 'options.html'),
        } as Record<string, string>,
        output: {
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  }
})
