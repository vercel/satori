//#region src/diplomat-wasm.ts
/** Read a UTF-8 string from WASM memory. Inlined from diplomat-runtime. */
function readString8$1(wasm, ptr, len) {
	const buf = new Uint8Array(wasm.memory.buffer, ptr, len);
	return new TextDecoder("utf-8").decode(buf);
}
/** WASM instance exports, set after init(). */
let realWasm = null;
const imports = { env: {
	diplomat_console_debug_js(ptr, len) {
		console.debug(readString8$1(wasm, ptr, len));
	},
	diplomat_console_error_js(ptr, len) {
		console.error(readString8$1(wasm, ptr, len));
	},
	diplomat_console_info_js(ptr, len) {
		console.info(readString8$1(wasm, ptr, len));
	},
	diplomat_console_log_js(ptr, len) {
		console.log(readString8$1(wasm, ptr, len));
	},
	diplomat_console_warn_js(ptr, len) {
		console.warn(readString8$1(wasm, ptr, len));
	},
	diplomat_throw_error_js(ptr, len) {
		throw new Error(readString8$1(wasm, ptr, len));
	}
} };
/**
* Load ICU4X WASM from user-provided input.
* Accepts the same input types as satori's yoga init().
*/
async function initWasm(input) {
	if (realWasm) return;
	let source;
	if (typeof input === "string" || typeof Request === "function" && input instanceof Request || typeof URL === "function" && input instanceof URL) source = await fetch(input);
	else source = await input;
	let instance;
	if (typeof Response === "function" && source instanceof Response) {
		if (typeof WebAssembly.instantiateStreaming === "function") try {
			instance = (await WebAssembly.instantiateStreaming(source, imports)).instance;
		} catch (e) {
			if (source.headers.get("Content-Type") !== "application/wasm") console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
			else throw e;
		}
		if (!instance) {
			const bytes = await source.arrayBuffer();
			instance = (await WebAssembly.instantiate(bytes, imports)).instance;
		}
	} else {
		const instantiated = await WebAssembly.instantiate("buffer" in source ? source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength) : source, imports);
		instance = instantiated instanceof WebAssembly.Instance ? instantiated : instantiated.instance;
	}
	realWasm = instance.exports;
	realWasm.diplomat_init();
}
const wasm = new Proxy({}, { get(_target, prop) {
	if (typeof prop !== "string" || prop === "then") return void 0;
	if (!realWasm) throw new Error(`icu4satori: WASM not initialized. Call init() before using ICU4X APIs. (accessed: ${prop})`);
	return realWasm[prop];
} });
//#endregion
//#region vendor/diplomat-runtime.mjs
/** For internal Diplomat use when constructing opaques or out structs.
* This is for when we're handling items that we don't want the user to touch, like an structure that's only meant to be output, or de-referencing a pointer we're handed from WASM.
*/
const internalConstructor = Symbol("constructor");
function readString8(wasm, ptr, len) {
	const buf = new Uint8Array(wasm.memory.buffer, ptr, len);
	return new TextDecoder("utf-8").decode(buf);
}
/**
* Get the pointer returned by an FFI function.
*
* It's tempting to call `(new Uint32Array(wasm.memory.buffer, FFI_func(), 1))[0]`.
* However, there's a chance that `wasm.memory.buffer` will be resized between
* the time it's accessed and the time it's used, invalidating the view.
* This function ensures that the view into wasm memory is fresh.
*
* This is used for methods that return multiple types into a wasm buffer, where
* one of those types is another ptr. Call this method to get access to the returned
* ptr, so the return buffer can be freed.
* @param {WebAssembly.Exports} wasm Provided by diplomat generated files.
* @param {number} ptr Pointer of a pointer, to be read.
* @returns {number} The underlying pointer.
*/
function ptrRead(wasm, ptr) {
	return new Uint32Array(wasm.memory.buffer, ptr, 1)[0];
}
/**
* Get the flag of a result type.
*/
function resultFlag(wasm, ptr, offset) {
	return new Uint8Array(wasm.memory.buffer, ptr + offset, 1)[0];
}
/**
* Get the discriminant of a Rust enum.
*/
function enumDiscriminant(wasm, ptr) {
	return new Int32Array(wasm.memory.buffer, ptr, 1)[0];
}
/**
* Write a value of width `width` to a an ArrayBuffer `arrayBuffer`
* at byte offset `offset`, treating it as a buffer of kind `typedArrayKind`
* (which is a `TypedArray` variant like `Uint8Array` or `Int16Array`)
*/
function writeToArrayBuffer(arrayBuffer, offset, value, typedArrayKind) {
	let buffer = new typedArrayKind(arrayBuffer, offset);
	buffer[0] = value;
}
/**
* Take `jsValue` and write it to arrayBuffer at offset `offset` if it is non-null
* calling `writeToArrayBufferCallback(arrayBuffer, offset, jsValue)` to write to the buffer,
* also writing a tag bit.
*
* `size` and `align` are the size and alignment of T, not of Option<T>
*/
function writeOptionToArrayBuffer(arrayBuffer, offset, jsValue, size, align, writeToArrayBufferCallback) {
	if (jsValue != null) {
		writeToArrayBufferCallback(arrayBuffer, offset, jsValue);
		writeToArrayBuffer(arrayBuffer, offset + size, 1, Uint8Array);
	}
}
/**
* Given `ptr` in Wasm memory, treat it as an Option<T> with size for type T,
* and return the converted T (converted using `readCallback(wasm, ptr)`) if the Option is Some
* else None.
*/
function readOption(wasm, ptr, size, readCallback) {
	if (resultFlag(wasm, ptr, size)) return readCallback(wasm, ptr);
	else return null;
}
/**
* A wrapper around a slice of WASM memory that can be freed manually or
* automatically by the garbage collector.
*
* This type is necessary for Rust functions that take a `&str` or `&[T]`, since
* they can create an edge to this object if they borrow from the str/slice,
* or we can manually free the WASM memory if they don't.
*/
var DiplomatBuf = class DiplomatBuf {
	static str8 = (wasm, string) => {
		var utf8Length = 0;
		for (const codepointString of string) {
			let codepoint = codepointString.codePointAt(0);
			if (codepoint < 128) utf8Length += 1;
			else if (codepoint < 2048) utf8Length += 2;
			else if (codepoint < 65536) utf8Length += 3;
			else utf8Length += 4;
		}
		const ptr = wasm.diplomat_alloc(utf8Length, 1);
		const result = new TextEncoder().encodeInto(string, new Uint8Array(wasm.memory.buffer, ptr, utf8Length));
		console.assert(string.length === result.read && utf8Length === result.written, "UTF-8 write error");
		return new DiplomatBuf(ptr, utf8Length, () => wasm.diplomat_free(ptr, utf8Length, 1));
	};
	static str16 = (wasm, string) => {
		const byteLength = string.length * 2;
		const ptr = wasm.diplomat_alloc(byteLength, 2);
		const destination = new Uint16Array(wasm.memory.buffer, ptr, string.length);
		for (let i = 0; i < string.length; i++) destination[i] = string.charCodeAt(i);
		return new DiplomatBuf(ptr, string.length, () => wasm.diplomat_free(ptr, byteLength, 2));
	};
	static sliceWrapper = (wasm, buf) => {
		const ptr = wasm.diplomat_alloc(8, 4);
		let dst = new Uint32Array(wasm.memory.buffer, ptr, 2);
		dst[0] = buf.ptr;
		dst[1] = buf.size;
		return new DiplomatBuf(ptr, 8, () => {
			wasm.diplomat_free(ptr, 8, 4);
			buf.free();
		});
	};
	static slice = (wasm, list, rustType) => {
		const elementSize = rustType === "u8" || rustType === "i8" || rustType === "boolean" ? 1 : rustType === "u16" || rustType === "i16" ? 2 : rustType === "u64" || rustType === "i64" || rustType === "f64" ? 8 : 4;
		const byteLength = list.length * elementSize;
		const ptr = wasm.diplomat_alloc(byteLength, elementSize);
		(rustType === "u8" || rustType === "boolean" ? new Uint8Array(wasm.memory.buffer, ptr, byteLength) : rustType === "i8" ? new Int8Array(wasm.memory.buffer, ptr, byteLength) : rustType === "u16" ? new Uint16Array(wasm.memory.buffer, ptr, byteLength) : rustType === "i16" ? new Int16Array(wasm.memory.buffer, ptr, byteLength) : rustType === "i32" ? new Int32Array(wasm.memory.buffer, ptr, byteLength) : rustType === "u64" ? new BigUint64Array(wasm.memory.buffer, ptr, byteLength) : rustType === "i64" ? new BigInt64Array(wasm.memory.buffer, ptr, byteLength) : rustType === "f32" ? new Float32Array(wasm.memory.buffer, ptr, byteLength) : rustType === "f64" ? new Float64Array(wasm.memory.buffer, ptr, byteLength) : new Uint32Array(wasm.memory.buffer, ptr, byteLength)).set(list);
		return new DiplomatBuf(ptr, list.length, () => wasm.diplomat_free(ptr, byteLength, elementSize));
	};
	static strs = (wasm, strings, encoding) => {
		let encodeStr = encoding === "string16" ? DiplomatBuf.str16 : DiplomatBuf.str8;
		const byteLength = strings.length * 4 * 2;
		const ptr = wasm.diplomat_alloc(byteLength, 4);
		const destination = new Uint32Array(wasm.memory.buffer, ptr, byteLength);
		const stringsAlloc = [];
		for (let i = 0; i < strings.length; i++) {
			stringsAlloc.push(encodeStr(wasm, strings[i]));
			destination[2 * i] = stringsAlloc[i].ptr;
			destination[2 * i + 1] = stringsAlloc[i].size;
		}
		return new DiplomatBuf(ptr, strings.length, () => {
			wasm.diplomat_free(ptr, byteLength, 4);
			for (let i = 0; i < stringsAlloc.length; i++) stringsAlloc[i].free();
		});
	};
	static struct = (wasm, size, align) => {
		const ptr = wasm.diplomat_alloc(size, align);
		return new DiplomatBuf(ptr, size, () => {
			wasm.diplomat_free(ptr, size, align);
		});
	};
	/**
	* Generated code calls one of methods these for each allocation, to either
	* free directly after the FFI call, to leak (to create a &'static), or to
	* register the buffer with the garbage collector (to create a &'a).
	*/
	free;
	constructor(ptr, size, free) {
		this.ptr = ptr;
		this.size = size;
		this.free = free;
		this.leak = () => {};
		this.releaseToGarbageCollector = () => DiplomatBufferFinalizer.register(this, () => this.free());
	}
	splat() {
		return [this.ptr, this.size];
	}
	/**
	* Write the (ptr, len) pair to an array buffer at byte offset `offset`
	*/
	writePtrLenToArrayBuffer(arrayBuffer, offset) {
		writeToArrayBuffer(arrayBuffer, offset, this.ptr, Uint32Array);
		writeToArrayBuffer(arrayBuffer, offset + 4, this.size, Uint32Array);
	}
};
/**
* Helper class for creating and managing `diplomat_buffer_write`.
* Meant to minimize direct calls to `wasm`.
*/
var DiplomatWriteBuf = class {
	leak;
	#wasm;
	#buffer;
	constructor(wasm) {
		this.#wasm = wasm;
		this.#buffer = this.#wasm.diplomat_buffer_write_create(0);
		this.leak = () => {};
	}
	free() {
		this.#wasm.diplomat_buffer_write_destroy(this.#buffer);
	}
	releaseToGarbageCollector() {
		DiplomatBufferFinalizer.register(this, () => this.free());
	}
	readString8() {
		return readString8(this.#wasm, this.ptr, this.size);
	}
	get buffer() {
		return this.#buffer;
	}
	get ptr() {
		return this.#wasm.diplomat_buffer_write_get_bytes(this.#buffer);
	}
	get size() {
		return this.#wasm.diplomat_buffer_write_len(this.#buffer);
	}
};
/**
* Represents an underlying slice that we've grabbed from WebAssembly.
* You can treat this in JS as a regular slice of primitives, but it handles additional data for you behind the scenes.
*/
var DiplomatSlice = class {
	#wasm;
	#bufferType;
	get bufferType() {
		return this.#bufferType;
	}
	#buffer;
	get buffer() {
		return this.#buffer;
	}
	#lifetimeEdges;
	constructor(wasm, buffer, bufferType, lifetimeEdges) {
		this.#wasm = wasm;
		const [ptr, size] = new Uint32Array(this.#wasm.memory.buffer, buffer, 2);
		this.#buffer = new bufferType(this.#wasm.memory.buffer, ptr, size);
		this.#bufferType = bufferType;
		this.#lifetimeEdges = lifetimeEdges;
	}
	getValue() {
		return this.#buffer;
	}
	[Symbol.toPrimitive]() {
		return this.getValue();
	}
	valueOf() {
		return this.getValue();
	}
};
var DiplomatSliceStr = class extends DiplomatSlice {
	#decoder;
	constructor(wasm, buffer, stringEncoding, lifetimeEdges) {
		let encoding;
		switch (stringEncoding) {
			case "string8":
				encoding = Uint8Array;
				break;
			case "string16":
				encoding = Uint16Array;
				break;
			default:
				console.error("Unrecognized stringEncoding ", stringEncoding);
				break;
		}
		super(wasm, buffer, encoding, lifetimeEdges);
		if (stringEncoding === "string8") this.#decoder = new TextDecoder("utf-8");
	}
	getValue() {
		switch (this.bufferType) {
			case Uint8Array: return this.#decoder.decode(super.getValue());
			case Uint16Array: return String.fromCharCode.apply(null, super.getValue());
			default: return null;
		}
	}
	toString() {
		return this.getValue();
	}
};
/**
* A number of Rust functions in WebAssembly require a buffer to populate struct, slice, Option<> or Result<> types with information.
* {@link DiplomatReceiveBuf} allocates a buffer in WebAssembly, which can then be passed into functions with the {@link DiplomatReceiveBuf.buffer}
* property.
*/
var DiplomatReceiveBuf = class {
	#wasm;
	#size;
	#align;
	#hasResult;
	#buffer;
	constructor(wasm, size, align, hasResult) {
		this.#wasm = wasm;
		this.#size = size;
		this.#align = align;
		this.#hasResult = hasResult;
		this.#buffer = this.#wasm.diplomat_alloc(this.#size, this.#align);
		this.leak = () => {};
	}
	free() {
		this.#wasm.diplomat_free(this.#buffer, this.#size, this.#align);
	}
	get buffer() {
		return this.#buffer;
	}
	/**
	* Only for when a DiplomatReceiveBuf is allocating a buffer for an `Option<>` or a `Result<>` type.
	*
	* This just checks the last byte for a successful result (assuming that Rust's compiler does not change).
	*/
	get resultFlag() {
		if (this.#hasResult) return resultFlag(this.#wasm, this.#buffer, this.#size - 1);
		else return true;
	}
};
/**
* For preallocating owned slices
*
* Doesn't actually do anything, but helps code readability of generated code
*/
var OwnedSliceLeaker = class {
	constructor() {}
	/**
	* Leak an item
	* @param {DiplomatBuf} item
	* @returns {DiplomatBuf}
	*/
	static alloc(item) {
		item.leak();
		return item;
	}
};
/**
* For cleaning up slices inside struct _intoFFI functions.
* Based somewhat on how the Dart backend handles slice cleanup.
*
* We want to ensure a slice only lasts as long as its struct, so we have a `functionCleanupArena` CleanupArena that we use in each method for any slice that needs to be cleaned up. It lasts only as long as the function is called for.
*
* Then we have `createWith`, which is meant for longer lasting slices. It takes an array of edges and will last as long as those edges do. Cleanup is only called later.
*/
var CleanupArena = class CleanupArena {
	#items = [];
	constructor() {}
	/**
	* When this arena is freed, call .free() on the given item.
	* @param {DiplomatBuf} item
	* @returns {DiplomatBuf}
	*/
	alloc(item) {
		this.#items.push(item);
		return item;
	}
	/**
	* Create a new CleanupArena, append it to any edge arrays passed down, and return it.
	* @param {Array} edgeArrays
	* @returns {CleanupArena}
	*/
	static createWith(...edgeArrays) {
		let self = new CleanupArena();
		for (let edgeArray of edgeArrays) if (edgeArray != null) edgeArray.push(self);
		DiplomatBufferFinalizer.register(self, () => self.free());
		return self;
	}
	/**
	* If given edge arrays, create a new CleanupArena, append it to any edge arrays passed down, and return it.
	* Else return the function-local cleanup arena
	* @param {CleanupArena} functionCleanupArena
	* @param {Array} edgeArrays
	* @returns {DiplomatBuf}
	*/
	static maybeCreateWith(functionCleanupArena, ...edgeArrays) {
		if (edgeArrays.length > 0) return CleanupArena.createWith(...edgeArrays);
		else return functionCleanupArena;
	}
	free() {
		this.#items.forEach((i) => {
			i.free();
		});
		this.#items.length = 0;
	}
};
/**
* Similar to {@link CleanupArena}, but for holding on to slices until a method is called,
* after which we rely on the GC to free them.
*
* This is when you may want to use a slice longer than the body of the method.
*
* At first glance this seems unnecessary, since we will be holding these slices in edge arrays anyway,
* however, if an edge array ends up unused, then we do actually need something to hold it for the duration
* of the method call.
*/
var GarbageCollectorGrip = class {
	#items = [];
	alloc(item) {
		this.#items.push(item);
		return item;
	}
	releaseToGarbageCollector() {
		this.#items.forEach((i) => {
			i.releaseToGarbageCollector();
		});
		this.#items.length = 0;
	}
};
const DiplomatBufferFinalizer = new FinalizationRegistry((free) => free());
(class LeadingAdjustment {
	#value = void 0;
	static #values = new Map([
		["Auto", 0],
		["None", 1],
		["ToCased", 2]
	]);
	static getAllEntries() {
		return LeadingAdjustment.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return LeadingAdjustment.#objectValues[arguments[1]];
		}
		if (value instanceof LeadingAdjustment) return value;
		let intVal = LeadingAdjustment.#values.get(value);
		if (intVal != null) return LeadingAdjustment.#objectValues[intVal];
		throw TypeError(value + " is not a LeadingAdjustment and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new LeadingAdjustment(value);
	}
	get value() {
		return [...LeadingAdjustment.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new LeadingAdjustment(internalConstructor, internalConstructor, 0),
		new LeadingAdjustment(internalConstructor, internalConstructor, 1),
		new LeadingAdjustment(internalConstructor, internalConstructor, 2)
	];
	static Auto = LeadingAdjustment.#objectValues[0];
	static None = LeadingAdjustment.#objectValues[1];
	static ToCased = LeadingAdjustment.#objectValues[2];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class TrailingCase {
	#value = void 0;
	static #values = new Map([["Lower", 0], ["Unchanged", 1]]);
	static getAllEntries() {
		return TrailingCase.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return TrailingCase.#objectValues[arguments[1]];
		}
		if (value instanceof TrailingCase) return value;
		let intVal = TrailingCase.#values.get(value);
		if (intVal != null) return TrailingCase.#objectValues[intVal];
		throw TypeError(value + " is not a TrailingCase and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new TrailingCase(value);
	}
	get value() {
		return [...TrailingCase.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [new TrailingCase(internalConstructor, internalConstructor, 0), new TrailingCase(internalConstructor, internalConstructor, 1)];
	static Lower = TrailingCase.#objectValues[0];
	static Unchanged = TrailingCase.#objectValues[1];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class CollatorAlternateHandling {
	#value = void 0;
	static #values = new Map([["NonIgnorable", 0], ["Shifted", 1]]);
	static getAllEntries() {
		return CollatorAlternateHandling.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return CollatorAlternateHandling.#objectValues[arguments[1]];
		}
		if (value instanceof CollatorAlternateHandling) return value;
		let intVal = CollatorAlternateHandling.#values.get(value);
		if (intVal != null) return CollatorAlternateHandling.#objectValues[intVal];
		throw TypeError(value + " is not a CollatorAlternateHandling and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new CollatorAlternateHandling(value);
	}
	get value() {
		return [...CollatorAlternateHandling.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [new CollatorAlternateHandling(internalConstructor, internalConstructor, 0), new CollatorAlternateHandling(internalConstructor, internalConstructor, 1)];
	static NonIgnorable = CollatorAlternateHandling.#objectValues[0];
	static Shifted = CollatorAlternateHandling.#objectValues[1];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class CollatorCaseLevel {
	#value = void 0;
	static #values = new Map([["Off", 0], ["On", 1]]);
	static getAllEntries() {
		return CollatorCaseLevel.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return CollatorCaseLevel.#objectValues[arguments[1]];
		}
		if (value instanceof CollatorCaseLevel) return value;
		let intVal = CollatorCaseLevel.#values.get(value);
		if (intVal != null) return CollatorCaseLevel.#objectValues[intVal];
		throw TypeError(value + " is not a CollatorCaseLevel and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new CollatorCaseLevel(value);
	}
	get value() {
		return [...CollatorCaseLevel.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [new CollatorCaseLevel(internalConstructor, internalConstructor, 0), new CollatorCaseLevel(internalConstructor, internalConstructor, 1)];
	static Off = CollatorCaseLevel.#objectValues[0];
	static On = CollatorCaseLevel.#objectValues[1];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class CollatorMaxVariable {
	#value = void 0;
	static #values = new Map([
		["Space", 0],
		["Punctuation", 1],
		["Symbol", 2],
		["Currency", 3]
	]);
	static getAllEntries() {
		return CollatorMaxVariable.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return CollatorMaxVariable.#objectValues[arguments[1]];
		}
		if (value instanceof CollatorMaxVariable) return value;
		let intVal = CollatorMaxVariable.#values.get(value);
		if (intVal != null) return CollatorMaxVariable.#objectValues[intVal];
		throw TypeError(value + " is not a CollatorMaxVariable and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new CollatorMaxVariable(value);
	}
	get value() {
		return [...CollatorMaxVariable.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new CollatorMaxVariable(internalConstructor, internalConstructor, 0),
		new CollatorMaxVariable(internalConstructor, internalConstructor, 1),
		new CollatorMaxVariable(internalConstructor, internalConstructor, 2),
		new CollatorMaxVariable(internalConstructor, internalConstructor, 3)
	];
	static Space = CollatorMaxVariable.#objectValues[0];
	static Punctuation = CollatorMaxVariable.#objectValues[1];
	static Symbol = CollatorMaxVariable.#objectValues[2];
	static Currency = CollatorMaxVariable.#objectValues[3];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class CollatorStrength {
	#value = void 0;
	static #values = new Map([
		["Primary", 0],
		["Secondary", 1],
		["Tertiary", 2],
		["Quaternary", 3],
		["Identical", 4]
	]);
	static getAllEntries() {
		return CollatorStrength.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return CollatorStrength.#objectValues[arguments[1]];
		}
		if (value instanceof CollatorStrength) return value;
		let intVal = CollatorStrength.#values.get(value);
		if (intVal != null) return CollatorStrength.#objectValues[intVal];
		throw TypeError(value + " is not a CollatorStrength and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new CollatorStrength(value);
	}
	get value() {
		return [...CollatorStrength.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new CollatorStrength(internalConstructor, internalConstructor, 0),
		new CollatorStrength(internalConstructor, internalConstructor, 1),
		new CollatorStrength(internalConstructor, internalConstructor, 2),
		new CollatorStrength(internalConstructor, internalConstructor, 3),
		new CollatorStrength(internalConstructor, internalConstructor, 4)
	];
	static Primary = CollatorStrength.#objectValues[0];
	static Secondary = CollatorStrength.#objectValues[1];
	static Tertiary = CollatorStrength.#objectValues[2];
	static Quaternary = CollatorStrength.#objectValues[3];
	static Identical = CollatorStrength.#objectValues[4];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class DateMissingFieldsStrategy {
	#value = void 0;
	static #values = new Map([["Reject", 0], ["Ecma", 1]]);
	static getAllEntries() {
		return DateMissingFieldsStrategy.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return DateMissingFieldsStrategy.#objectValues[arguments[1]];
		}
		if (value instanceof DateMissingFieldsStrategy) return value;
		let intVal = DateMissingFieldsStrategy.#values.get(value);
		if (intVal != null) return DateMissingFieldsStrategy.#objectValues[intVal];
		throw TypeError(value + " is not a DateMissingFieldsStrategy and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new DateMissingFieldsStrategy(value);
	}
	get value() {
		return [...DateMissingFieldsStrategy.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [new DateMissingFieldsStrategy(internalConstructor, internalConstructor, 0), new DateMissingFieldsStrategy(internalConstructor, internalConstructor, 1)];
	static Reject = DateMissingFieldsStrategy.#objectValues[0];
	static Ecma = DateMissingFieldsStrategy.#objectValues[1];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class DateOverflow {
	#value = void 0;
	static #values = new Map([["Constrain", 0], ["Reject", 1]]);
	static getAllEntries() {
		return DateOverflow.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return DateOverflow.#objectValues[arguments[1]];
		}
		if (value instanceof DateOverflow) return value;
		let intVal = DateOverflow.#values.get(value);
		if (intVal != null) return DateOverflow.#objectValues[intVal];
		throw TypeError(value + " is not a DateOverflow and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new DateOverflow(value);
	}
	get value() {
		return [...DateOverflow.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [new DateOverflow(internalConstructor, internalConstructor, 0), new DateOverflow(internalConstructor, internalConstructor, 1)];
	static Constrain = DateOverflow.#objectValues[0];
	static Reject = DateOverflow.#objectValues[1];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class DisplayNamesFallback {
	#value = void 0;
	static #values = new Map([["Code", 0], ["None", 1]]);
	static getAllEntries() {
		return DisplayNamesFallback.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return DisplayNamesFallback.#objectValues[arguments[1]];
		}
		if (value instanceof DisplayNamesFallback) return value;
		let intVal = DisplayNamesFallback.#values.get(value);
		if (intVal != null) return DisplayNamesFallback.#objectValues[intVal];
		throw TypeError(value + " is not a DisplayNamesFallback and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new DisplayNamesFallback(value);
	}
	get value() {
		return [...DisplayNamesFallback.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [new DisplayNamesFallback(internalConstructor, internalConstructor, 0), new DisplayNamesFallback(internalConstructor, internalConstructor, 1)];
	static Code = DisplayNamesFallback.#objectValues[0];
	static None = DisplayNamesFallback.#objectValues[1];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class DisplayNamesStyle {
	#value = void 0;
	static #values = new Map([
		["Narrow", 0],
		["Short", 1],
		["Long", 2],
		["Menu", 3]
	]);
	static getAllEntries() {
		return DisplayNamesStyle.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return DisplayNamesStyle.#objectValues[arguments[1]];
		}
		if (value instanceof DisplayNamesStyle) return value;
		let intVal = DisplayNamesStyle.#values.get(value);
		if (intVal != null) return DisplayNamesStyle.#objectValues[intVal];
		throw TypeError(value + " is not a DisplayNamesStyle and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new DisplayNamesStyle(value);
	}
	get value() {
		return [...DisplayNamesStyle.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new DisplayNamesStyle(internalConstructor, internalConstructor, 0),
		new DisplayNamesStyle(internalConstructor, internalConstructor, 1),
		new DisplayNamesStyle(internalConstructor, internalConstructor, 2),
		new DisplayNamesStyle(internalConstructor, internalConstructor, 3)
	];
	static Narrow = DisplayNamesStyle.#objectValues[0];
	static Short = DisplayNamesStyle.#objectValues[1];
	static Long = DisplayNamesStyle.#objectValues[2];
	static Menu = DisplayNamesStyle.#objectValues[3];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class LanguageDisplay {
	#value = void 0;
	static #values = new Map([["Dialect", 0], ["Standard", 1]]);
	static getAllEntries() {
		return LanguageDisplay.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return LanguageDisplay.#objectValues[arguments[1]];
		}
		if (value instanceof LanguageDisplay) return value;
		let intVal = LanguageDisplay.#values.get(value);
		if (intVal != null) return LanguageDisplay.#objectValues[intVal];
		throw TypeError(value + " is not a LanguageDisplay and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new LanguageDisplay(value);
	}
	get value() {
		return [...LanguageDisplay.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [new LanguageDisplay(internalConstructor, internalConstructor, 0), new LanguageDisplay(internalConstructor, internalConstructor, 1)];
	static Dialect = LanguageDisplay.#objectValues[0];
	static Standard = LanguageDisplay.#objectValues[1];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
//#endregion
//#region vendor/LocaleParseError.mjs
/**
* Additional information: [1](https://docs.rs/icu/2.1.1/icu/locale/enum.ParseError.html)
*/
var LocaleParseError = class LocaleParseError {
	#value = void 0;
	static #values = new Map([
		["Unknown", 0],
		["Language", 1],
		["Subtag", 2],
		["Extension", 3]
	]);
	static getAllEntries() {
		return LocaleParseError.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return LocaleParseError.#objectValues[arguments[1]];
		}
		if (value instanceof LocaleParseError) return value;
		let intVal = LocaleParseError.#values.get(value);
		if (intVal != null) return LocaleParseError.#objectValues[intVal];
		throw TypeError(value + " is not a LocaleParseError and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new LocaleParseError(value);
	}
	get value() {
		return [...LocaleParseError.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new LocaleParseError(internalConstructor, internalConstructor, 0),
		new LocaleParseError(internalConstructor, internalConstructor, 1),
		new LocaleParseError(internalConstructor, internalConstructor, 2),
		new LocaleParseError(internalConstructor, internalConstructor, 3)
	];
	static Unknown = LocaleParseError.#objectValues[0];
	static Language = LocaleParseError.#objectValues[1];
	static Subtag = LocaleParseError.#objectValues[2];
	static Extension = LocaleParseError.#objectValues[3];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
};
//#endregion
//#region vendor/Locale.mjs
const Locale_box_destroy_registry = new FinalizationRegistry((ptr) => {
	wasm.icu4x_Locale_destroy_mv1(ptr);
});
/**
* An ICU4X Locale, capable of representing strings like `"en-US"`.
*
* See the [Rust documentation for `Locale`](https://docs.rs/icu/2.1.1/icu/locale/struct.Locale.html) for more information.
*/
var Locale = class Locale {
	#ptr = null;
	#selfEdge = [];
	#internalConstructor(symbol, ptr, selfEdge) {
		if (symbol !== internalConstructor) {
			console.error("Locale is an Opaque type. You cannot call its constructor.");
			return;
		}
		this.#ptr = ptr;
		this.#selfEdge = selfEdge;
		if (this.#selfEdge.length === 0) Locale_box_destroy_registry.register(this, this.#ptr);
		return this;
	}
	/** @internal */
	get ffiValue() {
		return this.#ptr;
	}
	/**
	* Construct an {@link Locale} from an locale identifier.
	*
	* This will run the complete locale parsing algorithm. If code size and
	* performance are critical and the locale is of a known shape (such as
	* `aa-BB`) use `create_und`, `set_language`, `set_script`, and `set_region`.
	*
	* See the [Rust documentation for `try_from_str`](https://docs.rs/icu/2.1.1/icu/locale/struct.Locale.html#method.try_from_str) for more information.
	*/
	static fromString(name) {
		let functionCleanupArena = new CleanupArena();
		const nameSlice = functionCleanupArena.alloc(DiplomatBuf.sliceWrapper(wasm, DiplomatBuf.str8(wasm, name)));
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_Locale_from_string_mv1(diplomatReceive.buffer, nameSlice.ptr);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new LocaleParseError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("LocaleParseError." + cause.value, { cause });
			}
			return new Locale(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			functionCleanupArena.free();
			diplomatReceive.free();
		}
	}
	/**
	* Construct a unknown {@link Locale} "und".
	*
	* See the [Rust documentation for `UNKNOWN`](https://docs.rs/icu/2.1.1/icu/locale/struct.Locale.html#associatedconstant.UNKNOWN) for more information.
	*/
	static unknown() {
		const result = wasm.icu4x_Locale_unknown_mv1();
		try {
			return new Locale(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Clones the {@link Locale}.
	*
	* See the [Rust documentation for `Locale`](https://docs.rs/icu/2.1.1/icu/locale/struct.Locale.html) for more information.
	*/
	clone() {
		const result = wasm.icu4x_Locale_clone_mv1(this.ffiValue);
		try {
			return new Locale(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Returns a string representation of the `LanguageIdentifier` part of
	* {@link Locale}.
	*
	* See the [Rust documentation for `id`](https://docs.rs/icu/2.1.1/icu/locale/struct.Locale.html#structfield.id) for more information.
	*/
	get basename() {
		const write = new DiplomatWriteBuf(wasm);
		wasm.icu4x_Locale_basename_mv1(this.ffiValue, write.buffer);
		try {
			return write.readString8();
		} finally {
			write.free();
		}
	}
	/**
	* Returns a string representation of the unicode extension.
	*
	* See the [Rust documentation for `extensions`](https://docs.rs/icu/2.1.1/icu/locale/struct.Locale.html#structfield.extensions) for more information.
	*/
	getUnicodeExtension(s) {
		let functionCleanupArena = new CleanupArena();
		const sSlice = functionCleanupArena.alloc(DiplomatBuf.sliceWrapper(wasm, DiplomatBuf.str8(wasm, s)));
		const write = new DiplomatWriteBuf(wasm);
		const result = wasm.icu4x_Locale_get_unicode_extension_mv1(this.ffiValue, sSlice.ptr, write.buffer);
		try {
			return result === 0 ? null : write.readString8();
		} finally {
			functionCleanupArena.free();
			write.free();
		}
	}
	/**
	* Set a Unicode extension.
	*
	* See the [Rust documentation for `extensions`](https://docs.rs/icu/2.1.1/icu/locale/struct.Locale.html#structfield.extensions) for more information.
	*/
	setUnicodeExtension(k, v) {
		let functionCleanupArena = new CleanupArena();
		const kSlice = functionCleanupArena.alloc(DiplomatBuf.sliceWrapper(wasm, DiplomatBuf.str8(wasm, k)));
		const vSlice = functionCleanupArena.alloc(DiplomatBuf.sliceWrapper(wasm, DiplomatBuf.str8(wasm, v)));
		const result = wasm.icu4x_Locale_set_unicode_extension_mv1(this.ffiValue, kSlice.ptr, vSlice.ptr);
		try {
			return result === 1;
		} finally {
			functionCleanupArena.free();
		}
	}
	/**
	* Returns a string representation of {@link Locale} language.
	*
	* See the [Rust documentation for `id`](https://docs.rs/icu/2.1.1/icu/locale/struct.Locale.html#structfield.id) for more information.
	*/
	get language() {
		const write = new DiplomatWriteBuf(wasm);
		wasm.icu4x_Locale_language_mv1(this.ffiValue, write.buffer);
		try {
			return write.readString8();
		} finally {
			write.free();
		}
	}
	/**
	* Set the language part of the {@link Locale}.
	*
	* See the [Rust documentation for `try_from_str`](https://docs.rs/icu/2.1.1/icu/locale/struct.Locale.html#method.try_from_str) for more information.
	*/
	set language(s) {
		let functionCleanupArena = new CleanupArena();
		const sSlice = functionCleanupArena.alloc(DiplomatBuf.sliceWrapper(wasm, DiplomatBuf.str8(wasm, s)));
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_Locale_set_language_mv1(diplomatReceive.buffer, this.ffiValue, sSlice.ptr);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new LocaleParseError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("LocaleParseError." + cause.value, { cause });
			}
		} finally {
			functionCleanupArena.free();
			diplomatReceive.free();
		}
	}
	/**
	* Returns a string representation of {@link Locale} region.
	*
	* See the [Rust documentation for `id`](https://docs.rs/icu/2.1.1/icu/locale/struct.Locale.html#structfield.id) for more information.
	*/
	get region() {
		const write = new DiplomatWriteBuf(wasm);
		const result = wasm.icu4x_Locale_region_mv1(this.ffiValue, write.buffer);
		try {
			return result === 0 ? null : write.readString8();
		} finally {
			write.free();
		}
	}
	/**
	* Set the region part of the {@link Locale}.
	*
	* See the [Rust documentation for `try_from_str`](https://docs.rs/icu/2.1.1/icu/locale/struct.Locale.html#method.try_from_str) for more information.
	*/
	set region(s) {
		let functionCleanupArena = new CleanupArena();
		const sSlice = functionCleanupArena.alloc(DiplomatBuf.sliceWrapper(wasm, DiplomatBuf.str8(wasm, s)));
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_Locale_set_region_mv1(diplomatReceive.buffer, this.ffiValue, sSlice.ptr);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new LocaleParseError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("LocaleParseError." + cause.value, { cause });
			}
		} finally {
			functionCleanupArena.free();
			diplomatReceive.free();
		}
	}
	/**
	* Returns a string representation of {@link Locale} script.
	*
	* See the [Rust documentation for `id`](https://docs.rs/icu/2.1.1/icu/locale/struct.Locale.html#structfield.id) for more information.
	*/
	get script() {
		const write = new DiplomatWriteBuf(wasm);
		const result = wasm.icu4x_Locale_script_mv1(this.ffiValue, write.buffer);
		try {
			return result === 0 ? null : write.readString8();
		} finally {
			write.free();
		}
	}
	/**
	* Set the script part of the {@link Locale}. Pass an empty string to remove the script.
	*
	* See the [Rust documentation for `try_from_str`](https://docs.rs/icu/2.1.1/icu/locale/struct.Locale.html#method.try_from_str) for more information.
	*/
	set script(s) {
		let functionCleanupArena = new CleanupArena();
		const sSlice = functionCleanupArena.alloc(DiplomatBuf.sliceWrapper(wasm, DiplomatBuf.str8(wasm, s)));
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_Locale_set_script_mv1(diplomatReceive.buffer, this.ffiValue, sSlice.ptr);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new LocaleParseError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("LocaleParseError." + cause.value, { cause });
			}
		} finally {
			functionCleanupArena.free();
			diplomatReceive.free();
		}
	}
	/**
	* Normalizes a locale string.
	*
	* See the [Rust documentation for `normalize`](https://docs.rs/icu/2.1.1/icu/locale/struct.Locale.html#method.normalize) for more information.
	*/
	static normalize(s) {
		let functionCleanupArena = new CleanupArena();
		const sSlice = functionCleanupArena.alloc(DiplomatBuf.sliceWrapper(wasm, DiplomatBuf.str8(wasm, s)));
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		const write = new DiplomatWriteBuf(wasm);
		wasm.icu4x_Locale_normalize_mv1(diplomatReceive.buffer, sSlice.ptr, write.buffer);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new LocaleParseError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("LocaleParseError." + cause.value, { cause });
			}
			return write.readString8();
		} finally {
			functionCleanupArena.free();
			diplomatReceive.free();
			write.free();
		}
	}
	/**
	* Returns a string representation of {@link Locale}.
	*
	* See the [Rust documentation for `write_to`](https://docs.rs/icu/2.1.1/icu/locale/struct.Locale.html#method.write_to) for more information.
	*/
	toString() {
		const write = new DiplomatWriteBuf(wasm);
		wasm.icu4x_Locale_to_string_mv1(this.ffiValue, write.buffer);
		try {
			return write.readString8();
		} finally {
			write.free();
		}
	}
	/**
	* See the [Rust documentation for `normalizing_eq`](https://docs.rs/icu/2.1.1/icu/locale/struct.Locale.html#method.normalizing_eq) for more information.
	*/
	normalizingEq(other) {
		let functionCleanupArena = new CleanupArena();
		const otherSlice = functionCleanupArena.alloc(DiplomatBuf.sliceWrapper(wasm, DiplomatBuf.str8(wasm, other)));
		const result = wasm.icu4x_Locale_normalizing_eq_mv1(this.ffiValue, otherSlice.ptr);
		try {
			return result;
		} finally {
			functionCleanupArena.free();
		}
	}
	/**
	* See the [Rust documentation for `strict_cmp`](https://docs.rs/icu/2.1.1/icu/locale/struct.Locale.html#method.strict_cmp) for more information.
	*/
	compareToString(other) {
		let functionCleanupArena = new CleanupArena();
		const otherSlice = functionCleanupArena.alloc(DiplomatBuf.sliceWrapper(wasm, DiplomatBuf.str8(wasm, other)));
		const result = wasm.icu4x_Locale_compare_to_string_mv1(this.ffiValue, otherSlice.ptr);
		try {
			return result;
		} finally {
			functionCleanupArena.free();
		}
	}
	/**
	* See the [Rust documentation for `total_cmp`](https://docs.rs/icu/2.1.1/icu/locale/struct.Locale.html#method.total_cmp) for more information.
	*/
	compareTo(other) {
		const result = wasm.icu4x_Locale_compare_to_mv1(this.ffiValue, other.ffiValue);
		try {
			return result;
		} finally {}
	}
	constructor(symbol, ptr, selfEdge) {
		return this.#internalConstructor(...arguments);
	}
};
(class CalendarKind {
	#value = void 0;
	static #values = new Map([
		["Iso", 0],
		["Gregorian", 1],
		["Buddhist", 2],
		["Japanese", 3],
		["JapaneseExtended", 4],
		["Ethiopian", 5],
		["EthiopianAmeteAlem", 6],
		["Indian", 7],
		["Coptic", 8],
		["Dangi", 9],
		["Chinese", 10],
		["Hebrew", 11],
		["HijriTabularTypeIiFriday", 12],
		["HijriSimulatedMecca", 18],
		["HijriTabularTypeIiThursday", 14],
		["HijriUmmAlQura", 15],
		["Persian", 16],
		["Roc", 17]
	]);
	static getAllEntries() {
		return CalendarKind.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return CalendarKind.#objectValues[arguments[1]];
		}
		if (value instanceof CalendarKind) return value;
		let intVal = CalendarKind.#values.get(value);
		if (intVal != null) return CalendarKind.#objectValues[intVal];
		throw TypeError(value + " is not a CalendarKind and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new CalendarKind(value);
	}
	get value() {
		for (let entry of CalendarKind.#values) if (entry[1] == this.#value) return entry[0];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = {
		[0]: new CalendarKind(internalConstructor, internalConstructor, 0),
		[1]: new CalendarKind(internalConstructor, internalConstructor, 1),
		[2]: new CalendarKind(internalConstructor, internalConstructor, 2),
		[3]: new CalendarKind(internalConstructor, internalConstructor, 3),
		[4]: new CalendarKind(internalConstructor, internalConstructor, 4),
		[5]: new CalendarKind(internalConstructor, internalConstructor, 5),
		[6]: new CalendarKind(internalConstructor, internalConstructor, 6),
		[7]: new CalendarKind(internalConstructor, internalConstructor, 7),
		[8]: new CalendarKind(internalConstructor, internalConstructor, 8),
		[9]: new CalendarKind(internalConstructor, internalConstructor, 9),
		[10]: new CalendarKind(internalConstructor, internalConstructor, 10),
		[11]: new CalendarKind(internalConstructor, internalConstructor, 11),
		[12]: new CalendarKind(internalConstructor, internalConstructor, 12),
		[18]: new CalendarKind(internalConstructor, internalConstructor, 18),
		[14]: new CalendarKind(internalConstructor, internalConstructor, 14),
		[15]: new CalendarKind(internalConstructor, internalConstructor, 15),
		[16]: new CalendarKind(internalConstructor, internalConstructor, 16),
		[17]: new CalendarKind(internalConstructor, internalConstructor, 17)
	};
	static Iso = CalendarKind.#objectValues[0];
	static Gregorian = CalendarKind.#objectValues[1];
	static Buddhist = CalendarKind.#objectValues[2];
	static Japanese = CalendarKind.#objectValues[3];
	static JapaneseExtended = CalendarKind.#objectValues[4];
	static Ethiopian = CalendarKind.#objectValues[5];
	static EthiopianAmeteAlem = CalendarKind.#objectValues[6];
	static Indian = CalendarKind.#objectValues[7];
	static Coptic = CalendarKind.#objectValues[8];
	static Dangi = CalendarKind.#objectValues[9];
	static Chinese = CalendarKind.#objectValues[10];
	static Hebrew = CalendarKind.#objectValues[11];
	static HijriTabularTypeIiFriday = CalendarKind.#objectValues[12];
	static HijriSimulatedMecca = CalendarKind.#objectValues[18];
	static HijriTabularTypeIiThursday = CalendarKind.#objectValues[14];
	static HijriUmmAlQura = CalendarKind.#objectValues[15];
	static Persian = CalendarKind.#objectValues[16];
	static Roc = CalendarKind.#objectValues[17];
	/**
	* Creates a new {@link CalendarKind} for the specified locale, using compiled data.
	*
	* See the [Rust documentation for `new`](https://docs.rs/icu/2.1.1/icu/calendar/enum.AnyCalendarKind.html#method.new) for more information.
	*/
	static create(locale) {
		const result = wasm.icu4x_CalendarKind_create_mv1(locale.ffiValue);
		try {
			return new CalendarKind(internalConstructor, result);
		} finally {}
	}
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class LocaleFallbackPriority {
	#value = void 0;
	static #values = new Map([["Language", 0], ["Region", 1]]);
	static getAllEntries() {
		return LocaleFallbackPriority.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return LocaleFallbackPriority.#objectValues[arguments[1]];
		}
		if (value instanceof LocaleFallbackPriority) return value;
		let intVal = LocaleFallbackPriority.#values.get(value);
		if (intVal != null) return LocaleFallbackPriority.#objectValues[intVal];
		throw TypeError(value + " is not a LocaleFallbackPriority and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new LocaleFallbackPriority(value);
	}
	get value() {
		return [...LocaleFallbackPriority.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [new LocaleFallbackPriority(internalConstructor, internalConstructor, 0), new LocaleFallbackPriority(internalConstructor, internalConstructor, 1)];
	static Language = LocaleFallbackPriority.#objectValues[0];
	static Region = LocaleFallbackPriority.#objectValues[1];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class BidiPairedBracketType {
	#value = void 0;
	static #values = new Map([
		["Open", 0],
		["Close", 1],
		["None", 2]
	]);
	static getAllEntries() {
		return BidiPairedBracketType.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return BidiPairedBracketType.#objectValues[arguments[1]];
		}
		if (value instanceof BidiPairedBracketType) return value;
		let intVal = BidiPairedBracketType.#values.get(value);
		if (intVal != null) return BidiPairedBracketType.#objectValues[intVal];
		throw TypeError(value + " is not a BidiPairedBracketType and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new BidiPairedBracketType(value);
	}
	get value() {
		return [...BidiPairedBracketType.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new BidiPairedBracketType(internalConstructor, internalConstructor, 0),
		new BidiPairedBracketType(internalConstructor, internalConstructor, 1),
		new BidiPairedBracketType(internalConstructor, internalConstructor, 2)
	];
	static Open = BidiPairedBracketType.#objectValues[0];
	static Close = BidiPairedBracketType.#objectValues[1];
	static None = BidiPairedBracketType.#objectValues[2];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class GeneralCategory {
	#value = void 0;
	static #values = new Map([
		["Unassigned", 0],
		["UppercaseLetter", 1],
		["LowercaseLetter", 2],
		["TitlecaseLetter", 3],
		["ModifierLetter", 4],
		["OtherLetter", 5],
		["NonspacingMark", 6],
		["SpacingMark", 8],
		["EnclosingMark", 7],
		["DecimalNumber", 9],
		["LetterNumber", 10],
		["OtherNumber", 11],
		["SpaceSeparator", 12],
		["LineSeparator", 13],
		["ParagraphSeparator", 14],
		["Control", 15],
		["Format", 16],
		["PrivateUse", 17],
		["Surrogate", 18],
		["DashPunctuation", 19],
		["OpenPunctuation", 20],
		["ClosePunctuation", 21],
		["ConnectorPunctuation", 22],
		["InitialPunctuation", 28],
		["FinalPunctuation", 29],
		["OtherPunctuation", 23],
		["MathSymbol", 24],
		["CurrencySymbol", 25],
		["ModifierSymbol", 26],
		["OtherSymbol", 27]
	]);
	static getAllEntries() {
		return GeneralCategory.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return GeneralCategory.#objectValues[arguments[1]];
		}
		if (value instanceof GeneralCategory) return value;
		let intVal = GeneralCategory.#values.get(value);
		if (intVal != null) return GeneralCategory.#objectValues[intVal];
		throw TypeError(value + " is not a GeneralCategory and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new GeneralCategory(value);
	}
	get value() {
		for (let entry of GeneralCategory.#values) if (entry[1] == this.#value) return entry[0];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = {
		[0]: new GeneralCategory(internalConstructor, internalConstructor, 0),
		[1]: new GeneralCategory(internalConstructor, internalConstructor, 1),
		[2]: new GeneralCategory(internalConstructor, internalConstructor, 2),
		[3]: new GeneralCategory(internalConstructor, internalConstructor, 3),
		[4]: new GeneralCategory(internalConstructor, internalConstructor, 4),
		[5]: new GeneralCategory(internalConstructor, internalConstructor, 5),
		[6]: new GeneralCategory(internalConstructor, internalConstructor, 6),
		[8]: new GeneralCategory(internalConstructor, internalConstructor, 8),
		[7]: new GeneralCategory(internalConstructor, internalConstructor, 7),
		[9]: new GeneralCategory(internalConstructor, internalConstructor, 9),
		[10]: new GeneralCategory(internalConstructor, internalConstructor, 10),
		[11]: new GeneralCategory(internalConstructor, internalConstructor, 11),
		[12]: new GeneralCategory(internalConstructor, internalConstructor, 12),
		[13]: new GeneralCategory(internalConstructor, internalConstructor, 13),
		[14]: new GeneralCategory(internalConstructor, internalConstructor, 14),
		[15]: new GeneralCategory(internalConstructor, internalConstructor, 15),
		[16]: new GeneralCategory(internalConstructor, internalConstructor, 16),
		[17]: new GeneralCategory(internalConstructor, internalConstructor, 17),
		[18]: new GeneralCategory(internalConstructor, internalConstructor, 18),
		[19]: new GeneralCategory(internalConstructor, internalConstructor, 19),
		[20]: new GeneralCategory(internalConstructor, internalConstructor, 20),
		[21]: new GeneralCategory(internalConstructor, internalConstructor, 21),
		[22]: new GeneralCategory(internalConstructor, internalConstructor, 22),
		[28]: new GeneralCategory(internalConstructor, internalConstructor, 28),
		[29]: new GeneralCategory(internalConstructor, internalConstructor, 29),
		[23]: new GeneralCategory(internalConstructor, internalConstructor, 23),
		[24]: new GeneralCategory(internalConstructor, internalConstructor, 24),
		[25]: new GeneralCategory(internalConstructor, internalConstructor, 25),
		[26]: new GeneralCategory(internalConstructor, internalConstructor, 26),
		[27]: new GeneralCategory(internalConstructor, internalConstructor, 27)
	};
	static Unassigned = GeneralCategory.#objectValues[0];
	static UppercaseLetter = GeneralCategory.#objectValues[1];
	static LowercaseLetter = GeneralCategory.#objectValues[2];
	static TitlecaseLetter = GeneralCategory.#objectValues[3];
	static ModifierLetter = GeneralCategory.#objectValues[4];
	static OtherLetter = GeneralCategory.#objectValues[5];
	static NonspacingMark = GeneralCategory.#objectValues[6];
	static SpacingMark = GeneralCategory.#objectValues[8];
	static EnclosingMark = GeneralCategory.#objectValues[7];
	static DecimalNumber = GeneralCategory.#objectValues[9];
	static LetterNumber = GeneralCategory.#objectValues[10];
	static OtherNumber = GeneralCategory.#objectValues[11];
	static SpaceSeparator = GeneralCategory.#objectValues[12];
	static LineSeparator = GeneralCategory.#objectValues[13];
	static ParagraphSeparator = GeneralCategory.#objectValues[14];
	static Control = GeneralCategory.#objectValues[15];
	static Format = GeneralCategory.#objectValues[16];
	static PrivateUse = GeneralCategory.#objectValues[17];
	static Surrogate = GeneralCategory.#objectValues[18];
	static DashPunctuation = GeneralCategory.#objectValues[19];
	static OpenPunctuation = GeneralCategory.#objectValues[20];
	static ClosePunctuation = GeneralCategory.#objectValues[21];
	static ConnectorPunctuation = GeneralCategory.#objectValues[22];
	static InitialPunctuation = GeneralCategory.#objectValues[28];
	static FinalPunctuation = GeneralCategory.#objectValues[29];
	static OtherPunctuation = GeneralCategory.#objectValues[23];
	static MathSymbol = GeneralCategory.#objectValues[24];
	static CurrencySymbol = GeneralCategory.#objectValues[25];
	static ModifierSymbol = GeneralCategory.#objectValues[26];
	static OtherSymbol = GeneralCategory.#objectValues[27];
	/**
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.EnumeratedProperty.html#tymethod.for_char) for more information.
	*/
	static forChar(ch) {
		const result = wasm.icu4x_GeneralCategory_for_char_mv1(ch);
		try {
			return new GeneralCategory(internalConstructor, result);
		} finally {}
	}
	/**
	* Convert to an integer using the ICU4C integer mappings for `General_Category`
	* Get the "long" name of this property value (returns empty if property value is unknown)
	*
	* See the [Rust documentation for `get`](https://docs.rs/icu/2.1.1/icu/properties/struct.PropertyNamesLongBorrowed.html#method.get) for more information.
	*/
	longName() {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 9, 4, true);
		wasm.icu4x_GeneralCategory_long_name_mv1(diplomatReceive.buffer, this.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new DiplomatSliceStr(wasm, diplomatReceive.buffer, "string8", []).getValue();
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the "short" name of this property value (returns empty if property value is unknown)
	*
	* See the [Rust documentation for `get`](https://docs.rs/icu/2.1.1/icu/properties/struct.PropertyNamesShortBorrowed.html#method.get) for more information.
	*/
	shortName() {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 9, 4, true);
		wasm.icu4x_GeneralCategory_short_name_mv1(diplomatReceive.buffer, this.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new DiplomatSliceStr(wasm, diplomatReceive.buffer, "string8", []).getValue();
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Convert to an integer value usable with ICU4C and CodePointMapData
	*/
	toIntegerValue() {
		const result = wasm.icu4x_GeneralCategory_to_integer_value_mv1(this.ffiValue);
		try {
			return result;
		} finally {}
	}
	/**
	* Produces a GeneralCategoryGroup mask that can represent a group of general categories
	*
	* See the [Rust documentation for `GeneralCategoryGroup`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GeneralCategoryGroup.html) for more information.
	*/
	toGroup() {
		const result = wasm.icu4x_GeneralCategory_to_group_mv1(this.ffiValue);
		try {
			return GeneralCategoryGroup._fromFFI(internalConstructor, result);
		} finally {}
	}
	/**
	* Convert from an integer using the ICU4C integer mappings for `General_Category`
	* Convert from an integer value from ICU4C or CodePointMapData
	*/
	static fromIntegerValue(other) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_GeneralCategory_from_integer_value_mv1(diplomatReceive.buffer, other);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new GeneralCategory(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
		} finally {
			diplomatReceive.free();
		}
	}
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
//#endregion
//#region vendor/GeneralCategoryGroup.mjs
/**
* A mask that is capable of representing groups of `General_Category` values.
*
* See the [Rust documentation for `GeneralCategoryGroup`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GeneralCategoryGroup.html) for more information.
*/
var GeneralCategoryGroup = class GeneralCategoryGroup {
	#mask;
	get mask() {
		return this.#mask;
	}
	set mask(value) {
		this.#mask = value;
	}
	/** @internal */
	static fromFields(structObj) {
		return new GeneralCategoryGroup(structObj);
	}
	#internalConstructor(structObj) {
		if (typeof structObj !== "object") throw new Error("GeneralCategoryGroup's constructor takes an object of GeneralCategoryGroup's fields.");
		if ("mask" in structObj) this.#mask = structObj.mask;
		else throw new Error("Missing required field mask.");
		return this;
	}
	_intoFFI(functionCleanupArena, appendArrayMap) {
		return this.#mask;
	}
	static _fromSuppliedValue(internalConstructor$36, obj) {
		if (internalConstructor$36 !== internalConstructor) throw new Error("_fromSuppliedValue cannot be called externally.");
		if (obj instanceof GeneralCategoryGroup) return obj;
		return GeneralCategoryGroup.fromFields(obj);
	}
	_writeToArrayBuffer(arrayBuffer, offset, functionCleanupArena, appendArrayMap) {
		writeToArrayBuffer(arrayBuffer, offset + 0, this.#mask, Uint32Array);
	}
	static _fromFFI(internalConstructor$37, primitiveValue) {
		if (internalConstructor$37 !== internalConstructor) throw new Error("GeneralCategoryGroup._fromFFI is not meant to be called externally. Please use the default constructor.");
		let structObj = {};
		structObj.mask = primitiveValue;
		return new GeneralCategoryGroup(structObj);
	}
	/**
	* See the [Rust documentation for `contains`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GeneralCategoryGroup.html#method.contains) for more information.
	*/
	contains(val) {
		let functionCleanupArena = new CleanupArena();
		const result = wasm.icu4x_GeneralCategoryGroup_contains_mv1(GeneralCategoryGroup._fromSuppliedValue(internalConstructor, this)._intoFFI(functionCleanupArena, {}, false), val.ffiValue);
		try {
			return result;
		} finally {
			functionCleanupArena.free();
		}
	}
	/**
	* See the [Rust documentation for `complement`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GeneralCategoryGroup.html#method.complement) for more information.
	*/
	complement() {
		let functionCleanupArena = new CleanupArena();
		const result = wasm.icu4x_GeneralCategoryGroup_complement_mv1(GeneralCategoryGroup._fromSuppliedValue(internalConstructor, this)._intoFFI(functionCleanupArena, {}, false));
		try {
			return GeneralCategoryGroup._fromFFI(internalConstructor, result);
		} finally {
			functionCleanupArena.free();
		}
	}
	/**
	* See the [Rust documentation for `all`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GeneralCategoryGroup.html#method.all) for more information.
	*/
	static all() {
		const result = wasm.icu4x_GeneralCategoryGroup_all_mv1();
		try {
			return GeneralCategoryGroup._fromFFI(internalConstructor, result);
		} finally {}
	}
	/**
	* See the [Rust documentation for `empty`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GeneralCategoryGroup.html#method.empty) for more information.
	*/
	static empty() {
		const result = wasm.icu4x_GeneralCategoryGroup_empty_mv1();
		try {
			return GeneralCategoryGroup._fromFFI(internalConstructor, result);
		} finally {}
	}
	/**
	* See the [Rust documentation for `union`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GeneralCategoryGroup.html#method.union) for more information.
	*/
	union(other) {
		let functionCleanupArena = new CleanupArena();
		const result = wasm.icu4x_GeneralCategoryGroup_union_mv1(GeneralCategoryGroup._fromSuppliedValue(internalConstructor, this)._intoFFI(functionCleanupArena, {}, false), GeneralCategoryGroup._fromSuppliedValue(internalConstructor, other)._intoFFI(functionCleanupArena, {}, false));
		try {
			return GeneralCategoryGroup._fromFFI(internalConstructor, result);
		} finally {
			functionCleanupArena.free();
		}
	}
	/**
	* See the [Rust documentation for `intersection`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GeneralCategoryGroup.html#method.intersection) for more information.
	*/
	intersection(other) {
		let functionCleanupArena = new CleanupArena();
		const result = wasm.icu4x_GeneralCategoryGroup_intersection_mv1(GeneralCategoryGroup._fromSuppliedValue(internalConstructor, this)._intoFFI(functionCleanupArena, {}, false), GeneralCategoryGroup._fromSuppliedValue(internalConstructor, other)._intoFFI(functionCleanupArena, {}, false));
		try {
			return GeneralCategoryGroup._fromFFI(internalConstructor, result);
		} finally {
			functionCleanupArena.free();
		}
	}
	/**
	* See the [Rust documentation for `CasedLetter`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GeneralCategoryGroup.html#associatedconstant.CasedLetter) for more information.
	*/
	static casedLetter() {
		const result = wasm.icu4x_GeneralCategoryGroup_cased_letter_mv1();
		try {
			return GeneralCategoryGroup._fromFFI(internalConstructor, result);
		} finally {}
	}
	/**
	* See the [Rust documentation for `Letter`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GeneralCategoryGroup.html#associatedconstant.Letter) for more information.
	*/
	static letter() {
		const result = wasm.icu4x_GeneralCategoryGroup_letter_mv1();
		try {
			return GeneralCategoryGroup._fromFFI(internalConstructor, result);
		} finally {}
	}
	/**
	* See the [Rust documentation for `Mark`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GeneralCategoryGroup.html#associatedconstant.Mark) for more information.
	*/
	static mark() {
		const result = wasm.icu4x_GeneralCategoryGroup_mark_mv1();
		try {
			return GeneralCategoryGroup._fromFFI(internalConstructor, result);
		} finally {}
	}
	/**
	* See the [Rust documentation for `Number`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GeneralCategoryGroup.html#associatedconstant.Number) for more information.
	*/
	static number() {
		const result = wasm.icu4x_GeneralCategoryGroup_number_mv1();
		try {
			return GeneralCategoryGroup._fromFFI(internalConstructor, result);
		} finally {}
	}
	/**
	* See the [Rust documentation for `Other`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GeneralCategoryGroup.html#associatedconstant.Other) for more information.
	*/
	static separator() {
		const result = wasm.icu4x_GeneralCategoryGroup_separator_mv1();
		try {
			return GeneralCategoryGroup._fromFFI(internalConstructor, result);
		} finally {}
	}
	/**
	* See the [Rust documentation for `Letter`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GeneralCategoryGroup.html#associatedconstant.Letter) for more information.
	*/
	static other() {
		const result = wasm.icu4x_GeneralCategoryGroup_other_mv1();
		try {
			return GeneralCategoryGroup._fromFFI(internalConstructor, result);
		} finally {}
	}
	/**
	* See the [Rust documentation for `Punctuation`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GeneralCategoryGroup.html#associatedconstant.Punctuation) for more information.
	*/
	static punctuation() {
		const result = wasm.icu4x_GeneralCategoryGroup_punctuation_mv1();
		try {
			return GeneralCategoryGroup._fromFFI(internalConstructor, result);
		} finally {}
	}
	/**
	* See the [Rust documentation for `Symbol`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GeneralCategoryGroup.html#associatedconstant.Symbol) for more information.
	*/
	static symbol() {
		const result = wasm.icu4x_GeneralCategoryGroup_symbol_mv1();
		try {
			return GeneralCategoryGroup._fromFFI(internalConstructor, result);
		} finally {}
	}
	constructor(structObj) {
		return this.#internalConstructor(...arguments);
	}
};
//#endregion
//#region vendor/LineBreakStrictness.mjs
/**
* See the [Rust documentation for `LineBreakStrictness`](https://docs.rs/icu/2.1.1/icu/segmenter/options/enum.LineBreakStrictness.html) for more information.
*/
var LineBreakStrictness = class LineBreakStrictness {
	#value = void 0;
	static #values = new Map([
		["Loose", 0],
		["Normal", 1],
		["Strict", 2],
		["Anywhere", 3]
	]);
	static getAllEntries() {
		return LineBreakStrictness.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return LineBreakStrictness.#objectValues[arguments[1]];
		}
		if (value instanceof LineBreakStrictness) return value;
		let intVal = LineBreakStrictness.#values.get(value);
		if (intVal != null) return LineBreakStrictness.#objectValues[intVal];
		throw TypeError(value + " is not a LineBreakStrictness and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new LineBreakStrictness(value);
	}
	get value() {
		return [...LineBreakStrictness.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new LineBreakStrictness(internalConstructor, internalConstructor, 0),
		new LineBreakStrictness(internalConstructor, internalConstructor, 1),
		new LineBreakStrictness(internalConstructor, internalConstructor, 2),
		new LineBreakStrictness(internalConstructor, internalConstructor, 3)
	];
	static Loose = LineBreakStrictness.#objectValues[0];
	static Normal = LineBreakStrictness.#objectValues[1];
	static Strict = LineBreakStrictness.#objectValues[2];
	static Anywhere = LineBreakStrictness.#objectValues[3];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
};
//#endregion
//#region vendor/LineBreakWordOption.mjs
/**
* See the [Rust documentation for `LineBreakWordOption`](https://docs.rs/icu/2.1.1/icu/segmenter/options/enum.LineBreakWordOption.html) for more information.
*/
var LineBreakWordOption = class LineBreakWordOption {
	#value = void 0;
	static #values = new Map([
		["Normal", 0],
		["BreakAll", 1],
		["KeepAll", 2]
	]);
	static getAllEntries() {
		return LineBreakWordOption.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return LineBreakWordOption.#objectValues[arguments[1]];
		}
		if (value instanceof LineBreakWordOption) return value;
		let intVal = LineBreakWordOption.#values.get(value);
		if (intVal != null) return LineBreakWordOption.#objectValues[intVal];
		throw TypeError(value + " is not a LineBreakWordOption and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new LineBreakWordOption(value);
	}
	get value() {
		return [...LineBreakWordOption.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new LineBreakWordOption(internalConstructor, internalConstructor, 0),
		new LineBreakWordOption(internalConstructor, internalConstructor, 1),
		new LineBreakWordOption(internalConstructor, internalConstructor, 2)
	];
	static Normal = LineBreakWordOption.#objectValues[0];
	static BreakAll = LineBreakWordOption.#objectValues[1];
	static KeepAll = LineBreakWordOption.#objectValues[2];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
};
//#endregion
//#region vendor/LineBreakOptions.mjs
/**
* See the [Rust documentation for `LineBreakOptions`](https://docs.rs/icu/2.1.1/icu/segmenter/options/struct.LineBreakOptions.html) for more information.
*/
var LineBreakOptions = class LineBreakOptions {
	#strictness;
	get strictness() {
		return this.#strictness;
	}
	set strictness(value) {
		this.#strictness = value;
	}
	#wordOption;
	get wordOption() {
		return this.#wordOption;
	}
	set wordOption(value) {
		this.#wordOption = value;
	}
	/** @internal */
	static fromFields(structObj) {
		return new LineBreakOptions(structObj);
	}
	#internalConstructor(structObj) {
		if (typeof structObj !== "object") throw new Error("LineBreakOptions's constructor takes an object of LineBreakOptions's fields.");
		if ("strictness" in structObj) this.#strictness = structObj.strictness;
		else this.#strictness = null;
		if ("wordOption" in structObj) this.#wordOption = structObj.wordOption;
		else this.#wordOption = null;
		return this;
	}
	_intoFFI(functionCleanupArena, appendArrayMap) {
		let buffer = DiplomatBuf.struct(wasm, 16, 4);
		this._writeToArrayBuffer(wasm.memory.buffer, buffer.ptr, functionCleanupArena, appendArrayMap);
		functionCleanupArena.alloc(buffer);
		return buffer.ptr;
	}
	static _fromSuppliedValue(internalConstructor$35, obj) {
		if (internalConstructor$35 !== internalConstructor) throw new Error("_fromSuppliedValue cannot be called externally.");
		if (obj instanceof LineBreakOptions) return obj;
		return LineBreakOptions.fromFields(obj);
	}
	_writeToArrayBuffer(arrayBuffer, offset, functionCleanupArena, appendArrayMap) {
		writeOptionToArrayBuffer(arrayBuffer, offset + 0, this.#strictness, 4, 4, (arrayBuffer, offset, jsValue) => writeToArrayBuffer(arrayBuffer, offset + 0, jsValue.ffiValue, Int32Array));
		writeOptionToArrayBuffer(arrayBuffer, offset + 8, this.#wordOption, 4, 4, (arrayBuffer, offset, jsValue) => writeToArrayBuffer(arrayBuffer, offset + 0, jsValue.ffiValue, Int32Array));
	}
	static _fromFFI(internalConstructor$34, ptr) {
		if (internalConstructor$34 !== internalConstructor) throw new Error("LineBreakOptions._fromFFI is not meant to be called externally. Please use the default constructor.");
		let structObj = {};
		structObj.strictness = readOption(wasm, ptr, 4, (wasm, offset) => {
			return new LineBreakStrictness(internalConstructor, enumDiscriminant(wasm, offset));
		});
		structObj.wordOption = readOption(wasm, ptr + 8, 4, (wasm, offset) => {
			return new LineBreakWordOption(internalConstructor, enumDiscriminant(wasm, offset));
		});
		return new LineBreakOptions(structObj);
	}
	constructor(structObj) {
		return this.#internalConstructor(...arguments);
	}
};
(class CollatorCaseFirst {
	#value = void 0;
	static #values = new Map([
		["Off", 0],
		["Lower", 1],
		["Upper", 2]
	]);
	static getAllEntries() {
		return CollatorCaseFirst.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return CollatorCaseFirst.#objectValues[arguments[1]];
		}
		if (value instanceof CollatorCaseFirst) return value;
		let intVal = CollatorCaseFirst.#values.get(value);
		if (intVal != null) return CollatorCaseFirst.#objectValues[intVal];
		throw TypeError(value + " is not a CollatorCaseFirst and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new CollatorCaseFirst(value);
	}
	get value() {
		return [...CollatorCaseFirst.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new CollatorCaseFirst(internalConstructor, internalConstructor, 0),
		new CollatorCaseFirst(internalConstructor, internalConstructor, 1),
		new CollatorCaseFirst(internalConstructor, internalConstructor, 2)
	];
	static Off = CollatorCaseFirst.#objectValues[0];
	static Lower = CollatorCaseFirst.#objectValues[1];
	static Upper = CollatorCaseFirst.#objectValues[2];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class CollatorNumericOrdering {
	#value = void 0;
	static #values = new Map([["Off", 0], ["On", 1]]);
	static getAllEntries() {
		return CollatorNumericOrdering.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return CollatorNumericOrdering.#objectValues[arguments[1]];
		}
		if (value instanceof CollatorNumericOrdering) return value;
		let intVal = CollatorNumericOrdering.#values.get(value);
		if (intVal != null) return CollatorNumericOrdering.#objectValues[intVal];
		throw TypeError(value + " is not a CollatorNumericOrdering and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new CollatorNumericOrdering(value);
	}
	get value() {
		return [...CollatorNumericOrdering.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [new CollatorNumericOrdering(internalConstructor, internalConstructor, 0), new CollatorNumericOrdering(internalConstructor, internalConstructor, 1)];
	static Off = CollatorNumericOrdering.#objectValues[0];
	static On = CollatorNumericOrdering.#objectValues[1];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
//#endregion
//#region vendor/DataError.mjs
/**
* Additional information: [1](https://docs.rs/icu_provider/2.1.1/icu_provider/struct.DataError.html), [2](https://docs.rs/icu_provider/2.1.1/icu_provider/enum.DataErrorKind.html)
*/
var DataError = class DataError {
	#value = void 0;
	static #values = new Map([
		["Unknown", 0],
		["MarkerNotFound", 1],
		["IdentifierNotFound", 2],
		["InvalidRequest", 3],
		["InconsistentData", 4],
		["Downcast", 5],
		["Deserialize", 6],
		["Custom", 7],
		["Io", 8]
	]);
	static getAllEntries() {
		return DataError.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return DataError.#objectValues[arguments[1]];
		}
		if (value instanceof DataError) return value;
		let intVal = DataError.#values.get(value);
		if (intVal != null) return DataError.#objectValues[intVal];
		throw TypeError(value + " is not a DataError and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new DataError(value);
	}
	get value() {
		return [...DataError.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new DataError(internalConstructor, internalConstructor, 0),
		new DataError(internalConstructor, internalConstructor, 1),
		new DataError(internalConstructor, internalConstructor, 2),
		new DataError(internalConstructor, internalConstructor, 3),
		new DataError(internalConstructor, internalConstructor, 4),
		new DataError(internalConstructor, internalConstructor, 5),
		new DataError(internalConstructor, internalConstructor, 6),
		new DataError(internalConstructor, internalConstructor, 7),
		new DataError(internalConstructor, internalConstructor, 8)
	];
	static Unknown = DataError.#objectValues[0];
	static MarkerNotFound = DataError.#objectValues[1];
	static IdentifierNotFound = DataError.#objectValues[2];
	static InvalidRequest = DataError.#objectValues[3];
	static InconsistentData = DataError.#objectValues[4];
	static Downcast = DataError.#objectValues[5];
	static Deserialize = DataError.#objectValues[6];
	static Custom = DataError.#objectValues[7];
	static Io = DataError.#objectValues[8];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
};
new FinalizationRegistry((ptr) => {
	wasm.icu4x_LocaleFallbackIterator_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_LocaleFallbackerWithConfig_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_LocaleFallbacker_destroy_mv1(ptr);
});
//#endregion
//#region vendor/DataProvider.mjs
const DataProvider_box_destroy_registry = new FinalizationRegistry((ptr) => {
	wasm.icu4x_DataProvider_destroy_mv1(ptr);
});
/**
* An ICU4X data provider, capable of loading ICU4X data keys from some source.
*
* Currently the only source supported is loading from "blob" formatted data from a bytes buffer or the file system.
*
* If you wish to use ICU4X's builtin "compiled data", use the version of the constructors that do not have `_with_provider`
* in their names.
*
* See the [Rust documentation for `icu_provider`](https://docs.rs/icu_provider/2.1.1/icu_provider/index.html) for more information.
*/
var DataProvider = class DataProvider {
	#ptr = null;
	#selfEdge = [];
	#internalConstructor(symbol, ptr, selfEdge) {
		if (symbol !== internalConstructor) {
			console.error("DataProvider is an Opaque type. You cannot call its constructor.");
			return;
		}
		this.#ptr = ptr;
		this.#selfEdge = selfEdge;
		if (this.#selfEdge.length === 0) DataProvider_box_destroy_registry.register(this, this.#ptr);
		return this;
	}
	/** @internal */
	get ffiValue() {
		return this.#ptr;
	}
	/**
	* See the [Rust documentation for `try_new_from_blob`](https://docs.rs/icu_provider_blob/2.1.1/icu_provider_blob/struct.BlobDataProvider.html#method.try_new_from_blob) for more information.
	*/
	static fromByteSlice(blob) {
		let functionCleanupArena = new CleanupArena();
		const blobSlice = OwnedSliceLeaker.alloc(DiplomatBuf.sliceWrapper(wasm, DiplomatBuf.slice(wasm, blob, "u8")));
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_DataProvider_from_owned_byte_slice_mv1(diplomatReceive.buffer, blobSlice.ptr);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new DataProvider(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			functionCleanupArena.free();
			diplomatReceive.free();
		}
	}
	/**
	* Creates a provider that tries the current provider and then, if the current provider
	* doesn't support the data key, another provider `other`.
	*
	* This takes ownership of the `other` provider, leaving an empty provider in its place.
	*
	* See the [Rust documentation for `ForkByMarkerProvider`](https://docs.rs/icu_provider_adapters/2.1.1/icu_provider_adapters/fork/type.ForkByMarkerProvider.html) for more information.
	*/
	forkByMarker(other) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_DataProvider_fork_by_marker_mv1(diplomatReceive.buffer, this.ffiValue, other.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Same as `fork_by_key` but forks by locale instead of key.
	*
	* See the [Rust documentation for `IdentifierNotFoundPredicate`](https://docs.rs/icu_provider_adapters/2.1.1/icu_provider_adapters/fork/predicates/struct.IdentifierNotFoundPredicate.html) for more information.
	*/
	forkByLocale(other) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_DataProvider_fork_by_locale_mv1(diplomatReceive.buffer, this.ffiValue, other.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* See the [Rust documentation for `new`](https://docs.rs/icu_provider_adapters/2.1.1/icu_provider_adapters/fallback/struct.LocaleFallbackProvider.html#method.new) for more information.
	*
	* Additional information: [1](https://docs.rs/icu_provider_adapters/2.1.1/icu_provider_adapters/fallback/struct.LocaleFallbackProvider.html)
	*/
	enableLocaleFallbackWith(fallbacker) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_DataProvider_enable_locale_fallback_with_mv1(diplomatReceive.buffer, this.ffiValue, fallbacker.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
		} finally {
			diplomatReceive.free();
		}
	}
	constructor(symbol, ptr, selfEdge) {
		return this.#internalConstructor(...arguments);
	}
};
new FinalizationRegistry((ptr) => {
	wasm.icu4x_Calendar_destroy_mv1(ptr);
});
(class CalendarDateFromFieldsError {
	#value = void 0;
	static #values = new Map([
		["Unknown", 0],
		["OutOfRange", 1],
		["UnknownEra", 2],
		["MonthCodeInvalidSyntax", 3],
		["MonthCodeNotInCalendar", 4],
		["MonthCodeNotInYear", 5],
		["InconsistentYear", 6],
		["InconsistentMonth", 7],
		["NotEnoughFields", 8]
	]);
	static getAllEntries() {
		return CalendarDateFromFieldsError.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return CalendarDateFromFieldsError.#objectValues[arguments[1]];
		}
		if (value instanceof CalendarDateFromFieldsError) return value;
		let intVal = CalendarDateFromFieldsError.#values.get(value);
		if (intVal != null) return CalendarDateFromFieldsError.#objectValues[intVal];
		throw TypeError(value + " is not a CalendarDateFromFieldsError and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new CalendarDateFromFieldsError(value);
	}
	get value() {
		return [...CalendarDateFromFieldsError.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new CalendarDateFromFieldsError(internalConstructor, internalConstructor, 0),
		new CalendarDateFromFieldsError(internalConstructor, internalConstructor, 1),
		new CalendarDateFromFieldsError(internalConstructor, internalConstructor, 2),
		new CalendarDateFromFieldsError(internalConstructor, internalConstructor, 3),
		new CalendarDateFromFieldsError(internalConstructor, internalConstructor, 4),
		new CalendarDateFromFieldsError(internalConstructor, internalConstructor, 5),
		new CalendarDateFromFieldsError(internalConstructor, internalConstructor, 6),
		new CalendarDateFromFieldsError(internalConstructor, internalConstructor, 7),
		new CalendarDateFromFieldsError(internalConstructor, internalConstructor, 8)
	];
	static Unknown = CalendarDateFromFieldsError.#objectValues[0];
	static OutOfRange = CalendarDateFromFieldsError.#objectValues[1];
	static UnknownEra = CalendarDateFromFieldsError.#objectValues[2];
	static MonthCodeInvalidSyntax = CalendarDateFromFieldsError.#objectValues[3];
	static MonthCodeNotInCalendar = CalendarDateFromFieldsError.#objectValues[4];
	static MonthCodeNotInYear = CalendarDateFromFieldsError.#objectValues[5];
	static InconsistentYear = CalendarDateFromFieldsError.#objectValues[6];
	static InconsistentMonth = CalendarDateFromFieldsError.#objectValues[7];
	static NotEnoughFields = CalendarDateFromFieldsError.#objectValues[8];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class CalendarError {
	#value = void 0;
	static #values = new Map([
		["Unknown", 0],
		["OutOfRange", 1],
		["UnknownEra", 2],
		["UnknownMonthCode", 3]
	]);
	static getAllEntries() {
		return CalendarError.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return CalendarError.#objectValues[arguments[1]];
		}
		if (value instanceof CalendarError) return value;
		let intVal = CalendarError.#values.get(value);
		if (intVal != null) return CalendarError.#objectValues[intVal];
		throw TypeError(value + " is not a CalendarError and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new CalendarError(value);
	}
	get value() {
		return [...CalendarError.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new CalendarError(internalConstructor, internalConstructor, 0),
		new CalendarError(internalConstructor, internalConstructor, 1),
		new CalendarError(internalConstructor, internalConstructor, 2),
		new CalendarError(internalConstructor, internalConstructor, 3)
	];
	static Unknown = CalendarError.#objectValues[0];
	static OutOfRange = CalendarError.#objectValues[1];
	static UnknownEra = CalendarError.#objectValues[2];
	static UnknownMonthCode = CalendarError.#objectValues[3];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class Rfc9557ParseError {
	#value = void 0;
	static #values = new Map([
		["Unknown", 0],
		["InvalidSyntax", 1],
		["OutOfRange", 2],
		["MissingFields", 3],
		["UnknownCalendar", 4]
	]);
	static getAllEntries() {
		return Rfc9557ParseError.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return Rfc9557ParseError.#objectValues[arguments[1]];
		}
		if (value instanceof Rfc9557ParseError) return value;
		let intVal = Rfc9557ParseError.#values.get(value);
		if (intVal != null) return Rfc9557ParseError.#objectValues[intVal];
		throw TypeError(value + " is not a Rfc9557ParseError and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new Rfc9557ParseError(value);
	}
	get value() {
		return [...Rfc9557ParseError.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new Rfc9557ParseError(internalConstructor, internalConstructor, 0),
		new Rfc9557ParseError(internalConstructor, internalConstructor, 1),
		new Rfc9557ParseError(internalConstructor, internalConstructor, 2),
		new Rfc9557ParseError(internalConstructor, internalConstructor, 3),
		new Rfc9557ParseError(internalConstructor, internalConstructor, 4)
	];
	static Unknown = Rfc9557ParseError.#objectValues[0];
	static InvalidSyntax = Rfc9557ParseError.#objectValues[1];
	static OutOfRange = Rfc9557ParseError.#objectValues[2];
	static MissingFields = Rfc9557ParseError.#objectValues[3];
	static UnknownCalendar = Rfc9557ParseError.#objectValues[4];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class Weekday {
	#value = void 0;
	static #values = new Map([
		["Monday", 1],
		["Tuesday", 2],
		["Wednesday", 3],
		["Thursday", 4],
		["Friday", 5],
		["Saturday", 6],
		["Sunday", 7]
	]);
	static getAllEntries() {
		return Weekday.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return Weekday.#objectValues[arguments[1]];
		}
		if (value instanceof Weekday) return value;
		let intVal = Weekday.#values.get(value);
		if (intVal != null) return Weekday.#objectValues[intVal];
		throw TypeError(value + " is not a Weekday and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new Weekday(value);
	}
	get value() {
		for (let entry of Weekday.#values) if (entry[1] == this.#value) return entry[0];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = {
		[1]: new Weekday(internalConstructor, internalConstructor, 1),
		[2]: new Weekday(internalConstructor, internalConstructor, 2),
		[3]: new Weekday(internalConstructor, internalConstructor, 3),
		[4]: new Weekday(internalConstructor, internalConstructor, 4),
		[5]: new Weekday(internalConstructor, internalConstructor, 5),
		[6]: new Weekday(internalConstructor, internalConstructor, 6),
		[7]: new Weekday(internalConstructor, internalConstructor, 7)
	};
	static Monday = Weekday.#objectValues[1];
	static Tuesday = Weekday.#objectValues[2];
	static Wednesday = Weekday.#objectValues[3];
	static Thursday = Weekday.#objectValues[4];
	static Friday = Weekday.#objectValues[5];
	static Saturday = Weekday.#objectValues[6];
	static Sunday = Weekday.#objectValues[7];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_IsoDate_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_Date_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_Time_destroy_mv1(ptr);
});
(class TimeZoneVariant {
	#value = void 0;
	static #values = new Map([["Standard", 0], ["Daylight", 1]]);
	static getAllEntries() {
		return TimeZoneVariant.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return TimeZoneVariant.#objectValues[arguments[1]];
		}
		if (value instanceof TimeZoneVariant) return value;
		let intVal = TimeZoneVariant.#values.get(value);
		if (intVal != null) return TimeZoneVariant.#objectValues[intVal];
		throw TypeError(value + " is not a TimeZoneVariant and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new TimeZoneVariant(value);
	}
	get value() {
		return [...TimeZoneVariant.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [new TimeZoneVariant(internalConstructor, internalConstructor, 0), new TimeZoneVariant(internalConstructor, internalConstructor, 1)];
	static Standard = TimeZoneVariant.#objectValues[0];
	static Daylight = TimeZoneVariant.#objectValues[1];
	/**
	* See the [Rust documentation for `from_rearguard_isdst`](https://docs.rs/icu/2.1.1/icu/time/zone/enum.TimeZoneVariant.html#method.from_rearguard_isdst) for more information.
	*
	* See the [Rust documentation for `with_variant`](https://docs.rs/icu/2.1.1/icu/time/struct.TimeZoneInfo.html#method.with_variant) for more information.
	*
	* @deprecated type not needed anymore
	*/
	static fromRearguardIsdst(isdst) {
		const result = wasm.icu4x_TimeZoneVariant_from_rearguard_isdst_mv1(isdst);
		try {
			return new TimeZoneVariant(internalConstructor, result);
		} finally {}
	}
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_UtcOffset_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_VariantOffsetsCalculator_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_TimeZoneInfo_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_TimeZone_destroy_mv1(ptr);
});
//#endregion
//#region vendor/CodePointRangeIteratorResult.mjs
/**
* Result of a single iteration of {@link CodePointRangeIterator}.
* Logically can be considered to be an `Option<RangeInclusive<DiplomatChar>>`,
*
* `start` and `end` represent an inclusive range of code points `[start, end]`,
* and `done` will be true if the iterator has already finished. The last contentful
* iteration will NOT produce a range `done=true`, in other words `start` and `end` are useful
* values if and only if `done=false`.
*/
var CodePointRangeIteratorResult = class CodePointRangeIteratorResult {
	#start;
	get start() {
		return this.#start;
	}
	#end;
	get end() {
		return this.#end;
	}
	#done;
	get done() {
		return this.#done;
	}
	#internalConstructor(structObj, internalConstructor$9) {
		if (typeof structObj !== "object") throw new Error("CodePointRangeIteratorResult's constructor takes an object of CodePointRangeIteratorResult's fields.");
		if (internalConstructor$9 !== internalConstructor) throw new Error("CodePointRangeIteratorResult is an out struct and can only be created internally.");
		if ("start" in structObj) this.#start = structObj.start;
		else throw new Error("Missing required field start.");
		if ("end" in structObj) this.#end = structObj.end;
		else throw new Error("Missing required field end.");
		if ("done" in structObj) this.#done = structObj.done;
		else throw new Error("Missing required field done.");
		return this;
	}
	_intoFFI(functionCleanupArena, appendArrayMap) {
		let buffer = DiplomatBuf.struct(wasm, 12, 4);
		this._writeToArrayBuffer(wasm.memory.buffer, buffer.ptr, functionCleanupArena, appendArrayMap);
		functionCleanupArena.alloc(buffer);
		return buffer.ptr;
	}
	static _fromSuppliedValue(internalConstructor$8, obj) {
		if (internalConstructor$8 !== internalConstructor) throw new Error("_fromSuppliedValue cannot be called externally.");
		if (obj instanceof CodePointRangeIteratorResult) return obj;
		return CodePointRangeIteratorResult.fromFields(obj);
	}
	_writeToArrayBuffer(arrayBuffer, offset, functionCleanupArena, appendArrayMap) {
		writeToArrayBuffer(arrayBuffer, offset + 0, this.#start, Uint32Array);
		writeToArrayBuffer(arrayBuffer, offset + 4, this.#end, Uint32Array);
		writeToArrayBuffer(arrayBuffer, offset + 8, this.#done, Uint8Array);
	}
	static _fromFFI(internalConstructor$7, ptr) {
		if (internalConstructor$7 !== internalConstructor) throw new Error("CodePointRangeIteratorResult._fromFFI is not meant to be called externally. Please use the default constructor.");
		let structObj = {};
		structObj.start = new Uint32Array(wasm.memory.buffer, ptr, 1)[0];
		structObj.end = new Uint32Array(wasm.memory.buffer, ptr + 4, 1)[0];
		structObj.done = new Uint8Array(wasm.memory.buffer, ptr + 8, 1)[0] === 1;
		return new CodePointRangeIteratorResult(structObj, internalConstructor$7);
	}
	constructor(structObj, internalConstructor) {
		return this.#internalConstructor(...arguments);
	}
};
new FinalizationRegistry((ptr) => {
	wasm.icu4x_TimeZoneIterator_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_IanaParser_destroy_mv1(ptr);
});
(class BidiDirection {
	#value = void 0;
	static #values = new Map([
		["Ltr", 0],
		["Rtl", 1],
		["Mixed", 2]
	]);
	static getAllEntries() {
		return BidiDirection.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return BidiDirection.#objectValues[arguments[1]];
		}
		if (value instanceof BidiDirection) return value;
		let intVal = BidiDirection.#values.get(value);
		if (intVal != null) return BidiDirection.#objectValues[intVal];
		throw TypeError(value + " is not a BidiDirection and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new BidiDirection(value);
	}
	get value() {
		return [...BidiDirection.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new BidiDirection(internalConstructor, internalConstructor, 0),
		new BidiDirection(internalConstructor, internalConstructor, 1),
		new BidiDirection(internalConstructor, internalConstructor, 2)
	];
	static Ltr = BidiDirection.#objectValues[0];
	static Rtl = BidiDirection.#objectValues[1];
	static Mixed = BidiDirection.#objectValues[2];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_BidiParagraph_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_BidiInfo_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_ReorderedIndexMap_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_Bidi_destroy_mv1(ptr);
});
//#endregion
//#region vendor/CodePointRangeIterator.mjs
const CodePointRangeIterator_box_destroy_registry = new FinalizationRegistry((ptr) => {
	wasm.icu4x_CodePointRangeIterator_destroy_mv1(ptr);
});
/**
* An iterator over code point ranges, produced by `CodePointSetData` or
* one of the `CodePointMapData` types
*/
var CodePointRangeIterator = class {
	#ptr = null;
	#selfEdge = [];
	#aEdge = [];
	#internalConstructor(symbol, ptr, selfEdge, aEdge) {
		if (symbol !== internalConstructor) {
			console.error("CodePointRangeIterator is an Opaque type. You cannot call its constructor.");
			return;
		}
		this.#aEdge = aEdge;
		this.#ptr = ptr;
		this.#selfEdge = selfEdge;
		if (this.#selfEdge.length === 0) CodePointRangeIterator_box_destroy_registry.register(this, this.#ptr);
		return this;
	}
	/** @internal */
	get ffiValue() {
		return this.#ptr;
	}
	/**
	* Advance the iterator by one and return the next range.
	*
	* If the iterator is out of items, `done` will be true
	*/
	next() {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 12, 4, false);
		wasm.icu4x_CodePointRangeIterator_next_mv1(diplomatReceive.buffer, this.ffiValue);
		try {
			return CodePointRangeIteratorResult._fromFFI(internalConstructor, diplomatReceive.buffer);
		} finally {
			diplomatReceive.free();
		}
	}
	constructor(symbol, ptr, selfEdge, aEdge) {
		return this.#internalConstructor(...arguments);
	}
};
//#endregion
//#region vendor/CodePointSetData.mjs
const CodePointSetData_box_destroy_registry = new FinalizationRegistry((ptr) => {
	wasm.icu4x_CodePointSetData_destroy_mv1(ptr);
});
/**
* An ICU4X Unicode Set Property object, capable of querying whether a code point is contained in a set based on a Unicode property.
*
* See the [Rust documentation for `properties`](https://docs.rs/icu/2.1.1/icu/properties/index.html) for more information.
*
* See the [Rust documentation for `CodePointSetData`](https://docs.rs/icu/2.1.1/icu/properties/struct.CodePointSetData.html) for more information.
*
* See the [Rust documentation for `CodePointSetDataBorrowed`](https://docs.rs/icu/2.1.1/icu/properties/struct.CodePointSetDataBorrowed.html) for more information.
*/
var CodePointSetData = class CodePointSetData {
	#ptr = null;
	#selfEdge = [];
	#internalConstructor(symbol, ptr, selfEdge) {
		if (symbol !== internalConstructor) {
			console.error("CodePointSetData is an Opaque type. You cannot call its constructor.");
			return;
		}
		this.#ptr = ptr;
		this.#selfEdge = selfEdge;
		if (this.#selfEdge.length === 0) CodePointSetData_box_destroy_registry.register(this, this.#ptr);
		return this;
	}
	/** @internal */
	get ffiValue() {
		return this.#ptr;
	}
	/**
	* Checks whether the code point is in the set.
	*
	* See the [Rust documentation for `contains`](https://docs.rs/icu/2.1.1/icu/properties/struct.CodePointSetDataBorrowed.html#method.contains) for more information.
	*/
	contains(cp) {
		const result = wasm.icu4x_CodePointSetData_contains_mv1(this.ffiValue, cp);
		try {
			return result;
		} finally {}
	}
	/**
	* Produces an iterator over ranges of code points contained in this set
	*
	* See the [Rust documentation for `iter_ranges`](https://docs.rs/icu/2.1.1/icu/properties/struct.CodePointSetDataBorrowed.html#method.iter_ranges) for more information.
	*/
	iterRanges() {
		let aEdges = [this];
		const result = wasm.icu4x_CodePointSetData_iter_ranges_mv1(this.ffiValue);
		try {
			return new CodePointRangeIterator(internalConstructor, result, [], aEdges);
		} finally {}
	}
	/**
	* Produces an iterator over ranges of code points not contained in this set
	*
	* See the [Rust documentation for `iter_ranges_complemented`](https://docs.rs/icu/2.1.1/icu/properties/struct.CodePointSetDataBorrowed.html#method.iter_ranges_complemented) for more information.
	*/
	iterRangesComplemented() {
		let aEdges = [this];
		const result = wasm.icu4x_CodePointSetData_iter_ranges_complemented_mv1(this.ffiValue);
		try {
			return new CodePointRangeIterator(internalConstructor, result, [], aEdges);
		} finally {}
	}
	/**
	* Produces a set for obtaining General Category Group values
	* which is a mask with the same format as the `U_GC_XX_MASK` mask in ICU4C, using compiled data.
	*
	* See the [Rust documentation for `GeneralCategoryGroup`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GeneralCategoryGroup.html) for more information.
	*
	* See the [Rust documentation for `get_set_for_value_group`](https://docs.rs/icu/2.1.1/icu/properties/struct.CodePointMapDataBorrowed.html#method.get_set_for_value_group) for more information.
	*/
	static createGeneralCategoryGroup(group) {
		let functionCleanupArena = new CleanupArena();
		const result = wasm.icu4x_CodePointSetData_create_general_category_group_mv1(GeneralCategoryGroup._fromSuppliedValue(internalConstructor, group)._intoFFI(functionCleanupArena, {}, false));
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {
			functionCleanupArena.free();
		}
	}
	/**
	* Produces a set for obtaining General Category Group values
	* which is a mask with the same format as the `U_GC_XX_MASK` mask in ICU4C, using a provided data source.
	*
	* See the [Rust documentation for `GeneralCategoryGroup`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GeneralCategoryGroup.html) for more information.
	*
	* See the [Rust documentation for `get_set_for_value_group`](https://docs.rs/icu/2.1.1/icu/properties/struct.CodePointMapDataBorrowed.html#method.get_set_for_value_group) for more information.
	*/
	static createGeneralCategoryGroupWithProvider(provider, group) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_general_category_group_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue, group);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Ascii_Hex_Digit` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static asciiHexDigitForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_ascii_hex_digit_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Ascii_Hex_Digit` property, using compiled data.
	*
	* See the [Rust documentation for `AsciiHexDigit`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.AsciiHexDigit.html) for more information.
	*/
	static createAsciiHexDigit() {
		const result = wasm.icu4x_CodePointSetData_create_ascii_hex_digit_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Ascii_Hex_Digit` property, using a particular data source.
	*
	* See the [Rust documentation for `AsciiHexDigit`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.AsciiHexDigit.html) for more information.
	*/
	static createAsciiHexDigitWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_ascii_hex_digit_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Alnum` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static alnumForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_alnum_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Alnum` property, using compiled data.
	*
	* See the [Rust documentation for `Alnum`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Alnum.html) for more information.
	*/
	static createAlnum() {
		const result = wasm.icu4x_CodePointSetData_create_alnum_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Alnum` property, using a particular data source.
	*
	* See the [Rust documentation for `Alnum`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Alnum.html) for more information.
	*/
	static createAlnumWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_alnum_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Alphabetic` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static alphabeticForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_alphabetic_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Alphabetic` property, using compiled data.
	*
	* See the [Rust documentation for `Alphabetic`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Alphabetic.html) for more information.
	*/
	static createAlphabetic() {
		const result = wasm.icu4x_CodePointSetData_create_alphabetic_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Alphabetic` property, using a particular data source.
	*
	* See the [Rust documentation for `Alphabetic`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Alphabetic.html) for more information.
	*/
	static createAlphabeticWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_alphabetic_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Bidi_Control` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static bidiControlForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_bidi_control_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Bidi_Control` property, using compiled data.
	*
	* See the [Rust documentation for `BidiControl`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.BidiControl.html) for more information.
	*/
	static createBidiControl() {
		const result = wasm.icu4x_CodePointSetData_create_bidi_control_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Bidi_Control` property, using a particular data source.
	*
	* See the [Rust documentation for `BidiControl`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.BidiControl.html) for more information.
	*/
	static createBidiControlWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_bidi_control_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Bidi_Mirrored` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static bidiMirroredForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_bidi_mirrored_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Bidi_Mirrored` property, using compiled data.
	*
	* See the [Rust documentation for `BidiMirrored`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.BidiMirrored.html) for more information.
	*/
	static createBidiMirrored() {
		const result = wasm.icu4x_CodePointSetData_create_bidi_mirrored_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Bidi_Mirrored` property, using a particular data source.
	*
	* See the [Rust documentation for `BidiMirrored`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.BidiMirrored.html) for more information.
	*/
	static createBidiMirroredWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_bidi_mirrored_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Blank` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static blankForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_blank_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Blank` property, using compiled data.
	*
	* See the [Rust documentation for `Blank`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Blank.html) for more information.
	*/
	static createBlank() {
		const result = wasm.icu4x_CodePointSetData_create_blank_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Blank` property, using a particular data source.
	*
	* See the [Rust documentation for `Blank`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Blank.html) for more information.
	*/
	static createBlankWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_blank_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Cased` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static casedForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_cased_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Cased` property, using compiled data.
	*
	* See the [Rust documentation for `Cased`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Cased.html) for more information.
	*/
	static createCased() {
		const result = wasm.icu4x_CodePointSetData_create_cased_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Cased` property, using a particular data source.
	*
	* See the [Rust documentation for `Cased`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Cased.html) for more information.
	*/
	static createCasedWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_cased_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Case_Ignorable` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static caseIgnorableForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_case_ignorable_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Case_Ignorable` property, using compiled data.
	*
	* See the [Rust documentation for `CaseIgnorable`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.CaseIgnorable.html) for more information.
	*/
	static createCaseIgnorable() {
		const result = wasm.icu4x_CodePointSetData_create_case_ignorable_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Case_Ignorable` property, using a particular data source.
	*
	* See the [Rust documentation for `CaseIgnorable`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.CaseIgnorable.html) for more information.
	*/
	static createCaseIgnorableWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_case_ignorable_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Full_Composition_Exclusion` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static fullCompositionExclusionForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_full_composition_exclusion_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Full_Composition_Exclusion` property, using compiled data.
	*
	* See the [Rust documentation for `FullCompositionExclusion`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.FullCompositionExclusion.html) for more information.
	*/
	static createFullCompositionExclusion() {
		const result = wasm.icu4x_CodePointSetData_create_full_composition_exclusion_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Full_Composition_Exclusion` property, using a particular data source.
	*
	* See the [Rust documentation for `FullCompositionExclusion`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.FullCompositionExclusion.html) for more information.
	*/
	static createFullCompositionExclusionWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_full_composition_exclusion_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Changes_When_Casefolded` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static changesWhenCasefoldedForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_changes_when_casefolded_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Changes_When_Casefolded` property, using compiled data.
	*
	* See the [Rust documentation for `ChangesWhenCasefolded`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.ChangesWhenCasefolded.html) for more information.
	*/
	static createChangesWhenCasefolded() {
		const result = wasm.icu4x_CodePointSetData_create_changes_when_casefolded_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Changes_When_Casefolded` property, using a particular data source.
	*
	* See the [Rust documentation for `ChangesWhenCasefolded`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.ChangesWhenCasefolded.html) for more information.
	*/
	static createChangesWhenCasefoldedWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_changes_when_casefolded_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Changes_When_Casemapped` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static changesWhenCasemappedForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_changes_when_casemapped_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Changes_When_Casemapped` property, using compiled data.
	*
	* See the [Rust documentation for `ChangesWhenCasemapped`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.ChangesWhenCasemapped.html) for more information.
	*/
	static createChangesWhenCasemapped() {
		const result = wasm.icu4x_CodePointSetData_create_changes_when_casemapped_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Changes_When_Casemapped` property, using a particular data source.
	*
	* See the [Rust documentation for `ChangesWhenCasemapped`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.ChangesWhenCasemapped.html) for more information.
	*/
	static createChangesWhenCasemappedWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_changes_when_casemapped_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Changes_When_Nfkc_Casefolded` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static changesWhenNfkcCasefoldedForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_changes_when_nfkc_casefolded_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Changes_When_Nfkc_Casefolded` property, using compiled data.
	*
	* See the [Rust documentation for `ChangesWhenNfkcCasefolded`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.ChangesWhenNfkcCasefolded.html) for more information.
	*/
	static createChangesWhenNfkcCasefolded() {
		const result = wasm.icu4x_CodePointSetData_create_changes_when_nfkc_casefolded_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Changes_When_Nfkc_Casefolded` property, using a particular data source.
	*
	* See the [Rust documentation for `ChangesWhenNfkcCasefolded`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.ChangesWhenNfkcCasefolded.html) for more information.
	*/
	static createChangesWhenNfkcCasefoldedWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_changes_when_nfkc_casefolded_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Changes_When_Lowercased` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static changesWhenLowercasedForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_changes_when_lowercased_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Changes_When_Lowercased` property, using compiled data.
	*
	* See the [Rust documentation for `ChangesWhenLowercased`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.ChangesWhenLowercased.html) for more information.
	*/
	static createChangesWhenLowercased() {
		const result = wasm.icu4x_CodePointSetData_create_changes_when_lowercased_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Changes_When_Lowercased` property, using a particular data source.
	*
	* See the [Rust documentation for `ChangesWhenLowercased`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.ChangesWhenLowercased.html) for more information.
	*/
	static createChangesWhenLowercasedWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_changes_when_lowercased_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Changes_When_Titlecased` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static changesWhenTitlecasedForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_changes_when_titlecased_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Changes_When_Titlecased` property, using compiled data.
	*
	* See the [Rust documentation for `ChangesWhenTitlecased`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.ChangesWhenTitlecased.html) for more information.
	*/
	static createChangesWhenTitlecased() {
		const result = wasm.icu4x_CodePointSetData_create_changes_when_titlecased_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Changes_When_Titlecased` property, using a particular data source.
	*
	* See the [Rust documentation for `ChangesWhenTitlecased`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.ChangesWhenTitlecased.html) for more information.
	*/
	static createChangesWhenTitlecasedWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_changes_when_titlecased_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Changes_When_Uppercased` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static changesWhenUppercasedForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_changes_when_uppercased_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Changes_When_Uppercased` property, using compiled data.
	*
	* See the [Rust documentation for `ChangesWhenUppercased`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.ChangesWhenUppercased.html) for more information.
	*/
	static createChangesWhenUppercased() {
		const result = wasm.icu4x_CodePointSetData_create_changes_when_uppercased_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Changes_When_Uppercased` property, using a particular data source.
	*
	* See the [Rust documentation for `ChangesWhenUppercased`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.ChangesWhenUppercased.html) for more information.
	*/
	static createChangesWhenUppercasedWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_changes_when_uppercased_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Dash` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static dashForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_dash_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Dash` property, using compiled data.
	*
	* See the [Rust documentation for `Dash`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Dash.html) for more information.
	*/
	static createDash() {
		const result = wasm.icu4x_CodePointSetData_create_dash_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Dash` property, using a particular data source.
	*
	* See the [Rust documentation for `Dash`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Dash.html) for more information.
	*/
	static createDashWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_dash_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Deprecated` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static deprecatedForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_deprecated_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Deprecated` property, using compiled data.
	*
	* See the [Rust documentation for `Deprecated`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Deprecated.html) for more information.
	*/
	static createDeprecated() {
		const result = wasm.icu4x_CodePointSetData_create_deprecated_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Deprecated` property, using a particular data source.
	*
	* See the [Rust documentation for `Deprecated`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Deprecated.html) for more information.
	*/
	static createDeprecatedWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_deprecated_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Default_Ignorable_Code_Point` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static defaultIgnorableCodePointForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_default_ignorable_code_point_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Default_Ignorable_Code_Point` property, using compiled data.
	*
	* See the [Rust documentation for `DefaultIgnorableCodePoint`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.DefaultIgnorableCodePoint.html) for more information.
	*/
	static createDefaultIgnorableCodePoint() {
		const result = wasm.icu4x_CodePointSetData_create_default_ignorable_code_point_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Default_Ignorable_Code_Point` property, using a particular data source.
	*
	* See the [Rust documentation for `DefaultIgnorableCodePoint`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.DefaultIgnorableCodePoint.html) for more information.
	*/
	static createDefaultIgnorableCodePointWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_default_ignorable_code_point_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Diacritic` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static diacriticForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_diacritic_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Diacritic` property, using compiled data.
	*
	* See the [Rust documentation for `Diacritic`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Diacritic.html) for more information.
	*/
	static createDiacritic() {
		const result = wasm.icu4x_CodePointSetData_create_diacritic_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Diacritic` property, using a particular data source.
	*
	* See the [Rust documentation for `Diacritic`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Diacritic.html) for more information.
	*/
	static createDiacriticWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_diacritic_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Emoji_Modifier_Base` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static emojiModifierBaseForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_emoji_modifier_base_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Emoji_Modifier_Base` property, using compiled data.
	*
	* See the [Rust documentation for `EmojiModifierBase`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.EmojiModifierBase.html) for more information.
	*/
	static createEmojiModifierBase() {
		const result = wasm.icu4x_CodePointSetData_create_emoji_modifier_base_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Emoji_Modifier_Base` property, using a particular data source.
	*
	* See the [Rust documentation for `EmojiModifierBase`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.EmojiModifierBase.html) for more information.
	*/
	static createEmojiModifierBaseWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_emoji_modifier_base_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Emoji_Component` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static emojiComponentForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_emoji_component_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Emoji_Component` property, using compiled data.
	*
	* See the [Rust documentation for `EmojiComponent`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.EmojiComponent.html) for more information.
	*/
	static createEmojiComponent() {
		const result = wasm.icu4x_CodePointSetData_create_emoji_component_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Emoji_Component` property, using a particular data source.
	*
	* See the [Rust documentation for `EmojiComponent`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.EmojiComponent.html) for more information.
	*/
	static createEmojiComponentWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_emoji_component_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Emoji_Modifier` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static emojiModifierForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_emoji_modifier_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Emoji_Modifier` property, using compiled data.
	*
	* See the [Rust documentation for `EmojiModifier`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.EmojiModifier.html) for more information.
	*/
	static createEmojiModifier() {
		const result = wasm.icu4x_CodePointSetData_create_emoji_modifier_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Emoji_Modifier` property, using a particular data source.
	*
	* See the [Rust documentation for `EmojiModifier`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.EmojiModifier.html) for more information.
	*/
	static createEmojiModifierWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_emoji_modifier_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Emoji` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static emojiForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_emoji_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Emoji` property, using compiled data.
	*
	* See the [Rust documentation for `Emoji`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Emoji.html) for more information.
	*/
	static createEmoji() {
		const result = wasm.icu4x_CodePointSetData_create_emoji_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Emoji` property, using a particular data source.
	*
	* See the [Rust documentation for `Emoji`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Emoji.html) for more information.
	*/
	static createEmojiWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_emoji_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Emoji_Presentation` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static emojiPresentationForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_emoji_presentation_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Emoji_Presentation` property, using compiled data.
	*
	* See the [Rust documentation for `EmojiPresentation`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.EmojiPresentation.html) for more information.
	*/
	static createEmojiPresentation() {
		const result = wasm.icu4x_CodePointSetData_create_emoji_presentation_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Emoji_Presentation` property, using a particular data source.
	*
	* See the [Rust documentation for `EmojiPresentation`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.EmojiPresentation.html) for more information.
	*/
	static createEmojiPresentationWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_emoji_presentation_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Extender` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static extenderForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_extender_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Extender` property, using compiled data.
	*
	* See the [Rust documentation for `Extender`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Extender.html) for more information.
	*/
	static createExtender() {
		const result = wasm.icu4x_CodePointSetData_create_extender_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Extender` property, using a particular data source.
	*
	* See the [Rust documentation for `Extender`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Extender.html) for more information.
	*/
	static createExtenderWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_extender_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Extended_Pictographic` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static extendedPictographicForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_extended_pictographic_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Extended_Pictographic` property, using compiled data.
	*
	* See the [Rust documentation for `ExtendedPictographic`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.ExtendedPictographic.html) for more information.
	*/
	static createExtendedPictographic() {
		const result = wasm.icu4x_CodePointSetData_create_extended_pictographic_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Extended_Pictographic` property, using a particular data source.
	*
	* See the [Rust documentation for `ExtendedPictographic`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.ExtendedPictographic.html) for more information.
	*/
	static createExtendedPictographicWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_extended_pictographic_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Graph` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static graphForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_graph_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Graph` property, using compiled data.
	*
	* See the [Rust documentation for `Graph`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Graph.html) for more information.
	*/
	static createGraph() {
		const result = wasm.icu4x_CodePointSetData_create_graph_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Graph` property, using a particular data source.
	*
	* See the [Rust documentation for `Graph`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Graph.html) for more information.
	*/
	static createGraphWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_graph_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Grapheme_Base` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static graphemeBaseForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_grapheme_base_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Grapheme_Base` property, using compiled data.
	*
	* See the [Rust documentation for `GraphemeBase`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GraphemeBase.html) for more information.
	*/
	static createGraphemeBase() {
		const result = wasm.icu4x_CodePointSetData_create_grapheme_base_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Grapheme_Base` property, using a particular data source.
	*
	* See the [Rust documentation for `GraphemeBase`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GraphemeBase.html) for more information.
	*/
	static createGraphemeBaseWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_grapheme_base_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Grapheme_Extend` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static graphemeExtendForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_grapheme_extend_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Grapheme_Extend` property, using compiled data.
	*
	* See the [Rust documentation for `GraphemeExtend`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GraphemeExtend.html) for more information.
	*/
	static createGraphemeExtend() {
		const result = wasm.icu4x_CodePointSetData_create_grapheme_extend_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Grapheme_Extend` property, using a particular data source.
	*
	* See the [Rust documentation for `GraphemeExtend`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GraphemeExtend.html) for more information.
	*/
	static createGraphemeExtendWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_grapheme_extend_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Grapheme_Link` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static graphemeLinkForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_grapheme_link_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Grapheme_Link` property, using compiled data.
	*
	* See the [Rust documentation for `GraphemeLink`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GraphemeLink.html) for more information.
	*/
	static createGraphemeLink() {
		const result = wasm.icu4x_CodePointSetData_create_grapheme_link_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Grapheme_Link` property, using a particular data source.
	*
	* See the [Rust documentation for `GraphemeLink`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GraphemeLink.html) for more information.
	*/
	static createGraphemeLinkWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_grapheme_link_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Hex_Digit` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static hexDigitForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_hex_digit_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Hex_Digit` property, using compiled data.
	*
	* See the [Rust documentation for `HexDigit`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.HexDigit.html) for more information.
	*/
	static createHexDigit() {
		const result = wasm.icu4x_CodePointSetData_create_hex_digit_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Hex_Digit` property, using a particular data source.
	*
	* See the [Rust documentation for `HexDigit`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.HexDigit.html) for more information.
	*/
	static createHexDigitWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_hex_digit_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Hyphen` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static hyphenForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_hyphen_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Hyphen` property, using compiled data.
	*
	* See the [Rust documentation for `Hyphen`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Hyphen.html) for more information.
	*/
	static createHyphen() {
		const result = wasm.icu4x_CodePointSetData_create_hyphen_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Hyphen` property, using a particular data source.
	*
	* See the [Rust documentation for `Hyphen`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Hyphen.html) for more information.
	*/
	static createHyphenWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_hyphen_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `ID_Compat_Math_Continue` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static idCompatMathContinueForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_id_compat_math_continue_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `ID_Compat_Math_Continue` property, using compiled data.
	*
	* See the [Rust documentation for `IdCompatMathContinue`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.IdCompatMathContinue.html) for more information.
	*/
	static createIdCompatMathContinue() {
		const result = wasm.icu4x_CodePointSetData_create_id_compat_math_continue_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `ID_Compat_Math_Continue` property, using a particular data source.
	*
	* See the [Rust documentation for `IdCompatMathContinue`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.IdCompatMathContinue.html) for more information.
	*/
	static createIdCompatMathContinueWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_id_compat_math_continue_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `ID_Compat_Math_Start` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static idCompatMathStartForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_id_compat_math_start_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `ID_Compat_Math_Start` property, using compiled data.
	*
	* See the [Rust documentation for `IdCompatMathStart`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.IdCompatMathStart.html) for more information.
	*/
	static createIdCompatMathStart() {
		const result = wasm.icu4x_CodePointSetData_create_id_compat_math_start_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `ID_Compat_Math_Start` property, using a particular data source.
	*
	* See the [Rust documentation for `IdCompatMathStart`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.IdCompatMathStart.html) for more information.
	*/
	static createIdCompatMathStartWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_id_compat_math_start_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Id_Continue` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static idContinueForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_id_continue_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Id_Continue` property, using compiled data.
	*
	* See the [Rust documentation for `IdContinue`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.IdContinue.html) for more information.
	*/
	static createIdContinue() {
		const result = wasm.icu4x_CodePointSetData_create_id_continue_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Id_Continue` property, using a particular data source.
	*
	* See the [Rust documentation for `IdContinue`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.IdContinue.html) for more information.
	*/
	static createIdContinueWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_id_continue_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Ideographic` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static ideographicForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_ideographic_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Ideographic` property, using compiled data.
	*
	* See the [Rust documentation for `Ideographic`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Ideographic.html) for more information.
	*/
	static createIdeographic() {
		const result = wasm.icu4x_CodePointSetData_create_ideographic_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Ideographic` property, using a particular data source.
	*
	* See the [Rust documentation for `Ideographic`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Ideographic.html) for more information.
	*/
	static createIdeographicWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_ideographic_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Id_Start` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static idStartForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_id_start_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Id_Start` property, using compiled data.
	*
	* See the [Rust documentation for `IdStart`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.IdStart.html) for more information.
	*/
	static createIdStart() {
		const result = wasm.icu4x_CodePointSetData_create_id_start_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Id_Start` property, using a particular data source.
	*
	* See the [Rust documentation for `IdStart`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.IdStart.html) for more information.
	*/
	static createIdStartWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_id_start_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Ids_Binary_Operator` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static idsBinaryOperatorForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_ids_binary_operator_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Ids_Binary_Operator` property, using compiled data.
	*
	* See the [Rust documentation for `IdsBinaryOperator`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.IdsBinaryOperator.html) for more information.
	*/
	static createIdsBinaryOperator() {
		const result = wasm.icu4x_CodePointSetData_create_ids_binary_operator_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Ids_Binary_Operator` property, using a particular data source.
	*
	* See the [Rust documentation for `IdsBinaryOperator`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.IdsBinaryOperator.html) for more information.
	*/
	static createIdsBinaryOperatorWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_ids_binary_operator_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Ids_Trinary_Operator` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static idsTrinaryOperatorForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_ids_trinary_operator_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Ids_Trinary_Operator` property, using compiled data.
	*
	* See the [Rust documentation for `IdsTrinaryOperator`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.IdsTrinaryOperator.html) for more information.
	*/
	static createIdsTrinaryOperator() {
		const result = wasm.icu4x_CodePointSetData_create_ids_trinary_operator_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Ids_Trinary_Operator` property, using a particular data source.
	*
	* See the [Rust documentation for `IdsTrinaryOperator`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.IdsTrinaryOperator.html) for more information.
	*/
	static createIdsTrinaryOperatorWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_ids_trinary_operator_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Ids_Unary_Operator` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static idsUnaryOperatorForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_ids_unary_operator_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Ids_Unary_Operator` property, using compiled data.
	*
	* See the [Rust documentation for `IdsUnaryOperator`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.IdsUnaryOperator.html) for more information.
	*/
	static createIdsUnaryOperator() {
		const result = wasm.icu4x_CodePointSetData_create_ids_unary_operator_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Ids_Unary_Operator` property, using a particular data source.
	*
	* See the [Rust documentation for `IdsUnaryOperator`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.IdsUnaryOperator.html) for more information.
	*/
	static createIdsUnaryOperatorWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_ids_unary_operator_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Join_Control` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static joinControlForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_join_control_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Join_Control` property, using compiled data.
	*
	* See the [Rust documentation for `JoinControl`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.JoinControl.html) for more information.
	*/
	static createJoinControl() {
		const result = wasm.icu4x_CodePointSetData_create_join_control_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Join_Control` property, using a particular data source.
	*
	* See the [Rust documentation for `JoinControl`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.JoinControl.html) for more information.
	*/
	static createJoinControlWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_join_control_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Logical_Order_Exception` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static logicalOrderExceptionForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_logical_order_exception_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Logical_Order_Exception` property, using compiled data.
	*
	* See the [Rust documentation for `LogicalOrderException`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.LogicalOrderException.html) for more information.
	*/
	static createLogicalOrderException() {
		const result = wasm.icu4x_CodePointSetData_create_logical_order_exception_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Logical_Order_Exception` property, using a particular data source.
	*
	* See the [Rust documentation for `LogicalOrderException`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.LogicalOrderException.html) for more information.
	*/
	static createLogicalOrderExceptionWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_logical_order_exception_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Lowercase` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static lowercaseForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_lowercase_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Lowercase` property, using compiled data.
	*
	* See the [Rust documentation for `Lowercase`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Lowercase.html) for more information.
	*/
	static createLowercase() {
		const result = wasm.icu4x_CodePointSetData_create_lowercase_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Lowercase` property, using a particular data source.
	*
	* See the [Rust documentation for `Lowercase`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Lowercase.html) for more information.
	*/
	static createLowercaseWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_lowercase_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Math` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static mathForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_math_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Math` property, using compiled data.
	*
	* See the [Rust documentation for `Math`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Math.html) for more information.
	*/
	static createMath() {
		const result = wasm.icu4x_CodePointSetData_create_math_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Math` property, using a particular data source.
	*
	* See the [Rust documentation for `Math`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Math.html) for more information.
	*/
	static createMathWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_math_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Modifier_Combining_mark` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static modifierCombiningMarkForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_modifier_combining_mark_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Modifier_Combining_mark` property, using compiled data.
	*
	* See the [Rust documentation for `ModifierCombiningMark`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.ModifierCombiningMark.html) for more information.
	*/
	static createModifierCombiningMark() {
		const result = wasm.icu4x_CodePointSetData_create_modifier_combining_mark_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Modifier_Combining_mark` property, using a particular data source.
	*
	* See the [Rust documentation for `ModifierCombiningMark`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.ModifierCombiningMark.html) for more information.
	*/
	static createModifierCombiningMarkWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_modifier_combining_mark_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Noncharacter_Code_Point` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static noncharacterCodePointForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_noncharacter_code_point_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Noncharacter_Code_Point` property, using compiled data.
	*
	* See the [Rust documentation for `NoncharacterCodePoint`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.NoncharacterCodePoint.html) for more information.
	*/
	static createNoncharacterCodePoint() {
		const result = wasm.icu4x_CodePointSetData_create_noncharacter_code_point_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Noncharacter_Code_Point` property, using a particular data source.
	*
	* See the [Rust documentation for `NoncharacterCodePoint`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.NoncharacterCodePoint.html) for more information.
	*/
	static createNoncharacterCodePointWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_noncharacter_code_point_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Nfc_Inert` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static nfcInertForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_nfc_inert_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Nfc_Inert` property, using compiled data.
	*
	* See the [Rust documentation for `NfcInert`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.NfcInert.html) for more information.
	*/
	static createNfcInert() {
		const result = wasm.icu4x_CodePointSetData_create_nfc_inert_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Nfc_Inert` property, using a particular data source.
	*
	* See the [Rust documentation for `NfcInert`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.NfcInert.html) for more information.
	*/
	static createNfcInertWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_nfc_inert_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Nfd_Inert` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static nfdInertForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_nfd_inert_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Nfd_Inert` property, using compiled data.
	*
	* See the [Rust documentation for `NfdInert`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.NfdInert.html) for more information.
	*/
	static createNfdInert() {
		const result = wasm.icu4x_CodePointSetData_create_nfd_inert_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Nfd_Inert` property, using a particular data source.
	*
	* See the [Rust documentation for `NfdInert`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.NfdInert.html) for more information.
	*/
	static createNfdInertWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_nfd_inert_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Nfkc_Inert` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static nfkcInertForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_nfkc_inert_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Nfkc_Inert` property, using compiled data.
	*
	* See the [Rust documentation for `NfkcInert`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.NfkcInert.html) for more information.
	*/
	static createNfkcInert() {
		const result = wasm.icu4x_CodePointSetData_create_nfkc_inert_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Nfkc_Inert` property, using a particular data source.
	*
	* See the [Rust documentation for `NfkcInert`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.NfkcInert.html) for more information.
	*/
	static createNfkcInertWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_nfkc_inert_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Nfkd_Inert` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static nfkdInertForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_nfkd_inert_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Nfkd_Inert` property, using compiled data.
	*
	* See the [Rust documentation for `NfkdInert`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.NfkdInert.html) for more information.
	*/
	static createNfkdInert() {
		const result = wasm.icu4x_CodePointSetData_create_nfkd_inert_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Nfkd_Inert` property, using a particular data source.
	*
	* See the [Rust documentation for `NfkdInert`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.NfkdInert.html) for more information.
	*/
	static createNfkdInertWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_nfkd_inert_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Pattern_Syntax` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static patternSyntaxForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_pattern_syntax_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Pattern_Syntax` property, using compiled data.
	*
	* See the [Rust documentation for `PatternSyntax`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.PatternSyntax.html) for more information.
	*/
	static createPatternSyntax() {
		const result = wasm.icu4x_CodePointSetData_create_pattern_syntax_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Pattern_Syntax` property, using a particular data source.
	*
	* See the [Rust documentation for `PatternSyntax`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.PatternSyntax.html) for more information.
	*/
	static createPatternSyntaxWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_pattern_syntax_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Pattern_White_Space` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static patternWhiteSpaceForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_pattern_white_space_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Pattern_White_Space` property, using compiled data.
	*
	* See the [Rust documentation for `PatternWhiteSpace`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.PatternWhiteSpace.html) for more information.
	*/
	static createPatternWhiteSpace() {
		const result = wasm.icu4x_CodePointSetData_create_pattern_white_space_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Pattern_White_Space` property, using a particular data source.
	*
	* See the [Rust documentation for `PatternWhiteSpace`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.PatternWhiteSpace.html) for more information.
	*/
	static createPatternWhiteSpaceWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_pattern_white_space_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Prepended_Concatenation_Mark` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static prependedConcatenationMarkForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_prepended_concatenation_mark_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Prepended_Concatenation_Mark` property, using compiled data.
	*
	* See the [Rust documentation for `PrependedConcatenationMark`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.PrependedConcatenationMark.html) for more information.
	*/
	static createPrependedConcatenationMark() {
		const result = wasm.icu4x_CodePointSetData_create_prepended_concatenation_mark_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Prepended_Concatenation_Mark` property, using a particular data source.
	*
	* See the [Rust documentation for `PrependedConcatenationMark`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.PrependedConcatenationMark.html) for more information.
	*/
	static createPrependedConcatenationMarkWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_prepended_concatenation_mark_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Print` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static printForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_print_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Print` property, using compiled data.
	*
	* See the [Rust documentation for `Print`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Print.html) for more information.
	*/
	static createPrint() {
		const result = wasm.icu4x_CodePointSetData_create_print_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Print` property, using a particular data source.
	*
	* See the [Rust documentation for `Print`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Print.html) for more information.
	*/
	static createPrintWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_print_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Quotation_Mark` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static quotationMarkForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_quotation_mark_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Quotation_Mark` property, using compiled data.
	*
	* See the [Rust documentation for `QuotationMark`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.QuotationMark.html) for more information.
	*/
	static createQuotationMark() {
		const result = wasm.icu4x_CodePointSetData_create_quotation_mark_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Quotation_Mark` property, using a particular data source.
	*
	* See the [Rust documentation for `QuotationMark`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.QuotationMark.html) for more information.
	*/
	static createQuotationMarkWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_quotation_mark_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Radical` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static radicalForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_radical_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Radical` property, using compiled data.
	*
	* See the [Rust documentation for `Radical`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Radical.html) for more information.
	*/
	static createRadical() {
		const result = wasm.icu4x_CodePointSetData_create_radical_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Radical` property, using a particular data source.
	*
	* See the [Rust documentation for `Radical`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Radical.html) for more information.
	*/
	static createRadicalWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_radical_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Regional_Indicator` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static regionalIndicatorForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_regional_indicator_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Regional_Indicator` property, using compiled data.
	*
	* See the [Rust documentation for `RegionalIndicator`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.RegionalIndicator.html) for more information.
	*/
	static createRegionalIndicator() {
		const result = wasm.icu4x_CodePointSetData_create_regional_indicator_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Regional_Indicator` property, using a particular data source.
	*
	* See the [Rust documentation for `RegionalIndicator`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.RegionalIndicator.html) for more information.
	*/
	static createRegionalIndicatorWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_regional_indicator_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Soft_Dotted` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static softDottedForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_soft_dotted_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Soft_Dotted` property, using compiled data.
	*
	* See the [Rust documentation for `SoftDotted`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.SoftDotted.html) for more information.
	*/
	static createSoftDotted() {
		const result = wasm.icu4x_CodePointSetData_create_soft_dotted_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Soft_Dotted` property, using a particular data source.
	*
	* See the [Rust documentation for `SoftDotted`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.SoftDotted.html) for more information.
	*/
	static createSoftDottedWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_soft_dotted_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Segment_Starter` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static segmentStarterForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_segment_starter_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Segment_Starter` property, using compiled data.
	*
	* See the [Rust documentation for `SegmentStarter`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.SegmentStarter.html) for more information.
	*/
	static createSegmentStarter() {
		const result = wasm.icu4x_CodePointSetData_create_segment_starter_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Segment_Starter` property, using a particular data source.
	*
	* See the [Rust documentation for `SegmentStarter`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.SegmentStarter.html) for more information.
	*/
	static createSegmentStarterWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_segment_starter_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Case_Sensitive` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static caseSensitiveForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_case_sensitive_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Case_Sensitive` property, using compiled data.
	*
	* See the [Rust documentation for `CaseSensitive`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.CaseSensitive.html) for more information.
	*/
	static createCaseSensitive() {
		const result = wasm.icu4x_CodePointSetData_create_case_sensitive_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Case_Sensitive` property, using a particular data source.
	*
	* See the [Rust documentation for `CaseSensitive`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.CaseSensitive.html) for more information.
	*/
	static createCaseSensitiveWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_case_sensitive_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Sentence_Terminal` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static sentenceTerminalForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_sentence_terminal_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Sentence_Terminal` property, using compiled data.
	*
	* See the [Rust documentation for `SentenceTerminal`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.SentenceTerminal.html) for more information.
	*/
	static createSentenceTerminal() {
		const result = wasm.icu4x_CodePointSetData_create_sentence_terminal_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Sentence_Terminal` property, using a particular data source.
	*
	* See the [Rust documentation for `SentenceTerminal`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.SentenceTerminal.html) for more information.
	*/
	static createSentenceTerminalWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_sentence_terminal_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Terminal_Punctuation` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static terminalPunctuationForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_terminal_punctuation_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Terminal_Punctuation` property, using compiled data.
	*
	* See the [Rust documentation for `TerminalPunctuation`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.TerminalPunctuation.html) for more information.
	*/
	static createTerminalPunctuation() {
		const result = wasm.icu4x_CodePointSetData_create_terminal_punctuation_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Terminal_Punctuation` property, using a particular data source.
	*
	* See the [Rust documentation for `TerminalPunctuation`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.TerminalPunctuation.html) for more information.
	*/
	static createTerminalPunctuationWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_terminal_punctuation_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Unified_Ideograph` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static unifiedIdeographForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_unified_ideograph_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Unified_Ideograph` property, using compiled data.
	*
	* See the [Rust documentation for `UnifiedIdeograph`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.UnifiedIdeograph.html) for more information.
	*/
	static createUnifiedIdeograph() {
		const result = wasm.icu4x_CodePointSetData_create_unified_ideograph_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Unified_Ideograph` property, using a particular data source.
	*
	* See the [Rust documentation for `UnifiedIdeograph`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.UnifiedIdeograph.html) for more information.
	*/
	static createUnifiedIdeographWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_unified_ideograph_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Uppercase` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static uppercaseForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_uppercase_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Uppercase` property, using compiled data.
	*
	* See the [Rust documentation for `Uppercase`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Uppercase.html) for more information.
	*/
	static createUppercase() {
		const result = wasm.icu4x_CodePointSetData_create_uppercase_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Uppercase` property, using a particular data source.
	*
	* See the [Rust documentation for `Uppercase`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Uppercase.html) for more information.
	*/
	static createUppercaseWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_uppercase_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Variation_Selector` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static variationSelectorForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_variation_selector_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Variation_Selector` property, using compiled data.
	*
	* See the [Rust documentation for `VariationSelector`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.VariationSelector.html) for more information.
	*/
	static createVariationSelector() {
		const result = wasm.icu4x_CodePointSetData_create_variation_selector_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Variation_Selector` property, using a particular data source.
	*
	* See the [Rust documentation for `VariationSelector`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.VariationSelector.html) for more information.
	*/
	static createVariationSelectorWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_variation_selector_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `White_Space` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static whiteSpaceForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_white_space_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `White_Space` property, using compiled data.
	*
	* See the [Rust documentation for `WhiteSpace`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.WhiteSpace.html) for more information.
	*/
	static createWhiteSpace() {
		const result = wasm.icu4x_CodePointSetData_create_white_space_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `White_Space` property, using a particular data source.
	*
	* See the [Rust documentation for `WhiteSpace`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.WhiteSpace.html) for more information.
	*/
	static createWhiteSpaceWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_white_space_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Xdigit` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static xdigitForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_xdigit_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Xdigit` property, using compiled data.
	*
	* See the [Rust documentation for `Xdigit`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Xdigit.html) for more information.
	*/
	static createXdigit() {
		const result = wasm.icu4x_CodePointSetData_create_xdigit_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Xdigit` property, using a particular data source.
	*
	* See the [Rust documentation for `Xdigit`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Xdigit.html) for more information.
	*/
	static createXdigitWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_xdigit_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Xid_Continue` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static xidContinueForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_xid_continue_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Xid_Continue` property, using compiled data.
	*
	* See the [Rust documentation for `XidContinue`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.XidContinue.html) for more information.
	*/
	static createXidContinue() {
		const result = wasm.icu4x_CodePointSetData_create_xid_continue_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Xid_Continue` property, using a particular data source.
	*
	* See the [Rust documentation for `XidContinue`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.XidContinue.html) for more information.
	*/
	static createXidContinueWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_xid_continue_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the `Xid_Start` value for a given character, using compiled data
	*
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.BinaryProperty.html#tymethod.for_char) for more information.
	*/
	static xidStartForChar(ch) {
		const result = wasm.icu4x_CodePointSetData_xid_start_for_char_mv1(ch);
		try {
			return result;
		} finally {}
	}
	/**
	* Create a set for the `Xid_Start` property, using compiled data.
	*
	* See the [Rust documentation for `XidStart`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.XidStart.html) for more information.
	*/
	static createXidStart() {
		const result = wasm.icu4x_CodePointSetData_create_xid_start_mv1();
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a set for the `Xid_Start` property, using a particular data source.
	*
	* See the [Rust documentation for `XidStart`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.XidStart.html) for more information.
	*/
	static createXidStartWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_xid_start_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* [ecma]: https://tc39.es/ecma262/#table-binary-unicode-properties
	*
	* See the [Rust documentation for `new_for_ecma262`](https://docs.rs/icu/2.1.1/icu/properties/struct.CodePointSetData.html#method.new_for_ecma262) for more information.
	*/
	static createForEcma262(propertyName) {
		let functionCleanupArena = new CleanupArena();
		const propertyNameSlice = functionCleanupArena.alloc(DiplomatBuf.sliceWrapper(wasm, DiplomatBuf.str8(wasm, propertyName)));
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_for_ecma262_mv1(diplomatReceive.buffer, propertyNameSlice.ptr);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			functionCleanupArena.free();
			diplomatReceive.free();
		}
	}
	/**
	* [ecma]: https://tc39.es/ecma262/#table-binary-unicode-properties
	*
	* See the [Rust documentation for `new_for_ecma262`](https://docs.rs/icu/2.1.1/icu/properties/struct.CodePointSetData.html#method.new_for_ecma262) for more information.
	*/
	static createForEcma262WithProvider(provider, propertyName) {
		let functionCleanupArena = new CleanupArena();
		const propertyNameSlice = functionCleanupArena.alloc(DiplomatBuf.sliceWrapper(wasm, DiplomatBuf.str8(wasm, propertyName)));
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointSetData_create_for_ecma262_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue, propertyNameSlice.ptr);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointSetData(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			functionCleanupArena.free();
			diplomatReceive.free();
		}
	}
	constructor(symbol, ptr, selfEdge) {
		return this.#internalConstructor(...arguments);
	}
};
new FinalizationRegistry((ptr) => {
	wasm.icu4x_CodePointSetBuilder_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_CaseMapCloser_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_CaseMapper_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_TitlecaseMapper_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_Collator_destroy_mv1(ptr);
});
(class DateTimeAlignment {
	#value = void 0;
	static #values = new Map([["Auto", 0], ["Column", 1]]);
	static getAllEntries() {
		return DateTimeAlignment.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return DateTimeAlignment.#objectValues[arguments[1]];
		}
		if (value instanceof DateTimeAlignment) return value;
		let intVal = DateTimeAlignment.#values.get(value);
		if (intVal != null) return DateTimeAlignment.#objectValues[intVal];
		throw TypeError(value + " is not a DateTimeAlignment and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new DateTimeAlignment(value);
	}
	get value() {
		return [...DateTimeAlignment.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [new DateTimeAlignment(internalConstructor, internalConstructor, 0), new DateTimeAlignment(internalConstructor, internalConstructor, 1)];
	static Auto = DateTimeAlignment.#objectValues[0];
	static Column = DateTimeAlignment.#objectValues[1];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class DateTimeFormatterLoadError {
	#value = void 0;
	static #values = new Map([
		["Unknown", 0],
		["InvalidDateFields", 2049],
		["UnsupportedLength", 2051],
		["ConflictingField", 2057],
		["FormatterTooSpecific", 2058],
		["DataMarkerNotFound", 1],
		["DataIdentifierNotFound", 2],
		["DataInvalidRequest", 3],
		["DataInconsistentData", 4],
		["DataDowncast", 5],
		["DataDeserialize", 6],
		["DataCustom", 7],
		["DataIo", 8]
	]);
	static getAllEntries() {
		return DateTimeFormatterLoadError.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return DateTimeFormatterLoadError.#objectValues[arguments[1]];
		}
		if (value instanceof DateTimeFormatterLoadError) return value;
		let intVal = DateTimeFormatterLoadError.#values.get(value);
		if (intVal != null) return DateTimeFormatterLoadError.#objectValues[intVal];
		throw TypeError(value + " is not a DateTimeFormatterLoadError and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new DateTimeFormatterLoadError(value);
	}
	get value() {
		for (let entry of DateTimeFormatterLoadError.#values) if (entry[1] == this.#value) return entry[0];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = {
		[0]: new DateTimeFormatterLoadError(internalConstructor, internalConstructor, 0),
		[2049]: new DateTimeFormatterLoadError(internalConstructor, internalConstructor, 2049),
		[2051]: new DateTimeFormatterLoadError(internalConstructor, internalConstructor, 2051),
		[2057]: new DateTimeFormatterLoadError(internalConstructor, internalConstructor, 2057),
		[2058]: new DateTimeFormatterLoadError(internalConstructor, internalConstructor, 2058),
		[1]: new DateTimeFormatterLoadError(internalConstructor, internalConstructor, 1),
		[2]: new DateTimeFormatterLoadError(internalConstructor, internalConstructor, 2),
		[3]: new DateTimeFormatterLoadError(internalConstructor, internalConstructor, 3),
		[4]: new DateTimeFormatterLoadError(internalConstructor, internalConstructor, 4),
		[5]: new DateTimeFormatterLoadError(internalConstructor, internalConstructor, 5),
		[6]: new DateTimeFormatterLoadError(internalConstructor, internalConstructor, 6),
		[7]: new DateTimeFormatterLoadError(internalConstructor, internalConstructor, 7),
		[8]: new DateTimeFormatterLoadError(internalConstructor, internalConstructor, 8)
	};
	static Unknown = DateTimeFormatterLoadError.#objectValues[0];
	static InvalidDateFields = DateTimeFormatterLoadError.#objectValues[2049];
	static UnsupportedLength = DateTimeFormatterLoadError.#objectValues[2051];
	static ConflictingField = DateTimeFormatterLoadError.#objectValues[2057];
	static FormatterTooSpecific = DateTimeFormatterLoadError.#objectValues[2058];
	static DataMarkerNotFound = DateTimeFormatterLoadError.#objectValues[1];
	static DataIdentifierNotFound = DateTimeFormatterLoadError.#objectValues[2];
	static DataInvalidRequest = DateTimeFormatterLoadError.#objectValues[3];
	static DataInconsistentData = DateTimeFormatterLoadError.#objectValues[4];
	static DataDowncast = DateTimeFormatterLoadError.#objectValues[5];
	static DataDeserialize = DateTimeFormatterLoadError.#objectValues[6];
	static DataCustom = DateTimeFormatterLoadError.#objectValues[7];
	static DataIo = DateTimeFormatterLoadError.#objectValues[8];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class DateTimeLength {
	#value = void 0;
	static #values = new Map([
		["Long", 0],
		["Medium", 1],
		["Short", 2]
	]);
	static getAllEntries() {
		return DateTimeLength.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return DateTimeLength.#objectValues[arguments[1]];
		}
		if (value instanceof DateTimeLength) return value;
		let intVal = DateTimeLength.#values.get(value);
		if (intVal != null) return DateTimeLength.#objectValues[intVal];
		throw TypeError(value + " is not a DateTimeLength and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new DateTimeLength(value);
	}
	get value() {
		return [...DateTimeLength.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new DateTimeLength(internalConstructor, internalConstructor, 0),
		new DateTimeLength(internalConstructor, internalConstructor, 1),
		new DateTimeLength(internalConstructor, internalConstructor, 2)
	];
	static Long = DateTimeLength.#objectValues[0];
	static Medium = DateTimeLength.#objectValues[1];
	static Short = DateTimeLength.#objectValues[2];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class YearStyle {
	#value = void 0;
	static #values = new Map([
		["Auto", 0],
		["Full", 1],
		["WithEra", 2]
	]);
	static getAllEntries() {
		return YearStyle.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return YearStyle.#objectValues[arguments[1]];
		}
		if (value instanceof YearStyle) return value;
		let intVal = YearStyle.#values.get(value);
		if (intVal != null) return YearStyle.#objectValues[intVal];
		throw TypeError(value + " is not a YearStyle and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new YearStyle(value);
	}
	get value() {
		return [...YearStyle.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new YearStyle(internalConstructor, internalConstructor, 0),
		new YearStyle(internalConstructor, internalConstructor, 1),
		new YearStyle(internalConstructor, internalConstructor, 2)
	];
	static Auto = YearStyle.#objectValues[0];
	static Full = YearStyle.#objectValues[1];
	static WithEra = YearStyle.#objectValues[2];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_DateFormatter_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_DateFormatterGregorian_destroy_mv1(ptr);
});
(class TimePrecision {
	#value = void 0;
	static #values = new Map([
		["Hour", 0],
		["Minute", 1],
		["MinuteOptional", 2],
		["Second", 3],
		["Subsecond1", 4],
		["Subsecond2", 5],
		["Subsecond3", 6],
		["Subsecond4", 7],
		["Subsecond5", 8],
		["Subsecond6", 9],
		["Subsecond7", 10],
		["Subsecond8", 11],
		["Subsecond9", 12]
	]);
	static getAllEntries() {
		return TimePrecision.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return TimePrecision.#objectValues[arguments[1]];
		}
		if (value instanceof TimePrecision) return value;
		let intVal = TimePrecision.#values.get(value);
		if (intVal != null) return TimePrecision.#objectValues[intVal];
		throw TypeError(value + " is not a TimePrecision and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new TimePrecision(value);
	}
	get value() {
		return [...TimePrecision.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new TimePrecision(internalConstructor, internalConstructor, 0),
		new TimePrecision(internalConstructor, internalConstructor, 1),
		new TimePrecision(internalConstructor, internalConstructor, 2),
		new TimePrecision(internalConstructor, internalConstructor, 3),
		new TimePrecision(internalConstructor, internalConstructor, 4),
		new TimePrecision(internalConstructor, internalConstructor, 5),
		new TimePrecision(internalConstructor, internalConstructor, 6),
		new TimePrecision(internalConstructor, internalConstructor, 7),
		new TimePrecision(internalConstructor, internalConstructor, 8),
		new TimePrecision(internalConstructor, internalConstructor, 9),
		new TimePrecision(internalConstructor, internalConstructor, 10),
		new TimePrecision(internalConstructor, internalConstructor, 11),
		new TimePrecision(internalConstructor, internalConstructor, 12)
	];
	static Hour = TimePrecision.#objectValues[0];
	static Minute = TimePrecision.#objectValues[1];
	static MinuteOptional = TimePrecision.#objectValues[2];
	static Second = TimePrecision.#objectValues[3];
	static Subsecond1 = TimePrecision.#objectValues[4];
	static Subsecond2 = TimePrecision.#objectValues[5];
	static Subsecond3 = TimePrecision.#objectValues[6];
	static Subsecond4 = TimePrecision.#objectValues[7];
	static Subsecond5 = TimePrecision.#objectValues[8];
	static Subsecond6 = TimePrecision.#objectValues[9];
	static Subsecond7 = TimePrecision.#objectValues[10];
	static Subsecond8 = TimePrecision.#objectValues[11];
	static Subsecond9 = TimePrecision.#objectValues[12];
	/**
	* See the [Rust documentation for `try_from_int`](https://docs.rs/icu/2.1.1/icu/datetime/options/enum.SubsecondDigits.html#method.try_from_int) for more information.
	*/
	static fromSubsecondDigits(digits) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_TimePrecision_from_subsecond_digits_mv1(diplomatReceive.buffer, digits);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new TimePrecision(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
		} finally {
			diplomatReceive.free();
		}
	}
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_DateTimeFormatter_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_DateTimeFormatterGregorian_destroy_mv1(ptr);
});
(class DecimalParseError {
	#value = void 0;
	static #values = new Map([
		["Unknown", 0],
		["Limit", 1],
		["Syntax", 2]
	]);
	static getAllEntries() {
		return DecimalParseError.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return DecimalParseError.#objectValues[arguments[1]];
		}
		if (value instanceof DecimalParseError) return value;
		let intVal = DecimalParseError.#values.get(value);
		if (intVal != null) return DecimalParseError.#objectValues[intVal];
		throw TypeError(value + " is not a DecimalParseError and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new DecimalParseError(value);
	}
	get value() {
		return [...DecimalParseError.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new DecimalParseError(internalConstructor, internalConstructor, 0),
		new DecimalParseError(internalConstructor, internalConstructor, 1),
		new DecimalParseError(internalConstructor, internalConstructor, 2)
	];
	static Unknown = DecimalParseError.#objectValues[0];
	static Limit = DecimalParseError.#objectValues[1];
	static Syntax = DecimalParseError.#objectValues[2];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class DecimalRoundingIncrement {
	#value = void 0;
	static #values = new Map([
		["MultiplesOf1", 0],
		["MultiplesOf2", 1],
		["MultiplesOf5", 2],
		["MultiplesOf25", 3]
	]);
	static getAllEntries() {
		return DecimalRoundingIncrement.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return DecimalRoundingIncrement.#objectValues[arguments[1]];
		}
		if (value instanceof DecimalRoundingIncrement) return value;
		let intVal = DecimalRoundingIncrement.#values.get(value);
		if (intVal != null) return DecimalRoundingIncrement.#objectValues[intVal];
		throw TypeError(value + " is not a DecimalRoundingIncrement and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new DecimalRoundingIncrement(value);
	}
	get value() {
		return [...DecimalRoundingIncrement.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new DecimalRoundingIncrement(internalConstructor, internalConstructor, 0),
		new DecimalRoundingIncrement(internalConstructor, internalConstructor, 1),
		new DecimalRoundingIncrement(internalConstructor, internalConstructor, 2),
		new DecimalRoundingIncrement(internalConstructor, internalConstructor, 3)
	];
	static MultiplesOf1 = DecimalRoundingIncrement.#objectValues[0];
	static MultiplesOf2 = DecimalRoundingIncrement.#objectValues[1];
	static MultiplesOf5 = DecimalRoundingIncrement.#objectValues[2];
	static MultiplesOf25 = DecimalRoundingIncrement.#objectValues[3];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class DecimalSign {
	#value = void 0;
	static #values = new Map([
		["None", 0],
		["Negative", 1],
		["Positive", 2]
	]);
	static getAllEntries() {
		return DecimalSign.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return DecimalSign.#objectValues[arguments[1]];
		}
		if (value instanceof DecimalSign) return value;
		let intVal = DecimalSign.#values.get(value);
		if (intVal != null) return DecimalSign.#objectValues[intVal];
		throw TypeError(value + " is not a DecimalSign and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new DecimalSign(value);
	}
	get value() {
		return [...DecimalSign.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new DecimalSign(internalConstructor, internalConstructor, 0),
		new DecimalSign(internalConstructor, internalConstructor, 1),
		new DecimalSign(internalConstructor, internalConstructor, 2)
	];
	static None = DecimalSign.#objectValues[0];
	static Negative = DecimalSign.#objectValues[1];
	static Positive = DecimalSign.#objectValues[2];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class DecimalSignDisplay {
	#value = void 0;
	static #values = new Map([
		["Auto", 0],
		["Never", 1],
		["Always", 2],
		["ExceptZero", 3],
		["Negative", 4]
	]);
	static getAllEntries() {
		return DecimalSignDisplay.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return DecimalSignDisplay.#objectValues[arguments[1]];
		}
		if (value instanceof DecimalSignDisplay) return value;
		let intVal = DecimalSignDisplay.#values.get(value);
		if (intVal != null) return DecimalSignDisplay.#objectValues[intVal];
		throw TypeError(value + " is not a DecimalSignDisplay and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new DecimalSignDisplay(value);
	}
	get value() {
		return [...DecimalSignDisplay.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new DecimalSignDisplay(internalConstructor, internalConstructor, 0),
		new DecimalSignDisplay(internalConstructor, internalConstructor, 1),
		new DecimalSignDisplay(internalConstructor, internalConstructor, 2),
		new DecimalSignDisplay(internalConstructor, internalConstructor, 3),
		new DecimalSignDisplay(internalConstructor, internalConstructor, 4)
	];
	static Auto = DecimalSignDisplay.#objectValues[0];
	static Never = DecimalSignDisplay.#objectValues[1];
	static Always = DecimalSignDisplay.#objectValues[2];
	static ExceptZero = DecimalSignDisplay.#objectValues[3];
	static Negative = DecimalSignDisplay.#objectValues[4];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class DecimalSignedRoundingMode {
	#value = void 0;
	static #values = new Map([
		["Expand", 0],
		["Trunc", 1],
		["HalfExpand", 2],
		["HalfTrunc", 3],
		["HalfEven", 4],
		["Ceil", 5],
		["Floor", 6],
		["HalfCeil", 7],
		["HalfFloor", 8]
	]);
	static getAllEntries() {
		return DecimalSignedRoundingMode.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return DecimalSignedRoundingMode.#objectValues[arguments[1]];
		}
		if (value instanceof DecimalSignedRoundingMode) return value;
		let intVal = DecimalSignedRoundingMode.#values.get(value);
		if (intVal != null) return DecimalSignedRoundingMode.#objectValues[intVal];
		throw TypeError(value + " is not a DecimalSignedRoundingMode and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new DecimalSignedRoundingMode(value);
	}
	get value() {
		return [...DecimalSignedRoundingMode.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new DecimalSignedRoundingMode(internalConstructor, internalConstructor, 0),
		new DecimalSignedRoundingMode(internalConstructor, internalConstructor, 1),
		new DecimalSignedRoundingMode(internalConstructor, internalConstructor, 2),
		new DecimalSignedRoundingMode(internalConstructor, internalConstructor, 3),
		new DecimalSignedRoundingMode(internalConstructor, internalConstructor, 4),
		new DecimalSignedRoundingMode(internalConstructor, internalConstructor, 5),
		new DecimalSignedRoundingMode(internalConstructor, internalConstructor, 6),
		new DecimalSignedRoundingMode(internalConstructor, internalConstructor, 7),
		new DecimalSignedRoundingMode(internalConstructor, internalConstructor, 8)
	];
	static Expand = DecimalSignedRoundingMode.#objectValues[0];
	static Trunc = DecimalSignedRoundingMode.#objectValues[1];
	static HalfExpand = DecimalSignedRoundingMode.#objectValues[2];
	static HalfTrunc = DecimalSignedRoundingMode.#objectValues[3];
	static HalfEven = DecimalSignedRoundingMode.#objectValues[4];
	static Ceil = DecimalSignedRoundingMode.#objectValues[5];
	static Floor = DecimalSignedRoundingMode.#objectValues[6];
	static HalfCeil = DecimalSignedRoundingMode.#objectValues[7];
	static HalfFloor = DecimalSignedRoundingMode.#objectValues[8];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_Decimal_destroy_mv1(ptr);
});
(class DecimalGroupingStrategy {
	#value = void 0;
	static #values = new Map([
		["Auto", 0],
		["Never", 1],
		["Always", 2],
		["Min2", 3]
	]);
	static getAllEntries() {
		return DecimalGroupingStrategy.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return DecimalGroupingStrategy.#objectValues[arguments[1]];
		}
		if (value instanceof DecimalGroupingStrategy) return value;
		let intVal = DecimalGroupingStrategy.#values.get(value);
		if (intVal != null) return DecimalGroupingStrategy.#objectValues[intVal];
		throw TypeError(value + " is not a DecimalGroupingStrategy and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new DecimalGroupingStrategy(value);
	}
	get value() {
		return [...DecimalGroupingStrategy.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new DecimalGroupingStrategy(internalConstructor, internalConstructor, 0),
		new DecimalGroupingStrategy(internalConstructor, internalConstructor, 1),
		new DecimalGroupingStrategy(internalConstructor, internalConstructor, 2),
		new DecimalGroupingStrategy(internalConstructor, internalConstructor, 3)
	];
	static Auto = DecimalGroupingStrategy.#objectValues[0];
	static Never = DecimalGroupingStrategy.#objectValues[1];
	static Always = DecimalGroupingStrategy.#objectValues[2];
	static Min2 = DecimalGroupingStrategy.#objectValues[3];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_DecimalFormatter_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_LocaleDisplayNamesFormatter_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_RegionDisplayNames_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_ExemplarCharacters_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_TimeZoneAndCanonicalAndNormalizedIterator_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_TimeZoneAndCanonicalIterator_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_IanaParserExtended_destroy_mv1(ptr);
});
(class ListLength {
	#value = void 0;
	static #values = new Map([
		["Wide", 0],
		["Short", 1],
		["Narrow", 2]
	]);
	static getAllEntries() {
		return ListLength.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return ListLength.#objectValues[arguments[1]];
		}
		if (value instanceof ListLength) return value;
		let intVal = ListLength.#values.get(value);
		if (intVal != null) return ListLength.#objectValues[intVal];
		throw TypeError(value + " is not a ListLength and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new ListLength(value);
	}
	get value() {
		return [...ListLength.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new ListLength(internalConstructor, internalConstructor, 0),
		new ListLength(internalConstructor, internalConstructor, 1),
		new ListLength(internalConstructor, internalConstructor, 2)
	];
	static Wide = ListLength.#objectValues[0];
	static Short = ListLength.#objectValues[1];
	static Narrow = ListLength.#objectValues[2];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_ListFormatter_destroy_mv1(ptr);
});
(class TransformResult {
	#value = void 0;
	static #values = new Map([["Modified", 0], ["Unmodified", 1]]);
	static getAllEntries() {
		return TransformResult.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return TransformResult.#objectValues[arguments[1]];
		}
		if (value instanceof TransformResult) return value;
		let intVal = TransformResult.#values.get(value);
		if (intVal != null) return TransformResult.#objectValues[intVal];
		throw TypeError(value + " is not a TransformResult and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new TransformResult(value);
	}
	get value() {
		return [...TransformResult.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [new TransformResult(internalConstructor, internalConstructor, 0), new TransformResult(internalConstructor, internalConstructor, 1)];
	static Modified = TransformResult.#objectValues[0];
	static Unmodified = TransformResult.#objectValues[1];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_LocaleCanonicalizer_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_LocaleExpander_destroy_mv1(ptr);
});
(class LocaleDirection {
	#value = void 0;
	static #values = new Map([
		["LeftToRight", 0],
		["RightToLeft", 1],
		["Unknown", 2]
	]);
	static getAllEntries() {
		return LocaleDirection.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return LocaleDirection.#objectValues[arguments[1]];
		}
		if (value instanceof LocaleDirection) return value;
		let intVal = LocaleDirection.#values.get(value);
		if (intVal != null) return LocaleDirection.#objectValues[intVal];
		throw TypeError(value + " is not a LocaleDirection and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new LocaleDirection(value);
	}
	get value() {
		return [...LocaleDirection.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new LocaleDirection(internalConstructor, internalConstructor, 0),
		new LocaleDirection(internalConstructor, internalConstructor, 1),
		new LocaleDirection(internalConstructor, internalConstructor, 2)
	];
	static LeftToRight = LocaleDirection.#objectValues[0];
	static RightToLeft = LocaleDirection.#objectValues[1];
	static Unknown = LocaleDirection.#objectValues[2];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_LocaleDirectionality_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_Logger_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_ComposingNormalizer_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_DecomposingNormalizer_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_CanonicalCombiningClassMap_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_CanonicalComposition_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_CanonicalDecomposition_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_PluralOperands_destroy_mv1(ptr);
});
(class PluralCategory {
	#value = void 0;
	static #values = new Map([
		["Zero", 0],
		["One", 1],
		["Two", 2],
		["Few", 3],
		["Many", 4],
		["Other", 5]
	]);
	static getAllEntries() {
		return PluralCategory.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return PluralCategory.#objectValues[arguments[1]];
		}
		if (value instanceof PluralCategory) return value;
		let intVal = PluralCategory.#values.get(value);
		if (intVal != null) return PluralCategory.#objectValues[intVal];
		throw TypeError(value + " is not a PluralCategory and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new PluralCategory(value);
	}
	get value() {
		return [...PluralCategory.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new PluralCategory(internalConstructor, internalConstructor, 0),
		new PluralCategory(internalConstructor, internalConstructor, 1),
		new PluralCategory(internalConstructor, internalConstructor, 2),
		new PluralCategory(internalConstructor, internalConstructor, 3),
		new PluralCategory(internalConstructor, internalConstructor, 4),
		new PluralCategory(internalConstructor, internalConstructor, 5)
	];
	static Zero = PluralCategory.#objectValues[0];
	static One = PluralCategory.#objectValues[1];
	static Two = PluralCategory.#objectValues[2];
	static Few = PluralCategory.#objectValues[3];
	static Many = PluralCategory.#objectValues[4];
	static Other = PluralCategory.#objectValues[5];
	/**
	* Construct from a string in the format
	* [specified in TR35](https://unicode.org/reports/tr35/tr35-numbers.html#Language_Plural_Rules)
	*
	* See the [Rust documentation for `get_for_cldr_string`](https://docs.rs/icu/2.1.1/icu/plurals/enum.PluralCategory.html#method.get_for_cldr_string) for more information.
	*
	* See the [Rust documentation for `get_for_cldr_bytes`](https://docs.rs/icu/2.1.1/icu/plurals/enum.PluralCategory.html#method.get_for_cldr_bytes) for more information.
	*/
	static getForCldrString(s) {
		let functionCleanupArena = new CleanupArena();
		const sSlice = functionCleanupArena.alloc(DiplomatBuf.sliceWrapper(wasm, DiplomatBuf.str8(wasm, s)));
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_PluralCategory_get_for_cldr_string_mv1(diplomatReceive.buffer, sSlice.ptr);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new PluralCategory(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
		} finally {
			functionCleanupArena.free();
			diplomatReceive.free();
		}
	}
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_PluralRules_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_CodePointMapData16_destroy_mv1(ptr);
});
//#endregion
//#region vendor/CodePointMapData8.mjs
const CodePointMapData8_box_destroy_registry = new FinalizationRegistry((ptr) => {
	wasm.icu4x_CodePointMapData8_destroy_mv1(ptr);
});
/**
* An ICU4X Unicode Map Property object, capable of querying whether a code point (key) to obtain the Unicode property value, for a specific Unicode property.
*
* For properties whose values fit into 8 bits.
*
* See the [Rust documentation for `properties`](https://docs.rs/icu/2.1.1/icu/properties/index.html) for more information.
*
* See the [Rust documentation for `CodePointMapData`](https://docs.rs/icu/2.1.1/icu/properties/struct.CodePointMapData.html) for more information.
*
* See the [Rust documentation for `CodePointMapDataBorrowed`](https://docs.rs/icu/2.1.1/icu/properties/struct.CodePointMapDataBorrowed.html) for more information.
*/
var CodePointMapData8 = class CodePointMapData8 {
	#ptr = null;
	#selfEdge = [];
	#internalConstructor(symbol, ptr, selfEdge) {
		if (symbol !== internalConstructor) {
			console.error("CodePointMapData8 is an Opaque type. You cannot call its constructor.");
			return;
		}
		this.#ptr = ptr;
		this.#selfEdge = selfEdge;
		if (this.#selfEdge.length === 0) CodePointMapData8_box_destroy_registry.register(this, this.#ptr);
		return this;
	}
	/** @internal */
	get ffiValue() {
		return this.#ptr;
	}
	/**
	* Gets the value for a code point.
	*
	* See the [Rust documentation for `get`](https://docs.rs/icu/2.1.1/icu/properties/struct.CodePointMapDataBorrowed.html#method.get) for more information.
	*/
	get(cp) {
		const result = wasm.icu4x_CodePointMapData8_get_mv1(this.ffiValue, cp);
		try {
			return result;
		} finally {}
	}
	/**
	* Produces an iterator over ranges of code points that map to `value`
	*
	* See the [Rust documentation for `iter_ranges_for_value`](https://docs.rs/icu/2.1.1/icu/properties/struct.CodePointMapDataBorrowed.html#method.iter_ranges_for_value) for more information.
	*/
	iterRangesForValue(value) {
		let aEdges = [this];
		const result = wasm.icu4x_CodePointMapData8_iter_ranges_for_value_mv1(this.ffiValue, value);
		try {
			return new CodePointRangeIterator(internalConstructor, result, [], aEdges);
		} finally {}
	}
	/**
	* Produces an iterator over ranges of code points that do not map to `value`
	*
	* See the [Rust documentation for `iter_ranges_for_value_complemented`](https://docs.rs/icu/2.1.1/icu/properties/struct.CodePointMapDataBorrowed.html#method.iter_ranges_for_value_complemented) for more information.
	*/
	iterRangesForValueComplemented(value) {
		let aEdges = [this];
		const result = wasm.icu4x_CodePointMapData8_iter_ranges_for_value_complemented_mv1(this.ffiValue, value);
		try {
			return new CodePointRangeIterator(internalConstructor, result, [], aEdges);
		} finally {}
	}
	/**
	* Given a mask value (the nth bit marks property value = n), produce an iterator over ranges of code points
	* whose property values are contained in the mask.
	*
	* The main mask property supported is that for General_Category, which can be obtained via `general_category_to_mask()` or
	* by using `GeneralCategoryNameToMaskMapper`
	*
	* Should only be used on maps for properties with values less than 32 (like Generak_Category),
	* other maps will have unpredictable results
	*
	* See the [Rust documentation for `iter_ranges_for_group`](https://docs.rs/icu/2.1.1/icu/properties/struct.CodePointMapDataBorrowed.html#method.iter_ranges_for_group) for more information.
	*/
	iterRangesForGroup(group) {
		let functionCleanupArena = new CleanupArena();
		let aEdges = [this];
		const result = wasm.icu4x_CodePointMapData8_iter_ranges_for_group_mv1(this.ffiValue, GeneralCategoryGroup._fromSuppliedValue(internalConstructor, group)._intoFFI(functionCleanupArena, {}, false));
		try {
			return new CodePointRangeIterator(internalConstructor, result, [], aEdges);
		} finally {
			functionCleanupArena.free();
		}
	}
	/**
	* Gets a {@link CodePointSetData} representing all entries in this map that map to the given value
	*
	* See the [Rust documentation for `get_set_for_value`](https://docs.rs/icu/2.1.1/icu/properties/struct.CodePointMapDataBorrowed.html#method.get_set_for_value) for more information.
	*/
	getSetForValue(value) {
		const result = wasm.icu4x_CodePointMapData8_get_set_for_value_mv1(this.ffiValue, value);
		try {
			return new CodePointSetData(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a map for the `General_Category` property, using compiled data.
	*
	* See the [Rust documentation for `GeneralCategory`](https://docs.rs/icu/2.1.1/icu/properties/props/enum.GeneralCategory.html) for more information.
	*/
	static createGeneralCategory() {
		const result = wasm.icu4x_CodePointMapData8_create_general_category_mv1();
		try {
			return new CodePointMapData8(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a map for the `General_Category` property, using a particular data source
	*
	* See the [Rust documentation for `GeneralCategory`](https://docs.rs/icu/2.1.1/icu/properties/props/enum.GeneralCategory.html) for more information.
	*/
	static createGeneralCategoryWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointMapData8_create_general_category_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointMapData8(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Create a map for the `Bidi_Class` property, using compiled data.
	*
	* See the [Rust documentation for `BidiClass`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.BidiClass.html) for more information.
	*/
	static createBidiClass() {
		const result = wasm.icu4x_CodePointMapData8_create_bidi_class_mv1();
		try {
			return new CodePointMapData8(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a map for the `Bidi_Class` property, using a particular data source.
	*
	* See the [Rust documentation for `BidiClass`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.BidiClass.html) for more information.
	*/
	static createBidiClassWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointMapData8_create_bidi_class_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointMapData8(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Create a map for the `East_Asian_Width` property, using compiled data.
	*
	* See the [Rust documentation for `EastAsianWidth`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.EastAsianWidth.html) for more information.
	*/
	static createEastAsianWidth() {
		const result = wasm.icu4x_CodePointMapData8_create_east_asian_width_mv1();
		try {
			return new CodePointMapData8(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a map for the `East_Asian_Width` property, using a particular data source.
	*
	* See the [Rust documentation for `EastAsianWidth`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.EastAsianWidth.html) for more information.
	*/
	static createEastAsianWidthWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointMapData8_create_east_asian_width_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointMapData8(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Create a map for the `Hangul_Syllable_Type` property, using compiled data.
	*
	* See the [Rust documentation for `HangulSyllableType`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.HangulSyllableType.html) for more information.
	*/
	static createHangulSyllableType() {
		const result = wasm.icu4x_CodePointMapData8_create_hangul_syllable_type_mv1();
		try {
			return new CodePointMapData8(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a map for the `Hangul_Syllable_Type` property, using a particular data source.
	*
	* See the [Rust documentation for `HangulSyllableType`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.HangulSyllableType.html) for more information.
	*/
	static createHangulSyllableTypeWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointMapData8_create_hangul_syllable_type_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointMapData8(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Create a map for the `Indic_Syllabic_Property` property, using compiled data.
	*
	* See the [Rust documentation for `IndicSyllabicCategory`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.IndicSyllabicCategory.html) for more information.
	*/
	static createIndicSyllabicCategory() {
		const result = wasm.icu4x_CodePointMapData8_create_indic_syllabic_category_mv1();
		try {
			return new CodePointMapData8(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a map for the `Indic_Syllabic_Property` property, using a particular data source.
	*
	* See the [Rust documentation for `IndicSyllabicCategory`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.IndicSyllabicCategory.html) for more information.
	*/
	static createIndicSyllabicCategoryWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointMapData8_create_indic_syllabic_category_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointMapData8(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Create a map for the `Line_Break` property, using compiled data.
	*
	* See the [Rust documentation for `LineBreak`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.LineBreak.html) for more information.
	*/
	static createLineBreak() {
		const result = wasm.icu4x_CodePointMapData8_create_line_break_mv1();
		try {
			return new CodePointMapData8(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a map for the `Line_Break` property, using a particular data source.
	*
	* See the [Rust documentation for `LineBreak`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.LineBreak.html) for more information.
	*/
	static createLineBreakWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointMapData8_create_line_break_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointMapData8(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Create a map for the `Grapheme_Cluster_Break` property, using compiled data.
	*
	* See the [Rust documentation for `GraphemeClusterBreak`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GraphemeClusterBreak.html) for more information.
	*/
	static createGraphemeClusterBreak() {
		const result = wasm.icu4x_CodePointMapData8_create_grapheme_cluster_break_mv1();
		try {
			return new CodePointMapData8(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a map for the `Grapheme_Cluster_Break` property, using a particular data source.
	*
	* See the [Rust documentation for `GraphemeClusterBreak`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GraphemeClusterBreak.html) for more information.
	*/
	static createGraphemeClusterBreakWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointMapData8_create_grapheme_cluster_break_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointMapData8(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Create a map for the `Word_Break` property, using compiled data.
	*
	* See the [Rust documentation for `WordBreak`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.WordBreak.html) for more information.
	*/
	static createWordBreak() {
		const result = wasm.icu4x_CodePointMapData8_create_word_break_mv1();
		try {
			return new CodePointMapData8(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a map for the `Word_Break` property, using a particular data source.
	*
	* See the [Rust documentation for `WordBreak`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.WordBreak.html) for more information.
	*/
	static createWordBreakWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointMapData8_create_word_break_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointMapData8(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Create a map for the `Sentence_Break` property, using compiled data.
	*
	* See the [Rust documentation for `SentenceBreak`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.SentenceBreak.html) for more information.
	*/
	static createSentenceBreak() {
		const result = wasm.icu4x_CodePointMapData8_create_sentence_break_mv1();
		try {
			return new CodePointMapData8(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a map for the `Sentence_Break` property, using a particular data source.
	*
	* See the [Rust documentation for `SentenceBreak`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.SentenceBreak.html) for more information.
	*/
	static createSentenceBreakWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointMapData8_create_sentence_break_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointMapData8(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Create a map for the `Joining_Type` property, using compiled data.
	*
	* See the [Rust documentation for `JoiningType`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.JoiningType.html) for more information.
	*/
	static createJoiningType() {
		const result = wasm.icu4x_CodePointMapData8_create_joining_type_mv1();
		try {
			return new CodePointMapData8(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a map for the `Joining_Type` property, using a particular data source.
	*
	* See the [Rust documentation for `JoiningType`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.JoiningType.html) for more information.
	*/
	static createJoiningTypeWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointMapData8_create_joining_type_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointMapData8(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Create a map for the `Canonical_Combining_Class` property, using compiled data.
	*
	* See the [Rust documentation for `CanonicalCombiningClass`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.CanonicalCombiningClass.html) for more information.
	*/
	static createCanonicalCombiningClass() {
		const result = wasm.icu4x_CodePointMapData8_create_canonical_combining_class_mv1();
		try {
			return new CodePointMapData8(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a map for the `Canonical_Combining_Class` property, using a particular data source.
	*
	* See the [Rust documentation for `CanonicalCombiningClass`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.CanonicalCombiningClass.html) for more information.
	*/
	static createCanonicalCombiningClassWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointMapData8_create_canonical_combining_class_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointMapData8(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Create a map for the `Vertical_Orientation` property, using compiled data.
	*
	* See the [Rust documentation for `VerticalOrientation`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.VerticalOrientation.html) for more information.
	*/
	static createVerticalOrientation() {
		const result = wasm.icu4x_CodePointMapData8_create_vertical_orientation_mv1();
		try {
			return new CodePointMapData8(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Create a map for the `Vertical_Orientation` property, using a particular data source.
	*
	* See the [Rust documentation for `VerticalOrientation`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.VerticalOrientation.html) for more information.
	*/
	static createVerticalOrientationWithProvider(provider) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CodePointMapData8_create_vertical_orientation_with_provider_mv1(diplomatReceive.buffer, provider.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new CodePointMapData8(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			diplomatReceive.free();
		}
	}
	constructor(symbol, ptr, selfEdge) {
		return this.#internalConstructor(...arguments);
	}
};
new FinalizationRegistry((ptr) => {
	wasm.icu4x_GeneralCategoryNameToGroupMapper_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_PropertyValueNameToEnumMapper_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_EmojiSetData_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_ScriptExtensionsSet_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_ScriptWithExtensionsBorrowed_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_ScriptWithExtensions_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_GraphemeClusterBreakIteratorLatin1_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_GraphemeClusterBreakIteratorUtf16_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_GraphemeClusterBreakIteratorUtf8_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_GraphemeClusterSegmenter_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_LineBreakIteratorLatin1_destroy_mv1(ptr);
});
//#endregion
//#region vendor/LineBreakIteratorUtf16.mjs
const LineBreakIteratorUtf16_box_destroy_registry = new FinalizationRegistry((ptr) => {
	wasm.icu4x_LineBreakIteratorUtf16_destroy_mv1(ptr);
});
/**
* See the [Rust documentation for `LineBreakIterator`](https://docs.rs/icu/2.1.1/icu/segmenter/iterators/struct.LineBreakIterator.html) for more information.
*/
var LineBreakIteratorUtf16 = class {
	#ptr = null;
	#selfEdge = [];
	#aEdge = [];
	#internalConstructor(symbol, ptr, selfEdge, aEdge) {
		if (symbol !== internalConstructor) {
			console.error("LineBreakIteratorUtf16 is an Opaque type. You cannot call its constructor.");
			return;
		}
		this.#aEdge = aEdge;
		this.#ptr = ptr;
		this.#selfEdge = selfEdge;
		if (this.#selfEdge.length === 0) LineBreakIteratorUtf16_box_destroy_registry.register(this, this.#ptr);
		return this;
	}
	/** @internal */
	get ffiValue() {
		return this.#ptr;
	}
	/**
	* Finds the next breakpoint. Returns -1 if at the end of the string or if the index is
	* out of range of a 32-bit signed integer.
	*
	* See the [Rust documentation for `next`](https://docs.rs/icu/2.1.1/icu/segmenter/iterators/struct.LineBreakIterator.html#method.next) for more information.
	*/
	next() {
		const result = wasm.icu4x_LineBreakIteratorUtf16_next_mv1(this.ffiValue);
		try {
			return result;
		} finally {}
	}
	constructor(symbol, ptr, selfEdge, aEdge) {
		return this.#internalConstructor(...arguments);
	}
};
new FinalizationRegistry((ptr) => {
	wasm.icu4x_LineBreakIteratorUtf8_destroy_mv1(ptr);
});
//#endregion
//#region vendor/LineSegmenter.mjs
const LineSegmenter_box_destroy_registry = new FinalizationRegistry((ptr) => {
	wasm.icu4x_LineSegmenter_destroy_mv1(ptr);
});
/**
* An ICU4X line-break segmenter, capable of finding breakpoints in strings.
*
* See the [Rust documentation for `LineSegmenter`](https://docs.rs/icu/2.1.1/icu/segmenter/struct.LineSegmenter.html) for more information.
*/
var LineSegmenter = class LineSegmenter {
	#ptr = null;
	#selfEdge = [];
	#internalConstructor(symbol, ptr, selfEdge) {
		if (symbol !== internalConstructor) {
			console.error("LineSegmenter is an Opaque type. You cannot call its constructor.");
			return;
		}
		this.#ptr = ptr;
		this.#selfEdge = selfEdge;
		if (this.#selfEdge.length === 0) LineSegmenter_box_destroy_registry.register(this, this.#ptr);
		return this;
	}
	/** @internal */
	get ffiValue() {
		return this.#ptr;
	}
	/**
	* Construct a {@link LineSegmenter} with default options (no locale-based tailoring) using compiled data. It automatically loads the best
	* available payload data for Burmese, Khmer, Lao, and Thai.
	*
	* See the [Rust documentation for `new_auto`](https://docs.rs/icu/2.1.1/icu/segmenter/struct.LineSegmenter.html#method.new_auto) for more information.
	*/
	static createAuto() {
		const result = wasm.icu4x_LineSegmenter_create_auto_mv1();
		try {
			return new LineSegmenter(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Construct a {@link LineSegmenter} with default options (no locale-based tailoring) and LSTM payload data for
	* Burmese, Khmer, Lao, and Thai, using compiled data.
	*
	* See the [Rust documentation for `new_lstm`](https://docs.rs/icu/2.1.1/icu/segmenter/struct.LineSegmenter.html#method.new_lstm) for more information.
	*/
	static createLstm() {
		const result = wasm.icu4x_LineSegmenter_create_lstm_mv1();
		try {
			return new LineSegmenter(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Construct a {@link LineSegmenter} with default options (no locale-based tailoring) and dictionary payload data for
	* Burmese, Khmer, Lao, and Thai, using compiled data
	*
	* See the [Rust documentation for `new_dictionary`](https://docs.rs/icu/2.1.1/icu/segmenter/struct.LineSegmenter.html#method.new_dictionary) for more information.
	*/
	static createDictionary() {
		const result = wasm.icu4x_LineSegmenter_create_dictionary_mv1();
		try {
			return new LineSegmenter(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Construct a {@link LineSegmenter} with default options (no locale-based tailoring) and no support for scripts requiring complex context dependent line breaks
	* (Burmese, Khmer, Lao, and Thai), using compiled data
	*
	* See the [Rust documentation for `new_for_non_complex_scripts`](https://docs.rs/icu/2.1.1/icu/segmenter/struct.LineSegmenter.html#method.new_for_non_complex_scripts) for more information.
	*/
	static createForNonComplexScripts() {
		const result = wasm.icu4x_LineSegmenter_create_for_non_complex_scripts_mv1();
		try {
			return new LineSegmenter(internalConstructor, result, []);
		} finally {}
	}
	/**
	* Construct a {@link LineSegmenter} with custom options using compiled data. It automatically loads the best
	* available payload data for Burmese, Khmer, Lao, and Thai.
	*
	* See the [Rust documentation for `new_auto`](https://docs.rs/icu/2.1.1/icu/segmenter/struct.LineSegmenter.html#method.new_auto) for more information.
	*/
	static autoWithOptions(contentLocale, options) {
		let functionCleanupArena = new CleanupArena();
		const result = wasm.icu4x_LineSegmenter_create_auto_with_options_v2_mv1(contentLocale.ffiValue ?? 0, LineBreakOptions._fromSuppliedValue(internalConstructor, options)._intoFFI(functionCleanupArena, {}, false));
		try {
			return new LineSegmenter(internalConstructor, result, []);
		} finally {
			functionCleanupArena.free();
		}
	}
	/**
	* Construct a {@link LineSegmenter} with custom options. It automatically loads the best
	* available payload data for Burmese, Khmer, Lao, and Thai, using a particular data source.
	*
	* See the [Rust documentation for `new_auto`](https://docs.rs/icu/2.1.1/icu/segmenter/struct.LineSegmenter.html#method.new_auto) for more information.
	*/
	static autoWithOptionsAndProvider(provider, contentLocale, options) {
		let functionCleanupArena = new CleanupArena();
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_LineSegmenter_create_auto_with_options_v2_and_provider_mv1(diplomatReceive.buffer, provider.ffiValue, contentLocale.ffiValue ?? 0, LineBreakOptions._fromSuppliedValue(internalConstructor, options)._intoFFI(functionCleanupArena, {}, false));
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new LineSegmenter(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			functionCleanupArena.free();
			diplomatReceive.free();
		}
	}
	/**
	* Construct a {@link LineSegmenter} with custom options and LSTM payload data for
	* Burmese, Khmer, Lao, and Thai, using compiled data.
	*
	* See the [Rust documentation for `new_lstm`](https://docs.rs/icu/2.1.1/icu/segmenter/struct.LineSegmenter.html#method.new_lstm) for more information.
	*/
	static lstmWithOptions(contentLocale, options) {
		let functionCleanupArena = new CleanupArena();
		const result = wasm.icu4x_LineSegmenter_create_lstm_with_options_v2_mv1(contentLocale.ffiValue ?? 0, LineBreakOptions._fromSuppliedValue(internalConstructor, options)._intoFFI(functionCleanupArena, {}, false));
		try {
			return new LineSegmenter(internalConstructor, result, []);
		} finally {
			functionCleanupArena.free();
		}
	}
	/**
	* Construct a {@link LineSegmenter} with custom options and LSTM payload data for
	* Burmese, Khmer, Lao, and Thai, using a particular data source.
	*
	* See the [Rust documentation for `new_lstm`](https://docs.rs/icu/2.1.1/icu/segmenter/struct.LineSegmenter.html#method.new_lstm) for more information.
	*/
	static lstmWithOptionsAndProvider(provider, contentLocale, options) {
		let functionCleanupArena = new CleanupArena();
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_LineSegmenter_create_lstm_with_options_v2_and_provider_mv1(diplomatReceive.buffer, provider.ffiValue, contentLocale.ffiValue ?? 0, LineBreakOptions._fromSuppliedValue(internalConstructor, options)._intoFFI(functionCleanupArena, {}, false));
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new LineSegmenter(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			functionCleanupArena.free();
			diplomatReceive.free();
		}
	}
	/**
	* Construct a {@link LineSegmenter} with custom options and dictionary payload data for
	* Burmese, Khmer, Lao, and Thai, using compiled data.
	*
	* See the [Rust documentation for `new_dictionary`](https://docs.rs/icu/2.1.1/icu/segmenter/struct.LineSegmenter.html#method.new_dictionary) for more information.
	*/
	static dictionaryWithOptions(contentLocale, options) {
		let functionCleanupArena = new CleanupArena();
		const result = wasm.icu4x_LineSegmenter_create_dictionary_with_options_v2_mv1(contentLocale.ffiValue ?? 0, LineBreakOptions._fromSuppliedValue(internalConstructor, options)._intoFFI(functionCleanupArena, {}, false));
		try {
			return new LineSegmenter(internalConstructor, result, []);
		} finally {
			functionCleanupArena.free();
		}
	}
	/**
	* Construct a {@link LineSegmenter} with custom options and dictionary payload data for
	* Burmese, Khmer, Lao, and Thai, using a particular data source.
	*
	* See the [Rust documentation for `new_dictionary`](https://docs.rs/icu/2.1.1/icu/segmenter/struct.LineSegmenter.html#method.new_dictionary) for more information.
	*/
	static dictionaryWithOptionsAndProvider(provider, contentLocale, options) {
		let functionCleanupArena = new CleanupArena();
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_LineSegmenter_create_dictionary_with_options_v2_and_provider_mv1(diplomatReceive.buffer, provider.ffiValue, contentLocale.ffiValue ?? 0, LineBreakOptions._fromSuppliedValue(internalConstructor, options)._intoFFI(functionCleanupArena, {}, false));
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new LineSegmenter(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			functionCleanupArena.free();
			diplomatReceive.free();
		}
	}
	/**
	* Construct a {@link LineSegmenter} with custom options and no support for scripts requiring complex context dependent line breaks
	* (Burmese, Khmer, Lao, and Thai), using compiled data.
	*
	* See the [Rust documentation for `new_for_non_complex_scripts`](https://docs.rs/icu/2.1.1/icu/segmenter/struct.LineSegmenter.html#method.new_for_non_complex_scripts) for more information.
	*/
	static forNonComplexScriptsWithOptions(contentLocale, options) {
		let functionCleanupArena = new CleanupArena();
		const result = wasm.icu4x_LineSegmenter_create_for_non_complex_scripts_with_options_v2_mv1(contentLocale.ffiValue ?? 0, LineBreakOptions._fromSuppliedValue(internalConstructor, options)._intoFFI(functionCleanupArena, {}, false));
		try {
			return new LineSegmenter(internalConstructor, result, []);
		} finally {
			functionCleanupArena.free();
		}
	}
	/**
	* Construct a {@link LineSegmenter} with custom options and no support for complex languages
	* (Burmese, Khmer, Lao, and Thai), using a particular data source.
	*
	* See the [Rust documentation for `new_for_non_complex_scripts`](https://docs.rs/icu/2.1.1/icu/segmenter/struct.LineSegmenter.html#method.new_for_non_complex_scripts) for more information.
	*/
	static forNonComplexScriptsWithOptionsAndProvider(provider, contentLocale, options) {
		let functionCleanupArena = new CleanupArena();
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_LineSegmenter_create_for_non_complex_scripts_with_options_v2_and_provider_mv1(diplomatReceive.buffer, provider.ffiValue, contentLocale.ffiValue ?? 0, LineBreakOptions._fromSuppliedValue(internalConstructor, options)._intoFFI(functionCleanupArena, {}, false));
		try {
			if (!diplomatReceive.resultFlag) {
				const cause = new DataError(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
				throw new globalThis.Error("DataError." + cause.value, { cause });
			}
			return new LineSegmenter(internalConstructor, ptrRead(wasm, diplomatReceive.buffer), []);
		} finally {
			functionCleanupArena.free();
			diplomatReceive.free();
		}
	}
	/**
	* Segments a string.
	*
	* Ill-formed input is treated as if errors had been replaced with REPLACEMENT CHARACTERs according
	* to the WHATWG Encoding Standard.
	*
	* See the [Rust documentation for `segment_utf16`](https://docs.rs/icu/2.1.1/icu/segmenter/struct.LineSegmenterBorrowed.html#method.segment_utf16) for more information.
	*/
	segment(input) {
		let functionGarbageCollectorGrip = new GarbageCollectorGrip();
		const inputSlice = functionGarbageCollectorGrip.alloc(DiplomatBuf.sliceWrapper(wasm, DiplomatBuf.str16(wasm, input)));
		let aEdges = [this, inputSlice];
		const result = wasm.icu4x_LineSegmenter_segment_utf16_mv1(this.ffiValue, inputSlice.ptr);
		try {
			return new LineBreakIteratorUtf16(internalConstructor, result, [], aEdges);
		} finally {
			functionGarbageCollectorGrip.releaseToGarbageCollector();
		}
	}
	constructor(symbol, ptr, selfEdge) {
		return this.#internalConstructor(...arguments);
	}
};
new FinalizationRegistry((ptr) => {
	wasm.icu4x_SentenceBreakIteratorLatin1_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_SentenceBreakIteratorUtf16_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_SentenceBreakIteratorUtf8_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_SentenceSegmenter_destroy_mv1(ptr);
});
(class SegmenterWordType {
	#value = void 0;
	static #values = new Map([
		["None", 0],
		["Number", 1],
		["Letter", 2]
	]);
	static getAllEntries() {
		return SegmenterWordType.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return SegmenterWordType.#objectValues[arguments[1]];
		}
		if (value instanceof SegmenterWordType) return value;
		let intVal = SegmenterWordType.#values.get(value);
		if (intVal != null) return SegmenterWordType.#objectValues[intVal];
		throw TypeError(value + " is not a SegmenterWordType and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new SegmenterWordType(value);
	}
	get value() {
		return [...SegmenterWordType.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new SegmenterWordType(internalConstructor, internalConstructor, 0),
		new SegmenterWordType(internalConstructor, internalConstructor, 1),
		new SegmenterWordType(internalConstructor, internalConstructor, 2)
	];
	static None = SegmenterWordType.#objectValues[0];
	static Number = SegmenterWordType.#objectValues[1];
	static Letter = SegmenterWordType.#objectValues[2];
	/**
	* See the [Rust documentation for `is_word_like`](https://docs.rs/icu/2.1.1/icu/segmenter/options/enum.WordType.html#method.is_word_like) for more information.
	*/
	get isWordLike() {
		const result = wasm.icu4x_SegmenterWordType_is_word_like_mv1(this.ffiValue);
		try {
			return result;
		} finally {}
	}
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_WordBreakIteratorLatin1_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_WordBreakIteratorUtf16_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_WordBreakIteratorUtf8_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_WordSegmenter_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_TimeFormatter_destroy_mv1(ptr);
});
(class DateTimeWriteError {
	#value = void 0;
	static #values = new Map([["Unknown", 0], ["MissingTimeZoneVariant", 1]]);
	static getAllEntries() {
		return DateTimeWriteError.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return DateTimeWriteError.#objectValues[arguments[1]];
		}
		if (value instanceof DateTimeWriteError) return value;
		let intVal = DateTimeWriteError.#values.get(value);
		if (intVal != null) return DateTimeWriteError.#objectValues[intVal];
		throw TypeError(value + " is not a DateTimeWriteError and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new DateTimeWriteError(value);
	}
	get value() {
		return [...DateTimeWriteError.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [new DateTimeWriteError(internalConstructor, internalConstructor, 0), new DateTimeWriteError(internalConstructor, internalConstructor, 1)];
	static Unknown = DateTimeWriteError.#objectValues[0];
	static MissingTimeZoneVariant = DateTimeWriteError.#objectValues[1];
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_TimeZoneFormatter_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_WeekdaySetIterator_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_WeekInformation_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_WindowsParser_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_ZonedDateFormatter_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_ZonedDateFormatterGregorian_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_ZonedDateTimeFormatter_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_ZonedDateTimeFormatterGregorian_destroy_mv1(ptr);
});
new FinalizationRegistry((ptr) => {
	wasm.icu4x_ZonedTimeFormatter_destroy_mv1(ptr);
});
(class BidiClass {
	#value = void 0;
	static #values = new Map([
		["LeftToRight", 0],
		["RightToLeft", 1],
		["EuropeanNumber", 2],
		["EuropeanSeparator", 3],
		["EuropeanTerminator", 4],
		["ArabicNumber", 5],
		["CommonSeparator", 6],
		["ParagraphSeparator", 7],
		["SegmentSeparator", 8],
		["WhiteSpace", 9],
		["OtherNeutral", 10],
		["LeftToRightEmbedding", 11],
		["LeftToRightOverride", 12],
		["ArabicLetter", 13],
		["RightToLeftEmbedding", 14],
		["RightToLeftOverride", 15],
		["PopDirectionalFormat", 16],
		["NonspacingMark", 17],
		["BoundaryNeutral", 18],
		["FirstStrongIsolate", 19],
		["LeftToRightIsolate", 20],
		["RightToLeftIsolate", 21],
		["PopDirectionalIsolate", 22]
	]);
	static getAllEntries() {
		return BidiClass.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return BidiClass.#objectValues[arguments[1]];
		}
		if (value instanceof BidiClass) return value;
		let intVal = BidiClass.#values.get(value);
		if (intVal != null) return BidiClass.#objectValues[intVal];
		throw TypeError(value + " is not a BidiClass and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new BidiClass(value);
	}
	get value() {
		return [...BidiClass.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new BidiClass(internalConstructor, internalConstructor, 0),
		new BidiClass(internalConstructor, internalConstructor, 1),
		new BidiClass(internalConstructor, internalConstructor, 2),
		new BidiClass(internalConstructor, internalConstructor, 3),
		new BidiClass(internalConstructor, internalConstructor, 4),
		new BidiClass(internalConstructor, internalConstructor, 5),
		new BidiClass(internalConstructor, internalConstructor, 6),
		new BidiClass(internalConstructor, internalConstructor, 7),
		new BidiClass(internalConstructor, internalConstructor, 8),
		new BidiClass(internalConstructor, internalConstructor, 9),
		new BidiClass(internalConstructor, internalConstructor, 10),
		new BidiClass(internalConstructor, internalConstructor, 11),
		new BidiClass(internalConstructor, internalConstructor, 12),
		new BidiClass(internalConstructor, internalConstructor, 13),
		new BidiClass(internalConstructor, internalConstructor, 14),
		new BidiClass(internalConstructor, internalConstructor, 15),
		new BidiClass(internalConstructor, internalConstructor, 16),
		new BidiClass(internalConstructor, internalConstructor, 17),
		new BidiClass(internalConstructor, internalConstructor, 18),
		new BidiClass(internalConstructor, internalConstructor, 19),
		new BidiClass(internalConstructor, internalConstructor, 20),
		new BidiClass(internalConstructor, internalConstructor, 21),
		new BidiClass(internalConstructor, internalConstructor, 22)
	];
	static LeftToRight = BidiClass.#objectValues[0];
	static RightToLeft = BidiClass.#objectValues[1];
	static EuropeanNumber = BidiClass.#objectValues[2];
	static EuropeanSeparator = BidiClass.#objectValues[3];
	static EuropeanTerminator = BidiClass.#objectValues[4];
	static ArabicNumber = BidiClass.#objectValues[5];
	static CommonSeparator = BidiClass.#objectValues[6];
	static ParagraphSeparator = BidiClass.#objectValues[7];
	static SegmentSeparator = BidiClass.#objectValues[8];
	static WhiteSpace = BidiClass.#objectValues[9];
	static OtherNeutral = BidiClass.#objectValues[10];
	static LeftToRightEmbedding = BidiClass.#objectValues[11];
	static LeftToRightOverride = BidiClass.#objectValues[12];
	static ArabicLetter = BidiClass.#objectValues[13];
	static RightToLeftEmbedding = BidiClass.#objectValues[14];
	static RightToLeftOverride = BidiClass.#objectValues[15];
	static PopDirectionalFormat = BidiClass.#objectValues[16];
	static NonspacingMark = BidiClass.#objectValues[17];
	static BoundaryNeutral = BidiClass.#objectValues[18];
	static FirstStrongIsolate = BidiClass.#objectValues[19];
	static LeftToRightIsolate = BidiClass.#objectValues[20];
	static RightToLeftIsolate = BidiClass.#objectValues[21];
	static PopDirectionalIsolate = BidiClass.#objectValues[22];
	/**
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.EnumeratedProperty.html#tymethod.for_char) for more information.
	*/
	static forChar(ch) {
		const result = wasm.icu4x_BidiClass_for_char_mv1(ch);
		try {
			return new BidiClass(internalConstructor, result);
		} finally {}
	}
	/**
	* Get the "long" name of this property value (returns empty if property value is unknown)
	*
	* See the [Rust documentation for `get`](https://docs.rs/icu/2.1.1/icu/properties/struct.PropertyNamesLongBorrowed.html#method.get) for more information.
	*/
	longName() {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 9, 4, true);
		wasm.icu4x_BidiClass_long_name_mv1(diplomatReceive.buffer, this.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new DiplomatSliceStr(wasm, diplomatReceive.buffer, "string8", []).getValue();
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the "short" name of this property value (returns empty if property value is unknown)
	*
	* See the [Rust documentation for `get`](https://docs.rs/icu/2.1.1/icu/properties/struct.PropertyNamesShortBorrowed.html#method.get) for more information.
	*/
	shortName() {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 9, 4, true);
		wasm.icu4x_BidiClass_short_name_mv1(diplomatReceive.buffer, this.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new DiplomatSliceStr(wasm, diplomatReceive.buffer, "string8", []).getValue();
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Convert to an integer value usable with ICU4C and CodePointMapData
	*
	* See the [Rust documentation for `to_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.BidiClass.html#method.to_icu4c_value) for more information.
	*/
	toIntegerValue() {
		const result = wasm.icu4x_BidiClass_to_integer_value_mv1(this.ffiValue);
		try {
			return result;
		} finally {}
	}
	/**
	* Convert from an integer value from ICU4C or CodePointMapData
	*
	* See the [Rust documentation for `from_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.BidiClass.html#method.from_icu4c_value) for more information.
	*/
	static fromIntegerValue(other) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_BidiClass_from_integer_value_mv1(diplomatReceive.buffer, other);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new BidiClass(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
		} finally {
			diplomatReceive.free();
		}
	}
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class CanonicalCombiningClass {
	#value = void 0;
	static #values = new Map([
		["NotReordered", 0],
		["Overlay", 1],
		["HanReading", 6],
		["Nukta", 7],
		["KanaVoicing", 8],
		["Virama", 9],
		["Ccc10", 10],
		["Ccc11", 11],
		["Ccc12", 12],
		["Ccc13", 13],
		["Ccc14", 14],
		["Ccc15", 15],
		["Ccc16", 16],
		["Ccc17", 17],
		["Ccc18", 18],
		["Ccc19", 19],
		["Ccc20", 20],
		["Ccc21", 21],
		["Ccc22", 22],
		["Ccc23", 23],
		["Ccc24", 24],
		["Ccc25", 25],
		["Ccc26", 26],
		["Ccc27", 27],
		["Ccc28", 28],
		["Ccc29", 29],
		["Ccc30", 30],
		["Ccc31", 31],
		["Ccc32", 32],
		["Ccc33", 33],
		["Ccc34", 34],
		["Ccc35", 35],
		["Ccc36", 36],
		["Ccc84", 84],
		["Ccc91", 91],
		["Ccc103", 103],
		["Ccc107", 107],
		["Ccc118", 118],
		["Ccc122", 122],
		["Ccc129", 129],
		["Ccc130", 130],
		["Ccc132", 132],
		["Ccc133", 133],
		["AttachedBelowLeft", 200],
		["AttachedBelow", 202],
		["AttachedAbove", 214],
		["AttachedAboveRight", 216],
		["BelowLeft", 218],
		["Below", 220],
		["BelowRight", 222],
		["Left", 224],
		["Right", 226],
		["AboveLeft", 228],
		["Above", 230],
		["AboveRight", 232],
		["DoubleBelow", 233],
		["DoubleAbove", 234],
		["IotaSubscript", 240]
	]);
	static getAllEntries() {
		return CanonicalCombiningClass.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return CanonicalCombiningClass.#objectValues[arguments[1]];
		}
		if (value instanceof CanonicalCombiningClass) return value;
		let intVal = CanonicalCombiningClass.#values.get(value);
		if (intVal != null) return CanonicalCombiningClass.#objectValues[intVal];
		throw TypeError(value + " is not a CanonicalCombiningClass and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new CanonicalCombiningClass(value);
	}
	get value() {
		for (let entry of CanonicalCombiningClass.#values) if (entry[1] == this.#value) return entry[0];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = {
		[0]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 0),
		[1]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 1),
		[6]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 6),
		[7]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 7),
		[8]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 8),
		[9]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 9),
		[10]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 10),
		[11]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 11),
		[12]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 12),
		[13]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 13),
		[14]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 14),
		[15]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 15),
		[16]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 16),
		[17]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 17),
		[18]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 18),
		[19]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 19),
		[20]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 20),
		[21]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 21),
		[22]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 22),
		[23]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 23),
		[24]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 24),
		[25]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 25),
		[26]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 26),
		[27]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 27),
		[28]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 28),
		[29]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 29),
		[30]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 30),
		[31]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 31),
		[32]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 32),
		[33]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 33),
		[34]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 34),
		[35]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 35),
		[36]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 36),
		[84]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 84),
		[91]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 91),
		[103]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 103),
		[107]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 107),
		[118]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 118),
		[122]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 122),
		[129]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 129),
		[130]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 130),
		[132]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 132),
		[133]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 133),
		[200]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 200),
		[202]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 202),
		[214]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 214),
		[216]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 216),
		[218]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 218),
		[220]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 220),
		[222]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 222),
		[224]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 224),
		[226]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 226),
		[228]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 228),
		[230]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 230),
		[232]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 232),
		[233]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 233),
		[234]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 234),
		[240]: new CanonicalCombiningClass(internalConstructor, internalConstructor, 240)
	};
	static NotReordered = CanonicalCombiningClass.#objectValues[0];
	static Overlay = CanonicalCombiningClass.#objectValues[1];
	static HanReading = CanonicalCombiningClass.#objectValues[6];
	static Nukta = CanonicalCombiningClass.#objectValues[7];
	static KanaVoicing = CanonicalCombiningClass.#objectValues[8];
	static Virama = CanonicalCombiningClass.#objectValues[9];
	static Ccc10 = CanonicalCombiningClass.#objectValues[10];
	static Ccc11 = CanonicalCombiningClass.#objectValues[11];
	static Ccc12 = CanonicalCombiningClass.#objectValues[12];
	static Ccc13 = CanonicalCombiningClass.#objectValues[13];
	static Ccc14 = CanonicalCombiningClass.#objectValues[14];
	static Ccc15 = CanonicalCombiningClass.#objectValues[15];
	static Ccc16 = CanonicalCombiningClass.#objectValues[16];
	static Ccc17 = CanonicalCombiningClass.#objectValues[17];
	static Ccc18 = CanonicalCombiningClass.#objectValues[18];
	static Ccc19 = CanonicalCombiningClass.#objectValues[19];
	static Ccc20 = CanonicalCombiningClass.#objectValues[20];
	static Ccc21 = CanonicalCombiningClass.#objectValues[21];
	static Ccc22 = CanonicalCombiningClass.#objectValues[22];
	static Ccc23 = CanonicalCombiningClass.#objectValues[23];
	static Ccc24 = CanonicalCombiningClass.#objectValues[24];
	static Ccc25 = CanonicalCombiningClass.#objectValues[25];
	static Ccc26 = CanonicalCombiningClass.#objectValues[26];
	static Ccc27 = CanonicalCombiningClass.#objectValues[27];
	static Ccc28 = CanonicalCombiningClass.#objectValues[28];
	static Ccc29 = CanonicalCombiningClass.#objectValues[29];
	static Ccc30 = CanonicalCombiningClass.#objectValues[30];
	static Ccc31 = CanonicalCombiningClass.#objectValues[31];
	static Ccc32 = CanonicalCombiningClass.#objectValues[32];
	static Ccc33 = CanonicalCombiningClass.#objectValues[33];
	static Ccc34 = CanonicalCombiningClass.#objectValues[34];
	static Ccc35 = CanonicalCombiningClass.#objectValues[35];
	static Ccc36 = CanonicalCombiningClass.#objectValues[36];
	static Ccc84 = CanonicalCombiningClass.#objectValues[84];
	static Ccc91 = CanonicalCombiningClass.#objectValues[91];
	static Ccc103 = CanonicalCombiningClass.#objectValues[103];
	static Ccc107 = CanonicalCombiningClass.#objectValues[107];
	static Ccc118 = CanonicalCombiningClass.#objectValues[118];
	static Ccc122 = CanonicalCombiningClass.#objectValues[122];
	static Ccc129 = CanonicalCombiningClass.#objectValues[129];
	static Ccc130 = CanonicalCombiningClass.#objectValues[130];
	static Ccc132 = CanonicalCombiningClass.#objectValues[132];
	static Ccc133 = CanonicalCombiningClass.#objectValues[133];
	static AttachedBelowLeft = CanonicalCombiningClass.#objectValues[200];
	static AttachedBelow = CanonicalCombiningClass.#objectValues[202];
	static AttachedAbove = CanonicalCombiningClass.#objectValues[214];
	static AttachedAboveRight = CanonicalCombiningClass.#objectValues[216];
	static BelowLeft = CanonicalCombiningClass.#objectValues[218];
	static Below = CanonicalCombiningClass.#objectValues[220];
	static BelowRight = CanonicalCombiningClass.#objectValues[222];
	static Left = CanonicalCombiningClass.#objectValues[224];
	static Right = CanonicalCombiningClass.#objectValues[226];
	static AboveLeft = CanonicalCombiningClass.#objectValues[228];
	static Above = CanonicalCombiningClass.#objectValues[230];
	static AboveRight = CanonicalCombiningClass.#objectValues[232];
	static DoubleBelow = CanonicalCombiningClass.#objectValues[233];
	static DoubleAbove = CanonicalCombiningClass.#objectValues[234];
	static IotaSubscript = CanonicalCombiningClass.#objectValues[240];
	/**
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.EnumeratedProperty.html#tymethod.for_char) for more information.
	*/
	static forChar(ch) {
		const result = wasm.icu4x_CanonicalCombiningClass_for_char_mv1(ch);
		try {
			return new CanonicalCombiningClass(internalConstructor, result);
		} finally {}
	}
	/**
	* Convert to an integer value usable with ICU4C and CodePointMapData
	*
	* See the [Rust documentation for `to_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.CanonicalCombiningClass.html#method.to_icu4c_value) for more information.
	*/
	toIntegerValue() {
		const result = wasm.icu4x_CanonicalCombiningClass_to_integer_value_mv1(this.ffiValue);
		try {
			return result;
		} finally {}
	}
	/**
	* Convert from an integer value from ICU4C or CodePointMapData
	*
	* See the [Rust documentation for `from_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.CanonicalCombiningClass.html#method.from_icu4c_value) for more information.
	*/
	static fromIntegerValue(other) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_CanonicalCombiningClass_from_integer_value_mv1(diplomatReceive.buffer, other);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new CanonicalCombiningClass(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
		} finally {
			diplomatReceive.free();
		}
	}
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class EastAsianWidth {
	#value = void 0;
	static #values = new Map([
		["Neutral", 0],
		["Ambiguous", 1],
		["Halfwidth", 2],
		["Fullwidth", 3],
		["Narrow", 4],
		["Wide", 5]
	]);
	static getAllEntries() {
		return EastAsianWidth.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return EastAsianWidth.#objectValues[arguments[1]];
		}
		if (value instanceof EastAsianWidth) return value;
		let intVal = EastAsianWidth.#values.get(value);
		if (intVal != null) return EastAsianWidth.#objectValues[intVal];
		throw TypeError(value + " is not a EastAsianWidth and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new EastAsianWidth(value);
	}
	get value() {
		return [...EastAsianWidth.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new EastAsianWidth(internalConstructor, internalConstructor, 0),
		new EastAsianWidth(internalConstructor, internalConstructor, 1),
		new EastAsianWidth(internalConstructor, internalConstructor, 2),
		new EastAsianWidth(internalConstructor, internalConstructor, 3),
		new EastAsianWidth(internalConstructor, internalConstructor, 4),
		new EastAsianWidth(internalConstructor, internalConstructor, 5)
	];
	static Neutral = EastAsianWidth.#objectValues[0];
	static Ambiguous = EastAsianWidth.#objectValues[1];
	static Halfwidth = EastAsianWidth.#objectValues[2];
	static Fullwidth = EastAsianWidth.#objectValues[3];
	static Narrow = EastAsianWidth.#objectValues[4];
	static Wide = EastAsianWidth.#objectValues[5];
	/**
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.EnumeratedProperty.html#tymethod.for_char) for more information.
	*/
	static forChar(ch) {
		const result = wasm.icu4x_EastAsianWidth_for_char_mv1(ch);
		try {
			return new EastAsianWidth(internalConstructor, result);
		} finally {}
	}
	/**
	* Get the "long" name of this property value (returns empty if property value is unknown)
	*
	* See the [Rust documentation for `get`](https://docs.rs/icu/2.1.1/icu/properties/struct.PropertyNamesLongBorrowed.html#method.get) for more information.
	*/
	longName() {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 9, 4, true);
		wasm.icu4x_EastAsianWidth_long_name_mv1(diplomatReceive.buffer, this.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new DiplomatSliceStr(wasm, diplomatReceive.buffer, "string8", []).getValue();
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the "short" name of this property value (returns empty if property value is unknown)
	*
	* See the [Rust documentation for `get`](https://docs.rs/icu/2.1.1/icu/properties/struct.PropertyNamesShortBorrowed.html#method.get) for more information.
	*/
	shortName() {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 9, 4, true);
		wasm.icu4x_EastAsianWidth_short_name_mv1(diplomatReceive.buffer, this.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new DiplomatSliceStr(wasm, diplomatReceive.buffer, "string8", []).getValue();
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Convert to an integer value usable with ICU4C and CodePointMapData
	*
	* See the [Rust documentation for `to_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.EastAsianWidth.html#method.to_icu4c_value) for more information.
	*/
	toIntegerValue() {
		const result = wasm.icu4x_EastAsianWidth_to_integer_value_mv1(this.ffiValue);
		try {
			return result;
		} finally {}
	}
	/**
	* Convert from an integer value from ICU4C or CodePointMapData
	*
	* See the [Rust documentation for `from_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.EastAsianWidth.html#method.from_icu4c_value) for more information.
	*/
	static fromIntegerValue(other) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_EastAsianWidth_from_integer_value_mv1(diplomatReceive.buffer, other);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new EastAsianWidth(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
		} finally {
			diplomatReceive.free();
		}
	}
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class GraphemeClusterBreak {
	#value = void 0;
	static #values = new Map([
		["Other", 0],
		["Control", 1],
		["Cr", 2],
		["Extend", 3],
		["L", 4],
		["Lf", 5],
		["Lv", 6],
		["Lvt", 7],
		["T", 8],
		["V", 9],
		["SpacingMark", 10],
		["Prepend", 11],
		["RegionalIndicator", 12],
		["EBase", 13],
		["EBaseGaz", 14],
		["EModifier", 15],
		["GlueAfterZwj", 16],
		["Zwj", 17]
	]);
	static getAllEntries() {
		return GraphemeClusterBreak.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return GraphemeClusterBreak.#objectValues[arguments[1]];
		}
		if (value instanceof GraphemeClusterBreak) return value;
		let intVal = GraphemeClusterBreak.#values.get(value);
		if (intVal != null) return GraphemeClusterBreak.#objectValues[intVal];
		throw TypeError(value + " is not a GraphemeClusterBreak and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new GraphemeClusterBreak(value);
	}
	get value() {
		return [...GraphemeClusterBreak.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new GraphemeClusterBreak(internalConstructor, internalConstructor, 0),
		new GraphemeClusterBreak(internalConstructor, internalConstructor, 1),
		new GraphemeClusterBreak(internalConstructor, internalConstructor, 2),
		new GraphemeClusterBreak(internalConstructor, internalConstructor, 3),
		new GraphemeClusterBreak(internalConstructor, internalConstructor, 4),
		new GraphemeClusterBreak(internalConstructor, internalConstructor, 5),
		new GraphemeClusterBreak(internalConstructor, internalConstructor, 6),
		new GraphemeClusterBreak(internalConstructor, internalConstructor, 7),
		new GraphemeClusterBreak(internalConstructor, internalConstructor, 8),
		new GraphemeClusterBreak(internalConstructor, internalConstructor, 9),
		new GraphemeClusterBreak(internalConstructor, internalConstructor, 10),
		new GraphemeClusterBreak(internalConstructor, internalConstructor, 11),
		new GraphemeClusterBreak(internalConstructor, internalConstructor, 12),
		new GraphemeClusterBreak(internalConstructor, internalConstructor, 13),
		new GraphemeClusterBreak(internalConstructor, internalConstructor, 14),
		new GraphemeClusterBreak(internalConstructor, internalConstructor, 15),
		new GraphemeClusterBreak(internalConstructor, internalConstructor, 16),
		new GraphemeClusterBreak(internalConstructor, internalConstructor, 17)
	];
	static Other = GraphemeClusterBreak.#objectValues[0];
	static Control = GraphemeClusterBreak.#objectValues[1];
	static Cr = GraphemeClusterBreak.#objectValues[2];
	static Extend = GraphemeClusterBreak.#objectValues[3];
	static L = GraphemeClusterBreak.#objectValues[4];
	static Lf = GraphemeClusterBreak.#objectValues[5];
	static Lv = GraphemeClusterBreak.#objectValues[6];
	static Lvt = GraphemeClusterBreak.#objectValues[7];
	static T = GraphemeClusterBreak.#objectValues[8];
	static V = GraphemeClusterBreak.#objectValues[9];
	static SpacingMark = GraphemeClusterBreak.#objectValues[10];
	static Prepend = GraphemeClusterBreak.#objectValues[11];
	static RegionalIndicator = GraphemeClusterBreak.#objectValues[12];
	static EBase = GraphemeClusterBreak.#objectValues[13];
	static EBaseGaz = GraphemeClusterBreak.#objectValues[14];
	static EModifier = GraphemeClusterBreak.#objectValues[15];
	static GlueAfterZwj = GraphemeClusterBreak.#objectValues[16];
	static Zwj = GraphemeClusterBreak.#objectValues[17];
	/**
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.EnumeratedProperty.html#tymethod.for_char) for more information.
	*/
	static forChar(ch) {
		const result = wasm.icu4x_GraphemeClusterBreak_for_char_mv1(ch);
		try {
			return new GraphemeClusterBreak(internalConstructor, result);
		} finally {}
	}
	/**
	* Convert to an integer value usable with ICU4C and CodePointMapData
	*
	* See the [Rust documentation for `to_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GraphemeClusterBreak.html#method.to_icu4c_value) for more information.
	*/
	toIntegerValue() {
		const result = wasm.icu4x_GraphemeClusterBreak_to_integer_value_mv1(this.ffiValue);
		try {
			return result;
		} finally {}
	}
	/**
	* Convert from an integer value from ICU4C or CodePointMapData
	*
	* See the [Rust documentation for `from_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.GraphemeClusterBreak.html#method.from_icu4c_value) for more information.
	*/
	static fromIntegerValue(other) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_GraphemeClusterBreak_from_integer_value_mv1(diplomatReceive.buffer, other);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new GraphemeClusterBreak(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
		} finally {
			diplomatReceive.free();
		}
	}
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class HangulSyllableType {
	#value = void 0;
	static #values = new Map([
		["NotApplicable", 0],
		["LeadingJamo", 1],
		["VowelJamo", 2],
		["TrailingJamo", 3],
		["LeadingVowelSyllable", 4],
		["LeadingVowelTrailingSyllable", 5]
	]);
	static getAllEntries() {
		return HangulSyllableType.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return HangulSyllableType.#objectValues[arguments[1]];
		}
		if (value instanceof HangulSyllableType) return value;
		let intVal = HangulSyllableType.#values.get(value);
		if (intVal != null) return HangulSyllableType.#objectValues[intVal];
		throw TypeError(value + " is not a HangulSyllableType and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new HangulSyllableType(value);
	}
	get value() {
		return [...HangulSyllableType.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new HangulSyllableType(internalConstructor, internalConstructor, 0),
		new HangulSyllableType(internalConstructor, internalConstructor, 1),
		new HangulSyllableType(internalConstructor, internalConstructor, 2),
		new HangulSyllableType(internalConstructor, internalConstructor, 3),
		new HangulSyllableType(internalConstructor, internalConstructor, 4),
		new HangulSyllableType(internalConstructor, internalConstructor, 5)
	];
	static NotApplicable = HangulSyllableType.#objectValues[0];
	static LeadingJamo = HangulSyllableType.#objectValues[1];
	static VowelJamo = HangulSyllableType.#objectValues[2];
	static TrailingJamo = HangulSyllableType.#objectValues[3];
	static LeadingVowelSyllable = HangulSyllableType.#objectValues[4];
	static LeadingVowelTrailingSyllable = HangulSyllableType.#objectValues[5];
	/**
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.EnumeratedProperty.html#tymethod.for_char) for more information.
	*/
	static forChar(ch) {
		const result = wasm.icu4x_HangulSyllableType_for_char_mv1(ch);
		try {
			return new HangulSyllableType(internalConstructor, result);
		} finally {}
	}
	/**
	* Convert to an integer value usable with ICU4C and CodePointMapData
	*
	* See the [Rust documentation for `to_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.HangulSyllableType.html#method.to_icu4c_value) for more information.
	*/
	toIntegerValue() {
		const result = wasm.icu4x_HangulSyllableType_to_integer_value_mv1(this.ffiValue);
		try {
			return result;
		} finally {}
	}
	/**
	* Convert from an integer value from ICU4C or CodePointMapData
	*
	* See the [Rust documentation for `from_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.HangulSyllableType.html#method.from_icu4c_value) for more information.
	*/
	static fromIntegerValue(other) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_HangulSyllableType_from_integer_value_mv1(diplomatReceive.buffer, other);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new HangulSyllableType(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
		} finally {
			diplomatReceive.free();
		}
	}
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class IndicConjunctBreak {
	#value = void 0;
	static #values = new Map([
		["None", 0],
		["Consonant", 1],
		["Extend", 2],
		["Linker", 3]
	]);
	static getAllEntries() {
		return IndicConjunctBreak.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return IndicConjunctBreak.#objectValues[arguments[1]];
		}
		if (value instanceof IndicConjunctBreak) return value;
		let intVal = IndicConjunctBreak.#values.get(value);
		if (intVal != null) return IndicConjunctBreak.#objectValues[intVal];
		throw TypeError(value + " is not a IndicConjunctBreak and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new IndicConjunctBreak(value);
	}
	get value() {
		return [...IndicConjunctBreak.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new IndicConjunctBreak(internalConstructor, internalConstructor, 0),
		new IndicConjunctBreak(internalConstructor, internalConstructor, 1),
		new IndicConjunctBreak(internalConstructor, internalConstructor, 2),
		new IndicConjunctBreak(internalConstructor, internalConstructor, 3)
	];
	static None = IndicConjunctBreak.#objectValues[0];
	static Consonant = IndicConjunctBreak.#objectValues[1];
	static Extend = IndicConjunctBreak.#objectValues[2];
	static Linker = IndicConjunctBreak.#objectValues[3];
	/**
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.EnumeratedProperty.html#tymethod.for_char) for more information.
	*/
	static forChar(ch) {
		const result = wasm.icu4x_IndicConjunctBreak_for_char_mv1(ch);
		try {
			return new IndicConjunctBreak(internalConstructor, result);
		} finally {}
	}
	/**
	* Convert to an integer value usable with ICU4C and CodePointMapData
	*
	* See the [Rust documentation for `to_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.IndicConjunctBreak.html#method.to_icu4c_value) for more information.
	*/
	toIntegerValue() {
		const result = wasm.icu4x_IndicConjunctBreak_to_integer_value_mv1(this.ffiValue);
		try {
			return result;
		} finally {}
	}
	/**
	* Convert from an integer value from ICU4C or CodePointMapData
	*
	* See the [Rust documentation for `from_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.IndicConjunctBreak.html#method.from_icu4c_value) for more information.
	*/
	static fromIntegerValue(other) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_IndicConjunctBreak_from_integer_value_mv1(diplomatReceive.buffer, other);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new IndicConjunctBreak(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
		} finally {
			diplomatReceive.free();
		}
	}
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class IndicSyllabicCategory {
	#value = void 0;
	static #values = new Map([
		["Other", 0],
		["Avagraha", 1],
		["Bindu", 2],
		["BrahmiJoiningNumber", 3],
		["CantillationMark", 4],
		["Consonant", 5],
		["ConsonantDead", 6],
		["ConsonantFinal", 7],
		["ConsonantHeadLetter", 8],
		["ConsonantInitialPostfixed", 9],
		["ConsonantKiller", 10],
		["ConsonantMedial", 11],
		["ConsonantPlaceholder", 12],
		["ConsonantPrecedingRepha", 13],
		["ConsonantPrefixed", 14],
		["ConsonantSubjoined", 15],
		["ConsonantSucceedingRepha", 16],
		["ConsonantWithStacker", 17],
		["GeminationMark", 18],
		["InvisibleStacker", 19],
		["Joiner", 20],
		["ModifyingLetter", 21],
		["NonJoiner", 22],
		["Nukta", 23],
		["Number", 24],
		["NumberJoiner", 25],
		["PureKiller", 26],
		["RegisterShifter", 27],
		["SyllableModifier", 28],
		["ToneLetter", 29],
		["ToneMark", 30],
		["Virama", 31],
		["Visarga", 32],
		["Vowel", 33],
		["VowelDependent", 34],
		["VowelIndependent", 35],
		["ReorderingKiller", 36]
	]);
	static getAllEntries() {
		return IndicSyllabicCategory.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return IndicSyllabicCategory.#objectValues[arguments[1]];
		}
		if (value instanceof IndicSyllabicCategory) return value;
		let intVal = IndicSyllabicCategory.#values.get(value);
		if (intVal != null) return IndicSyllabicCategory.#objectValues[intVal];
		throw TypeError(value + " is not a IndicSyllabicCategory and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new IndicSyllabicCategory(value);
	}
	get value() {
		return [...IndicSyllabicCategory.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 0),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 1),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 2),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 3),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 4),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 5),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 6),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 7),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 8),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 9),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 10),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 11),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 12),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 13),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 14),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 15),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 16),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 17),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 18),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 19),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 20),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 21),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 22),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 23),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 24),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 25),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 26),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 27),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 28),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 29),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 30),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 31),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 32),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 33),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 34),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 35),
		new IndicSyllabicCategory(internalConstructor, internalConstructor, 36)
	];
	static Other = IndicSyllabicCategory.#objectValues[0];
	static Avagraha = IndicSyllabicCategory.#objectValues[1];
	static Bindu = IndicSyllabicCategory.#objectValues[2];
	static BrahmiJoiningNumber = IndicSyllabicCategory.#objectValues[3];
	static CantillationMark = IndicSyllabicCategory.#objectValues[4];
	static Consonant = IndicSyllabicCategory.#objectValues[5];
	static ConsonantDead = IndicSyllabicCategory.#objectValues[6];
	static ConsonantFinal = IndicSyllabicCategory.#objectValues[7];
	static ConsonantHeadLetter = IndicSyllabicCategory.#objectValues[8];
	static ConsonantInitialPostfixed = IndicSyllabicCategory.#objectValues[9];
	static ConsonantKiller = IndicSyllabicCategory.#objectValues[10];
	static ConsonantMedial = IndicSyllabicCategory.#objectValues[11];
	static ConsonantPlaceholder = IndicSyllabicCategory.#objectValues[12];
	static ConsonantPrecedingRepha = IndicSyllabicCategory.#objectValues[13];
	static ConsonantPrefixed = IndicSyllabicCategory.#objectValues[14];
	static ConsonantSubjoined = IndicSyllabicCategory.#objectValues[15];
	static ConsonantSucceedingRepha = IndicSyllabicCategory.#objectValues[16];
	static ConsonantWithStacker = IndicSyllabicCategory.#objectValues[17];
	static GeminationMark = IndicSyllabicCategory.#objectValues[18];
	static InvisibleStacker = IndicSyllabicCategory.#objectValues[19];
	static Joiner = IndicSyllabicCategory.#objectValues[20];
	static ModifyingLetter = IndicSyllabicCategory.#objectValues[21];
	static NonJoiner = IndicSyllabicCategory.#objectValues[22];
	static Nukta = IndicSyllabicCategory.#objectValues[23];
	static Number = IndicSyllabicCategory.#objectValues[24];
	static NumberJoiner = IndicSyllabicCategory.#objectValues[25];
	static PureKiller = IndicSyllabicCategory.#objectValues[26];
	static RegisterShifter = IndicSyllabicCategory.#objectValues[27];
	static SyllableModifier = IndicSyllabicCategory.#objectValues[28];
	static ToneLetter = IndicSyllabicCategory.#objectValues[29];
	static ToneMark = IndicSyllabicCategory.#objectValues[30];
	static Virama = IndicSyllabicCategory.#objectValues[31];
	static Visarga = IndicSyllabicCategory.#objectValues[32];
	static Vowel = IndicSyllabicCategory.#objectValues[33];
	static VowelDependent = IndicSyllabicCategory.#objectValues[34];
	static VowelIndependent = IndicSyllabicCategory.#objectValues[35];
	static ReorderingKiller = IndicSyllabicCategory.#objectValues[36];
	/**
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.EnumeratedProperty.html#tymethod.for_char) for more information.
	*/
	static forChar(ch) {
		const result = wasm.icu4x_IndicSyllabicCategory_for_char_mv1(ch);
		try {
			return new IndicSyllabicCategory(internalConstructor, result);
		} finally {}
	}
	/**
	* Convert to an integer value usable with ICU4C and CodePointMapData
	*
	* See the [Rust documentation for `to_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.IndicSyllabicCategory.html#method.to_icu4c_value) for more information.
	*/
	toIntegerValue() {
		const result = wasm.icu4x_IndicSyllabicCategory_to_integer_value_mv1(this.ffiValue);
		try {
			return result;
		} finally {}
	}
	/**
	* Convert from an integer value from ICU4C or CodePointMapData
	*
	* See the [Rust documentation for `from_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.IndicSyllabicCategory.html#method.from_icu4c_value) for more information.
	*/
	static fromIntegerValue(other) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_IndicSyllabicCategory_from_integer_value_mv1(diplomatReceive.buffer, other);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new IndicSyllabicCategory(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
		} finally {
			diplomatReceive.free();
		}
	}
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class JoiningType {
	#value = void 0;
	static #values = new Map([
		["NonJoining", 0],
		["JoinCausing", 1],
		["DualJoining", 2],
		["LeftJoining", 3],
		["RightJoining", 4],
		["Transparent", 5]
	]);
	static getAllEntries() {
		return JoiningType.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return JoiningType.#objectValues[arguments[1]];
		}
		if (value instanceof JoiningType) return value;
		let intVal = JoiningType.#values.get(value);
		if (intVal != null) return JoiningType.#objectValues[intVal];
		throw TypeError(value + " is not a JoiningType and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new JoiningType(value);
	}
	get value() {
		return [...JoiningType.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new JoiningType(internalConstructor, internalConstructor, 0),
		new JoiningType(internalConstructor, internalConstructor, 1),
		new JoiningType(internalConstructor, internalConstructor, 2),
		new JoiningType(internalConstructor, internalConstructor, 3),
		new JoiningType(internalConstructor, internalConstructor, 4),
		new JoiningType(internalConstructor, internalConstructor, 5)
	];
	static NonJoining = JoiningType.#objectValues[0];
	static JoinCausing = JoiningType.#objectValues[1];
	static DualJoining = JoiningType.#objectValues[2];
	static LeftJoining = JoiningType.#objectValues[3];
	static RightJoining = JoiningType.#objectValues[4];
	static Transparent = JoiningType.#objectValues[5];
	/**
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.EnumeratedProperty.html#tymethod.for_char) for more information.
	*/
	static forChar(ch) {
		const result = wasm.icu4x_JoiningType_for_char_mv1(ch);
		try {
			return new JoiningType(internalConstructor, result);
		} finally {}
	}
	/**
	* Get the "long" name of this property value (returns empty if property value is unknown)
	*
	* See the [Rust documentation for `get`](https://docs.rs/icu/2.1.1/icu/properties/struct.PropertyNamesLongBorrowed.html#method.get) for more information.
	*/
	longName() {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 9, 4, true);
		wasm.icu4x_JoiningType_long_name_mv1(diplomatReceive.buffer, this.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new DiplomatSliceStr(wasm, diplomatReceive.buffer, "string8", []).getValue();
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the "short" name of this property value (returns empty if property value is unknown)
	*
	* See the [Rust documentation for `get`](https://docs.rs/icu/2.1.1/icu/properties/struct.PropertyNamesShortBorrowed.html#method.get) for more information.
	*/
	shortName() {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 9, 4, true);
		wasm.icu4x_JoiningType_short_name_mv1(diplomatReceive.buffer, this.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new DiplomatSliceStr(wasm, diplomatReceive.buffer, "string8", []).getValue();
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Convert to an integer value usable with ICU4C and CodePointMapData
	*
	* See the [Rust documentation for `to_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.JoiningType.html#method.to_icu4c_value) for more information.
	*/
	toIntegerValue() {
		const result = wasm.icu4x_JoiningType_to_integer_value_mv1(this.ffiValue);
		try {
			return result;
		} finally {}
	}
	/**
	* Convert from an integer value from ICU4C or CodePointMapData
	*
	* See the [Rust documentation for `from_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.JoiningType.html#method.from_icu4c_value) for more information.
	*/
	static fromIntegerValue(other) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_JoiningType_from_integer_value_mv1(diplomatReceive.buffer, other);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new JoiningType(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
		} finally {
			diplomatReceive.free();
		}
	}
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
//#endregion
//#region vendor/LineBreak.mjs
/**
* See the [Rust documentation for `LineBreak`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.LineBreak.html) for more information.
*/
var LineBreak = class LineBreak {
	#value = void 0;
	static #values = new Map([
		["Unknown", 0],
		["Ambiguous", 1],
		["Alphabetic", 2],
		["BreakBoth", 3],
		["BreakAfter", 4],
		["BreakBefore", 5],
		["MandatoryBreak", 6],
		["ContingentBreak", 7],
		["ClosePunctuation", 8],
		["CombiningMark", 9],
		["CarriageReturn", 10],
		["Exclamation", 11],
		["Glue", 12],
		["Hyphen", 13],
		["Ideographic", 14],
		["Inseparable", 15],
		["InfixNumeric", 16],
		["LineFeed", 17],
		["Nonstarter", 18],
		["Numeric", 19],
		["OpenPunctuation", 20],
		["PostfixNumeric", 21],
		["PrefixNumeric", 22],
		["Quotation", 23],
		["ComplexContext", 24],
		["Surrogate", 25],
		["Space", 26],
		["BreakSymbols", 27],
		["ZwSpace", 28],
		["NextLine", 29],
		["WordJoiner", 30],
		["H2", 31],
		["H3", 32],
		["Jl", 33],
		["Jt", 34],
		["Jv", 35],
		["CloseParenthesis", 36],
		["ConditionalJapaneseStarter", 37],
		["HebrewLetter", 38],
		["RegionalIndicator", 39],
		["EBase", 40],
		["EModifier", 41],
		["Zwj", 42],
		["Aksara", 43],
		["AksaraPrebase", 44],
		["AksaraStart", 45],
		["ViramaFinal", 46],
		["Virama", 47],
		["UnambiguousHyphen", 48]
	]);
	static getAllEntries() {
		return LineBreak.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return LineBreak.#objectValues[arguments[1]];
		}
		if (value instanceof LineBreak) return value;
		let intVal = LineBreak.#values.get(value);
		if (intVal != null) return LineBreak.#objectValues[intVal];
		throw TypeError(value + " is not a LineBreak and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new LineBreak(value);
	}
	get value() {
		return [...LineBreak.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new LineBreak(internalConstructor, internalConstructor, 0),
		new LineBreak(internalConstructor, internalConstructor, 1),
		new LineBreak(internalConstructor, internalConstructor, 2),
		new LineBreak(internalConstructor, internalConstructor, 3),
		new LineBreak(internalConstructor, internalConstructor, 4),
		new LineBreak(internalConstructor, internalConstructor, 5),
		new LineBreak(internalConstructor, internalConstructor, 6),
		new LineBreak(internalConstructor, internalConstructor, 7),
		new LineBreak(internalConstructor, internalConstructor, 8),
		new LineBreak(internalConstructor, internalConstructor, 9),
		new LineBreak(internalConstructor, internalConstructor, 10),
		new LineBreak(internalConstructor, internalConstructor, 11),
		new LineBreak(internalConstructor, internalConstructor, 12),
		new LineBreak(internalConstructor, internalConstructor, 13),
		new LineBreak(internalConstructor, internalConstructor, 14),
		new LineBreak(internalConstructor, internalConstructor, 15),
		new LineBreak(internalConstructor, internalConstructor, 16),
		new LineBreak(internalConstructor, internalConstructor, 17),
		new LineBreak(internalConstructor, internalConstructor, 18),
		new LineBreak(internalConstructor, internalConstructor, 19),
		new LineBreak(internalConstructor, internalConstructor, 20),
		new LineBreak(internalConstructor, internalConstructor, 21),
		new LineBreak(internalConstructor, internalConstructor, 22),
		new LineBreak(internalConstructor, internalConstructor, 23),
		new LineBreak(internalConstructor, internalConstructor, 24),
		new LineBreak(internalConstructor, internalConstructor, 25),
		new LineBreak(internalConstructor, internalConstructor, 26),
		new LineBreak(internalConstructor, internalConstructor, 27),
		new LineBreak(internalConstructor, internalConstructor, 28),
		new LineBreak(internalConstructor, internalConstructor, 29),
		new LineBreak(internalConstructor, internalConstructor, 30),
		new LineBreak(internalConstructor, internalConstructor, 31),
		new LineBreak(internalConstructor, internalConstructor, 32),
		new LineBreak(internalConstructor, internalConstructor, 33),
		new LineBreak(internalConstructor, internalConstructor, 34),
		new LineBreak(internalConstructor, internalConstructor, 35),
		new LineBreak(internalConstructor, internalConstructor, 36),
		new LineBreak(internalConstructor, internalConstructor, 37),
		new LineBreak(internalConstructor, internalConstructor, 38),
		new LineBreak(internalConstructor, internalConstructor, 39),
		new LineBreak(internalConstructor, internalConstructor, 40),
		new LineBreak(internalConstructor, internalConstructor, 41),
		new LineBreak(internalConstructor, internalConstructor, 42),
		new LineBreak(internalConstructor, internalConstructor, 43),
		new LineBreak(internalConstructor, internalConstructor, 44),
		new LineBreak(internalConstructor, internalConstructor, 45),
		new LineBreak(internalConstructor, internalConstructor, 46),
		new LineBreak(internalConstructor, internalConstructor, 47),
		new LineBreak(internalConstructor, internalConstructor, 48)
	];
	static Unknown = LineBreak.#objectValues[0];
	static Ambiguous = LineBreak.#objectValues[1];
	static Alphabetic = LineBreak.#objectValues[2];
	static BreakBoth = LineBreak.#objectValues[3];
	static BreakAfter = LineBreak.#objectValues[4];
	static BreakBefore = LineBreak.#objectValues[5];
	static MandatoryBreak = LineBreak.#objectValues[6];
	static ContingentBreak = LineBreak.#objectValues[7];
	static ClosePunctuation = LineBreak.#objectValues[8];
	static CombiningMark = LineBreak.#objectValues[9];
	static CarriageReturn = LineBreak.#objectValues[10];
	static Exclamation = LineBreak.#objectValues[11];
	static Glue = LineBreak.#objectValues[12];
	static Hyphen = LineBreak.#objectValues[13];
	static Ideographic = LineBreak.#objectValues[14];
	static Inseparable = LineBreak.#objectValues[15];
	static InfixNumeric = LineBreak.#objectValues[16];
	static LineFeed = LineBreak.#objectValues[17];
	static Nonstarter = LineBreak.#objectValues[18];
	static Numeric = LineBreak.#objectValues[19];
	static OpenPunctuation = LineBreak.#objectValues[20];
	static PostfixNumeric = LineBreak.#objectValues[21];
	static PrefixNumeric = LineBreak.#objectValues[22];
	static Quotation = LineBreak.#objectValues[23];
	static ComplexContext = LineBreak.#objectValues[24];
	static Surrogate = LineBreak.#objectValues[25];
	static Space = LineBreak.#objectValues[26];
	static BreakSymbols = LineBreak.#objectValues[27];
	static ZwSpace = LineBreak.#objectValues[28];
	static NextLine = LineBreak.#objectValues[29];
	static WordJoiner = LineBreak.#objectValues[30];
	static H2 = LineBreak.#objectValues[31];
	static H3 = LineBreak.#objectValues[32];
	static Jl = LineBreak.#objectValues[33];
	static Jt = LineBreak.#objectValues[34];
	static Jv = LineBreak.#objectValues[35];
	static CloseParenthesis = LineBreak.#objectValues[36];
	static ConditionalJapaneseStarter = LineBreak.#objectValues[37];
	static HebrewLetter = LineBreak.#objectValues[38];
	static RegionalIndicator = LineBreak.#objectValues[39];
	static EBase = LineBreak.#objectValues[40];
	static EModifier = LineBreak.#objectValues[41];
	static Zwj = LineBreak.#objectValues[42];
	static Aksara = LineBreak.#objectValues[43];
	static AksaraPrebase = LineBreak.#objectValues[44];
	static AksaraStart = LineBreak.#objectValues[45];
	static ViramaFinal = LineBreak.#objectValues[46];
	static Virama = LineBreak.#objectValues[47];
	static UnambiguousHyphen = LineBreak.#objectValues[48];
	/**
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.EnumeratedProperty.html#tymethod.for_char) for more information.
	*/
	static forChar(ch) {
		const result = wasm.icu4x_LineBreak_for_char_mv1(ch);
		try {
			return new LineBreak(internalConstructor, result);
		} finally {}
	}
	/**
	* Get the "long" name of this property value (returns empty if property value is unknown)
	*
	* See the [Rust documentation for `get`](https://docs.rs/icu/2.1.1/icu/properties/struct.PropertyNamesLongBorrowed.html#method.get) for more information.
	*/
	longName() {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 9, 4, true);
		wasm.icu4x_LineBreak_long_name_mv1(diplomatReceive.buffer, this.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new DiplomatSliceStr(wasm, diplomatReceive.buffer, "string8", []).getValue();
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the "short" name of this property value (returns empty if property value is unknown)
	*
	* See the [Rust documentation for `get`](https://docs.rs/icu/2.1.1/icu/properties/struct.PropertyNamesShortBorrowed.html#method.get) for more information.
	*/
	shortName() {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 9, 4, true);
		wasm.icu4x_LineBreak_short_name_mv1(diplomatReceive.buffer, this.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new DiplomatSliceStr(wasm, diplomatReceive.buffer, "string8", []).getValue();
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Convert to an integer value usable with ICU4C and CodePointMapData
	*
	* See the [Rust documentation for `to_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.LineBreak.html#method.to_icu4c_value) for more information.
	*/
	toIntegerValue() {
		const result = wasm.icu4x_LineBreak_to_integer_value_mv1(this.ffiValue);
		try {
			return result;
		} finally {}
	}
	/**
	* Convert from an integer value from ICU4C or CodePointMapData
	*
	* See the [Rust documentation for `from_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.LineBreak.html#method.from_icu4c_value) for more information.
	*/
	static fromIntegerValue(other) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_LineBreak_from_integer_value_mv1(diplomatReceive.buffer, other);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new LineBreak(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
		} finally {
			diplomatReceive.free();
		}
	}
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
};
(class Script {
	#value = void 0;
	static #values = new Map([
		["Adlam", 167],
		["Ahom", 161],
		["AnatolianHieroglyphs", 156],
		["Arabic", 2],
		["Armenian", 3],
		["Avestan", 117],
		["Balinese", 62],
		["Bamum", 130],
		["BassaVah", 134],
		["Batak", 63],
		["Bengali", 4],
		["BeriaErfe", 208],
		["Bhaiksuki", 168],
		["Bopomofo", 5],
		["Brahmi", 65],
		["Braille", 46],
		["Buginese", 55],
		["Buhid", 44],
		["CanadianAboriginal", 40],
		["Carian", 104],
		["CaucasianAlbanian", 159],
		["Chakma", 118],
		["Cham", 66],
		["Cherokee", 6],
		["Chisoi", 254],
		["Chorasmian", 189],
		["Common", 0],
		["Coptic", 7],
		["Cuneiform", 101],
		["Cypriot", 47],
		["CyproMinoan", 193],
		["Cyrillic", 8],
		["Deseret", 9],
		["Devanagari", 10],
		["DivesAkuru", 190],
		["Dogra", 178],
		["Duployan", 135],
		["EgyptianHieroglyphs", 71],
		["Elbasan", 136],
		["Elymaic", 185],
		["Ethiopian", 11],
		["Garay", 201],
		["Georgian", 12],
		["Glagolitic", 56],
		["Gothic", 13],
		["Grantha", 137],
		["Greek", 14],
		["Gujarati", 15],
		["GunjalaGondi", 179],
		["Gurmukhi", 16],
		["GurungKhema", 202],
		["Han", 17],
		["Hangul", 18],
		["HanifiRohingya", 182],
		["Hanunoo", 43],
		["Hatran", 162],
		["Hebrew", 19],
		["Hiragana", 20],
		["ImperialAramaic", 116],
		["Inherited", 1],
		["InscriptionalPahlavi", 122],
		["InscriptionalParthian", 125],
		["Javanese", 78],
		["Kaithi", 120],
		["Kannada", 21],
		["Katakana", 22],
		["Kawi", 198],
		["KayahLi", 79],
		["Kharoshthi", 57],
		["KhitanSmallScript", 191],
		["Khmer", 23],
		["Khojki", 157],
		["Khudawadi", 145],
		["KiratRai", 203],
		["Lao", 24],
		["Latin", 25],
		["Lepcha", 82],
		["Limbu", 48],
		["LinearA", 83],
		["LinearB", 49],
		["Lisu", 131],
		["Lycian", 107],
		["Lydian", 108],
		["Mahajani", 160],
		["Makasar", 180],
		["Malayalam", 26],
		["Mandaic", 84],
		["Manichaean", 121],
		["Marchen", 169],
		["MasaramGondi", 175],
		["Medefaidrin", 181],
		["MeeteiMayek", 115],
		["MendeKikakui", 140],
		["MeroiticCursive", 141],
		["MeroiticHieroglyphs", 86],
		["Miao", 92],
		["Modi", 163],
		["Mongolian", 27],
		["Mro", 149],
		["Multani", 164],
		["Myanmar", 28],
		["Nabataean", 143],
		["NagMundari", 199],
		["Nandinagari", 187],
		["Nastaliq", 200],
		["NewTaiLue", 59],
		["Newa", 170],
		["Nko", 87],
		["Nushu", 150],
		["NyiakengPuachueHmong", 186],
		["Ogham", 29],
		["OlChiki", 109],
		["OldHungarian", 76],
		["OldItalic", 30],
		["OldNorthArabian", 142],
		["OldPermic", 89],
		["OldPersian", 61],
		["OldSogdian", 184],
		["OldSouthArabian", 133],
		["OldTurkic", 88],
		["OldUyghur", 194],
		["OlOnal", 204],
		["Oriya", 31],
		["Osage", 171],
		["Osmanya", 50],
		["PahawhHmong", 75],
		["Palmyrene", 144],
		["PauCinHau", 165],
		["PhagsPa", 90],
		["Phoenician", 91],
		["PsalterPahlavi", 123],
		["Rejang", 110],
		["Runic", 32],
		["Samaritan", 126],
		["Saurashtra", 111],
		["Sharada", 151],
		["Shavian", 51],
		["Siddham", 166],
		["Sidetic", 209],
		["SignWriting", 112],
		["Sinhala", 33],
		["Sogdian", 183],
		["SoraSompeng", 152],
		["Soyombo", 176],
		["Sundanese", 113],
		["Sunuwar", 205],
		["SylotiNagri", 58],
		["Syriac", 34],
		["Tagalog", 42],
		["Tagbanwa", 45],
		["TaiLe", 52],
		["TaiTham", 106],
		["TaiViet", 127],
		["TaiYo", 210],
		["Takri", 153],
		["Tamil", 35],
		["Tangsa", 195],
		["Tangut", 154],
		["Telugu", 36],
		["Thaana", 37],
		["Thai", 38],
		["Tibetan", 39],
		["Tifinagh", 60],
		["Tirhuta", 158],
		["Todhri", 206],
		["TolongSiki", 211],
		["Toto", 196],
		["TuluTigalari", 207],
		["Ugaritic", 53],
		["Unknown", 103],
		["Vai", 99],
		["Vithkuqi", 197],
		["Wancho", 188],
		["WarangCiti", 146],
		["Yezidi", 192],
		["Yi", 41],
		["ZanabazarSquare", 177]
	]);
	static getAllEntries() {
		return Script.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return Script.#objectValues[arguments[1]];
		}
		if (value instanceof Script) return value;
		let intVal = Script.#values.get(value);
		if (intVal != null) return Script.#objectValues[intVal];
		throw TypeError(value + " is not a Script and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new Script(value);
	}
	get value() {
		for (let entry of Script.#values) if (entry[1] == this.#value) return entry[0];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = {
		[167]: new Script(internalConstructor, internalConstructor, 167),
		[161]: new Script(internalConstructor, internalConstructor, 161),
		[156]: new Script(internalConstructor, internalConstructor, 156),
		[2]: new Script(internalConstructor, internalConstructor, 2),
		[3]: new Script(internalConstructor, internalConstructor, 3),
		[117]: new Script(internalConstructor, internalConstructor, 117),
		[62]: new Script(internalConstructor, internalConstructor, 62),
		[130]: new Script(internalConstructor, internalConstructor, 130),
		[134]: new Script(internalConstructor, internalConstructor, 134),
		[63]: new Script(internalConstructor, internalConstructor, 63),
		[4]: new Script(internalConstructor, internalConstructor, 4),
		[208]: new Script(internalConstructor, internalConstructor, 208),
		[168]: new Script(internalConstructor, internalConstructor, 168),
		[5]: new Script(internalConstructor, internalConstructor, 5),
		[65]: new Script(internalConstructor, internalConstructor, 65),
		[46]: new Script(internalConstructor, internalConstructor, 46),
		[55]: new Script(internalConstructor, internalConstructor, 55),
		[44]: new Script(internalConstructor, internalConstructor, 44),
		[40]: new Script(internalConstructor, internalConstructor, 40),
		[104]: new Script(internalConstructor, internalConstructor, 104),
		[159]: new Script(internalConstructor, internalConstructor, 159),
		[118]: new Script(internalConstructor, internalConstructor, 118),
		[66]: new Script(internalConstructor, internalConstructor, 66),
		[6]: new Script(internalConstructor, internalConstructor, 6),
		[254]: new Script(internalConstructor, internalConstructor, 254),
		[189]: new Script(internalConstructor, internalConstructor, 189),
		[0]: new Script(internalConstructor, internalConstructor, 0),
		[7]: new Script(internalConstructor, internalConstructor, 7),
		[101]: new Script(internalConstructor, internalConstructor, 101),
		[47]: new Script(internalConstructor, internalConstructor, 47),
		[193]: new Script(internalConstructor, internalConstructor, 193),
		[8]: new Script(internalConstructor, internalConstructor, 8),
		[9]: new Script(internalConstructor, internalConstructor, 9),
		[10]: new Script(internalConstructor, internalConstructor, 10),
		[190]: new Script(internalConstructor, internalConstructor, 190),
		[178]: new Script(internalConstructor, internalConstructor, 178),
		[135]: new Script(internalConstructor, internalConstructor, 135),
		[71]: new Script(internalConstructor, internalConstructor, 71),
		[136]: new Script(internalConstructor, internalConstructor, 136),
		[185]: new Script(internalConstructor, internalConstructor, 185),
		[11]: new Script(internalConstructor, internalConstructor, 11),
		[201]: new Script(internalConstructor, internalConstructor, 201),
		[12]: new Script(internalConstructor, internalConstructor, 12),
		[56]: new Script(internalConstructor, internalConstructor, 56),
		[13]: new Script(internalConstructor, internalConstructor, 13),
		[137]: new Script(internalConstructor, internalConstructor, 137),
		[14]: new Script(internalConstructor, internalConstructor, 14),
		[15]: new Script(internalConstructor, internalConstructor, 15),
		[179]: new Script(internalConstructor, internalConstructor, 179),
		[16]: new Script(internalConstructor, internalConstructor, 16),
		[202]: new Script(internalConstructor, internalConstructor, 202),
		[17]: new Script(internalConstructor, internalConstructor, 17),
		[18]: new Script(internalConstructor, internalConstructor, 18),
		[182]: new Script(internalConstructor, internalConstructor, 182),
		[43]: new Script(internalConstructor, internalConstructor, 43),
		[162]: new Script(internalConstructor, internalConstructor, 162),
		[19]: new Script(internalConstructor, internalConstructor, 19),
		[20]: new Script(internalConstructor, internalConstructor, 20),
		[116]: new Script(internalConstructor, internalConstructor, 116),
		[1]: new Script(internalConstructor, internalConstructor, 1),
		[122]: new Script(internalConstructor, internalConstructor, 122),
		[125]: new Script(internalConstructor, internalConstructor, 125),
		[78]: new Script(internalConstructor, internalConstructor, 78),
		[120]: new Script(internalConstructor, internalConstructor, 120),
		[21]: new Script(internalConstructor, internalConstructor, 21),
		[22]: new Script(internalConstructor, internalConstructor, 22),
		[198]: new Script(internalConstructor, internalConstructor, 198),
		[79]: new Script(internalConstructor, internalConstructor, 79),
		[57]: new Script(internalConstructor, internalConstructor, 57),
		[191]: new Script(internalConstructor, internalConstructor, 191),
		[23]: new Script(internalConstructor, internalConstructor, 23),
		[157]: new Script(internalConstructor, internalConstructor, 157),
		[145]: new Script(internalConstructor, internalConstructor, 145),
		[203]: new Script(internalConstructor, internalConstructor, 203),
		[24]: new Script(internalConstructor, internalConstructor, 24),
		[25]: new Script(internalConstructor, internalConstructor, 25),
		[82]: new Script(internalConstructor, internalConstructor, 82),
		[48]: new Script(internalConstructor, internalConstructor, 48),
		[83]: new Script(internalConstructor, internalConstructor, 83),
		[49]: new Script(internalConstructor, internalConstructor, 49),
		[131]: new Script(internalConstructor, internalConstructor, 131),
		[107]: new Script(internalConstructor, internalConstructor, 107),
		[108]: new Script(internalConstructor, internalConstructor, 108),
		[160]: new Script(internalConstructor, internalConstructor, 160),
		[180]: new Script(internalConstructor, internalConstructor, 180),
		[26]: new Script(internalConstructor, internalConstructor, 26),
		[84]: new Script(internalConstructor, internalConstructor, 84),
		[121]: new Script(internalConstructor, internalConstructor, 121),
		[169]: new Script(internalConstructor, internalConstructor, 169),
		[175]: new Script(internalConstructor, internalConstructor, 175),
		[181]: new Script(internalConstructor, internalConstructor, 181),
		[115]: new Script(internalConstructor, internalConstructor, 115),
		[140]: new Script(internalConstructor, internalConstructor, 140),
		[141]: new Script(internalConstructor, internalConstructor, 141),
		[86]: new Script(internalConstructor, internalConstructor, 86),
		[92]: new Script(internalConstructor, internalConstructor, 92),
		[163]: new Script(internalConstructor, internalConstructor, 163),
		[27]: new Script(internalConstructor, internalConstructor, 27),
		[149]: new Script(internalConstructor, internalConstructor, 149),
		[164]: new Script(internalConstructor, internalConstructor, 164),
		[28]: new Script(internalConstructor, internalConstructor, 28),
		[143]: new Script(internalConstructor, internalConstructor, 143),
		[199]: new Script(internalConstructor, internalConstructor, 199),
		[187]: new Script(internalConstructor, internalConstructor, 187),
		[200]: new Script(internalConstructor, internalConstructor, 200),
		[59]: new Script(internalConstructor, internalConstructor, 59),
		[170]: new Script(internalConstructor, internalConstructor, 170),
		[87]: new Script(internalConstructor, internalConstructor, 87),
		[150]: new Script(internalConstructor, internalConstructor, 150),
		[186]: new Script(internalConstructor, internalConstructor, 186),
		[29]: new Script(internalConstructor, internalConstructor, 29),
		[109]: new Script(internalConstructor, internalConstructor, 109),
		[76]: new Script(internalConstructor, internalConstructor, 76),
		[30]: new Script(internalConstructor, internalConstructor, 30),
		[142]: new Script(internalConstructor, internalConstructor, 142),
		[89]: new Script(internalConstructor, internalConstructor, 89),
		[61]: new Script(internalConstructor, internalConstructor, 61),
		[184]: new Script(internalConstructor, internalConstructor, 184),
		[133]: new Script(internalConstructor, internalConstructor, 133),
		[88]: new Script(internalConstructor, internalConstructor, 88),
		[194]: new Script(internalConstructor, internalConstructor, 194),
		[204]: new Script(internalConstructor, internalConstructor, 204),
		[31]: new Script(internalConstructor, internalConstructor, 31),
		[171]: new Script(internalConstructor, internalConstructor, 171),
		[50]: new Script(internalConstructor, internalConstructor, 50),
		[75]: new Script(internalConstructor, internalConstructor, 75),
		[144]: new Script(internalConstructor, internalConstructor, 144),
		[165]: new Script(internalConstructor, internalConstructor, 165),
		[90]: new Script(internalConstructor, internalConstructor, 90),
		[91]: new Script(internalConstructor, internalConstructor, 91),
		[123]: new Script(internalConstructor, internalConstructor, 123),
		[110]: new Script(internalConstructor, internalConstructor, 110),
		[32]: new Script(internalConstructor, internalConstructor, 32),
		[126]: new Script(internalConstructor, internalConstructor, 126),
		[111]: new Script(internalConstructor, internalConstructor, 111),
		[151]: new Script(internalConstructor, internalConstructor, 151),
		[51]: new Script(internalConstructor, internalConstructor, 51),
		[166]: new Script(internalConstructor, internalConstructor, 166),
		[209]: new Script(internalConstructor, internalConstructor, 209),
		[112]: new Script(internalConstructor, internalConstructor, 112),
		[33]: new Script(internalConstructor, internalConstructor, 33),
		[183]: new Script(internalConstructor, internalConstructor, 183),
		[152]: new Script(internalConstructor, internalConstructor, 152),
		[176]: new Script(internalConstructor, internalConstructor, 176),
		[113]: new Script(internalConstructor, internalConstructor, 113),
		[205]: new Script(internalConstructor, internalConstructor, 205),
		[58]: new Script(internalConstructor, internalConstructor, 58),
		[34]: new Script(internalConstructor, internalConstructor, 34),
		[42]: new Script(internalConstructor, internalConstructor, 42),
		[45]: new Script(internalConstructor, internalConstructor, 45),
		[52]: new Script(internalConstructor, internalConstructor, 52),
		[106]: new Script(internalConstructor, internalConstructor, 106),
		[127]: new Script(internalConstructor, internalConstructor, 127),
		[210]: new Script(internalConstructor, internalConstructor, 210),
		[153]: new Script(internalConstructor, internalConstructor, 153),
		[35]: new Script(internalConstructor, internalConstructor, 35),
		[195]: new Script(internalConstructor, internalConstructor, 195),
		[154]: new Script(internalConstructor, internalConstructor, 154),
		[36]: new Script(internalConstructor, internalConstructor, 36),
		[37]: new Script(internalConstructor, internalConstructor, 37),
		[38]: new Script(internalConstructor, internalConstructor, 38),
		[39]: new Script(internalConstructor, internalConstructor, 39),
		[60]: new Script(internalConstructor, internalConstructor, 60),
		[158]: new Script(internalConstructor, internalConstructor, 158),
		[206]: new Script(internalConstructor, internalConstructor, 206),
		[211]: new Script(internalConstructor, internalConstructor, 211),
		[196]: new Script(internalConstructor, internalConstructor, 196),
		[207]: new Script(internalConstructor, internalConstructor, 207),
		[53]: new Script(internalConstructor, internalConstructor, 53),
		[103]: new Script(internalConstructor, internalConstructor, 103),
		[99]: new Script(internalConstructor, internalConstructor, 99),
		[197]: new Script(internalConstructor, internalConstructor, 197),
		[188]: new Script(internalConstructor, internalConstructor, 188),
		[146]: new Script(internalConstructor, internalConstructor, 146),
		[192]: new Script(internalConstructor, internalConstructor, 192),
		[41]: new Script(internalConstructor, internalConstructor, 41),
		[177]: new Script(internalConstructor, internalConstructor, 177)
	};
	static Adlam = Script.#objectValues[167];
	static Ahom = Script.#objectValues[161];
	static AnatolianHieroglyphs = Script.#objectValues[156];
	static Arabic = Script.#objectValues[2];
	static Armenian = Script.#objectValues[3];
	static Avestan = Script.#objectValues[117];
	static Balinese = Script.#objectValues[62];
	static Bamum = Script.#objectValues[130];
	static BassaVah = Script.#objectValues[134];
	static Batak = Script.#objectValues[63];
	static Bengali = Script.#objectValues[4];
	static BeriaErfe = Script.#objectValues[208];
	static Bhaiksuki = Script.#objectValues[168];
	static Bopomofo = Script.#objectValues[5];
	static Brahmi = Script.#objectValues[65];
	static Braille = Script.#objectValues[46];
	static Buginese = Script.#objectValues[55];
	static Buhid = Script.#objectValues[44];
	static CanadianAboriginal = Script.#objectValues[40];
	static Carian = Script.#objectValues[104];
	static CaucasianAlbanian = Script.#objectValues[159];
	static Chakma = Script.#objectValues[118];
	static Cham = Script.#objectValues[66];
	static Cherokee = Script.#objectValues[6];
	static Chisoi = Script.#objectValues[254];
	static Chorasmian = Script.#objectValues[189];
	static Common = Script.#objectValues[0];
	static Coptic = Script.#objectValues[7];
	static Cuneiform = Script.#objectValues[101];
	static Cypriot = Script.#objectValues[47];
	static CyproMinoan = Script.#objectValues[193];
	static Cyrillic = Script.#objectValues[8];
	static Deseret = Script.#objectValues[9];
	static Devanagari = Script.#objectValues[10];
	static DivesAkuru = Script.#objectValues[190];
	static Dogra = Script.#objectValues[178];
	static Duployan = Script.#objectValues[135];
	static EgyptianHieroglyphs = Script.#objectValues[71];
	static Elbasan = Script.#objectValues[136];
	static Elymaic = Script.#objectValues[185];
	static Ethiopian = Script.#objectValues[11];
	static Garay = Script.#objectValues[201];
	static Georgian = Script.#objectValues[12];
	static Glagolitic = Script.#objectValues[56];
	static Gothic = Script.#objectValues[13];
	static Grantha = Script.#objectValues[137];
	static Greek = Script.#objectValues[14];
	static Gujarati = Script.#objectValues[15];
	static GunjalaGondi = Script.#objectValues[179];
	static Gurmukhi = Script.#objectValues[16];
	static GurungKhema = Script.#objectValues[202];
	static Han = Script.#objectValues[17];
	static Hangul = Script.#objectValues[18];
	static HanifiRohingya = Script.#objectValues[182];
	static Hanunoo = Script.#objectValues[43];
	static Hatran = Script.#objectValues[162];
	static Hebrew = Script.#objectValues[19];
	static Hiragana = Script.#objectValues[20];
	static ImperialAramaic = Script.#objectValues[116];
	static Inherited = Script.#objectValues[1];
	static InscriptionalPahlavi = Script.#objectValues[122];
	static InscriptionalParthian = Script.#objectValues[125];
	static Javanese = Script.#objectValues[78];
	static Kaithi = Script.#objectValues[120];
	static Kannada = Script.#objectValues[21];
	static Katakana = Script.#objectValues[22];
	static Kawi = Script.#objectValues[198];
	static KayahLi = Script.#objectValues[79];
	static Kharoshthi = Script.#objectValues[57];
	static KhitanSmallScript = Script.#objectValues[191];
	static Khmer = Script.#objectValues[23];
	static Khojki = Script.#objectValues[157];
	static Khudawadi = Script.#objectValues[145];
	static KiratRai = Script.#objectValues[203];
	static Lao = Script.#objectValues[24];
	static Latin = Script.#objectValues[25];
	static Lepcha = Script.#objectValues[82];
	static Limbu = Script.#objectValues[48];
	static LinearA = Script.#objectValues[83];
	static LinearB = Script.#objectValues[49];
	static Lisu = Script.#objectValues[131];
	static Lycian = Script.#objectValues[107];
	static Lydian = Script.#objectValues[108];
	static Mahajani = Script.#objectValues[160];
	static Makasar = Script.#objectValues[180];
	static Malayalam = Script.#objectValues[26];
	static Mandaic = Script.#objectValues[84];
	static Manichaean = Script.#objectValues[121];
	static Marchen = Script.#objectValues[169];
	static MasaramGondi = Script.#objectValues[175];
	static Medefaidrin = Script.#objectValues[181];
	static MeeteiMayek = Script.#objectValues[115];
	static MendeKikakui = Script.#objectValues[140];
	static MeroiticCursive = Script.#objectValues[141];
	static MeroiticHieroglyphs = Script.#objectValues[86];
	static Miao = Script.#objectValues[92];
	static Modi = Script.#objectValues[163];
	static Mongolian = Script.#objectValues[27];
	static Mro = Script.#objectValues[149];
	static Multani = Script.#objectValues[164];
	static Myanmar = Script.#objectValues[28];
	static Nabataean = Script.#objectValues[143];
	static NagMundari = Script.#objectValues[199];
	static Nandinagari = Script.#objectValues[187];
	static Nastaliq = Script.#objectValues[200];
	static NewTaiLue = Script.#objectValues[59];
	static Newa = Script.#objectValues[170];
	static Nko = Script.#objectValues[87];
	static Nushu = Script.#objectValues[150];
	static NyiakengPuachueHmong = Script.#objectValues[186];
	static Ogham = Script.#objectValues[29];
	static OlChiki = Script.#objectValues[109];
	static OldHungarian = Script.#objectValues[76];
	static OldItalic = Script.#objectValues[30];
	static OldNorthArabian = Script.#objectValues[142];
	static OldPermic = Script.#objectValues[89];
	static OldPersian = Script.#objectValues[61];
	static OldSogdian = Script.#objectValues[184];
	static OldSouthArabian = Script.#objectValues[133];
	static OldTurkic = Script.#objectValues[88];
	static OldUyghur = Script.#objectValues[194];
	static OlOnal = Script.#objectValues[204];
	static Oriya = Script.#objectValues[31];
	static Osage = Script.#objectValues[171];
	static Osmanya = Script.#objectValues[50];
	static PahawhHmong = Script.#objectValues[75];
	static Palmyrene = Script.#objectValues[144];
	static PauCinHau = Script.#objectValues[165];
	static PhagsPa = Script.#objectValues[90];
	static Phoenician = Script.#objectValues[91];
	static PsalterPahlavi = Script.#objectValues[123];
	static Rejang = Script.#objectValues[110];
	static Runic = Script.#objectValues[32];
	static Samaritan = Script.#objectValues[126];
	static Saurashtra = Script.#objectValues[111];
	static Sharada = Script.#objectValues[151];
	static Shavian = Script.#objectValues[51];
	static Siddham = Script.#objectValues[166];
	static Sidetic = Script.#objectValues[209];
	static SignWriting = Script.#objectValues[112];
	static Sinhala = Script.#objectValues[33];
	static Sogdian = Script.#objectValues[183];
	static SoraSompeng = Script.#objectValues[152];
	static Soyombo = Script.#objectValues[176];
	static Sundanese = Script.#objectValues[113];
	static Sunuwar = Script.#objectValues[205];
	static SylotiNagri = Script.#objectValues[58];
	static Syriac = Script.#objectValues[34];
	static Tagalog = Script.#objectValues[42];
	static Tagbanwa = Script.#objectValues[45];
	static TaiLe = Script.#objectValues[52];
	static TaiTham = Script.#objectValues[106];
	static TaiViet = Script.#objectValues[127];
	static TaiYo = Script.#objectValues[210];
	static Takri = Script.#objectValues[153];
	static Tamil = Script.#objectValues[35];
	static Tangsa = Script.#objectValues[195];
	static Tangut = Script.#objectValues[154];
	static Telugu = Script.#objectValues[36];
	static Thaana = Script.#objectValues[37];
	static Thai = Script.#objectValues[38];
	static Tibetan = Script.#objectValues[39];
	static Tifinagh = Script.#objectValues[60];
	static Tirhuta = Script.#objectValues[158];
	static Todhri = Script.#objectValues[206];
	static TolongSiki = Script.#objectValues[211];
	static Toto = Script.#objectValues[196];
	static TuluTigalari = Script.#objectValues[207];
	static Ugaritic = Script.#objectValues[53];
	static Unknown = Script.#objectValues[103];
	static Vai = Script.#objectValues[99];
	static Vithkuqi = Script.#objectValues[197];
	static Wancho = Script.#objectValues[188];
	static WarangCiti = Script.#objectValues[146];
	static Yezidi = Script.#objectValues[192];
	static Yi = Script.#objectValues[41];
	static ZanabazarSquare = Script.#objectValues[177];
	/**
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.EnumeratedProperty.html#tymethod.for_char) for more information.
	*/
	static forChar(ch) {
		const result = wasm.icu4x_Script_for_char_mv1(ch);
		try {
			return new Script(internalConstructor, result);
		} finally {}
	}
	/**
	* Get the "long" name of this property value (returns empty if property value is unknown)
	*
	* See the [Rust documentation for `get`](https://docs.rs/icu/2.1.1/icu/properties/struct.PropertyNamesLongBorrowed.html#method.get) for more information.
	*/
	longName() {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 9, 4, true);
		wasm.icu4x_Script_long_name_mv1(diplomatReceive.buffer, this.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new DiplomatSliceStr(wasm, diplomatReceive.buffer, "string8", []).getValue();
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the "short" name of this property value (returns empty if property value is unknown)
	*
	* See the [Rust documentation for `get`](https://docs.rs/icu/2.1.1/icu/properties/struct.PropertyNamesShortBorrowed.html#method.get) for more information.
	*/
	shortName() {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 9, 4, true);
		wasm.icu4x_Script_short_name_mv1(diplomatReceive.buffer, this.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new DiplomatSliceStr(wasm, diplomatReceive.buffer, "string8", []).getValue();
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Convert to an integer value usable with ICU4C and CodePointMapData
	*
	* See the [Rust documentation for `to_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Script.html#method.to_icu4c_value) for more information.
	*/
	toIntegerValue() {
		const result = wasm.icu4x_Script_to_integer_value_mv1(this.ffiValue);
		try {
			return result;
		} finally {}
	}
	/**
	* Convert from an integer value from ICU4C or CodePointMapData
	*
	* See the [Rust documentation for `from_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.Script.html#method.from_icu4c_value) for more information.
	*/
	static fromIntegerValue(other) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_Script_from_integer_value_mv1(diplomatReceive.buffer, other);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new Script(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
		} finally {
			diplomatReceive.free();
		}
	}
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class SentenceBreak {
	#value = void 0;
	static #values = new Map([
		["Other", 0],
		["ATerm", 1],
		["Close", 2],
		["Format", 3],
		["Lower", 4],
		["Numeric", 5],
		["OLetter", 6],
		["Sep", 7],
		["Sp", 8],
		["STerm", 9],
		["Upper", 10],
		["Cr", 11],
		["Extend", 12],
		["Lf", 13],
		["SContinue", 14]
	]);
	static getAllEntries() {
		return SentenceBreak.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return SentenceBreak.#objectValues[arguments[1]];
		}
		if (value instanceof SentenceBreak) return value;
		let intVal = SentenceBreak.#values.get(value);
		if (intVal != null) return SentenceBreak.#objectValues[intVal];
		throw TypeError(value + " is not a SentenceBreak and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new SentenceBreak(value);
	}
	get value() {
		return [...SentenceBreak.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new SentenceBreak(internalConstructor, internalConstructor, 0),
		new SentenceBreak(internalConstructor, internalConstructor, 1),
		new SentenceBreak(internalConstructor, internalConstructor, 2),
		new SentenceBreak(internalConstructor, internalConstructor, 3),
		new SentenceBreak(internalConstructor, internalConstructor, 4),
		new SentenceBreak(internalConstructor, internalConstructor, 5),
		new SentenceBreak(internalConstructor, internalConstructor, 6),
		new SentenceBreak(internalConstructor, internalConstructor, 7),
		new SentenceBreak(internalConstructor, internalConstructor, 8),
		new SentenceBreak(internalConstructor, internalConstructor, 9),
		new SentenceBreak(internalConstructor, internalConstructor, 10),
		new SentenceBreak(internalConstructor, internalConstructor, 11),
		new SentenceBreak(internalConstructor, internalConstructor, 12),
		new SentenceBreak(internalConstructor, internalConstructor, 13),
		new SentenceBreak(internalConstructor, internalConstructor, 14)
	];
	static Other = SentenceBreak.#objectValues[0];
	static ATerm = SentenceBreak.#objectValues[1];
	static Close = SentenceBreak.#objectValues[2];
	static Format = SentenceBreak.#objectValues[3];
	static Lower = SentenceBreak.#objectValues[4];
	static Numeric = SentenceBreak.#objectValues[5];
	static OLetter = SentenceBreak.#objectValues[6];
	static Sep = SentenceBreak.#objectValues[7];
	static Sp = SentenceBreak.#objectValues[8];
	static STerm = SentenceBreak.#objectValues[9];
	static Upper = SentenceBreak.#objectValues[10];
	static Cr = SentenceBreak.#objectValues[11];
	static Extend = SentenceBreak.#objectValues[12];
	static Lf = SentenceBreak.#objectValues[13];
	static SContinue = SentenceBreak.#objectValues[14];
	/**
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.EnumeratedProperty.html#tymethod.for_char) for more information.
	*/
	static forChar(ch) {
		const result = wasm.icu4x_SentenceBreak_for_char_mv1(ch);
		try {
			return new SentenceBreak(internalConstructor, result);
		} finally {}
	}
	/**
	* Get the "long" name of this property value (returns empty if property value is unknown)
	*
	* See the [Rust documentation for `get`](https://docs.rs/icu/2.1.1/icu/properties/struct.PropertyNamesLongBorrowed.html#method.get) for more information.
	*/
	longName() {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 9, 4, true);
		wasm.icu4x_SentenceBreak_long_name_mv1(diplomatReceive.buffer, this.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new DiplomatSliceStr(wasm, diplomatReceive.buffer, "string8", []).getValue();
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the "short" name of this property value (returns empty if property value is unknown)
	*
	* See the [Rust documentation for `get`](https://docs.rs/icu/2.1.1/icu/properties/struct.PropertyNamesShortBorrowed.html#method.get) for more information.
	*/
	shortName() {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 9, 4, true);
		wasm.icu4x_SentenceBreak_short_name_mv1(diplomatReceive.buffer, this.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new DiplomatSliceStr(wasm, diplomatReceive.buffer, "string8", []).getValue();
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Convert to an integer value usable with ICU4C and CodePointMapData
	*
	* See the [Rust documentation for `to_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.SentenceBreak.html#method.to_icu4c_value) for more information.
	*/
	toIntegerValue() {
		const result = wasm.icu4x_SentenceBreak_to_integer_value_mv1(this.ffiValue);
		try {
			return result;
		} finally {}
	}
	/**
	* Convert from an integer value from ICU4C or CodePointMapData
	*
	* See the [Rust documentation for `from_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.SentenceBreak.html#method.from_icu4c_value) for more information.
	*/
	static fromIntegerValue(other) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_SentenceBreak_from_integer_value_mv1(diplomatReceive.buffer, other);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new SentenceBreak(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
		} finally {
			diplomatReceive.free();
		}
	}
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class VerticalOrientation {
	#value = void 0;
	static #values = new Map([
		["Rotated", 0],
		["TransformedRotated", 1],
		["TransformedUpright", 2],
		["Upright", 3]
	]);
	static getAllEntries() {
		return VerticalOrientation.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return VerticalOrientation.#objectValues[arguments[1]];
		}
		if (value instanceof VerticalOrientation) return value;
		let intVal = VerticalOrientation.#values.get(value);
		if (intVal != null) return VerticalOrientation.#objectValues[intVal];
		throw TypeError(value + " is not a VerticalOrientation and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new VerticalOrientation(value);
	}
	get value() {
		return [...VerticalOrientation.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new VerticalOrientation(internalConstructor, internalConstructor, 0),
		new VerticalOrientation(internalConstructor, internalConstructor, 1),
		new VerticalOrientation(internalConstructor, internalConstructor, 2),
		new VerticalOrientation(internalConstructor, internalConstructor, 3)
	];
	static Rotated = VerticalOrientation.#objectValues[0];
	static TransformedRotated = VerticalOrientation.#objectValues[1];
	static TransformedUpright = VerticalOrientation.#objectValues[2];
	static Upright = VerticalOrientation.#objectValues[3];
	/**
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.EnumeratedProperty.html#tymethod.for_char) for more information.
	*/
	static forChar(ch) {
		const result = wasm.icu4x_VerticalOrientation_for_char_mv1(ch);
		try {
			return new VerticalOrientation(internalConstructor, result);
		} finally {}
	}
	/**
	* Get the "long" name of this property value (returns empty if property value is unknown)
	*
	* See the [Rust documentation for `get`](https://docs.rs/icu/2.1.1/icu/properties/struct.PropertyNamesLongBorrowed.html#method.get) for more information.
	*/
	longName() {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 9, 4, true);
		wasm.icu4x_VerticalOrientation_long_name_mv1(diplomatReceive.buffer, this.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new DiplomatSliceStr(wasm, diplomatReceive.buffer, "string8", []).getValue();
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the "short" name of this property value (returns empty if property value is unknown)
	*
	* See the [Rust documentation for `get`](https://docs.rs/icu/2.1.1/icu/properties/struct.PropertyNamesShortBorrowed.html#method.get) for more information.
	*/
	shortName() {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 9, 4, true);
		wasm.icu4x_VerticalOrientation_short_name_mv1(diplomatReceive.buffer, this.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new DiplomatSliceStr(wasm, diplomatReceive.buffer, "string8", []).getValue();
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Convert to an integer value usable with ICU4C and CodePointMapData
	*
	* See the [Rust documentation for `to_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.VerticalOrientation.html#method.to_icu4c_value) for more information.
	*/
	toIntegerValue() {
		const result = wasm.icu4x_VerticalOrientation_to_integer_value_mv1(this.ffiValue);
		try {
			return result;
		} finally {}
	}
	/**
	* Convert from an integer value from ICU4C or CodePointMapData
	*
	* See the [Rust documentation for `from_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.VerticalOrientation.html#method.from_icu4c_value) for more information.
	*/
	static fromIntegerValue(other) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_VerticalOrientation_from_integer_value_mv1(diplomatReceive.buffer, other);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new VerticalOrientation(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
		} finally {
			diplomatReceive.free();
		}
	}
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
(class WordBreak {
	#value = void 0;
	static #values = new Map([
		["Other", 0],
		["ALetter", 1],
		["Format", 2],
		["Katakana", 3],
		["MidLetter", 4],
		["MidNum", 5],
		["Numeric", 6],
		["ExtendNumLet", 7],
		["Cr", 8],
		["Extend", 9],
		["Lf", 10],
		["MidNumLet", 11],
		["Newline", 12],
		["RegionalIndicator", 13],
		["HebrewLetter", 14],
		["SingleQuote", 15],
		["DoubleQuote", 16],
		["EBase", 17],
		["EBaseGaz", 18],
		["EModifier", 19],
		["GlueAfterZwj", 20],
		["Zwj", 21],
		["WSegSpace", 22]
	]);
	static getAllEntries() {
		return WordBreak.#values.entries();
	}
	#internalConstructor(value) {
		if (arguments.length > 1 && arguments[0] === internalConstructor) {
			if (arguments[1] === internalConstructor) {
				this.#value = arguments[2];
				return this;
			}
			return WordBreak.#objectValues[arguments[1]];
		}
		if (value instanceof WordBreak) return value;
		let intVal = WordBreak.#values.get(value);
		if (intVal != null) return WordBreak.#objectValues[intVal];
		throw TypeError(value + " is not a WordBreak and does not correspond to any of its enumerator values.");
	}
	/** @internal */
	static fromValue(value) {
		return new WordBreak(value);
	}
	get value() {
		return [...WordBreak.#values.keys()][this.#value];
	}
	/** @internal */
	get ffiValue() {
		return this.#value;
	}
	static #objectValues = [
		new WordBreak(internalConstructor, internalConstructor, 0),
		new WordBreak(internalConstructor, internalConstructor, 1),
		new WordBreak(internalConstructor, internalConstructor, 2),
		new WordBreak(internalConstructor, internalConstructor, 3),
		new WordBreak(internalConstructor, internalConstructor, 4),
		new WordBreak(internalConstructor, internalConstructor, 5),
		new WordBreak(internalConstructor, internalConstructor, 6),
		new WordBreak(internalConstructor, internalConstructor, 7),
		new WordBreak(internalConstructor, internalConstructor, 8),
		new WordBreak(internalConstructor, internalConstructor, 9),
		new WordBreak(internalConstructor, internalConstructor, 10),
		new WordBreak(internalConstructor, internalConstructor, 11),
		new WordBreak(internalConstructor, internalConstructor, 12),
		new WordBreak(internalConstructor, internalConstructor, 13),
		new WordBreak(internalConstructor, internalConstructor, 14),
		new WordBreak(internalConstructor, internalConstructor, 15),
		new WordBreak(internalConstructor, internalConstructor, 16),
		new WordBreak(internalConstructor, internalConstructor, 17),
		new WordBreak(internalConstructor, internalConstructor, 18),
		new WordBreak(internalConstructor, internalConstructor, 19),
		new WordBreak(internalConstructor, internalConstructor, 20),
		new WordBreak(internalConstructor, internalConstructor, 21),
		new WordBreak(internalConstructor, internalConstructor, 22)
	];
	static Other = WordBreak.#objectValues[0];
	static ALetter = WordBreak.#objectValues[1];
	static Format = WordBreak.#objectValues[2];
	static Katakana = WordBreak.#objectValues[3];
	static MidLetter = WordBreak.#objectValues[4];
	static MidNum = WordBreak.#objectValues[5];
	static Numeric = WordBreak.#objectValues[6];
	static ExtendNumLet = WordBreak.#objectValues[7];
	static Cr = WordBreak.#objectValues[8];
	static Extend = WordBreak.#objectValues[9];
	static Lf = WordBreak.#objectValues[10];
	static MidNumLet = WordBreak.#objectValues[11];
	static Newline = WordBreak.#objectValues[12];
	static RegionalIndicator = WordBreak.#objectValues[13];
	static HebrewLetter = WordBreak.#objectValues[14];
	static SingleQuote = WordBreak.#objectValues[15];
	static DoubleQuote = WordBreak.#objectValues[16];
	static EBase = WordBreak.#objectValues[17];
	static EBaseGaz = WordBreak.#objectValues[18];
	static EModifier = WordBreak.#objectValues[19];
	static GlueAfterZwj = WordBreak.#objectValues[20];
	static Zwj = WordBreak.#objectValues[21];
	static WSegSpace = WordBreak.#objectValues[22];
	/**
	* See the [Rust documentation for `for_char`](https://docs.rs/icu/2.1.1/icu/properties/props/trait.EnumeratedProperty.html#tymethod.for_char) for more information.
	*/
	static forChar(ch) {
		const result = wasm.icu4x_WordBreak_for_char_mv1(ch);
		try {
			return new WordBreak(internalConstructor, result);
		} finally {}
	}
	/**
	* Get the "long" name of this property value (returns empty if property value is unknown)
	*
	* See the [Rust documentation for `get`](https://docs.rs/icu/2.1.1/icu/properties/struct.PropertyNamesLongBorrowed.html#method.get) for more information.
	*/
	longName() {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 9, 4, true);
		wasm.icu4x_WordBreak_long_name_mv1(diplomatReceive.buffer, this.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new DiplomatSliceStr(wasm, diplomatReceive.buffer, "string8", []).getValue();
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Get the "short" name of this property value (returns empty if property value is unknown)
	*
	* See the [Rust documentation for `get`](https://docs.rs/icu/2.1.1/icu/properties/struct.PropertyNamesShortBorrowed.html#method.get) for more information.
	*/
	shortName() {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 9, 4, true);
		wasm.icu4x_WordBreak_short_name_mv1(diplomatReceive.buffer, this.ffiValue);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new DiplomatSliceStr(wasm, diplomatReceive.buffer, "string8", []).getValue();
		} finally {
			diplomatReceive.free();
		}
	}
	/**
	* Convert to an integer value usable with ICU4C and CodePointMapData
	*
	* See the [Rust documentation for `to_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.WordBreak.html#method.to_icu4c_value) for more information.
	*/
	toIntegerValue() {
		const result = wasm.icu4x_WordBreak_to_integer_value_mv1(this.ffiValue);
		try {
			return result;
		} finally {}
	}
	/**
	* Convert from an integer value from ICU4C or CodePointMapData
	*
	* See the [Rust documentation for `from_icu4c_value`](https://docs.rs/icu/2.1.1/icu/properties/props/struct.WordBreak.html#method.from_icu4c_value) for more information.
	*/
	static fromIntegerValue(other) {
		const diplomatReceive = new DiplomatReceiveBuf(wasm, 5, 4, true);
		wasm.icu4x_WordBreak_from_integer_value_mv1(diplomatReceive.buffer, other);
		try {
			if (!diplomatReceive.resultFlag) return null;
			return new WordBreak(internalConstructor, enumDiscriminant(wasm, diplomatReceive.buffer));
		} finally {
			diplomatReceive.free();
		}
	}
	constructor(value) {
		return this.#internalConstructor(...arguments);
	}
});
//#endregion
//#region src/index.ts
/**
* Initialize the ICU4X WASM module.
* Must be called before createTextEngine().
*/
async function init(input) {
	await initWasm(input);
}
/**
* LineBreak property values that indicate a mandatory (required) break.
* See UAX#14 LB4/LB5: BK, CR, LF, NL all force a break.
*/
const REQUIRED_BREAK_VALUES = new Set([
	LineBreak.MandatoryBreak.ffiValue,
	LineBreak.CarriageReturn.ffiValue,
	LineBreak.LineFeed.ffiValue,
	LineBreak.NextLine.ffiValue
]);
function isRequiredBreak(lbMap, text, position) {
	if (position >= text.length) return true;
	if (position === 0) return false;
	const cp = text.codePointAt(position - 1);
	return cp !== void 0 && REQUIRED_BREAK_VALUES.has(lbMap.get(cp));
}
function mapWordBreak(wb) {
	switch (wb) {
		case "break-all": return LineBreakWordOption.BreakAll;
		case "keep-all": return LineBreakWordOption.KeepAll;
		default: return LineBreakWordOption.Normal;
	}
}
function mapLineBreak(lb) {
	switch (lb) {
		case "loose": return LineBreakStrictness.Loose;
		case "strict": return LineBreakStrictness.Strict;
		case "anywhere": return LineBreakStrictness.Anywhere;
		default: return LineBreakStrictness.Normal;
	}
}
/**
* Create a TextEngine backed by ICU4X WASM + a .postcard data blob.
* init() must be called before this function.
*/
function createTextEngine(data) {
	const provider = DataProvider.fromByteSlice(data);
	const lbMap = CodePointMapData8.createLineBreakWithProvider(provider);
	return { getLineBreaks(text, options = {}) {
		const locale = options.locale ? Locale.fromString(options.locale) : Locale.fromString("en");
		const lbOptions = new LineBreakOptions({
			strictness: options.lineBreak ? mapLineBreak(options.lineBreak) : null,
			wordOption: options.wordBreak ? mapWordBreak(options.wordBreak) : null
		});
		const iter = LineSegmenter.autoWithOptionsAndProvider(provider, locale, lbOptions).segment(text);
		const breaks = [];
		let pos;
		while ((pos = iter.next()) !== -1) breaks.push({
			position: pos,
			required: isRequiredBreak(lbMap, text, pos)
		});
		return breaks;
	} };
}
//#endregion
export { createTextEngine, init };

//# sourceMappingURL=index.mjs.map