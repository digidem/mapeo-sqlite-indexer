// @ts-check
import test from 'tape'
import { create } from './utils.js'

const docs = [
  {
    docId: 'A',
    seq: 1,
    versionId: '1',
    links: [],
    updatedAt: '',
    deleted: false,
  },
  {
    docId: 'A',
    seq: 2,
    versionId: '2',
    links: ['1'],
    updatedAt: '',
    deleted: false,
  },
  {
    docId: 'A',
    seq: 3,
    versionId: '3',
    links: ['1'],
    updatedAt: '',
    deleted: false,
  },
  {
    docId: 'A',
    seq: 4,
    versionId: '4',
    links: ['2', '3'],
    updatedAt: '',
    deleted: false,
  },
  {
    docId: 'A',
    seq: 5,
    versionId: '5',
    links: ['4'],
    updatedAt: '',
    deleted: false,
  },
  {
    docId: 'A',
    seq: 6,
    versionId: '6',
    links: ['4'],
    updatedAt: '',
    deleted: false,
  },
  {
    docId: 'A',
    seq: 7,
    versionId: '7',
    links: ['4'],
    updatedAt: '',
    deleted: false,
  },
  {
    docId: 'A',
    seq: 8,
    versionId: '8',
    links: ['5', '6'],
    updatedAt: '',
    deleted: false,
  },
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
    indexer.onceWriteDoc(doc.versionId, onWriteDoc)
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
