// Copyright (c) 2014 Rafael Caricio. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var GradientParser = GradientParser || {}

// https://w3c.github.io/csswg-drafts/css-images-3/#linear-gradients
// It may be omitted; if so, it defaults to to bottom.
const FALLBACK_LINEAR_ORIENTATION = { type: 'directional', value: 'bottom' }

GradientParser.parse = (function () {
  var tokens = {
    linearGradient: /^(\-(webkit|o|ms|moz)\-)?(linear\-gradient)/i,
    repeatingLinearGradient:
      /^(\-(webkit|o|ms|moz)\-)?(repeating\-linear\-gradient)/i,
    radialGradient: /^(\-(webkit|o|ms|moz)\-)?(radial\-gradient)/i,
    repeatingRadialGradient:
      /^(\-(webkit|o|ms|moz)\-)?(repeating\-radial\-gradient)/i,
    sideOrCorner:
      /^to (left (top|bottom)|right (top|bottom)|top (left|right)|bottom (left|right)|left|right|top|bottom)/i,
    extentKeywords:
      /^(closest\-side|closest\-corner|farthest\-side|farthest\-corner|contain|cover)/,
    positionKeywords: /^(left|center|right|top|bottom)/i,
    pixelValue: /^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))px/,
    percentageValue: /^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))\%/,
    emLikeValue: /^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))(r?em|vw|vh)/,
    angleValue: /^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))deg/,
    zeroValue: /[0]/,
    startCall: /^\(/,
    endCall: /^\)/,
    comma: /^,/,
    hexColor: /^\#([0-9a-fA-F]+)/,
    literalColor: /^([a-zA-Z]+)/,
    rgbColor: /^rgb/i,
    rgbaColor: /^rgba/i,
    number: /^(([0-9]*\.[0-9]+)|([0-9]+\.?))/,
  }

  var input = ''

  function error(msg) {
    var err = new Error(input + ': ' + msg)
    err.source = input
    throw err
  }

  function getAST() {
    var ast = matchListDefinitions()

    if (input.length > 0) {
      error('Invalid input not EOF')
    }
    return ast
  }

  function matchListDefinitions() {
    return matchListing(matchDefinition)
  }

  function matchDefinition() {
    return (
      matchGradient(
        'linear-gradient',
        tokens.linearGradient,
        matchLinearOrientation,
        FALLBACK_LINEAR_ORIENTATION
      ) ||
      matchGradient(
        'repeating-linear-gradient',
        tokens.repeatingLinearGradient,
        matchLinearOrientation,
        FALLBACK_LINEAR_ORIENTATION
      ) ||
      matchGradient(
        'radial-gradient',
        tokens.radialGradient,
        matchListRadialOrientations
      ) ||
      matchGradient(
        'repeating-radial-gradient',
        tokens.repeatingRadialGradient,
        matchListRadialOrientations
      )
    )
  }

  function getDefaultRadialGradient(orientation = {}) {
    const res = { ...orientation }

    Object.assign(res, {
      style: (res.style || []).length > 0
        ? res.style
        : [{ type: 'extent-keyword', value: 'farthest-corner' }],
      at: {
        type: 'position',
        value: {
          x: {
            type: 'position-keyword',
            value: 'center',
            ...(res.at?.value?.x || {})
          },
          y: {
            type: 'position-keyword',
            value: 'center',
            ...(res.at?.value?.y || {})
          }
        }
      }}
    )

    if (!orientation.value) {
      Object.assign(res, {
        type: 'shape',
        value: res.style.some(v => ['%', 'extent-keyword'].includes(v.type))
          ? 'ellipse'
          : 'circle'
      })
    }

    return res
  }

  function matchGradient(
    gradientType,
    pattern,
    orientationMatcher,
    fallbackOrientation
  ) {
    return matchCall(pattern, function (captures) {
      var orientation = orientationMatcher()
      if (orientation) {
        if (!scan(tokens.comma)) {
          error('Missing comma before color stops')
        }
      } else {
        orientation = fallbackOrientation
      }

      return {
        type: gradientType,
        orientation: gradientType.endsWith('radial-gradient')
          ? orientation?.map(v => getDefaultRadialGradient(v)) ?? [getDefaultRadialGradient()]
          : orientation,
        colorStops: matchListing(matchColorStop),
      }
    })
  }

  function matchCall(pattern, callback) {
    var captures = scan(pattern)
    if (captures) {
      if (!scan(tokens.startCall)) {
        error('Missing (')
      }

      var result = callback(captures)

      if (!scan(tokens.endCall)) {
        error('Missing )')
      }

      return result
    }
  }

  function matchLinearOrientation() {
    return matchSideOrCorner() || matchAngle() || matchZero();
  }

  function matchSideOrCorner() {
    return match('directional', tokens.sideOrCorner, 1)
  }

  function matchAngle() {
    return match('angular', tokens.angleValue, 1)
  }

  // For zero value passed into linear-gradient first arg:
  function matchZero() {
    return match('directional', tokens.zeroValue, 0)
  }

  function matchListRadialOrientations() {
    var radialOrientations,
      radialOrientation = matchRadialOrientation(),
      lookaheadCache

    if (radialOrientation) {
      radialOrientations = []
      radialOrientations.push(radialOrientation)

      lookaheadCache = input
      if (scan(tokens.comma)) {
        radialOrientation = matchRadialOrientation()
        if (radialOrientation) {
          radialOrientations.push(radialOrientation)
        } else {
          input = lookaheadCache
        }
      }
    }

    return radialOrientations
  }

  function matchRadialOrientation() {
    const pre = preMatchRadialOrientation()
    const at = matchAtPosition()

    if (!pre && !at) return

    return { ...pre, at }
  }

  function preMatchRadialOrientation() {
    let rgEndingShape = matchCircle() || matchEllipse()
    let rgSize = matchExtentKeyword() || matchLength() || matchDistance()
    const extra = match('%', tokens.percentageValue, 1)

    if (rgEndingShape) {
      return {
        ...rgEndingShape,
        style: [rgSize, extra].filter(v => v)
      }
    } else if (rgSize){
      return {
        style: [rgSize, extra].filter(v => v),
        ...(matchCircle() || matchEllipse())
      }
    } else {
      //
    }
  }

  function matchCircle() {
    return match('shape', /^(circle)/i, 0)
  }

  function matchEllipse() {
    return match('shape', /^(ellipse)/i, 0)
  }

  function matchExtentKeyword() {
    return match('extent-keyword', tokens.extentKeywords, 1)
  }

  function matchAtPosition() {
    if (match('position', /^at/, 0)) {
      var positioning = matchPositioning()

      if (!positioning) {
        error('Missing positioning value')
      }

      return positioning
    }
  }

  function matchPositioning() {
    var location = matchCoordinates()

    if (location.x || location.y) {
      return {
        type: 'position',
        value: location,
      }
    }
  }

  function matchCoordinates() {
    return {
      x: matchDistance(),
      y: matchDistance(),
    }
  }

  function matchListing(matcher) {
    var captures = matcher(),
      result = []

    if (captures) {
      result.push(captures)
      while (scan(tokens.comma)) {
        captures = matcher()
        if (captures) {
          result.push(captures)
        } else {
          error('One extra comma')
        }
      }
    }

    return result
  }

  function matchColorStop() {
    var color = matchColor()

    if (!color) {
      error('Expected color definition')
    }

    color.length = matchDistance()
    return color
  }

  function matchColor() {
    return (
      matchHexColor() ||
      matchRGBAColor() ||
      matchRGBColor() ||
      matchLiteralColor()
    )
  }

  function matchLiteralColor() {
    return match('literal', tokens.literalColor, 0)
  }

  function matchHexColor() {
    return match('hex', tokens.hexColor, 1)
  }

  function matchRGBColor() {
    return matchCall(tokens.rgbColor, function () {
      return {
        type: 'rgb',
        value: matchListing(matchNumber),
      }
    })
  }

  function matchRGBAColor() {
    return matchCall(tokens.rgbaColor, function () {
      return {
        type: 'rgba',
        value: matchListing(matchNumber),
      }
    })
  }

  function matchNumber() {
    return scan(tokens.number)[1]
  }

  function matchDistance() {
    return (
      match('%', tokens.percentageValue, 1) ||
      matchPositionKeyword() ||
      matchLength()
    )
  }

  function matchPositionKeyword() {
    return match('position-keyword', tokens.positionKeywords, 1)
  }

  function matchLength() {
    return match('px', tokens.pixelValue, 1) || matchRelativeLength(tokens.emLikeValue, 1)
  }

  function matchRelativeLength(pattern, captureIndex) {
    var captures = scan(pattern)
    if (captures) {
      return {
        type: captures[5],
        value: captures[captureIndex],
      }
    }
  }

  function match(type, pattern, captureIndex) {
    var captures = scan(pattern)
    if (captures) {
      return {
        type: type,
        value: captures[captureIndex],
      }
    }
  }

  function scan(regexp) {
    var captures, blankCaptures

    blankCaptures = /^[\n\r\t\s]+/.exec(input)
    if (blankCaptures) {
      consume(blankCaptures[0].length)
    }

    captures = regexp.exec(input)
    if (captures) {
      consume(captures[0].length)
    }

    return captures
  }

  function consume(size) {
    input = input.substr(size)
  }

  return function (code) {
    input = code.toString()
    return getAST()
  }
})()

export default GradientParser
