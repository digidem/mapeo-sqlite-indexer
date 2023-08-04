// @ts-check
import { execSync } from 'child_process'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import { SqliteIndexer } from '../src/index.js'

import Database from 'better-sqlite3'
import { backlinkTable, docTable } from './schema.js'

const sqlite = new Database('test.db')
const db = drizzle(sqlite)

export function dbPush() {
  deleteAll()
  execSync('npm run db:push')
}

export function deleteAll() {
  db.delete(docTable).run()
  db.delete(backlinkTable).run()
}

export function getDoc(docId) {
  return db.select().from(docTable).where(eq(docTable.docId, docId)).get()
}

export function create() {
  const indexer = new SqliteIndexer(sqlite, {
    docTable,
    backlinkTable,
  })
  return indexer
}

export function teardown() {
  sqlite.close()
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
