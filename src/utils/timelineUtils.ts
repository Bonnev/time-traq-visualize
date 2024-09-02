
import * as Neutralino from '@neutralinojs/lib';
import { randomColor } from './colorUtils';
import { TimeAndDate } from './dateTimeUtils';

export const processNagLines = (nagLines: string[]) => {
	const stylesByTask: {[task: string]: string} = {};
	const nagItems: {task: string, start: string, end: string, color: string}[] = [];
	let currentItemStartDate = '';
	let currentTask = '';

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

	return nagItems;
};

export const processLogLines = (logLines: string[]) => {
	const timelineDate = '2022-04-07';
	// const nextDate = '2022-04-08';

	const matrix = logLines
		.filter(line => line.length > 0) // only non-empty lines
		.map(line => line.split('\t')); // split by tab

	const logItems: { label: string, process: string, content: string, title: string, number: number, start: string, end: string }[] = [];

	matrix.forEach((current, index) => {
		if (index - 1 < 0) return;

		// C:\Program Files\...\msedge.exe	Rewriting Git History... - YouTube and 30 more pages - Personal - Microsoft Edge	08:50:06	08:53:47
		const prevRow = matrix[index - 1];
		// const current = matrix[index]; // automatic by first parameter

		const prevRowTime = TimeAndDate.parse(prevRow[3], 'HH:mm:ss');
		const currentRowTime = TimeAndDate.parse(current[3], 'HH:mm:ss');
		const durationSeconds = currentRowTime.subtract(prevRowTime).totalSeconds;

		logItems.push({
			label: current[0],
			process: current[0].substring(current[0].lastIndexOf('\\') + 1),
			content: current[1].replace(/and \d+ more pages?/, '').substring(0, 50),
			title: current[1].replace(/and \d+ more pages?/, ''),
			number: durationSeconds,
			start: timelineDate + ' ' + prevRow[3],
			end: timelineDate + ' ' + current[3]
		});
	});

	return logItems;
};

export const fileDroppedHandler = (fileDataSetter: (_: object) => void, nagLinesSetter: (_: object[]) => void, fileContents: string, fileName: string) => {
	if (fileName.match(/\d{2}-\d{2}-\d{2}\.txt/)) {
		nagLinesSetter(processNagLines(fileContents.split('\n')));
		return;
	} else if (fileName.match(/^test-\d{4}\.\d{2}\.\d{2}.txt$/g)) {
		const data = processLogLines(fileContents.split('\n'));
		fileDataSetter({ data, fileName });
	}
};

const groupTemplate = (addGroupToAlwaysHide: (group: string) => void, hideGroups: (groups: object[]) => void, group: { content: string } | null) => {
	if (!group) return null;
	const container = document.createElement('div');

	const label = document.createElement('span');
	label.innerHTML = group.content + ' ';
	container.insertAdjacentElement('afterbegin', label);

	const hide = document.createElement('button');
	hide.innerHTML = 'Hide';
	hide.style.fontSize = 'small';
	hide.addEventListener('click', function () {
		hideGroups([group]);
	});
	container.insertAdjacentElement('beforeend', hide);

	const alwaysHide = document.createElement('button');
	alwaysHide.innerHTML = 'Always hide';
	alwaysHide.style.fontSize = 'small';
	alwaysHide.addEventListener('click', function () {
		addGroupToAlwaysHide(group.content);
		hideGroups([group]);
	});
	container.insertAdjacentElement('beforeend', alwaysHide);

	return container;
};

export const getTimelineOptions = (addGroupToAlwaysHide: (group: string) => void, hideGroups: (groups: object[]) => void) => {
	return {
		stack: false,
		tooltip: {
			followMouse: true,
			delay: 0
		},
		orientation: 'both',
		multiselect: true,
		groupTemplate: groupTemplate.bind(null, addGroupToAlwaysHide, hideGroups),
	};
};

export const html = (innerHTML : string) => {
	innerHTML = innerHTML.replaceAll('\n', '<br />');
	const el = document.createElement('span');
	el.innerHTML = innerHTML;
	return el;
};

