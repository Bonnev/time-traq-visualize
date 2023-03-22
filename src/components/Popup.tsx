
import React, { Component, PropsWithChildren } from 'react';
import { useEffect, useState, useCallback, Fragment, FC } from 'react';
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

const Popup: FC<PropsWithChildren<PopupProps>> = (props) => {
	return (<>
		<ReactModal
			top={props.top}
			left={props.left}
			initWidth={props.initialWidth}
			initHeight={props.initialHeight}
			disableKeystroke
			isOpen={props.isOpen}
			onRequestClose={props.onClose}
			className={props.className}>

			{props.children}
		</ReactModal>
	</>)
}

export default Popup;