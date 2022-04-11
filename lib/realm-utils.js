// @ts-check
import { deepEqual } from 'fast-equals'
import util from 'util'
import assert from 'assert'

/** @param {any} v */
function inspect(v) {
  return util.inspect(v, false, null, true)
}

const validPropertyTypes = new Set([
  'string',
  'bool',
  'int',
  'float',
  'double',
  'date',
  'data',
  'list',
  'set',
  'linkingObjects',
  'dictionary',
  'decimal128',
  'objectId',
])

/**
 * @typedef {Realm.ObjectSchema & { properties: { [key: string]: Realm.ObjectSchemaProperty | Realm.ObjectSchema } }} NormalizedObjectSchema
 */

/**
 * A helper function to assert that a schema in a Realm database contains a
 * given schema. This is useful for accepting a Realm instance in a function and
 * ensuring that it supports the expected schema types. This implementation does
 * not check for exact equality, it just checks that the schema is a subset of
 * the normalized schema from the database.
 *
 * @param {Realm} realm - Normalized object schema, e.g. the schema returned from realm.schema
 * @param {Realm.ObjectSchema} expectedObjectSchema - Unnormalized object schema, e.g. the schema definition you would pass to the Realm constructor
 */
export function assertRealmSchemaIncludes(realm, expectedObjectSchema) {
  const dbObjectSchema = realm.schema.find(
    (objectSchema) => objectSchema.name === expectedObjectSchema.name
  )
  assert(
    dbObjectSchema,
    `Realm schema does not include expected object schema ${expectedObjectSchema.name}`
  )
  const { properties: expectedProperties, ...expectedRest } =
    normalizeObjectSchema(expectedObjectSchema)
  const { properties: dbProperties, ...dbRest } = dbObjectSchema
  assert(
    deepEqual(expectedRest, dbRest),
    `Expected schema to match: ${inspect(expectedRest)}`
  )
  for (const [key, expectedProperty] of Object.entries(expectedProperties)) {
    const dbProperty = dbProperties[key]
    assert(
      dbProperty,
      `Expected property ${key} if object type '${dbRest.name}' to exist`
    )
    assert(
      deepEqual(expectedProperty, dbProperty),
      `Expected property ${key} if object type '${
        dbRest.name
      }' to match:\n${inspect(expectedProperty)}\nInstead got:\n${inspect(
        dbProperty
      )}`
    )
  }
}

/**
 * Normalize a Realm Schema object by expanding any shorthand types. Can be used
 * to compare with the normalized schema returned by realm.schema
 *
 * @param {import('realm').ObjectSchema} schema
 */
export function normalizeObjectSchema(schema) {
  /** @type {import('realm').PropertiesTypes} */
  const normalizedProperties = {}

  for (const [key, value] of Object.entries(schema.properties)) {
    // Realm doesn't actually allow this, even though it's Typescript definitions say it does
    /* c8 ignore next 2 */
    if (typeof value !== 'string' && 'properties' in value) {
      normalizedProperties[key] = normalizeObjectSchema(value)
    } else {
      const defaults = {
        optional: false,
        indexed: schema.primaryKey === key,
        mapTo: key,
        name: key,
      }
      normalizedProperties[key] = { ...defaults, ...parsePropertyType(value) }
    }
  }

  return {
    embedded: false,
    ...schema,
    properties: normalizedProperties,
  }
}

/**
 * Parse a shorthand Realm property type
 *
 * @param {Realm.PropertyType | Realm.ObjectSchemaProperty} pType
 * @returns {Realm.ObjectSchemaProperty}
 */
export function parsePropertyType(pType) {
  if (typeof pType !== 'string') return pType
  if (pType.endsWith('[]')) {
    const subType = parsePropertyType(pType.slice(0, -2))
    return {
      type: 'list',
      objectType: subType.type === 'object' ? subType.objectType : subType.type,
      optional: pType.slice(-3, -2) === '?',
    }
  } else if (pType.endsWith('<>')) {
    const subType = parsePropertyType(pType.slice(0, -2))
    return {
      type: 'set',
      objectType: subType.type,
      optional: subType.optional,
    }
  }
  let optional = false
  if (pType.endsWith('?')) {
    optional = true
    pType = pType.slice(0, -1)
  }
  if (validPropertyTypes.has(pType)) {
    return {
      type: pType,
      optional,
    }
  }
  return {
    type: 'object',
    objectType: pType,
    // According to docs object types are always optional
    optional: true,
  }
}
