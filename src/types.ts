// Types for validating parameters, which should extend these types
import {
  type SQLiteTableWithColumns,
  type SQLiteText,
  type SQLiteCustomColumn,
} from 'drizzle-orm/sqlite-core'

export type DocTable<TName extends string = string> = SQLiteTableWithColumns<{
  name: TName
  schema: undefined
  columns: {
    docId: SQLiteText<{
      tableName: TName
      name: 'docId'
      data: string
      enumValues: [string, ...string[]]
      driverParam: string
      hasDefault: false
      notNull: true
    }>
    versionId: SQLiteText<{
      tableName: TName
      name: 'versionId'
      data: string
      enumValues: [string, ...string[]]
      driverParam: string
      hasDefault: false
      notNull: true
    }>
    links: SQLiteCustomColumn<{
      tableName: TName
      name: 'links'
      data: string[]
      driverParam: string
      notNull: true
      hasDefault: true
    }>
    forks: SQLiteCustomColumn<{
      tableName: TName
      name: 'forks'
      data: string[]
      driverParam: string
      notNull: true
      hasDefault: true
    }>
    updatedAt: SQLiteText<{
      tableName: 'docs'
      enumValues: [string, ...string[]]
      name: 'updatedAt'
      data: string
      driverParam: string
      hasDefault: false
      notNull: true
    }>
  }
}>

export type BacklinkTable<TName extends string = string> =
  SQLiteTableWithColumns<{
    name: TName
    schema: undefined
    columns: {
      versionId: SQLiteText<{
        tableName: TName
        name: 'versionId'
        data: string
        enumValues: [string, ...string[]]
        driverParam: string
        hasDefault: false
        notNull: true
      }>
    }
  }>
