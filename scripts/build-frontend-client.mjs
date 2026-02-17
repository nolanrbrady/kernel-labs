import { copyFile, mkdir, rm } from "node:fs/promises"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"

const repoRoot = resolve(".")
const staticWorkspaceDir = join(
  repoRoot,
  "dist",
  "static",
  "workspace-client"
)
const sourceFrontendDir = join(repoRoot, "src", "frontend")
const aceBuildSourceDir = join(repoRoot, "node_modules", "ace-builds", "src-noconflict")
const aceVendorOutputDir = join(staticWorkspaceDir, "vendor", "ace")

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

async function resetOutputDir() {
  await rm(staticWorkspaceDir, { recursive: true, force: true })
  await mkdir(staticWorkspaceDir, { recursive: true })
}

async function copyWorkspaceStyles() {
  await copyFile(
    join(sourceFrontendDir, "problem-workspace.css"),
    join(staticWorkspaceDir, "problem-workspace.css")
  )
}

async function copyAceAssets() {
  await mkdir(aceVendorOutputDir, { recursive: true })

  const aceFiles = [
    "ace.js",
    "mode-python.js",
    "theme-github.js",
    "theme-tomorrow_night.js"
  ]

  await Promise.all(
    aceFiles.map(async (fileName) => {
      await copyFile(
        join(aceBuildSourceDir, fileName),
        join(aceVendorOutputDir, fileName)
      )
    })
  )
}

await resetOutputDir()
runTypeScriptBuild()
await copyWorkspaceStyles()
await copyAceAssets()
