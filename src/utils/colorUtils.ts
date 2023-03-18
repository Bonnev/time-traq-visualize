function toInteger(num: number) {
	return parseInt(String(num));
}

export function randomColor() {
	return `#${(toInteger(Math.random() * 128) + 128).toString(16)}${(toInteger(Math.random() * 128) + 128).toString(16)}${(toInteger(Math.random() * 128) + 128).toString(16)}`;
}

export function randomColorRGBA(opacity: number) {
	return `rgba(${toInteger(Math.random() * 128) + 128},${toInteger(Math.random() * 128) + 128},${toInteger(Math.random() * 128) + 128},${opacity})`;
}
