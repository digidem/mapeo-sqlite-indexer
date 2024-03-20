// @ts-check
import test from 'node:test'
import assert from 'node:assert/strict'
import { create } from './utils.js'

test('If doc has timestamp, it is used to select winner', async (t) => {
  const updated1 = new Date(1999, 0, 1).toISOString()
  const updated2 = new Date(1999, 0, 2).toISOString()
  const updated3 = new Date(1999, 0, 3).toISOString()
  const docs = [
    { docId: 'A', versionId: '1', links: [], updatedAt: updated3 },
    { docId: 'A', versionId: '2', links: ['1'], updatedAt: updated2 },
    { docId: 'A', versionId: '3', links: ['1'], updatedAt: updated1 },
    { docId: 'B', versionId: '1', links: [], updatedAt: updated3 },
    { docId: 'B', versionId: '2', links: ['1'], updatedAt: updated1 },
    { docId: 'B', versionId: '3', links: ['1'], updatedAt: updated2 },
  ]

  const { indexer, api, cleanup } = create({ extraColumns: 'timestamp NUMBER' })
  t.after(cleanup)

  indexer.batch(docs)

  {
    const expected = {
      docId: 'A',
      versionId: '2',
      links: ['1'],
      forks: ['3'],
    }

    const head = api.getDoc(expected.docId)
    // @ts-ignore
    // eslint-disable-next-line no-unused-vars
    const { updatedAt, ...doc } = head
    assert.deepEqual(doc, expected)
  }

  {
    const expected = {
      docId: 'B',
      versionId: '3',
      links: ['1'],
      forks: ['2'],
    }

    const head = api.getDoc(expected.docId)
    // @ts-ignore
    // eslint-disable-next-line no-unused-vars
    const { updatedAt, ...doc } = head
    assert.deepEqual(doc, expected)
  }
})

test('If doc has no timestamp, version is used to select a deterministic winner', async (t) => {
  const updatedAt = new Date().toISOString()
  const docs = [
    { docId: 'A', versionId: '1', links: [], updatedAt },
    { docId: 'A', versionId: '2', links: ['1'], updatedAt },
    { docId: 'A', versionId: '3', links: ['1'], updatedAt },
  ]

  const { indexer, api, cleanup } = create()
  t.after(cleanup)

  const expected = {
    docId: 'A',
    versionId: '3',
    links: ['1'],
    forks: ['2'],
  }

  indexer.batch(docs)
  const head = api.getDoc(expected.docId)
  // @ts-ignore
  // eslint-disable-next-line no-unused-vars
  const { updatedAt: _, ...doc } = head
  assert.deepEqual(doc, expected)
})
