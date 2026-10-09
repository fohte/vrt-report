import { resolve } from 'node:path'

import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  root: resolve(import.meta.dirname, 'src'),
  plugins: [
    viteSingleFile({
      useRecommendedBuildConfig: true,
      removeViteModuleLoader: true,
    }),
  ],
  resolve: {
    alias: [
      {
        find: /^#report-client-logic$/,
        replacement: `${resolve(import.meta.dirname, 'src')}/report-logic.ts`,
      },
      {
        find: /^#report-client-tree-model$/,
        replacement: `${resolve(import.meta.dirname, 'src')}/report-tree.ts`,
      },
      {
        find: /^#(report-client-.+)$/,
        replacement: `${resolve(import.meta.dirname, 'src')}/$1.js`,
      },
    ],
  },
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(import.meta.dirname, 'src/report-template.html'),
    },
  },
})
