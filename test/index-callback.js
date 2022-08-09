// @ts-check
import test from 'tape'
import { create } from './utils.js'

const docs = [
  { id: 'A', seq: 1, version: '1', links: [] },
  { id: 'A', seq: 2, version: '2', links: ['1'] },
  { id: 'A', seq: 3, version: '3', links: ['1'] },
  { id: 'A', seq: 4, version: '4', links: ['2', '3'] },
  { id: 'A', seq: 5, version: '5', links: ['4'] },
  { id: 'A', seq: 6, version: '6', links: ['4'] },
  { id: 'A', seq: 7, version: '7', links: ['4'] },
  { id: 'A', seq: 8, version: '8', links: ['5', '6'] },
]

test('onceWriteDoc called for each doc', async (t) => {
  t.plan(8)
  /**
   * @param {import('../index.js').IndexedDocument} doc
   */
  function onWriteDoc(doc) {
    t.ok(doc)
  }

  const { indexer, cleanup, clear } = create()
  for (const doc of docs) {
    indexer.onceWriteDoc(doc.version, onWriteDoc)
  }
  indexer.batch(docs)
  clear()
  cleanup()
})

test('multiple listeners on the same version', async (t) => {
  t.plan(3)

  const { indexer, cleanup, clear } = create()

  indexer.onceWriteDoc('1', function (doc) {
    t.ok(doc)
  })

  indexer.onceWriteDoc('1', function (doc) {
    t.ok(doc)
  })

  indexer.onceWriteDoc('1', function (doc) {
    t.ok(doc)
  })

  indexer.batch(docs)
  clear()
  cleanup()
})

test('same listener used multiple times only called once', async (t) => {
  t.plan(1)

  const { indexer, cleanup, clear } = create()

  /**
   * @param {import('../index.js').IndexedDocument} doc
   */
  function onWriteDoc(doc) {
    t.ok(doc)
  }

  indexer.onceWriteDoc('1', onWriteDoc)
  indexer.onceWriteDoc('1', onWriteDoc)
  indexer.onceWriteDoc('1', onWriteDoc)

  indexer.batch(docs)
  clear()
  cleanup()
})
