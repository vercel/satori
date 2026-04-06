import type { Yoga } from 'yoga-layout/load';
import type { Node } from 'yoga-layout';

import type { InitInput } from './yoga.external';

export { Yoga as TYoga, Node as YogaNode, type InitInput };

const init = async (input: InitInput) => {
	if (process.env.SATORI_STANDALONE === '1') {
		const mod = await import('./yoga.external');
		return mod.init(input);
	} else {
		// Do nothing. It's bundled.
	}
};

const getYoga = async () => {
	if (process.env.SATORI_STANDALONE === '1') {
		const mod = await import('./yoga.external');
		return mod.getYoga();
	} else {
		const mod = await import('./yoga.bundled');
		return mod.getYoga();
	}
};

if (process.env.SATORI_STANDALONE !== '1') {
	// Preload Yoga in bundled mode.
	import('./yoga.bundled');
}

export { getYoga, init };
