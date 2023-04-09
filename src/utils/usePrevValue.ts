import { useEffect, useRef } from 'react';

export default function usePrevValue(state: any) {
	// The ref object is nothing but a generic container that whose current property is mutable and can hold any value.
	const ref = useRef<any>();

	useEffect(() => {
		// Storing latest/current value in ref
		ref.current = state; // Updating the ref to latest/current value
	}, [state]); //If value changes then only it will re-run

	// Returning the previous value (this will trigger before the useEffect above)
	return ref.current; // (This will have the previous value)
}