import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

// Custom Vite plugin to apply Cache-Control headers for static assets & HTML
function cacheHeadersPlugin(): Plugin {
  return {
    name: 'vite-plugin-cache-headers',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        const origSetHeader = res.setHeader.bind(res);
        res.setHeader = function (name: string, value: any) {
          if (name.toLowerCase() === 'cache-control') {
            if (url.includes('/assets/') || url.match(/\.(woff2|woff|ttf|png|jpg|jpeg|svg|ico|webp)$/)) {
              return origSetHeader('Cache-Control', 'public, max-age=31536000, immutable');
            }
          }
          return origSetHeader(name, value);
        };
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        const origSetHeader = res.setHeader.bind(res);
        res.setHeader = function (name: string, value: any) {
          if (name.toLowerCase() === 'cache-control') {
            if (url.includes('/assets/') || url.match(/\.(woff2|woff|ttf|png|jpg|jpeg|svg|ico|webp)$/)) {
              return origSetHeader('Cache-Control', 'public, max-age=31536000, immutable');
            }
          }
          return origSetHeader(name, value);
        };
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), cacheHeadersPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/firebase/')) {
              return 'vendor-firebase';
            }
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router/') ||
              id.includes('node_modules/react-router-dom/')
            ) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/lucide-react/') || id.includes('node_modules/canvas-confetti/')) {
              return 'vendor-ui';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

