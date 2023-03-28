/// <reference path="../definitions/neutralino.d.ts" />

import { toast } from 'react-toastify';
import { Duration, PinnedDuration } from './dateTimeUtils';
import Legacy from './legacyUtils';
import Metadata, { MetadataType } from './SettingsMetadata';

const fileNameToKey = (fileName: string): string => fileName
	.substring(0, fileName.lastIndexOf('.'))
	.replaceAll('.', '_');

/**
 * ^[a-zA-Z-_0-9]{1,50}$
 */
const NEUTRALINO_STORAGE_KEY_PATTERN: RegExp = /^[a-zA-Z-_0-9]{1,50}$/;

export class TaskInfo {
	pinnedDurations: PinnedDuration[] = [];
	totalDuration: Duration = new Duration(0);

	constructor(public taskName: string, public color: string, firstDuration?: PinnedDuration) {
		if (firstDuration) {
			this.pinnedDurations = [firstDuration];
			this.totalDuration = new Duration(firstDuration.totalMilliseconds);
		}
	}

	addPinnedDuration(duration: PinnedDuration): TaskInfo {
		this.pinnedDurations.push(duration);
		this.totalDuration = this.totalDuration.add(duration);

		return this;
	}

	removePinnedDurationAtTime(time: string): TaskInfo {
		const index = this.pinnedDurations.findIndex(dur => dur.startDate.format('HH:mm:ss') === time);
		
		if (index > -1) {
			this.pinnedDurations.splice(index, 1);
		}
		
		this.recalculateDuration();

		return this;
	}

	recalculateDuration(): void {
		this.totalDuration = this.pinnedDurations.reduce((acc, current) => acc.add(current), new Duration(0));
	}

	// static fromJSON(obj: TaskInfoString): TaskInfo {
	// 	const result = new TaskInfo(obj.taskName, obj.color, null);
	// 	result.pinnedDurations = obj.pinnedDurations.map(pinnedDuration =>
	// 		PinnedDuration.fromStrings(pinnedDuration.duration, pinnedDuration.startDate));
	// 	result.recalculateDuration();; !!!! what about me? :(
	// 	return result;
	// }
}

type TasksObject = {
	[key: string]: TaskInfo
}

type FileType = {
	metadata: MetadataType,
	json: object
}

export default class FileSettings {
	static newFile(fileName: string = ''): Promise<FileSettings> {
			const key: string = fileNameToKey(fileName);

			if (fileName && !key.match(NEUTRALINO_STORAGE_KEY_PATTERN)) {
				const errorMessage: string = `Key ${key} doesn't match the storage pattern '${NEUTRALINO_STORAGE_KEY_PATTERN}' 😧`;
				toast.error(errorMessage);
				throw new Error(errorMessage);
			} else if (fileName) {
				return Neutralino.storage
					.getData(key)
					.then((str: string) => FileSettings.fromJSON(str, fileName))
					.catch((err: any) => {
						if (err.code || err.code === 'NE_ST_NOSTKEX') {
							return new FileSettings(key);
						}

						throw err;
					});
			} else {
				return Promise.resolve(new FileSettings(key));
			}
	}

	constructor(private key: string = '', private tasks: TasksObject = {}) { }

	addDurationForTask(taskName: string, duration: PinnedDuration) {
		const taskInfo = this.getTask(taskName);
		if (!taskInfo) {
			return;
		}

		taskInfo.addPinnedDuration(duration);
		this.commit();
	}

	removeDurationForTask(taskName: string, time: string) {
		const taskInfo = this.getTask(taskName);
		if (!taskInfo) {
			return;
		}

		taskInfo.removePinnedDurationAtTime(time);

		if (taskInfo.totalDuration.totalMilliseconds === 0) {
			delete this.tasks[taskName];
		}

		this.commit();
	}

	public getTask(taskName: string): TaskInfo {
		return this.tasks[taskName];
	}

	public setTask(taskName: string, color: string, firstDuration: PinnedDuration) {
		this.tasks[taskName] = new TaskInfo(taskName, color, firstDuration);
		this.commit();
	}

	public commit(): void {
		if (this.key.match(NEUTRALINO_STORAGE_KEY_PATTERN)) {
			Neutralino.storage
				.setData(this.key, this.stringify())
				.catch((err: Neutralino.Error) => toast.error('Neutralino storage set error: ' + err.message));
		}
	}

	public get allTaskNames(): string[] {
		return Object.keys(this.tasks);
	}

	public get allTasks(): TaskInfo[] {
		return this.allTaskNames.map(name => this.getTask(name));
	}

	stringify() {
		const defaultJson = JSON.stringify(this);

		const metadata = JSON.stringify(Metadata);
		const metadataComment = `/* ${metadata} */`;
		
		return metadataComment + '\n' + defaultJson;
	}

	/**
	 * Extracts the metadata from the file.
	 * Since version 1, the file should start with a multiline comment
	 * containing a JSON object. This is the file's metadata.
	 * 
	 * @param content The content of the file
	 * @returns The metadata and the main json
	 */
	private static extractMetadata(content: string): FileType {
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
			throw new Error("Could not parse metadata, file:" + content);
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
			}
		} catch (e) {
			console.error(e);
			throw new Error("Could not parse metadata, file:" + content + "; error: " + e);
		}
	}

	public static fromJSON(str: string, fileName: string): FileSettings {
		const file = FileSettings.extractMetadata(str);
		const fileVersion = file.metadata.version;
		if (fileVersion !== Metadata.version) {
			if (!Legacy[fileVersion]) {
				throw new Error("invalid version in metadata: " + file.metadata);
			}

			if (fileVersion === 0) {
				return Legacy[fileVersion].FileSettings.fromJSON(file.json, fileName);
			} else {
				// NOT TESTED !!
				const oldSerializables = (window as any).serializables;
				(window as any).serializables = Legacy[fileVersion];

				try {
					const result: any = new FileSettings();
					FileSettings.parseRecursive(file.json, result);
					return result;
				} finally {
					(window as any).serializables = oldSerializables;
				}
			}
		}

		const result: any = new FileSettings();
		FileSettings.parseRecursive(file.json, result);
		return result;
	}

	/**
	 * Sets all fields from the given object to the given result.
	 * 
	 * If any value is an object with a "type" field, the class'es fromJSON method is called
	 * to transform the whole value. If the value also has a "value" field, only its value is transformed.
	 * 
	 * @param obj (any object) The source object
	 * @param result (any object or array) The destination object
	 */
	private static parseRecursive(obj: any, result: any = {}) {
		for (const property in obj) {
			if (!obj.hasOwnProperty(property)) {
				continue;
			}
			
			if (typeof obj[property] !== 'object') {
				result[property] = obj[property];
			} else {
				// check if value has a custom class to parse from
				if (obj[property].type) {
					// check if only the value needs to be 
					if (obj[property].value) {
						result[property] = (window as any).serializables[obj[property].type].fromJSON(obj[property].value);
					} else {
						result[property] = (window as any).serializables[obj[property].type].fromJSON(obj[property]);
					}
				} else {
					if (Array.isArray(obj[property])) {
						result[property] = [];
					} else {
						result[property] = {};
					}
					FileSettings.parseRecursive(obj[property], result[property]);
				}
			}
		}

		return result;
	}
};