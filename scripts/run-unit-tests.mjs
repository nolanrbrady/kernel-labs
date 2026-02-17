import { readdir } from "node:fs/promises"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"

const repoRoot = resolve(".")
const testsRoot = join(repoRoot, "tests")

const TEST_FILE_PATTERN = /\.(test)\.(js|ts|tsx)$/

async function collectTestFiles(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolutePath = join(directoryPath, entry.name)
    if (entry.isDirectory()) {
      const childFiles = await collectTestFiles(absolutePath)
      files.push(...childFiles)
      continue
    }

    if (entry.isFile() && TEST_FILE_PATTERN.test(entry.name)) {
      files.push(absolutePath)
    }
  }

  return files
}

const testFiles = (await collectTestFiles(testsRoot)).sort()

if (testFiles.length === 0) {
  throw new Error("No unit test files were discovered under tests/.")
}

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", ...testFiles],
  {
    cwd: repoRoot,
    stdio: "inherit"
  }
)

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
