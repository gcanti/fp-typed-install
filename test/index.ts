import * as assert from 'assert'
import { getProgram, MonadApp, MainOpts } from '../src/index'
import * as T from 'fp-ts/lib/Task'
import * as TE from 'fp-ts/lib/TaskEither'
import { ModuleName, ModuleInfo } from '../src/utils'
import { pipe } from 'fp-ts/lib/pipeable'

/*

  TESTING

  - heroku-config has no types at all
  - lodash has types in @types
  - commander has included types (package.json)

*/

const getProgramMock = (names: Array<ModuleName>, options: MainOpts, verbose: boolean): T.Task<Array<string>> => {
  const log: Array<string> = []
  const instance: MonadApp = {
    start: (message: string) =>
      T.fromIO(() => {
        log.push(`start: ${message}`)
      }),
    succeed: T.fromIO(() => {
      log.push(`succeed`)
    }),
    print: (message: string) =>
      T.fromIO(() => {
        log.push(`print: ${message}`)
      }),
    fail: (message: string) =>
      T.fromIO(() => {
        log.push(`fail: ${message}`)
      }),
    install: (names: Array<ModuleName>, dev: boolean, yarn: boolean) =>
      TE.rightTask(
        T.fromIO(() => {
          log.push(`install: [${names.join(', ')}] ${dev} ${yarn}`)
        })
      ),
    fetchInfo: (name: ModuleName) =>
      pipe(
        TE.rightTask(
          T.fromIO(() => {
            log.push(`fetchInfo: ${name}`)
          })
        ),
        TE.map(() => {
          switch (name) {
            case 'lodash':
              return new ModuleInfo(name, 'HasRemoteTypes')
            case 'commander':
              return new ModuleInfo(name, 'HasLocalTypes')
            default:
              return new ModuleInfo(name, 'NoTypes')
          }
        })
      )
  }
  return pipe(
    getProgram(instance)(names, options, verbose),
    T.map(() => log)
  )
}

describe('getProgram', () => {
  it('no args', () => {
    return getProgramMock([], { dev: true, prod: false, yarn: false }, true)().then(log => {
      assert.deepStrictEqual(log, [])
    })
  })

  it('has local types', () => {
    return getProgramMock(['commander'], { dev: true, prod: false, yarn: false }, true)().then(log => {
      assert.deepStrictEqual(log, [
        'start: Installing Packages',
        'install: [commander] true false',
        'succeed',
        'start: Getting Modules Infos',
        'fetchInfo: commander',
        'succeed'
      ])
    })
  })

  it('no types', () => {
    return getProgramMock(['heroku-config'], { dev: true, prod: false, yarn: false }, true)().then(log => {
      assert.deepStrictEqual(log, [
        'start: Installing Packages',
        'install: [heroku-config] true false',
        'succeed',
        'start: Getting Modules Infos',
        'fetchInfo: heroku-config',
        'succeed',
        'print: \nThe following packages were installed, but lack types:\n  * heroku-config\n'
      ])
    })
  })

  it('has remote types', () => {
    return getProgramMock(['lodash'], { dev: true, prod: false, yarn: false }, true)().then(log => {
      assert.deepStrictEqual(log, [
        'start: Installing Packages',
        'install: [lodash] true false',
        'succeed',
        'start: Getting Modules Infos',
        'fetchInfo: lodash',
        'succeed',
        'start: Installing Available Types',
        'install: [@types/lodash] true false',
        'succeed',
        'print: \nThe following packages were fully installed:\n  * lodash\n'
      ])
    })
  })

  it('has remote types (non verbose)', () => {
    return getProgramMock(['lodash'], { dev: true, prod: false, yarn: false }, false)().then(log => {
      assert.deepStrictEqual(log, [
        'install: [lodash] true false',
        'fetchInfo: lodash',
        'install: [@types/lodash] true false',
        'print: \nThe following packages were fully installed:\n  * lodash\n'
      ])
    })
  })

  // and so on...
})
