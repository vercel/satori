.DEFAULT_GOAL := build
FORCE:

ICU_CAPI := $(shell cargo metadata --manifest-path Cargo.toml --format-version 1 | jq -r '.packages[] | select(.name == "icu_capi").manifest_path' | xargs dirname)
HEADERS := ${ICU_CAPI}/bindings/js
ALL_HEADERS := $(wildcard ${HEADERS}/*)

LLVM_COMPATIBLE_NIGHTLY ?= "nightly-2025-02-17"

$(ALL_HEADERS):

# 100 KiB, working around a bug in older rustc
# https://github.com/unicode-org/icu4x/issues/2753
WASM_STACK_SIZE := 100000

BASEDIR := $(dir $(realpath $(lastword $(MAKEFILE_LIST))))
ROOTDIR := $(BASEDIR)/..

# Copy diplomat-generated JS bindings into vendor/
$(ROOTDIR)/vendor/index.mjs: $(ALL_HEADERS)
	rm -rf $(ROOTDIR)/vendor
	cp -rL ${HEADERS} $(ROOTDIR)/vendor
	@# Restore our shim (the copy overwrites diplomat-wasm.mjs with the original)
	printf '%s\n' \
	  '// Thin shim — delegates to the real implementation in src/diplomat-wasm.ts.' \
	  '// Vendor files import ./diplomat-wasm.mjs so this must exist in vendor/.' \
	  '// After `make vendor`, this file is restored by the Makefile.' \
	  "export { default, initWasm } from '../src/diplomat-wasm'" \
	  > $(ROOTDIR)/vendor/diplomat-wasm.mjs

# Build WASM binary
target/wasm32-unknown-unknown/release/icu_capi.wasm: FORCE
	rustup toolchain install ${LLVM_COMPATIBLE_NIGHTLY}
	rustup component add rust-src --toolchain ${LLVM_COMPATIBLE_NIGHTLY}
	RUSTFLAGS="-Cpanic=abort -Copt-level=s -C link-arg=-zstack-size=${WASM_STACK_SIZE} -Clinker-plugin-lto -Ccodegen-units=1 -C linker=${BASEDIR}/ld.py -C linker-flavor=wasm-ld -Clto -Cembed-bitcode -Zwasm-c-abi=spec" \
	cargo +${LLVM_COMPATIBLE_NIGHTLY} rustc \
		--manifest-path Cargo.toml \
		-Z build-std=std,panic_abort -Z build-std-features=panic_immediate_abort \
		--target wasm32-unknown-unknown \
		-p icu_capi \
		--crate-type cdylib \
		--release

# Copy WASM binary to wasm/ directory
$(ROOTDIR)/wasm/icu_capi.wasm: target/wasm32-unknown-unknown/release/icu_capi.wasm
	mkdir -p $(ROOTDIR)/wasm
	cp $< $@

vendor: $(ROOTDIR)/vendor/index.mjs
wasm: $(ROOTDIR)/wasm/icu_capi.wasm

build: wasm vendor
	ls -lh $(ROOTDIR)/wasm/icu_capi.wasm

clean:
	rm -rf target $(ROOTDIR)/vendor $(ROOTDIR)/dist
