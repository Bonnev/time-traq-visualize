import { React, useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';

const moment = require('moment');
const vis = require('vis-timeline/dist/vis-timeline-graph2d.min');

const { patchItemSet } = require('./vis-timeline-background-tooltip-patch');
patchItemSet(vis.util, vis.timeline);

const {DataSet} = require('vis-data');

const { ColorTranslator: {getTints} } = require('colortranslator');

function ownRandomColor() {
	return `#${(parseInt(Math.random() * 128)+128).toString(16)}${(parseInt(Math.random() * 128)+128).toString(16)}${(parseInt(Math.random() * 128)+128).toString(16)}`;
}

function Timeline({data}) {
	const timeline = useRef();
	const markers = useRef([]);
	const [allGroups, setAllGroups] = useState([]);

	const timelineDate = '2022-04-07';
	const nextDate = '2022-04-08';

	useEffect(() => {
		// DOM element where the Timeline will be attached
		var container = document.getElementById('visualization');

		const unique = [];

		data.forEach((datum) => {
			if (!unique.map(u => u.label).includes(datum.label)) {
				unique.push(datum);
			} else {
				unique.find(u => u.label === datum.label).number += datum.number;
			}
		});

		unique.map(u => Object.assign(u, {color: ownRandomColor()}));

		unique.sort((a,b)=> b.number - a.number);

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
		subgroups = subgroups.reduce((acc, current) => !acc.find(el => el.content === current.content) ? acc.concat([current]) : acc, []);

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

		// Configuration for the Timeline
		var options = {
			stack: false,
			tooltip: {
				followMouse: true,
				delay: 0
			},
			min: timelineDate, // lower limit of visible range
			max: nextDate, // upper limit of visible range
			groupTemplate: function (group) {
				if (!group) return null;
				var container = document.createElement('div');
				var label = document.createElement('span');
				label.innerHTML = group.content + ' ';
				container.insertAdjacentElement('afterBegin', label);
				var hide = document.createElement('button');
				hide.innerHTML = 'hide';
				hide.style.fontSize = 'small';
				hide.addEventListener('click', function () {
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
				container.insertAdjacentElement('beforeEnd', hide);
				return container;
			},
		};

		timeline.current && timeline.current.destroy();

		const timelineLocal = new vis.Timeline(container, items, options);
		timelineLocal.setGroups(allGroups);

		timelineLocal.on('doubleClick', function (properties) {
			var eventProps = timeline.current.getEventProperties(properties.event);
			if (eventProps.what === 'custom-time') {
				timeline.current.removeCustomTime(eventProps.customTime);
				const time = moment(eventProps.time).format('HH:mm:SS');
				markers.current.splice(markers.current.findIndex(m => m === time), 1);
			} else {
				var id = new Date().getTime();
				const time = eventProps.time;
				const text = time.getHours().toFixed(0).padStart(2, '0') + ':'
					+ time.getMinutes().toFixed(0).padStart(2, '0') + ':'
					+ time.getSeconds().toFixed(0).padStart(2, '0');
				var markerText = text || undefined;
				timeline.current.addCustomTime(eventProps.time, id);
				timeline.current.setCustomTimeMarker(markerText, id);

				if (markers.current.length % 2 === 1) {
					const start = markers.current[markers.current.length-1];
					const end = text;
					const duration = moment.duration(moment(end,'HH:mm:SS').subtract(moment(start,'HH:mm:SS')));
					console.log(duration.toString());

					items.add([{
						id:'background' + (items.map(i=>i).filter(i => i.type && i.type === 'background').length + 1),
						content: '',
						title: `${start} -> ${end} (${duration.hours()}h${duration.minutes()}m${duration.seconds()}s)`,
						start: timelineDate + ' ' + start,
						end: timelineDate + ' ' + end,
						type: 'background',
					}]);
				}

				markers.current.push(text);
			}
		});

		window.onkeyup = function (e) {
			if (e.code === 'Space') {
				// timeline.fit();
			}
		};

		timeline.current = timelineLocal;
		setAllGroups(allGroups);
	}, [data]);

	function showAllGroups() {
		const nestedIds = allGroups.map(gr => gr).filter(gr => !gr.nestedGroups).map(gr => gr.id);
		const groupIds = allGroups.map(gr => gr).filter(gr => gr.nestedGroups).map(gr => gr.id);

		allGroups.update(nestedIds.map(g => ({ id: g, visible: true })));

		setTimeout(() => {
			allGroups.update(groupIds.map(g => ({ id: g, visible: true, showNested: false })));
		},
		10);
	}

	return (<>
		<button onClick={showAllGroups}>Show all groups</button>
		<div id='visualization'></div>
	</>);
}

Timeline.propTypes = {
	data: PropTypes.arrayOf(PropTypes.shape({
		label: PropTypes.string,
		process: PropTypes.string,
		content: PropTypes.string,
		title: PropTypes.string,
		number: PropTypes.number,
		start: PropTypes.string,
		end: PropTypes.string,
	})).isRequired,
};

export default Timeline;
