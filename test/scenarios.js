// @ts-check
import test from 'tape'
import { create, permute } from './utils.js'

const docs = [
  { id: 'A', version: '1', links: [] },
  { id: 'A', version: '2', links: ['1'] },
  { id: 'A', version: '3', links: ['1'] },
  { id: 'A', version: '4', links: ['2', '3'] },
  { id: 'A', version: '5', links: ['4'] },
  { id: 'A', version: '6', links: ['4'] },
  { id: 'A', version: '7', links: ['4'] },
  { id: 'A', version: '8', links: ['5', '6'] },
]

const scenarios = [
  {
    docs: docs.slice(0, 2),
    expected: { id: 'A', version: '2', links: ['1'], forks: [] },
  },
  {
    docs: docs.slice(0, 3),
    expected: { id: 'A', version: '3', links: ['1'], forks: ['2'] },
  },
  {
    docs: docs.slice(0, 4),
    expected: { id: 'A', version: '4', links: ['2', '3'], forks: [] },
  },
  {
    docs: docs.slice(0, 5),
    expected: { id: 'A', version: '5', links: ['4'], forks: [] },
  },
  {
    docs: docs.slice(0, 6),
    expected: { id: 'A', version: '6', links: ['4'], forks: ['5'] },
  },
  {
    docs: docs.slice(0, 7),
    expected: { id: 'A', version: '7', links: ['4'], forks: ['5', '6'] },
  },
  {
    docs: docs.slice(0, 8),
    expected: { id: 'A', version: '8', links: ['5', '6'], forks: ['7'] },
  },
]

test('Expected head for all permutations of order', async (t) => {
  const { indexer, api, cleanup, clear } = create()

  for (const scenario of scenarios) {
    const { docs, expected } = scenario

    // for (const permutation of [[docs[0], docs[3], docs[1], docs[2]]]) {
    for (const permutation of permute(docs)) {
      indexer.batch(permutation)
      const head = api.getDoc(expected.id)
      t.deepEqual(
        { ...head, forks: head?.forks.sort() },
        expected,
        JSON.stringify(permutation.map((doc) => doc.version))
      )
      clear()
    }
  }
  cleanup()
})
