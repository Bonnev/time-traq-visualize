import React from "react";
import "react-modal-resizable-draggable/index.css";
interface PropTypes {
    updateStateResizing: (v: boolean) => void;
}
declare class Resizer extends React.Component<PropTypes> {
    handleMouseDown(): void;
    render(): JSX.Element;
}
export default Resizer;
