import { useRef, type ReactNode } from "react";
import { RefreshCcw, X } from "lucide-react";
import { Breadcrumbs } from "../components/navigation/breadcrumbs";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { PanelShell } from "../components/workspace/panel-shell";
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
  editorCommandInput: string;
  onEditorCommandInputChange: (value: string) => void;
  updaterOverview: AppUpdaterOverview | null;
  appUpdateResult: AppUpdateCheckResult | null;
  appUpdateMessage: string;
  githubConnectionStatus: GithubConnectionStatus | null;
  githubAuthMessage: string;
  dataSafetyMessage: string;
  onCheckAppUpdate: () => void;
  onInstallAppUpdate: () => void;
  onStartGithubAuth: () => void;
  onRefreshGithubConnectionStatus: () => void;
  onExportAppData: () => void;
  onImportAppData: (file: File) => void;
  onClose?: () => void;
  busy: boolean;
};

export function SettingsPage({
  editorAppInput,
  onEditorAppInputChange,
  editorCommandInput,
  onEditorCommandInputChange,
  updaterOverview,
  appUpdateResult,
  appUpdateMessage,
  githubConnectionStatus,
  githubAuthMessage,
  dataSafetyMessage,
  onCheckAppUpdate,
  onInstallAppUpdate,
  onStartGithubAuth,
  onRefreshGithubConnectionStatus,
  onExportAppData,
  onImportAppData,
  onClose,
  busy,
}: SettingsPageProps) {
  const hasGit = githubConnectionStatus?.gitInstalled ?? false;
  const hasGh = githubConnectionStatus?.ghInstalled ?? false;
  const hasAuth = githubConnectionStatus?.ghAuthenticated ?? false;
  const editorConfigured =
    editorAppInput !== "system" || Boolean(editorCommandInput.trim());
  const setupStage = !hasGit ? "install-git" : !hasGh ? "install-gh" : !hasAuth ? "authenticate-gh" : "ready";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Breadcrumbs items={[{ label: "Settings" }]} />
        {onClose ? (
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
            Close
          </Button>
        ) : null}
      </div>

      <div className="space-y-4">
        <PanelShell title="General" subtitle="App-wide user preferences">
          <div className="bg-white">
            <SettingRow
              label="Preferred editor"
              description="Used by every open-in-editor action in EzTA."
              control={
                <select
                  value={editorAppInput}
                  onChange={(event) =>
                    onEditorAppInputChange(event.currentTarget.value as EditorPreference)
                  }
                  className="h-10 w-full rounded-none border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-500"
                >
                  <option value="system">System default</option>
                  <option value="vscode">Visual Studio Code</option>
                  <option value="cursor">Cursor</option>
                  <option value="zed">Zed</option>
                  <option value="custom">Custom command</option>
                </select>
              }
            />
            {editorAppInput === "custom" ? (
              <SettingRow
                label="Custom editor command"
                description="Examples: `code`, `cursor`, `zed`, or another CLI launcher."
                control={
                  <Input
                    value={editorCommandInput}
                    onChange={(event) => onEditorCommandInputChange(event.currentTarget.value)}
                    className="h-10 rounded-none"
                    placeholder="Custom editor command"
                  />
                }
              />
            ) : null}
            <SettingRow
              label="Persistence"
              description="These preferences are saved locally for this EzTA installation and reused across sessions."
              value="Saved automatically"
            />
          </div>
        </PanelShell>

        <PanelShell
          title="Updates"
          subtitle="Built-in app updates from your signed EzTA release feed"
        >
          <div className="bg-white">
            <SettingRow
              label="Current version"
              description="The version of EzTA currently running on this machine."
              value={updaterOverview?.currentVersion ?? "Loading app version..."}
            />
            <SettingRow
              label="Update status"
              description="Check the signed release feed configured in EzTA, then install an update from here."
              value={
                appUpdateMessage ||
                "Check for updates when you want EzTA to look for a newer signed release."
              }
              control={
                <UpdateActions
                  busy={busy}
                  result={appUpdateResult}
                  onCheck={onCheckAppUpdate}
                  onInstall={onInstallAppUpdate}
                />
              }
            />
          </div>
        </PanelShell>

        <PanelShell
          title="GitHub Connection"
          subtitle="Connect GitHub once, then let EzTA reuse that machine-level CLI session"
          actions={
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRefreshGithubConnectionStatus}
              disabled={busy}
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          }
        >
          <div className="bg-white">
            <SettingRow
              label="Connection summary"
              description="This is the only GitHub setup EzTA needs on your machine."
              value={githubConnectionStatus?.statusSummary ?? "Checking GitHub connection..."}
              valueTone={hasAuth ? "success" : "neutral"}
            />
            <SettingRow
              label="GitHub setup"
              description="EzTA will open Terminal and start the GitHub CLI login flow for you."
              control={
                <GithubConnectFlow
                  stage={setupStage}
                  hasGit={hasGit}
                  hasGh={hasGh}
                  gitVersion={githubConnectionStatus?.gitVersion ?? null}
                  ghVersion={githubConnectionStatus?.ghVersion ?? null}
                  githubLogin={githubConnectionStatus?.githubLogin ?? null}
                  authMessage={githubAuthMessage}
                  onStartGithubAuth={onStartGithubAuth}
                  onRefresh={onRefreshGithubConnectionStatus}
                  busy={busy}
                />
              }
            />
            {githubConnectionStatus?.detail ? (
              <SettingRow
                label="Connection detail"
                description="Latest output from the readiness check."
                control={
                  <pre className="border border-zinc-300 bg-zinc-50 px-3 py-3 whitespace-pre-wrap break-words text-xs text-zinc-600">
                    {githubConnectionStatus.detail}
                  </pre>
                }
              />
            ) : null}
          </div>
        </PanelShell>

        <PanelShell title="Setup Checklist" subtitle="Minimum workstation setup for a TA">
          <div className="bg-white">
            <ChecklistRow
              index={1}
              title="Connect GitHub"
              detail="Use the button above to launch `gh auth login` in Terminal, then refresh this window."
              done={hasAuth}
            />
            <ChecklistRow
              index={2}
              title="Choose a preferred editor"
              detail="Optional, but recommended so repo and file opens go straight to your editor."
              done={editorConfigured}
            />
          </div>
        </PanelShell>

        <PanelShell title="Data Safety" subtitle="Export and restore EzTA metadata and settings">
          <div className="bg-white">
            <SettingRow
              label="Backup"
              description="Exports assignments, repo metadata, notes, draft comments, and app settings to a portable JSON file."
              control={
                <DataSafetyControls
                  busy={busy}
                  message={dataSafetyMessage}
                  onExport={onExportAppData}
                  onImport={onImportAppData}
                />
              }
            />
          </div>
        </PanelShell>
      </div>
    </div>
  );
}

