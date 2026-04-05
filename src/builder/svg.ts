import { buildXMLString } from '../utils.js';

const svg = ({
	content,
	height,
	width
}: {
	content: string;
	height: number;
	width: number;
}) => {
	return buildXMLString(
		'svg',
		{
			height,
			viewBox: `0 0 ${width} ${height}`,
			width,
			xmlns: 'http://www.w3.org/2000/svg'
		},
		content
	);
};

export default svg;
