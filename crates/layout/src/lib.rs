//! Taffy layout for Satori, compiled to WebAssembly without bindings.
//!
//! JavaScript writes the whole tree into a buffer of `f32`s, `compute` lays it
//! out with Taffy and returns the layout of every node. Leaves that need to be
//! measured, e.g. text, call the imported `measure` function.
//!
//! The format is described in `src/layout-engine/encode.ts`, which must be
//! kept in sync with this file.

use std::cell::RefCell;

use taffy::prelude::*;
use taffy::style::{GridTemplateArea, GridTemplateAreas, GridTemplateRepetition};
use taffy::{
    compute_leaf_layout, AlignContent, AlignItems, Baselines, BoxSizing, Clear, CompactLength,
    Float, LayoutInput, LayoutOutput, Overflow, Point, TextAlign, LEAF_FLOAT_EXCLUSIONS,
};

#[link(wasm_import_module = "env")]
extern "C" {
    /// Measures a leaf. `NaN` known dimensions are unknown, negative
    /// available sizes are min-content, infinite ones are max-content.
    /// `exclusions` points to 4 `f32`s for each float that intersects the leaf:
    /// the top and bottom relative to the leaf, and how far it extends into the
    /// leaf from the left and the right. Writes the width, height, and first
    /// and last baselines from the top of the leaf (`NaN` without them) to
    /// `out`. Measured leaves have no padding or border.
    fn measure(
        node: u32,
        known_width: f32,
        known_height: f32,
        available_width: f32,
        available_height: f32,
        exclusions: *const f32,
        exclusion_count: u32,
        out: *mut f32,
    );
}

/// The number of `f32`s written for each node by `compute`.
const OUTPUT_STRIDE: usize = 16;

thread_local! {
    static OUTPUT: RefCell<Vec<f32>> = const { RefCell::new(Vec::new()) };
}

/// Allocates a buffer of `len` `f32`s for the input.
#[no_mangle]
pub extern "C" fn alloc(len: usize) -> *mut f32 {
    let mut buffer = Vec::<f32>::with_capacity(len);
    let ptr = buffer.as_mut_ptr();
    std::mem::forget(buffer);
    ptr
}

/// Frees a buffer allocated by `alloc`.
///
/// # Safety
///
/// `ptr` and `len` must come from the same call to `alloc`.
#[no_mangle]
pub unsafe extern "C" fn dealloc(ptr: *mut f32, len: usize) {
    drop(Vec::from_raw_parts(ptr, 0, len));
}

/// The handle of the `calc()` expression at `index`, which Taffy passes to
/// `resolve_calc`. Taffy uses the low 3 bits as a tag, which must be 0.
fn calc_handle(index: f32) -> *const () {
    ((index as usize + 1) << 3) as *const ()
}

struct Reader<'a> {
    data: &'a [f32],
    index: usize,
    /// The sizing keywords of the minimum and maximum widths of each node,
    /// which Taffy doesn't support, see `limit`.
    intrinsic_limits: Vec<[Option<Dimension>; 2]>,
}

impl<'a> Reader<'a> {
    fn next(&mut self) -> f32 {
        let value = self.data[self.index];
        self.index += 1;
        value
    }

    fn int(&mut self) -> i32 {
        self.next() as i32
    }

    /// A unit (0: auto, 1: length, 2: percentage, 3: `calc()`, 4: `min-content`,
    /// 5: `max-content`, 6: `fit-content`, 7: `fit-content()` with a length,
    /// 8: `fit-content()` with a percentage, 9: `stretch`, 10: `content`) and a
    /// value, which is the index of the expression for `calc()`.
    fn dimension(&mut self) -> Dimension {
        let unit = self.int();
        let value = self.next();
        match unit {
            1 => Dimension::length(value),
            2 => Dimension::percent(value),
            3 => Dimension::calc(calc_handle(value)),
            4 => Dimension::min_content(),
            5 => Dimension::max_content(),
            6 => Dimension::fit_content(),
            7 => Dimension::fit_content_px(value),
            8 => Dimension::fit_content_percent(value),
            9 => Dimension::stretch(),
            10 => Dimension::content(),
            _ => Dimension::auto(),
        }
    }

    /// A minimum or maximum size. Taffy doesn't support sizing keywords there, so
    /// they're `auto`, and returned separately.
    fn limit(&mut self) -> (LengthPercentageAuto, Option<Dimension>) {
        if (4..=10).contains(&(self.data[self.index] as i32)) {
            (LengthPercentageAuto::auto(), Some(self.dimension()))
        } else {
            (self.length_percentage_auto(), None)
        }
    }

