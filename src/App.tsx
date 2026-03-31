import { WorkspacePage } from "./pages/workspace-page";
import { SettingsWindowPage } from "./pages/settings-window-page";

function App() {
  const search = new URLSearchParams(window.location.search);
  if (search.get("window") === "settings") {
    return <SettingsWindowPage />;
  }
  return <WorkspacePage />;
}

export default App;
