import { copyFile, mkdir, readdir } from "node:fs/promises"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"

const repoRoot = resolve(".")
const generatedDir = join(repoRoot, "src", "frontend", ".generated-client")
const outputDir = join(repoRoot, "src", "frontend")

function runTypeScriptBuild() {
  const result = spawnSync(
    process.execPath,
    [
      "./node_modules/typescript/bin/tsc",
      "-p",
      "tsconfig.frontend-client.json"
    ],
    {
      cwd: repoRoot,
      stdio: "inherit"
    }
  )

  if (result.status !== 0) {
    throw new Error("Frontend client TypeScript build failed.")
  }
}

async function publishBuiltScripts() {
  await mkdir(outputDir, { recursive: true })
  const entries = await readdir(generatedDir, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".js")) {
      continue
    }

    await copyFile(
      join(generatedDir, entry.name),
      join(outputDir, entry.name)
    )
  }
}

runTypeScriptBuild()
await publishBuiltScripts()
