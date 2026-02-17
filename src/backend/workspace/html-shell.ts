import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const currentDir = dirname(fileURLToPath(import.meta.url))
export const staticAssetsDir = join(currentDir, "..", "..", "..", "dist", "static")

const staticAssetVersion =
  process.env.STATIC_ASSET_VERSION ??
  String(Math.floor(Date.now() / 1000))

export function renderHtmlDocument(
  bodyMarkup: string,
  options: { includeClientScript?: boolean } = {}
): string {
  const versionQuery = `?v=${encodeURIComponent(staticAssetVersion)}`
  const clientScriptTag = options.includeClientScript
    ? `\n    <script type="module" src="/static/workspace-client/index.js${versionQuery}"></script>`
    : ""

  return `<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Kernel Labs</title>
    <script>try{var t=localStorage.getItem("deepmlsr.theme.v1");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/static/workspace-client/problem-workspace.css${versionQuery}" data-theme="deepmlsr-workspace">${clientScriptTag}
  </head>
  <body>
    ${bodyMarkup}
  </body>
</html>`
}
