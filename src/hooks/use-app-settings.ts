import { useEffect, useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
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
const editorApplicationPathStorageKey = "ezta.preferredEditorApplicationPath";

export function useAppSettings() {
  const [editorAppInput, setEditorAppInput] = useState<EditorPreference>("system");
  const [editorApplicationPathInput, setEditorApplicationPathInput] = useState("");
  const [appUpdaterOverview, setAppUpdaterOverview] = useState<AppUpdaterOverview | null>(null);
  const [appUpdateResult, setAppUpdateResult] = useState<AppUpdateCheckResult | null>(null);
  const [appUpdateMessage, setAppUpdateMessage] = useState("");
  const [githubConnectionStatus, setGithubConnectionStatus] =
    useState<GithubConnectionStatus | null>(null);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [githubAuthMessage, setGithubAuthMessage] = useState("");
  const [dataSafetyMessage, setDataSafetyMessage] = useState("");

  const resolvedEditorApplication = useMemo(
    () =>
      editorAppInput === "application" ? editorApplicationPathInput.trim() : "",
    [editorAppInput, editorApplicationPathInput],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedApp = window.localStorage.getItem(editorAppStorageKey);
    const storedApplicationPath =
      window.localStorage.getItem(editorApplicationPathStorageKey) ?? "";
    if (storedApp === "system" || storedApp === "application") {
      setEditorAppInput(storedApp);
    }
    setEditorApplicationPathInput(storedApplicationPath);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(editorAppStorageKey, editorAppInput);
    window.localStorage.setItem(
      editorApplicationPathStorageKey,
      editorApplicationPathInput,
    );
  }, [editorAppInput, editorApplicationPathInput]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === editorAppStorageKey && event.newValue) {
        if (event.newValue === "system" || event.newValue === "application") {
          setEditorAppInput(event.newValue);
        }
      }
      if (event.key === editorApplicationPathStorageKey) {
        setEditorApplicationPathInput(event.newValue ?? "");
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

  async function chooseEditorApplication() {
    const selected = await open({
      title: "Choose preferred editor application",
      multiple: false,
      directory: false,
      filters: [
        {
          name: "Applications",
          extensions:
            navigator.userAgent.includes("Windows")
              ? ["exe"]
              : navigator.userAgent.includes("Mac")
                ? ["app"]
                : [],
        },
      ],
    });
    if (!selected || Array.isArray(selected)) {
      return;
    }
    setEditorAppInput("application");
    setEditorApplicationPathInput(selected);
  }

  async function exportAppData() {
    setSettingsBusy(true);
    setDataSafetyMessage("");
    try {
      const backendSnapshot = await exportLocalData();
      const payload = {
        appSettings: {
          editorApp: editorAppInput,
          editorApplicationPath: editorApplicationPathInput,
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
          editorApplicationPath?: string;
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
      if (typeof parsed.appSettings?.editorApplicationPath === "string") {
        setEditorApplicationPathInput(parsed.appSettings.editorApplicationPath);
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
    editorApplicationPathInput,
    setEditorApplicationPathInput,
    appUpdaterOverview,
    appUpdateResult,
    appUpdateMessage,
    resolvedEditorApplication,
    chooseEditorApplication,
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
