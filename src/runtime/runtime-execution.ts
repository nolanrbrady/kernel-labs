import { execFileSync } from "node:child_process"

import { getRuntimeProblemFixture } from "../problems/runtime-problem-fixtures.js"

export type RuntimeRunRequest = {
  problemId: string
  userCode: string
}

export type RuntimeRunSuccess = {
  status: "success"
  problemId: string
  deterministicSeed: number
  inputs: Record<string, unknown>
  output: number[][]
  testCaseResults: RuntimeTestCaseResult[]
  runtimeStdout: string
  preloadedPackages: string[]
  message: string
}

export type RuntimeRunFailure = {
  status: "failure"
  problemId: string
  errorCode:
    | "INCOMPLETE_CODE"
    | "UNSUPPORTED_CODE"
    | "UNKNOWN_PROBLEM"
    | "EXECUTION_ERROR"
    | "INVALID_OUTPUT"
  message: string
  actionableSteps: string[]
  supportiveTone: true
  runtimeStdout?: string
  preloadedPackages?: string[]
}

export type RuntimeRunResult = RuntimeRunSuccess | RuntimeRunFailure

export type RuntimeTestCaseResult = {
  id: string
  name: string
  passed: boolean
  message: string
}

function createFailureResult(options: {
  problemId: string
  errorCode: RuntimeRunFailure["errorCode"]
  message: string
  actionableSteps?: string[]
  runtimeStdout?: string
  preloadedPackages?: string[]
}): RuntimeRunFailure {
  return {
    status: "failure",
    problemId: options.problemId,
    errorCode: options.errorCode,
    message: options.message,
    actionableSteps:
      options.actionableSteps ??
      [
        "Implement a first executable version of the required function.",
        "Run against the toy input and verify tensor shapes before submitting."
      ],
    supportiveTone: true,
    runtimeStdout: options.runtimeStdout,
    preloadedPackages: options.preloadedPackages
  }
}

type PythonRunnerSuccess = {
  status: "success"
  output: unknown
  stdout: string
  preloaded_packages: string[]
}

type PythonRunnerFailure = {
  status: "failure"
  errorCode: "EXECUTION_ERROR"
  message: string
  stdout: string
  preloaded_packages: string[]
}

