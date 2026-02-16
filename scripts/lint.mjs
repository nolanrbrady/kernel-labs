import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT_DIRECTORIES = ["scripts", "src", "tests"];
const SCRIPT_EXTENSIONS = new Set([".js", ".mjs", ".cjs"]);

async function collectScriptFiles(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectScriptFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && SCRIPT_EXTENSIONS.has(extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

async function lintFile(filePath) {
  const syntaxResult = spawnSync(process.execPath, ["--check", filePath], {
    stdio: "pipe"
  });

  if (syntaxResult.status !== 0) {
    throw new Error(
      `Syntax check failed for ${filePath}:\n${syntaxResult.stderr.toString()}`
    );
  }

  const contents = await readFile(filePath, "utf8");
  const lines = contents.split("\n");

  lines.forEach((line, index) => {
    if (/\s+$/.test(line)) {
      throw new Error(
        `Trailing whitespace detected in ${filePath}:${index + 1}`
      );
    }
  });
}

async function main() {
  const files = [];

  for (const directory of ROOT_DIRECTORIES) {
    files.push(...(await collectScriptFiles(directory)));
  }

  if (files.length === 0) {
    throw new Error("No script files found to lint.");
  }

  for (const file of files.sort()) {
    await lintFile(file);
  }
}

await main();
