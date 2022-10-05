module.exports = function deprecate(fn, message) {
  return function (...args) {
    console.warn(message)
    return fn(...args)
  }
}
