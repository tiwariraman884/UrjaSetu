import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Tasks from "./pages/Tasks";
import TaskNew from "./pages/TaskNew";
import TaskDetail from "./pages/TaskDetail";
import Payment from "./pages/Payment";
import Execution from "./pages/Execution";
import Receipts from "./pages/Receipts";
import ReceiptDetail from "./pages/ReceiptDetail";
import Devices from "./pages/Devices";
import Analytics from "./pages/Analytics";
import History from "./pages/History";
import Alerts from "./pages/Alerts";
import Audit from "./pages/Audit";
import Settings from "./pages/Settings";
import Setup from "./pages/Setup";
import Optimization from "./pages/Optimization";
export default function App() {
  return (<Layout><Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/login" element={<Login />} /><Route path="/dashboard" element={<Dashboard />} />
    <Route path="/tasks" element={<Tasks />} /><Route path="/tasks/new" element={<TaskNew />} />
    <Route path="/tasks/:id" element={<TaskDetail />} /><Route path="/payment/:id" element={<Payment />} />
    <Route path="/execution/:id" element={<Execution />} /><Route path="/receipts" element={<Receipts />} />
    <Route path="/receipts/:id" element={<ReceiptDetail />} /><Route path="/devices" element={<Devices />} />
    <Route path="/analytics" element={<Analytics />} />
    <Route path="/optimization" element={<Optimization />} /><Route path="/history" element={<History />} />
    <Route path="/alerts" element={<Alerts />} /><Route path="/audit" element={<Audit />} />
    <Route path="/settings" element={<Settings />} /><Route path="/setup" element={<Setup />} />
 </Routes></Layout>);
}


