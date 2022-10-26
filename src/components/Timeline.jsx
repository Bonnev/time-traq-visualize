// packages
import { React, Fragment, useEffect, useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import Popup from './Popup';
import { DataSet } from 'vis-data';
import * as vis from 'vis-timeline/standalone/esm/vis-timeline-graph2d.min'; // minified
// import * as viss from 'vis-timeline/standalone/esm/vis-timeline-graph2d'; // full source
// import * as vis from 'vis-timeline';

import { ControlledMenu, MenuItem, useMenuState } from '@szhsin/react-menu';
import '@szhsin/react-menu/dist/index.css';

// utils
import { randomColor, randomColorRGBA } from '../utils/colorUtils.ts';
import patchItemSet from '../utils/vis-timeline-background-tooltip-patch.js';
import usePrevValue from '../utils/usePrevValue.ts';
import FileSettings from '../utils/FileSettings.ts';
import { TimeAndDate } from '../utils/dateTimeUtils.ts';
import { setAsyncTimeout } from '../utils/callbackPromise.ts';

patchItemSet(vis.util, vis.timeline);

const NAGS_GROUP_ID = 'nags';

const Timeline = ({ fileData, fileData: { data: dataProp, fileName }, nagLines }) => {
	// eslint-disable-next-line react/hook-use-state
	const [, updateState] = useState();
	const forceUpdate = useCallback(() => updateState({}), []);

	const [statisticsPopupOpen, setStatisticsPopupOpen] = useState(false);
	const [allGroups, setAllGroups] = useState();
	const nonHiddenGroups = useRef([]);

	const timeline = useRef();
	const markers = useRef([]);
	const task = useRef('');
	const items = useRef([]);
	const backgroundsByTask = useRef({});
	const fileSettings = useRef(new FileSettings());

	const prevFileName = usePrevValue(fileName);
	const prevDataProp = usePrevValue(dataProp);

	const [menuProps, toggleMenu] = useMenuState();
	const [anchorPoint, setAnchorPoint] = useState({ x: 0, y: 0 });

	const timelineDate = '2022-04-07';
	// const nextDate = '2022-04-08';

	useEffect(() => {
		if (nagLines.length && allGroups) {
			const stylesByTask = {};
			const nagItems = [];
			let currentItemStartDate;
			let currentTask;

			for (let i = 0; i < nagLines.length; i++){
				const line = nagLines[i];
				const parts = line.split('\t');

				if (i === 0) {
					currentItemStartDate = parts[0].split('T')[1];
					currentTask = parts[1];
					continue;
				}

				const previousLine = nagLines[i - 1];
				const previousParts = previousLine.split('\t');

				if (parts[1] === 'PAUSED' || (parts[1] !== 'RESUMED' && parts[1] !== currentTask)) {
					const end = parts[1] === 'PAUSED' ? parts[0] : previousParts[0];
					nagItems.push({
						task: currentTask,
						start: currentItemStartDate,
						end: end.split('T')[1],
						color: stylesByTask[previousParts[1]] = stylesByTask[previousParts[1]] || randomColor()
					});
					currentItemStartDate = parts[0].split('T')[1];
					currentTask = parts[1] === 'PAUSED' ? currentTask : parts[1];
					continue;
				}

				if (parts[1] === 'RESUMED') {
					// Skip all subsequent paused/resumed
					while (++i !== nagLines.length - 1 &&
							nagLines[i].split('\t')[1] === 'PAUSED' &&
							nagLines[i].split('\t')[1] === 'RESUMED');

					if (i < nagLines.length) {
						currentItemStartDate = nagLines[i - 1].split('\t')[0].split('T')[1];
						currentTask = nagLines[i].split('\t')[1];
					}
				}
			}

			nagItems.forEach((item, index) => items.current.update({
				id: NAGS_GROUP_ID + index,
				content: item.task,
				title: `${item.task} ${item.start} -> ${item.end}`,
				start: timelineDate + ' ' + item.start,
				end: timelineDate + ' ' + item.end,
				group: NAGS_GROUP_ID,
				style: `background-color: ${item.color}`
			}));

			setTimeout(() => allGroups.update({
				id: NAGS_GROUP_ID,
				visible: true
			}), 10);
		}
	}, [nagLines, allGroups]);

	const timelineDivContextMenuHandler = useCallback((e) => {
		e.preventDefault();
		setAnchorPoint({ x: e.clientX, y: e.clientY });
		toggleMenu(true);
	}, [toggleMenu]);

	const contextMenuOnCloseHandler = useCallback(() => {
		toggleMenu(false);
	}, [toggleMenu]);

	useEffect(() => {
		if (!dataProp.length) return;

		if (dataProp.length === prevDataProp?.length && dataProp[0].label === prevDataProp[0]?.label) {
			return;
		}

		// if fileName has changed
		if (prevFileName !== fileName) {
			FileSettings.newFile(fileName)
				.then(newSettings => {
					fileSettings.current = newSettings;

					fileSettings.current.allTasks.forEach(currentTask => {
						currentTask.pinnedDurations.forEach(pinnedDuration => {
							const start = pinnedDuration.startDate.format('HH:mm:ss');
							const endTime = pinnedDuration.startDate.add(pinnedDuration);
							const end = endTime.format('HH:mm:ss');

							const color = currentTask?.color || randomColorRGBA(0.4);

							const allBackgroundItems = items.current.map(i=>i)
								.filter(i => typeof i.id === 'string' && i.id.startsWith('background')) // filter background items
								.map(i => parseInt(i.id.substring('background'.length))); // get their ids e.g. 'background15' -> 15

							const maxId = allBackgroundItems.length ? Math.max.apply(null, allBackgroundItems) : 0;
							const id = 'background' + (maxId + 1);

							items.current.add([{
								id: id,
								content: '',
								title: `(${currentTask.taskName}) ${start} -> ${end} (${pinnedDuration.toPrettyString()})`,
								start: timelineDate + ' ' + start,
								end: timelineDate + ' ' + end,
								style: `background-color: ${color}`,
								taskName: currentTask.taskName,
								type: 'background',
							}]);
						});
					});

					forceUpdate();
				});
		}

		// DOM element where the Timeline will be attached
		const container = document.getElementById('visualization');

		let unique = [];
		backgroundsByTask.current = {};

		// group items matching these regexes and copy them to new groups
		// the imposibleregextomach is so that we always start with 1 - the extractedIndex is used in checks when sorting further down
		const groupsToCopy = ['imposibleregextomach', 'INFONDS-\\d+', 'DOC-\\d+', 'ENGSUPPORT-\\d+'];
		let dataToAppend = [];
		dataProp.forEach((datum) => {
			const matchingGroupIndex = groupsToCopy.findIndex(regex => datum.title.match(new RegExp(regex, 'g')));
			if (matchingGroupIndex > -1) {
				const matches = datum.title.match(new RegExp(groupsToCopy[matchingGroupIndex], 'g'));
				if (matches && matches.length === 1) {
					dataToAppend.push({ ...datum, process: matches[0], label: matches[0], extractedIndex: matchingGroupIndex, title: `${datum.title} (${datum.process})` });
				}
			}
		});
		const data = dataProp.concat(dataToAppend);

		// group items matching these regexes and separate them into new groups
		const groupsToExtract = [' - Personal - '];
		const extractNewNames = ['Personal'];
		data.forEach((datum) => {
			const matchingGroupIndex = groupsToExtract.findIndex(regex => datum.title.match(new RegExp(regex, 'g')));
			if (matchingGroupIndex > -1) {
				const matches = datum.title.match(new RegExp(groupsToExtract[matchingGroupIndex], 'g'));
				if (matches && matches.length === 1) {
					// change process and label, grouping will happen automatically with the main logic
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

		unique.sort((a, b) => {
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

		const subgroupsMap = new Map();
		const subgroupsItemsMap = new Map();
		let subgroups = data.map((u, id) => ({
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

		const groupsMap = new Map();
		const groups = unique.map((u, id) => ({
			id: id + subgroups[subgroups.length - 1].id + 1,
			content: u.process,
			nestedGroups: subgroupsMap.get(u.process) || undefined,
			showNested: false,
			color: u.color,
			style: `background-color: ${u.color}`
		}));
		groups.forEach(u => groupsMap.set(u.content, u));
		groups.unshift({ id: 'all', content: 'All' });
		groups.unshift({ id: NAGS_GROUP_ID, content: 'Nags', visible: false });

		subgroups = subgroups.map(sub => Object.assign(sub, { style: `background-color: ${groupsMap.get(sub.process).color}` }));

		let dataset = data.map((u, ind) => ({
			id: ind,
			content: `${u.content} (${u.process})`,
			title: `${u.title} (${u.process})`,
			start: u.start,
			end: u.end,
			selectable: false,
			group: groupsMap.get(u.process).id,
			style: `background-color: ${groupsMap.get(u.process).color}`
		}));

		let globalEnd;
		const groupEnds = {};
		dataset.forEach(datum => {
			const currentEnd = datum.end;
			const currentGroup = datum.group;
			const groupEnd = groupEnds[currentGroup];

			if(!groupEnd || TimeAndDate.parse(groupEnd, 'YYYY-MM-DD HH:mm:ss').isBefore(TimeAndDate.parse(currentEnd, 'YYYY-MM-DD HH:mm:ss'))) {
				groupEnds[currentGroup] = currentEnd;
			}

			if(!globalEnd || TimeAndDate.parse(globalEnd, 'YYYY-MM-DD HH:mm:ss').isBefore(TimeAndDate.parse(currentEnd, 'YYYY-MM-DD HH:mm:ss'))) {
				globalEnd = currentEnd;
			}
		});

		const endBackgrounds = Object.entries(groupEnds).map(([group, end])=>({
			id:'endbackground' + group,
			group: group,
			content: 'END',
			start: end,
			end: globalEnd,
			selectable: false,
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

		const subgroupDataset = data.map((u, ind) => ({
			id: ind + dataset[dataset.length - 1].id + 1,
			content: `${u.content} (${u.process})`,
			title: u.title,
			start: u.start,
			end: u.end,
			selectable: false,
			group: subgroupsItemsMap.get(u.content)
		}));
		dataset = dataset.concat(subgroupDataset);

		const allDataset = data.map((u, id) => ({
			id: 'all' + id,
			content: `${u.content} (${u.process})`,
			title: u.title,
			start: u.start,
			end: u.end,
			selectable: false,
			group: 'all',
			style: `background-color: ${groupsMap.get(u.process).color}`
		}));
		dataset = dataset.concat(allDataset);

		dataset = dataset.concat(endBackgrounds);
		items.current = new DataSet(dataset);

		const allGroups = new DataSet(groups.concat(subgroups));
		setAllGroups(allGroups);
		nonHiddenGroups.current = allGroups.getIds();

		// Configuration for the Timeline
		const options = {
			stack: false,
			tooltip: {
				followMouse: true,
				delay: 0
			},
			orientation: 'both',
			multiselect: true,
			groupTemplate: function (group) {
				if (!group) return null;
				const container = document.createElement('div');
				const label = document.createElement('span');
				label.innerHTML = group.content + ' ';
				container.insertAdjacentElement('afterBegin', label);
				const hide = document.createElement('button');
				hide.innerHTML = 'hide';
				hide.style.fontSize = 'small';
				hide.addEventListener('click', function () {
					// nested groups can't be hidden if they are not expanded
					// hide the top-level group first, then nested will show
					allGroups.update({ id: group.id, visible: false });
					nonHiddenGroups.current = nonHiddenGroups.current.filter(g => g !== group.id);
					// then hide also the nested ones
					if (group.nestedGroups && group.nestedGroups.length) {
						nonHiddenGroups.current = nonHiddenGroups.current.filter(g => !group.nestedGroups.includes(g));
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

		const timelineLocal = new vis.Timeline(container, items.current, options);

		window.timeline = timelineLocal;

		timelineLocal.setGroups(allGroups);

		timelineLocal.on('doubleClick', function (properties) {
			const eventProps = timeline.current.getEventProperties(properties.event);

			// if doule-clicked on an existing marker
			if (eventProps.what === 'custom-time') {
				timeline.current.removeCustomTime(eventProps.customTime);
				markers.current.splice(markers.current.findIndex(m => m.customTime === eventProps.customTime), 1);
				return;
			}

			// if double-clicked on open space

			const text = TimeAndDate.fromDate(eventProps.time).format('HH:mm:ss');
			const markerText = text || undefined;

			timeline.current.addCustomTime(eventProps.time, eventProps.time);
			timeline.current.customTimes.at(-1).hammer.off('panstart panmove panend'); // disable dragging
			timeline.current.setCustomTimeMarker(markerText,  eventProps.time, false);
			markers.current.push({ customTime: eventProps.time, time: text });

			// if markers are even, then we have a start and and an end, so add a background/task
			if (markers.current.length % 2 === 0) {
				const start = markers.current[markers.current.length - 2].time;
				const end = text;

				const startDate = TimeAndDate.parse(start, 'HH:mm:ss');
				const endDate = TimeAndDate.parse(end, 'HH:mm:ss');

				const duration = endDate.subtract(startDate);
				const durationWithTime = duration.withStartTime(startDate);

				const currentFileTask = fileSettings.current.getTask(task.current);
				const color = currentFileTask?.color || randomColorRGBA(0.4);

				window.TimeAndDate = TimeAndDate;
				window.fileSettings = fileSettings;
				if (!currentFileTask) {
					fileSettings.current.setTask(task.current, color, durationWithTime);
				} else {
					fileSettings.current.addDurationForTask(task.current, durationWithTime);
				}
				forceUpdate();

				const allBackgroundItems = items.current.map(i=>i)
					.filter(i => typeof i.id === 'string' && i.id.startsWith('background')) // filter background items
					.map(i => parseInt(i.id.substring('background'.length))); // get their ids e.g. 'background15' -> 15

				const maxId = allBackgroundItems.length ? Math.max.apply(null, allBackgroundItems) : 0;
				const id = 'background' + (maxId + 1);

				items.current.add([{
					id: id,
					content: '',
					title: `(${task.current}) ${start} -> ${end} (${duration.toPrettyString()})`,
					start: timelineDate + ' ' + start,
					end: timelineDate + ' ' + end,
					style: `background-color: ${color}`,
					taskName: task.current,
					type: 'background',
				}]);

				markers.current.forEach(m => timeline.current.removeCustomTime(m.customTime));
				markers.current.length = 0;
			}
		});

		timelineLocal.on('contextmenu', (properties) => {
			if (properties.item?.startsWith('background')) {
				if (!timelineLocal.getSelection().length || !timelineLocal.getSelection().includes(properties.item)) {
					timelineLocal.setSelection([properties.item]);
				}

				timelineDivContextMenuHandler(properties.event);
			}
		});

		timelineLocal.on('click', (/*properties*/) => {
			contextMenuOnCloseHandler();
		});

		timelineLocal.on('rangechanged', function (/*properties*/) {
			setAsyncTimeout(undefined, () =>
				// change cursor to wait (hourglass)
				document.documentElement.classList.add('wait')
			).thenCallback(0, () => // trigger repaint
				// show all non-hidden groups in order to check which items are visible
				allGroups.update(nonHiddenGroups.current.map(g => ({ id: g, visible: true })))
			).thenCallback(10, () => { // trigger repaint
				// get all visible items so that we can hide all groups that have no visible items
				let items = timelineLocal.getVisibleItems();
				items = items.filter(item => !item.startsWith || !item.startsWith('endbackground'));

				const visibleGroupIds = new Set(items.map(item => timelineLocal.itemsData.get(item).group));
				const invisibleGroupIds = nonHiddenGroups.current.filter(group => !visibleGroupIds.has(group));

				allGroups.update(invisibleGroupIds.map(g => ({ id: g, visible: false })));
				document.documentElement.classList.remove('wait'); // revert cursor to default
			});
		});

		window.onkeyup = function (e) {
			if (e.code === 'Space') {
				// timeline.fit();
			}
		};

		timeline.current = timelineLocal;
	}, [fileData]);

	const showAllGroups = useCallback(() => {
		const nestedIds = allGroups.map(gr => gr).filter(gr => !gr.nestedGroups).map(gr => gr.id);
		const groupIds = allGroups.map(gr => gr).filter(gr => gr.nestedGroups).map(gr => gr.id);

		allGroups.update(nestedIds.map(g => ({ id: g, visible: true })));

		setTimeout(() => {
			allGroups.update(groupIds.map(g => ({ id: g, visible: true, showNested: false })));
		},
		10);
	}, [allGroups]);

	const taskInputHandler = useCallback((event) => {
		task.current = event.target.value;
	}, [task]);

	const removeSelectedTasks = useCallback(() => {
		if (!timeline.current) return;

		const selectedItems = timeline.current?.getSelection();

		if (!selectedItems) return;

		selectedItems.forEach(selectedItemId => {
			if (!selectedItemId || !selectedItemId.startsWith('background')) return;

			const timelineItem = timeline.current?.itemsData.get(selectedItemId);
			const itemDate = timelineItem.start;
			const taskName = timelineItem.taskName;
			const dateString = TimeAndDate.fromDate(itemDate).format('HH:mm:ss');

			fileSettings.current.removeDurationForTask(taskName, dateString);

			timeline.current.itemsData.remove(selectedItemId);
		});

	}, [timeline]);

	const showStatisticsPopup = useCallback(() => {
		setStatisticsPopupOpen(true);
	}, [setStatisticsPopupOpen]);

	const hideStatisticsPopup = useCallback(() => {
		setStatisticsPopupOpen(false);
	}, [setStatisticsPopupOpen]);

	const getBackgroundStatistics = () => {
		return fileSettings.current.allTaskNames.map(taskName => {
			const currentTask = fileSettings.current.getTask(taskName);
			return <Fragment key={currentTask.taskName}>{currentTask.taskName + `: ${currentTask.totalDuration.toPrettyString()}`}<br /></Fragment>;
		});
	};

	return (<>
		<div className='flex-container-with-equal-children'>
			<button type="button" onClick={showStatisticsPopup}>Open statistics</button>
		</div>
		<div className='flex-container-with-equal-children'>
			<input type='text' list='tasks' name='task'
				placeholder='Task' onChange={taskInputHandler} />
			<datalist id='tasks'>
				{fileSettings.current.allTaskNames.map(taskName =>
					<option key={taskName} value={taskName} />
				)}
			</datalist>
			<button type="button" onClick={showAllGroups}>Show all groups</button>
		</div>
		<div id='visualization' />
		<ControlledMenu {...menuProps} anchorPoint={anchorPoint}
			direction="right" onClose={contextMenuOnCloseHandler}>
			<MenuItem onClick={removeSelectedTasks}>
				Remove selected task{timeline.current?.getSelection().length > 1 && 's' }
			</MenuItem>
		</ControlledMenu>
		<Popup
			top={10}
			left={10}
			initialWidth={800}
			initialHeight={400}
			className="my-modal-custom-class"
			onClose={hideStatisticsPopup}
			isOpen={statisticsPopupOpen}>

			<h3 className='modal-header'>Statistics</h3>
			<div className='body'>
				{getBackgroundStatistics()}
			</div>
			<button type="button" className='modal-close' onClick={hideStatisticsPopup}>
				Close modal
			</button>
		</Popup>
	</>);
};

Timeline.defaultProps = {
	nagLines: []
};

Timeline.propTypes = {
	fileData: PropTypes.shape({
		data: PropTypes.arrayOf(PropTypes.shape({
			label: PropTypes.string,
			process: PropTypes.string,
			content: PropTypes.string,
			title: PropTypes.string,
			number: PropTypes.number,
			start: PropTypes.string,
			end: PropTypes.string,
		})),
		fileName: PropTypes.string
	}).isRequired,
	nagLines: PropTypes.arrayOf(PropTypes.string)
};

export default Timeline;
