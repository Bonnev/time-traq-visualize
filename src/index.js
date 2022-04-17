import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import ChartJs from './ChartJs';
import reportWebVitals from './reportWebVitals';
import Timeline from './Timeline';

const fs = require('fs');
// fs.writeFileSync("C:\\input.txt", "marti karti");
const contents = fs.readFileSync("C:\\input.txt").toString();
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

ReactDOM.render(
	<React.StrictMode>
		<ChartJs data={data}></ChartJs>
		<Timeline data={data}></Timeline>
		{/* <App /> */}
	</React.StrictMode>,
	document.getElementById('root')
);

window.onkeyup = function (e) {
	if (e.code === 'Space') {
		// timeline.fit();
	}
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
