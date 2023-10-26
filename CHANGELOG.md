# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.0.0-alpha.8](https://github.com/digidem/mapeo-sqlite-indexer/compare/v1.0.0-alpha.7...v1.0.0-alpha.8) (2023-10-26)

### ⚠ BREAKING CHANGES

- remove onceWriteDoc() (#21)

### Features

- revert adding of delete field to schema ([#20](https://github.com/digidem/mapeo-sqlite-indexer/issues/20)) ([a262d67](https://github.com/digidem/mapeo-sqlite-indexer/commit/a262d676ad47967bbda71aeaacefd84f7327cf71)), closes [#19](https://github.com/digidem/mapeo-sqlite-indexer/issues/19)

- remove onceWriteDoc() ([#21](https://github.com/digidem/mapeo-sqlite-indexer/issues/21)) ([8caaf6a](https://github.com/digidem/mapeo-sqlite-indexer/commit/8caaf6a9becf191aca8b9072a53b7671245496c7)), closes [#15](https://github.com/digidem/mapeo-sqlite-indexer/issues/15)

## [1.0.0-alpha.7](https://github.com/digidem/mapeo-sqlite-indexer/compare/v1.0.0-alpha.6...v1.0.0-alpha.7) (2023-10-02)

### Features

- add deleted to table Doc ([#18](https://github.com/digidem/mapeo-sqlite-indexer/issues/18)) ([e617aa0](https://github.com/digidem/mapeo-sqlite-indexer/commit/e617aa0cf397c2cea9f281653fb7a2234a83ae37))

## [1.0.0-alpha.6](https://github.com/digidem/mapeo-sqlite-indexer/compare/v1.0.0-alpha.5...v1.0.0-alpha.6) (2023-08-30)

## [1.0.0-alpha.5](https://github.com/digidem/mapeo-sqlite-indexer/compare/v1.0.0-alpha.4...v1.0.0-alpha.5) (2023-08-07)

### ⚠ BREAKING CHANGES

- rename columns to match new schema (#11)

### Features

- complex docs (properties that are arrays or objects) ([#14](https://github.com/digidem/mapeo-sqlite-indexer/issues/14)) ([0d27840](https://github.com/digidem/mapeo-sqlite-indexer/commit/0d27840fd910897fea1269fb891cc4edf0443a3d))

### Bug Fixes

- rename columns to match new schema ([#11](https://github.com/digidem/mapeo-sqlite-indexer/issues/11)) ([a46beae](https://github.com/digidem/mapeo-sqlite-indexer/commit/a46beae2ae27f63edb0080f261d983b9df333b77))

## [1.0.0-alpha.4](https://github.com/digidem/mapeo-sqlite-indexer/compare/v1.0.0-alpha.2...v1.0.0-alpha.4) (2023-07-06)

### Bug Fixes

- stricter types and publish typescript declarations ([bf7b4cf](https://github.com/digidem/mapeo-sqlite-indexer/commit/bf7b4cf10c8bbf051daf6938b64b7a843fc2248c))

## [1.0.0-alpha.3](https://github.com/digidem/mapeo-sqlite-indexer/compare/v1.0.0-alpha.2...v1.0.0-alpha.3) (2023-07-04)

### Bug Fixes

- add stricter types and include in npm pkg ([3212e94](https://github.com/digidem/mapeo-sqlite-indexer/commit/3212e947332db55d61aef3df1fe3df0f3ea75bdd))

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
