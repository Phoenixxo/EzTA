import { useEffect, useMemo, useState } from "react";
import {
  checkForAppUpdate,
  exportLocalData,
  getAppUpdaterOverview,
  getGithubConnectionStatus,
  importLocalData,
  installAppUpdate,
  launchGithubAuth,
} from "../lib/ezta";
import type {
  AppUpdateCheckResult,
  AppUpdaterOverview,
  EditorPreference,
  GithubConnectionStatus,
  LocalDataSnapshot,
} from "../types/ezta";

const editorAppStorageKey = "ezta.preferredEditorApp";
const editorCommandStorageKey = "ezta.preferredEditorCommand";

export function useAppSettings() {
  const [editorAppInput, setEditorAppInput] = useState<EditorPreference>("system");
  const [editorCommandInput, setEditorCommandInput] = useState("");
  const [appUpdaterOverview, setAppUpdaterOverview] = useState<AppUpdaterOverview | null>(null);
  const [appUpdateResult, setAppUpdateResult] = useState<AppUpdateCheckResult | null>(null);
  const [appUpdateMessage, setAppUpdateMessage] = useState("");
  const [githubConnectionStatus, setGithubConnectionStatus] =
    useState<GithubConnectionStatus | null>(null);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [githubAuthMessage, setGithubAuthMessage] = useState("");
  const [dataSafetyMessage, setDataSafetyMessage] = useState("");

  const resolvedEditorCommand = useMemo(() => {
    switch (editorAppInput) {
      case "vscode":
        return "code";
      case "cursor":
        return "cursor";
      case "zed":
        return "zed";
      case "custom":
        return editorCommandInput.trim();
      case "system":
      default:
        return "";
    }
  }, [editorAppInput, editorCommandInput]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedApp = window.localStorage.getItem(editorAppStorageKey);
    const storedCommand = window.localStorage.getItem(editorCommandStorageKey) ?? "";
    if (
      storedApp === "system" ||
      storedApp === "vscode" ||
      storedApp === "cursor" ||
      storedApp === "zed" ||
      storedApp === "custom"
    ) {
      setEditorAppInput(storedApp);
    }
    setEditorCommandInput(storedCommand);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(editorAppStorageKey, editorAppInput);
    window.localStorage.setItem(editorCommandStorageKey, editorCommandInput);
  }, [editorAppInput, editorCommandInput]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === editorAppStorageKey && event.newValue) {
        if (
          event.newValue === "system" ||
          event.newValue === "vscode" ||
          event.newValue === "cursor" ||
          event.newValue === "zed" ||
          event.newValue === "custom"
        ) {
          setEditorAppInput(event.newValue);
        }
      }
      if (event.key === editorCommandStorageKey) {
        setEditorCommandInput(event.newValue ?? "");
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    void refreshGithubConnectionStatus();
    void refreshAppUpdaterOverview();
  }, []);

  async function refreshAppUpdaterOverview() {
    try {
      const overview = await getAppUpdaterOverview();
      setAppUpdaterOverview(overview);
    } catch {
      setAppUpdaterOverview(null);
    }
  }

  async function refreshGithubConnectionStatus() {
    setSettingsBusy(true);
    setGithubAuthMessage("");
    try {
      const status = await getGithubConnectionStatus();
      setGithubConnectionStatus(status);
    } catch (err) {
      setGithubConnectionStatus({
        gitInstalled: false,
        gitVersion: null,
        ghInstalled: false,
        ghVersion: null,
        ghAuthenticated: false,
        githubLogin: null,
        statusSummary: "Unable to determine GitHub connection status.",
        detail: String(err),
      });
    } finally {
      setSettingsBusy(false);
    }
  }

  async function startGithubAuth() {
    setSettingsBusy(true);
    setGithubAuthMessage("");
    try {
      await launchGithubAuth();
      setGithubAuthMessage(
        "Opened Terminal for `gh auth login`. Complete the login flow there, then return here and refresh.",
      );
    } catch (err) {
      setGithubAuthMessage(String(err));
    } finally {
      setSettingsBusy(false);
    }
  }

  async function checkAppUpdate() {
    setSettingsBusy(true);
    setAppUpdateMessage("");
    try {
      const result = await checkForAppUpdate();
      setAppUpdateResult(result);
      setAppUpdateMessage(
        result.available
          ? `Update ${result.version ?? "available"} is ready to install.`
          : `EzTA ${result.currentVersion} is already up to date.`,
      );
    } catch (err) {
      setAppUpdateResult(null);
      setAppUpdateMessage(String(err));
    } finally {
      setSettingsBusy(false);
    }
  }

  async function runAppUpdateInstall() {
    setSettingsBusy(true);
    setAppUpdateMessage("Downloading and installing the update. EzTA will restart when it finishes.");
    try {
      await installAppUpdate();
    } catch (err) {
      setAppUpdateMessage(String(err));
      setSettingsBusy(false);
    }
  }

  async function exportAppData() {
    setSettingsBusy(true);
    setDataSafetyMessage("");
    try {
      const backendSnapshot = await exportLocalData();
      const payload = {
        appSettings: {
          editorApp: editorAppInput,
          editorCommand: editorCommandInput,
        },
        backendSnapshot,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      anchor.href = url;
      anchor.download = `ezta-backup-${timestamp}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setDataSafetyMessage("Exported local EzTA data to a JSON backup file.");
    } catch (err) {
      setDataSafetyMessage(String(err));
    } finally {
      setSettingsBusy(false);
    }
  }

  async function importAppData(file: File) {
    setSettingsBusy(true);
    setDataSafetyMessage("");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        appSettings?: {
          editorApp?: EditorPreference;
          editorCommand?: string;
        };
        backendSnapshot?: LocalDataSnapshot;
      };
      if (!parsed.backendSnapshot) {
        throw new Error("Backup file is missing backendSnapshot.");
      }
      await importLocalData(parsed.backendSnapshot);
      if (parsed.appSettings?.editorApp) {
        setEditorAppInput(parsed.appSettings.editorApp);
      }
      if (typeof parsed.appSettings?.editorCommand === "string") {
        setEditorCommandInput(parsed.appSettings.editorCommand);
      }
      setDataSafetyMessage(
        "Imported EzTA backup data. Reopen the main window to refresh queue state if needed.",
      );
    } catch (err) {
      setDataSafetyMessage(String(err));
    } finally {
      setSettingsBusy(false);
    }
  }

  return {
    editorAppInput,
    setEditorAppInput,
    editorCommandInput,
    setEditorCommandInput,
    appUpdaterOverview,
    appUpdateResult,
    appUpdateMessage,
    resolvedEditorCommand,
    githubConnectionStatus,
    githubAuthMessage,
    dataSafetyMessage,
    settingsBusy,
    refreshGithubConnectionStatus,
    startGithubAuth,
    checkAppUpdate,
    runAppUpdateInstall,
    exportAppData,
    importAppData,
  };
}
