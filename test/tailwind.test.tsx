import { it, describe, expect } from 'vitest';

import { initFonts, toImage } from './utils.js';
import satori from '../src/index.js';

describe('Tailwind', () => {
	let fonts;
	initFonts(f => (fonts = f));

	it('should render div with tailwind className', async () => {
		const svg = await satori(
			<div className='flex w-full h-full bg-red-500'>Hello</div>,
			{
				width: 100,
				height: 100,
				fonts,
				tailwind: true
			}
		);
		expect(toImage(svg, 100)).toMatchImageSnapshot();
	});

	it('should render nested elements with className', async () => {
		const svg = await satori(
			<div className='flex flex-col w-full h-full bg-blue-500 p-4'>
				<span className='text-white font-bold'>Title</span>
				<span className='text-white opacity-50'>Subtitle</span>
			</div>,
			{
				width: 200,
				height: 100,
				fonts,
				tailwind: true
			}
		);
		expect(toImage(svg, 200)).toMatchImageSnapshot();
	});

	it('should merge className styles with inline style (inline wins)', async () => {
		const svg = await satori(
			<div
				className='bg-red-500 w-full h-full'
				style={{ backgroundColor: 'blue' }}
			>
				Blue wins
			</div>,
			{
				width: 100,
				height: 100,
				fonts,
				tailwind: true
			}
		);
		expect(toImage(svg, 100)).toMatchImageSnapshot();
	});

	it('should work without tailwind flag (backward compatible)', async () => {
		const svg = await satori(
			<div
				style={{
					backgroundColor: 'green',
					display: 'flex',
					height: '100%',
					width: '100%'
				}}
			>
				No tailwind
			</div>,
			{
				width: 100,
				height: 100,
				fonts
			}
		);
		expect(toImage(svg, 100)).toMatchImageSnapshot();
	});

	it('should handle arbitrary values', async () => {
		const svg = await satori(
			<div className='flex w-[200px] h-[80px] bg-[#ff6600] rounded-[8px]'>
				Custom
			</div>,
			{
				width: 200,
				height: 100,
				fonts,
				tailwind: true
			}
		);
		expect(toImage(svg, 200)).toMatchImageSnapshot();
	});

	it('should handle elements without className', async () => {
		const svg = await satori(
			<div className='flex w-full h-full'>
				<div
					style={{ backgroundColor: 'red', width: 50, height: 50 }}
				/>
				<div className='bg-blue-500 w-[50px] h-[50px]' />
			</div>,
			{
				width: 100,
				height: 100,
				fonts,
				tailwind: true
			}
		);
		expect(toImage(svg, 100)).toMatchImageSnapshot();
	});

	it('should handle custom tailwind CSS config', async () => {
		const customCss = `
			@layer theme, base, components, utilities;

			@layer theme {
				@theme {
					--color-brand: #ff00ff;
				}
			}

			@layer utilities {
				@tailwind utilities;
			}
		`;

		const svg = await satori(
			<div className='flex w-full h-full bg-brand'>Custom Theme</div>,
			{
				width: 100,
				height: 100,
				fonts,
				tailwind: customCss
			}
		);
		expect(toImage(svg, 100)).toMatchImageSnapshot();
	});
});
