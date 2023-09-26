// @ts-check
import test from 'tape'
import { create, permute } from './utils.js'

const docs = [
  { docId: 'A', versionId: '1', links: [], updatedAt: '', deleted: false },
  { docId: 'A', versionId: '2', links: ['1'], updatedAt: '', deleted: false },
  { docId: 'A', versionId: '3', links: ['1'], updatedAt: '', deleted: false },
  {
    docId: 'A',
    versionId: '4',
    links: ['2', '3'],
    updatedAt: '',
    deleted: false,
  },
  { docId: 'A', versionId: '5', links: ['4'], updatedAt: '', deleted: false },
  { docId: 'A', versionId: '6', links: ['4'], updatedAt: '', deleted: false },
  { docId: 'A', versionId: '7', links: ['4'], updatedAt: '', deleted: true },
  {
    docId: 'A',
    versionId: '8',
    links: ['5', '6'],
    updatedAt: '',
    deleted: true,
  },
]

const scenarios = [
  {
    docs: docs.slice(0, 2),
    expected: {
      docId: 'A',
      versionId: '2',
      links: ['1'],
      forks: [],
      updatedAt: '',
      deleted: 0,
    },
  },
  {
    docs: docs.slice(0, 3),
    expected: {
      docId: 'A',
      versionId: '3',
      links: ['1'],
      forks: ['2'],
      updatedAt: '',
      deleted: 0,
    },
  },
  {
    docs: docs.slice(0, 4),
    expected: {
      docId: 'A',
      versionId: '4',
      links: ['2', '3'],
      forks: [],
      updatedAt: '',
      deleted: 0,
    },
  },
  {
    docs: docs.slice(0, 5),
    expected: {
      docId: 'A',
      versionId: '5',
      links: ['4'],
      forks: [],
      updatedAt: '',
      deleted: 0,
    },
  },
  {
    docs: docs.slice(0, 6),
    expected: {
      docId: 'A',
      versionId: '6',
      links: ['4'],
      forks: ['5'],
      updatedAt: '',
      deleted: 0,
    },
  },
  {
    docs: docs.slice(0, 7),
    expected: {
      docId: 'A',
      versionId: '7',
      links: ['4'],
      forks: ['5', '6'],
      updatedAt: '',
      deleted: 1,
    },
  },
  {
    docs: docs.slice(0, 8),
    expected: {
      docId: 'A',
      versionId: '8',
      links: ['5', '6'],
      forks: ['7'],
      updatedAt: '',
      deleted: 1,
    },
  },
]

test('Expected head for all permutations of order', async (t) => {
  const { indexer, api, cleanup, clear } = create()

  for (const scenario of scenarios) {
    const { docs, expected } = scenario

    // for (const permutation of [[docs[0], docs[3], docs[1], docs[2]]]) {
    for (const permutation of permute(docs)) {
      indexer.batch(permutation)
      const head = api.getDoc(expected.docId)
      t.deepEqual(
        { ...head, forks: head?.forks.sort() },
        expected,
        JSON.stringify(permutation.map((doc) => doc.versionId))
      )
      clear()
    }
  }
  cleanup()
})
