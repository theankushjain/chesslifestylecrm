import "@/App.css";
import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Layout from "@/components/crm/Layout";

// Lazily loaded page components for optimal bundle splitting
const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Students = lazy(() => import("@/pages/Students"));
const StudentDetail = lazy(() => import("@/pages/StudentDetail"));
const Institutes = lazy(() => import("@/pages/Institutes"));
const InstituteDetail = lazy(() => import("@/pages/InstituteDetail"));
const Leads = lazy(() => import("@/pages/Leads"));
const LeadDetail = lazy(() => import("@/pages/LeadDetail"));
const Payments = lazy(() => import("@/pages/Payments"));
const Chatbot = lazy(() => import("@/pages/Chatbot"));
const StudentPortal = lazy(() => import("@/pages/StudentPortal"));
const Classes = lazy(() => import("@/pages/Classes"));
const BatchDetail = lazy(() => import("@/pages/BatchDetail"));
const Tally = lazy(() => import("@/pages/Tally"));
const Users = lazy(() => import("@/pages/Users"));
const Tasks = lazy(() => import("@/pages/Tasks"));
const Profile = lazy(() => import("@/pages/Profile"));
const AttendanceReport = lazy(() => import("@/pages/AttendanceReport"));
const ProgressReportView = lazy(() => import("@/pages/ProgressReportView"));
const StudentForm = lazy(() => import("@/pages/StudentForm"));
const PrintBlankForm = lazy(() => import("@/pages/PrintBlankForm"));
const FeedbackForm = lazy(() => import("@/pages/FeedbackForm"));
const FeedbackDashboard = lazy(() => import("@/pages/FeedbackDashboard"));
const RegistrationForm = lazy(() => import("@/pages/RegistrationForm"));

// Lightweight fallback loader during route chunk downloads
const PageLoader = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
    <p className="text-xs text-muted-foreground font-medium">Loading view...</p>
  </div>
);

const Protected = ({ children, roles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    if (user.role === "student") {
      if (location.pathname === "/attendance") return <Navigate to="/portal?tab=attendance" replace />;
      if (location.pathname === "/payments") return <Navigate to="/portal?tab=fees" replace />;
      return <Navigate to="/portal" replace />;
    }
    if (user.role === "institute") {
      return <Navigate to={user.linked_institute_id ? `/institutes/${user.linked_institute_id}` : "/institutes"} replace />;
    }
    return <Navigate to="/" replace />;
  }
  return children;
};

const RoleHome = () => {
  const { user } = useAuth();
  if (user.role === "student") return <Navigate to="/portal" replace />;
  if (user.role === "staff") return <Navigate to="/classes" replace />;
  if (user.role === "institute") {
    return <Navigate to={user.linked_institute_id ? `/institutes/${user.linked_institute_id}` : "/institutes"} replace />;
  }
  return <Dashboard />;
};

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/p/progress/:id" element={<ProgressReportView />} />
              <Route path="/p/feedback/:id" element={<FeedbackForm />} />
              <Route path="/student-form/:id" element={<StudentForm />} />
              <Route path="/print-blank-form" element={<PrintBlankForm />} />
              <Route path="/register" element={<RegistrationForm />} />
              <Route path="/" element={<Protected><Layout /></Protected>}>
                <Route index element={<RoleHome />} />
                <Route path="students" element={<Protected roles={["admin", "staff", "institute"]}><Students /></Protected>} />
                <Route path="students/:id" element={<Protected><StudentDetail /></Protected>} />
                <Route path="institutes" element={<Protected roles={["admin", "staff", "institute"]}><Institutes /></Protected>} />
                <Route path="institutes/:id" element={<Protected roles={["admin", "staff", "institute"]}><InstituteDetail /></Protected>} />
                <Route path="leads" element={<Protected roles={["admin"]}><Leads /></Protected>} />
                <Route path="leads/:id" element={<Protected roles={["admin"]}><LeadDetail /></Protected>} />
                <Route path="classes" element={<Protected roles={["admin", "staff", "institute"]}><Classes /></Protected>} />
                <Route path="classes/:id" element={<Protected roles={["admin", "staff", "institute"]}><BatchDetail /></Protected>} />
                <Route path="payments" element={<Protected roles={["admin", "institute"]}><Payments /></Protected>} />
                <Route path="tally" element={<Protected roles={["admin"]}><Tally /></Protected>} />
                <Route path="chat" element={<Protected roles={["admin"]}><Chatbot /></Protected>} />
                <Route path="users" element={<Protected roles={["admin"]}><Users /></Protected>} />
                <Route path="attendance" element={<Protected roles={["admin", "staff", "institute"]}><AttendanceReport /></Protected>} />
                <Route path="feedback" element={<Protected roles={["admin"]}><FeedbackDashboard /></Protected>} />
                <Route path="tasks" element={<Protected roles={["admin", "staff", "student"]}><Tasks /></Protected>} />
                <Route path="portal" element={<Protected roles={["student"]}><StudentPortal /></Protected>} />
                <Route path="profile" element={<Protected><Profile /></Protected>} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
