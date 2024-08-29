
import * as Neutralino from '@neutralinojs/lib';
import { TimeAndDate } from './dateTimeUtils';

export const fileDroppedHandler = (fileDataSetter: (_: object) => void, nagLinesSetter: (_: string[]) => void, fileContents: string, fileName: string) => {
	if (fileName.match(/\d{2}-\d{2}-\d{2}\.txt/)) {
		nagLinesSetter(fileContents.split('\n'));
		return;
	}

	const timelineDate = '2022-04-07';
	// const nextDate = '2022-04-08';

	const lines = fileContents.split('\n');

	const matrix = lines
		.filter(line => line.length > 0) // only non-empty lines
		.map(line => line.split('\t')); // split by tab

	const data: object[] = [];

	matrix.forEach((current, index) => {
		if (index - 1 < 0) return;

		// C:\Program Files\...\msedge.exe	Rewriting Git History... - YouTube and 30 more pages - Personal - Microsoft Edge	08:50:06	08:53:47
		const prevRow = matrix[index - 1];
		// const current = matrix[index]; // automatic by first parameter

		const prevRowTime = TimeAndDate.parse(prevRow[3], 'HH:mm:ss');
		const currentRowTime = TimeAndDate.parse(current[3], 'HH:mm:ss');
		const durationSeconds = currentRowTime.subtract(prevRowTime).totalSeconds;

		data.push({
			label: current[0],
			process: current[0].substring(current[0].lastIndexOf('\\') + 1),
			content: current[1].replace(/and \d+ more pages?/, '').substring(0, 50),
			title: current[1].replace(/and \d+ more pages?/, ''),
			number: durationSeconds,
			start: timelineDate + ' ' + prevRow[3],
			end: timelineDate + ' ' + current[3]
		});
	});

	fileDataSetter({ data, fileName });
	nagLinesSetter([]);

	Neutralino.window.setTitle(`TimeTraq Visualize - ${fileName}`);
};