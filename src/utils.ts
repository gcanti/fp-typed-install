import * as TE from 'fp-ts/lib/TaskEither'
import * as utils from './unsafe-utils'
import { pipe } from 'fp-ts/lib/pipeable'

export type ModuleType = 'HasLocalTypes' | 'HasRemoteTypes' | 'NoTypes'

export type ModuleName = string

export class ModuleInfo {
  constructor(readonly name: ModuleName, readonly type: ModuleType) {}
}

export const isHasRemoteTypes = (info: ModuleInfo): boolean => info.type === 'HasRemoteTypes'

export const isNoTypes = (info: ModuleInfo): boolean => info.type === 'NoTypes'

export const getModuleName = (info: ModuleInfo): ModuleName => info.name

/** installs the given modules via `npm` */
export const install = (names: Array<ModuleName>, dev: boolean, yarn: boolean): TE.TaskEither<string, void> => {
  return pipe(
    TE.tryCatch(() => utils.npmInstall(names, dev, yarn), () => `Error while installing module/s ${names.join(', ')}`),
    TE.map(() => undefined)
  )
}

/** returns `true` if `@types/${name}` exists */
export const hasRemoteTypes = (name: ModuleName): TE.TaskEither<string, boolean> => {
  return pipe(
    TE.tryCatch(() => utils.getTypingInfo(name), () => `Error while checking remote module @types/${name}`),
    TE.map(s => s !== null)
  )
}

/** returns `true` if the module has local types */
export const hasLocalTypes = (name: ModuleName): TE.TaskEither<string, boolean> => {
  return pipe(
    TE.tryCatch(() => utils.missingTypes(name), () => `Error while checking local module ${name}`),
    TE.map(s => s === null)
  )
}

export const fetchInfo = (name: ModuleName): TE.TaskEither<string, ModuleInfo> =>
  pipe(
    hasLocalTypes(name),
    TE.chain(hasLocal => {
      if (hasLocal) {
        return TE.right(new ModuleInfo(name, 'HasLocalTypes'))
      } else {
        return pipe(
          hasRemoteTypes(name),
          TE.map(hasRemote => (hasRemote ? new ModuleInfo(name, 'HasRemoteTypes') : new ModuleInfo(name, 'NoTypes')))
        )
      }
    })
  )