function UpdateActions({
  busy,
  result,
  onCheck,
  onInstall,
}: {
  busy: boolean;
  result: AppUpdateCheckResult | null;
  onCheck: () => void;
  onInstall: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onCheck} disabled={busy}>
          Check for updates
        </Button>
        <Button
          type="button"
          size="sm"
          variant="accent"
          onClick={onInstall}
          disabled={busy || !result?.available}
        >
          Install update
        </Button>
      </div>
      {result?.available ? (
        <div className="border border-emerald-700 bg-emerald-100 px-3 py-2 text-sm text-emerald-950">
          Update {result.version ?? "available"}
          {result.date ? ` · ${result.date}` : ""}
          {result.body ? (
            <div className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-emerald-950">
              {result.body}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DataSafetyControls({
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
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="accent" onClick={onExport} disabled={busy}>
          Export backup
        </Button>
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
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) {
              onImport(file);
            }
            event.currentTarget.value = "";
          }}
        />
      </div>
      {message ? (
        <div className="border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          {message}
        </div>
      ) : null}
    </div>
  );
}

function SettingRow({
  label,
  description,
  value,
  valueTone = "neutral",
  control,
  actions,
}: {
  label: string;
  description: string;
  value?: ReactNode;
  valueTone?: "neutral" | "success" | "danger";
  control?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="grid gap-3 border-b border-zinc-200 px-4 py-4 last:border-b-0 xl:grid-cols-[220px_minmax(0,1fr)]">
      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-700">
          {label}
        </div>
        <div className="text-xs leading-5 text-zinc-500">{description}</div>
      </div>
      <div className="space-y-2">
        {value ? <SettingValue value={value} tone={valueTone} /> : null}
        {control}
        {actions}
      </div>
    </div>
  );
}

function SettingValue({
  value,
  tone,
}: {
  value: ReactNode;
  tone: "neutral" | "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-700 bg-emerald-100 text-emerald-950"
      : tone === "danger"
        ? "border-red-700 bg-red-100 text-red-950"
        : "border-zinc-300 bg-zinc-50 text-zinc-700";

  return <div className={`border px-3 py-2 text-sm ${toneClass}`}>{value}</div>;
}

function ChecklistRow({
  index,
  title,
  detail,
  done,
}: {
  index: number;
  title: string;
  detail: string;
  done: boolean;
}) {
  return (
    <div className="grid gap-3 border-b border-zinc-200 px-4 py-4 last:border-b-0 xl:grid-cols-[48px_minmax(0,1fr)_180px]">
      <div className="border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-700">
        {index}
      </div>
      <div>
        <div className="text-sm font-semibold text-zinc-900">{title}</div>
        <div className="mt-1 text-xs leading-5 text-zinc-500">{detail}</div>
      </div>
      <SettingValue value={done ? "Ready" : "Pending"} tone={done ? "success" : "danger"} />
    </div>
  );
}

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
    <Button type="button" size="sm" variant="secondary" onClick={() => void handleCopy()}>
      {label}
    </Button>
  );
}

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
      <div className="space-y-3 border border-red-700 bg-red-100 px-3 py-3 text-sm text-red-950">
        <div className="font-semibold">Install git first.</div>
        <div className="text-xs leading-5">
          EzTA cannot clone repos, validate commits, or prepare review branches until `git`
          is available on your PATH.
        </div>
        <div className="border border-red-700 bg-white px-3 py-2 text-xs text-zinc-800">
          {toolSummary}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              void openExternalLink("https://git-scm.com/downloads");
            }}
          >
            Open git downloads
          </Button>
          <CopyCommandButton command="git --version" label="Copy version check" />
        </div>
      </div>
    );
  }

  if (stage === "install-gh") {
    return (
      <div className="space-y-3 border border-red-700 bg-red-100 px-3 py-3 text-sm text-red-950">
        <div className="font-semibold">Install GitHub CLI next.</div>
        <div className="text-xs leading-5">
          EzTA uses `gh` for repo discovery, PR preparation, authentication checks, and
          review publishing.
        </div>
        <div className="border border-red-700 bg-white px-3 py-2 text-xs text-zinc-800">
          {toolSummary}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              void openExternalLink("https://cli.github.com/");
            }}
          >
            Open GitHub CLI docs
          </Button>
          <CopyCommandButton command="gh --version" label="Copy version check" />
        </div>
      </div>
    );
  }

  if (stage === "authenticate-gh") {
    return (
      <div className="space-y-3 border border-amber-700 bg-amber-100 px-3 py-3 text-sm text-amber-950">
        <div className="font-semibold">Authenticate GitHub CLI.</div>
        <div className="text-xs leading-5">
          Run the login command in your terminal, complete the browser/device flow, then
          return here and refresh.
        </div>
        <div className="border border-amber-700 bg-white px-3 py-2 text-xs text-zinc-800">
          {toolSummary}
        </div>
        {authMessage ? (
          <div className="border border-amber-700 bg-white px-3 py-2 text-xs text-zinc-800">
            {authMessage}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="accent" onClick={onStartGithubAuth} disabled={busy}>
            Connect GitHub
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onRefresh} disabled={busy}>
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh after login
          </Button>
        </div>
      </div>
    );
  }

  return (
      <div className="space-y-3 border border-emerald-700 bg-emerald-100 px-3 py-3 text-sm text-emerald-950">
        <div className="font-semibold">GitHub setup is ready.</div>
        <div className="text-xs leading-5">
          This machine has the required tools and a signed-in GitHub CLI session. EzTA can
          use your account for discovery, PR prep, and review publishing.
        </div>
        <div className="border border-emerald-700 bg-white px-3 py-2 text-xs text-zinc-800">
          {toolSummary}
          {githubLogin ? ` | github: ${githubLogin}` : ""}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onRefresh} disabled={busy}>
            <RefreshCcw className="h-3.5 w-3.5" />
            Re-check connection
        </Button>
      </div>
    </div>
  );
}

function formatInlineStatus(ready: boolean, detail: string | null, label: string) {
  const symbol = ready ? "ok" : "missing";
  return detail && detail.trim() ? `${symbol}: ${detail.trim()}` : `${symbol}: ${label}`;
}
