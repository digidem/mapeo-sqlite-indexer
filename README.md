# @mapeo/realm-indexer

[![Node.js CI](https://github.com/digidem/mapeo-realm-indexer/workflows/Node.js%20CI/badge.svg)](https://github.com/digidem/mapeo-realm-indexer/actions/workflows/node.js.yml)
[![Coverage Status](https://coveralls.io/repos/github/digidem/mapeo-realm-indexer/badge.svg)](https://coveralls.io/github/digidem/mapeo-realm-indexer)
[![Npm package version](https://img.shields.io/npm/v/@mapeo/realm-indexer)](https://npmjs.com/package/@mapeo/realm-indexer)

**⚠️ This is an Alpha release and the API might change. Do not use in
production. ⚠️**

Index Mapeo data in a Realm database

Mapeo data is stored in multiple append-only logs (we use [Hypercore](https://github.com/hypercore-protocol/hypercore-next)). The data is structured as a Directed Acylclic Graph (DAG) for each document `id`: each edit of a particular document is stored as a new document that points to its "parent". This can result in "forks": the same parent can be edited in two different instances of Mapeo, resulting in two versions of the same document.

This indexer accepts batches of Mapeo documents of a particular type (namespace) and indexes the "head" document. If a document is forked then a "winner" is chosen deterministically, either by a timestamp or by comparing version ids. The documents heads are stored in a [Realm database](https://realm.io), so that further querying and indexing of the documents is done within Realm.

Any document that is indexed must have the following type:

```ts
type IndexableDocument = {
  id: string
  version: string
  links: string[]
  timestamp?: string | number
}
```

The Realm database used as the index must also contain an object schema for storing these documents which must at a minimum include:

```js
const DocSchema = {
  name: 'Doc',
  properties: {
    id: 'string',
    version: 'string',
    links: 'string[]',
    forks: {
      type: 'set',
      objectType: 'string',
    },
  },
  primaryKey: 'id',
}
```

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [License](#license)

## Install

```
npm install @mapeo/realm-indexer
```

## Usage

```js
import Realm from 'realm'
import RealmIndexer from './index.js'

const realm = new Realm({
  schema: [RealmIndexer.DocSchema, RealmIndexer.BacklinkSchema],
})

const docs = [
  { id: 'A', version: '1', links: [] },
  { id: 'A', version: '2', links: ['1'] },
  { id: 'A', version: '3', links: ['1'] },
  { id: 'A', version: '4', links: ['2', '3'] },
]

const indexer = new RealmIndexer(realm, {
  docType: RealmIndexer.DocSchema.name,
  backlinkType: RealmIndexer.BacklinkSchema.name,
})

indexer.batch(docs)

const A = realm.objectForPrimaryKey('Doc', 'A')
// { id: 'A', version: '4', links: ['2', '3'], forks: [] }
```

## API

### const indexer = new RealmIndexer(realm, opts)

### realm

_Required_\
Type: `Realm`

An instance of a [Realm](https://realm.io) database.

### opts

_Required_\
Type: `object`

#### opts.docType

_Required_\
Type: `string`

The name of the Realm schema for storing the indexed documents.

#### opts.backlinkType

_Required_\
Type: `string`

The name of the Realm schema for storing backlinks (used internally for indexing). Must have the schema:

```js
const BacklinkSchema = {
  name: 'Backlink',
  properties: {
    version: 'string',
  },
  primaryKey: 'version',
}
```

### indexer.batch(docs)

Index an array of documents. Documents can be in any order. Documents must have an `id` property, a `version` property that is unique, and a `links` property which is an array of version ids for the documents parent(s).

### docs

_Requires_\
Type: `Array<{ id: string, version: string, links: string[] }>`

Additional properties will be ignored but included in the Realm index. They should also be defined in the `DocSchema` and match the type. The document stored in Realm will have a `forks` property which is an array of version ids for other forks of the document `id`, if forks exist.

## Maintainers

[@digidem](https://github.com/digidem)

## Contributing

PRs accepted.

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

MIT © 2022 Digital Democracy
