import { getCurrentWindow } from "@tauri-apps/api/window";
import { SettingsPage } from "./settings-page";
import { useAppSettings } from "../hooks/use-app-settings";

export function SettingsWindowPage() {
  const settings = useAppSettings();

  return (
    <div className="min-h-screen bg-[#d7d6d1] p-4 text-zinc-950">
      <SettingsPage
        editorAppInput={settings.editorAppInput}
        onEditorAppInputChange={settings.setEditorAppInput}
        editorCommandInput={settings.editorCommandInput}
        onEditorCommandInputChange={settings.setEditorCommandInput}
        updaterOverview={settings.appUpdaterOverview}
        appUpdateResult={settings.appUpdateResult}
        appUpdateMessage={settings.appUpdateMessage}
        githubConnectionStatus={settings.githubConnectionStatus}
        githubAuthMessage={settings.githubAuthMessage}
        dataSafetyMessage={settings.dataSafetyMessage}
        onCheckAppUpdate={() => void settings.checkAppUpdate()}
        onInstallAppUpdate={() => void settings.runAppUpdateInstall()}
        onStartGithubAuth={() => void settings.startGithubAuth()}
        onRefreshGithubConnectionStatus={() => void settings.refreshGithubConnectionStatus()}
        onExportAppData={() => void settings.exportAppData()}
        onImportAppData={(file) => void settings.importAppData(file)}
        onClose={() => void getCurrentWindow().close()}
        busy={settings.settingsBusy}
      />
    </div>
  );
}
