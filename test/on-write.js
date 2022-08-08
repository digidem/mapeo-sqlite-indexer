// @ts-check
import test from 'tape'
import { create } from './utils.js'

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

test('onWriteDoc called for each doc', async (t) => {
  t.plan(8)
  function onWriteDoc(doc) {
    t.ok(doc)
  }

  const { indexer, cleanup, clear } = create({ onWriteDoc })
  indexer.batch(docs)
  clear()
  cleanup()
})
