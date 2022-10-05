export default {
  info(key, messages) {
    console.info(...(Array.isArray(key) ? [key] : [messages, key]))
  },
  warn(key, messages) {
    console.warn(...(Array.isArray(key) ? [key] : [messages, key]))
  },
  risk(key, messages) {
    console.error(...(Array.isArray(key) ? [key] : [messages, key]))
  },
}
