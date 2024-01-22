# @mapeo/sqlite-indexer

[![Node.js CI](https://github.com/digidem/mapeo-sqlite-indexer/workflows/Node.js%20CI/badge.svg)](https://github.com/digidem/mapeo-sqlite-indexer/actions/workflows/node.js.yml)
[![Coverage Status](https://coveralls.io/repos/github/digidem/mapeo-sqlite-indexer/badge.svg)](https://coveralls.io/github/digidem/mapeo-sqlite-indexer)
[![Npm package version](https://img.shields.io/npm/v/@mapeo/sqlite-indexer)](https://npmjs.com/package/@mapeo/sqlite-indexer)

**⚠️ This is an Alpha release and the API might change. Do not use in
production. ⚠️**

Index Mapeo data in a [SQLite](https://sqlite.org/) database.

Mapeo data is stored in multiple append-only logs (we use [Hypercore](https://github.com/hypercore-protocol/hypercore-next)). The data is structured as a Directed Acylclic Graph (DAG) for each document `id`: each edit of a particular document is stored as a new document that points to its "parent". This can result in "forks": the same parent can be edited in two different instances of Mapeo, resulting in two versions of the same document.

This indexer accepts batches of Mapeo documents of a particular type (namespace) and indexes the "head" document. If a document is forked then a "winner" is chosen deterministically, either by a timestamp or by comparing version ids. The documents heads are stored in a [SQLite](https://sqlite.org/) database, so that further querying and indexing of the documents is done within SQLite.

Any document that is indexed must have the following type:

```ts
type IndexableDocument = {
  id: string
  version: string
  links: string[]
  timestamp?: string | number
  [otherProp: string]: any
}
```

The SQLite database must include a table for storing these documents that must at a minimum include these columns, but can contain additional columns:

```sql
CREATE TABLE IF NOT EXISTS docs
  (
    id TEXT PRIMARY KEY NOT NULL,
    version TEXT NOT NULL,
    links TEXT NOT NULL,
    forks TEXT NOT NULL
  )
```

The database must also include a table for storing "backlinks" (used internally for indexing which documents are already linked):

```sql
  CREATE TABLE IF NOT EXISTS backlinks
    (version TEXT PRIMARY KEY NOT NULL)
```

For maximum performance, active [Write-Ahead Logging](https://sqlite.org/wal.html) and create the tables [`WITHOUT ROWID`](https://sqlite.org/withoutrowid.html).

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [License](#license)

## Install

```
npm install @mapeo/sqlite-indexer
```

## Usage

```js
import Database from 'better-sqlite3'
import SQLiteIndexer from './index.js'

const db = new Database(':memory:')

db.pragma('journal_mode = WAL')

db.prepare(
  `CREATE TABLE IF NOT EXISTS docs
  (
    id TEXT PRIMARY KEY NOT NULL,
    version TEXT NOT NULL,
    links TEXT NOT NULL,
    forks TEXT NOT NULL
    ${extraColumns ? ', ' + extraColumns : ''}
  )
  WITHOUT ROWID`
).run()

db.prepare(
  `CREATE TABLE IF NOT EXISTS backlinks
  (version TEXT PRIMARY KEY NOT NULL)
  WITHOUT ROWID`
).run()

const docs = [
  { id: 'A', version: '1', links: [] },
  { id: 'A', version: '2', links: ['1'] },
  { id: 'A', version: '3', links: ['1'] },
  { id: 'A', version: '4', links: ['2', '3'] },
]

const indexer = new SQLiteIndexer(db, {
  docTableName: 'docs',
  backlinkTableName: 'backlinks',
})

indexer.batch(docs)

const A = db.prepare('SELECT * FROM docs WHERE id = A').run()
// { id: 'A', version: '4', links: '2,3', forks: null }
```

## API

### const indexer = new SQLiteIndexer(db, opts)

### db

_Required_\
Type: `BetterSqlite3.Database`

An instance of a [`better-sqlite3`](https://github.com/JoshuaWise/better-sqlite3) database.

### opts

_Required_\
Type: `object`

#### opts.docTableName

_Required_\
Type: `string`

The name of the table for storing the indexed documents.

#### opts.backlinkTableName

_Required_\
Type: `string`

The name of the table for storing backlinks (used internally for indexing).

### indexer.batch(docs)

Index an array of documents. Documents can be in any order. Documents must have an `id` property, a `version` property that is unique, and a `links` property which is an array of version ids for the documents parent(s).

### indexer.onceWriteDoc(version, listener)

Set a listener for a doc at a specific version. Useful for performing an action based on completion of indexing of a document.

### indexer.deleteAll()

Delete all documents and backlinks. Useful if you want to reset the index.

### docs

_Requires_\
Type: `Array<{ id: string, version: string, links: string[] }>`

Additional properties will be ignored but included in the SQLite table. The document stored in SQLite will have a `forks` property which is an comma-separated string of version ids for other forks of the document `id`, if forks exist.

## Maintainers

[@digidem](https://github.com/digidem)

## Contributing

PRs accepted.

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

MIT © 2022 Digital Democracy
