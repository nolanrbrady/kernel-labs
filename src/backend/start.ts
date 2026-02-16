import { startServer } from "./server.js"

const startedServer = await startServer()

process.stdout.write(
  `DeepML-SR started. Open http://localhost:${startedServer.port}\n`
)
