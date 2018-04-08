const ora = require('ora')
import { IO } from 'fp-ts/lib/IO'

export interface OraOptions {
  text: string
  spinner?: string | { interval: number; frames: any[] }
  color?: 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'grey'
  hideCursor?: boolean
  interval?: number
  enabled?: boolean
}

export interface Ora {
  text: string
  frame: string
  start(text?: string): this
  stop(): this
  succeed(text?: string): this
  fail(text?: string): this
}

export const create: IO<Ora> = new IO(() => ora())

export const start = (logger: Ora) => (message: string): IO<void> =>
  new IO(() => {
    logger.start(message)
  })

export const succeed = (logger: Ora): IO<void> =>
  new IO(() => {
    logger.succeed()
  })

export const fail = (logger: Ora) => (message: string): IO<void> =>
  new IO(() => {
    logger.fail(message)
  })
