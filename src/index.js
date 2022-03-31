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

const labels = [];
const numbers = [];

matrix.forEach((current, index) => {
	if (index-1 < 0) return;

	const prevRow = matrix[index-1];
	const prevRowParts = prevRow[3].split(':');
	const currentRowParts = current[3].split(':');

	const prevRowSeconds = +prevRowParts[0] * 3600 + +prevRowParts[1] * 60 + +prevRowParts[2];
	const currentRowSeconds = +currentRowParts[0] * 3600 + +currentRowParts[1] * 60 + +currentRowParts[2];

	const durationSeconds = currentRowSeconds - prevRowSeconds;

	labels.push(prevRow[0])
	numbers.push(durationSeconds)
})

const data = {
	labels: labels,
	datasets: [{
		label: 'My First dataset',
		backgroundColor: 'rgb(255, 99, 132)',
		borderColor: 'rgb(255, 99, 132)',
		data: numbers,
	}]
};

const config = {
	type: 'bar',
	data: data,
	options: {}
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
