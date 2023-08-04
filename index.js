// @ts-check
import assert from 'assert'

/**
 * @typedef {object} IndexableDocument
 * @property {string} docId
 * @property {string} versionId
 * @property {string[]} links
 * @property {string} updatedAt
 */

/** @typedef {{ type: string, pk: 1 | 0, cid: number, notnull: 1 | 0, dflt_value: any, name: string }} ColumnInfo */
/** @typedef {Record<string, Partial<Omit<ColumnInfo, 'name'>>>} ColumnSchema */
/**
 * @template {IndexableDocument} [TDoc=IndexableDocument]
 * @typedef {TDoc & { forks: string[] }} IndexedDocument
 */
/** @typedef {{ version: string }} Backlink */
/**
 * @template {IndexableDocument} TDoc
 * @typedef {(doc: IndexedDocument<TDoc>) => void} IndexCallback
 */

/** @type {ColumnSchema} */
const docSchema = {
  docId: { type: 'TEXT', pk: 1, notnull: 1 },
  versionId: { type: 'TEXT', notnull: 1, pk: 0 },
  links: { type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
  forks: { type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
  updatedAt: { type: 'TEXT', notnull: 1, pk: 0 },
}

/** @type {ColumnSchema} */
const backlinkSchema = {
  versionId: { type: 'TEXT', pk: 1, notnull: 1 },
}

/**
 * @template {IndexableDocument} TDoc
 */
export class DbApi {
  #getDocSql
  #writeDocSql
  #getBacklinkSql
  #writeBacklinkSql
  #updateForksSql
  #docDefaults
  #tableInfo

  /** @type {Map<string, Set<IndexCallback<TDoc>>>} */
  #listeners = new Map()

  /**
   * @param {import('better-sqlite3').Database} db
   * @param {object} options
   * @param {string} options.docTableName - Name of the Sqlite table that stores the indexed documents
   * @param {string} options.backlinkTableName - Name of the Sqlite table that stores the backlinks
   */
  constructor(db, { docTableName, backlinkTableName }) {
    assertValidSchema(db, { docTableName, backlinkTableName })
    const tableInfo = (this.#tableInfo = /** @type {ColumnInfo[]} */ (
      db.prepare(`PRAGMA table_info(${docTableName})`).all()
    ))
    this.#docDefaults = tableInfo.reduce(
      (acc, { name, dflt_value, notnull }) => {
        if (!notnull) acc[name] = dflt_value
        return acc
      },
      /** @type {Record<string, any>} */ ({})
    )
    const docColumns = tableInfo.map(({ name }) => name)
    this.#getDocSql = db.prepare(
      `SELECT docId, versionId, links, forks, updatedAt
      FROM ${docTableName}
      WHERE docId = ?`
    )
    this.#writeDocSql = db.prepare(
      `REPLACE INTO ${docTableName} (${docColumns.join(',')})
      VALUES (${docColumns.map((name) => `@${name}`).join(',')})`
    )
    this.#updateForksSql = db.prepare(
      `UPDATE ${docTableName} SET forks = @forks WHERE docId = @docId`
    )
    this.#getBacklinkSql = db.prepare(
      `SELECT versionId
      FROM ${backlinkTableName}
      WHERE versionId = ?`
    )
    this.#writeBacklinkSql = db.prepare(
      `INSERT OR IGNORE INTO ${backlinkTableName} (versionId)
      VALUES (?)`
    )
  }
  /**
   * @param {string} docId
   * @returns {IndexedDocument | undefined}
   */
  getDoc(docId) {
    const doc = /** @type {any} */ (this.#getDocSql.get(docId))
    if (!doc) return
    doc.links = JSON.parse(doc.links)
    doc.forks = JSON.parse(doc.forks)
    return doc
  }
  /**
   * @param {IndexedDocument<TDoc>} doc
   */
  writeDoc(doc) {
    const flattenedDoc = {
      ...this.#docDefaults,
      ...doc,
      links: JSON.stringify(doc.links),
      forks: JSON.stringify(doc.forks),
    }
    this.#writeDocSql.run(flattenedDoc)

    const { versionId } = doc
    if (this.#listeners.has(versionId)) {
      process.nextTick(() => {
        const set = this.#listeners.get(versionId)
        if (set) {
          for (const listener of set.values()) {
            listener(doc)
          }
          this.#listeners.delete(versionId)
        }
      })
    }
  }
  /**
   * @param {string} versionId
   * @param {IndexCallback<TDoc>} listener
   */
  onceWriteDoc(versionId, listener) {
    if (!this.#listeners.has(versionId)) {
      this.#listeners.set(versionId, new Set())
    }

    const set = this.#listeners.get(versionId)
    if (set && set.has(listener)) {
      return
    } else if (set) {
      set.add(listener)
      this.#listeners.set(versionId, set)
    }
  }
  /**
   * @param {string} docId
   * @param {IndexedDocument<IndexableDocument>["forks"]} forks
   */
  updateForks(docId, forks) {
    this.#updateForksSql.run({
      docId: docId,
      forks: JSON.stringify(forks),
    })
  }
  /**
   * @param {string} versionId
   */
  getBacklink(versionId) {
    return this.#getBacklinkSql.get(versionId)
  }
  /**
   * @param {string} versionId
   */
  writeBacklink(versionId) {
    this.#writeBacklinkSql.run(versionId)
  }
}

/**
 * @template {IndexableDocument} [TDoc=IndexableDocument]
 */
