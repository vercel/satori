import { it, describe, expect } from 'vitest';

import { initFonts, toImage } from './utils.js';
import satori from '../src/index.js';

import { detectLanguageCode } from '../src/language.js';

let fonts;
initFonts(f => (fonts = f));

describe('detectLanguageCode', () => {
	it('should detect emoji', async () => {
		expect(detectLanguageCode('🔺')).toEqual(['emoji']);
		expect(detectLanguageCode('😀')).toEqual(['emoji']);
		expect(detectLanguageCode('㊗️')).toEqual(['emoji']);
		expect(detectLanguageCode('🧑🏻‍💻')).toEqual(['emoji']);
		expect(detectLanguageCode('hello 🌍')).toEqual(['emoji']);
		expect(detectLanguageCode('👋 vs 🌊')).toEqual(['emoji']);
	});

	it('should detect japanese(hiragana)', async () => {
		expect(detectLanguageCode('こんにちは')).toEqual(['ja-JP']);
	});

	it('should detect japanese(katakana)', async () => {
		expect(detectLanguageCode('ハナミズキ')).toEqual(['ja-JP']);
	});

	it('should detect japanese（kanji)', async () => {
		expect(detectLanguageCode('桜')).toEqual([
			'ja-JP',
			'zh-CN',
			'zh-TW',
			'zh-HK'
		]);
	});

	it('should detect japanese(hiragana) when locale is zh', async () => {
		expect(detectLanguageCode('こんにちは')).toEqual(['ja-JP']);
	});

	it('should detect japanese(katakana) when locale is zh', async () => {
		expect(detectLanguageCode('ハナミズキ')).toEqual(['ja-JP']);
	});

	it('should detect simplified chinese when locale is zh-cn', async () => {
		expect(detectLanguageCode('我知道怎么说中文', 'zh-CN')).toEqual([
			'zh-CN',
			'ja-JP',
			'zh-TW',
			'zh-HK'
		]);
	});

	it('should detect traditional chinese(HK) when locale is zh-cn', async () => {
		expect(detectLanguageCode('我知道怎麼說中文', 'zh-HK')).toEqual([
			'zh-HK',
			'ja-JP',
			'zh-CN',
			'zh-TW'
		]);
	});

	it('should detect traditional chinese(TW) when locale is zh-tw', async () => {
		expect(detectLanguageCode('我知道怎麼說中文', 'zh-TW')).toEqual([
			'zh-TW',
			'ja-JP',
			'zh-CN',
			'zh-HK'
		]);
	});

	it('should detect korean', async () => {
		expect(detectLanguageCode('안녕하세요')).toEqual(['ko-KR']);
	});

	it('should detect thai', async () => {
		expect(detectLanguageCode('สวัสดี')).toEqual(['th-TH']);
	});

	it('should detect arabic', async () => {
		expect(detectLanguageCode('مرحبا')).toEqual(['ar-AR']);
	});

	it('should detect tamil', async () => {
		expect(detectLanguageCode('வணக்கம்')).toEqual(['ta-IN']);
	});

	it('should detect bengali', async () => {
		expect(detectLanguageCode('হ্যালো')).toEqual(['bn-IN']);
	});

	it('should detect malayalam', async () => {
		expect(detectLanguageCode('ഹായ്')).toEqual(['ml-IN']);
	});

	it('should detect hebrew', async () => {
		expect(detectLanguageCode('שלום')).toEqual(['he-IL']);
	});

	it('should detect telegu', async () => {
		expect(detectLanguageCode('హలో')).toEqual(['te-IN']);
	});

	it('should detect devanagari', async () => {
		expect(detectLanguageCode('नमस्ते')).toEqual(['devanagari']);
	});

	it('should detect unknown', async () => {
		expect(detectLanguageCode('wat')).toEqual(['unknown']);
	});

	it('should detect math', async () => {
		expect(detectLanguageCode('ℵ')).toEqual(['math']);
	});

	it('should detect symbol', async () => {
		expect(detectLanguageCode('☻')).toEqual(['symbol']);
	});

	it('should not crash when rendering Arabic letters', async () => {
		const svg = await satori(
			<div
				style={{
					width: '100%',
					height: '100%',
					background: 'white'
				}}
			>
				سلام
			</div>,
			{ width: 100, height: 100, fonts }
		);
		expect(toImage(svg, 100)).toMatchImageSnapshot();
	});
});
