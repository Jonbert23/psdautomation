import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { DashboardPage } from "./pages/Dashboard";
import { ProfilesPage } from "./pages/Profiles";
import { ProfileEditorPage } from "./pages/ProfileEditor";
import { OrdersPage } from "./pages/Orders";
import { OrderEditorPage } from "./pages/OrderEditor";
import { JobsPage } from "./pages/Jobs";
import { SettingsPage } from "./pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/profiles" element={<ProfilesPage />} />
        <Route path="/profiles/new" element={<ProfileEditorPage />} />
        <Route path="/profiles/:id" element={<ProfileEditorPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/new" element={<OrderEditorPage />} />
        <Route path="/orders/:id" element={<OrderEditorPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
