const fs = require('fs');
const childProcess = require('child_process');

const filePaths = fs.readdirSync('.');

filePaths
	// only files
	.filter(filePath => fs.lstatSync(filePath).isFile())
	// exclude .js files
	.filter(filePath => !filePath.endsWith('.js'))
	// read and add file contents
	.map(filePath => ({ path: filePath, content: fs.readFileSync(filePath, 'utf-8') }))
	// only files with at least 2 lines
	.filter(file => file.content.split('\n').length > 1)
	// for debugging purposes
	//.map(file => {console.log('file', file.path, file.content.split('\n')[1]); return file; })
	// parse and add json
	.map(file => ({ ...file, jsonLine: file.content.split('\n')[1] }))
	// only jsons with "tasks" (e.g. we don't want settings)
	.filter(({ jsonLine }) => 'tasks' in JSON.parse(jsonLine))
	// patch json line and add it to the object
	.map(file => ({ ...file, replacedLine:
		childProcess.execFileSync(
			'node',
			['json5-wildcard-patch.js', '//tasks/*', '{"type":"TaskInfo"}'],
			{ encoding: 'utf8', input: file.jsonLine }) }))
	.forEach(file => {
		fs.writeFileSync(file.path + '.backup', file.content);
		fs.writeFileSync(file.path, file.content.split('\n')[0] + '\n' + file.replacedLine);
	});