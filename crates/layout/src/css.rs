//! Parses the stylesheets of `<style>` elements with `cssparser`, into JSON
//! for `src/handler/stylesheet.ts`, which matches the selectors and applies
//! the cascade. Invalid rules and declarations are dropped, like in browsers.
//!
//! A stylesheet is a list of rules:
//! - `{"s":selectors,"b":items}`: a style rule, whose items are declarations
//!   `[name,value,important]` and nested rules, in order.
//! - `{"m":query,"b":items}`: `@media`, with the text of the query.
//! - `{"u":condition,"b":items}`: `@supports`, with the text of the condition.
//! - `{"l":names,"b":items}`: a `@layer` block, with no name if anonymous.
//! - `{"l":names}`: a `@layer` statement.
//!
//! Other at-rules are dropped. Nested group rules have declarations too.
//!
//! The value of `content` is `"none"`, `"normal"`, or a list of strings,
//! `["attr",name,fallback]`, `["counter",name,separator,style]`, where the
//! separator of `counter()` is `null`, `["quote",keyword]` and `["url",url]`.
//!
//! A selector list is a list of complex selectors, which are lists of
//! compound selectors and combinators (`" "`, `">"`, `"+"` or `"~"`) from left
//! to right. Relative selectors, in nested rules and `:has()`, can start with
//! a combinator. Compound selectors are lists of simple selectors:
//! - `["*"]`, `["t",name]`, `["#",id]`, `[".",class]`, `["&"]`
//! - `["[",name]` or `["[",name,operator,value,flag]`
//! - `[":",name]` for pseudo-classes, `[":",name,selectors]` for `:is()`,
//!   `:where()`, `:not()` and `:has()`, `[":",name,a,b,selectors]` for
//!   `:nth-*()`, where `selectors` can be `null`, `[":","lang",ranges]`, and
//!   `[":",name,null]` for other functional pseudo-classes.
//! - `["::",name]` for pseudo-elements.

use std::fmt::Write;

use cssparser::{
    AtRuleParser, CowRcStr, DeclarationParser, ParseError, Parser, ParserState,
    QualifiedRuleParser, RuleBodyItemParser, RuleBodyParser, StyleSheetParser, Token,
};

type Result<T> = std::result::Result<T, ParseError<()>>;

/// Parses a stylesheet into JSON.
pub fn parse_stylesheet(css: &str) -> String {
    let mut input = Parser::new(css);
    let mut parser = Rules { nested: false };
    let rules: Vec<String> = StyleSheetParser::new(&mut input, &mut parser)
        .filter_map(|rule| rule.ok())
        .collect();
    list(&rules)
}

/// Parses rules. Nested rules are in style rules, where selectors are
/// relative and declarations are allowed.
struct Rules {
    nested: bool,
}

enum AtRulePrelude {
    Media(String),
    Supports(String),
    Layer(Vec<String>),
}

impl Rules {
    fn body(&self, input: &mut Parser) -> String {
        let mut parser = Rules {
            nested: self.nested,
        };
        let items: Vec<String> = RuleBodyParser::new(input, &mut parser)
            .filter_map(|item| item.ok())
            .collect();
        list(&items)
    }
}

impl<'i> AtRuleParser<'i> for Rules {
    type Prelude = AtRulePrelude;
    type AtRule = String;
    type Error = ();

    fn parse_prelude(
        &mut self,
        name: CowRcStr<'i>,
        input: &mut Parser<'i>,
    ) -> Result<AtRulePrelude> {
        let name = name.to_ascii_lowercase();
        match name.as_str() {
            "media" => Ok(AtRulePrelude::Media(rest(input))),
            "supports" => Ok(AtRulePrelude::Supports(rest(input))),
            "layer" => {
                if input.is_exhausted() {
                    return Ok(AtRulePrelude::Layer(Vec::new()));
                }
                Ok(AtRulePrelude::Layer(
                    input.parse_comma_separated(layer_name)?,
                ))
            }
            _ => Err(ParseError::unexpected_token()),
        }
    }

