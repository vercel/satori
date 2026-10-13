/**
 * A minimal client of the Chrome DevTools Protocol, for capturing pages and
 * rendering references with the local Chrome. Set `CHROME_PATH` to use
 * another browser.
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME_PATH =
  process.env.CHROME_PATH ??
  (process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : 'google-chrome')

type Pending = { resolve: (value: any) => void; reject: (error: Error) => void }

export class Page {
  private listeners = new Map<string, ((params: any) => void)[]>()
  private browser: Browser
  readonly sessionId: string
  readonly targetId: string

  constructor(browser: Browser, sessionId: string, targetId: string) {
    this.browser = browser
    this.sessionId = sessionId
    this.targetId = targetId
  }

  send(method: string, params: object = {}) {
    return this.browser.send(method, params, this.sessionId)
  }

  /** Resolves with the params of the next `event`. */
  once(event: string): Promise<any> {
    return new Promise((resolve) => {
      const listeners = this.listeners.get(event) ?? []
      listeners.push(resolve)
      this.listeners.set(event, listeners)
    })
  }

  emit(event: string, params: any) {
    const listeners = this.listeners.get(event)
    if (!listeners) return
    this.listeners.delete(event)
    for (const listener of listeners) listener(params)
  }

  /** Evaluates an expression in the page, awaiting promises. */
  async evaluate<T = any>(expression: string): Promise<T> {
    const { result, exceptionDetails } = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    if (exceptionDetails) {
      throw new Error(
        exceptionDetails.exception?.description ?? exceptionDetails.text
      )
    }
    return result.value
  }

  /** Navigates to `url` and waits for the load event. */
  async goto(url: string) {
    const loaded = this.once('Page.loadEventFired')
    await this.send('Page.navigate', { url })
    await loaded
  }

  /** Sets the size of the viewport, in CSS pixels at a device scale of 1. */
  setViewport(width: number, height: number) {
    return this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    })
  }

  /** A PNG screenshot of the area from the top left of the page. */
  async screenshot(width: number, height: number) {
    const { data } = await this.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height, scale: 1 },
    })
    return Buffer.from(data, 'base64')
  }

  close() {
    return this.browser.send('Target.closeTarget', { targetId: this.targetId })
  }
}

export class Browser {
  private nextId = 0
  private pending = new Map<number, Pending>()
  private pages = new Map<string, Page>()
  private process: ChildProcess
  private socket: WebSocket
  private profile: string

  private constructor(
    process: ChildProcess,
    socket: WebSocket,
    profile: string
  ) {
    this.process = process
    this.socket = socket
    this.profile = profile
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data))
      if (message.id !== undefined) {
        const pending = this.pending.get(message.id)
        this.pending.delete(message.id)
        if (message.error) {
          pending?.reject(new Error(message.error.message))
        } else {
          pending?.resolve(message.result)
        }
      } else if (message.sessionId) {
        this.pages.get(message.sessionId)?.emit(message.method, message.params)
      }
    })
  }

  static async launch() {
    const profile = mkdtempSync(join(tmpdir(), 'satori-fidelity-'))
    const chrome = spawn(
      CHROME_PATH,
      [
        '--headless=new',
        '--remote-debugging-port=0',
        `--user-data-dir=${profile}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--hide-scrollbars',
        '--force-color-profile=srgb',
        '--font-render-hinting=none',
        'about:blank',
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] }
    )
    const endpoint = await new Promise<string>((resolve, reject) => {
      let output = ''
      chrome.stderr!.on('data', (chunk) => {
        output += chunk
        const match = /DevTools listening on (ws:\/\/\S+)/.exec(output)
        if (match) resolve(match[1])
      })
      chrome.on('exit', () => reject(new Error(`Chrome exited:\n${output}`)))
    })
    const socket = new WebSocket(endpoint)
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve)
      socket.addEventListener('error', reject)
    })
    return new Browser(chrome, socket, profile)
  }

  send(method: string, params: object = {}, sessionId?: string) {
    const id = ++this.nextId
    return new Promise<any>((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.socket.send(JSON.stringify({ id, method, params, sessionId }))
    })
  }

  async newPage() {
    const { targetId } = await this.send('Target.createTarget', {
      url: 'about:blank',
    })
    const { sessionId } = await this.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    })
    const page = new Page(this, sessionId, targetId)
    this.pages.set(sessionId, page)
    await page.send('Page.enable')
    await page.send('Runtime.enable')
    return page
  }

  async close() {
    this.socket.close()
    this.process.kill()
    await new Promise((resolve) => this.process.once('exit', resolve))
    rmSync(this.profile, { recursive: true, force: true })
  }
}
