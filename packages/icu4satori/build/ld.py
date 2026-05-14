#!/usr/bin/env python3
# Custom linker script: filters WASM exports to only keep the symbols we need.
# Adapted from icu4x/examples/js-tiny/ld.py

import sys
import subprocess

SYMBOLS = [
    # DataProvider — blob loading
    "icu4x_DataProvider_from_owned_byte_slice_mv1",
    "icu4x_DataProvider_destroy_mv1",
    # LineSegmenter — create with provider + segment
    "icu4x_LineSegmenter_create_auto_with_options_v2_and_provider_mv1",
    "icu4x_LineSegmenter_create_for_non_complex_scripts_with_options_v2_and_provider_mv1",
    "icu4x_LineSegmenter_segment_utf16_mv1",
    "icu4x_LineSegmenter_destroy_mv1",
    # LineBreakIteratorUtf16 — iterate break points
    "icu4x_LineBreakIteratorUtf16_next_mv1",
    "icu4x_LineBreakIteratorUtf16_destroy_mv1",
    # Locale
    "icu4x_Locale_from_string_mv1",
    "icu4x_Locale_destroy_mv1",
    # CodePointMapData8 — LineBreak property lookup
    "icu4x_CodePointMapData8_create_line_break_with_provider_mv1",
    "icu4x_CodePointMapData8_get_mv1",
    "icu4x_CodePointMapData8_destroy_mv1",
]

def main():
    new_argv = []
    is_export = False
    for arg in sys.argv[1:]:
        if is_export:
            if not arg.startswith("icu4x_") or arg in SYMBOLS:
                new_argv += ["--export", arg]
            is_export = False
        elif arg == "--export":
            is_export = True
        else:
            new_argv += [arg]
            is_export = False
    result = subprocess.run(["wasm-ld"] + new_argv, stdout=sys.stdout, stderr=sys.stderr)
    return result.returncode

if __name__ == "__main__":
    sys.exit(main())
