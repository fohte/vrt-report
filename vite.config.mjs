import { resolve } from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  root: resolve(import.meta.dirname, 'src'),
  plugins: [
    tailwindcss(),
    viteSingleFile({
      useRecommendedBuildConfig: true,
      removeViteModuleLoader: true,
    }),
  ],
  resolve: {
    alias: [
      {
        find: /^#report-logic$/,
        replacement: `${resolve(import.meta.dirname, 'src')}/report-logic.ts`,
      },
      {
        find: /^#report-tree$/,
        replacement: `${resolve(import.meta.dirname, 'src')}/report-tree.ts`,
      },
      {
        find: /^#report-data$/,
        replacement: `${resolve(import.meta.dirname, 'src')}/report-data.ts`,
      },
      {
        find: /^#vrt-components\/comparison-model$/,
        replacement: `${resolve(import.meta.dirname, 'src')}/components/comparison-model.ts`,
      },
      {
        find: /^#vrt-components\/(.+)$/,
        replacement: `${resolve(import.meta.dirname, 'src')}/components/$1.tsx`,
      },
      {
        find: /^#storybook\.css$/,
        replacement: `${resolve(import.meta.dirname, 'src')}/storybook.css`,
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
