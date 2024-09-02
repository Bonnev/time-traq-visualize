import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import asc from 'vite-plugin-asc';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), asc()],
	server: {
		port: 5173,
		strictPort: true
	}
});
