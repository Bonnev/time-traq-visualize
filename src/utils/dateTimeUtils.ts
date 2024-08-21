import { PrettyStringable, Serializable, TypedValue } from './storageUtils';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

(window as any).serializables ||= [];

export class TimeAndDate implements PrettyStringable, Serializable {
	static DEFAULT_FORMAT = 'YYYY-MM-DD HH:mm:ss';

	public type = 'TimeAndDate';
	_store : dayjs.Dayjs = dayjs();

	static parse(value: string, format: string): TimeAndDate {
		const time: TimeAndDate = new TimeAndDate();

		time._store = dayjs(value, format);
		return time;
	}

	static fromDate(date: Date): TimeAndDate {
		const time: TimeAndDate = new TimeAndDate();

		time._store = dayjs(date);
		return time;
	}

	format(format: string): string {
		return this._store.format(format);
	}

	subtract(time: TimeAndDate): Duration {
		return new Duration(this._store.diff(time._store));
	}

	add(duration: Duration): TimeAndDate {
		const result = new TimeAndDate();
		result._store = this._store.add(duration.totalSeconds, 'second');
		return result;
	}

	isBefore(time: TimeAndDate): boolean {
		return this._store.isBefore(time._store);
	}

	toPrettyString(): string {
		return String(this.toJSON().value);
	}

	toJSON(): TypedValue {
		return {
			type: this.type,
			value: this.format(TimeAndDate.DEFAULT_FORMAT)
		}
	}

	static fromJSON(str: string): TimeAndDate {
		return TimeAndDate.parse(str, TimeAndDate.DEFAULT_FORMAT);
	}
}
(window as any).serializables.TimeAndDate = TimeAndDate;

export class Duration implements PrettyStringable, Serializable {
	public type = 'Duration';
	protected _libDuration: duration.Duration;

	constructor(durationInMilliseconds?: number) {
		this._libDuration = dayjs.duration({ milliseconds: durationInMilliseconds });
	}

	add(duration: Duration): Duration {
		return new Duration(this._libDuration.add(duration._libDuration).asMilliseconds());
	}

	get totalSeconds(): number {
		return this._libDuration.asSeconds();
	}

	get totalMilliseconds(): number {
		return this._libDuration.asMilliseconds();
	}

	withStartTime(time: TimeAndDate): PinnedDuration {
		return new PinnedDuration(this.totalMilliseconds, time);
	}

	toPrettyString(): string {
		return String(this.toJSON().value);
	}

	toJSON(): TypedValue {
		return {
			type: this.type,
			value: this._libDuration.toISOString()
		};
	}

	static fromJSON(str: string): Duration {
		return new Duration(dayjs.duration(str).asMilliseconds());
	}
}
(window as any).serializables.Duration = Duration;

export class PinnedDuration extends Duration {
	public type = 'PinnedDuration';

	constructor(durationInMilliseconds: number, public startDate: TimeAndDate) {
		super(durationInMilliseconds);
	}

	toPrettyString(): string {
		return super.toPrettyString() + ' from ' + this.startDate.toPrettyString();
	}

	toJSON(): TypedValue {
		return {
			type: this.type,
			value: super.toJSON().value + '_' + this.startDate.toJSON().value
		};
	}

	static fromJSON(str: string): PinnedDuration {
		const parts: string[] = str.split('_');
		return Duration.fromJSON(parts[0]).withStartTime(TimeAndDate.fromJSON(parts[1]));
	}
}
(window as any).serializables.PinnedDuration = PinnedDuration;