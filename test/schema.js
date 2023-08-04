import { sqliteTable, text, customType } from 'drizzle-orm/sqlite-core'

const textArray =
  /** @type {ReturnType<typeof customType<{ data: string[], driverData: string }>>} */ (
    customType({
      dataType() {
        return 'text'
      },
      fromDriver(value) {
        return JSON.parse(value)
      },
      toDriver(value) {
        return JSON.stringify(value)
      },
    })
  )

export const docTable = sqliteTable('docs', {
  docId: text('docId').primaryKey().notNull(),
  versionId: text('versionId').notNull(),
  links: textArray('links').notNull().default('[]'),
  forks: textArray('forks').notNull().default('[]'),
  updatedAt: text('updatedAt').notNull(),
  // extraField: real('extraField'),
})

export const backlinkTable = sqliteTable('backlinks', {
  versionId: text('versionId').notNull().primaryKey(),
})
