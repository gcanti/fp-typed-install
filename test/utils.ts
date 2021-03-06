import * as assert from 'assert'
import { hasRemoteTypes, hasLocalTypes } from '../src/utils'
import { right } from 'fp-ts/lib/Either'

describe('utils', () => {
  describe('hasRemoteTypes', () => {
    it('success', () => {
      return hasRemoteTypes('react')().then(e => {
        assert.deepStrictEqual(e, right(true))
      })
    })

    it('failure)', function() {
      this.timeout(5000)
      return hasRemoteTypes('_')().then(e => {
        assert.deepStrictEqual(e, right(false))
      })
    })
  })

  describe('hasLocalTypes', () => {
    it('should return `false` if types are missing', () => {
      return hasLocalTypes('got')().then(e => {
        assert.deepStrictEqual(e, right(false))
      })
    })

    it('should return `true` if types are there', () => {
      return hasLocalTypes('fp-ts')().then(e => {
        assert.deepStrictEqual(e, right(true))
      })
    })
  })
})
