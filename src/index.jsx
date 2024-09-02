import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App.jsx';
import { app, events, init, window as neuWindow } from '@neutralinojs/lib';

import initt from './as/index.ts?init';

const fib = (n) => {
	if (n <= 1) return n;
	return fib(n - 1) + fib(n - 2);
};

initt().then(module => {
	const { fibonacci } = module.exports;
	console.time('wasm');
	console.log(fibonacci(40));
	console.timeEnd('wasm');
	console.time('js');
	console.log(fib(40));
	console.timeEnd('js');
});

// import reportWebVitals from './utils/reportWebVitals';

import './styles/index.css';
 
(async function() {
	if (import.meta.env.DEV && !window.NL_TOKEN) {
		try {
			// method 1
			const storedToken = sessionStorage.getItem('NL_TOKEN');
			if (storedToken) {
				window.NL_TOKEN = storedToken;
			} else {
				// method 2
				const authInfo = await import('../.tmp/auth_info.json');
				const { nlToken, nlPort } = authInfo;
				window.NL_PORT = nlPort;
				window.NL_TOKEN = nlToken;
				window.NL_ARGS = [
					'bin\\neutralino-win_x64.exe',
					'',
					'--load-dir-res',
					'--path=.',
					'--export-auth-info',
					'--neu-dev-extension',
					'--neu-dev-auto-reload',
					'--window-enable-inspector',
				];
			}
		} catch {
			console.error('Auth file not found, native API calls will not work.');
		}
	}

	init();

	events.on('serverOffline',function() {
		const date = new Date();
		const timestamp = date.toLocaleString('en-US');
		console.log('server offline ' + timestamp );
		window.location.reload();
	});


	ReactDOM.createRoot(document.getElementById('root')).render(
		<React.StrictMode>
			<App />
		</React.StrictMode>
	);

	events.on('windowClose', () => app.exit());

	neuWindow.focus();
})();
