import { lintProblemBank } from "../src/problems/problem-bank-lint.js"

const result = lintProblemBank()

if (result.warnings.length > 0) {
  process.stdout.write(`Problem bank warnings (${result.warnings.length}):\n`)
  result.warnings.forEach((warning) => {
    process.stdout.write(`- ${warning}\n`)
  })
  process.stdout.write("\n")
}

if (!result.ok) {
  process.stderr.write(`Problem bank lint failed (${result.errors.length} errors):\n`)
  result.errors.forEach((error) => {
    process.stderr.write(`- ${error}\n`)
  })
  process.exit(1)
}

process.stdout.write("Problem bank lint passed.\n")

