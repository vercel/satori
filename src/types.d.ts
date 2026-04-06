declare module '@shuding/opentype' {
	export = opentype;
}

declare module 'css-to-react-native' {
	type StyleTuple = [string, string];
	type Style = Record<string, string | number>;
	type TransformStyle = {
		transform: Record<string, string | number>[];
	};

	function getPropertyName(name: string): string;
	function getStylesForProperty(
		name: 'transform',
		value: string,
		allowShorthand?: boolean
	): TransformStyle;
	function getStylesForProperty(
		name: string,
		value: string,
		allowShorthand?: boolean
	): Style;
	function transform(
		styleTuples: StyleTuple[],
		shorthandBlacklist?: string[]
	): Style;

	export {
		Style,
		StyleTuple,
		TransformStyle,
		getPropertyName,
		getStylesForProperty
	};
	export default transform;
}
