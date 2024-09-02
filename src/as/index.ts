
export function calculateTimelineItems (
	/* Input */
	data: { label: string, process: string, content: string, title: string, number: number, start: string, end: string }[],
	groupsToCopy: string[],
	groupsToExtractParam: { [group: string]: string }[],
	itemsToRenameParam: (string | { [group: string]: string })[],
	/* Output */
	dataset: { id: number | string, content: string, title?: HTMLElement | string, start: string, end: string, selectable: boolean, group: string, style?: string }[],
	groups: { id: string; content: string; nestedGroups?: any; showNested?: boolean | undefined; color?: string | undefined; style?: string | undefined;}[]
) {
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
}