    fn rule_without_block(
        &mut self,
        prelude: AtRulePrelude,
        _start: &ParserState,
    ) -> std::result::Result<String, ()> {
        match prelude {
            AtRulePrelude::Layer(names) if !names.is_empty() => {
                Ok(format!("{{\"l\":{}}}", strings(&names)))
            }
            _ => Err(()),
        }
    }

    fn parse_block<'t>(
        &mut self,
        prelude: AtRulePrelude,
        _start: &ParserState,
        input: &mut Parser<'i>,
    ) -> Result<String> {
        let body = self.body(input);
        Ok(match prelude {
            AtRulePrelude::Media(query) => format!("{{\"m\":{},\"b\":{}}}", json(&query), body),
            AtRulePrelude::Supports(condition) => {
                format!("{{\"u\":{},\"b\":{}}}", json(&condition), body)
            }
            AtRulePrelude::Layer(names) if names.len() <= 1 => {
                format!("{{\"l\":{},\"b\":{}}}", strings(&names), body)
            }
            AtRulePrelude::Layer(_) => return Err(ParseError::unexpected_token()),
        })
    }
}

impl<'i> QualifiedRuleParser<'i> for Rules {
    type Prelude = String;
    type QualifiedRule = String;
    type Error = ();

    fn parse_prelude(&mut self, input: &mut Parser<'i>) -> Result<String> {
        selector_list(input, self.nested)
    }

    fn parse_block(
        &mut self,
        selectors: String,
        _start: &ParserState,
        input: &mut Parser<'i>,
    ) -> Result<String> {
        let body = Rules { nested: true }.body(input);
        Ok(format!("{{\"s\":{},\"b\":{}}}", selectors, body))
    }
}

impl<'i> DeclarationParser<'i> for Rules {
    type Declaration = String;
    type Error = ();

    fn parse_value(
        &mut self,
        name: CowRcStr<'i>,
        input: &mut Parser<'i>,
        _start: &ParserState,
    ) -> Result<String> {
        if name.eq_ignore_ascii_case("content") {
            let (value, important) = content(input)?;
            return Ok(format!(
                "[\"content\",{},{}]",
                value,
                if important { 1 } else { 0 }
            ));
        }
        let custom = name.starts_with("--");
        let start = input.position();
        // The position of `!important` at the end, if any.
        let mut important = None;
        loop {
            let before = input.position();
            let (bang, block) = match input.next() {
                // Only custom properties can have `{}` blocks. Otherwise, it's
                // a nested rule that starts with an identifier, e.g. `a:hover {}`,
                // which is parsed as a rule instead.
                Ok(Token::CurlyBracketBlock) if !custom => {
                    return Err(ParseError::unexpected_token())
                }
                Ok(token) => (
                    matches!(token, Token::Delim('!')),
                    matches!(
                        token,
                        Token::Function(_)
                            | Token::ParenthesisBlock
                            | Token::SquareBracketBlock
                            | Token::CurlyBracketBlock
                    ),
                ),
                Err(_) => break,
            };
            // The contents of a block are skipped by the next token otherwise,
            // so the position before it would be in the block, e.g. in
            // `var(--x) !important`.
            if block {
                input.parse_nested_block(|input| -> Result<()> {
                    while input.next().is_ok() {}
                    Ok(())
                })?;
            }
            if bang
                && input
                    .try_parse(|input| {
                        input.expect_ident_matching("important")?;
                        input.expect_exhausted()
                    })
                    .is_ok()
            {
                important = Some(before);
                break;
            }
        }
        let end = important.unwrap_or_else(|| input.position());
        let value = input.slice(start..end).trim();

        if value.is_empty() && !custom {
            return Err(ParseError::unexpected_token());
        }
        let name = if custom {
            name.to_string()
        } else {
            name.to_ascii_lowercase()
        };
        Ok(format!(
            "[{},{},{}]",
            json(&name),
            json(value),
            if important.is_some() { 1 } else { 0 }
        ))
    }
}

