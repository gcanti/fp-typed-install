A functionally-flavored porting of [typed-install](https://github.com/xavdid/typed-install).

Differences from the original:

* `util.ts` renamed to `unsafe-utils.ts`
  * `printPackages` removed
* `ora.d.ts` replaced with `ora.ts`
* `index.ts` completely rewritten
* `cli.ts` is slightly changed
* tests completely rewritten without mocking the file system