    fn length_percentage_auto(&mut self) -> LengthPercentageAuto {
        let unit = self.int();
        let value = self.next();
        match unit {
            1 => LengthPercentageAuto::length(value),
            2 => LengthPercentageAuto::percent(value),
            3 => LengthPercentageAuto::calc(calc_handle(value)),
            _ => LengthPercentageAuto::auto(),
        }
    }

    /// Like `length_percentage_auto`, but `auto` is 0.
    fn length_percentage(&mut self) -> LengthPercentage {
        let unit = self.int();
        let value = self.next();
        match unit {
            1 => LengthPercentage::length(value),
            2 => LengthPercentage::percent(value),
            3 => LengthPercentage::calc(calc_handle(value)),
            _ => LengthPercentage::length(0.0),
        }
    }

    fn rect<T>(&mut self, mut read: impl FnMut(&mut Self) -> T) -> Rect<T> {
        let left = read(self);
        let right = read(self);
        let top = read(self);
        let bottom = read(self);
        Rect {
            left,
            right,
            top,
            bottom,
        }
    }

    fn size<T>(&mut self, mut read: impl FnMut(&mut Self) -> T) -> Size<T> {
        let width = read(self);
        let height = read(self);
        Size { width, height }
    }

    fn align_items(&mut self) -> Option<AlignItems> {
        Some(match self.int() {
            0 => AlignItems::START,
            1 => AlignItems::END,
            2 => AlignItems::FLEX_START,
            3 => AlignItems::FLEX_END,
            4 => AlignItems::CENTER,
            5 => AlignItems::BASELINE,
            6 => AlignItems::STRETCH,
            _ => return None,
        })
    }

    fn align_content(&mut self) -> Option<AlignContent> {
        Some(match self.int() {
            0 => AlignContent::START,
            1 => AlignContent::END,
            2 => AlignContent::FLEX_START,
            3 => AlignContent::FLEX_END,
            4 => AlignContent::CENTER,
            6 => AlignContent::STRETCH,
            7 => AlignContent::SPACE_BETWEEN,
            8 => AlignContent::SPACE_EVENLY,
            9 => AlignContent::SPACE_AROUND,
            _ => return None,
        })
    }

    /// A length, then UTF-16 code units.
    fn string(&mut self) -> String {
        let len = self.int() as usize;
        let units: Vec<u16> = (0..len).map(|_| self.int() as u16).collect();
        String::from_utf16_lossy(&units)
    }

    /// A count, then each set: a count, then each name.
    fn line_names(&mut self) -> Vec<Vec<String>> {
        let count = self.int() as usize;
        (0..count)
            .map(|_| {
                let names = self.int() as usize;
                (0..names).map(|_| self.string()).collect()
            })
            .collect()
    }

    /// A kind (see `pushTrackBreadth` in `encode.ts`) and a value.
    fn track_size(&mut self) -> TrackSizingFunction {
        let (min_kind, min_value) = (self.int(), self.next());
        let (max_kind, max_value) = (self.int(), self.next());
        let min = match min_kind {
            1 => MinTrackSizingFunction::length(min_value),
            2 => MinTrackSizingFunction::percent(min_value),
            3 => MinTrackSizingFunction::min_content(),
            4 => MinTrackSizingFunction::max_content(),
            _ => MinTrackSizingFunction::auto(),
        };
        let max = match max_kind {
            1 => MaxTrackSizingFunction::length(max_value),
            2 => MaxTrackSizingFunction::percent(max_value),
            3 => MaxTrackSizingFunction::min_content(),
            4 => MaxTrackSizingFunction::max_content(),
            5 => MaxTrackSizingFunction::fr(max_value),
            6 => MaxTrackSizingFunction::fit_content_px(max_value),
            7 => MaxTrackSizingFunction::fit_content_percent(max_value),
            _ => MaxTrackSizingFunction::auto(),
        };
        TrackSizingFunction { min, max }
    }

    fn track_sizes(&mut self) -> Vec<TrackSizingFunction> {
        let count = self.int() as usize;
        (0..count).map(|_| self.track_size()).collect()
    }

