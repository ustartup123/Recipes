#!/usr/bin/env node
/**
 * Dev preflight: fails loud if required Google Cloud APIs are disabled on
 * the linked Firebase project. Exists because the whole app (Auth,
 * Firestore reads/writes, Storage uploads) silently hangs with no error
 * when any of these APIs is off — and we burned hours debugging that.
 *
 * Runs as `npm run predev`. Set SKIP_PREFLIGHT=1 to bypass (e.g. CI).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

if (process.env.SKIP_PREFLIGHT === "1") process.exit(0);

const REQUIRED = [
  "firestore.googleapis.com",
  "identitytoolkit.googleapis.com",
  "firebasestorage.googleapis.com",
];

let projectId;
try {
  const rc = JSON.parse(readFileSync(".firebaserc", "utf8"));
  projectId = rc.projects?.default;
} catch {
  console.warn("[preflight] .firebaserc missing/invalid, skipping");
  process.exit(0);
}
if (!projectId) {
  console.warn("[preflight] no default project in .firebaserc, skipping");
  process.exit(0);
}

let enabled;
try {
  const out = execFileSync(
    "gcloud",
    [
      "services",
      "list",
      "--enabled",
      `--project=${projectId}`,
      "--format=value(config.name)",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 15_000 },
  );
  enabled = new Set(out.split("\n").map((s) => s.trim()).filter(Boolean));
} catch (e) {
  const hint =
    e.code === "ENOENT"
      ? "gcloud not installed"
      : e.code === "ETIMEDOUT"
        ? "gcloud timed out"
        : e.stderr?.toString()?.trim() || e.message;
  console.warn(
    `[preflight] could not check GCP APIs (${hint}). Skipping. ` +
      `Set SKIP_PREFLIGHT=1 to silence.`,
  );
  process.exit(0);
}

const missing = REQUIRED.filter((api) => !enabled.has(api));
if (missing.length) {
  console.error(
    `\n[preflight] BLOCKED: required Google APIs are disabled on project ${projectId}:\n` +
      missing.map((a) => `    - ${a}`).join("\n") +
      `\n\n  Enable them with:\n` +
      `    gcloud services enable ${missing.join(" ")} --project=${projectId}\n\n` +
      `  Skip this check (at your own risk) with SKIP_PREFLIGHT=1 npm run dev\n`,
  );
  process.exit(1);
}

// APIs can be enabled without a Firestore database actually existing —
// writes then silently hang with no error. Verify (default) exists.
try {
  execFileSync(
    "gcloud",
    [
      "firestore",
      "databases",
      "describe",
      "--database=(default)",
      `--project=${projectId}`,
      "--format=value(name)",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 15_000 },
  );
} catch (e) {
  const stderr = e.stderr?.toString() || "";
  if (stderr.includes("NOT_FOUND") || stderr.includes("does not exist")) {
    console.error(
      `\n[preflight] BLOCKED: no Firestore (default) database in project ${projectId}.\n` +
        `  Firestore APIs are enabled but the database was never created — writes will hang silently.\n\n` +
        `  Create it with (pick a region; nam5 = US multi-region, eur3 = EU multi-region):\n` +
        `    gcloud firestore databases create --database='(default)' --location=nam5 \\\n` +
        `      --type=firestore-native --project=${projectId}\n\n` +
        `  Or in the Firebase console:\n` +
        `    https://console.firebase.google.com/project/${projectId}/firestore\n`,
    );
    process.exit(1);
  }
  console.warn(
    `[preflight] could not verify Firestore database (${stderr.trim() || e.message}). Continuing.`,
  );
}

console.log(
  `[preflight] ${projectId}: APIs enabled and (default) Firestore database exists`,
);
process.exit(0);
