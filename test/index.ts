import * as assert from 'assert'
import { getProgram, MonadApp, MainOpts } from '../src/index'
import { Task, fromIO } from 'fp-ts/lib/Task'
import { right } from 'fp-ts/lib/TaskEither'
import { ModuleName, ModuleInfo } from '../src/utils'
import { IO } from 'fp-ts/lib/IO'

/*

  TESTING

  - heroku-config has no types at all
  - lodash has types in @types
  - commander has included types (package.json)

*/

const getMockProgram = (names: Array<ModuleName>, options: MainOpts, verbose: boolean): Task<Array<string>> => {
  const log: Array<string> = []
  const instance: MonadApp = {
    start: (message: string) =>
      fromIO(
        new IO(() => {
          log.push(`start: ${message}`)
        })
      ),
    succeed: fromIO(
      new IO(() => {
        log.push(`succeed`)
      })
    ),
    print: (message: string) =>
      fromIO(
        new IO(() => {
          log.push(`print: ${message}`)
        })
      ),
    fail: (message: string) =>
      fromIO(
        new IO(() => {
          log.push(`fail: ${message}`)
        })
      ),
    install: (names: Array<ModuleName>, dev: boolean, yarn: boolean) =>
      right(
        fromIO(
          new IO(() => {
            log.push(`install: [${names.join(', ')}] ${dev} ${yarn}`)
          })
        )
      ),
    fetchInfo: (name: ModuleName) =>
      right<string, void>(
        fromIO(
          new IO(() => {
            log.push(`fetchInfo: ${name}`)
          })
        )
      ).map(() => {
        switch (name) {
          case 'lodash':
            return new ModuleInfo(name, 'HasRemoteTypes')
          case 'commander':
            return new ModuleInfo(name, 'HasLocalTypes')
          default:
            return new ModuleInfo(name, 'NoTypes')
        }
      })
  }
  return getProgram(instance)(names, options, verbose).map(() => log)
}

describe('getProgram', () => {
  it('no args', () => {
    return getMockProgram([], { dev: true, prod: false, yarn: false }, true)
      .run()
      .then(log => {
        assert.deepEqual(log, [])
      })
  })

  it('has local types', () => {
    return getMockProgram(['commander'], { dev: true, prod: false, yarn: false }, true)
      .run()
      .then(log => {
        assert.deepEqual(log, [
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
    return getMockProgram(['heroku-config'], { dev: true, prod: false, yarn: false }, true)
      .run()
      .then(log => {
        assert.deepEqual(log, [
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
    return getMockProgram(['lodash'], { dev: true, prod: false, yarn: false }, true)
      .run()
      .then(log => {
        assert.deepEqual(log, [
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
    return getMockProgram(['lodash'], { dev: true, prod: false, yarn: false }, false)
      .run()
      .then(log => {
        assert.deepEqual(log, [
          'install: [lodash] true false',
          'fetchInfo: lodash',
          'install: [@types/lodash] true false',
          'print: \nThe following packages were fully installed:\n  * lodash\n'
        ])
      })
  })

  // and so on...
})
