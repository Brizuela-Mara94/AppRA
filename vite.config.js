import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
   // Para desarrollo local usa './', para GitHub Pages usa '/AppRA/'
   base: process.env.NODE_ENV === 'production' ? '/AppRA/' : './',
   
   build: {
      rollupOptions: {
         input: {
            main: resolve(__dirname, 'index.html'),
            scanner: resolve(__dirname, 'scanner.html'),
            mining: resolve(__dirname, 'mining.html'),
            elements: resolve(__dirname, 'elements.html'),
            arjs: resolve(__dirname, 'arjs-scanner.html')
         }
      }
   }
});

