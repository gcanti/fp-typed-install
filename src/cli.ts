import program = require('commander')
import { MainOpts, main } from './index'
const pj = require('../package.json')

program
  .version(pj.version)
  .usage('[options] <modules ...>')
  .option('-d, --dev', 'save everything into the dev dependencies')
  .option('-p, --prod', 'save the @types into `dependencies`')
  .option('-y, --yarn', 'install using yarn instead of npm')
  .parse(process.argv)

const options: MainOpts = {
  dev: Boolean(program.dev),
  prod: Boolean(program.dev),
  yarn: Boolean(program.yarn)
}

// tslint:disable-next-line
main(program.args, options, true).run()
