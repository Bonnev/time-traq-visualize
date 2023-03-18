class CallbackPromise extends Promise<void> {
	constructor(callback: () => void, timeout: number) {
		super(timeout !== undefined ? resolve =>
			setTimeout(() => {
				callback();
				resolve();
			}, timeout)
			: callback);
	}

	thenCallback(timeout: number, callback: () => void) {
		return new CallbackPromise(callback, timeout);
	}
}

export const setAsyncTimeout = (timeout: number, callback: () => void) => new CallbackPromise(callback, timeout);