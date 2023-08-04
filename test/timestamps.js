// @ts-check
import test from 'tape'
import { create } from './utils.js'

test('If doc has updatedAt, it is used to select winner', async (t) => {
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

  const { indexer, getDoc, close } = create()

  indexer.batch(docs)

  {
    const expected = {
      docId: 'A',
      versionId: '2',
      links: ['1'],
      forks: ['3'],
    }

    const head = getDoc(expected.docId)
    // @ts-ignore
    // eslint-disable-next-line no-unused-vars
    const { updatedAt, ...doc } = head
    t.deepEqual(doc, expected)
  }

  {
    const expected = {
      docId: 'B',
      versionId: '3',
      links: ['1'],
      forks: ['2'],
    }

    const head = getDoc(expected.docId)
    // @ts-ignore
    // eslint-disable-next-line no-unused-vars
    const { updatedAt, ...doc } = head
    t.deepEqual(doc, expected)
  }

  close()
})

test('If updatedAt is equal, version is used to select a deterministic winner', async (t) => {
  const updatedAt = new Date().toISOString()
  const docs = [
    { docId: 'A', versionId: '1', links: [], updatedAt },
    { docId: 'A', versionId: '2', links: ['1'], updatedAt },
    { docId: 'A', versionId: '3', links: ['1'], updatedAt },
  ]

  const { indexer, getDoc, deleteAll, close } = create()

  const expected = {
    docId: 'A',
    versionId: '3',
    links: ['1'],
    forks: ['2'],
  }

  indexer.batch(docs)
  const head = getDoc(expected.docId)
  // @ts-ignore
  // eslint-disable-next-line no-unused-vars
  const { updatedAt: _, ...doc } = head
  t.deepEqual(doc, expected)

  deleteAll()
  close()
})
