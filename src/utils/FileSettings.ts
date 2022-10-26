/// <reference path="../definitions/neutralino.d.ts" />

import { toast } from 'react-toastify';
import { Duration, PinnedDuration } from './dateTimeUtils';

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

export default class FileSettings {
	private tasks: TasksObject = {};

	static newFile(fileName: string = ''): Promise<FileSettings> {
			const key: string = fileNameToKey(fileName);

			if (fileName && !key.match(NEUTRALINO_STORAGE_KEY_PATTERN)) {
				const errorMessage: string = `Key ${key} doesn't match the storage pattern '${NEUTRALINO_STORAGE_KEY_PATTERN}' 😧`;
				toast.error(errorMessage);
				throw new Error(errorMessage);
			} else if (fileName) {
				return Neutralino.storage
					.getData(key)
					.then((str: string) => FileSettings.fromJSON(str))
					.catch((err: Neutralino.Error) => {
						if (err.code !== 'NE_ST_NOSTKEX') {
							const errorMessage: string = 'Neutralino storage error: ' + err.message
							toast.error(errorMessage);
							throw new Error(errorMessage);
						}

						return new FileSettings(key);
					});
			} else {
				return Promise.resolve(new FileSettings(key));
			}
	}

	constructor(private key: string = '') { }

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
				.setData(this.key, JSON.stringify(this))
				.catch((err: Neutralino.Error) => toast.error('Neutralino storage set error: ' + err.message));
		}
	}

	public get allTaskNames(): string[] {
		return Object.keys(this.tasks);
	}

	public get allTasks(): TaskInfo[] {
		return this.allTaskNames.map(name => this.getTask(name));
	}

	public static fromJSON(str: string): FileSettings {
		const obj: any = JSON.parse(str);
		const result: any = new FileSettings(obj.key);

		FileSettings.parseRecursive(obj, result);

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