export const calculateTimelineItems = (
	/* Input */
	data: { label: string, process: string, content: string, title: string, number: number, start: string, end: string }[],
	groupsToCopy: string[],
	groupsToExtractParam: { [group: string]: string }[],
	itemsToRenameParam: (string | { [group: string]: string })[],
	/* Output */
	dataset: { id: number | string, content: string, title?: HTMLElement | string, start: string, end: string, selectable: boolean, group: string, style?: string }[],
	groups: { id: string; content: string; nestedGroups?: any; showNested?: boolean | undefined; color?: string | undefined; style?: string | undefined;}[]
) => {
	// group items matching these regexes and copy them to new groups
	// the imposibleregextomach is so that we always start with 1 - the extractedIndex is used in checks when sorting further down
	groupsToCopy = ['imposibleregextomach', ...groupsToCopy];
	const dataToAppend: { label: string, process: string, content: string, title: string, number: number, start: string, end: string, extractedIndex: number }[] = [];
	data.forEach((datum) => {
		const matchingGroupIndex = groupsToCopy.findIndex(regex => datum.title.match(new RegExp(regex, 'g')));
		if (matchingGroupIndex > -1) {
			const matches = datum.title.match(new RegExp(groupsToCopy[matchingGroupIndex], 'g'));
			if (matches) {
				matches.forEach(match =>
					dataToAppend.push({ ...datum, process: match, label: match, extractedIndex: matchingGroupIndex, title: `${datum.title} (${datum.process})` })
				);
			}
		}
	});
	data = data.concat(dataToAppend);

	// group items matching these regexes and separate them into new groups
	const groupsToExtract = groupsToExtractParam.map(group => Object.keys(group)[0]);
	const extractNewNames = groupsToExtract.map(group => Object.values(group)[0]);
	data.forEach((datum) => {
		const matchingGroupIndex = groupsToExtract.findIndex(regex => datum.title.match(new RegExp(regex, 'g')));
		if (matchingGroupIndex > -1) {
			const matches = datum.title.match(new RegExp(groupsToExtract[matchingGroupIndex], 'g'));
			if (matches) {
				// change process and label, grouping will happen automatically with the main logic
				datum.process = extractNewNames[matchingGroupIndex];
				datum.label = extractNewNames[matchingGroupIndex];
			}
		}
	});

	// rename items matching the key regexes with the value strings (including groups)
	const itemsToRename = itemsToRenameParam.map(group => Object.keys(group)[0]);
	const itemsToRenameNewNames = itemsToRename.map(group => Object.values(group)[0]);
	data.forEach((datum) => {
		const matchingGroupIndex = itemsToRename.findIndex(regex => datum.title.match(new RegExp(regex, 'g')));
		if (matchingGroupIndex > -1) {
			// change title and content
			datum.title = datum.title.replace(new RegExp(itemsToRename[matchingGroupIndex], 'g'), itemsToRenameNewNames[matchingGroupIndex]);
			datum.content = datum.title;
		}
	});

	let unique: { label: string, process: string, content: string, title: string, number: number, start: string, end: string, extractedIndex?: number, color?: string }[] = [];

	data.forEach((datum) => {
		const found = unique.find(u => u.label === datum.label);
		if (!found) {
			unique.push(datum);
		} else {
			found.number += datum.number;
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

	const subgroupsMap: Map<string, any[]> = new Map();
	const subgroupsItemsMap: Map<string, string> = new Map();
	let subgroups = data.map((u, id) => ({
		id: 'subgroup' + id,
		content: u.content,
		treeLevel: 2,
		process: u.process,
		style: `background-color: ${randomColor()}`
	}));

	// remove duplicates
	subgroups = subgroups.reduce<{ id: string;content: string;treeLevel: number;process: string;style: string;}[]>(
		(acc, current) => !acc.find(el => el.content === current.content) ? acc.concat([current]) : acc, []);

	subgroups.forEach(u => {
		const existing = subgroupsMap.get(u.process);
		if (existing) {
			subgroupsMap.set(u.process, existing.concat([u.id]));
		} else {
			subgroupsMap.set(u.process, [u.id]);
		}
	});
	subgroups.forEach(u => subgroupsItemsMap.set(u.content, u.id));

	const groupsMap = new Map();
	unique.map((u, id) => ({
		id: 'group' + id + subgroups[subgroups.length - 1].id + 1,
		content: u.process,
		nestedGroups: subgroupsMap.get(u.process) || undefined,
		showNested: false,
		color: u.color,
		style: `background-color: ${u.color}`
	})).forEach(u => groups.push(u));
	groups.forEach(u => groupsMap.set(u.content, u));
	groups.unshift({ id: 'all', content: 'All' });
	//groups.unshift({ id: NAGS_GROUP_ID, content: 'Nags', visible: false });

	subgroups = subgroups.map(sub => Object.assign(sub, { style: `background-color: ${groupsMap.get(sub.process).color}` }));

	data.map((u, ind) => ({
		id: ind,
		content: `${u.content} (${u.process})`,
		title: html(`${u.title}\n${u.start} -> ${u.end}\n(${u.process})`),
		start: u.start,
		end: u.end,
		selectable: false,
		group: groupsMap.get(u.process).id,
		style: `background-color: ${groupsMap.get(u.process).color}`
	})).forEach(u => dataset.push(u));

	let globalEnd: string;
	const groupEnds: {[key: string]: string} = {};
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
		id: ind + +dataset[dataset.length - 1].id + 1,
		content: `${u.content} (${u.process})`,
		title: u.title,
		start: u.start,
		end: u.end,
		selectable: false,
		group: subgroupsItemsMap.get(u.content) || ''
	}));
	subgroupDataset.forEach(u => dataset.push(u));

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
	allDataset.forEach(u => dataset.push(u));

	endBackgrounds.forEach(u => dataset.push(u));

	subgroups.forEach(u => groups.push(u));
};