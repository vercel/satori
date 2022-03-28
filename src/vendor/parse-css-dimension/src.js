var cssLengthUnits = require('css-length-units')
var cssAngleUnits = require('css-angle-units')
var cssResolutionUnits = require('css-resolution-units')
var cssFrequencyUnits = require('css-frequency-units')
var cssTimeUnits = require('css-time-units')

function CssDimension(value) {
  if (/\.\D?$/.test(value)) {
    throw new Error('The dot should be followed by a number')
  }

  if (/^[+-]{2}/.test(value)) {
    throw new Error('Only one leading +/- is allowed')
  }

  if (countDots(value) > 1) {
    throw new Error('Only one dot is allowed')
  }

  if (/%$/.test(value)) {
    this.type = 'percentage'
    this.value = tryParseFloat(value)
    this.unit = '%'
    return
  }

  var unit = parseUnit(value)
  if (!unit) {
    this.type = 'number'
    this.value = tryParseFloat(value)
    return
  }

  this.type = getTypeFromUnit(unit)
  this.value = tryParseFloat(value.substr(0, value.length - unit.length))
  this.unit = unit
}

CssDimension.prototype.valueOf = function () {
  return this.value
}

CssDimension.prototype.toString = function () {
  return this.value + (this.unit || '')
}

export default function factory(value) {
  return new CssDimension(value)
}

function countDots(value) {
  var m = value.match(/\./g)
  return m ? m.length : 0
}

function tryParseFloat(value) {
  var result = parseFloat(value)
  if (isNaN(result)) {
    throw new Error('Invalid number: ' + value)
  }
  return result
}

var units = [].concat(
  cssAngleUnits,
  cssFrequencyUnits,
  cssLengthUnits,
  cssResolutionUnits,
  cssTimeUnits
)

function parseUnit(value) {
  var m = value.match(/\D+$/)
  var unit = m && m[0]
  if (unit && units.indexOf(unit) === -1) {
    throw new Error('Invalid unit: ' + unit)
  }
  return unit
}

var unitTypeLookup = Object.assign(
  createLookups(cssAngleUnits, 'angle'),
  createLookups(cssFrequencyUnits, 'frequency'),
  createLookups(cssResolutionUnits, 'resolution'),
  createLookups(cssTimeUnits, 'time')
)

function createLookups(list, value) {
  return Object.fromEntries(list.map((unit) => [unit, value]))
}

function getTypeFromUnit(unit) {
  return unitTypeLookup[unit] || 'length'
}
