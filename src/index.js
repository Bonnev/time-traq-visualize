import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

//const Chart = require('chart.js');

import {
	Chart,
	ArcElement,
	LineElement,
	BarElement,
	PointElement,
	BarController,
	BubbleController,
	DoughnutController,
	LineController,
	PieController,
	PolarAreaController,
	RadarController,
	ScatterController,
	CategoryScale,
	LinearScale,
	LogarithmicScale,
	RadialLinearScale,
	TimeScale,
	TimeSeriesScale,
	Decimation,
	Filler,
	Legend,
	Title,
	Tooltip,
	SubTitle
} from 'chart.js';

ReactDOM.render(
	<React.StrictMode>
		<div>
			<canvas id="myChart"></canvas>
		</div>
		{/* <App /> */}
	</React.StrictMode>,
	document.getElementById('root')
);

const fs = require('fs');
const contents = fs.readFileSync("./time-traq-stats.txt").toString();

// const labels = [
// 	'January',
// 	'February',
// 	'March',
// 	'April',
// 	'May',
// 	'June',
// ];

const lines = contents.split('\n');

const matrix = lines.map(line => line.split('\t'));

const data = [];

matrix.forEach((current, index) => {
	if (index-1 < 0) return;

	const prevRow = matrix[index-1];
	const prevRowParts = prevRow[3].split(':');
	const currentRowParts = current[3].split(':');

	const prevRowSeconds = +prevRowParts[0] * 3600 + +prevRowParts[1] * 60 + +prevRowParts[2];
	const currentRowSeconds = +currentRowParts[0] * 3600 + +currentRowParts[1] * 60 + +currentRowParts[2];

	const durationSeconds = currentRowSeconds - prevRowSeconds;

	data.push({
		label: prevRow[0],
		number: durationSeconds
	});
});

const unique = [];

data.forEach((datum) => {
	if (!unique.map(u => u.label).includes(datum.label)) {
		unique.push(datum);
	}
})

const dataForChart = {
	labels: unique.map(u => u.label),
	datasets: [{
		label: 'My First dataset',
		backgroundColor: 'rgb(255, 99, 132)',
		borderColor: 'rgb(255, 99, 132)',
		data: unique.map(u => u.number),
	}]
};

const config = {
	type: 'bar',
	data: dataForChart,
	options: {
		plugins: {
			tooltip: {
				callbacks: {
					label: function(context) {
						let label = context.dataset.label || '';

						if (label) {
							label += ': ';
						}
						if (context.parsed.y !== null) {
							label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
						}
						console.log(label)
						return label;
					}
				}
			}
		}
	}
};

Chart.register(
	ArcElement,
	LineElement,
	BarElement,
	PointElement,
	BarController,
	BubbleController,
	DoughnutController,
	LineController,
	PieController,
	PolarAreaController,
	RadarController,
	ScatterController,
	CategoryScale,
	LinearScale,
	LogarithmicScale,
	RadialLinearScale,
	TimeScale,
	TimeSeriesScale,
	Decimation,
	Filler,
	Legend,
	Title,
	Tooltip,
	SubTitle
);

const myChart = new Chart(
	document.getElementById('myChart'),
	config
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
