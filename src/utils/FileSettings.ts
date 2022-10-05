/// <reference path="./neutralino.d.ts" />

import { object } from 'prop-types';
import { toast } from 'react-toastify';
import { Duration, DurationString, PinnedDuration, PinnedDurationString } from './dateTimeUtils';

const fileNameToKey = (fileName: string): string => fileName
	.substring(0, fileName.lastIndexOf('.'))
	.replaceAll('.', '_');

/**
 * ^[a-zA-Z-_0-9]{1,50}$
 */
const NEUTRALINO_STORAGE_KEY_PATTERN: RegExp = /^[a-zA-Z-_0-9]{1,50}$/;

export class TaskInfo {
	pinnedDurations: PinnedDuration[];
	totalDuration: Duration;

	constructor(public taskName: string, public color: string, firstDuration: PinnedDuration) {
		this.pinnedDurations = [firstDuration];
		this.totalDuration = firstDuration;
	}

	addPinnedDuration(duration: PinnedDuration): TaskInfo {
		this.pinnedDurations.push(duration);
		this.totalDuration = this.totalDuration.add(duration);

		return this;
	}

	static fromJSON(obj: TaskInfoString): TaskInfo {
		const result = new TaskInfo(obj.taskName, obj.color, null);
		result.pinnedDurations = obj.pinnedDurations.map(pinnedDuration =>
			PinnedDuration.fromStrings(pinnedDuration.duration, pinnedDuration.startDate));
		result.totalDuration = Duration.fromString(obj.totalDuration.duration);
		return result;
	}
}

type TaskInfoString = {
	taskName: string,
	color: string,
	pinnedDurations: PinnedDurationString[],
	totalDuration: DurationString
}

type TasksObject = {
	[key: string]: TaskInfo
}

export default class FileSettings {
	private key: string;
	private tasks: TasksObject = {};

	static newFile(fileName: string = ''): Promise<FileSettings> {
			const result: FileSettings = new FileSettings();

			result.key = fileNameToKey(fileName);

			if (fileName && !result.key.match(NEUTRALINO_STORAGE_KEY_PATTERN)) {
				const errorMessage: string = `Key ${result.key} doesn't match the storage pattern '${NEUTRALINO_STORAGE_KEY_PATTERN}' 😧`;
				toast.error(errorMessage);
				throw new Error(errorMessage);
			} else if (fileName) {
				return Neutralino.storage
					.getData(result.key)
					.then((contents: string) => {
						result.tasks = Object.values(JSON.parse(contents).tasks)
							.map((taskInfoString: TaskInfoString) => TaskInfo.fromJSON(taskInfoString))
							.reduce((accumulator: TasksObject, taskInfo: TaskInfo, ) => ({...accumulator, [taskInfo.taskName]: taskInfo }), {});
						return result;
					}).catch((err: Neutralino.Error) => {
						if (err.code !== 'NE_ST_NOSTKEX') {
							const errorMessage: string = 'Neutralino storage error: ' + err.message
							toast.error(errorMessage);
							throw new Error(errorMessage);
						}
						return result;
					});
			}
			
	};

	constructor(public fileName: string = '') {
		this.key = fileNameToKey(fileName);
		
		if (fileName && !this.key.match(NEUTRALINO_STORAGE_KEY_PATTERN)) {
			toast.error(`Key ${this.key} doesn't match the storage pattern '${NEUTRALINO_STORAGE_KEY_PATTERN}' 😧`);
		} else if (fileName) {
			Neutralino.storage
				.getData(this.key)
				.then((result: string) => {
					this.tasks = JSON.parse(result);
				}).catch((err: Neutralino.Error) => {
					if (err.code !== 'NE_ST_NOSTKEX') {
						toast.error('Neutralino storage error: ' + err.message);
					}
				});
		}
	}

	public getTask(taskName: string): TaskInfo {
		return this.tasks[taskName];
	}

	public setTask(taskName: string, color: string, firstDuration: PinnedDuration) {
		this.tasks[taskName] = new TaskInfo(taskName, color, firstDuration);

		if (this.key.match(NEUTRALINO_STORAGE_KEY_PATTERN)) {
			Neutralino.storage
				.setData(this.key, JSON.stringify({ tasks: this.tasks }))
				.catch((err: Neutralino.Error) => toast.error('Neutralino storage set error: ' + err.message));
		}
	}

	public commit(): void {
		if (this.key.match(NEUTRALINO_STORAGE_KEY_PATTERN)) {
			Neutralino.storage
				.setData(this.key, JSON.stringify({ tasks: this.tasks }))
				.catch((err: Neutralino.Error) => toast.error('Neutralino storage set error: ' + err.message));
		}
	}

	public get allTaskNames(): string[] {
		return Object.keys(this.tasks);
	}
};