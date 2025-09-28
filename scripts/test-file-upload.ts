#!/usr/bin/env npx tsx

import { ScriptParser } from '../lib/parser/script-parser'
import { readFileSync } from 'fs'
import { join } from 'path'

console.log('Testing File Upload Restrictions\n')
console.log('='.repeat(50))

const parser = new ScriptParser()

// Test files
const testFiles = [
  { path: '/tmp/test-files/test-script.txt', name: 'test-script.txt' },
  { path: '/tmp/test-files/test-script.md', name: 'test-script.md' },
  { path: '/tmp/test-files/test-script.fdx', name: 'test-script.fdx' },
  { path: '/tmp/test-files/test-script.fountain', name: 'test-script.fountain' },
]

for (const file of testFiles) {
  console.log(`\nTesting: ${file.name}`)
  console.log('-'.repeat(30))

  try {
    const buffer = readFileSync(file.path)
    const result = parser.parseFile(buffer, file.name)

    if (result.errors && result.errors.length > 0) {
      console.log(`❌ Parsing failed with errors:`)
      result.errors.forEach(err => console.log(`   - ${err.message}`))
    } else {
      console.log(`✅ Successfully parsed!`)
      console.log(`   - Scenes: ${result.scenes.length}`)
      console.log(`   - Characters: ${result.characters.length}`)
      console.log(`   - Dialogues: ${result.totalDialogues}`)
    }
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

console.log('\n' + '='.repeat(50))
console.log('Testing Complete!')