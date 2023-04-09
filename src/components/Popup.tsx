
import React, { PropsWithChildren } from 'react';
import { FC } from 'react';
import ReactModal from 'react-modal-resizable-draggable';

type PopupProps = {
	top: number,
	left: number,
	initialWidth: number,
	initialHeight: number,
	className: string,
	onClose: () => void,
	isOpen: boolean
};

const Popup: FC<PropsWithChildren<PopupProps>> = ({ top, left, initialWidth, initialHeight, isOpen, onClose, className, children }) => {
	return (<ReactModal
		top={top}
		left={left}
		initWidth={initialWidth}
		initHeight={initialHeight}
		disableKeystroke
		isOpen={isOpen}
		onRequestClose={onClose}
		className={className}>

		{children}
	</ReactModal>);
};

export default Popup;