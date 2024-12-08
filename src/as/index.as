// @ts-ignore
// import { RegExp } from 'assemblyscript-regex';
import { JSON } from 'json-as/assembly';

@json
class Test {
	test: string = 'initial';
}

export function test(): string {
	const obj = JSON.parse<Test>('{"test": "newvalue"}');
	return JSON.stringify(obj);
	// return ''+JSON;
	//console.log(JSON.parse('{test: true}').stringify());
	// const obj = { abc: true, cde: 14 };
	// const arr = [];
	// for (const key in obj) {
	// 	arr.push(key);
	// }
	// return arr.join(',');
}