// @ts-check
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq, placeholder } from 'drizzle-orm'

/**
 * @template T
 * @template {keyof any} K
 * @typedef {T extends any ? Omit<T, K> : never} OmitUnion
 */
/**
 * @typedef {import('drizzle-orm').InferModel<import('./types.js').DocTable>} IndexedDoc
 */
/**
 * @template {IndexedDoc} TDoc
 * @typedef {Omit<TDoc, 'forks'>} IndexableDoc
 */
/**
 * @typedef {import('drizzle-orm').InferModel<import('./types.js').BacklinkTable>} Backlink
 */

/**
 * @template {import('./types.js').DocTable} TDocTable
 * @template {import('drizzle-orm').InferModel<TDocTable>} TDoc
 */
export class SqliteIndexer {
  #getWinner
  #db
  #docs
  #backlinks
  #sql

  /**
   * @param {import('better-sqlite3').Database} sqlite better-sqlite3 database instance
   * @param {object} options
   * @param {import('./types.js').DocTable} options.docTable - drizzle table for docs
   * @param {import('./types.js').BacklinkTable} options.backlinkTable - drizzle table for backlinks
   * @param {typeof defaultGetWinner} [options.getWinner] - Function that will be used to determine the "winning" fork of a document
   */
  constructor(
    sqlite,
    { docTable, backlinkTable, getWinner = defaultGetWinner }
  ) {
    const db = (this.#db = drizzle(sqlite))
    this.#docs = docTable
    this.#backlinks = backlinkTable
    this.#getWinner = getWinner

    // Prepared statements
    this.#sql = {
      getDoc: db
        .select({
          docId: docTable.docId,
          versionId: docTable.versionId,
          forks: docTable.forks,
          links: docTable.links,
          updatedAt: docTable.updatedAt,
        })
        .from(docTable)
        .where(eq(docTable.docId, placeholder('docId')))
        .prepare(),
      writeBacklink: db
        .insert(backlinkTable)
        .values({ versionId: placeholder('link') })
        .onConflictDoNothing()
        .prepare(),
    }
  }

  /** @param {Omit<TDoc, 'forks'>[]} docs */
  batch(docs) {
    // TDoc should work outside this function, but we need to cast it in the function body here
    const typedDocs = /** @type {Omit<IndexedDoc, 'forks'>[]} */ (
      /** @type {unknown} */ (docs)
    )
    const db = this.#db
    const docTable = this.#docs
    for (const doc of typedDocs) {
      // console.log('processing doc', doc.docId, doc.versionId)
      const existing = this.#sql.getDoc.get({ docId: doc.docId })

      // console.log('existing', existing)

      let forksDirty = false

      for (const link of doc.links) {
        this.#sql.writeBacklink.run({ link })
        if (existing && existing.forks.includes(link)) {
          forksDirty = true
          existing.forks = existing.forks.filter((fork) => fork !== link)
          // console.log('updated forks', existing.forks)
        }
      }

      // If the doc is linked to by another doc, then it's not a head, so we can ignore it
      if (this.#isLinked(doc.versionId)) {
        // console.log('isLinked')
        if (existing && forksDirty) {
          // console.log('updating forks', doc.docId, existing.forks)
          db.update(docTable)
            .set({ forks: existing.forks })
            .where(eq(docTable.docId, existing.docId))
            .run()
        }
        continue
      }

      if (!existing) {
        // console.log('no existing', doc)
        db.insert(docTable).values(doc).run()
        // console.log('written')
      } else if (this.#isLinked(existing.versionId)) {
        // console.log('existing linked', existing.versionId, existing.docId)
        // The existing doc for this ID is now linked, so we can replace it
        db.update(docTable)
          .set({ ...doc, forks: [] })
          .where(eq(docTable.docId, doc.docId))
          .run()
      } else {
        // console.log('is forked', doc, existing)
        // Document is forked, so we need to select a "winner"
        const winner = this.#getWinner(existing, doc)
        // console.log('winner', winner)
        // TODO: Can the forks Set get out of date over time? E.g. could some of
        // the forks end up being linked by a doc that is indexed later on?
        if (winner === existing) {
          existing.forks.push(doc.versionId)
          db.update(docTable)
            .set({ forks: existing.forks })
            .where(eq(docTable.docId, existing.docId))
            .run()
        } else {
          existing.forks.push(existing.versionId)
          db.update(docTable)
            .set({ ...doc, forks: existing.forks })
            .where(eq(docTable.docId, existing.docId))
            .run()
        }
      }
    }
  }

  /** @param {string} versionId */
  #isLinked(versionId) {
    return !!this.#db
      .select()
      .from(this.#backlinks)
      .where(eq(this.#backlinks.versionId, versionId))
      .get()
  }
}

/**
 *
 * @param {Omit<IndexedDoc, 'forks'>} docA
 * @param {Omit<IndexedDoc, 'forks'>} docB
 * @returns Omit<IndexedDoc, 'forks'>
 */
function defaultGetWinner(docA, docB) {
  if (docA.updatedAt > docB.updatedAt) return docA
  if (docB.updatedAt > docA.updatedAt) return docB
  // They are equal or no timestamp property, so sort by version to ensure winner is deterministic
  return docA.versionId > docB.versionId ? docA : docB
}
