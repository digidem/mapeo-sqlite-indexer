// @ts-check

/**
 * @typedef {object} IndexableDocument
 * @property {string} id
 * @property {string} version
 * @property {string[]} links
 * @property {string | number} [timestamp]
 */

/** @typedef {IndexableDocument & { forks: Set<string> }} IndexedDocument */
/** @typedef {{ version: string }} Backlink */

class DbApi {
  #db
  #getDocSql
  #writeDocSql
  #getBacklinkSql
  #writeBacklinkSql

  /**
   * @param {ConstructorParameters<typeof SqliteIndexer>[0]} db
   * @param {Omit<ConstructorParameters<typeof SqliteIndexer>[1], "getWinner">} options
   */
  constructor(db, { docTableName, backlinkTableName }) {
    this.#db = db
    this.#getDocSql = db.prepare(
      `SELECT id, version, links, forks
      FROM ${docTableName}
      WHERE id = ?`
    )
    this.#writeDocSql = db.prepare(
      `REPLACE INTO ${docTableName} (id, version, links, forks)
      VALUES (@id, @version, @links, @forks)`
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
   * @returns {IndexedDocument | undefined}
   */
  getDoc(id) {
    const doc = this.#getDocSql.get(id)
    if (!doc) return
    doc.links = doc.links ? doc.links.split(',') : []
    doc.forks = doc.forks ? new Set(doc.forks.split(',')) : new Set()
    return doc
  }
  /**
   * @param {IndexedDocument | IndexableDocument} doc
   */
  writeDoc(doc) {
    const flattenedDoc = {
      ...doc,
      links: doc.links.length ? doc.links.join(',') : null,
      forks: 'forks' in doc && doc.forks.size ? [...doc.forks].join(',') : null,
    }
    this.#writeDocSql.run(flattenedDoc)
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
  }

  /** @param {IndexableDocument[]} docs */
  batch(docs) {
    for (const doc of docs) {
      /** @type {IndexedDocument | undefined} */
      const existing = this.dbApi.getDoc(doc.id)
      // console.log('existing', existing)
      // console.log('doc', doc)

      for (const link of doc.links) {
        this.dbApi.writeBacklink(link)
        if (existing && existing.forks.has(link)) {
          existing.forks.delete(link)
        }
      }

      // If the doc is linked to by another doc, then it's not a head, so we can ignore it
      if (this.isLinked(doc.version)) {
        if (existing) this.dbApi.writeDoc(existing)
        // console.log('linked', doc.version)
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
          existing.forks.add(doc.version)
          this.dbApi.writeDoc(existing)
        } else {
          // Need to clone the forks set, before it is deleted
          const forks = new Set(existing.forks)
          forks.add(existing.version)
          this.dbApi.writeDoc({ ...doc, forks })
        }
      }
    }
  }

  /** @param {string} version */
  isLinked(version) {
    return !!this.dbApi.getBacklink(version)
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
