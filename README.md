Un porting di [typed-install](https://github.com/xavdid/typed-install) in stile funzionale.

Differenze rispetto all'originale:

* il file `util.ts` è stato rinominato in `unsafe-utils.ts`
  * la procedura `printPackages` è stata rimossa
* il file `ora.d.ts` è stato sostituito con `ora.ts` contenente API pure
* il file `index.ts` è stato completamente riscritto
* il file `cli.ts` ha subito modifiche di poco conto
* i test sono stati completamente riscritti (non c'è mock del file system)
