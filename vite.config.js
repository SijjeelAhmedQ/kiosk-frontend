import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
// Friends Kitchen runs full-screen at 1920x1080. Dev server locked to a single host.
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: { '@': path.resolve(__dirname, './src') },
        /* One React, always. antd pulls React through ~40 @rc-component packages,
           and any of them resolving their own copy gives every hook an "Invalid
           hook call" — the app and the library would be talking to two different
           React instances. This pins them to ours. */
        dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
        /* Pre-bundle React alongside antd rather than letting the optimizer decide
           per-import. Mixing a pre-bundled React with a source-resolved one is the
           other way the same error shows up. */
        include: ['react', 'react-dom', 'react/jsx-runtime'],
    },
    server: { host: true, port: 5173, strictPort: true },
    preview: { port: 4173 },
});
