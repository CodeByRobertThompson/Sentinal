import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const accountName = env.VITE_TALKDESK_ACCOUNT_NAME || 'unknown';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        // OAuth token endpoint: {account}.talkdeskid.com
        '/api/talkdesk-auth': {
          target: `https://${accountName}.talkdeskid.com`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/talkdesk-auth/, ''),
          secure: true,
        },
        // Digital Connect API: api.talkdeskapp.com
        '/api/talkdesk': {
          target: 'https://api.talkdeskapp.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/talkdesk/, ''),
          secure: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              // Log outgoing headers to verify they reach the upstream
              console.log(`[Proxy] ${req.method} ${req.url} → ${proxyReq.path}`);
              console.log('[Proxy] Idempotency-Key:', proxyReq.getHeader('Idempotency-Key') || proxyReq.getHeader('idempotency-key') || 'NOT SET');
            });
          },
        },
      },
    },
  };
});
