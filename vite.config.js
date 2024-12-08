import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import Assemblyscript from './src/utils/vite-plugin-assemblyscript';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react(),
		Assemblyscript({
			srcMatch: '.',
			srcEntryFile: './index.ts',
			targetWasmFile: '../../dist/assembly.wasm'
		})],
	server: {
		port: 5173,
		strictPort: true
	}
});
