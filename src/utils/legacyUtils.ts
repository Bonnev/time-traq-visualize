import { TimeAndDate, Duration, PinnedDuration } from './dateTimeUtils';
import FileSettings, { TaskInfo} from './FileSettings';
import { Deserializable } from './storageUtils';

const TIME_AND_DATE_DEFAULT_FORMAT0 = 'YYYY-MM-DD HH:mm:ss';

type PinnedDuration0 = { duration: string, startDate: string };

type TaskInfoType0 = {
	taskName: string,
	color: string,
	pinnedDurations: PinnedDuration0[],
	totalDuration: { duration: string }
}

type FileSettingsType0 = {
	[key: string]: TaskInfoType0
}

const legacy: {[key: string]: Deserializable}[] = [];

legacy[0] = {
	TimeAndDate: {
		fromJSON: (str: string): TimeAndDate => {
			return TimeAndDate.parse(str, TIME_AND_DATE_DEFAULT_FORMAT0);
		}
	},
	Duration: {
		fromJSON: (str: string): Duration => {
			return Duration.fromJSON(str);
		}
	},
	PinnedDuration: {
		fromJSON: (obj: PinnedDuration0): PinnedDuration => {
			const date = legacy[0].TimeAndDate.fromJSON(obj.startDate);
			const result = legacy[0].Duration.fromJSON(obj.duration).withStartTime(date);
			return result;
		}
	},
	TaskInfo: {
		fromJSON: (obj: TaskInfoType0): TaskInfo => {
			const result = new TaskInfo(obj.taskName, obj.color, undefined);
			result.pinnedDurations = obj.pinnedDurations.map(pinnedDuration =>
				legacy[0].PinnedDuration.fromJSON(pinnedDuration));
			result.recalculateDuration();
			return result;
		}
	},
	FileSettings: {
		fromJSON: (content: FileSettingsType0, fileName: string): FileSettings => {
			const fileNameToKey = (fileName: string): string => fileName
				.substring(0, fileName.lastIndexOf('.'))
				.replaceAll('.', '_');

			const key = fileNameToKey(fileName);

			const tasks = (Object.values(content.tasks) as any[])
				.map(taskInfoString => legacy[0].TaskInfo.fromJSON(taskInfoString))
				.reduce((accumulator: object, taskInfo: TaskInfo, ) => ({...accumulator, [taskInfo.taskName]: taskInfo }), {});

			return new FileSettings(key, tasks);
		}
	}
};

export default legacy;
