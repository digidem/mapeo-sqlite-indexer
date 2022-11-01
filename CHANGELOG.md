# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.0.0-alpha.2](https://github.com/digidem/mapeo-sqlite-indexer/compare/v1.0.0-alpha.1...v1.0.0-alpha.2) (2022-11-01)

### ⚠ BREAKING CHANGES

- previously forks and links were stored as comma-
  separated strings in nullable columns. This changes them to be non-
  nullable JSON values, which must be an array of strings. Previous index
  tables will break with this version.

- store forks and links as JSON ([945a8ed](https://github.com/digidem/mapeo-sqlite-indexer/commit/945a8edea0d52de41427e4e73c4f937847ec2fef))

## 1.0.0-alpha.1 (2022-11-01)

### Features

- add onceWriteDoc method to notify of indexed docs ([#3](https://github.com/digidem/mapeo-sqlite-indexer/issues/3)) ([223547f](https://github.com/digidem/mapeo-sqlite-indexer/commit/223547f592ba3b436594da2a5c69d5aa5bb55444))
- Batch in transaction ([32fa0a9](https://github.com/digidem/mapeo-sqlite-indexer/commit/32fa0a91f6145d416772e52009b169199d55df09))

### Bug Fixes

- Fix timestamps test ([b471cdb](https://github.com/digidem/mapeo-sqlite-indexer/commit/b471cdb9afdd3ed5108cf40a0f656f5022f2687a))

# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.
