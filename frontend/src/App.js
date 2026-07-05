import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import Layout from "@/components/crm/Layout";
import Dashboard from "@/pages/Dashboard";
import Students from "@/pages/Students";
import StudentDetail from "@/pages/StudentDetail";
import Leads from "@/pages/Leads";
import LeadDetail from "@/pages/LeadDetail";
import Payments from "@/pages/Payments";
import Chatbot from "@/pages/Chatbot";
import StudentPortal from "@/pages/StudentPortal";
import Classes from "@/pages/Classes";
import BatchDetail from "@/pages/BatchDetail";
import Tally from "@/pages/Tally";
import Users from "@/pages/Users";
import Tasks from "@/pages/Tasks";

const Protected = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={user.role === "student" ? "/portal" : "/"} replace />;
  return children;
};

const RoleHome = () => {
  const { user } = useAuth();
  if (user.role === "student") return <Navigate to="/portal" replace />;
  return <Dashboard />;
};

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Protected><Layout /></Protected>}>
              <Route index element={<RoleHome />} />
              <Route path="students" element={<Protected roles={["admin","staff"]}><Students /></Protected>} />
              <Route path="students/:id" element={<Protected><StudentDetail /></Protected>} />
              <Route path="leads" element={<Protected roles={["admin","staff"]}><Leads /></Protected>} />
              <Route path="leads/:id" element={<Protected roles={["admin","staff"]}><LeadDetail /></Protected>} />
              <Route path="classes" element={<Protected roles={["admin","staff"]}><Classes /></Protected>} />
              <Route path="classes/:id" element={<Protected roles={["admin","staff"]}><BatchDetail /></Protected>} />
              <Route path="payments" element={<Protected roles={["admin","staff"]}><Payments /></Protected>} />
              <Route path="tally" element={<Protected roles={["admin"]}><Tally /></Protected>} />
              <Route path="chat" element={<Protected roles={["admin","staff"]}><Chatbot /></Protected>} />
              <Route path="users" element={<Protected roles={["admin"]}><Users /></Protected>} />
              <Route path="tasks" element={<Protected><Tasks /></Protected>} />
              <Route path="portal" element={<Protected roles={["student"]}><StudentPortal /></Protected>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
