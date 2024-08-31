import { React, useEffect, useState, useRef, useCallback, Fragment } from 'react';

import ChartJs from './ChartJs';
import FileDropper from './FileDropper';
import Timeline from './Timeline';
import { fileDroppedHandler } from '../utils/timelineUtils';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';
import Statistics from './Statistics';
import Popup from './Popup';
import * as Neutralino from '@neutralinojs/lib';
import AppSettings, { SETTINGS_NAME } from '../utils/AppSettings';
import { JSONEditor } from '@json-editor/json-editor';

const DEFAULT_FILE_PATH = 'C:\\input.txt';

const App = () => {
	const [showChart, setShowChart] = useState('timeline');
	const [fileData, setFileData] = useState({ data:[] });
	const [nagLines, setNagLines] = useState([]);
	const [settingsModalOpen, setSettingsModalOpen] = useState(false);
	const [errors, setErrors] = useState([]);
	const settingsJsonEditor = useRef(null);

	const [appSettings, setAppSettings] = useState();

	useEffect(() => {
		AppSettings.waitAndLoadSettings().then(settings => {
			setAppSettings(settings);
		});
	}, []);

	useEffect(() => {
		if (settingsModalOpen && appSettings && !settingsJsonEditor.current) {
			settingsJsonEditor.current = new JSONEditor(document.getElementById('settingsJsonEditor'), {
				schema: AppSettings.Schema,
				required_by_default: true,
				collapsed: true,
				disable_edit_json: true,
				startval: appSettings
			});
		}
	});

	const storeSettings = useCallback(() => {
		const settingsJson = settingsJsonEditor.current.getValue();
		Neutralino.storage
			.setData(SETTINGS_NAME, `/* ${JSON.stringify(AppSettings.Metadata)} */\n${JSON.stringify(settingsJson)}`)
			.catch((e) => toast.error('Error storing settings ' + e));
		setAppSettings(settingsJson);
		toast.info('Done! Please reload.');
	}, []);

	const fileDroppedHandlerApp = fileDroppedHandler.bind(null, setFileData, setNagLines);

	useEffect(() => {
		Neutralino.filesystem.getStats(DEFAULT_FILE_PATH)
			.then(() => Neutralino.filesystem.readFile(DEFAULT_FILE_PATH))
			.then((content) =>
				fileDroppedHandlerApp(content, DEFAULT_FILE_PATH.substring(DEFAULT_FILE_PATH.lastIndexOf('\\') + 1)))
			.then(() => Neutralino.window.setTitle(`TimeTraq Visualize - ${DEFAULT_FILE_PATH.substring(DEFAULT_FILE_PATH.lastIndexOf('\\') + 1)}`))
			.catch(() => toast.error(`Default file "${DEFAULT_FILE_PATH}" not found`, { autoClose: 5000 }));
	}, []);

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
		<FileDropper fileDroppedHandler={fileDroppedHandlerApp} />
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

				<div id='settingsJsonEditor' style={{ textAlign: 'left' }} />
				<button type="button" onClick={storeSettings}>Save settings</button>
			</div>
			<button type="button" className='modal-close' onClick={hideSettingsModal}>
				Close modal
			</button>
		</Popup>
	</>);
};

export default App;
