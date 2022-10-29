import { React, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const FileDropper = ({ fileDroppedHandler }) => {
	const addedListeners = useRef(false);
	const draggingFile = useRef(false);

	useEffect(() => {
		let root = document.querySelector('#root');
		if (!root) {
			return;
		}

		if (addedListeners.current) {
			return;
		}

		root.addEventListener('dragenter', (event) => {
			event.preventDefault();

			// if not dragging files
			if (!event.dataTransfer.types.includes('Files')) {
				return;
			}

			if (draggingFile.current) {
				return;
			}

			// 	event.preventDefault();
			root.classList.add('children-clickthrough');

			let overlay = document.getElementById('drop-overlay');
			overlay.style.opacity = 1;

			// let overlayContent = document.getElementById('drop-overlay-content');
			// overlayContent.innerText = event.dataTransfer.files[0].name;
			draggingFile.current = true;

		}, true);

		root.addEventListener('dragover', (event) => {
			event.preventDefault();

			// let overlayContent = document.getElementById('drop-overlay-content');
			// overlayContent.style.top = (event.clientY-40) + 'px';
			// overlayContent.style.left = (event.clientX+60) + 'px';

			return false;
		});

		root.addEventListener('dragleave', (event) => {
			event.preventDefault();

			if (event.target === root) {
				root.classList.remove('children-clickthrough');
				let overlay = document.getElementById('drop-overlay');
				overlay.style.opacity = 0;
				draggingFile.current = false;
			}

			return false;
		});

		root.addEventListener('drop', (event) => {
			event.preventDefault();

			root.classList.remove('children-clickthrough');

			let overlay = document.getElementById('drop-overlay');
			overlay.style.opacity = 0;

			const fileName = event.dataTransfer.files[0].name;

			event.dataTransfer.items[0]
				.getAsFile()
				.text()
				.then((content) => fileDroppedHandler(content, fileName));

			draggingFile.current = false;
		}, { capture: true });

		addedListeners.current = true;
	}, [fileDroppedHandler]);

	return <div id='drop-overlay' style={{ opacity: 0 }} >
		{/* <div id='drop-overlay-content'>will be populated with the file name</div> */}
	</div>;
};

FileDropper.propTypes = {
	fileDroppedHandler: PropTypes.func.isRequired
};

export default FileDropper;
