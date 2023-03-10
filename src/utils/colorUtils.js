export function randomColor() {
	return `#${(parseInt(Math.random() * 128) + 128).toString(16)}${(parseInt(Math.random() * 128) + 128).toString(16)}${(parseInt(Math.random() * 128) + 128).toString(16)}`;
}

export function randomColorRGBA(opacity) {
	return `rgba(${parseInt(Math.random() * 128) + 128},${parseInt(Math.random() * 128) + 128},${parseInt(Math.random() * 128) + 128},${opacity})`;
}
