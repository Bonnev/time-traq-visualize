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

import '../styles/Timeline.css';

// utils
import { randomColor, randomColorRGBA } from '../utils/colorUtils';
import patchItemSet from '../utils/vis-timeline-background-tooltip-patch';
import usePrevValue from '../utils/usePrevValue';
import FileSettings from '../utils/FileSettings';
import AppSettings from '../utils/AppSettings';
import { TimeAndDate, Duration } from '../utils/dateTimeUtils';
import { setAsyncTimeout } from '../utils/callbackPromise';
import * as Neutralino from '@neutralinojs/lib';
import { calculateTimelineItems, fileDroppedHandler, getTimelineOptions, html, processNagLines } from '../utils/timelineUtils';
import { toast } from 'react-toastify';

patchItemSet(vis.util, vis.timeline);

const NAGS_GROUP_ID = 'nags';

const Timeline = ({ fileData: fileDataProp, nagLines: nagLinesProp = [] }) => {
	const [fileData, setFileData] = useState(fileDataProp);
	const { data: dataProp = [], fileName } = fileData;
	useEffect(() => setFileData(fileDataProp), [fileDataProp]);

	const [nagLines, setNagLines] = useState(nagLinesProp);
	useEffect(() => setNagLines(nagLinesProp), [nagLinesProp]);

	// eslint-disable-next-line react/hook-use-state
	const [, updateState] = useState();
	const forceUpdate = useCallback(() => updateState({}), []);

	const [timeTraqLogsPopupOpen, setTimeTraqLogsPopupOpen] = useState(false);
	const [timeTraqLogs, setTimeTraqLogs] = useState([]);
	const [timeTraqNags, setTimeTraqNags] = useState([]);

	const [statisticsPopupOpen, setStatisticsPopupOpen] = useState(false);
	const allGroups = useRef();
	const nonHiddenGroups = useRef([]);

	const timeline = useRef();
	const markers = useRef([]);
	const task = useRef('');
	const items = useRef([]);
	const fileSettings = useRef(new FileSettings());

	const [appSettings, setAppSettings] = useState();

	const prevFileName = usePrevValue(fileName);
	const prevDataProp = usePrevValue(dataProp);

	const [menuProps, toggleMenu] = useMenuState();
	const [anchorPoint, setAnchorPoint] = useState({ x: 0, y: 0 });

	const timelineDate = '2022-04-07';
	// const nextDate = '2022-04-08';

	useEffect(() => {
		(async () => {
			const settings = await AppSettings.waitAndLoadSettings();
			setAppSettings(settings);

			let [logs, nags] = await Promise.allSettled([
				settings.timeTraqFolder && Neutralino.filesystem.readDirectory(settings.timeTraqFolder), // if not set, resolve with undefined
				settings.timeTraqNagFolder && Neutralino.filesystem.readDirectory(settings.timeTraqNagFolder) // if not set, resolve with undefined
			]);

			logs = logs.status === 'fulfilled' ? logs.value : (toast.error('Time Traq Folder invalid') && null); // if rejected, toast and return null
			nags = nags.status === 'fulfilled' ? nags.value : (toast.error('Time Traq Nag Folder invalid') && null); // if rejected, toast and return null

			logs = logs && logs.filter(log => log.entry.match(/^test-\d{4}\.\d{2}\.\d{2}.txt$/g));
			nags = nags && nags.filter(log => log.entry.match(/^\d{2}-\d{2}-\d{2}.txt$/g));

			if (logs?.length) {
				logs.sort((a, b) => b.entry.localeCompare(a.entry));
				setTimeTraqLogs(logs);
				setTimeTraqLogsPopupOpen(true);
			}
			if (nags?.length) {
				nags.sort((a, b) => b.entry.localeCompare(a.entry));
				setTimeTraqNags(nags);
				setTimeTraqLogsPopupOpen(true);
			}
		})();
	}, []);

	const hideGroups = useCallback(groups => {
		if (!allGroups.current) {
			return;
		}

		const groupIds = groups.map(g => g.id);

		// nested groups can't be hidden if they are not expanded
		// hide the top-level group first, then nested will show
		allGroups.current.update(groupIds.map(gid => ({ id: gid, visible: false })));
		nonHiddenGroups.current = nonHiddenGroups.current.filter(g => !groupIds.includes(g));

		// then hide also the nested ones
		const nestedGroups = groups.map(g => g.nestedGroups && g.nestedGroups.length ? g.nestedGroups : []).flat();
		if (nestedGroups && nestedGroups.length) {
			nonHiddenGroups.current = nonHiddenGroups.current.filter(g => !nestedGroups.includes(g));
			setTimeout(() =>
				allGroups.current.update(nestedGroups.map(g => ({ id: g, visible: false }))),
			10);
		}
	}, []);

	const timelineDivContextMenuHandler = useCallback((e) => {
		e.preventDefault();
		setAnchorPoint({ x: e.clientX, y: e.clientY });
		toggleMenu(true);
	}, [toggleMenu]);

	const contextMenuOnCloseHandler = useCallback(() => {
		toggleMenu(false);
	}, [toggleMenu]);

	const initializeTimeline = useCallback((alwaysReinitialize) => {
		if (timeline.current && !alwaysReinitialize) {
			return;
		}

		items.current = new DataSet([]);
		allGroups.current = new DataSet([{ id: NAGS_GROUP_ID, content: 'Nags', visible: false },]);
		window.allGroups = (allGroups.current);
		nonHiddenGroups.current = allGroups.current.getIds();

		// Configuration for the Timeline
		const options = getTimelineOptions(appSettings.addGroupToAlwaysHide, hideGroups);

		timeline.current && timeline.current.destroy();

		const container = document.getElementById('visualization');
		const timelineLocal = new vis.Timeline(container, items.current, options);

		timeline.current = timelineLocal;
		window.timeline = timelineLocal;

		timelineLocal.setGroups(allGroups.current);

		timeline.current.on('doubleClick', function (properties) {
			const eventProps = timeline.current.getEventProperties(properties.event);

			// if doule-clicked on an existing marker
			if (eventProps.what === 'custom-time') {
				timeline.current.removeCustomTime(eventProps.customTime);
				markers.current.splice(markers.current.findIndex(m => m.customTime === eventProps.customTime), 1);
				return;
			}

			// if double-clicked on open space

			const markerText = TimeAndDate.fromDate(eventProps.time).format('HH:mm:ss');

			timeline.current.addCustomTime(eventProps.time, eventProps.time);
			timeline.current.customTimes.at(-1).hammer.off('panstart panmove panend'); // disable dragging
			timeline.current.setCustomTimeMarker(markerText || undefined,  eventProps.time, false);
			markers.current.push({ customTime: eventProps.time, time: markerText });

			// if markers are even, then we have a start and and an end, so add a background/task
			if (markers.current.length % 2 === 0) {
				const start = markers.current[markers.current.length - 2].time;
				const end = markerText;

				const startDate = TimeAndDate.parse(start, 'HH:mm:ss');
				const endDate = TimeAndDate.parse(end, 'HH:mm:ss');

				const duration = endDate.subtract(startDate);
				const durationWithTime = duration.withStartTime(startDate);

				const taskText = task.current.trim();
				const currentFileTask = fileSettings.current.getTask(taskText);
				const color = currentFileTask?.color || randomColorRGBA(0.4);

				window.TimeAndDate = TimeAndDate;
				window.fileSettings = fileSettings;
				if (!currentFileTask) {
					fileSettings.current.setTask(taskText, color, durationWithTime);
				} else {
					fileSettings.current.addDurationForTask(taskText, durationWithTime);
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
					title: html(`(${taskText})\n${start} -> ${end}\n(${duration.toPrettyString()})`),
					start: timelineDate + ' ' + start,
					end: timelineDate + ' ' + end,
					style: `background-color: ${color}`,
					taskName: taskText,
					type: 'background',
				}]);

				markers.current.forEach(m => timeline.current.removeCustomTime(m.customTime));
				markers.current.length = 0;
			}
		});

		timeline.current.on('contextmenu', (properties) => {
			if (properties.item?.startsWith('background')) {
				if (!timeline.current.getSelection().length || !timeline.current.getSelection().includes(properties.item)) {
					timeline.current.setSelection([properties.item]);
				}

				timelineDivContextMenuHandler(properties.event);
			}
		});

		timeline.current.on('click', (/*properties*/) => {
			contextMenuOnCloseHandler();
		});

		timeline.current.on('rangechanged', function (/*properties*/) {
			setAsyncTimeout(undefined, () =>
				// change cursor to wait (hourglass)
				document.documentElement.classList.add('wait')
			).thenCallback(0, () => // trigger repaint
				// show all non-hidden groups in order to check which items are visible
				allGroups.current.update(nonHiddenGroups.current.map(g => ({ id: g, visible: true })))
			).thenCallback(10, () => { // trigger repaint
				// get all visible items so that we can hide all groups that have no visible items
				let items = timeline.current.getVisibleItems();
				items = items.filter(item => !item.startsWith || !item.startsWith('endbackground'));

				const visibleGroupIds = new Set(items.map(item => timeline.current.itemsData.get(item).group));
				const invisibleGroupIds = nonHiddenGroups.current.filter(group => !visibleGroupIds.has(group));

				allGroups.current.update(invisibleGroupIds.map(g => ({ id: g, visible: false })));
				document.documentElement.classList.remove('wait'); // revert cursor to default
			});
		});
	}, [appSettings, hideGroups, contextMenuOnCloseHandler, timelineDivContextMenuHandler, forceUpdate]);

	useEffect(() => {
		if (!nagLines.length || !appSettings) {
			return;
		}

		if (timeline.current) {
			const all = items.current.getIds().filter(id => ('' + id).startsWith(NAGS_GROUP_ID));
			items.current.remove(all);
		}
		initializeTimeline(false);

		nagLines.forEach((item, index) => items.current.update({
			id: NAGS_GROUP_ID + index,
			content: item.task,
			title: html(`${item.task}\n${item.start} -> ${item.end}`),
			start: timelineDate + ' ' + item.start,
			end: timelineDate + ' ' + item.end,
			group: NAGS_GROUP_ID,
			style: `background-color: ${item.color}`
		}));

		setTimeout(() => {
			allGroups.current.update({
				id: NAGS_GROUP_ID,
				visible: true
			});
			timeline.current.fit();
		}, 10);
	}, [nagLines, nagLinesProp, hideGroups, appSettings]);

	useEffect(() => {
		if (!dataProp.length || !appSettings) return;

		let data = dataProp.map(datum => ({ ...datum })); // copy of data

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
								title: html(`(${currentTask.taskName})\n${start} -> ${end}\n(${pinnedDuration.toPrettyString()})`),
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

		const dataset = [];
		const groups = [];
		calculateTimelineItems(data, appSettings.getGroupsToCopy(), appSettings.getGroupsToExtract(), appSettings.getItemsToRename(), dataset, groups);

		if (timeline.current) {
			const all = items.current.getIds().filter(id => !('' + id).startsWith(NAGS_GROUP_ID));
			items.current.remove(all);
			allGroups.current.remove(allGroups.current.getIds().filter(id => !('' + id).startsWith(NAGS_GROUP_ID)));
		}
		initializeTimeline(false);
		allGroups.current.add(groups);
		timeline.current.itemsData.add(dataset);
		timeline.current.fit();

		Neutralino.window.setTitle(`TimeTraq Visualize - ${fileName}`);

		window.onkeyup = function (e) {
			if (e.code === 'Space') {
				// timeline.fit();
			}
		};

	}, [fileData, fileDataProp, appSettings]);

	useEffect(() => {
		if (allGroups.current && appSettings) {
			const topIds = allGroups.current.getIds();
			const topGroups = topIds
				.map(topId => allGroups.current.get(topId))
				.filter(group => group.id.startsWith && group.id.startsWith('group'))
				.filter(group => appSettings.getAlwaysHideGroups().includes(group.content));

			hideGroups(topGroups);
		}
	}, [allGroups.current, appSettings]);

	const showAllGroups = useCallback(() => {
		const nestedIds = allGroups.current.map(gr => gr).filter(gr => !gr.nestedGroups).map(gr => gr.id);
		const groupIds = allGroups.current.map(gr => gr).filter(gr => gr.nestedGroups).map(gr => gr.id);

		allGroups.current.update(nestedIds.map(g => ({ id: g, visible: true })));

		setTimeout(() => {
			allGroups.current.update(groupIds.map(g => ({ id: g, visible: true, showNested: false })));
		},
		10);
	}, []);

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

	const showStatisticsPopup = useCallback(() => setStatisticsPopupOpen(true), []);
	const hideStatisticsPopup = useCallback(() => setStatisticsPopupOpen(false), []);

	const showTimeTraqLogsPopup = useCallback(() => setTimeTraqLogsPopupOpen(true), []);
	const hideTimeTraqLogsPopup = useCallback(() => setTimeTraqLogsPopupOpen(false), []);

	const getBackgroundStatistics = () => {
		let total = new Duration(0);
		return <div>{fileSettings.current.allTaskNames.map(taskName => {
			const currentTask = fileSettings.current.getTask(taskName);
			total = total.add(currentTask.totalDuration);
			return <Fragment key={currentTask.taskName}>{currentTask.taskName + `: ${currentTask.totalDuration.toPrettyString()}`}<br /></Fragment>;
		})}
			Total: {total.toPrettyString()}<br />
		</div>;
	};

	const loadTimeTraqFile = file => () => {
		Neutralino.filesystem
			.readFile(file.path)
			.then(fileContents => fileDroppedHandler(setFileData, setNagLines, fileContents, file.entry));
	};

	const getTimeTraqLogs = () => {
		if (!timeTraqLogs.length) return;

		return <div className='flex-container-with-equal-children'>
			<div style={{ textAlign: 'center' }}>
				<strong>Logs</strong>
				{timeTraqLogs.map(log =>
					<button key={log.entry} type="button" onClick={loadTimeTraqFile(log)}>{log.entry}</button>)}
			</div>
			<div style={{ textAlign: 'center' }}>
				<strong>Nags</strong>
				{timeTraqNags.map(nag =>
					<button key={nag.entry} type="button" onClick={loadTimeTraqFile(nag)}>{nag.entry}</button>)}
			</div>
		</div>;
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
			<button type="button" onClick={showAllGroups.current}>Show all groups</button>
			<button type="button" onClick={showTimeTraqLogsPopup}>Show TimeTraq Logs</button>
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
		<Popup
			top={10}
			left={10}
			initialWidth={800}
			initialHeight={400}
			className="time-traq-log-popup"
			onClose={hideTimeTraqLogsPopup}
			isOpen={timeTraqLogsPopupOpen}>

			<h3 className='modal-header'>TimeTraq Logs</h3>
			<div className='body'>
				{getTimeTraqLogs()}
			</div>
			<button type="button" className='modal-close' onClick={hideTimeTraqLogsPopup}>
				Close modal
			</button>
		</Popup>
	</>);
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
