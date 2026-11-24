//! Text shaping with HarfRust. https://github.com/harfbuzz/harfrust

use cssparser::{ParseError, Parser};
use harfrust::{Buffer, Direction, Feature, Font, ShapeOptions, ShaperFont, Tag};
use wasm_bindgen::prelude::*;

/// The glyphs of shaped text, by glyph. Positions are in font units.
#[wasm_bindgen(getter_with_clone)]
pub struct ShapedGlyphs {
    #[wasm_bindgen(readonly, js_name = glyphIds)]
    pub glyph_ids: Vec<u32>,
    /// The UTF-16 index into the text of the cluster each glyph belongs to.
    #[wasm_bindgen(readonly)]
    pub clusters: Vec<u32>,
    #[wasm_bindgen(readonly, js_name = xAdvances)]
    pub x_advances: Vec<i32>,
    /// Only set for vertical text.
    #[wasm_bindgen(readonly, js_name = yAdvances)]
    pub y_advances: Vec<i32>,
    #[wasm_bindgen(readonly, js_name = xOffsets)]
    pub x_offsets: Vec<i32>,
    #[wasm_bindgen(readonly, js_name = yOffsets)]
    pub y_offsets: Vec<i32>,
}

#[wasm_bindgen]
pub enum ShapingDirection {
    Ltr = "ltr",
    Rtl = "rtl",
    Ttb = "ttb",
    Btt = "btt",
}

/// A TrueType or OpenType font that shapes text.
#[wasm_bindgen]
pub struct ShapingFont {
    font: Font,
}

#[wasm_bindgen]
impl ShapingFont {
    #[wasm_bindgen(constructor)]
    pub fn new(data: Vec<u8>) -> Result<ShapingFont, JsError> {
        let font = Font::new(data, 0).ok_or_else(|| JsError::new("Invalid font data"))?;
        Ok(ShapingFont { font })
    }

    /// Shapes `text` into glyphs, with the features of a
    /// `font-feature-settings` value, e.g. `"liga" off, "smcp"`. The direction
    /// is guessed from the text by default.
    pub fn shape(
        &self,
        text: &str,
        features: &str,
        direction: Option<ShapingDirection>,
    ) -> Result<ShapedGlyphs, JsError> {
        let features = font_features(features);

        let mut buffer = Buffer::new();
        // Clusters are indices of the units they're pushed as.
        let units: Vec<u16> = text.encode_utf16().collect();
        buffer.push_utf16(&units, 0);
        buffer.guess_segment_properties();
        match direction {
            Some(ShapingDirection::Ltr) => buffer.set_direction(Direction::LeftToRight),
            Some(ShapingDirection::Rtl) => buffer.set_direction(Direction::RightToLeft),
            Some(ShapingDirection::Ttb) => buffer.set_direction(Direction::TopToBottom),
            Some(ShapingDirection::Btt) => buffer.set_direction(Direction::BottomToTop),
            Some(ShapingDirection::__Invalid) | None => {}
        }

        harfrust::shape(
            &ShaperFont::new(&self.font),
            &mut buffer,
            ShapeOptions::new().features(&features),
        )
        .map_err(|error| JsError::new(&format!("Failed to shape text: {error:?}")))?;

        let infos = buffer.glyph_infos();
        let positions = buffer.glyph_positions();
        Ok(ShapedGlyphs {
            glyph_ids: infos.iter().map(|info| info.glyph_id).collect(),
            clusters: infos.iter().map(|info| info.cluster).collect(),
            x_advances: positions
                .iter()
                .map(|position| position.x_advance)
                .collect(),
            y_advances: positions
                .iter()
                .map(|position| position.y_advance)
                .collect(),
            x_offsets: positions.iter().map(|position| position.x_offset).collect(),
            y_offsets: positions.iter().map(|position| position.y_offset).collect(),
        })
    }
}

/// Parses a `font-feature-settings` value. `normal` and invalid values, which
/// would make the declaration invalid, have no features.
/// https://drafts.csswg.org/css-fonts/#font-feature-settings-prop
fn font_features(value: &str) -> Vec<Feature> {
    Parser::new(value)
        .parse_entirely(|input| input.parse_comma_separated(font_feature))
        .unwrap_or_default()
}

/// `<opentype-tag> [ <integer [0,∞]> | on | off ]?`
fn font_feature(input: &mut Parser) -> Result<Feature, ParseError<()>> {
    // 4 characters from U+20 to U+7E.
    let tag = <[u8; 4]>::try_from(input.expect_string()?.as_bytes())
        .ok()
        .filter(|tag| tag.iter().all(|byte| (0x20..=0x7e).contains(byte)))
        .ok_or(ParseError::custom(()))?;
    let value = if let Ok(value) = input.try_parse(Parser::expect_integer) {
        u32::try_from(value).map_err(|_| ParseError::custom(()))?
    } else if input
        .try_parse(|input| input.expect_ident_matching("off"))
        .is_ok()
    {
        0
    } else {
        let _ = input.try_parse(|input| input.expect_ident_matching("on"));
        1
    };
    Ok(Feature::new(Tag::new(&tag), value, ..))
}
