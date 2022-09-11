import { React, useEffect, useState } from 'react';

import ChartJs from './ChartJs';
import FileDropper from './FileDropper';
import Timeline from './Timeline';

function App() {
	const [data, setData] = useState([]);
	const [file, setFile] = useState();
	const [showChart, setShowChart] = useState('timeline');

	useEffect(() => {
		if (!file) {
			return;
		}
		const filePath = file || 'C:\\input.txt';
		const fs = require('fs');
		// fs.writeFileSync("C:\\input.txt", "marti karti");
		const contents = fs.readFileSync(filePath).toString();
		const timelineDate = '2022-04-07';
		// const nextDate = '2022-04-08';

		const lines = contents.split('\n');

		const matrix = lines.filter(line => line.length).map(line => line.split('\t'));

		let data = [];

		matrix.forEach((current, index) => {
			if (index-1 < 0) return;

			const prevRow = matrix[index-1];

			const prevRowTime = prevRow[3];
			const prevRowParts = prevRowTime.split(':');

			const currentRowTime = current[3];
			const currentRowParts = currentRowTime.split(':');

			const prevRowSeconds = +prevRowParts[0] * 3600 + +prevRowParts[1] * 60 + +prevRowParts[2];
			const currentRowSeconds = +currentRowParts[0] * 3600 + +currentRowParts[1] * 60 + +currentRowParts[2];

			const durationSeconds = currentRowSeconds - prevRowSeconds;

			data.push({
				label: current[0],
				process: current[0].substring(current[0].lastIndexOf('\\') + 1),
				content: current[1].replace(/and \d+ more pages/, '').substring(0, 50),
				title: current[1].replace(/and \d+ more pages/, ''),
				number: durationSeconds,
				start: timelineDate + ' ' + prevRowTime,
				end: timelineDate + ' ' + currentRowTime
			});
		});

		setData(data);
	}, [file]);

	return (<>
		<FileDropper setFile={setFile} />
		<div className='flex-container-with-equal-children'>
			<button onClick={()=>setShowChart('chartjs')}>ChartJs</button>
			<button onClick={()=>setShowChart('timeline')}>Timeline</button>
		</div>
		{showChart === 'chartjs' ? <ChartJs data={data}></ChartJs> : null}
		{showChart === 'timeline' ? <Timeline data={data}></Timeline> : null}
	</>);
}

export default App;
