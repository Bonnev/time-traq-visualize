import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import ChartJs from './ChartJs';
import reportWebVitals from './reportWebVitals';

const { ColorTranslator: {getTints} } = require('colortranslator');

const vis = require('vis-timeline');
const {DataSet} = require('vis-data');

const fs = require('fs');
// fs.writeFileSync("C:\\input.txt", "marti karti");
const contents = fs.readFileSync("C:\\input.txt").toString();
const timelineDate = '2022-04-07';
const nextDate = '2022-04-08';

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

const unique = [];

data.forEach((datum) => {
	if (!unique.map(u => u.label).includes(datum.label)) {
		unique.push(datum);
	} else {
		unique.find(u => u.label === datum.label).number += datum.number;
	}
})

unique.map(u => Object.assign(u, {color: ownRandomColor()}))

unique.sort((a,b)=> b.number - a.number);

function ownRandomColor() {
	return `#${(parseInt(Math.random() * 128)+128).toString(16)}${(parseInt(Math.random() * 128)+128).toString(16)}${(parseInt(Math.random() * 128)+128).toString(16)}`;
}

// debugger;
//data = data.filter((a,ind) => ind<50);

var subgroupsMap = new Map();
var subgroupsItemsMap = new Map();
var subgroups = data.map((u,id) => ({
	id: id,
	content: u.content,
	treeLevel: 2,
	process: u.process,
	style: `background-color: ${ownRandomColor()}`
}));

// remove duplicates
subgroups = subgroups.reduce((acc, current) => !acc.find(el => el.content === current.content) ? acc.concat([current]) : acc, [])

subgroups.forEach(u => subgroupsMap.get(u.process) ? subgroupsMap.set(u.process, subgroupsMap.get(u.process).concat([u.id])) : subgroupsMap.set(u.process, [u.id]));
subgroups.forEach(u => subgroupsItemsMap.set(u.content, u.id));

var groupsMap = new Map();
var groups = unique.map((u,id) => ({
	id: id+subgroups[subgroups.length-1].id+1,
	content: u.process,
	nestedGroups: subgroupsMap.get(u.process) || undefined,
	showNested: false,
	color: u.color,
	style: `background-color: ${u.color}`
}));
groups.forEach(u => groupsMap.set(u.content, u));
groups.unshift({id: 'all', content: 'All' });

let subgroupColorsByGroup = subgroups.reduce((acc, current) => {acc[current.process] = (acc[current.process] || 0) + 1; return acc;}, {});
Object.keys(subgroupColorsByGroup).forEach(current => subgroupColorsByGroup[current] = getTints(groupsMap.get(current).color, subgroupColorsByGroup[current]));
subgroups.forEach((u,ind) => subgroups[ind].style = `background-color: ${subgroupColorsByGroup[u.process].shift()}`);

// window.subgroups = subgroups;
// window.groups = groups;
// window.groupsMap = groups;

var dataset = data.map((u,ind) => ({id: ind, content: `${u.process} [${u.content}]`, title: `${u.title} [${u.start} - ${u.end}]`, start: u.start, end: u.end, group: groupsMap.get(u.process).id}));

for (let i = 1; i < dataset.length; i++) {
	if (dataset[i-1].content === dataset[i].content && dataset[i-1].end === dataset[i].start) {
		dataset[i-1].end = dataset[i].end;
		dataset.splice(i, 1);
		i--;
	}
}

var subgroupDataset = data.map((u,ind) => ({id: ind+dataset[dataset.length-1].id+1, content: `${u.process} [${u.content}]`, title: u.title, start: u.start, end: u.end, group: subgroupsItemsMap.get(u.content)}));
dataset = dataset.concat(subgroupDataset);

var allDataset = data.map((u,id) => ({id: 'all'+id, content: `${u.process} [${u.content}]`, title: u.title, start: u.start, end: u.end, group: 'all', style: `background-color: ${groupsMap.get(u.process).color}`}));
dataset = dataset.concat(allDataset);

// Create a DataSet (allows two way data-binding)
var items = new DataSet(dataset);

const allGroups = new DataSet(groups.concat(subgroups));
window.allGroups = allGroups;
window.getTints = getTints;

ReactDOM.render(
	<React.StrictMode>
		<ChartJs data={data}></ChartJs>
		{/* <canvas id="myChart"></canvas> */}
		<button onClick={showAllGroups}>Show all groups</button>
		<div id="visualization"></div>
		{/* <App /> */}
	</React.StrictMode>,
	document.getElementById('root')
);


// DOM element where the Timeline will be attached
var container = document.getElementById('visualization');

// Configuration for the Timeline
var options = {
	stack: false,
	tooltip: {
		followMouse: true,
	},
	min: timelineDate, // lower limit of visible range
	max: nextDate, // upper limit of visible range
	groupTemplate: function (group) {
		var container = document.createElement("div");
		var label = document.createElement("span");
		label.innerHTML = group.content + " ";
		container.insertAdjacentElement("afterBegin", label);
		var hide = document.createElement("button");
		hide.innerHTML = "hide";
		hide.style.fontSize = "small";
		hide.addEventListener("click", function () {
			// nested groups can't be hidden if they are not expanded
			// hide the top-level group first, then nested will show
			allGroups.update({id: group.id, visible: false});
			// then hide also the nested ones
			if (group.nestedGroups && group.nestedGroups.length) {
				setTimeout(() =>
					allGroups.update(group.nestedGroups.map(g => ({ id: g, visible: false }))),
				10);
			}
		});
		container.insertAdjacentElement("beforeEnd", hide);
		return container;
	},
};

// Create a Timeline
var timeline = new vis.Timeline(container, items, options);
timeline.setGroups(allGroups);

window.onkeyup = function (e) {
	if (e.code === 'Space') {
		// timeline.fit();
	}
}

timeline.on("doubleClick", function (properties) {
	var eventProps = timeline.getEventProperties(properties.event);
	if (eventProps.what === "custom-time") {
		timeline.removeCustomTime(eventProps.customTime);
	} else {
		var id = new Date().getTime();
		const time = eventProps.time;
		const text = time.getHours().toFixed(0).padStart(2, '0') + ':'
		+ time.getMinutes().toFixed(0).padStart(2,  '0') + ':'
		+ time.getSeconds().toFixed(0).padStart(2,  '0');
		var markerText = text || undefined;
		timeline.addCustomTime(eventProps.time, id);
		timeline.setCustomTimeMarker(markerText, id);
	}
});

function showAllGroups() {
	const nestedIds = allGroups.map(gr => gr).filter(gr => !gr.nestedGroups).map(gr => gr.id);
	const groupIds = allGroups.map(gr => gr).filter(gr => gr.nestedGroups).map(gr => gr.id);

	allGroups.update(nestedIds.map(g => ({ id: g, visible: true })));

	setTimeout(() => {
		allGroups.update(groupIds.map(g => ({ id: g, visible: true, showNested: false })));
	},
	10);
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
