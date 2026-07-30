/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The site serves this app from charlieguthrie.com/mahjongg/, so assets have
  // to resolve under that prefix rather than the domain root.
  base: '/mahjongg/',
  build: {
    // Build straight into the sibling directory GitHub Pages serves, so
    // `npm run build` is the whole deploy step.
    outDir: '../mahjongg',
    // Vite refuses to clean an outDir outside its root unless this is explicit.
    emptyOutDir: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