const PYTHON_RUNTIME_RUNNER = `
import io
import json
import sys
import importlib
import importlib.util
from contextlib import redirect_stdout

import numpy as np

class LazyModule:
    def __init__(self, module_name):
        self._module_name = module_name
        self._loaded_module = None

    def _load(self):
        if self._loaded_module is None:
            self._loaded_module = importlib.import_module(self._module_name)
        return self._loaded_module

    def __getattr__(self, name):
        return getattr(self._load(), name)

def module_available(module_name):
    return importlib.util.find_spec(module_name) is not None

pd = LazyModule("pandas") if module_available("pandas") else None
torch = LazyModule("torch") if module_available("torch") else None
PRELOADED_PACKAGES = []
PRELOADED_PACKAGES.append("numpy")
if pd is not None:
    PRELOADED_PACKAGES.append("pandas")
if torch is not None:
    PRELOADED_PACKAGES.append("torch")

def to_serializable(value):
    if hasattr(value, "detach") and hasattr(value, "cpu") and hasattr(value, "tolist"):
        try:
            return value.detach().cpu().tolist()
        except Exception:
            pass
    if hasattr(value, "to_numpy"):
        try:
            numpy_value = value.to_numpy()
            if hasattr(numpy_value, "tolist"):
                return numpy_value.tolist()
        except Exception:
            pass
    if hasattr(value, "tolist"):
        try:
            return value.tolist()
        except Exception:
            pass
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, (list, tuple)):
        return [to_serializable(item) for item in value]
    if isinstance(value, (float, int, bool)) or value is None:
        return value
    raise TypeError("Unsupported output type")

def fail(message, stdout_text):
    print(json.dumps({
        "status": "failure",
        "errorCode": "EXECUTION_ERROR",
        "message": message,
        "stdout": stdout_text,
        "preloaded_packages": PRELOADED_PACKAGES
    }))

def main():
    payload = json.loads(sys.stdin.read())
    captured_stdout = io.StringIO()
    globals_dict = {"__builtins__": __builtins__}
    if np is not None:
        globals_dict["np"] = np
        globals_dict["numpy"] = np
    if pd is not None:
        globals_dict["pd"] = pd
        globals_dict["pandas"] = pd
    if torch is not None:
        globals_dict["torch"] = torch
    user_code = payload.get("user_code", "")
    function_name = payload.get("function_name", "")
    inputs = payload.get("inputs", {})
    input_order = payload.get("input_order", [])

    if not isinstance(input_order, list):
        input_order = []

    def coerce_input(value):
        if value is None:
            return None
        if isinstance(value, (int, float, bool)):
            return value
        if isinstance(value, list):
            try:
                return np.array(value, dtype=float)
            except Exception:
                return value
        return value

    try:
        with redirect_stdout(captured_stdout):
            exec(user_code, globals_dict)
    except Exception as error:
        fail(f"Code could not be parsed or loaded: {error}", captured_stdout.getvalue())
        return

    fn = globals_dict.get(function_name)
    if not callable(fn):
        fail(f"Expected callable '{function_name}' was not found.", captured_stdout.getvalue())
        return

    args = []
    for name in input_order:
        args.append(coerce_input(inputs.get(name)))

    try:
        with redirect_stdout(captured_stdout):
            attempt_args = list(args)
            while True:
                try:
                    result = fn(*attempt_args)
                    break
                except TypeError:
                    if len(attempt_args) <= 1:
                        raise
                    attempt_args = attempt_args[:-1]
    except Exception as error:
        fail(f"Code raised an exception while running: {error}", captured_stdout.getvalue())
        return

    try:
        output = to_serializable(result)
    except Exception as error:
        fail(f"Output could not be serialized into a numeric tensor: {error}", captured_stdout.getvalue())
        return

    print(json.dumps({
        "status": "success",
        "output": output,
        "stdout": captured_stdout.getvalue(),
        "preloaded_packages": PRELOADED_PACKAGES
    }))

if __name__ == "__main__":
    main()
`

function isMatrix(candidateOutput: unknown): candidateOutput is number[][] {
  return (
    Array.isArray(candidateOutput) &&
    candidateOutput.every((row) => {
      return (
        Array.isArray(row) &&
        row.every((value) => {
          return typeof value === "number" && Number.isFinite(value)
        })
      )
    })
  )
}

function isClose(left: number, right: number): boolean {
  const absoluteTolerance = 1e-6
  const relativeTolerance = 1e-5
  const delta = Math.abs(left - right)

  if (delta <= absoluteTolerance) {
    return true
  }

  const scale = Math.max(1, Math.abs(left), Math.abs(right))
  return delta <= relativeTolerance * scale
}

function areMatricesClose(actual: number[][], expected: number[][]): boolean {
  if (actual.length !== expected.length) {
    return false
  }

  for (let rowIndex = 0; rowIndex < actual.length; rowIndex += 1) {
    const actualRow = actual[rowIndex] ?? []
    const expectedRow = expected[rowIndex] ?? []

    if (actualRow.length !== expectedRow.length) {
      return false
    }

    for (let columnIndex = 0; columnIndex < actualRow.length; columnIndex += 1) {
      const actualValue = actualRow[columnIndex]
      const expectedValue = expectedRow[columnIndex]

      if (!isClose(actualValue, expectedValue)) {
        return false
      }
    }
  }

  return true
}

function evaluateSingleTestCase(options: {
  testCaseId: string
  testCaseName: string
  expectedOutput: number[][]
  executionResult: PythonRunnerSuccess | PythonRunnerFailure
}): RuntimeTestCaseResult {
  if (options.executionResult.status === "failure") {
    return {
      id: options.testCaseId,
      name: options.testCaseName,
      passed: false,
      message: options.executionResult.message
    }
  }

  if (!isMatrix(options.executionResult.output)) {
    return {
      id: options.testCaseId,
      name: options.testCaseName,
      passed: false,
      message: "Output was not a 2D numeric tensor."
    }
  }

  const passed = areMatricesClose(
    options.executionResult.output,
    options.expectedOutput
  )
  return {
    id: options.testCaseId,
    name: options.testCaseName,
    passed,
    message: passed
      ? "Deterministic expected output matched."
      : "Output did not match deterministic expected output."
  }
}

