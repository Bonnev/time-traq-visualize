import { copyFile /*, readFile, unlink */ } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';

import asc from 'assemblyscript/asc';

export default () => {
	return {
		name: 'vite:assemblyscript',
		enforce: 'pre',
		async transform(code, id /*, options */) {
			if (id.endsWith('.as')) {
				const fileName = basename(id, '.as');
				// const temp = tmpdir();
				const source = join('.', 'dist', 'assembly.ts');
				const destination = './dist/as.wasm';

				await copyFile(id, source);

				// console.log(destination);
				const { error, stderr } = await asc.main([
					source,
					'--config',
					'./src/as/asconfig.json'
				]);

				if (error) {
					throw new Error(
						`AssemblyScript compiler errored: ${error}. ${stderr.toString()}`
					);
				}

				// const wasm = await readFile(destination);
				// const wasmBase64 = wasm.toString('base64');
				//await unlink(source);
				//await unlink(destination);

				return {
					code: `
						import * as test from '../../dist/assembly.js';
						export default test;
					`,
					map: null,
				};
			}
		},
	};
};
