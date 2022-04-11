// @ts-check
import test from 'tape'
import Realm from 'realm'
import tmp from 'tmp'
import { assertRealmSchemaIncludes } from '../lib/realm-utils.js'
import path from 'path'

const { name: tmpDir } = tmp.dirSync({ unsafeCleanup: true })
const dbPath = path.join(tmpDir, 'test.realm')

test('Validate schema', (t) => {
  /** @type {Realm.ObjectSchema} */
  const MyClassSchema = {
    name: 'MyClass',
    primaryKey: 'pk',
    properties: {
      pk: 'int',
      optionalFloatValue: 'float?', // or {type: 'float', optional: true}
      listOfStrings: 'string[]',
      listOfOptionalDates: 'date?[]',
      indexedInt: { type: 'int', indexed: true },
      linkToObject: 'MyClass',
      listOfObjects: 'MyClass[]', // or {type: 'list', objectType: 'MyClass'}
      objectsLinkingToThisObject: {
        type: 'linkingObjects',
        objectType: 'MyClass',
        property: 'linkToObject',
      },
      setOfStrings: 'string<>',
      setOfOptionalStrings: 'string?<>', // or {type: 'set', objectType: 'string'}
    },
  }

  const realm = new Realm({
    inMemory: true,
    path: dbPath,
    schema: [MyClassSchema],
  })
  t.doesNotThrow(() => assertRealmSchemaIncludes(realm, MyClassSchema))
  realm.close()
  t.end()
})
