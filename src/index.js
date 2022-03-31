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

const labels = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
];

const data = {
	labels: labels,
	datasets: [{
		label: 'My First dataset',
		backgroundColor: 'rgb(255, 99, 132)',
		borderColor: 'rgb(255, 99, 132)',
		data: [0, 10, 5, 2, 20, 30, 45],
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
