import { TaskEither, tryCatch, taskEither } from 'fp-ts/lib/TaskEither'
import * as utils from './unsafe-utils'

export type ModuleType = 'HasLocalTypes' | 'HasRemoteTypes' | 'NoTypes'

export type ModuleName = string

export class ModuleInfo {
  constructor(readonly name: ModuleName, readonly type: ModuleType) {}
}

export const isHasRemoteTypes = (info: ModuleInfo): boolean => info.type === 'HasRemoteTypes'

export const isNoTypes = (info: ModuleInfo): boolean => info.type === 'NoTypes'

export const getModuleName = (info: ModuleInfo): ModuleName => info.name

/** installs the given modules via `npm` */
export const install = (names: Array<ModuleName>, dev: boolean, yarn: boolean): TaskEither<string, void> => {
  return tryCatch(
    () => utils.npmInstall(names, dev, yarn),
    () => `Error while installing module/s ${names.join(', ')}`
  ).map(() => undefined)
}

/** returns `true` if `@types/${name}` exists */
export const hasRemoteTypes = (name: ModuleName): TaskEither<string, boolean> => {
  return tryCatch(() => utils.getTypingInfo(name), () => `Error while checking remote module @types/${name}`).map(
    s => s !== null
  )
}

/** returns `true` if the module has local types */
export const hasLocalTypes = (name: ModuleName): TaskEither<string, boolean> => {
  return tryCatch(() => utils.missingTypes(name), () => `Error while checking local module ${name}`).map(
    s => s === null
  )
}

export const fetchInfo = (name: ModuleName): TaskEither<string, ModuleInfo> =>
  hasLocalTypes(name).chain(hasLocal => {
    if (hasLocal) {
      return taskEither.of(new ModuleInfo(name, 'HasLocalTypes'))
    } else {
      return hasRemoteTypes(name).map(
        hasRemote => (hasRemote ? new ModuleInfo(name, 'HasRemoteTypes') : new ModuleInfo(name, 'NoTypes'))
      )
    }
  })
