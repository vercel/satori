/**
 * This module is used to calculate the layout of the current sub-tree.
 */

import type { ReactNode } from 'react';

import {
	isReactElement,
	isClass,
	buildXMLString,
	normalizeChildren,
	hasDangerouslySetInnerHTMLProp,
	isReactComponent,
	isForwardRefComponent
} from './utils.js';
import { getYoga, YogaNode } from './yoga.js';
import { SVGNodeToImage } from './handler/preprocess.js';
import buildTextNodes from './text/index.js';
import computeStyle from './handler/compute.js';
import FontLoader from './font.js';
import rect from './builder/rect.js';
import { buildBackdropFilter } from './builder/backdrop-filter.js';
import { Locale, normalizeLocale } from './language.js';
import { SerializedStyle } from './handler/expand.js';

type BackdropFilterInfo = {
	filter: string;
	inheritedStyle: SerializedStyle;
	node: YogaNode;
	style: SerializedStyle;
};

type LayoutContext = {
	id: string;
	parentStyle: SerializedStyle;
	inheritedStyle: SerializedStyle;
	isInheritingTransform?: boolean;
	parent: YogaNode;
	font: FontLoader;
	embedFont: boolean;
	debug?: boolean;
	graphemeImages?: Record<string, string>;
	canLoadMissingFonts: boolean;
	locale?: Locale;
	onBackdropFilterDetected?: (info: BackdropFilterInfo) => void;
	onNodeDetected?: (node: SatoriNode) => void;
};

type SatoriNode = {
	// Layout information.
	height: number;
	key?: string | number;
	left: number;
	props: Record<string, any>;
	textContent?: string;
	top: number;
	type: string;
	width: number;
};

const layout = async function* (
	element: ReactNode,
	context: LayoutContext
): AsyncGenerator<
	{ word: string; locale?: string }[],
	string,
	[number, number]
