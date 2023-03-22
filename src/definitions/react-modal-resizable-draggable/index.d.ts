import { Component, PropsWithChildren } from 'react';
import 'react-modal-resizable-draggable/index.css';
import Modal from './model';

declare module "react-modal-resizable-draggable" {
	interface PropTypes {
		top?: number;
		left?: number;
		initHeight?: number;
		initWidth?: number;
		minWidth?: number;
		minHeight?: number;
		isOpen: boolean;
		className?: string;
		disableMove?: boolean;
		disableVerticalMove?: boolean;
		disableHorizontalMove?: boolean;
		isMinimised?: boolean;
		disableResize?: boolean;
		disableKeystroke?: boolean;
		disableVerticalResize?: boolean;
		disableHorizontalResize?: boolean;
		onRequestClose: () => void;
		onRequestMinimise?: () => void;
		onRequestRecover?: () => void;
		onFocus?: () => void;
	}
	interface StateTypes {
		width: number;
		height: number;
		top: number;
		left: number;
		rel?: {
			x: number;
			y: number;
		};
		isDragging: boolean;
		isResizing: boolean;
	}
	export default class FlexibleModal extends Component<PropsWithChildren<PropTypes>, StateTypes> {
		node_modal?: Modal | null;
		dragArea?: HTMLDivElement | null;
		dragArea2?: HTMLDivElement | null;
		dragArea3?: HTMLDivElement | null;
		dragArea4?: HTMLDivElement | null;
		constructor(props: Readonly<PropsWithChildren<PropTypes>>);
		componentDidMount(): void;
		componentWillUnmount(): void;
		onMouseDown(e: {
			button: number;
			pageX: number;
			pageY: number;
			stopPropagation: () => void;
			preventDefault: () => void;
		}): void;
		onMouseUp(e: {
			stopPropagation: () => void;
		}): void;
		onMouseMove(e: {
			pageY: number;
			pageX: number;
			clientX: any;
			clientY: any;
			stopPropagation: () => void;
			preventDefault: () => void;
		}): void;
		updateStateResizing(isResizing: any): void;
		funcResizing(clientX: number, clientY: number): void;
		pressKey(e: {
			ctrlKey: any;
			keyCode: any;
		}): void;
		resize(width: any, height: any): void;
		render(): JSX.Element;
	}
	
}
