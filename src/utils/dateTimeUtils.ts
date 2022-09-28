import moment from 'moment';

export class TimeAndDate {
	_store : moment.Moment;
	
	static parse(value: string, format: string): TimeAndDate {
		const time: TimeAndDate = new TimeAndDate();

		time._store = moment(value, format);
		return time;
	}

	format(format: string): string {
		return this._store.format(format);
	}

	subtract(time: TimeAndDate): Duration {
		return new Duration(this._store.diff(time._store));
	}
}

export class Duration {
	_store: moment.Duration;

	constructor(durationInMilliseconds: number) {
		this._store = moment.duration(durationInMilliseconds);
	}

	getTotalSeconds(): number {
		return this._store.asSeconds();
	}
}