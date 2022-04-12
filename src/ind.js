const fs = require('fs');
const moment = require('moment');

const historyDir = "C:\\Users\\Bonny Piggov\\Desktop\\Projects\\time-traq-visualize\\.history"

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

const fileMap = allFiles.filter((a,ind)=>ind<50).map(file => ({time: getDate(file), path: file}));

fileMap.sort((a,b) => a.time - b.time);

const durations = [];
fileMap.forEach((file, index) => {
	if (index === 0) return;
	const dur = moment.duration(moment(fileMap[index].time).subtract(fileMap[index-1].time));
	durations.push(`${fileMap[index].time} - ${fileMap[index-1].time} = ${dur.days()}d${dur.hours()}h${dur.minutes()}m${dur.seconds()}s`);
})

console.log(durations)

//console.log(moment.duration(fileMap[0].time.subtract(fileMap[4].time)).toString());

// console.log(fileMap);