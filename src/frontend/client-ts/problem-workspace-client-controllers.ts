// @ts-nocheck
/* Workspace client controller exports (module-based composition). */

export { EditorController } from "./problem-workspace-client-editor-controller.js";
export {
  WorkspaceTabController,
  VisibleTestCaseController,
  QuestionLibraryController
} from "./problem-workspace-client-workspace-controllers.js";
export {
  createWorkspaceApiAdapters,
  SessionController,
  SubmissionController
} from "./problem-workspace-client-session-controllers.js";
export { SuggestTopicController } from "./problem-workspace-client-topic-controller.js";