function runPythonUserCode(options: {
  userCode: string
  functionName: string
  inputs: Record<string, unknown>
  inputOrder: string[]
}): PythonRunnerSuccess | PythonRunnerFailure {
  try {
    const stdout = execFileSync(
      "python3",
      ["-c", PYTHON_RUNTIME_RUNNER],
      {
        input: JSON.stringify({
          user_code: options.userCode,
          function_name: options.functionName,
          inputs: options.inputs,
          input_order: options.inputOrder
        }),
        encoding: "utf8",
        timeout: 10000,
        maxBuffer: 1024 * 1024
      }
    )
    const parsed = JSON.parse(stdout) as
      | PythonRunnerSuccess
      | PythonRunnerFailure

    if (parsed.status === "success") {
      return parsed
    }

    return {
      status: "failure",
      errorCode: "EXECUTION_ERROR",
      message: parsed.message,
      stdout: parsed.stdout,
      preloaded_packages: parsed.preloaded_packages
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Code execution failed unexpectedly."
    return {
      status: "failure",
      errorCode: "EXECUTION_ERROR",
      message,
      stdout: "",
      preloaded_packages: []
    }
  }
}

export function runStarterCodeAgainstToyInputs(
  request: RuntimeRunRequest
): RuntimeRunResult {
  const problemId = request.problemId.trim()
  const userCode = request.userCode

  if (userCode.trim().length === 0) {
    return createFailureResult({
      problemId,
      errorCode: "INCOMPLETE_CODE",
      message:
        "Run could not execute yet because the solution is empty."
    })
  }

  if (/throw\s+new\s+Error/.test(userCode)) {
    return createFailureResult({
      problemId,
      errorCode: "UNSUPPORTED_CODE",
      message:
        "Run expects Python function code for this workspace problem."
    })
  }

  const fixture = getRuntimeProblemFixture(problemId)
  if (!fixture) {
    return createFailureResult({
      problemId,
      errorCode: "UNKNOWN_PROBLEM",
      message:
        "This problem is not available in the runtime yet.",
      actionableSteps: [
        "Pick a problem available in the Question Bank runtime set.",
        "If this should be supported, add a fixture and reference evaluator contract."
      ]
    })
  }

  const executionResult = runPythonUserCode({
    userCode,
    functionName: fixture.functionName,
    inputs: fixture.inputs,
    inputOrder: fixture.inputOrder
  })

  if (executionResult.status === "failure") {
    return createFailureResult({
      problemId,
      errorCode: executionResult.errorCode,
      message: executionResult.message,
      actionableSteps: [
        "Check function signature and ensure the function returns a numeric tensor.",
        "Use Run repeatedly to inspect output shape and values before submitting."
      ],
      runtimeStdout: executionResult.stdout,
      preloadedPackages: executionResult.preloaded_packages
    })
  }

  if (!isMatrix(executionResult.output)) {
    return createFailureResult({
      problemId,
      errorCode: "INVALID_OUTPUT",
      message:
        "Run completed, but output is not a 2D numeric tensor.",
      actionableSteps: [
        "Return a 2D numeric array-like output for this toy problem.",
        "Inspect run output and align shape with expected tensor dimensions."
      ]
    })
  }

  const testCaseResults = fixture.testCases.map((testCase, index) => {
    const testCaseExecutionResult =
      index === 0
        ? executionResult
        : runPythonUserCode({
            userCode,
            functionName: fixture.functionName,
            inputs: testCase.inputs,
            inputOrder: fixture.inputOrder
          })

    return evaluateSingleTestCase({
      testCaseId: testCase.id,
      testCaseName: testCase.name,
      expectedOutput: testCase.expectedOutput,
      executionResult: testCaseExecutionResult
    })
  })

  return {
    status: "success",
    problemId,
    deterministicSeed: fixture.deterministicSeed,
    inputs: fixture.inputs,
    output: executionResult.output,
    testCaseResults,
    runtimeStdout: executionResult.stdout,
    preloadedPackages: executionResult.preloaded_packages,
    message: "Run complete. Output generated by your submitted code on deterministic toy tensors."
  }
}
