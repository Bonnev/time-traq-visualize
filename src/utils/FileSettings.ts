/// <reference path="../definitions/neutralino.d.ts" />

import { toast } from 'react-toastify';
import { SETTINGS_NAME } from './AppSettings';
import { Duration, PinnedDuration } from './dateTimeUtils';
import {  MetadataBase, parseStorageObject, stringifyStorageObject } from './storageUtils';

const fileNameToKey = (fileName: string): string => fileName
	.substring(0, fileName.lastIndexOf('.'))
	.replaceAll('.', '_');

/**
 * ^[a-zA-Z-_0-9]{1,50}$
 */
const NEUTRALINO_STORAGE_KEY_PATTERN = /^[a-zA-Z-_0-9]{1,50}$/;

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
(window as any).serializables.TaskInfo = TaskInfo;

type TasksObject = {
	[key: string]: TaskInfo
}

interface FileSettingsMetadataType extends MetadataBase {
	version: number
}

const FileSettingsMetadata: FileSettingsMetadataType = {
	version: 1
};

export default class FileSettings {
	static Metadata = FileSettingsMetadata;

	static newFile(fileName = ''): Promise<FileSettings> {
		if (fileName === SETTINGS_NAME) {
			Promise.reject(new Error('File name cannot be set to ' + SETTINGS_NAME));
		}

		const key: string = fileNameToKey(fileName);

		if (fileName && !key.match(NEUTRALINO_STORAGE_KEY_PATTERN)) {
			const errorMessage = `Key ${key} doesn't match the storage pattern '${NEUTRALINO_STORAGE_KEY_PATTERN}' 😧`;
			toast.error(errorMessage);
			throw new Error(errorMessage);
		} else if (fileName) {
			return Neutralino.storage
				.getData(key)
				.then((str: string) => FileSettings.fromJSON(str, fileName))
				.catch(err => {
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
				.setData(this.key, stringifyStorageObject(FileSettings, this))
				.catch((err: Neutralino.Error) => toast.error('Neutralino storage set error: ' + err.message));
		}
	}

	public get allTaskNames(): string[] {
		return Object.keys(this.tasks);
	}

	public get allTasks(): TaskInfo[] {
		return this.allTaskNames.map(name => this.getTask(name));
	}

	static fromJSON(str: string, fileName: string) {
		return parseStorageObject(FileSettings, str, fileName);
	}
}