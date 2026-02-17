import type {
  Express,
  Request,
  Response
} from "express"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

import {
  ProblemWorkspaceScreen,
  createEditorFirstLandingRoute
} from "../../frontend/problem-workspace-route.js"
import { renderHtmlDocument } from "../workspace/html-shell.js"
import { resolveWorkspaceProblem } from "../workspace/problem-workspace-service.js"

function renderCreateAccountPageMarkup(): string {
  return `
<main style="max-width:560px;margin:3rem auto;padding:0 1rem;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
  <h1 style="margin:0 0 0.75rem;font-size:2rem;line-height:1.2;">Create Account</h1>
  <p style="margin:0 0 1.5rem;color:#4b5563;line-height:1.5;">
    Account creation is optional and never blocks solving. Create one to keep your progress connected.
  </p>
  <form id="create-account-form" style="display:grid;gap:0.85rem;padding:1rem;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;">
    <label for="account-email" style="font-weight:600;font-size:0.9rem;">Email</label>
    <input id="account-email" name="email" type="email" required autocomplete="email" placeholder="you@example.com" style="padding:0.65rem 0.75rem;border:1px solid #d1d5db;border-radius:8px;font-size:0.95rem;" />

    <label for="account-password" style="font-weight:600;font-size:0.9rem;">Password</label>
    <input id="account-password" name="password" type="password" required minlength="8" autocomplete="new-password" placeholder="At least 8 characters" style="padding:0.65rem 0.75rem;border:1px solid #d1d5db;border-radius:8px;font-size:0.95rem;" />

    <label for="account-display-name" style="font-weight:600;font-size:0.9rem;">Display Name (optional)</label>
    <input id="account-display-name" name="displayName" type="text" maxlength="80" autocomplete="name" placeholder="How should we address you?" style="padding:0.65rem 0.75rem;border:1px solid #d1d5db;border-radius:8px;font-size:0.95rem;" />

    <button id="create-account-submit" type="submit" style="margin-top:0.35rem;padding:0.75rem 1rem;border:0;border-radius:9999px;background:#111827;color:#ffffff;font-weight:600;cursor:pointer;">
      Create Account
    </button>
  </form>
  <p id="create-account-status" style="min-height:1.3rem;margin:0.9rem 0 0;color:#374151;"></p>
  <p style="margin:1.25rem 0 0;display:flex;gap:1rem;flex-wrap:wrap;">
    <a href="/auth/sign-in" style="color:#111827;text-decoration:none;border-bottom:1px solid #111827;">Already have an account? Sign in</a>
    <a href="/" style="color:#111827;text-decoration:none;border-bottom:1px solid #111827;">Back to workspace</a>
  </p>
</main>
<script>
(() => {
  const form = document.getElementById("create-account-form");
  const statusNode = document.getElementById("create-account-status");
  const submitButton = document.getElementById("create-account-submit");
  const emailInput = document.getElementById("account-email");
  const passwordInput = document.getElementById("account-password");
  const displayNameInput = document.getElementById("account-display-name");
  const sessionStorageKey = "deepmlsr.accountSession.v1";

  if (!form || !statusNode || !submitButton || !emailInput || !passwordInput || !displayNameInput) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value;
    const password = passwordInput.value;
    const displayName = displayNameInput.value;

    submitButton.disabled = true;
    statusNode.textContent = "Creating account...";

    try {
      const response = await fetch("/api/auth/create-account", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          email,
          password,
          displayName
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        const message =
          payload && typeof payload.message === "string"
            ? payload.message
            : "Unable to create account right now.";
        statusNode.textContent = message;
        return;
      }

      if (payload && payload.account) {
        const sessionSnapshot =
          payload &&
          payload.session &&
          typeof payload.session.sessionToken === "string" &&
          payload.account
            ? {
                sessionToken: payload.session.sessionToken,
                account: payload.account,
                expiresAt:
                  typeof payload.session.expiresAt === "string"
                    ? payload.session.expiresAt
                    : null
              }
            : null;
        try {
          if (sessionSnapshot) {
            localStorage.setItem(sessionStorageKey, JSON.stringify(sessionSnapshot));
          }
        } catch (_storageError) {
          // local storage is best effort only
        }
      }

      const emailLabel =
        payload && payload.account && typeof payload.account.email === "string"
          ? payload.account.email
          : "your account";
      statusNode.textContent = "Account created and signed in for " + emailLabel + ".";
      form.reset();
      setTimeout(() => {
        window.location.assign("/");
      }, 700);
    } catch (_error) {
      statusNode.textContent = "Unable to create account right now. Please try again.";
    } finally {
      submitButton.disabled = false;
    }
  });
})();
</script>
  `
}