impl<'i> RuleBodyItemParser<'i, String, ()> for Rules {
    fn parse_declarations(&self) -> bool {
        self.nested
    }

    fn parse_qualified(&self) -> bool {
        true
    }
}

/// The value of `content`, and whether it's `!important`.
fn content(input: &mut Parser) -> Result<(String, bool)> {
    let mut parts = Vec::new();
    let mut keyword = None;
    let mut important = false;
    loop {
        let token = match input.next() {
            Ok(token) => token.clone(),
            Err(_) => break,
        };
        if keyword.is_some() && token != Token::Delim('!') {
            return Err(ParseError::unexpected_token());
        }
        match token {
            Token::Delim('!') => {
                input.expect_ident_matching("important")?;
                input.expect_exhausted()?;
                important = true;
                break;
            }
            // The alternative text after `/` isn't drawn.
            Token::Delim('/') if !parts.is_empty() => {
                while let Ok(token) = input.next() {
                    if *token == Token::Delim('!') {
                        input.expect_ident_matching("important")?;
                        input.expect_exhausted()?;
                        important = true;
                        break;
                    }
                }
                break;
            }
            Token::QuotedString(text) => parts.push(json(&text)),
            Token::UnquotedUrl(url) => parts.push(format!("[\"url\",{}]", json(&url))),
            Token::Function(name) => {
                let name = name.to_ascii_lowercase();
                parts.push(input.parse_nested_block(|input| content_function(input, &name))?);
            }
            Token::Ident(ident) => {
                let ident = ident.to_ascii_lowercase();
                match ident.as_str() {
                    "none" | "normal" if parts.is_empty() => keyword = Some(ident),
                    "open-quote" | "close-quote" | "no-open-quote" | "no-close-quote" => {
                        parts.push(format!("[\"quote\",{}]", json(&ident)))
                    }
                    _ => return Err(ParseError::unexpected_token()),
                }
            }
            _ => return Err(ParseError::unexpected_token()),
        }
    }
    match keyword {
        Some(keyword) => Ok((json(&keyword), important)),
        None if parts.is_empty() => Err(ParseError::unexpected_token()),
        None => Ok((list(&parts), important)),
    }
}

fn content_function(input: &mut Parser, name: &str) -> Result<String> {
    let value = match name {
        "url" => format!("[\"url\",{}]", json(input.expect_string()?)),
        "attr" => {
            let attribute = input.expect_ident()?.to_string();
            let fallback = if input.try_parse(|input| input.expect_comma()).is_ok() {
                json(input.expect_string()?)
            } else {
                "null".to_string()
            };
            format!("[\"attr\",{},{}]", json(&attribute), fallback)
        }
        "counter" | "counters" => {
            let counter = input.expect_ident()?.to_string();
            let separator = if name == "counters" {
                input.expect_comma()?;
                json(input.expect_string()?)
            } else {
                "null".to_string()
            };
            let style = if input.try_parse(|input| input.expect_comma()).is_ok() {
                input.expect_ident()?.to_string()
            } else {
                "decimal".to_string()
            };
            format!(
                "[\"counter\",{},{},{}]",
                json(&counter),
                separator,
                json(&style)
            )
        }
        _ => return Err(ParseError::unexpected_token()),
    };
    input.expect_exhausted()?;
    Ok(value)
}

/// The rest of the input as text.
fn rest(input: &mut Parser) -> String {
    let start = input.position();
    while input.next().is_ok() {}
    input.slice_from(start).trim().to_string()
}

/// A layer name, e.g. `base` or `theme.dark`.
fn layer_name(input: &mut Parser) -> Result<String> {
    let mut name = input.expect_ident()?.to_string();
    loop {
        let state = input.state();
        match input.next_including_whitespace() {
            Ok(Token::Delim('.')) => {}
            _ => {
                input.reset(&state);
                return Ok(name);
            }
        }
        // There's no whitespace in names.
        match input.next_including_whitespace()? {
            Token::Ident(part) => {
                name.push('.');
                name.push_str(part);
            }
            _ => return Err(ParseError::unexpected_token()),
        }
    }
}

