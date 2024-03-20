// @ts-check
import test from 'node:test'
import assert from 'node:assert/strict'
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
    },
    {
      docId: 'B',
      versionId: '1',
      links: [],
      updatedAt,
      boolean: false,
      array: ['foo'],
      object: { foo: 'bar' },
    },
    { docId: 'C', versionId: '1', links: [], updatedAt, array: [], object: {} },
  ]

  const extraColumns = `
boolean INTEGER NOT NULL DEFAULT 0,
array TEXT NOT NULL,
object TEXT NOT NULL`

  const { indexer, db, cleanup } = create({ extraColumns })
  t.after(cleanup)

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
    },
  ]

  assert.deepEqual(db.prepare('SELECT * FROM docs').all(), expected)
})
