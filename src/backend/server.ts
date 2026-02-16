import { once } from "node:events"
import { createServer, type Server as HttpServer } from "node:http"

import { createApiApp } from "./api-app.js"

const DEFAULT_PORT = 3000

export type StartedServer = {
  close: () => Promise<void>
  port: number
  server: HttpServer
}

export function resolvePort(rawPort: string | undefined): number {
  if (rawPort === undefined || rawPort.trim() === "") {
    return DEFAULT_PORT
  }

  const parsed = Number.parseInt(rawPort, 10)

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(
      `Invalid PORT value "${rawPort}". Expected an integer greater than or equal to 0.`
    )
  }

  return parsed
}

export async function startServer(options: { port?: number } = {}): Promise<StartedServer> {
  const app = createApiApp()
  const server = createServer(app)
  const port = options.port ?? resolvePort(process.env.PORT)

  server.listen(port)
  await once(server, "listening")

  const address = server.address()
  const resolvedPort =
    address !== null && typeof address === "object" ? address.port : port

  return {
    server,
    port: resolvedPort,
    close: () => {
      return new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }

          resolve()
        })
      })
    }
  }
}
