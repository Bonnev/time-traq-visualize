// packages
import { React, Fragment, useEffect, useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import ReactModal from 'react-modal-resizable-draggable';
import moment from 'moment';
import { DataSet } from 'vis-data';
import { toast } from 'react-toastify';
// import * as vis from 'vis-timeline/standalone/esm/vis-timeline-graph2d.min'; // minified
import * as vis from 'vis-timeline/standalone/esm/vis-timeline-graph2d'; // full source
// import * as vis from 'vis-timeline';

// utils
import { randomColor, randomColorRGBA } from '../utils/colorUtils.js';
import patchItemSet from '../utils/vis-timeline-background-tooltip-patch.js';

patchItemSet(vis.util, vis.timeline);

const NEUTRALINO_STORAGE_KEY_PATTERN = /^[a-zA-Z-_0-9]{1,50}$/;

const Timeline = ({ data: dataProp, fileName }) => {
	// eslint-disable-next-line react/hook-use-state
	const [, updateState] = useState();
	const forceUpdate = useCallback(() => updateState({}), []);

	const timeline = useRef();
	const markers = useRef([]);
	const task = useRef('');
	const backgroundsByTask = useRef({});
	const [statisticsPopupOpen, setStatisticsPopupOpen] = useState(false);

	const [allGroups, setAllGroups] = useState([]);

	const timelineDate = '2022-04-07';
	const nextDate = '2022-04-08';

	useEffect(() => {
		if (!fileName) return;

		let key = fileName
			.substring(0, fileName.lastIndexOf('.'))
			.replaceAll('.', '_');

		if (!key.match(NEUTRALINO_STORAGE_KEY_PATTERN)) {
			toast.error(`Key ${key} doesn't match the storage pattern '${NEUTRALINO_STORAGE_KEY_PATTERN}' 😧`);
		}
	}, [fileName]);

	useEffect(() => {
		if (!dataProp.length) return;

		// DOM element where the Timeline will be attached
		var container = document.getElementById('visualization');

		let unique = [];
		backgroundsByTask.current = {};

		const groupsToCopy = ['imposibleregextomach', 'INFONDS-\\d+', 'DOC-\\d+', 'ENGSUPPORT-\\d+'];
		let dataToAppend = [];
		dataProp.forEach((datum) => {
			const matchingGroupIndex = groupsToCopy.findIndex(regex => datum.title.match(new RegExp(regex, 'g')));
			if (matchingGroupIndex > -1) {
				const matches = datum.title.match(new RegExp(groupsToCopy[matchingGroupIndex], 'g'));
				if (matches && matches.length === 1) {
					dataToAppend.push({ ...datum, process: matches[0],label: matches[0], extractedIndex: matchingGroupIndex, title: `${datum.title} (${datum.process})` });
				}
			}
		});
		const data = dataProp.concat(dataToAppend);

		const groupsToExtract = [' - Personal - '];
		const extractNewNames = ['Personal'];
		data.forEach((datum) => {
			const matchingGroupIndex = groupsToExtract.findIndex(regex => datum.title.match(new RegExp(regex, 'g')));
			if (matchingGroupIndex > -1) {
				const matches = datum.title.match(new RegExp(groupsToExtract[matchingGroupIndex], 'g'));
				if (matches && matches.length === 1) {
					datum.process = extractNewNames[matchingGroupIndex];
					datum.label = extractNewNames[matchingGroupIndex];
				}
			}
		});

		data.forEach((datum) => {
			if (!unique.map(u => u.label).includes(datum.label)) {
				unique.push(datum);
			} else {
				unique.find(u => u.label === datum.label).number += datum.number;
			}
		});

		unique = unique.map(u => Object.assign(u, { color: randomColor() }));

		unique.sort((a,b) => {
			if (a.extractedIndex && b.extractedIndex && b.extractedIndex - a.extractedIndex === 0) {
				return b.number - a.number;
			} else if (a.extractedIndex && b.extractedIndex) {
				return a.extractedIndex - b.extractedIndex;
			} else if (a.extractedIndex && !b.extractedIndex) {
				return 1;
			} else if (b.extractedIndex && !a.extractedIndex) {
				return -1;
			} else {
				return b.number - a.number;
			}
		});

		var subgroupsMap = new Map();
		var subgroupsItemsMap = new Map();
		var subgroups = data.map((u,id) => ({
			id: id,
			content: u.content,
			treeLevel: 2,
			process: u.process,
			style: `background-color: ${randomColor()}`
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
		groups.unshift({ id: 'all', content: 'All' });

		subgroups = subgroups.map(sub => Object.assign(sub, { style: `background-color: ${groupsMap.get(sub.process).color}` }));

		// var dataset = data.map((u,ind) => ({id: ind, content: `${u.process} [${u.content}]`, title: `${u.title} [${u.start} - ${u.end}]`, start: u.start, end: u.end, group: groupsMap.get(u.process).id}));
		var dataset = data.map((u,ind) => ({ id: ind, content: `${u.content} (${u.process})`, title: `${u.title} (${u.process})`, start: u.start, end: u.end, group: groupsMap.get(u.process).id, style: `background-color: ${groupsMap.get(u.process).color}` }));

		let globalEnd;
		const groupEnds = {};
		dataset.forEach(datum => {
			const currentEnd = datum.end;
			const currentGroup = datum.group;
			const groupEnd = groupEnds[currentGroup];

			if(!groupEnd || moment(groupEnd,'YYYY-MM-DD HH:mm:ss').isBefore(moment(currentEnd,'YYYY-MM-DD HH:mm:ss'))) {
				groupEnds[currentGroup] = currentEnd;
			}

			if(!globalEnd || moment(globalEnd,'YYYY-MM-DD HH:mm:ss').isBefore(moment(currentEnd,'YYYY-MM-DD HH:mm:ss'))) {
				globalEnd = currentEnd;
			}
		});

		const endBackgrounds = Object.entries(groupEnds).map(([group, end])=>({
			id:'endbackground' + group,
			group: group,
			content: 'END',
			start: end,
			end: globalEnd,
			style: 'background-color: red; opacity: 0.3',
			type: 'background',
		}));

		/*for (let i = 1; i < dataset.length; i++) {
			if (dataset[i-1].content === dataset[i].content && dataset[i-1].end === dataset[i].start) {
				dataset[i-1].end = dataset[i].end;
				dataset.splice(i, 1);
				i--;
			}
		}*/

		var subgroupDataset = data.map((u,ind) => ({ id: ind+dataset[dataset.length-1].id+1, content: `${u.content} (${u.process})`, title: u.title, start: u.start, end: u.end, group: subgroupsItemsMap.get(u.content) }));
		dataset = dataset.concat(subgroupDataset);

		var allDataset = data.map((u,id) => ({ id: 'all'+id, content: `${u.content} (${u.process})`, title: u.title, start: u.start, end: u.end, group: 'all', style: `background-color: ${groupsMap.get(u.process).color}` }));
		dataset = dataset.concat(allDataset);

		dataset = dataset.concat(endBackgrounds);
		var items = new DataSet(dataset);

		const allGroups = new DataSet(groups.concat(subgroups));

		// Configuration for the Timeline
		var options = {
			stack: false,
			tooltip: {
				followMouse: true,
				delay: 0
			},
			orientation: 'both',
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
					allGroups.update({ id: group.id, visible: false });
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
				const time = moment(eventProps.time).format('HH:mm:ss');
				markers.current.splice(markers.current.findIndex(m => m === time), 1);
			} else {
				var id = new Date().getTime();
				const time = eventProps.time;
				const text = time.getHours().toFixed(0).padStart(2, '0') + ':'
					+ time.getMinutes().toFixed(0).padStart(2, '0') + ':'
					+ time.getSeconds().toFixed(0).padStart(2, '0');
				var markerText = text || undefined;

				timeline.current.addCustomTime(eventProps.time, id);
				timeline.current.customTimes.at(-1).hammer.off('panstart panmove panend'); // disable dragging
				timeline.current.setCustomTimeMarker(markerText, id, false);

				if (markers.current.length % 2 === 1) {
					const start = markers.current[markers.current.length-1];
					const end = text;
					const duration = moment.duration(moment(end,'HH:mm:ss').subtract(moment(start,'HH:mm:ss')));

					const color = backgroundsByTask.current[task.current]?.color || randomColorRGBA(0.4);
					if (!backgroundsByTask.current[task.current]) {
						backgroundsByTask.current[task.current] = { color, task: task.current, durations: [duration], totalDuration: duration };

						const newOption = document.createElement('option');
						newOption.value = task.current;

						const datalist = document.getElementById('tasks');
						datalist.appendChild(newOption);
					} else {
						backgroundsByTask.current[task.current].durations.push(duration);

						const totalDuration = moment.duration(backgroundsByTask.current[task.current].totalDuration);
						backgroundsByTask.current[task.current].totalDuration = totalDuration.add(duration);
					}
					forceUpdate();

					items.add([{
						id:'background' + (items.map(i=>i).filter(i => i.type && i.type === 'background').length + 1),
						content: '',
						title: `(${task.current}) ${start} -> ${end} (${duration.hours()}h${duration.minutes()}m${duration.seconds()}s)`,
						start: timelineDate + ' ' + start,
						end: timelineDate + ' ' + end,
						style: `background-color: ${color}`,
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
	}, [dataProp]);

	function showAllGroups() {
		const nestedIds = allGroups.map(gr => gr).filter(gr => !gr.nestedGroups).map(gr => gr.id);
		const groupIds = allGroups.map(gr => gr).filter(gr => gr.nestedGroups).map(gr => gr.id);

		allGroups.update(nestedIds.map(g => ({ id: g, visible: true })));

		setTimeout(() => {
			allGroups.update(groupIds.map(g => ({ id: g, visible: true, showNested: false })));
		},
		10);
	}

	function taskInputHandler(event) {
		task.current = event.target.value;
	}

	const getBackgroundStatistics = () => {
		return Object.values(backgroundsByTask.current).map(background => {
			const total = background.totalDuration;
			return <Fragment key={background.task}>{background.task + `: ${total.hours()}h${total.minutes()}m${total.seconds()}s`}<br /></Fragment>;
		});
	};

	return (<>
		<div className='flex-container-with-equal-children'>
			<button onClick={showAllGroups}>Show all groups</button>
			<button onClick={() => setStatisticsPopupOpen(true)}>Open statistics</button>
			<button onClick={() => toast.success('Works!')}>Test toaster!</button>
		</div>
		<input type='text' list='tasks' name='task'
			placeholder='Task' onChange={taskInputHandler} />
		<datalist id='tasks'>
			{/* <option value='0dlcjdnsjkcandckjandjkc'></option> */}
		</datalist>
		<div id='visualization' />
		<ReactModal
			initWidth={800}
			initHeight={400} disableKeystroke
			onFocus={() =>{} /* left for reference e.g. console.log('Modal is clicked') */}
			className={'my-modal-custom-class'}
			onRequestClose={() => setStatisticsPopupOpen(false)}
			isOpen={statisticsPopupOpen}>
			<h3 className='modal-header'>Statistics</h3>
			<div className='body'>
				{getBackgroundStatistics()}
			</div>
			<button className='modal-close' onClick={() => setStatisticsPopupOpen(false)}>
				Close modal
			</button>
		</ReactModal>
	</>);
};

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
	fileName: PropTypes.string
};

export default Timeline;