    /// See `pushTrackList` in `encode.ts`.
    fn track_list(&mut self) -> (Vec<GridTemplateComponent<String>>, Vec<Vec<String>>) {
        let count = self.int() as usize;
        let tracks = (0..count)
            .map(|_| {
                if self.int() == 0 {
                    let mut sizes = self.track_sizes();
                    return GridTemplateComponent::Single(sizes.remove(0));
                }
                let count = match (self.int(), self.next()) {
                    (1, _) => RepetitionCount::AutoFill,
                    (2, _) => RepetitionCount::AutoFit,
                    (_, count) => RepetitionCount::Count(count as u16),
                };
                let tracks = self.track_sizes();
                let line_names = self.line_names();
                GridTemplateComponent::Repeat(GridTemplateRepetition {
                    count,
                    tracks,
                    line_names,
                })
            })
            .collect();
        (tracks, self.line_names())
    }

    /// A kind (see `pushGridLine` in `encode.ts`), a number and a name.
    fn grid_line(&mut self) -> GridPlacement<String> {
        let kind = self.int();
        let value = self.int();
        let name = self.string();
        match kind {
            1 => GridPlacement::Line((value as i16).into()),
            2 => GridPlacement::Span(value.max(1) as u16),
            3 => GridPlacement::NamedLine(name, value as i16),
            4 => GridPlacement::NamedSpan(name, value.max(1) as u16),
            _ => GridPlacement::Auto,
        }
    }

    fn overflow(&mut self) -> Overflow {
        match self.int() {
            1 => Overflow::Hidden,
            2 => Overflow::Clip,
            3 => Overflow::Scroll,
            _ => Overflow::Visible,
        }
    }

    fn style(&mut self) -> Style {
        let display = match self.int() {
            0 => Display::None,
            2 => Display::Block,
            3 => Display::Grid,
            4 => Display::FlowRoot,
            _ => Display::Flex,
        };
        let position = match self.int() {
            1 => Position::Absolute,
            _ => Position::Relative,
        };
        let box_sizing = match self.int() {
            1 => BoxSizing::ContentBox,
            _ => BoxSizing::BorderBox,
        };
        let overflow = Point {
            x: self.overflow(),
            y: self.overflow(),
        };
        let size = self.size(Self::dimension);
        let (min_width, min_width_keyword) = self.limit();
        let (min_height, _) = self.limit();
        let (max_width, max_width_keyword) = self.limit();
        let (max_height, _) = self.limit();
        self.intrinsic_limits
            .push([min_width_keyword, max_width_keyword]);
        let min_size = Size {
            width: min_width,
            height: min_height,
        };
        let max_size = Size {
            width: max_width,
            height: max_height,
        };
        let aspect_ratio = Some(self.next()).filter(|ratio| ratio.is_finite() && *ratio > 0.0);
        let margin = self.rect(Self::length_percentage_auto);
        let padding = self.rect(Self::length_percentage);
        let border = self.rect(Self::length_percentage);
        let inset = self.rect(Self::length_percentage_auto);
        let gap = self.size(Self::length_percentage);
        let align_items = self.align_items();
        let align_self = self.align_items();
        let align_content = self.align_content();
        let justify_items = self.align_items();
        let justify_self = self.align_items();
        let justify_content = self.align_content();
        let flex_direction = match self.int() {
            1 => FlexDirection::Column,
            2 => FlexDirection::RowReverse,
            3 => FlexDirection::ColumnReverse,
            _ => FlexDirection::Row,
        };
        let flex_wrap = match self.int() {
            1 => FlexWrap::Wrap,
            2 => FlexWrap::WrapReverse,
            _ => FlexWrap::NoWrap,
        };
        let flex_basis = self.dimension();
        let flex_grow = self.next();
        let flex_shrink = self.next();
        let text_align = match self.int() {
            1 => TextAlign::LegacyLeft,
            2 => TextAlign::LegacyRight,
            3 => TextAlign::LegacyCenter,
            _ => TextAlign::Auto,
        };
        let item_is_replaced = self.int() != 0;
        let float = match self.int() {
            1 => Float::Left,
            2 => Float::Right,
            _ => Float::None,
        };
        let clear = match self.int() {
            1 => Clear::Left,
            2 => Clear::Right,
            3 => Clear::Both,
            _ => Clear::None,
        };

        let mut style = Style::default();
        if self.int() != 0 {
            (
                style.grid_template_columns,
                style.grid_template_column_names,
            ) = self.track_list();
            (style.grid_template_rows, style.grid_template_row_names) = self.track_list();
            style.grid_auto_columns = self.track_sizes();
            style.grid_auto_rows = self.track_sizes();
            style.grid_auto_flow = match self.int() {
                1 => GridAutoFlow::Column,
                2 => GridAutoFlow::RowDense,
                3 => GridAutoFlow::ColumnDense,
                _ => GridAutoFlow::Row,
            };
            let row_count = self.int() as u16;
            let column_count = self.int() as u16;
            let area_count = self.int() as usize;
            let areas: Vec<GridTemplateArea<String>> = (0..area_count)
                .map(|_| GridTemplateArea {
                    name: self.string(),
                    row_start: self.int() as u16,
                    row_end: self.int() as u16,
                    column_start: self.int() as u16,
                    column_end: self.int() as u16,
                })
                .collect();
            if row_count > 0 && column_count > 0 {
                style.grid_template_areas = Some(GridTemplateAreas {
                    areas,
                    row_count,
                    column_count,
                });
            }
        }
        if self.int() != 0 {
            style.grid_row = Line {
                start: self.grid_line(),
                end: self.grid_line(),
            };
            style.grid_column = Line {
                start: self.grid_line(),
                end: self.grid_line(),
            };
        }

        Style {
            display,
            position,
            box_sizing,
            overflow,
            size,
            min_size,
            max_size,
            aspect_ratio,
            margin,
            padding,
            border,
            inset,
            gap,
            align_items,
            align_self,
            align_content,
            justify_items,
            justify_self,
            justify_content,
            flex_direction,
            flex_wrap,
            flex_basis,
            flex_grow,
            flex_shrink,
            text_align,
            item_is_replaced,
            float,
            clear,
            ..style
        }
    }
}