fn selector_list(input: &mut Parser, relative: bool) -> Result<String> {
    let selectors = input.parse_comma_separated(|input| complex_selector(input, relative))?;
    Ok(list(&selectors))
}

/// A selector list where invalid selectors are dropped, for `:is()` and
/// `:where()`.
fn forgiving_selector_list(input: &mut Parser) -> String {
    let selectors =
        input.parse_comma_separated_ignoring_errors(|input| complex_selector(input, false));
    list(&selectors)
}

fn combinator(token: &Token) -> Option<&'static str> {
    match token {
        Token::Delim('>') => Some("\">\""),
        Token::Delim('+') => Some("\"+\""),
        Token::Delim('~') => Some("\"~\""),
        _ => None,
    }
}

fn complex_selector(input: &mut Parser, relative: bool) -> Result<String> {
    let mut parts = Vec::new();
    input.skip_whitespace();
    if relative {
        let state = input.state();
        match input.next().map(combinator) {
            Ok(Some(c)) => parts.push(c.to_string()),
            _ => input.reset(&state),
        }
    }
    loop {
        parts.push(compound_selector(input)?);
        // The combinator before the next compound selector.
        let mut whitespace = false;
        loop {
            let state = input.state();
            let token = match input.next_including_whitespace() {
                Ok(token) => token.clone(),
                Err(_) => return Ok(list(&parts)),
            };
            if let Token::WhiteSpace(_) = token {
                whitespace = true;
            } else if let Some(c) = combinator(&token) {
                parts.push(c.to_string());
                break;
            } else if whitespace {
                input.reset(&state);
                parts.push("\" \"".to_string());
                break;
            } else {
                return Err(ParseError::unexpected_token());
            }
        }
    }
}

fn compound_selector(input: &mut Parser) -> Result<String> {
    input.skip_whitespace();
    let mut simple: Vec<String> = Vec::new();
    loop {
        let state = input.state();
        let token = match input.next_including_whitespace() {
            Ok(token) => token.clone(),
            Err(_) => break,
        };
        match token {
            // Type and universal selectors are first.
            Token::Ident(name) if simple.is_empty() => {
                simple.push(format!("[\"t\",{}]", json(&name)))
            }
            Token::Delim('*') if simple.is_empty() => simple.push("[\"*\"]".to_string()),
            Token::Ident(_) | Token::Delim('*') => return Err(ParseError::unexpected_token()),
            Token::Delim('&') => simple.push("[\"&\"]".to_string()),
            Token::IDHash(id) => simple.push(format!("[\"#\",{}]", json(&id))),
            Token::Delim('.') => match input.next_including_whitespace()? {
                Token::Ident(class) => simple.push(format!("[\".\",{}]", json(class))),
                _ => return Err(ParseError::unexpected_token()),
            },
            Token::SquareBracketBlock => simple.push(input.parse_nested_block(attribute)?),
            Token::Colon => simple.push(pseudo(input)?),
            _ => {
                input.reset(&state);
                break;
            }
        }
    }
    if simple.is_empty() {
        return Err(ParseError::unexpected_token());
    }
    Ok(list(&simple))
}

