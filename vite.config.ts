import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

function splitVendorChunk(id: string) {
  if (!id.includes('node_modules')) return undefined;

  if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';
  if (id.includes('@supabase')) return 'supabase-vendor';
  if (id.includes('exceljs')) return 'exceljs-vendor';
  if (id.includes('file-saver')) return 'file-saver-vendor';
  if (id.includes('jszip')) return 'zip-vendor';
  if (id.includes('@react-pdf') || id.includes('fontkit')) return 'pdf-vendor';
  if (id.includes('recharts') || id.includes('d3-')) return 'charts-vendor';
  if (id.includes('lucide-react')) return 'icons-vendor';

  return 'vendor';
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: splitVendorChunk,
      },
    },
  },
});
