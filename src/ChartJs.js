import { React, useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Chart } from './chart-wrapper';

const initialConfig = {
	type: 'bar',
	options: {
		plugins: {
			tooltip: {
				callbacks: {
					label: function(context) {
						const number = context.parsed.y;

						const hours = number / 3600;
						const minutes = (number % 3600) / 60;
						const seconds = (number % 3600) % 60;

						return hours.toFixed(0).padStart(2, '0') + ':'
							+ minutes.toFixed(0).padStart(2,  '0') + ':'
							+ seconds.toFixed(0).padStart(2,  '0');
					}
				}
			}
		}
	}
};

function ChartJs({data}) {
	const config = useRef(Object.assign({}, initialConfig));
	const chart = useRef();

	useEffect(() => {
		if (!data || !data.length) return;

		const unique = [];

		data.forEach((datum) => {
			if (!unique.map(u => u.label).includes(datum.label)) {
				unique.push(datum);
			} else {
				unique.find(u => u.label === datum.label).number += datum.number;
			}
		});

		unique.sort((a,b)=> b.number - a.number);

		const dataForChart = {
			labels: unique.map(u => u.label.substring(u.label.lastIndexOf('\\') + 1)),
			datasets: [{
				label: 'My First dataset',
				backgroundColor: 'rgb(255, 99, 132)',
				borderColor: 'rgb(255, 99, 132)',
				data: unique.map(u => u.number),
			}]
		};

		config.current.options.plugins.tooltip.callbacks.title = function(context) {
			const index = context[0].parsed.x;
			return unique[index].label;
		};

		config.current.data = dataForChart;

		chart.current && chart.current.destroy();

		const chartLocal = new Chart(document.getElementById('myChart'), config.current);
		chart.current = chartLocal;
	}, [data]);

	return <canvas id="myChart" />;
}

ChartJs.propTypes = {
	data: PropTypes.arrayOf(PropTypes.shape({
		label: PropTypes.string,
		process: PropTypes.string,
		content: PropTypes.string,
		title: PropTypes.string,
		number: PropTypes.number,
		start: PropTypes.string,
		end: PropTypes.string,
	})).isRequired,
};

export default ChartJs;