export default class SqliteIndexer {
  #getWinner
  #dbApi

  /**
   * @param {import('better-sqlite3').Database} db
   * @param {object} options
   * @param {string} options.docTableName - Name of the Sqlite table that stores the indexed documents
   * @param {string} options.backlinkTableName - Name of the Sqlite table that stores the backlinks
   * @param {typeof defaultGetWinner} [options.getWinner] - Function that will be used to determine the "winning" fork of a document
   */
  constructor(
    db,
    { docTableName, backlinkTableName, getWinner = defaultGetWinner }
  ) {
    this.#dbApi = /** @type {DbApi<TDoc>} */ (
      new DbApi(db, { docTableName, backlinkTableName })
    )
    this.#getWinner = getWinner
    /** @type {(docs: IndexableDocument[]) => void} */
    this.batch = db.transaction((docs) => this.#batch(docs))
  }

  /** @param {TDoc[]} docs */
  #batch(docs) {
    for (const doc of docs) {
      const existing = this.#dbApi.getDoc(doc.docId)
      // console.log('existing', existing)
      // console.log('doc', doc)
      let forksDirty = false

      for (const link of doc.links) {
        this.#dbApi.writeBacklink(link)
        if (existing && existing.forks.includes(link)) {
          forksDirty = true
          existing.forks = existing.forks.filter((fork) => fork !== link)
        }
      }

      // If the doc is linked to by another doc, then it's not a head, so we can ignore it
      if (this.isLinked(doc.versionId)) {
        if (existing && forksDirty) {
          // console.log('updating forks', doc.id, existing.forks)
          this.#dbApi.updateForks(doc.docId, existing.forks)
        }
        continue
      }

      if (!existing) {
        this.#dbApi.writeDoc({ ...doc, forks: [] })
      } else if (this.isLinked(existing.versionId)) {
        // console.log('existing linked', existing.version)
        // The existing doc for this ID is now linked, so we can replace it
        this.#dbApi.writeDoc({ ...doc, forks: [] })
      } else {
        // console.log('is forked', doc, existing)
        // Document is forked, so we need to select a "winner"
        const winner = this.#getWinner(existing, doc)
        // console.log('winner', winner)
        // TODO: Can the forks Set get out of date over time? E.g. could some of
        // the forks end up being linked by a doc that is indexed later on?
        if (winner === existing) {
          existing.forks.push(doc.versionId)
          this.#dbApi.updateForks(existing.docId, existing.forks)
        } else {
          existing.forks.push(existing.versionId)
          this.#dbApi.writeDoc({ ...doc, forks: existing.forks })
        }
      }
    }
  }

  /** @param {string} versionId */
  isLinked(versionId) {
    return !!this.#dbApi.getBacklink(versionId)
  }

  /**
   * @param {string} versionId
   * @param {IndexCallback<TDoc>} listener
   */
  onceWriteDoc(versionId, listener) {
    this.#dbApi.onceWriteDoc(versionId, listener)
  }
}

/**
 * @template {IndexableDocument} T
 * @template {IndexableDocument} U
 * @param {T} docA
 * @param {U} docB
 * @returns T | U
 */
function defaultGetWinner(docA, docB) {
  if (docA.updatedAt > docB.updatedAt) return docA
  if (docB.updatedAt > docA.updatedAt) return docB
  // They are equal or no timestamp property, so sort by version to ensure winner is deterministic
  return docA.versionId > docB.versionId ? docA : docB
}

/**
 * Assert that the given sqlite database has tables with the correct schema for
 * indexing Mapeo data
 *
 * @param {ConstructorParameters<typeof SqliteIndexer>[0]} db
 * @param {Omit<ConstructorParameters<typeof SqliteIndexer>[1], "getWinner">} options
 */
function assertValidSchema(db, { docTableName, backlinkTableName }) {
  const docsTable = db.prepare(`PRAGMA table_list(${docTableName})`).get()
  assert(docsTable, `Table ${docTableName} does not exist`)
  const docsColumns = /** @type {ColumnInfo[]} */ (
    db.prepare(`PRAGMA table_info(${docTableName})`).all()
  )
  assertMatchingSchema(docTableName, docsColumns, docSchema)
  const backlinksTable = /** @type {{ ncol: number } | undefined }} */ (
    db.prepare(`PRAGMA table_list(${backlinkTableName})`).get()
  )
  assert(backlinksTable, `Table ${backlinkTableName} does not exist`)
  assert(
    backlinksTable.ncol === 1,
    `Backlinks table should have 1 column, but instead had ${backlinksTable.ncol}`
  )
  const backlinksColumns = /** @type {ColumnInfo[]} */ (
    db.prepare(`PRAGMA table_info(${backlinkTableName})`).all()
  )
  assertMatchingSchema(backlinkTableName, backlinksColumns, backlinkSchema)
}

/**
 * @param {string} tableName
 * @param {ColumnInfo[]} columns
 * @param {ColumnSchema} schema
 */
function assertMatchingSchema(tableName, columns, schema) {
  for (const [name, info] of Object.entries(schema)) {
    const column = columns.find((c) => c.name === name)
    assert(column, `Table '${tableName}' must have a column '${name}'`)
    for (const [prop, value] of Object.entries(info)) {
      assert(
        // @ts-ignore
        column[prop] === value,
        // @ts-ignore
        `Column '${name}' in table '${tableName}' should have ${prop}=${value}, but instead ${prop}=${column[prop]}`
      )
    }
  }
}
