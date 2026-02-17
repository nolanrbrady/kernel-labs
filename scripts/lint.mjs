import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT_DIRECTORIES = ["scripts", "src", "tests"];
const LINTABLE_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx"]);
const SYNTAX_CHECK_EXTENSIONS = new Set([".js", ".mjs", ".cjs"]);

async function collectScriptFiles(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectScriptFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && LINTABLE_EXTENSIONS.has(extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

async function lintFile(filePath) {
  if (SYNTAX_CHECK_EXTENSIONS.has(extname(filePath))) {
    const syntaxResult = spawnSync(process.execPath, ["--check", filePath], {
      stdio: "pipe"
    });

    if (syntaxResult.status !== 0) {
      throw new Error(
        `Syntax check failed for ${filePath}:\n${syntaxResult.stderr.toString()}`
      );
    }
  }

  const contents = await readFile(filePath, "utf8");
  const starterCodeLiteralPattern =
    /starterCode\s*:\s*(["'])(?:\\.|(?!\1)[\s\S])*?\1/g;
  let starterCodeLiteral = starterCodeLiteralPattern.exec(contents);

  while (starterCodeLiteral) {
    if (starterCodeLiteral[0].includes("\\n")) {
      const lineNumber = contents.slice(0, starterCodeLiteral.index).split("\n").length;
      throw new Error(
        `starterCode must use a multi-line template literal (no \\n escapes) in ${filePath}:${lineNumber}`
      );
    }
    starterCodeLiteral = starterCodeLiteralPattern.exec(contents);
  }

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

  const problemBankLint = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/problem-bank-lint.ts"],
    { stdio: "inherit" }
  );

  if (problemBankLint.status !== 0) {
    throw new Error("Problem bank lint failed.");
  }
}

await main();
