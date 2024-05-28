import { React, useEffect, useState, useCallback, Fragment } from 'react';
import FileSettings from '../utils/FileSettings.ts';
import { Duration } from '../utils/dateTimeUtils';
import * as Neutralino from '@neutralinojs/lib';

import '../styles/Statistics.css';

const Statistics = () => {
	const [files, setFiles] = useState([]);
	const [filesSettings, setFilesSettings] = useState([]);

	useEffect(() => {
		Neutralino.filesystem.readDirectory('.storage')
			//.then((elements) => setFiles(elements.filter(e => e.type === 'FILE').map(e => e.entry)))
			.then((elements) => elements.filter(e => e.type === 'FILE'))
			.then((allFiles) => allFiles.map(e => e.entry))
			.then((fileNames) => fileNames.map(e => e.substring(0, e.length - '.neustorage'.length)))
			.then((fileNames) => setFiles(fileNames));
	}, []);

	const find = (inputs, file) => {
		let result = false;
		inputs.forEach(input => {
			if (input.id === file) {
				result = input;
			}
		});
		return result;
	};

	const onSubmit = useCallback(() => {
		const inputs = document.getElementById('files').querySelectorAll('input[type="checkbox"');
		const checked = files.filter(file => find(inputs, file).checked);

		Promise.all(checked.map((fileName) => FileSettings.newFile(fileName + '.neustorage')))
			.then((filesSettings) => setFilesSettings(filesSettings));
	}, [files]);

	const onLegendClick = useCallback((event) => {
		event.target.classList.toggle('hidden');
	}, []);

	const getIndividualStatistics = useCallback(() => {
		const accumulatedStatistics = {}; // don't compute grand totals more than once
		const allStatistics = filesSettings.map(fileSettings => {
			const grandTotalDuration = fileSettings.allTasks.reduce((acc, task) => acc.add(task.totalDuration), new Duration(0));

			accumulatedStatistics.Total ||= new Duration(0);
			accumulatedStatistics.Total = accumulatedStatistics.Total.add(grandTotalDuration);
			for(const task of fileSettings.allTasks) {
				accumulatedStatistics[task.taskName] ||= new Duration(0);
				accumulatedStatistics[task.taskName] = accumulatedStatistics[task.taskName].add(task.totalDuration);
			}

			return <fieldset key={fileSettings.key}>
				<legend className="collapsable" onClick={onLegendClick}>{fileSettings.key}</legend>
				{fileSettings.allTasks.map(currentTask =>
					<span key={currentTask.taskName} className="task">{`${currentTask.taskName}: ${currentTask.totalDuration.toPrettyString()}`}<br /></span>
				).flat()}
				<span className="total">Total: {grandTotalDuration.toPrettyString()}</span>
			</fieldset>;
		});

		const totalsAtEnd = ([a], [b]) => a === 'Total' ? 1 : (b === 'Total' ? -1 : (a.localeCompare(b)));

		allStatistics.push(
			<fieldset key="totals">
				<legend>Totals</legend>
				{Object.entries(accumulatedStatistics).sort(totalsAtEnd).map(([taskName, totalDuration]) =>
					<span key={taskName} className="task">{`${taskName}: ${totalDuration.toPrettyString()}`}<br /></span>)}
			</fieldset>
		);

		return allStatistics;
	}, [filesSettings, onLegendClick]);

	return <div className='flex-container-with-equal-children'>
		<div id="files">
			{files.map(file =>
				<Fragment key={file}>
					<input type="checkbox" id={file} />
					<label htmlFor={file}>{file}</label>
					<br />
				</Fragment>)}
			<input type="button" value="Submit" onClick={onSubmit} />
		</div>
		<div>
			{getIndividualStatistics()}
		</div>
	</div>;
};
export default Statistics;
