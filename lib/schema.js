// @ts-check

/** @type {Realm.ObjectSchema} */
export const BacklinkSchema = {
  name: 'Backlink',
  properties: {
    version: 'string',
  },
  primaryKey: 'version',
}

/** @type {Realm.ObjectSchema} */
export const DocSchema = {
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
