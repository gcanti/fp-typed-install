import { ModuleName, ModuleInfo, fetchInfo, install, getModuleName, isHasRemoteTypes, isNoTypes } from './utils'
import { create, start, succeed, fail } from './ora'
import { TaskEither, taskEither, right } from 'fp-ts/lib/TaskEither'
import { when } from 'fp-ts/lib/Applicative'
import { Task, fromIO, task } from 'fp-ts/lib/Task'
import { traverse } from 'fp-ts/lib/Array'
import { IO } from 'fp-ts/lib/IO'
import { log } from 'fp-ts/lib/Console'

//
// capabilities
//

export interface MonadLogger {
  readonly start: (message: string) => Task<void>
  readonly succeed: Task<void>
  readonly print: (message: string) => Task<void>
  readonly fail: (message: string) => Task<void>
}

export interface MonadPackage {
  readonly install: (names: Array<ModuleName>, dev: boolean, yarn: boolean) => TaskEither<string, void>
  readonly fetchInfo: (name: ModuleName) => TaskEither<string, ModuleInfo>
}

export interface MonadApp extends MonadLogger, MonadPackage {}

//
// program
//

const formatMessage = (intro: string, names: Array<ModuleName>) =>
  `${intro}:\n${names.map(p => `  * ${p}`).join('\n')}\n`

const showResults = (M: MonadLogger) => (remoteTypes: Array<ModuleName>, noTypes: Array<ModuleName>): Task<void> => {
  const printWhen = (condition: boolean, message: string) => when(task)(condition, M.print(message))
  const remote = printWhen(
    remoteTypes.length > 0,
    formatMessage('\nThe following packages were fully installed', remoteTypes)
  )
  const no = printWhen(
    noTypes.length > 0,
    formatMessage('\nThe following packages were installed, but lack types', noTypes)
  )
  return remote.chain(() => no)
}

const filterRemoteTypes = (infos: Array<ModuleInfo>): Array<ModuleName> =>
  infos.filter(isHasRemoteTypes).map(getModuleName)

const filterNoTypes = (infos: Array<ModuleInfo>): Array<ModuleName> => infos.filter(isNoTypes).map(getModuleName)

export const getProgram = (M: MonadApp) => (
  names: Array<ModuleName>,
  { dev, prod, yarn }: MainOpts,
  verbose: boolean
): Task<void> => {
  const withMessage = <A>(message: string, action: TaskEither<string, A>): TaskEither<string, A> =>
    verbose
      ? right<string, void>(M.start(message))
          .chain(() => action)
          .chain(a => right(M.succeed.map(() => a)))
      : action

  const installPackages: TaskEither<string, void> = withMessage('Installing Packages', M.install(names, dev, yarn))

  const fetchModuleInfos = (names: Array<ModuleName>): TaskEither<string, Array<ModuleInfo>> =>
    withMessage('Getting Modules Infos', traverse(taskEither)(names, M.fetchInfo))

  const installRemoteTypes = (names: Array<ModuleName>): TaskEither<string, void> =>
    when(taskEither)(
      names.length > 0,
      withMessage('Installing Available Types', M.install(names.map(t => `@types/${t}`), !prod, yarn))
    )

  const program: TaskEither<string, void> = when(taskEither)(
    names.length > 0,
    installPackages.chain(() =>
      fetchModuleInfos(names).chain(infos => {
        const remoteTypes = filterRemoteTypes(infos)
        return installRemoteTypes(remoteTypes).chain(() => right(showResults(M)(remoteTypes, filterNoTypes(infos))))
      })
    )
  )

  const catchError = (program: TaskEither<string, void>): Task<void> =>
    program.value.chain(e => e.fold(M.fail, () => task.of(undefined)))

  return catchError(program)
}

//
// instance
//

const fromKleisli = <A, B>(f: (a: A) => IO<B>): ((a: A) => Task<B>) => a => fromIO(f(a))

const getMonadLogger: IO<MonadLogger> = create.map(logger => {
  return {
    start: fromKleisli(start(logger)),
    succeed: fromIO(succeed(logger)),
    print: fromKleisli(log),
    fail: fromKleisli(fail(logger))
  }
})

const monadPackage: MonadPackage = {
  install,
  fetchInfo
}

const getMain = fromIO(
  getMonadLogger.map(monadLogger => {
    const instance = { ...monadLogger, ...monadPackage }
    return getProgram(instance)
  })
)

//
// main
//

export interface MainOpts {
  dev: boolean
  prod: boolean
  yarn: boolean
}

export const main = (names: Array<ModuleName>, options: MainOpts, verbose: boolean): Task<void> => {
  return getMain.chain(f => f(names, options, verbose))
}