fn attribute(input: &mut Parser) -> Result<String> {
    let name = input.expect_ident()?.to_string();
    let operator = match input.next() {
        Err(_) => return Ok(format!("[\"[\",{}]", json(&name))),
        Ok(Token::Delim('=')) => "=",
        Ok(Token::IncludeMatch) => "~=",
        Ok(Token::DashMatch) => "|=",
        Ok(Token::PrefixMatch) => "^=",
        Ok(Token::SuffixMatch) => "$=",
        Ok(Token::SubstringMatch) => "*=",
        Ok(_) => return Err(ParseError::unexpected_token()),
    };
    let value = input.expect_ident_or_string()?.to_string();
    let flag =
        match input.try_parse(|input| input.expect_ident().map(|flag| flag.to_ascii_lowercase())) {
            Ok(flag) if flag == "i" || flag == "s" => flag,
            Ok(_) => return Err(ParseError::unexpected_token()),
            Err(_) => String::new(),
        };
    input.expect_exhausted()?;
    Ok(format!(
        "[\"[\",{},\"{}\",{},\"{}\"]",
        json(&name),
        operator,
        json(&value),
        flag
    ))
}

/// A pseudo-class or pseudo-element, after the first colon.
fn pseudo(input: &mut Parser) -> Result<String> {
    match input.next_including_whitespace()?.clone() {
        Token::Colon => match input.next_including_whitespace()?.clone() {
            Token::Ident(name) => Ok(format!("[\"::\",{}]", json(&name.to_ascii_lowercase()))),
            Token::Function(name) => {
                input.parse_nested_block(|input| {
                    while input.next().is_ok() {}
                    Ok::<_, ParseError<()>>(())
                })?;
                Ok(format!("[\"::\",{}]", json(&name.to_ascii_lowercase())))
            }
            _ => Err(ParseError::unexpected_token()),
        },
        Token::Ident(name) => {
            let name = name.to_ascii_lowercase();
            // Pseudo-elements from CSS 2 can have one colon.
            let kind = match name.as_str() {
                "before" | "after" | "first-line" | "first-letter" => "::",
                _ => ":",
            };
            Ok(format!("[\"{}\",{}]", kind, json(&name)))
        }
        Token::Function(name) => {
            let name = name.to_ascii_lowercase();
            input.parse_nested_block(|input| functional_pseudo_class(input, &name))
        }
        _ => Err(ParseError::unexpected_token()),
    }
}

fn functional_pseudo_class(input: &mut Parser, name: &str) -> Result<String> {
    match name {
        "is" | "matches" | "-webkit-any" | "-moz-any" => {
            Ok(format!("[\":\",\"is\",{}]", forgiving_selector_list(input)))
        }
        "where" => Ok(format!(
            "[\":\",\"where\",{}]",
            forgiving_selector_list(input)
        )),
        "not" => Ok(format!("[\":\",\"not\",{}]", selector_list(input, false)?)),
        "has" => Ok(format!("[\":\",\"has\",{}]", selector_list(input, true)?)),
        "nth-child" | "nth-last-child" | "nth-of-type" | "nth-last-of-type" => {
            let (a, b) = cssparser::parse_nth(input)?;
            let of = if name.ends_with("child")
                && input
                    .try_parse(|input| input.expect_ident_matching("of"))
                    .is_ok()
            {
                selector_list(input, false)?
            } else {
                input.expect_exhausted()?;
                "null".to_string()
            };
            Ok(format!("[\":\",{},{},{},{}]", json(name), a, b, of))
        }
        "lang" => {
            let ranges = input.parse_comma_separated(|input| {
                Ok::<_, ParseError<()>>(input.expect_ident_or_string()?.to_string())
            })?;
            Ok(format!("[\":\",\"lang\",{}]", strings(&ranges)))
        }
        _ => {
            while input.next().is_ok() {}
            Ok(format!("[\":\",{},null]", json(name)))
        }
    }
}

fn list(items: &[String]) -> String {
    format!("[{}]", items.join(","))
}

fn strings(items: &[String]) -> String {
    let items: Vec<String> = items.iter().map(|item| json(item)).collect();
    list(&items)
}

/// A JSON string.
fn json(value: &str) -> String {
    let mut out = String::with_capacity(value.len() + 2);
    out.push('"');
    for c in value.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => {
                let _ = write!(out, "\\u{:04x}", c as u32);
            }
            c => out.push(c),
        }
    }
    out.push('"');
    out
}
