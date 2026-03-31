import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

export async function openSettingsWindow() {
  const existing = await WebviewWindow.getByLabel("settings");
  if (existing) {
    await existing.show();
    await existing.setFocus();
    return;
  }

  const settingsUrl = new URL("/?window=settings", window.location.origin).toString();
  const settingsWindow = new WebviewWindow("settings", {
    title: "EzTA Settings",
    url: settingsUrl,
    width: 760,
    height: 720,
    resizable: true,
    center: true,
  });

  await new Promise<void>((resolve, reject) => {
    void settingsWindow.once("tauri://created", () => resolve());
    void settingsWindow.once("tauri://error", (event) => {
      reject(new Error(String(event.payload)));
    });
  });
}
