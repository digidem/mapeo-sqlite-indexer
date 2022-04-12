// @ts-check
import test from 'tape'
import { create } from './utils.js'

test('If doc has timestamp, it is used to select winner', async (t) => {
  const docs = [
    { id: 'A', version: '1', links: [] },
    { id: 'A', version: '2', links: ['1'], timestamp: Date.now() },
    { id: 'A', version: '3', links: ['1'], timestamp: Date.now() - 1000 },
    { id: 'B', version: '1', links: [] },
    { id: 'B', version: '2', links: ['1'], timestamp: Date.now() - 1000 },
    { id: 'B', version: '3', links: ['1'], timestamp: Date.now() },
  ]

  const { indexer, api, cleanup } = create({ extraColumns: 'timestamp NUMBER' })

  indexer.batch(docs)

  {
    const expected = {
      id: 'A',
      version: '2',
      links: ['1'],
      forks: ['3'],
    }

    const head = api.getDoc(expected.id)
    // @ts-ignore
    // eslint-disable-next-line no-unused-vars
    const { timestamp, ...doc } = head
    t.deepEqual(doc, expected)
  }

  {
    const expected = {
      id: 'B',
      version: '3',
      links: ['1'],
      forks: ['2'],
    }

    const head = api.getDoc(expected.id)
    // @ts-ignore
    // eslint-disable-next-line no-unused-vars
    const { timestamp, ...doc } = head
    t.deepEqual(doc, expected)
  }

  cleanup()
})

test('If doc has no timestamp, version is used to select a deterministic winner', async (t) => {
  const docs = [
    { id: 'A', version: '1', links: [] },
    { id: 'A', version: '2', links: ['1'] },
    { id: 'A', version: '3', links: ['1'] },
  ]

  const { indexer, api, cleanup } = create()

  const expected = {
    id: 'A',
    version: '3',
    links: ['1'],
    forks: ['2'],
  }

  indexer.batch(docs)
  const head = api.getDoc(expected.id)
  // @ts-ignore
  // eslint-disable-next-line no-unused-vars
  const { timestamp, ...doc } = head
  t.deepEqual(doc, expected)

  cleanup()
})
