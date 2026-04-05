const stringFromCode = (code: string): string => {
	code = code.replace('U+', '0x');

	return String.fromCodePoint(Number(code));
};

const Space = stringFromCode('U+0020');
const Tab = stringFromCode('U+0009');
const HorizontalEllipsis = stringFromCode('U+2026');

export { HorizontalEllipsis, Space, Tab, stringFromCode };