> {
	const Yoga = await getYoga();
	const {
		id,
		inheritedStyle,
		parent,
		font,
		debug,
		locale,
		embedFont = true,
		graphemeImages,
		canLoadMissingFonts
	} = context;

	// 1. Pre-process the node.
	if (element === null || typeof element === 'undefined') {
		yield;
		yield;
		return '';
	}

	// Not a regular element.
	if (!isReactElement(element) || isReactComponent(element.type)) {
		let iter: ReturnType<typeof layout>;

		if (!isReactElement(element)) {
			// Process as text node.
			iter = buildTextNodes(String(element), context);
			yield (await iter.next()).value as {
				word: string;
				locale?: Locale;
			}[];
		} else {
			if (isClass(element.type as Function)) {
				throw new Error('Class component is not supported.');
			}

			let render: Function;

			// This is a hack to support React.forwardRef wrapped components.
			// https://github.com/vercel/satori/issues/600
			if (isForwardRefComponent(element.type)) {
				render = (element.type as any).render;
			} else {
				render = element.type as Function;
			}

			// If it's a custom component, Satori strictly requires it to be pure,
			// stateless, and not relying on any React APIs such as hooks or suspense.
			// So we can safely evaluate it to render. Otherwise, an error will be
			// thrown by React.
			iter = layout(await render(element.props), context);
			yield (await iter.next()).value as {
				word: string;
				locale?: string;
			}[];
		}

		await iter.next();
		const offset = yield;
		return (await iter.next(offset)).value as string;
	}

	// Process as element.
	const { type: $type, props } = element;
	// type must be a string here.
	const type = $type as string;

	if (props && hasDangerouslySetInnerHTMLProp(props)) {
		throw new Error(
			'dangerouslySetInnerHTML property is not supported. See documentation for more information https://github.com/vercel/satori#jsx.'
		);
	}
	let { style, children, lang: _newLocale = locale } = props || {};
	const newLocale = normalizeLocale(_newLocale);

	const node = Yoga.Node.create();
	parent.insertChild(node, parent.getChildCount());

	const [computedStyle, newInheritableStyle] = await computeStyle(
		node,
		type,
		inheritedStyle,
		style,
		props
	);
	// Post-process styles to attach inheritable properties for Satori.

	// If the element is inheriting the parent `transform`, or applying its own.
	// This affects the coordinate system.
	const isInheritingTransform =
		computedStyle.transform === inheritedStyle.transform;
	if (!isInheritingTransform) {
		(computedStyle.transform as any).__parent = inheritedStyle.transform;
	}

	// If the element has `overflow` set to `hidden` or clip-path is set, we need to create a clip
	// path and use it in all its children.
	if (
		computedStyle.overflow === 'hidden' ||
		(computedStyle.clipPath && computedStyle.clipPath !== 'none')
	) {
		newInheritableStyle._inheritedClipPathId = `satori_cp-${id}`;
		newInheritableStyle._inheritedMaskId = `satori_om-${id}`;
	}

	if (computedStyle.maskImage) {
		newInheritableStyle._inheritedMaskId = `satori_mi-${id}`;
	}

	// Register backdrop-filter with parent so it can inject the effect.
	if (computedStyle.backdropFilter && context.onBackdropFilterDetected) {
		context.onBackdropFilterDetected({
			filter: computedStyle.backdropFilter as string,
			inheritedStyle: newInheritableStyle,
			node,
			style: computedStyle
		});
	}

	// If the element has `background-clip: text` set, we need to create a clip
	// path and use it in all its children.
	if (computedStyle.backgroundClip === 'text') {
		const mutateRefValue = { value: '' } as any;
		newInheritableStyle._inheritedBackgroundClipTextPath = mutateRefValue;
		computedStyle._inheritedBackgroundClipTextPath = mutateRefValue;

		if (computedStyle.backgroundImage) {
			newInheritableStyle._inheritedBackgroundClipTextHasBackground =
				'true';
			computedStyle._inheritedBackgroundClipTextHasBackground = 'true';
		}
	}

	// 2. Do layout recursively for its children.
	const normalizedChildren = normalizeChildren(children);
	const iterators: ReturnType<typeof layout>[] = [];
	const backdropInfoByIndex: Record<number, BackdropFilterInfo> = {};

	let i = 0;
	const segmentsMissingFont: { word: string; locale?: string }[] = [];
	for (const child of normalizedChildren) {
		const currentIndex = i;
		const iter = layout(child, {
			id: id + '-' + i++,
			parentStyle: computedStyle,
			inheritedStyle: newInheritableStyle,
			isInheritingTransform: true,
			parent: node,
			font,
			embedFont,
			debug,
			graphemeImages,
			canLoadMissingFonts,
			locale: newLocale,
			onNodeDetected: context.onNodeDetected,
			onBackdropFilterDetected: (info: BackdropFilterInfo) => {
				backdropInfoByIndex[currentIndex] = info;
			}
		});
		if (canLoadMissingFonts) {
			segmentsMissingFont.push(
				...(((await iter.next()).value as any) || [])
			);
		} else {
			await iter.next();
		}
		iterators.push(iter);
	}
	yield segmentsMissingFont;
	for (const iter of iterators) {
		await iter.next();
	}

	// 3. Post-process the node.
	const [x, y] = yield;
	let { left, top, width, height } = node.getComputedLayout();
	// Attach offset to the current node.
	left += x;
	top += y;

	let childrenRenderResult = '';
	let baseRenderResult = '';
	let depsRenderResult = '';

	// Emit event for the current node. We don't pass the children prop to the
	// event handler because everything is already flattened, unless it's a text
	// node.
	const { children: childrenNode, ...restProps } = props;
	context.onNodeDetected?.({
		height,
		key: element.key,
		left,
		props: restProps,
		textContent: isReactElement(childrenNode) ? undefined : childrenNode,
		top,
		type,
		width
	});

	// Generate the rendered markup for the current node.
	if (type === 'img') {
		const src = computedStyle.__src as string;
		baseRenderResult = await rect(
			{
				debug,
				height,
				id,
				isInheritingTransform,
				left,
				src,
				top,
				width
			},
			computedStyle,
			newInheritableStyle
		);
	} else if (type === 'svg') {
		// When entering a <svg> node, we need to convert it to a <img> with the
		// SVG data URL embedded.
		const currentColor = computedStyle.color;
		const src = await SVGNodeToImage(element, currentColor);
		baseRenderResult = await rect(
			{
				debug,
				height,
				id,
				isInheritingTransform,
				left,
				src,
				top,
				width
			},
			computedStyle,
			newInheritableStyle
		);
	} else {
		const display = style?.display;
		if (
			type === 'div' &&
			children &&
			typeof children !== 'string' &&
			display !== 'flex' &&
			display !== 'none' &&
			display !== 'contents'
		) {
			throw new Error(
				`Expected <div> to have explicit "display: flex", "display: contents", or "display: none" if it has more than one child node.`
			);
		}
		baseRenderResult = await rect(
			{ debug, height, id, isInheritingTransform, left, top, width },
			computedStyle,
			newInheritableStyle
		);
	}

	// Generate the rendered markup for the children.
	for (let j = 0; j < iterators.length; j++) {
		// If this child has backdrop-filter, wrap all prior content in a <g> and
		// insert a <use> with the SVG filter + clip before the child.
		if (backdropInfoByIndex[j]) {
			const info = backdropInfoByIndex[j];
			const childLayout = info.node.getComputedLayout();
			const childLeft = left + childLayout.left;
			const childTop = top + childLayout.top;
			const childWidth = childLayout.width;
			const childHeight = childLayout.height;

			const bgGroupId = `satori_bfbg-${id}-${j}`;
			const currentContent = baseRenderResult + childrenRenderResult;
			baseRenderResult = `<g id="${bgGroupId}">${currentContent}</g>`;
			childrenRenderResult = '';

			// Forward-reference the child's mask (generated by the child later).
			const childId = id + '-' + j;
			const maskId = info.style.maskImage
				? `satori_mi-${childId}`
				: undefined;

			childrenRenderResult += buildBackdropFilter({
				bgGroupId,
				filterValue: info.filter,
				height: childHeight,
				id: childId,
				left: childLeft,
				maskId,
				style: info.style as Record<string, any>,
				top: childTop,
				width: childWidth
			});
		}

		childrenRenderResult += (await iterators[j].next([left, top])).value;
	}

	// An extra pass to generate the special background-clip shape collected from
	// children.
	if (computedStyle._inheritedBackgroundClipTextPath) {
		depsRenderResult += buildXMLString(
			'clipPath',
			{
				id: `satori_bct-${id}`,
				'clip-path': computedStyle._inheritedClipPathId
					? `url(#${computedStyle._inheritedClipPathId})`
					: undefined
			},
			(computedStyle._inheritedBackgroundClipTextPath as any).value
		);
	}

	const cssFilter = computedStyle.filter as string | undefined;
	if (cssFilter && cssFilter !== 'none') {
		const innerContent = baseRenderResult + childrenRenderResult;
		baseRenderResult = `<g style="filter:${cssFilter}">${innerContent}</g>`;
		childrenRenderResult = '';
	}

	return depsRenderResult + baseRenderResult + childrenRenderResult;
};

export type { BackdropFilterInfo, LayoutContext, SatoriNode };
export default layout;
