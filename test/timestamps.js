// @ts-check
import Realm from 'realm'
import test from 'tape'
import tmp from 'tmp'
import path from 'path'
import RealmIndexer, { BacklinkSchema, DocSchema } from '../index.js'

const { name: tmpDir, removeCallback } = tmp.dirSync({ unsafeCleanup: true })

/** @type {Realm.ObjectSchema} */
const TimestampedDocSchema = {
  ...DocSchema,
  properties: {
    ...DocSchema.properties,
    timestamp: 'int?',
  },
}

const realm = await Realm.open({
  inMemory: true,
  schema: [BacklinkSchema, TimestampedDocSchema],
  path: path.join(tmpDir, 'test.realm'),
})

test('If doc has timestamp, it is used to select winner', async (t) => {
  const docs = [
    { id: 'A', version: '1', links: [] },
    { id: 'A', version: '2', links: ['1'], timestamp: Date.now() },
    { id: 'A', version: '3', links: ['1'], timestamp: Date.now() - 1000 },
    { id: 'B', version: '1', links: [] },
    { id: 'B', version: '2', links: ['1'], timestamp: Date.now() - 1000 },
    { id: 'B', version: '3', links: ['1'], timestamp: Date.now() },
  ]

  const indexer = new RealmIndexer(realm, {
    docType: 'Doc',
    backlinkType: 'Backlink',
  })

  indexer.batch(docs)

  {
    const expected = {
      id: 'A',
      version: '2',
      links: ['1'],
      forks: ['3'],
    }

    const head = realm.objectForPrimaryKey('Doc', 'A')
    // eslint-disable-next-line no-unused-vars
    const { timestamp, ...doc } = head.toJSON()
    t.deepEqual(doc, expected)
  }

  {
    const expected = {
      id: 'B',
      version: '3',
      links: ['1'],
      forks: ['2'],
    }

    const head = realm.objectForPrimaryKey('Doc', 'B')
    // eslint-disable-next-line no-unused-vars
    const { timestamp, ...doc } = head.toJSON()
    t.deepEqual(doc, expected)
  }

  realm.write(() => {
    realm.deleteAll()
  })
})

test('If doc has no timestamp, version is used to select a deterministic winnder', async (t) => {
  const docs = [
    { id: 'A', version: '1', links: [] },
    { id: 'A', version: '2', links: ['1'] },
    { id: 'A', version: '3', links: ['1'] },
  ]

  const indexer = new RealmIndexer(realm, {
    docType: 'Doc',
    backlinkType: 'Backlink',
  })

  const expected = {
    id: 'A',
    version: '3',
    links: ['1'],
    forks: ['2'],
  }

  indexer.batch(docs)
  const head = realm.objectForPrimaryKey('Doc', 'A')
  // eslint-disable-next-line no-unused-vars
  const { timestamp, ...doc } = head.toJSON()
  t.deepEqual(doc, expected)
  realm.write(() => {
    realm.deleteAll()
  })
})

test('cleanup', (t) => {
  realm.close()
  removeCallback()
  t.end()
})
