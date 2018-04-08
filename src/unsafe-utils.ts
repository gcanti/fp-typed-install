import * as sh from 'shelljs'
import * as got from 'got'
import * as fs from 'mz/fs'
import { resolve } from 'path'

const REGISTRY_URL = 'https://registry.npmjs.org'

const parseOpts = (dev: boolean, yarn: boolean) => {
  return {
    command: yarn ? 'yarn add' : 'npm i',
    devFlag: yarn ? '--dev' : '-D'
  }
}

export const npmInstall = (modules: string[], dev: boolean, yarn = false): Promise<string> => {
  const { command, devFlag } = parseOpts(dev, yarn)

  return new Promise((res, rej) =>
    sh.exec(
      [command, dev ? devFlag : '', ...modules].join(' '),
      { async: true, silent: true },
      (code, stdout, stderr) => {
        if (code) {
          rej(stderr)
        }
        res(stdout)
      }
    )
  )
}

// gets the `@types/name` registry info
export const getTypingInfo = async (name: string): Promise<string | null> => {
  // make sure to encode the / in the name
  const url = `${REGISTRY_URL}/@${encodeURIComponent(`types/${name}`)}`
  try {
    await got(url)
    return name
  } catch (e) {
    if (e.statusCode === 404) {
      return null
    } else {
      throw e
    }
  }
}

// returns null for functions that have type info and the module name if they're missing
export const missingTypes = async (m: string): Promise<string | null> => {
  const installDir = resolve(`./node_modules/${m}`)
  try {
    const pkg = require(`${installDir}/package.json`)

    // if the file exists at root, it doesn't need to be specified in pkg
    let orphanIndex: boolean
    try {
      await fs.access(`${installDir}/index.d.ts`)
      orphanIndex = true
    } catch {
      orphanIndex = false
    }

    if (pkg.typings || pkg.types || orphanIndex) {
      return null
    } else {
      return m
    }
  } catch (e) {
    console.error('problem reading', m, ':', e)
    return null
  }
}
