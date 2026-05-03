import { useRef, useState, type ReactNode } from "react";
import { Check, Circle, RefreshCcw, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { openExternalLink } from "../lib/ezta";
import type {
  AppUpdateCheckResult,
  AppUpdaterOverview,
  EditorPreference,
  GithubConnectionStatus,
} from "../types/ezta";

type SettingsPageProps = {
  editorAppInput: EditorPreference;
  onEditorAppInputChange: (value: EditorPreference) => void;
  editorApplicationPathInput: string;
  onEditorApplicationPathInputChange: (value: string) => void;
  onChooseEditorApplication: () => void;
  updaterOverview: AppUpdaterOverview | null;
  appUpdateResult: AppUpdateCheckResult | null;
  appUpdateMessage: string;
  upgradeRecoveryMessage: string;
  githubConnectionStatus: GithubConnectionStatus | null;
  githubAuthMessage: string;
  dataSafetyMessage: string;
  onCheckAppUpdate: () => void;
  onInstallAppUpdate: () => void;
  onResetSavedUiState: () => void;
  onStartGithubAuth: () => void;
  onRefreshGithubConnectionStatus: () => void;
  onExportAppData: () => void;
  onImportAppData: (file: File) => void;
  onClose?: () => void;
  busy: boolean;
};

type Category = "github" | "editor" | "updates" | "data" | "about";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "github", label: "GitHub" },
  { id: "editor", label: "Editor" },
  { id: "updates", label: "Updates" },
  { id: "data", label: "Data & Backup" },
  { id: "about", label: "About" },
];

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-900 outline-none focus:border-violet-400";

