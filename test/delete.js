// @ts-check
import test from 'tape'
import { create } from './utils.js'

test('deleting everything', (t) => {
  const { indexer, db, cleanup } = create()

  const docCount = db.prepare('SELECT COUNT(*) FROM docs').pluck()
  const backlinkCount = db.prepare('SELECT COUNT(*) FROM backlinks').pluck()

  const updatedAt = new Date().toISOString()
  indexer.batch([
    { docId: 'A', versionId: '1', links: [], updatedAt },
    { docId: 'A', versionId: '2', links: ['1'], updatedAt },
    { docId: 'B', versionId: '3', links: [], updatedAt },
  ])

  t.equal(docCount.get(), 2, 'Test setup expected 2 documents')
  t.equal(backlinkCount.get(), 1, 'Test setup expected 1 backlink')

  indexer.deleteAll()

  t.equal(docCount.get(), 0, 'Expected all documents to be deleted')
  t.equal(backlinkCount.get(), 0, 'Expected all backlinks to be deleted')

  cleanup()

  t.end()
})
