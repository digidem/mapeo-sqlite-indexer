// @ts-check
import test from 'tape'
import { create } from './utils.js'

test('booleans, arrays and objects are transformed', async (t) => {
  const updatedAt = new Date(1999, 0, 1).toISOString()
  const docs = [
    {
      docId: 'A',
      versionId: '1',
      links: [],
      updatedAt,
      boolean: true,
      array: [],
      object: {},
      deleted: false,
    },
    {
      docId: 'B',
      versionId: '1',
      links: [],
      updatedAt,
      boolean: false,
      array: ['foo'],
      object: { foo: 'bar' },
      deleted: false,
    },
    {
      docId: 'C',
      versionId: '1',
      links: [],
      updatedAt,
      array: [],
      object: {},
      deleted: false,
    },
  ]

  const extraColumns = `
boolean INTEGER NOT NULL DEFAULT 0,
array TEXT NOT NULL,
object TEXT NOT NULL`

  const { indexer, db, cleanup } = create({ extraColumns })

  indexer.batch(docs)

  const expected = [
    {
      docId: 'A',
      versionId: '1',
      links: '[]',
      forks: '[]',
      updatedAt,
      boolean: 1,
      array: '[]',
      object: '{}',
      deleted: 0,
    },
    {
      docId: 'B',
      versionId: '1',
      links: '[]',
      forks: '[]',
      updatedAt,
      boolean: 0,
      array: '["foo"]',
      object: '{"foo":"bar"}',
      deleted: 0,
    },
    {
      docId: 'C',
      versionId: '1',
      links: '[]',
      forks: '[]',
      updatedAt,
      boolean: 0,
      array: '[]',
      object: '{}',
      deleted: 0,
    },
  ]

  t.deepEqual(db.prepare('SELECT * FROM docs').all(), expected)

  cleanup()
})
