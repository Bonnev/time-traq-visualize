import Legacy from './legacyUtils';

export interface PrettyStringable {
	toPrettyString(): string;
}

export interface TypedJson { type: string }
export type TypedValue = { type: string, value: Json };
export type Json = string | number | object | (string | number | object)[] | TypedJson | TypedValue;

export interface Serializable {
	toJSON(): Json;
}

export interface Deserializable {
	fromJSON: Function;
}

export type MetadataBase = {
	version: number;
}

export interface DeserializableTopLevel<T> {
	new(): T;
	Metadata: MetadataBase
}

type FileType = {
	metadata: MetadataBase,
	json: object
}

export const stringifyStorageObject = <T>(Type: DeserializableTopLevel<T>, obj: object) => {
	const defaultJson = JSON.stringify(obj);

	const metadata = JSON.stringify(Type.Metadata);
	const metadataComment = `/* ${metadata} */`;

	return metadataComment + '\n' + defaultJson;
};

/**
	 * Extracts the metadata from the file.
	 * Since version 1, the file should start with a multiline comment
	 * containing a JSON object. This is the file's metadata.
	 * 
	 * @param content The content of the file
	 * @returns The metadata and the main json
	 */
const extractMetadata = (content: string): FileType => {
	let index = 0;

	// skip whitespace at start
	while (content.charAt(index).match(/\s/g) !== null) {
		index++;
	}

	// if file does not start with a multiline comment
	// then file is a legacy version 0
	if (content.indexOf('/*') !== index) {
		return { metadata: { version: 0 }, json: JSON.parse(content)};
	}

	const start = index + 2;
	let end;

	let nesting = 1; // increments for every /* inside
	let valid = false; // whether we have found the right */

	for (index = start + 1; index < content.length; index++) {
		if (content.indexOf('/*') === index) {
			nesting++;
		} else if (content.indexOf('*/') === index) {
			nesting--;
			if (nesting === 0) { // we have found the matching */
				end = index; // start and end should not contain the /* */
				index += 2; // move index to after */
				valid = true;
				break;
			}
		}
	}

	// if reached the end of the file without finding the matching */
	if (!valid) {
		throw new Error('Could not parse metadata, file: ' + content);
	}


	// skip whitespace and new lines after end
	while (content.charAt(index).match(/(\s|\n)/g) !== null) {
		index++;
	}

	try {
		// try to parse the resulting string
		return {
			metadata: JSON.parse(content.substring(start, end)),
			json: JSON.parse(content.substring(index))
		};
	} catch (e) {
		console.error(e);
		throw new Error('Could not parse metadata, file: ' + content + '; error: ' + e);
	}
};

/**
 * Sets all fields from the given object to the given result.
 * 
 * If any value is an object with a "type" field, the class'es fromJSON method is called
 * to transform the whole value. If the value also has a "value" field, only its value is transformed.
 * 
 * @param obj (any object) The source object
 * @param result (any object or array) The destination object
 */
const parseStorageObjectRecursive = (obj: any, result: any = {}) => {
	for (const property in obj) {
		if (!Object.prototype.hasOwnProperty.call(obj, property)) {
			continue;
		}

		if (typeof obj[property] !== 'object') {
			result[property] = obj[property];
		} else {
			// check if value has a custom class to parse from
			if (obj[property].type) {
				// check if only the value needs to be used
				if (obj[property].value) {
					result[property] = (window as any).serializables[obj[property].type].fromJSON(obj[property].value);
				} else if ((window as any).serializables[obj[property].type].fromJSON) {
					result[property] = (window as any).serializables[obj[property].type].fromJSON(obj[property]);
				} else {
					result[property] = new (window as any).serializables[obj[property].type];
					parseStorageObjectRecursive(obj[property], result[property]);
				}
			} else {
				if (Array.isArray(obj[property])) {
					result[property] = [];
				} else {
					result[property] = {};
				}
				parseStorageObjectRecursive(obj[property], result[property]);
			}
		}
	}

	return result;
};

export const parseStorageObject = <T>(Type: DeserializableTopLevel<T>, str: string, fileName?: string | undefined): T => {
	const file = extractMetadata(str);
	const fileVersion = file.metadata.version;
	if (fileVersion !== Type.Metadata.version) {
		if (!Legacy[fileVersion]) {
			throw new Error('invalid version in metadata: ' + file.metadata);
		}

		if (fileVersion === 0) {
			const typeName = Type.name.startsWith('_') ? Type.name.substring(1) : Type.name;
			return Legacy[fileVersion][typeName].fromJSON(file.json, fileName);
		} else {
			// NOT TESTED !!
			const oldSerializables = (window as any).serializables;
			(window as any).serializables = Legacy[fileVersion];

			try {
				const result: any = new Type();
				parseStorageObjectRecursive(file.json, result);
				return result;
			} finally {
				(window as any).serializables = oldSerializables;
			}
		}
	}

	const result: T = new Type();
	parseStorageObjectRecursive(file.json, result);
	return result;
};