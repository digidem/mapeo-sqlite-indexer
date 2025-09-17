import { create } from './test/utils.js'
import { randomBytes } from 'crypto'

const { indexer, cleanup } = create()

const batchSize = Number(process.argv[2] || 100)
let times = Number(process.argv[3] || 1000)

const keys = []
for (let i = 0; i < 5000; i++) {
  keys.push(randomBytes(4).toString('hex'))
}

const start = Date.now()
let count = 0

const nowISO = new Date().toISOString()

while (count < times) {
  var docs = new Array(batchSize)
  for (var i = 0; i < batchSize; i++) {
    docs[i] = {
      versionId: String(count),
      docId: keys[Math.floor(Math.random() * keys.length)],
      links: count > 0 ? [String(count - 1)] : [],
      updatedAt: nowISO,
    }
    count++
  }
  indexer.batch(docs)
}

var elapsed = Date.now() - start
console.log(`${elapsed}ms`)
cleanup()
