import moment from 'moment';

export class TimeAndDate {
	_store : moment.Moment;
	
	static parse(value: string, format: string): TimeAndDate {
		const time: TimeAndDate = new TimeAndDate();

		time._store = moment(value, format);
		return time;
	}

	static fromDate(date: Date): TimeAndDate {
		const time: TimeAndDate = new TimeAndDate();

		time._store = moment(date);
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
		result._store = moment(this._store).add(duration.totalSeconds, 'seconds');
		return result;
	}

	isBefore(time: TimeAndDate): boolean {
		return this._store.isBefore(time._store);
	}

	toString(): string {
		return this.format('YYYY-MM-DD HH:mm:ss');
	}
}

export class Duration {
	protected _libDuration: moment.Duration;
	
	constructor(durationInMilliseconds: number) {
		this._libDuration = moment.duration(durationInMilliseconds);
	}

	add(duration: Duration): Duration {
		return new Duration(moment.duration(this._libDuration).add(duration._libDuration).asMilliseconds());
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

	toString(): string {
		return this._libDuration.toString();
	}

	toJSON(): object {
		return { duration: this.toString() };
	}

	static fromString(str: string): Duration {
		const result: Duration = new Duration(null);
		result._libDuration = moment.duration(str);
		return result;
	}
}

export type DurationString = {
	duration: string
}

export class PinnedDuration extends Duration {
	constructor(durationInMilliseconds: number, public startDate: TimeAndDate = null) {
		super(durationInMilliseconds);
	}

	toJSON(): object {
		const obj: any = super.toJSON();
		obj.startDate = this.startDate.toString();
		
		return obj;
	}

	static fromStrings(duration: string, startDate: string): PinnedDuration {
		const result: PinnedDuration = Duration.fromString(duration).withStartTime(null);
		result.startDate = TimeAndDate.parse(startDate, "YYYY-MM-DD HH:mm:ss");
		return result;
	}
}

export type PinnedDurationString = {
	duration: string,
	startDate: string
}