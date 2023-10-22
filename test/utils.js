import Database from 'better-sqlite3'
import tmp from 'tmp'
import path from 'path'
import SqliteIndexer, { DbApi } from '../index.js'

export function create({ extraColumns = '' } = {}) {
  const { name: tmpDir, removeCallback } = tmp.dirSync({ unsafeCleanup: true })

  const db = new Database(path.join(tmpDir, 'db.sqlite'))

  db.pragma('journal_mode = WAL')

  db.prepare(
    `CREATE TABLE IF NOT EXISTS docs
    (
      docId TEXT PRIMARY KEY NOT NULL,
      versionId TEXT NOT NULL,
      links TEXT NOT NULL,
      forks TEXT NOT NULL,
      updatedAt TEXT NOT NULL
      ${extraColumns ? ', ' + extraColumns : ''}
    )
    WITHOUT ROWID`
  ).run()

  db.prepare(
    `CREATE TABLE IF NOT EXISTS backlinks
    (versionId TEXT PRIMARY KEY NOT NULL)
    WITHOUT ROWID`
  ).run()

  const indexer = new SqliteIndexer(db, {
    docTableName: 'docs',
    backlinkTableName: 'backlinks',
  })
  const api = new DbApi(db, {
    docTableName: 'docs',
    backlinkTableName: 'backlinks',
  })
  function cleanup() {
    db.close()
    removeCallback()
  }
  function clear() {
    db.prepare(`DELETE FROM docs`).run()
    db.prepare(`DELETE FROM backlinks`).run()
  }
  return { indexer, api, cleanup, clear, db }
}

/**
 * Returns an iterator of all permutations of the given array.
 * From https://stackoverflow.com/a/37580979/3071863
 * @template T
 * @param {Array<T>} arr
 * @returns {IterableIterator<Array<T>>}
 */
export function* permute(arr) {
  var length = arr.length,
    c = Array(length).fill(0),
    i = 1,
    k,
    p

  yield arr.slice()
  while (i < length) {
    if (c[i] < i) {
      k = i % 2 && c[i]
      p = arr[i]
      arr[i] = arr[k]
      arr[k] = p
      ++c[i]
      i = 1
      yield arr.slice()
    } else {
      c[i] = 0
      ++i
    }
  }
}
