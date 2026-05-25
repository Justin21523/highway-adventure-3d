import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@types': path.resolve(__dirname, './src/types'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@config': path.resolve(__dirname, './src/config'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@systems': path.resolve(__dirname, './src/systems'),
      '@world': path.resolve(__dirname, './src/world'),
      '@vehicle': path.resolve(__dirname, './src/vehicle'),
      '@traffic': path.resolve(__dirname, './src/traffic'),
      '@shops': path.resolve(__dirname, './src/shops'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          three_core: ['three'],
          r3f_ecosystem: ['@react-three/fiber', '@react-three/drei'],
          postprocessing_fx: ['@react-three/postprocessing', 'postprocessing'],
          state_management: ['zustand'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 3000,
    },
  },
});
