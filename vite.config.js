import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
// Kiosk runs full-screen at 1920x1080. Dev server locked to a single host.
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: { '@': path.resolve(__dirname, './src') },
    },
    server: { host: true, port: 5173, strictPort: true },
    preview: { port: 4173 },
});
