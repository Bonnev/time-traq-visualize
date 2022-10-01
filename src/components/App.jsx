import { React, useEffect, useState } from 'react';

import ChartJs from './ChartJs.jsx';
import FileDropper from './FileDropper.jsx';
import Timeline from './Timeline.jsx';
import { TimeAndDate } from '../utils/dateTimeUtils.ts';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';

const DEFAULT_FILE_PATH = 'C:\\input.txt';

const App = () => {
	const [data, setData] = useState([]);
	const [fileContents, setFileContents] = useState();
	const [showChart, setShowChart] = useState('timeline');

	useEffect(() => {
		if (!fileContents) {
			Neutralino.filesystem.getStats(DEFAULT_FILE_PATH)
				.then(() => Neutralino.filesystem.readFile(DEFAULT_FILE_PATH))
				.then(setFileContents)
				.then(() => Neutralino.window.setTitle(`TimeTraq Visualize - ${DEFAULT_FILE_PATH.substring(DEFAULT_FILE_PATH.lastIndexOf('\\')+1)}`))
				.catch(() => toast.error(`Default file "${DEFAULT_FILE_PATH}" not found`, { autoClose: 5000 }));

			return;
		}

		const timelineDate = '2022-04-07';
		// const nextDate = '2022-04-08';

		const lines = fileContents.split('\n');

		const matrix = lines
			.filter(line => line.length > 0) // only non-empty lines
			.map(line => line.split('\t')); // split by tab

		let data = [];

		matrix.forEach((current, index) => {
			if (index - 1 < 0) return;

			// C:\Program Files\...\msedge.exe	Rewriting Git History... - YouTube and 30 more pages - Personal - Microsoft Edge	08:50:06	08:53:47
			const prevRow = matrix[index-1];
			// const current = matrix[index]; // automatic by first parameter

			const prevRowTime = TimeAndDate.parse(prevRow[3], 'HH:mm:ss');
			const currentRowTime = TimeAndDate.parse(current[3], 'HH:mm:ss');
			const durationSeconds = currentRowTime.subtract(prevRowTime).getTotalSeconds();

			data.push({
				label: current[0],
				process: current[0].substring(current[0].lastIndexOf('\\') + 1),
				content: current[1].replace(/and \d+ more pages/, '').substring(0, 50),
				title: current[1].replace(/and \d+ more pages/, ''),
				number: durationSeconds,
				start: timelineDate + ' ' + prevRow[3],
				end: timelineDate + ' ' + current[3]
			});
		});

		setData(data);
	}, [fileContents]);

	let dataCopy = data.map(datum => ({ ...datum })); // copy of data

	return (<>
		<FileDropper setFileContents={setFileContents} />
		<div className='flex-container-with-equal-children'>
			<button onClick={()=>setShowChart('chartjs')}>ChartJs</button>
			<button onClick={()=>setShowChart('timeline')}>Timeline</button>
		</div>
		<ToastContainer position="bottom-left"
			autoClose={false}
			closeOnClick
			pauseOnFocusLoss
			draggable
			pauseOnHover />
		{showChart === 'chartjs' ? <ChartJs data={dataCopy} /> : null}
		{showChart === 'timeline' ? <Timeline data={dataCopy} /> : null}
	</>);
};

export default App;