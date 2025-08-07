import { fileURLToPath, URL } from 'url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import viteImagemin from 'vite-plugin-imagemin';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('swiper-')
        }
      }
    }),
    viteImagemin({
      // Lossless optimization settings
      gifsicle: {
        optimizationLevel: 3,
        interlaced: false, // Set to true if you want progressive GIFs
      },
      optipng: {
        optimizationLevel: 5, // Max optimization without quality loss
      },
      jpegtran: {
        progressive: true, // Progressive JPEGs
      },
      svgo: {
        plugins: [
          {
            name: 'preset-default',
            params: {
              overrides: {
                removeViewBox: false, // Keep viewBox
                cleanupIDs: false, // Keep IDs
              },
            },
          },
        ],
      },
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    }
  },
  optimizeDeps: {
    include: ['swiper', 'swiper/vue', 'swiper/modules'] // Pre-bundle swiper
  },
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      external: [
        'src/main.js',
      ], // Exclude main.js from bundling
    },
    
  }
})