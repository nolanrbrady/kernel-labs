import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"
import { once } from "node:events"
import { createServer } from "node:net"

import { expect, request as playwrightRequest, test } from "@playwright/test"

type RuntimeSuccessPayload = {
  status: "success"
  problemId: string
  output: number[][]
}

type EvaluatorPayload = {
  correctness: "pass" | "partial" | "fail"
  explanation: string
}

type SchedulerDecisionPayload = {
  nextIntervalDays: number
  resurfacingPriority: number
}

type SchedulerPlanPayload = {
  assignedProblemIds: string[]
  resurfacedAssignedCount: number
}

type SubmissionPayload = {
  submissionAccepted: boolean
  nextState: {
    status: "active" | "done"
  }
}

let appProcess: ChildProcessWithoutNullStreams
let baseUrl: string

async function allocateFreePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer()

    server.on("error", reject)
    server.listen(0, () => {
      const address = server.address()

      if (address === null || typeof address === "string") {
        reject(new Error("Unable to allocate a free port for E2E tests."))
        return
      }

      const { port } = address
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve(port)
      })
    })
  })
}

async function waitForServerReady(url: string): Promise<void> {
  const deadline = Date.now() + 10_000

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/health`)

      if (response.ok) {
        return
      }
    } catch {
      // no-op: retry until timeout
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 100)
    })
  }

  throw new Error(`Server did not become ready at ${url} within timeout.`)
}

test.beforeAll(async () => {
  const port = await allocateFreePort()
  baseUrl = `http://127.0.0.1:${port}`
  appProcess = spawn(
    process.execPath,
    ["--import", "tsx", "src/backend/start.ts"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port)
      },
      stdio: "pipe"
    }
  )

  await waitForServerReady(baseUrl)
})

test.afterAll(async () => {
  if (!appProcess.killed && appProcess.exitCode === null) {
    appProcess.kill("SIGTERM")
    await once(appProcess, "exit")
  }
})

test("golden path covers landing, run, submit, schedule update, and session end", async () => {
  const apiContext = await playwrightRequest.newContext({
    baseURL: baseUrl
  })

  try {
    const landingResponse = await apiContext.get("/")
    const landingHtml = await landingResponse.text()

    expect(landingResponse.ok()).toBeTruthy()
    expect(landingHtml.includes("problem-workspace")).toBeTruthy()

    const problemId = "attention_scaled_dot_product_v1"
    const runResponse = await apiContext.post("/api/runtime/run", {
      data: {
        problemId,
        userCode:
          "def scaled_dot_product_attention(q, k, v, mask=None):\n    scores = q @ k.transpose(-1, -2)\n    return scores"
      }
    })
    const runPayload = (await runResponse.json()) as RuntimeSuccessPayload

    expect(runResponse.ok()).toBeTruthy()
    expect(runPayload.status).toBe("success")

    const evaluatorResponse = await apiContext.post("/api/evaluator/evaluate", {
      data: {
        problemId,
        candidateOutput: runPayload.output
      }
    })
    const evaluatorPayload = (await evaluatorResponse.json()) as EvaluatorPayload

    expect(evaluatorResponse.ok()).toBeTruthy()
    expect(["pass", "partial", "fail"].includes(evaluatorPayload.correctness)).toBeTruthy()

    const schedulerDecisionResponse = await apiContext.post(
      "/api/scheduler/decision",
      {
        data: {
          correctness: evaluatorPayload.correctness,
          timeSpentMinutes: 16,
          hintTierUsed: 1,
          priorSuccessfulCompletions: 0,
          daysSinceLastExposure: 2
        }
      }
    )
    const schedulerDecisionPayload =
      (await schedulerDecisionResponse.json()) as SchedulerDecisionPayload

    expect(schedulerDecisionResponse.ok()).toBeTruthy()
    expect(schedulerDecisionPayload.nextIntervalDays).toBeGreaterThanOrEqual(1)
    expect(schedulerDecisionPayload.resurfacingPriority).toBeGreaterThanOrEqual(0)

    const schedulerPlanResponse = await apiContext.post("/api/scheduler/plan", {
      data: {
        newProblemIds: [],
        resurfacedCandidates: [
          {
            problemId,
            resurfacingPriority: schedulerDecisionPayload.resurfacingPriority
          },
          {
            problemId: "rnn_hidden_state_update_v1",
            resurfacingPriority: 0.42
          }
        ]
      }
    })
    const schedulerPlanPayload =
      (await schedulerPlanResponse.json()) as SchedulerPlanPayload

    expect(schedulerPlanResponse.ok()).toBeTruthy()
    expect(schedulerPlanPayload.assignedProblemIds.length).toBe(1)
    expect(schedulerPlanPayload.resurfacedAssignedCount).toBeLessThanOrEqual(1)

    const submitResponse = await apiContext.post("/api/session/submit", {
      data: {
        sessionId: "golden-path-session-001",
        problemId,
        correctness: evaluatorPayload.correctness,
        explanation: evaluatorPayload.explanation,
        submittedAt: "2026-02-16T18:25:00Z"
      }
    })
    const submitPayload = (await submitResponse.json()) as SubmissionPayload

    expect(submitResponse.ok()).toBeTruthy()
    expect(submitPayload.submissionAccepted).toBeTruthy()
    expect(submitPayload.nextState.status).toBe("done")
  } finally {
    await apiContext.dispose()
  }
})

test("workspace UI buttons remain clickable when suggest-topic modal is hidden", async ({
  page
}) => {
  await page.goto(`${baseUrl}/`)

  await expect(page.locator("#suggest-topic-modal")).toBeHidden()
  await expect(page.locator("#session-timer-status")).toHaveText(
    "Session timer: not started (30:00 limit)."
  )

  await page.locator("#start-problem-button").click()
  await expect(page.locator("#session-timer-status")).toHaveText(
    "Session timer: 30:00 remaining."
  )

  await page.locator("#workspace-tab-library").click()
  await expect(page.locator("#workspace-library-tab-panel")).toBeVisible()
  await expect(page.locator("#workspace-problem-tab-panel")).toBeHidden()

  await page.locator("#workspace-tab-problem").click()
  await expect(page.locator("#workspace-problem-tab-panel")).toBeVisible()
  await expect(page.locator("#workspace-library-tab-panel")).toBeHidden()
})

test("clicking visible code surface focuses editor and allows typing", async ({
  page
}) => {
  await page.goto(`${baseUrl}/`)

  await expect(page.locator("#session-timer-status")).toHaveText(
    "Session timer: not started (30:00 limit)."
  )

  await page.locator(".code-editor-shell").click({ position: { x: 24, y: 24 } })
  await expect
    .poll(async () => {
      return await page.evaluate(() => {
        return document.activeElement && document.activeElement.id;
      });
    })
    .toBe("starter-code-editor")
  await expect(page.locator(".code-editor-shell")).toHaveClass(/is-editing/)
  await expect
    .poll(async () => {
      return await page.evaluate(() => {
        const highlight = document.getElementById("starter-code-highlight");
        if (!highlight) {
          return "missing";
        }
        return window.getComputedStyle(highlight).opacity;
      });
    })
    .toBe("1")

  await page.keyboard.type("a")
  await expect(page.locator("#session-timer-status")).toHaveText(
    "Session timer: 30:00 remaining."
  )
})
