import { ModuleName, ModuleInfo, fetchInfo, install, getModuleName, isHasRemoteTypes, isNoTypes } from './utils'
import { create, start, succeed, fail } from './ora'
import * as TE from 'fp-ts/lib/TaskEither'
import * as T from 'fp-ts/lib/Task'
import * as E from 'fp-ts/lib/Either'
import { array } from 'fp-ts/lib/Array'
import * as I from 'fp-ts/lib/IO'
import { log } from 'fp-ts/lib/Console'
import { pipe } from 'fp-ts/lib/pipeable'

//
// capabilities
//

export interface MonadLogger {
  readonly start: (message: string) => T.Task<void>
  readonly succeed: T.Task<void>
  readonly print: (message: string) => T.Task<void>
  readonly fail: (message: string) => T.Task<void>
}

export interface MonadPackage {
  readonly install: (names: Array<ModuleName>, dev: boolean, yarn: boolean) => TE.TaskEither<string, void>
  readonly fetchInfo: (name: ModuleName) => TE.TaskEither<string, ModuleInfo>
}

export interface MonadApp extends MonadLogger, MonadPackage {}

//
// program
//

const formatMessage = (intro: string, names: Array<ModuleName>) =>
  `${intro}:\n${names.map(p => `  * ${p}`).join('\n')}\n`

const showResults = (M: MonadLogger) => (remoteTypes: Array<ModuleName>, noTypes: Array<ModuleName>): T.Task<void> => {
  const printWhen = (condition: boolean, message: string) => (condition ? M.print(message) : T.task.of(undefined))
  const remote = printWhen(
    remoteTypes.length > 0,
    formatMessage('\nThe following packages were fully installed', remoteTypes)
  )
  const no = printWhen(
    noTypes.length > 0,
    formatMessage('\nThe following packages were installed, but lack types', noTypes)
  )
  return pipe(
    remote,
    T.chain(() => no)
  )
}

const filterRemoteTypes = (infos: Array<ModuleInfo>): Array<ModuleName> =>
  infos.filter(isHasRemoteTypes).map(getModuleName)

const filterNoTypes = (infos: Array<ModuleInfo>): Array<ModuleName> => infos.filter(isNoTypes).map(getModuleName)

export const getProgram = (M: MonadApp) => (
  names: Array<ModuleName>,
  { dev, prod, yarn }: MainOpts,
  verbose: boolean
): T.Task<void> => {
  const withMessage = <A>(message: string, action: TE.TaskEither<string, A>): TE.TaskEither<string, A> =>
    verbose
      ? pipe(
          TE.rightTask(M.start(message)),
          TE.chain(() => action),
          TE.chain(a =>
            TE.rightTask(
              pipe(
                M.succeed,
                T.map(() => a)
              )
            )
          )
        )
      : action

  const installPackages: TE.TaskEither<string, void> = withMessage('Installing Packages', M.install(names, dev, yarn))

  const fetchModuleInfos = (names: Array<ModuleName>): TE.TaskEither<string, Array<ModuleInfo>> =>
    withMessage('Getting Modules Infos', array.traverse(TE.taskEither)(names, M.fetchInfo))

  const installRemoteTypes = (names: Array<ModuleName>): TE.TaskEither<string, void> =>
    names.length > 0
      ? withMessage('Installing Available Types', M.install(names.map(t => `@types/${t}`), !prod, yarn))
      : TE.right(undefined)

  const program: TE.TaskEither<string, void> =
    names.length > 0
      ? pipe(
          installPackages,
          TE.chain(() => fetchModuleInfos(names)),
          TE.chain(infos => {
            const remoteTypes = filterRemoteTypes(infos)
            return pipe(
              installRemoteTypes(remoteTypes),
              TE.chain(() => TE.rightTask(showResults(M)(remoteTypes, filterNoTypes(infos))))
            )
          })
        )
      : TE.right(undefined)

  const catchError = (program: TE.TaskEither<string, void>): T.Task<void> =>
    pipe(
      program,
      T.chain(e =>
        pipe(
          e,
          E.fold(M.fail, () => T.task.of(undefined))
        )
      )
    )

  return catchError(program)
}

//
// instance
//

const fromKleisli = <A, B>(f: (a: A) => I.IO<B>): ((a: A) => T.Task<B>) => a => T.fromIO(f(a))

const getMonadLogger: I.IO<MonadLogger> = pipe(
  create,
  I.map(logger => {
    return {
      start: fromKleisli(start(logger)),
      succeed: T.fromIO(succeed(logger)),
      print: fromKleisli(log),
      fail: fromKleisli(fail(logger))
    }
  })
)

const monadPackage: MonadPackage = {
  install,
  fetchInfo
}

const getMain = T.fromIO(
  pipe(
    getMonadLogger,
    I.map(monadLogger => {
      const instance = { ...monadLogger, ...monadPackage }
      return getProgram(instance)
    })
  )
)

//
// main
//

export interface MainOpts {
  dev: boolean
  prod: boolean
  yarn: boolean
}

export const main = (names: Array<ModuleName>, options: MainOpts, verbose: boolean): T.Task<void> => {
  return pipe(
    getMain,
    T.chain(f => f(names, options, verbose))
  )
}
