// @ts-check
import assert from 'assert'

/**
 * @typedef {object} IndexableDocument
 * @property {string} id
 * @property {string} version
 * @property {string[]} links
 * @property {string | number} [timestamp]
 */

/** @typedef {{ type: string, pk: 1 | 0, cid: number, notnull: 1 | 0, dflt_value: any, name: string }} ColumnInfo */
/** @typedef {Record<string, Partial<Omit<ColumnInfo, 'name'>>>} ColumnSchema */
/** @typedef {IndexableDocument & { forks: string[] }} IndexedDocument */
/** @typedef {{ version: string }} Backlink */

/** @type {ColumnSchema} */
const docSchema = {
  id: { type: 'TEXT', pk: 1, notnull: 1 },
  version: { type: 'TEXT', notnull: 1, pk: 0 },
  links: { type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
  forks: { type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
}

/** @type {ColumnSchema} */
const backlinkSchema = {
  version: { type: 'TEXT', pk: 1, notnull: 1 },
}

export class DbApi {
  #getDocSql
  #writeDocSql
  #getBacklinkSql
  #writeBacklinkSql
  #updateForksSql
  #docDefaults

  /** @type {Map<string, Set<IndexCallback>>} */
  #listeners = new Map()

  /**
   * @param {ConstructorParameters<typeof SqliteIndexer>[0]} db
   * @param {Omit<ConstructorParameters<typeof SqliteIndexer>[1], "getWinner">} options
   */
  constructor(db, { docTableName, backlinkTableName }) {
    assertValidSchema(db, { docTableName, backlinkTableName })
    const tableInfo = /** @type {ColumnInfo[]} */ (
      db.prepare(`PRAGMA table_info(${docTableName})`).all()
    )
    this.#docDefaults = tableInfo.reduce(
      (acc, { name, dflt_value, notnull }) => {
        if (!notnull) acc[name] = dflt_value
        return acc
      },
      /** @type {Record<string, any>} */ ({})
    )
    const docColumns = tableInfo.map(({ name }) => name)
    this.#getDocSql = db.prepare(
      `SELECT *
      FROM ${docTableName}
      WHERE id = ?`
    )
    this.#writeDocSql = db.prepare(
      `REPLACE INTO ${docTableName} (${docColumns.join(',')})
      VALUES (${docColumns.map((name) => `@${name}`).join(',')})`
    )
    this.#updateForksSql = db.prepare(
      `UPDATE ${docTableName} SET forks = @forks WHERE id = @id`
    )
    this.#getBacklinkSql = db.prepare(
      `SELECT version
      FROM ${backlinkTableName}
      WHERE version = ?`
    )
    this.#writeBacklinkSql = db.prepare(
      `INSERT OR IGNORE INTO ${backlinkTableName} (version)
      VALUES (?)`
    )
  }
  /**
   * @param {string} id
   * @returns {IndexedDocument & { [key: string]: any } | undefined}
   */
  getDoc(id) {
    const doc = /** @type {any} */ (this.#getDocSql.get(id))
    if (!doc) return
    doc.links = JSON.parse(doc.links)
    doc.forks = JSON.parse(doc.forks)
    return doc
  }
  /**
   * @param {IndexedDocument | IndexableDocument} doc
   */
  writeDoc(doc) {
    const flattenedDoc = {
      ...this.#docDefaults,
      ...doc,
      links: JSON.stringify(doc.links),
      forks: JSON.stringify('forks' in doc ? doc.forks : []),
    }
    this.#writeDocSql.run(flattenedDoc)

    const { version } = doc
    if (this.#listeners.has(version)) {
      process.nextTick(() => {
        const set = this.#listeners.get(version)
        if (set) {
          for (const listener of set.values()) {
            listener(doc)
          }
          this.#listeners.delete(version)
        }
      })
    }
  }
  /**
   * @param {string} version
   * @param {IndexCallback} listener
   */
  onceWriteDoc(version, listener) {
    if (!this.#listeners.has(version)) {
      this.#listeners.set(version, new Set())
    }

    const set = this.#listeners.get(version)
    if (set && set.has(listener)) {
      return
    } else if (set) {
      set.add(listener)
      this.#listeners.set(version, set)
    }
  }
  /**
   * @param {string} docId
   * @param {IndexedDocument["forks"]} forks
   */
  updateForks(docId, forks) {
    this.#updateForksSql.run({
      id: docId,
      forks: JSON.stringify(forks),
    })
  }
  /**
   * @param {string} version
   */
  getBacklink(version) {
    return this.#getBacklinkSql.get(version)
  }
  /**
   * @param {string} version
   */
  writeBacklink(version) {
    this.#writeBacklinkSql.run(version)
  }
}