/// The context of a leaf that is measured by JavaScript.
struct Measured(u32);

fn available_space_to_f32(space: AvailableSpace) -> f32 {
    match space {
        AvailableSpace::Definite(value) => value.max(0.0),
        AvailableSpace::MinContent => -1.0,
        AvailableSpace::MaxContent => f32::INFINITY,
    }
}

/// Lays out the tree in `input` and returns a pointer to `OUTPUT_STRIDE`
/// `f32`s per node: the position relative to the parent, the size, and the
/// padding, border and margin (left, right, top, bottom).
///
/// # Safety
///
/// `input` must point to `len` initialized `f32`s.
#[no_mangle]
pub unsafe extern "C" fn compute(
    input: *const f32,
    len: usize,
    available_width: f32,
    available_height: f32,
    use_rounding: u32,
) -> *const f32 {
    let mut reader = Reader {
        data: std::slice::from_raw_parts(input, len),
        index: 0,
        intrinsic_limits: Vec::new(),
    };

    let node_count = reader.int() as usize;
    let mut tree: TaffyTree<Measured> = TaffyTree::with_capacity(node_count);
    if use_rounding == 0 {
        tree.disable_rounding();
    }

    let mut nodes = Vec::with_capacity(node_count);
    let mut children = Vec::with_capacity(node_count);
    for index in 0..node_count {
        let style = reader.style();
        let node = if reader.int() != 0 {
            tree.new_leaf_with_context(style, Measured(index as u32))
        } else {
            tree.new_leaf(style)
        }
        .unwrap();
        nodes.push(node);

        let child_count = reader.int() as usize;
        children.push(
            (0..child_count)
                .map(|_| reader.int() as usize)
                .collect::<Vec<_>>(),
        );
    }
    for (index, node_children) in children.iter().enumerate() {
        if !node_children.is_empty() {
            let ids: Vec<NodeId> = node_children.iter().map(|&child| nodes[child]).collect();
            tree.set_children(nodes[index], &ids).unwrap();
        }
    }

    // Negative sizes are the min-content size, and infinite ones the
    // max-content size.
    let to_available_space = |value: f32| {
        if value < 0.0 {
            AvailableSpace::MinContent
        } else if value.is_finite() {
            AvailableSpace::Definite(value)
        } else {
            AvailableSpace::MaxContent
        }
    };

    let mut measure_leaf = |inputs: LayoutInput,
                            _: NodeId,
                            context: Option<&mut Measured>,
                            style: &Style|
     -> LayoutOutput {
        // The floats that intersect this leaf. They're taken, so that layouts nested in its
        // measure function, e.g. of atomic inlines in its text, don't wrap around them.
        let exclusions: Vec<f32> = LEAF_FLOAT_EXCLUSIONS
            .with(|exclusions| exclusions.take().iter().flatten().copied().collect());
        let Some(Measured(index)) = context else {
            return compute_leaf_layout(inputs, style, |_, _| 0.0, |_, _| Size::ZERO);
        };
        let index = *index;
        let mut baselines = Baselines::NONE;
        let mut output = compute_leaf_layout(
            inputs,
            style,
            |_, _| 0.0,
            |known, available| {
                let mut out = [0.0f32; 4];
                measure(
                    index,
                    known.width.unwrap_or(f32::NAN),
                    known.height.unwrap_or(f32::NAN),
                    available_space_to_f32(available.width),
                    available_space_to_f32(available.height),
                    exclusions.as_ptr(),
                    (exclusions.len() / 4) as u32,
                    out.as_mut_ptr(),
                );
                baselines.first = Some(out[2]).filter(|value| value.is_finite());
                baselines.last = Some(out[3]).filter(|value| value.is_finite());
                Size {
                    width: out[0],
                    height: out[1],
                }
            },
        );
        output.baselines = baselines;
        output
    };

    // Taffy doesn't support sizing keywords as minimum and maximum widths, so
    // they're replaced by the intrinsic widths of their boxes, measured before
    // the layout without the box's own widths, from the innermost boxes. A
    // `fit-content()` limit is clamped between them. Other keywords are `auto`.
    for (index, &node) in nodes.iter().enumerate().rev() {
        let [min_keyword, max_keyword] = reader.intrinsic_limits[index];
        if min_keyword.is_none() && max_keyword.is_none() {
            continue;
        }
        let style = tree.style(node).unwrap().clone();
        let mut unconstrained = style.clone();
        unconstrained.size.width = Dimension::auto();
        unconstrained.min_size.width = LengthPercentageAuto::auto();
        unconstrained.max_size.width = LengthPercentageAuto::auto();
        tree.set_style(node, unconstrained).unwrap();
        let mut measure = |width: AvailableSpace| {
            let available = Size {
                width,
                height: AvailableSpace::MaxContent,
            };
            tree.compute_layout_with_measure(node, available, &mut measure_leaf)
                .unwrap();
            // Layouts have the size of the border box.
            let layout = tree.layout(node).unwrap();
            let insets = layout.padding.left
                + layout.padding.right
                + layout.border.left
                + layout.border.right;
            layout.size.width
                - if style.box_sizing == BoxSizing::ContentBox {
                    insets
                } else {
                    0.0
                }
        };
        let min_content = measure(AvailableSpace::MinContent);
        let max_content = measure(AvailableSpace::MaxContent).max(min_content);
        let resolve = |keyword: Option<Dimension>, size: LengthPercentageAuto| match keyword
            .map(|k| k.tag())
        {
            Some(CompactLength::MIN_CONTENT_TAG) => LengthPercentageAuto::length(min_content),
            Some(CompactLength::MAX_CONTENT_TAG) => LengthPercentageAuto::length(max_content),
            Some(CompactLength::FIT_CONTENT_PX_TAG) => LengthPercentageAuto::length(
                keyword.unwrap().value().min(max_content).max(min_content),
            ),
            _ => size,
        };
        let mut resolved = style;
        resolved.min_size.width = resolve(min_keyword, resolved.min_size.width);
        resolved.max_size.width = resolve(max_keyword, resolved.max_size.width);
        tree.set_style(node, resolved).unwrap();
    }

    tree.compute_layout_with_measure(
        nodes[0],
        Size {
            width: to_available_space(available_width),
            height: to_available_space(available_height),
        },
        &mut measure_leaf,
    )
    .unwrap();

    OUTPUT.with(|output| {
        let mut output = output.borrow_mut();
        output.clear();
        output.reserve(node_count * OUTPUT_STRIDE);
        for &node in &nodes {
            let layout = tree.layout(node).unwrap();
            output.extend_from_slice(&[
                layout.location.x,
                layout.location.y,
                layout.size.width,
                layout.size.height,
                layout.padding.left,
                layout.padding.right,
                layout.padding.top,
                layout.padding.bottom,
                layout.border.left,
                layout.border.right,
                layout.border.top,
                layout.border.bottom,
                layout.margin.left,
                layout.margin.right,
                layout.margin.top,
                layout.margin.bottom,
            ]);
        }
        output.as_ptr()
    })
}
