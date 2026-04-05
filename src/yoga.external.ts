import { loadYoga as loadYogaUntyped, type Yoga } from 'yoga-layout/load';

type InitInput =
	| string
	| Request
	| URL
	| Response
	| BufferSource
	| Buffer
	| WebAssembly.Module
	| Promise<Response | BufferSource | Buffer | WebAssembly.Module>;

const loadYoga = loadYogaUntyped as (options: {
	wasmBinary?: ArrayBuffer | ArrayBufferLike;
	instantiateWasm?: (
		imports: WebAssembly.Imports,
		successCallback: (instance: WebAssembly.Instance) => void
	) => WebAssembly.Exports | false | undefined;
}) => Promise<Yoga>;

let resolveYoga: (yoga: Yoga) => void;
let rejectYoga: (error: unknown) => void;
const yogaPromise: Promise<Yoga> = new Promise((resolve, reject) => {
	resolveYoga = resolve;
	rejectYoga = reject;
});

const loadWasm = async (
	input: InitInput,
	imports: WebAssembly.Imports
): Promise<WebAssembly.WebAssemblyInstantiatedSource> => {
	let source: Response | BufferSource | Buffer | WebAssembly.Module;

	if (
		typeof input === 'string' ||
		(typeof Request === 'function' && input instanceof Request) ||
		(typeof URL === 'function' && input instanceof URL)
	) {
		source = await fetch(input);
	} else {
		source = await input;
	}

	if (typeof Response === 'function' && source instanceof Response) {
		if (typeof WebAssembly.instantiateStreaming === 'function') {
			try {
				return await WebAssembly.instantiateStreaming(source, imports);
			} catch (e) {
				if (source.headers.get('Content-Type') !== 'application/wasm') {
					console.warn(
						'`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n',
						e
					);
				}
			}
		}

		const bytes = await source.arrayBuffer();
		return await WebAssembly.instantiate(bytes, imports);
	}

	const instantiated = (await WebAssembly.instantiate(
		'buffer' in source
			? source.buffer.slice(
					source.byteOffset,
					source.byteOffset + source.byteLength
			  )
			: source,
		imports
	)) as WebAssembly.Instance | WebAssembly.WebAssemblyInstantiatedSource;

	if (instantiated instanceof WebAssembly.Instance) {
		return { instance: instantiated, module: source as WebAssembly.Module };
	}

	return instantiated;
};

const init = (input: InitInput) => {
	(async () => {
		const yoga = await loadYoga({
			instantiateWasm(imports, successCallback) {
				(async () => {
					const { instance } = await loadWasm(input, imports);
					successCallback(instance);
				})().catch(rejectYoga);

				return {};
			}
		});
		resolveYoga(yoga);
	})().catch(rejectYoga);
};

const getYoga = () => {
	return yogaPromise;
};

export type { InitInput };
export { getYoga, init };
