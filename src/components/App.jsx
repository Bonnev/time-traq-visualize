import { React, useEffect, useState, useCallback, Fragment } from 'react';

import ChartJs from './ChartJs.jsx';
import FileDropper from './FileDropper.jsx';
import Timeline from './Timeline.jsx';
import { TimeAndDate } from '../utils/dateTimeUtils.ts';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';
import Statistics from './Statistics.jsx';
import Popup from './Popup';

const DEFAULT_FILE_PATH = 'C:\\input.txt';

const App = () => {
	const [showChart, setShowChart] = useState('timeline');
	const [fileData, setFileData] = useState({ data:[] });
	const [nagLines, setNagLines] = useState([]);
	const [settingsModalOpen, setSettingsModalOpen] = useState(false);
	const [errors, setErrors] = useState([]);

	const fileDroppedHandler = useCallback((fileContents, fileName) => {
		if (fileName.match(/\d{2}-\d{2}-\d{2}\.txt/)) {
			setNagLines(fileContents.split('\n'));
			return;
		}

		const timelineDate = '2022-04-07';
		// const nextDate = '2022-04-08';

		const lines = fileContents.split('\n');

		const matrix = lines
			.filter(line => line.length > 0) // only non-empty lines
			.map(line => line.split('\t')); // split by tab

		let data = [];

		matrix.forEach((current, index) => {
			if (index - 1 < 0) return;

			// C:\Program Files\...\msedge.exe	Rewriting Git History... - YouTube and 30 more pages - Personal - Microsoft Edge	08:50:06	08:53:47
			const prevRow = matrix[index - 1];
			// const current = matrix[index]; // automatic by first parameter

			const prevRowTime = TimeAndDate.parse(prevRow[3], 'HH:mm:ss');
			const currentRowTime = TimeAndDate.parse(current[3], 'HH:mm:ss');
			const durationSeconds = currentRowTime.subtract(prevRowTime).totalSeconds;

			data.push({
				label: current[0],
				process: current[0].substring(current[0].lastIndexOf('\\') + 1),
				content: current[1].replace(/and \d+ more pages?/, '').substring(0, 50),
				title: current[1].replace(/and \d+ more pages?/, ''),
				number: durationSeconds,
				start: timelineDate + ' ' + prevRow[3],
				end: timelineDate + ' ' + current[3]
			});
		});

		setFileData({ data, fileName });
		setNagLines([]);

		Neutralino.window.setTitle(`TimeTraq Visualize - ${fileName}`);
	}, []);

	useEffect(() => {
		Neutralino.filesystem.getStats(DEFAULT_FILE_PATH)
			.then(() => Neutralino.filesystem.readFile(DEFAULT_FILE_PATH))
			.then((content) =>
				fileDroppedHandler(content, DEFAULT_FILE_PATH.substring(DEFAULT_FILE_PATH.lastIndexOf('\\') + 1)))
			.then(() => Neutralino.window.setTitle(`TimeTraq Visualize - ${DEFAULT_FILE_PATH.substring(DEFAULT_FILE_PATH.lastIndexOf('\\') + 1)}`))
			.catch(() => toast.error(`Default file "${DEFAULT_FILE_PATH}" not found`, { autoClose: 5000 }));
	}, [fileDroppedHandler]);

	useEffect(() => {
		window.addEventListener('error', function(event) {
			toast.error(event.message);
			setErrors(errors => errors.concat([event.error.stack]));
		});
	}, []);

	const dataCopy = fileData.data.map(datum => ({ ...datum })); // copy of data

	const hideSettingsModal = useCallback(() => {
		setSettingsModalOpen(false);
	}, []);

	const showSettingsModal = useCallback(() => {
		setSettingsModalOpen(true);
	}, []);

	return (<>
		<FileDropper fileDroppedHandler={fileDroppedHandler} />
		<div className='flex-container-with-equal-children'>
			<button type="button" onClick={()=>setShowChart('chartjs')}>ChartJs</button>
			<button type="button" onClick={()=>setShowChart('timeline')}>Timeline</button>
			<button type="button" onClick={()=>setShowChart('statistics')}>Statistics</button>
			<button type="button" onClick={showSettingsModal}>Settings</button>
		</div>
		<ToastContainer position="bottom-left"
			autoClose={false}
			closeOnClick
			pauseOnFocusLoss
			draggable
			pauseOnHover />
		{showChart === 'chartjs' ? <ChartJs data={dataCopy} /> : null}
		{showChart === 'timeline' ? <Timeline fileData={fileData} nagLines={nagLines}  /> : null}
		{showChart === 'statistics' ? <Statistics /> : null}
		<Popup
			top={10}
			left={10}
			initialWidth={800}
			initialHeight={400}
			className="my-modal-custom-class"
			onClose={hideSettingsModal}
			isOpen={settingsModalOpen}>

			<h3 className='modal-header'>Settings</h3>
			<div className='body'>
				<h4>Errors</h4>
				{errors.map(error =>
					<div key={error} style={{ border: '1px solid black', margin: 5 }}>
						{error.split('\n').map(line =>
							<Fragment key={line}>{line}<br /></Fragment>)}
					</div>)}
			</div>
			<button type="button" className='modal-close' onClick={hideSettingsModal}>
				Close modal
			</button>
		</Popup>
	</>);
};

export default App;
