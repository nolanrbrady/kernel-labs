// @ts-nocheck
/* Runtime/session API adapters and submission controllers. */
import { setText } from "./problem-workspace-client-controller-shared.js";
function createWorkspaceApiAdapters(options) {
    var safeOptions = options || {};
    var fetchImpl = safeOptions.fetchImpl;
    if (typeof fetchImpl !== "function" && typeof globalThis.fetch === "function") {
        fetchImpl = globalThis.fetch.bind(globalThis);
    }
    async function postJson(endpoint, payload) {
        if (typeof fetchImpl !== "function") {
            throw new Error("Fetch API unavailable.");
        }
        var response = await fetchImpl(endpoint, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload)
        });
        var responsePayload = await response.json();
        return {
            ok: response.ok,
            status: response.status,
            payload: responsePayload
        };
    }
    return {
        runRuntime: function (problemId, userCode) {
            return postJson("/api/runtime/run", {
                problemId: problemId,
                userCode: userCode
            });
        },
        evaluateOutput: function (problemId, candidateOutput) {
            return postJson("/api/evaluator/evaluate", {
                problemId: problemId,
                candidateOutput: candidateOutput
            });
        },
        submitSession: function (payload) {
            return postJson("/api/session/submit", payload);
        },
        syncAnonymousProgress: function (payload) {
            return postJson("/api/progress/anonymous", payload);
        },
        requestSchedulerDecision: function (payload) {
            return postJson("/api/scheduler/decision", payload);
        }
    };
}
class SessionController {
    constructor(options) {
        this.problemId = options.problemId;
        this.codeEditor = options.codeEditor;
        this.runButton = options.runButton;
        this.runStatus = options.runStatus;
        this.evaluationStatus = options.evaluationStatus;
        this.sessionStatus = options.sessionStatus;
        this.scheduleStatus = options.scheduleStatus;
        this.api = options.api;
        this.appendDebugLine = options.appendDebugLine;
        this.formatDebugValue = options.formatDebugValue;
        this.resetVisibleTestCaseStatuses = options.resetVisibleTestCaseStatuses;
        this.applyVisibleTestCaseResults = options.applyVisibleTestCaseResults;
        this.nowProvider =
            typeof options.nowProvider === "function"
                ? options.nowProvider
                : function () {
                    return Date.now();
                };
        this.sessionId = "session-" + this.nowProvider();
        this.lastEvaluation = null;
        this.runAttemptCount = 0;
    }
    getSessionId() {
        return this.sessionId;
    }
    getLastEvaluation() {
        return this.lastEvaluation;
    }
    formatValueForDebug(value) {
        if (typeof this.formatDebugValue === "function") {
            return this.formatDebugValue(value);
        }
        try {
            return JSON.stringify(value, null, 2);
        }
        catch (error) {
            return String(value);
        }
    }
    readEditorCode() {
        if (this.codeEditor && typeof this.codeEditor.value === "string") {
            return this.codeEditor.value;
        }
        return "";
    }
    appendDebug(text) {
        if (typeof this.appendDebugLine === "function") {
            this.appendDebugLine(text);
        }
    }
    resetVisibleCases(statusLabel) {
        if (typeof this.resetVisibleTestCaseStatuses === "function") {
            this.resetVisibleTestCaseStatuses(statusLabel);
        }
    }
    applyVisibleCaseResults(results) {
        if (typeof this.applyVisibleTestCaseResults === "function") {
            this.applyVisibleTestCaseResults(results);
        }
    }
    async runCurrentCode() {
        if (this.runButton) {
            this.runButton.disabled = true;
        }
        this.runAttemptCount += 1;
        setText(this.runStatus, "Running code against toy tensors...");
        setText(this.evaluationStatus, "Awaiting evaluator result...");
        setText(this.sessionStatus, "Session in progress.");
        this.resetVisibleCases("Running...");
        this.appendDebug("$ run #" + this.runAttemptCount + " (" + this.problemId + ")");
        this.appendDebug("> executing code against deterministic toy tensors...");
        setText(this.scheduleStatus, "Scheduling status: waiting for submission.");
        try {
            var runtimeResult = await this.api.runRuntime(this.problemId, this.readEditorCode());
            var runtimePayload = runtimeResult.payload || {};
            if (!runtimeResult.ok) {
                setText(this.runStatus, "Run unavailable right now. Please try again.");
                setText(this.evaluationStatus, "Evaluation skipped.");
                this.resetVisibleCases("Run unavailable");
                this.appendDebug("! runtime unavailable: " + runtimeResult.status);
                return;
            }
            if (runtimePayload.status !== "success") {
                setText(this.runStatus, runtimePayload.message || "Run needs one more iteration.");
                setText(this.evaluationStatus, "Evaluation skipped until run succeeds.");
                this.resetVisibleCases("Run failed");
                if (Array.isArray(runtimePayload.preloadedPackages)) {
                    this.appendDebug("> preloaded packages: " + runtimePayload.preloadedPackages.join(", "));
                }
                if (typeof runtimePayload.runtimeStdout === "string" &&
                    runtimePayload.runtimeStdout.trim().length > 0) {
                    this.appendDebug("> stdout:");
                    this.appendDebug(runtimePayload.runtimeStdout.trimEnd());
                }
                this.appendDebug("! runtime failure: " +
                    (runtimePayload.errorCode || "RUNTIME_FAILURE") +
                    " - " +
                    (runtimePayload.message || "Run failed."));
                if (Array.isArray(runtimePayload.actionableSteps)) {
                    this.appendDebug("> next steps: " + runtimePayload.actionableSteps.join(" | "));
                }
                return;
            }
            setText(this.runStatus, runtimePayload.message || "Run complete.");
            this.appendDebug("> runtime success: " + (runtimePayload.message || "Run complete."));
            if (Array.isArray(runtimePayload.preloadedPackages)) {
                this.appendDebug("> preloaded packages: " + runtimePayload.preloadedPackages.join(", "));
            }
            if (typeof runtimePayload.runtimeStdout === "string" &&
                runtimePayload.runtimeStdout.trim().length > 0) {
                this.appendDebug("> stdout:");
                this.appendDebug(runtimePayload.runtimeStdout.trimEnd());
            }
            this.appendDebug("> output:");
            this.appendDebug(this.formatValueForDebug(runtimePayload.output));
            this.applyVisibleCaseResults(runtimePayload.testCaseResults);
            var evaluatorResult = await this.api.evaluateOutput(this.problemId, runtimePayload.output);
            var evaluatorPayload = evaluatorResult.payload || {};
            if (!evaluatorResult.ok) {
                setText(this.evaluationStatus, "Evaluator unavailable right now.");
                this.appendDebug("! evaluator unavailable: " + evaluatorResult.status);
                return;
            }
            this.lastEvaluation = evaluatorPayload;
            setText(this.evaluationStatus, "Evaluation: " +
                evaluatorPayload.correctness +
                " - " +
                evaluatorPayload.explanation);
            this.appendDebug("> evaluator: " +
                evaluatorPayload.correctness +
                " - " +
                evaluatorPayload.explanation);
        }
        catch (error) {
            setText(this.runStatus, "Run encountered a temporary issue. You can still submit this session.");
            setText(this.evaluationStatus, "Evaluation unavailable for this run.");
            this.resetVisibleCases("Run interrupted");
            this.appendDebug("! runtime exception: temporary issue while running.");
        }
        finally {
            if (this.runButton) {
                this.runButton.disabled = false;
            }
        }
    }
    bind() {
        if (!this.runButton) {
            return;
        }
        this.runButton.addEventListener("click", function () {
            return this.runCurrentCode();
        }.bind(this));
    }
}
class SubmissionController {
    constructor(options) {
        this.problemId = options.problemId;
        this.submitButton = options.submitButton;
        this.sessionStatus = options.sessionStatus;
        this.scheduleStatus = options.scheduleStatus;
        this.sessionTimerStatus = options.sessionTimerStatus;
        this.timerCapMessage = options.timerCapMessage;
        this.api = options.api;
        this.appendDebugLine = options.appendDebugLine;
        this.readLocalProgress = options.readLocalProgress;
        this.persistAnonymousProgress = options.persistAnonymousProgress;
        this.getPriorSuccessfulCompletions = options.getPriorSuccessfulCompletions;
        this.getDaysSinceLastExposure = options.getDaysSinceLastExposure;
        this.getSessionTimeSpentMinutes = options.getSessionTimeSpentMinutes;
        this.getHintTierUsed = options.getHintTierUsed;
        this.getSessionId = options.getSessionId;
        this.getLastEvaluation = options.getLastEvaluation;
        this.stopSessionTimer = options.stopSessionTimer;
        this.sessionSubmitted = false;
        this.submissionInProgress = false;
    }
    isValidCorrectness(value) {
        return value === "pass" || value === "partial" || value === "fail";
    }
    hasSubmitted() {
        return this.sessionSubmitted;
    }
    isSubmissionInProgress() {
        return this.submissionInProgress;
    }
    appendDebug(text) {
        if (typeof this.appendDebugLine === "function") {
            this.appendDebugLine(text);
        }
    }
    async syncAnonymousProgress(progress) {
        try {
            await this.api.syncAnonymousProgress(progress);
        }
        catch (error) {
            // noop: sync is best-effort and must not block session completion
        }
    }
    async updateSchedulerDecision(correctness, priorProgress) {
        setText(this.scheduleStatus, "Scheduling status: computing next resurfacing window...");
        try {
            var schedulerResult = await this.api.requestSchedulerDecision({
                correctness: correctness,
                timeSpentMinutes: this.getSessionTimeSpentMinutes(),
                hintTierUsed: this.getHintTierUsed(),
                priorSuccessfulCompletions: this.getPriorSuccessfulCompletions(priorProgress),
                daysSinceLastExposure: this.getDaysSinceLastExposure(priorProgress)
            });
            var schedulerPayload = schedulerResult.payload || {};
            if (!schedulerResult.ok) {
                setText(this.scheduleStatus, "Scheduling status: unavailable right now. A next problem will still be ready.");
                return;
            }
            setText(this.scheduleStatus, "Scheduling status: next resurfacing in " +
                schedulerPayload.nextIntervalDays +
                " day(s), priority " +
                schedulerPayload.resurfacingPriority +
                ".");
        }
        catch (error) {
            setText(this.scheduleStatus, "Scheduling status: temporarily unavailable. Your session is still complete.");
        }
    }
    async submitSession(submitSource) {
        if (this.sessionSubmitted || this.submissionInProgress) {
            return;
        }
        this.submissionInProgress = true;
        if (this.submitButton) {
            this.submitButton.disabled = true;
        }
        var lastEvaluation = this.getLastEvaluation();
        var correctness = lastEvaluation && this.isValidCorrectness(lastEvaluation.correctness)
            ? lastEvaluation.correctness
            : "fail";
        var explanation = lastEvaluation && typeof lastEvaluation.explanation === "string"
            ? lastEvaluation.explanation
            : "Submitted without a completed successful run.";
        var priorProgress = this.readLocalProgress();
        setText(this.sessionStatus, "Submitting session...");
        this.appendDebug("$ submit (" + this.problemId + ")");
        setText(this.scheduleStatus, "Scheduling status: preparing scheduler decision...");
        try {
            var submitResult = await this.api.submitSession({
                sessionId: this.getSessionId(),
                problemId: this.problemId,
                correctness: correctness,
                explanation: explanation
            });
            var submitPayload = submitResult.payload || {};
            if (!submitResult.ok) {
                setText(this.sessionStatus, "Submission temporarily unavailable. Please retry.");
                if (submitSource === "timer-cap") {
                    setText(this.timerCapMessage, "30 minutes reached. Auto-submit could not complete; please retry submit.");
                }
                return;
            }
            this.sessionSubmitted = true;
            if (typeof this.stopSessionTimer === "function") {
                this.stopSessionTimer();
            }
            setText(this.sessionStatus, "Session status: " +
                submitPayload.nextState.status +
                ". " +
                submitPayload.supportiveFeedback);
            setText(this.sessionTimerStatus, "Session timer: completed.");
            if (submitSource === "timer-cap") {
                setText(this.timerCapMessage, "30-minute cap reached. Your session was submitted automatically.");
            }
            this.appendDebug("> submit accepted: " +
                submitPayload.nextState.status +
                " - " +
                submitPayload.supportiveFeedback);
            var updatedProgress = this.persistAnonymousProgress(correctness);
            await this.syncAnonymousProgress(updatedProgress);
            await this.updateSchedulerDecision(correctness, priorProgress);
        }
        catch (error) {
            setText(this.sessionStatus, "Submission encountered a temporary issue. Please retry.");
            if (submitSource === "timer-cap") {
                setText(this.timerCapMessage, "30 minutes reached. Auto-submit encountered an issue; please retry submit.");
            }
        }
        finally {
            this.submissionInProgress = false;
            if (this.submitButton) {
                this.submitButton.disabled = false;
            }
        }
    }
    bind() {
        if (!this.submitButton) {
            return;
        }
        this.submitButton.addEventListener("click", function () {
            return this.submitSession("manual");
        }.bind(this));
    }
}
export { createWorkspaceApiAdapters, SessionController, SubmissionController };
