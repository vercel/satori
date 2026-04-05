import { describe, expect, it } from 'vitest';

import { convertOklch, oklchToHex } from '../../src/tw/oklch.js';

describe('tw/oklch', () => {
	describe('convertoklch', () => {
		it('should convert oklch(l c h) to hex', () => {
			const result = convertOklch('oklch(0.5 0.1 180)');
			expect(result).toMatch(/^#[0-9a-f]{6}$/);
		});

		it('should convert oklch with alpha', () => {
			const result = convertOklch('oklch(0.5 0.1 180 / 0.5)');
			expect(result).toMatch(/^#[0-9a-f]{8}$/);
		});

		it('should convert percentage l value', () => {
			const result = convertOklch('oklch(50% 0.1 180)');
			expect(result).toMatch(/^#[0-9a-f]{6}$/);
		});

		it('should convert percentage alpha', () => {
			const result = convertOklch('oklch(0.5 0.1 180 / 50%)');
			expect(result).toMatch(/^#[0-9a-f]{8}$/);
		});

		it('should handle multiple oklch() in same string', () => {
			const result = convertOklch(
				'color: oklch(0.5 0.1 180); border: oklch(1 0 0)'
			);
			expect(result).not.toContain('oklch');
		});

		it('should return value unchanged when no oklch()', () => {
			expect(convertOklch('#ff0000')).toEqual('#ff0000');
			expect(convertOklch('rgb(255, 0, 0)')).toEqual('rgb(255, 0, 0)');
		});

		it('should skip malformed oklch with less than 3 parts', () => {
			const result = convertOklch('oklch(0.5 0.1)');
			expect(result).toEqual('oklch(0.5 0.1)');
		});

		it('should skip oklch with nan values', () => {
			const result = convertOklch('oklch(abc def ghi)');
			expect(result).toEqual('oklch(abc def ghi)');
		});

		it('should produce same result as direct oklchtohex call', () => {
			const direct = oklchToHex(0.5, 0.1, 180);
			const converted = convertOklch('oklch(0.5 0.1 180)');
			expect(converted).toEqual(direct);
		});
	});

	describe('oklchtohex', () => {
		it('should convert black (l=0) to #000000', () => {
			expect(oklchToHex(0, 0, 0)).toEqual('#000000');
		});

		it('should convert white (l=1, c=0) to #ffffff', () => {
			expect(oklchToHex(1, 0, 0)).toEqual('#ffffff');
		});

		it('should return 8-char hex when alpha < 1', () => {
			const result = oklchToHex(0.5, 0.1, 180, 0.5);
			expect(result).toMatch(/^#[0-9a-f]{8}$/);
		});

		it('should return 6-char hex when alpha is 1', () => {
			const result = oklchToHex(0.5, 0.1, 180, 1);
			expect(result).toMatch(/^#[0-9a-f]{6}$/);
		});

		it('should return 6-char hex when alpha is undefined', () => {
			const result = oklchToHex(0.5, 0.1, 180);
			expect(result).toMatch(/^#[0-9a-f]{6}$/);
		});

		it('should clamp out-of-range rgb values', () => {
			const result = oklchToHex(0.9, 0.5, 30);
			expect(result).toMatch(/^#[0-9a-f]{6}$/);
		});

		it('should convert a known color (approx red-500 oklch)', () => {
			const result = oklchToHex(0.637, 0.237, 25.331);
			expect(result).toMatch(/^#[0-9a-f]{6}$/);
			const r = parseInt(result.slice(1, 3), 16);
			expect(r).toBeGreaterThan(200);
		});

		it('should handle zero chroma (achromatic)', () => {
			const result = oklchToHex(0.5, 0, 0);
			expect(result).toMatch(/^#[0-9a-f]{6}$/);
			const r = result.slice(1, 3);
			const g = result.slice(3, 5);
			const b = result.slice(5, 7);
			expect(r).toEqual(g);
			expect(g).toEqual(b);
		});
	});
});