function renderSignInPageMarkup(): string {
  return `
<main style="max-width:560px;margin:3rem auto;padding:0 1rem;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
  <h1 style="margin:0 0 0.75rem;font-size:2rem;line-height:1.2;">Sign In</h1>
  <p style="margin:0 0 1.5rem;color:#4b5563;line-height:1.5;">
    Sign in to load and save your spaced-repetition progress across sessions.
  </p>
  <form id="sign-in-form" style="display:grid;gap:0.85rem;padding:1rem;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;">
    <label for="sign-in-email" style="font-weight:600;font-size:0.9rem;">Email</label>
    <input id="sign-in-email" name="email" type="email" required autocomplete="email" placeholder="you@example.com" style="padding:0.65rem 0.75rem;border:1px solid #d1d5db;border-radius:8px;font-size:0.95rem;" />

    <label for="sign-in-password" style="font-weight:600;font-size:0.9rem;">Password</label>
    <input id="sign-in-password" name="password" type="password" required autocomplete="current-password" placeholder="Your password" style="padding:0.65rem 0.75rem;border:1px solid #d1d5db;border-radius:8px;font-size:0.95rem;" />

    <button id="sign-in-submit" type="submit" style="margin-top:0.35rem;padding:0.75rem 1rem;border:0;border-radius:9999px;background:#111827;color:#ffffff;font-weight:600;cursor:pointer;">
      Sign In
    </button>
  </form>
  <p id="sign-in-status" style="min-height:1.3rem;margin:0.9rem 0 0;color:#374151;"></p>
  <p style="margin:1.25rem 0 0;display:flex;gap:1rem;flex-wrap:wrap;">
    <a href="/auth/create-account" style="color:#111827;text-decoration:none;border-bottom:1px solid #111827;">Need an account? Create one</a>
    <a href="/" style="color:#111827;text-decoration:none;border-bottom:1px solid #111827;">Back to workspace</a>
  </p>
</main>
<script>
(() => {
  const form = document.getElementById("sign-in-form");
  const statusNode = document.getElementById("sign-in-status");
  const submitButton = document.getElementById("sign-in-submit");
  const emailInput = document.getElementById("sign-in-email");
  const passwordInput = document.getElementById("sign-in-password");
  const sessionStorageKey = "deepmlsr.accountSession.v1";

  if (!form || !statusNode || !submitButton || !emailInput || !passwordInput) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    submitButton.disabled = true;
    statusNode.textContent = "Signing in...";

    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          email: emailInput.value,
          password: passwordInput.value
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        const message =
          payload && typeof payload.message === "string"
            ? payload.message
            : "Unable to sign in right now.";
        statusNode.textContent = message;
        return;
      }

      const sessionSnapshot =
        payload &&
        payload.session &&
        typeof payload.session.sessionToken === "string" &&
        payload.account
          ? {
              sessionToken: payload.session.sessionToken,
              account: payload.account,
              expiresAt:
                typeof payload.session.expiresAt === "string"
                  ? payload.session.expiresAt
                  : null
            }
          : null;
      if (sessionSnapshot) {
        try {
          localStorage.setItem(sessionStorageKey, JSON.stringify(sessionSnapshot));
        } catch (_storageError) {
          // local storage is best effort only
        }
      }

      statusNode.textContent = "Signed in. Redirecting to workspace...";
      form.reset();
      setTimeout(() => {
        window.location.assign("/");
      }, 600);
    } catch (_error) {
      statusNode.textContent = "Unable to sign in right now. Please try again.";
    } finally {
      submitButton.disabled = false;
    }
  });
})();
</script>
  `
}

export function registerWorkspaceRoutes(app: Express): void {
  app.get("/", (request: Request, response: Response) => {
    const rawProblemId = request.query.problemId
    const problemId =
      typeof rawProblemId === "string" && rawProblemId.length > 0
        ? rawProblemId
        : null
    const route = createEditorFirstLandingRoute(resolveWorkspaceProblem(problemId))
    const markup = renderToStaticMarkup(
      createElement(ProblemWorkspaceScreen, { route })
    )

    response
      .status(200)
      .type("html")
      .send(renderHtmlDocument(markup, { includeClientScript: true }))
  })

  app.get("/health", (_request: Request, response: Response) => {
    response.status(200).json({ ok: true })
  })

  app.get("/auth/create-account", (_request: Request, response: Response) => {
    response.status(200).type("html").send(
      renderHtmlDocument(renderCreateAccountPageMarkup())
    )
  })

  app.get("/auth/sign-in", (_request: Request, response: Response) => {
    response.status(200).type("html").send(
      renderHtmlDocument(renderSignInPageMarkup())
    )
  })
}