export default class SqliteIndexer {
  #getWinner

  /**
   * @param {import('better-sqlite3').Database} db
   * @param {object} options
   * @param {string} options.docTableName - Name of the Realm object type that will store the indexed document
   * @param {string} options.backlinkTableName - Name of the Realm object type that will store the backlinks
   * @param {typeof defaultGetWinner} [options.getWinner] - Function that will be used to determine the "winning" fork of a document
   */
  constructor(
    db,
    { docTableName, backlinkTableName, getWinner = defaultGetWinner }
  ) {
    this.dbApi = new DbApi(db, { docTableName, backlinkTableName })
    this.#getWinner = getWinner
    /** @type {(docs: IndexableDocument[]) => void} */
    this.batch = db.transaction((docs) => this._batch(docs))
  }

  /** @param {IndexableDocument[]} docs */
  _batch(docs) {
    for (const doc of docs) {
      /** @type {IndexedDocument | undefined} */
      const existing = this.dbApi.getDoc(doc.id)
      // console.log('existing', existing)
      // console.log('doc', doc)
      let forksDirty = false

      for (const link of doc.links) {
        this.dbApi.writeBacklink(link)
        if (existing && existing.forks.includes(link)) {
          forksDirty = true
          existing.forks = existing.forks.filter((fork) => fork !== link)
        }
      }

      // If the doc is linked to by another doc, then it's not a head, so we can ignore it
      if (this.isLinked(doc.version)) {
        if (existing && forksDirty) {
          // console.log('updating forks', doc.id, existing.forks)
          this.dbApi.updateForks(doc.id, existing.forks)
        }
        continue
      }

      if (!existing) {
        this.dbApi.writeDoc(doc)
      } else if (this.isLinked(existing.version)) {
        // console.log('existing linked', existing.version)
        // The existing doc for this ID is now linked, so we can replace it
        this.dbApi.writeDoc(doc)
      } else {
        // console.log('is forked', doc, existing)
        // Document is forked, so we need to select a "winner"
        const winner = this.#getWinner(existing, doc)
        // console.log('winner', winner)
        // TODO: Can the forks Set get out of date over time? E.g. could some of
        // the forks end up being linked by a doc that is indexed later on?
        if (winner === existing) {
          existing.forks.push(doc.version)
          this.dbApi.updateForks(existing.id, existing.forks)
        } else {
          existing.forks.push(existing.version)
          this.dbApi.writeDoc({ ...doc, forks: existing.forks })
        }
      }
    }
  }

  /** @param {string} version */
  isLinked(version) {
    return !!this.dbApi.getBacklink(version)
  }

  /**
   * @callback IndexCallback
   * @param {IndexedDocument | IndexableDocument} doc
   */

  /**
   * @param {string} version
   * @param {IndexCallback} listener
   */
  onceWriteDoc(version, listener) {
    this.dbApi.onceWriteDoc(version, listener)
  }
}

/**
 *
 * @param {IndexableDocument} docA
 * @param {IndexableDocument} docB
 * @returns IndexedDocument
 */
function defaultGetWinner(docA, docB) {
  if (
    // Checking neither null nor undefined
    docA.timestamp != null &&
    docB.timestamp != null
  ) {
    if (docA.timestamp > docB.timestamp) return docA
    if (docB.timestamp > docA.timestamp) return docB
  }
  // They are equal or no timestamp property, so sort by version to ensure winner is deterministic
  return docA.version > docB.version ? docA : docB
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
