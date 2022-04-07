import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
// import App from './App';
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

const vis = require('vis-timeline');
const {DataSet} = require('vis-data');

ReactDOM.render(
	<React.StrictMode>
		{/* <canvas id="myChart"></canvas> */}
		<div id="visualization"></div>
		{/* <App /> */}
	</React.StrictMode>,
	document.getElementById('root')
);

const fs = require('fs');
const contents = fs.readFileSync("./test-2020.04.04.txt").toString();

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
		number: durationSeconds,
		start: prevRowTime,
		end: currentRowTime
	});
});

const unique = [];

data.forEach((datum) => {
	if (!unique.map(u => u.label).includes(datum.label)) {
		unique.push(datum);
	} else {
		unique.find(u => u.label === datum.label).number += datum.number;
	}
})

unique.sort((a,b)=> b.number - a.number);

const dataForChart = {
	labels: unique.map(u => u.label.substring(u.label.lastIndexOf('\\') + 1)),
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
						const number = context.parsed.y;

						const hours = number / 3600;
						const minutes = (number % 3600) / 60;
						const seconds = (number % 3600) % 60;

						return hours.toFixed(0).padStart(2, '0') + ':'
							+ minutes.toFixed(0).padStart(2,  '0') + ':'
							+ seconds.toFixed(0).padStart(2,  '0');
					},
					title: function(context) {
						const index = context[0].parsed.x;
						return unique[index].label;
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

// new Chart(
// 	document.getElementById('myChart'),
// 	config
// );

// DOM element where the Timeline will be attached
var container = document.getElementById('visualization');

var groupsMap = new Map();
var groups = unique.map((u,id) => ({id: id+data.length, content: u.process}));
groups.forEach(u => groupsMap.set(u.content, u.id));


var dataset = data.map((u,ind) => ({id: ind, content: u.process, start: '2022-04-07 ' + u.start, end: '2022-04-07 ' + u.end, group: groupsMap.get(u.process)}));

// var items = new DataSet([
// 	{id: 1, content: 'item 1', start: '2014-04-20 10:00:00'},
// 	{id: 2, content: 'item 2', start: '2014-04-14'},
// 	{id: 3, content: 'item 3', start: '2014-04-18'},
// 	{id: 4, content: 'item 4', start: '2014-04-16', end: '2014-04-19'},
// 	{id: 5, content: 'item 5', start: '2014-04-25'},
// 	{id: 6, content: 'item 6', start: '2014-04-27', type: 'point'}
// ]);

// Create a DataSet (allows two way data-binding)
var items = new DataSet(dataset);

// Configuration for the Timeline
var options = {stack: false};

// Create a Timeline
var timeline = new vis.Timeline(container, items, options);
timeline.setGroups(new DataSet(groups));

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
