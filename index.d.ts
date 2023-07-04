/**
 * @template {IndexableDocument} TDoc
 */
export class DbApi<TDoc extends IndexableDocument> {
    /**
     * @param {import('better-sqlite3').Database} db
     * @param {object} options
     * @param {string} options.docTableName - Name of the Sqlite table that stores the indexed documents
     * @param {string} options.backlinkTableName - Name of the Sqlite table that stores the backlinks
     */
    constructor(db: import('better-sqlite3').Database, { docTableName, backlinkTableName }: {
        docTableName: string;
        backlinkTableName: string;
    });
    /**
     * @param {string} id
     * @returns {IndexedDocument<TDoc> | undefined}
     */
    getDoc(id: string): IndexedDocument<TDoc> | undefined;
    /**
     * @param {IndexedDocument<TDoc>} doc
     */
    writeDoc(doc: IndexedDocument<TDoc>): void;
    /**
     * @param {string} version
     * @param {IndexCallback<TDoc>} listener
     */
    onceWriteDoc(version: string, listener: IndexCallback<TDoc>): void;
    /**
     * @param {string} docId
     * @param {IndexedDocument<IndexableDocument>["forks"]} forks
     */
    updateForks(docId: string, forks: IndexedDocument<IndexableDocument>["forks"]): void;
    /**
     * @param {string} version
     */
    getBacklink(version: string): unknown;
    /**
     * @param {string} version
     */
    writeBacklink(version: string): void;
    #private;
}
/**
 * @template {IndexableDocument} [TDoc=IndexableDocument]
 */
export default class SqliteIndexer<TDoc extends IndexableDocument = IndexableDocument> {
    /**
     * @param {import('better-sqlite3').Database} db
     * @param {object} options
     * @param {string} options.docTableName - Name of the Sqlite table that stores the indexed documents
     * @param {string} options.backlinkTableName - Name of the Sqlite table that stores the backlinks
     * @param {typeof defaultGetWinner} [options.getWinner] - Function that will be used to determine the "winning" fork of a document
     */
    constructor(db: import('better-sqlite3').Database, { docTableName, backlinkTableName, getWinner }: {
        docTableName: string;
        backlinkTableName: string;
        getWinner?: typeof defaultGetWinner;
    });
    /** @type {(docs: IndexableDocument[]) => void} */
    batch: (docs: IndexableDocument[]) => void;
    /** @param {string} version */
    isLinked(version: string): boolean;
    /**
     * @param {string} version
     * @param {IndexCallback<TDoc>} listener
     */
    onceWriteDoc(version: string, listener: IndexCallback<TDoc>): void;
    #private;
}
export type IndexableDocument = {
    id: string;
    version: string;
    links: string[];
    timestamp?: string | number;
};
export type ColumnInfo = {
    type: string;
    pk: 1 | 0;
    cid: number;
    notnull: 1 | 0;
    dflt_value: any;
    name: string;
};
export type ColumnSchema = Record<string, Partial<Omit<ColumnInfo, 'name'>>>;
export type IndexedDocument<TDoc extends IndexableDocument = IndexableDocument> = TDoc & {
    forks: string[];
};
export type Backlink = {
    version: string;
};
export type IndexCallback<TDoc extends IndexableDocument> = (doc: IndexedDocument<TDoc>) => void;
/**
 *
 * @param {IndexableDocument} docA
 * @param {IndexableDocument} docB
 * @returns IndexableDocument
 */
declare function defaultGetWinner(docA: IndexableDocument, docB: IndexableDocument): IndexableDocument;
export {};
