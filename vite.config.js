import { defineConfig } from 'vite';

export default defineConfig({
   // Para desarrollo local usa './', para GitHub Pages usa '/AppRA/'
   base: process.env.NODE_ENV === 'production' ? '/AppRA/' : './',
});