export function SettingsPage({
  editorAppInput,
  onEditorAppInputChange,
  editorApplicationPathInput,
  onEditorApplicationPathInputChange,
  onChooseEditorApplication,
  updaterOverview,
  appUpdateResult,
  appUpdateMessage,
  upgradeRecoveryMessage,
  githubConnectionStatus,
  githubAuthMessage,
  dataSafetyMessage,
  onCheckAppUpdate,
  onInstallAppUpdate,
  onResetSavedUiState,
  onStartGithubAuth,
  onRefreshGithubConnectionStatus,
  onExportAppData,
  onImportAppData,
  onClose,
  busy,
}: SettingsPageProps) {
  const [activeCategory, setActiveCategory] = useState<Category>("github");

  const hasGit = githubConnectionStatus?.gitInstalled ?? false;
  const hasGh = githubConnectionStatus?.ghInstalled ?? false;
  const hasAuth = githubConnectionStatus?.ghAuthenticated ?? false;
  const setupStage: "install-git" | "install-gh" | "authenticate-gh" | "ready" =
    !hasGit
      ? "install-git"
      : !hasGh
        ? "install-gh"
        : !hasAuth
          ? "authenticate-gh"
          : "ready";

  return (
    <div className="flex h-screen overflow-hidden bg-stone-100">
      {/* Left sidebar */}
      <div className="w-[200px] shrink-0 border-r border-stone-200 bg-white py-4">
        <nav className="space-y-0.5 px-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={
                activeCategory === cat.id
                  ? "w-full rounded-md px-3 py-2 text-left text-sm border-l-2 border-l-violet-500 bg-violet-50 text-violet-700 font-medium"
                  : "w-full rounded-md px-3 py-2 text-left text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900"
              }
            >
              {cat.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Right content */}
      <div className="flex-1 min-w-0 overflow-y-auto p-6">
        {onClose && (
          <div className="flex justify-end mb-4">
            <Button type="button" size="sm" variant="outline" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
              Close
            </Button>
          </div>
        )}
        <div className="max-w-2xl space-y-6">
          {activeCategory === "github" && (
            <GitHubCategory
              hasGit={hasGit}
              hasGh={hasGh}
              hasAuth={hasAuth}
              setupStage={setupStage}
              gitVersion={githubConnectionStatus?.gitVersion ?? null}
              ghVersion={githubConnectionStatus?.ghVersion ?? null}
              githubLogin={githubConnectionStatus?.githubLogin ?? null}
              connectionDetail={githubConnectionStatus?.detail ?? null}
              authMessage={githubAuthMessage}
              onStartGithubAuth={onStartGithubAuth}
              onRefreshGithubConnectionStatus={onRefreshGithubConnectionStatus}
              busy={busy}
            />
          )}
          {activeCategory === "editor" && (
            <EditorCategory
              editorAppInput={editorAppInput}
              onEditorAppInputChange={onEditorAppInputChange}
              editorApplicationPathInput={editorApplicationPathInput}
              onEditorApplicationPathInputChange={
                onEditorApplicationPathInputChange
              }
              onChooseEditorApplication={onChooseEditorApplication}
            />
          )}
          {activeCategory === "updates" && (
            <UpdatesCategory
              updaterOverview={updaterOverview}
              appUpdateResult={appUpdateResult}
              appUpdateMessage={appUpdateMessage}
              upgradeRecoveryMessage={upgradeRecoveryMessage}
              onCheckAppUpdate={onCheckAppUpdate}
              onInstallAppUpdate={onInstallAppUpdate}
              onResetSavedUiState={onResetSavedUiState}
              busy={busy}
            />
          )}
          {activeCategory === "data" && (
            <DataCategory
              busy={busy}
              message={dataSafetyMessage}
              onExport={onExportAppData}
              onImport={onImportAppData}
            />
          )}
          {activeCategory === "about" && (
            <AboutCategory version={updaterOverview?.currentVersion ?? null} />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------

function Section({
  title,
  description,
  children,
  headerAction,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  headerAction?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white overflow-hidden">
      <div className="border-b border-stone-200 px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-stone-500">{description}</p>
          )}
        </div>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>
      <div className="px-4 py-4 space-y-4">{children}</div>
    </section>
  );
}

function FieldRow({
  label,
  description,
  control,
}: {
  label: string;
  description?: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-stone-100 last:border-b-0">
      <div className="min-w-0">
        <div className="text-sm font-medium text-stone-900">{label}</div>
        {description && (
          <div className="mt-0.5 text-xs text-stone-500">{description}</div>
        )}
      </div>
      <div className="shrink-0 w-56">{control}</div>
    </div>
  );
}

function GitChecklistItem({
  label,
  done,
  detail,
}: {
  label: string;
  done: boolean;
  detail: string | null;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      {done ? (
        <Check className="h-4 w-4 shrink-0 text-emerald-500" />
      ) : (
        <Circle className="h-4 w-4 shrink-0 text-stone-400" />
      )}
      <span className={done ? "text-stone-900" : "text-stone-500"}>
        {label}
        {detail ? (
          <span className="ml-2 text-xs text-stone-400">{detail}</span>
        ) : null}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GitHub category
// ---------------------------------------------------------------------------

function GitHubCategory({
  hasGit,
  hasGh,
  hasAuth,
  setupStage,
  gitVersion,
  ghVersion,
  githubLogin,
  connectionDetail,
  authMessage,
  onStartGithubAuth,
  onRefreshGithubConnectionStatus,
  busy,
}: {
  hasGit: boolean;
  hasGh: boolean;
  hasAuth: boolean;
  setupStage: "install-git" | "install-gh" | "authenticate-gh" | "ready";
  gitVersion: string | null;
  ghVersion: string | null;
  githubLogin: string | null;
  connectionDetail: string | null;
  authMessage: string;
  onStartGithubAuth: () => void;
  onRefreshGithubConnectionStatus: () => void;
  busy: boolean;
}) {
  const cardBorderClass = !hasGh
    ? "border-l-4 border-l-red-500"
    : !hasAuth
      ? "border-l-4 border-l-amber-500"
      : "border-l-4 border-l-emerald-500";

  const statusHeadline = !hasGh
    ? "GitHub CLI not installed"
    : !hasAuth
      ? "GitHub not connected"
      : `Connected as @${githubLogin ?? "unknown"}`;

  return (
    <div className="space-y-6">
      {/* Prominent connection status card */}
      <section
        className={`rounded-lg border border-stone-200 bg-white overflow-hidden ${cardBorderClass}`}
      >
        <div className="border-b border-stone-200 px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-stone-900">
              {statusHeadline}
            </h2>
            <div className="mt-1">
              {!hasGh ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  CLI not installed
                </span>
              ) : !hasAuth ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Not connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                  Connected as @{githubLogin}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRefreshGithubConnectionStatus}
              disabled={busy}
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Refresh status
            </Button>
          </div>
        </div>
        <div className="px-4 py-4 space-y-2">
          <GitChecklistItem
            label="git installed"
            done={hasGit}
            detail={gitVersion}
          />
          <GitChecklistItem
            label="gh installed"
            done={hasGh}
            detail={ghVersion}
          />
          <GitChecklistItem
            label="GitHub authenticated"
            done={hasAuth}
            detail={githubLogin ? `@${githubLogin}` : null}
          />
        </div>
      </section>

      {/* Connect GitHub — only when not fully authenticated */}
      {!hasAuth && (
        <Section
          title="Connect GitHub"
          description="Set up the GitHub CLI to enable all EzTA GitHub features."
        >
          <GithubConnectFlow
            stage={setupStage}
            hasGit={hasGit}
            hasGh={hasGh}
            gitVersion={gitVersion}
            ghVersion={ghVersion}
            githubLogin={githubLogin}
            authMessage={authMessage}
            onStartGithubAuth={onStartGithubAuth}
            onRefresh={onRefreshGithubConnectionStatus}
            busy={busy}
          />
        </Section>
      )}

      {/* Connection detail — only when detail exists */}
      {connectionDetail && (
        <Section
          title="Connection detail"
          description="Latest output from the readiness check."
        >
          <pre className="rounded-md border border-stone-200 bg-stone-50 px-3 py-3 whitespace-pre-wrap break-words text-xs text-stone-600">
            {connectionDetail}
          </pre>
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor category
// ---------------------------------------------------------------------------

function EditorCategory({
  editorAppInput,
  onEditorAppInputChange,
  editorApplicationPathInput,
  onEditorApplicationPathInputChange,
  onChooseEditorApplication,
}: {
  editorAppInput: EditorPreference;
  onEditorAppInputChange: (value: EditorPreference) => void;
  editorApplicationPathInput: string;
  onEditorApplicationPathInputChange: (value: string) => void;
  onChooseEditorApplication: () => void;
}) {
  return (
    <div className="space-y-6">
      <Section
        title="Editor Preferences"
        description="Configure the editor used for opening repos and files."
      >
        <FieldRow
          label="Preferred editor"
          description="Used by every open-in-editor action in EzTA."
          control={
            <select
              value={editorAppInput}
              onChange={(e) =>
                onEditorAppInputChange(
                  e.currentTarget.value as EditorPreference,
                )
              }
              className={SELECT_CLASS}
            >
              <option value="system">System default</option>
              <option value="application">Chosen application</option>
            </select>
          }
        />
        {editorAppInput === "application" && (
          <FieldRow
            label="Application path"
            description="Pick the editor application EzTA should use when opening repos and files."
            control={
              <div className="space-y-2">
                <Input
                  value={editorApplicationPathInput}
                  onChange={(e) =>
                    onEditorApplicationPathInputChange(e.currentTarget.value)
                  }
                  className="h-9 rounded-md w-full"
                  placeholder="Path to chosen editor application"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={onChooseEditorApplication}
                  >
                    Choose application
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onEditorAppInputChange("system");
                      onEditorApplicationPathInputChange("");
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            }
          />
        )}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Updates category
// ---------------------------------------------------------------------------

function UpdatesCategory({
  updaterOverview,
  appUpdateResult,
  appUpdateMessage,
  upgradeRecoveryMessage,
  onCheckAppUpdate,
  onInstallAppUpdate,
  onResetSavedUiState,
  busy,
}: {
  updaterOverview: AppUpdaterOverview | null;
  appUpdateResult: AppUpdateCheckResult | null;
  appUpdateMessage: string;
  upgradeRecoveryMessage: string;
  onCheckAppUpdate: () => void;
  onInstallAppUpdate: () => void;
  onResetSavedUiState: () => void;
  busy: boolean;
}) {
  return (
    <div className="space-y-6">
      <Section
        title="App Updates"
        description="Built-in app updates from your signed EzTA release feed."
      >
        <FieldRow
          label="Current version"
          description="The version of EzTA currently running on this machine."
          control={
            <span className="text-sm text-stone-700">
              {updaterOverview?.currentVersion ?? "Loading…"}
            </span>
          }
        />
        <FieldRow
          label="Check for updates"
          description="Check the signed release feed configured in EzTA."
          control={
            <div className="space-y-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onCheckAppUpdate}
                disabled={busy}
              >
                Check for updates
              </Button>
              {appUpdateMessage && (
                <p className="text-xs text-stone-600 leading-5">
                  {appUpdateMessage}
                </p>
              )}
              {upgradeRecoveryMessage && (
                <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 leading-5">
                  {upgradeRecoveryMessage}
                </div>
              )}
            </div>
          }
        />
        {appUpdateResult?.available && (
          <FieldRow
            label="Install update"
            description={`Version ${appUpdateResult.version ?? "available"} is ready to install.`}
            control={
              <Button
                type="button"
                size="sm"
                variant="accent"
                onClick={onInstallAppUpdate}
                disabled={busy}
              >
                Install update
              </Button>
            }
          />
        )}
      </Section>

      <Section
        title="Danger Zone"
        description="Reset options that may affect your UI state."
      >
        <FieldRow
          label="Reset UI state"
          description="Clears saved route and queue UI state. Assignment data and review metadata are preserved."
          control={
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onResetSavedUiState}
              disabled={busy}
            >
              Reset saved UI state
            </Button>
          }
        />
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data & Backup category
// ---------------------------------------------------------------------------

function DataCategory({
  busy,
  message,
  onExport,
  onImport,
}: {
  busy: boolean;
  message: string;
  onExport: () => void;
  onImport: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="space-y-6">
      <Section
        title="Data & Backup"
        description="Export and restore EzTA metadata and settings."
      >
        <FieldRow
          label="Export data"
          description="Exports assignments, repo metadata, notes, draft comments, and app settings to a portable JSON file."
          control={
            <Button
              type="button"
              size="sm"
              variant="accent"
              onClick={onExport}
              disabled={busy}
            >
              Export backup
            </Button>
          }
        />
        <FieldRow
          label="Import data"
          description="Restore from a previously exported EzTA backup file."
          control={
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                Import backup
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  if (file) onImport(file);
                  e.currentTarget.value = "";
                }}
              />
            </>
          }
        />
        {message && (
          <div className="rounded border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
            {message}
          </div>
        )}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// About category
// ---------------------------------------------------------------------------

const KEYBOARD_SHORTCUTS: {
  context: string;
  shortcut: string;
  action: string;
}[] = [
  { context: "Grading", shortcut: "alt+j", action: "Next submission" },
  { context: "Grading", shortcut: "alt+k", action: "Previous submission" },
  { context: "Grading", shortcut: "alt+s", action: "Save target" },
  { context: "Grading", shortcut: "alt+p", action: "Prepare PR" },
  { context: "Grading", shortcut: "alt+o", action: "Open PR" },
  { context: "Grading", shortcut: "alt+r", action: "Mark reviewed" },
];

function AboutCategory({ version }: { version: string | null }) {
  return (
    <div className="space-y-6">
      <Section title="About EzTA">
        <FieldRow
          label="Version"
          description="Current installed version of EzTA."
          control={
            <span className="text-sm text-stone-700">
              {version ?? "Loading…"}
            </span>
          }
        />
        <div className="py-2 text-sm text-stone-600 leading-relaxed">
          EzTA is a desktop grading assistant for teaching assistants. It helps
          manage submission queues, prepare GitHub PRs, track review progress,
          and streamline the grading workflow.
        </div>
      </Section>

      <Section
        title="Keyboard Shortcuts"
        description="Quick reference for keyboard shortcuts available in EzTA."
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100">
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                Context
              </th>
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                Shortcut
              </th>
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {KEYBOARD_SHORTCUTS.map((s) => (
              <tr
                key={s.shortcut}
                className="border-b border-stone-100 last:border-b-0"
              >
                <td className="py-2 pr-4 text-stone-600">{s.context}</td>
                <td className="py-2 pr-4">
                  <kbd className="rounded border border-stone-200 bg-stone-100 px-1.5 py-0.5 text-xs font-mono text-stone-700">
                    {s.shortcut}
                  </kbd>
                </td>
                <td className="py-2 text-stone-600">{s.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GithubConnectFlow (preserved from original)
// ---------------------------------------------------------------------------

function GithubConnectFlow({
  stage,
  hasGit,
  hasGh,
  gitVersion,
  ghVersion,
  githubLogin,
  authMessage,
  onStartGithubAuth,
  onRefresh,
  busy,
}: {
  stage: "install-git" | "install-gh" | "authenticate-gh" | "ready";
  hasGit: boolean;
  hasGh: boolean;
  gitVersion: string | null;
  ghVersion: string | null;
  githubLogin: string | null;
  authMessage: string;
  onStartGithubAuth: () => void;
  onRefresh: () => void;
  busy: boolean;
}) {
  const toolSummary = [
    formatInlineStatus(hasGit, gitVersion, "git"),
    formatInlineStatus(hasGh, ghVersion, "gh"),
  ].join(" | ");

  if (stage === "install-git") {
    return (
      <div className="space-y-3 border border-red-700 bg-red-100 px-3 py-3 text-sm text-red-950 rounded-md">
        <div className="font-semibold">Install git first.</div>
        <div className="text-xs leading-5">
          EzTA cannot clone repos, validate commits, or prepare review branches
          until <code>git</code> is available on your PATH.
        </div>
        <div className="border border-red-700 bg-white px-3 py-2 text-xs text-stone-800 rounded">
          {toolSummary}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              void openExternalLink("https://git-scm.com/downloads")
            }
          >
            Open git downloads
          </Button>
          <CopyCommandButton
            command="git --version"
            label="Copy version check"
          />
        </div>
      </div>
    );
  }

  if (stage === "install-gh") {
    return (
      <div className="space-y-3 border border-red-700 bg-red-100 px-3 py-3 text-sm text-red-950 rounded-md">
        <div className="font-semibold">Install GitHub CLI next.</div>
        <div className="text-xs leading-5">
          EzTA uses <code>gh</code> for repo discovery, PR preparation,
          authentication checks, and review publishing.
        </div>
        <div className="border border-red-700 bg-white px-3 py-2 text-xs text-stone-800 rounded">
          {toolSummary}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void openExternalLink("https://cli.github.com/")}
          >
            Open GitHub CLI docs
          </Button>
          <CopyCommandButton
            command="gh --version"
            label="Copy version check"
          />
        </div>
      </div>
    );
  }

  if (stage === "authenticate-gh") {
    return (
      <div className="space-y-3 border border-amber-700 bg-amber-100 px-3 py-3 text-sm text-amber-950 rounded-md">
        <div className="font-semibold">Authenticate GitHub CLI.</div>
        <div className="text-xs leading-5">
          Run the login command in your terminal, complete the browser/device
          flow, then return here and refresh.
        </div>
        <div className="border border-amber-700 bg-white px-3 py-2 text-xs text-stone-800 rounded">
          {toolSummary}
        </div>
        {authMessage ? (
          <div className="border border-amber-700 bg-white px-3 py-2 text-xs text-stone-800 rounded">
            {authMessage}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="accent"
            onClick={onStartGithubAuth}
            disabled={busy}
          >
            Connect GitHub
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onRefresh}
            disabled={busy}
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh after login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 border border-emerald-700 bg-emerald-100 px-3 py-3 text-sm text-emerald-950 rounded-md">
      <div className="font-semibold">GitHub setup is ready.</div>
      <div className="text-xs leading-5">
        This machine has the required tools and a signed-in GitHub CLI session.
        EzTA can use your account for discovery, PR prep, and review publishing.
      </div>
      <div className="border border-emerald-700 bg-white px-3 py-2 text-xs text-stone-800 rounded">
        {toolSummary}
        {githubLogin
          ? ` |
 github: ${githubLogin}`
          : ""}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRefresh}
          disabled={busy}
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Re-check connection
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CopyCommandButton (preserved from original)
// ---------------------------------------------------------------------------

function CopyCommandButton({
  command,
  label,
}: {
  command: string;
  label: string;
}) {
  async function handleCopy() {
    await navigator.clipboard.writeText(command);
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      onClick={() => void handleCopy()}
    >
      {label}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Inline status formatter (preserved from original)
// ---------------------------------------------------------------------------

function formatInlineStatus(
  ready: boolean,
  detail: string | null,
  label: string,
) {
  const symbol = ready ? "ok" : "missing";
  return detail && detail.trim()
    ? `${symbol}: ${detail.trim()}`
    : `${symbol}: ${label}`;
}
