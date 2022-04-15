const fs = require('fs');
const moment = require('moment');

const historyDir = "..\\.history"

const allFiles = [];

const addFiles = (dir) => {
	const files = fs.readdirSync(dir);
	
	files.forEach(file => {

		if (fs.lstatSync(dir+'\\'+file).isDirectory()) {
			addFiles(dir+'\\'+file)
		} else {
			allFiles.push(dir+'\\'+file);
		}
	});
}

addFiles(historyDir);

const getRawTime = file => {
	return file.replace(/.*?(\d+)(\.\w+)?/, '$1')
}

const getDate = filePath => {
	const rawTime = getRawTime(filePath);
	const mom = moment(rawTime, "YYYYMMDDHHmmss");
	return mom;
}

const fileMap = allFiles/*.filter((a,ind)=>ind<50)*/.map(file => ({time: getDate(file), path: file}));

fileMap.sort((a,b) => a.time - b.time);

const durations = [];
fileMap.forEach((file, index) => {
	if (index === 0) return;
	const dur = moment.duration(moment(fileMap[index].time).subtract(fileMap[index-1].time));
	durations.push(`${fileMap[index].time} - ${fileMap[index-1].time} = ${dur.days()}d${dur.hours()}h${dur.minutes()}m${dur.seconds()}s`);
})

// console.log(durations)

const batches = fileMap.reduce((acc, current) => {
	if (!acc.length) {
		acc.push({time: current.time, paths: [current.path]});
		return acc;
	}

	const lastBatchTime = acc[acc.length-1].time;

	const timeToCurrent = moment.duration(moment(current.time).subtract(lastBatchTime));

	if (timeToCurrent < moment.duration(2, 'hours')) {
		acc[acc.length-1].paths.push(current.path);
	} else {
		acc.push({time: current.time, paths: [current.path]});
	}
	return acc;
}, [])

const commands = batches.map((batch,ind) => {
	const paths = batch.paths;
	const newOldPaths = paths.map(path => ({oldPath: path, newPath: path.replace(/\\\.history\\(.*)_\d+(\.\w+)?$/, '\\$1$2')}));
	const copyCommands = newOldPaths.map(newOld => `cp "${newOld.oldPath}" "${newOld.newPath}"`);
	const addCommands = newOldPaths.map(newOld => `git add ${newOld.newPath}`);
	const dateString = batch.time.format('YYYY-MM-DD[T]HH:mm:SS') // 2005-04-07T22:13:13
	const commitCommand = `GIT_COMMITTER_DATE=${dateString} git commit -m "batch ${ind+1}" --date=${dateString}`;

	return [copyCommands, addCommands, commitCommand];
}).flat(10);

//console.log(moment.duration(fileMap[0].time.subtract(fileMap[4].time)).toString());

fs.writeFileSync('.\\commands.txt', commands.join('\n').replace(/\\/g, '/'));

// console.log(commands);