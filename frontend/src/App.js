import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./AuthContext";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import MissionControl from "./pages/MissionControl";
import SupportPod from "./pages/SupportPod";
import EventHome from "./pages/EventHome";
import EventPrep from "./pages/EventPrep";
import LiveEvent from "./pages/LiveEvent";
import EventSummary from "./pages/EventSummary";
import AdvocacyHome from "./pages/AdvocacyHome";
import RecommendationBuilder from "./pages/RecommendationBuilder";
import RecommendationDetail from "./pages/RecommendationDetail";
import RelationshipDetail from "./pages/RelationshipDetail";
import ProgramIntelligence from "./pages/ProgramIntelligence";
import InvitesPage from "./pages/InvitesPage";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import AdminStatus from "./pages/AdminStatus";
import RosterPage from "./pages/RosterPage";
import ProfilePage from "./pages/ProfilePage";

function ProtectedRoute({ children, useLayout = true }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7FAFC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (useLayout) return <AppLayout>{children}</AppLayout>;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7FAFC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/mission-control" replace /> : <LoginPage />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/mission-control" replace /> : <ForgotPasswordPage />} />
      <Route path="/reset-password" element={user ? <Navigate to="/mission-control" replace /> : <ResetPasswordPage />} />
      <Route path="/invite/:token" element={user ? <Navigate to="/mission-control" replace /> : <AcceptInvitePage />} />

      {/* All protected routes get the sidebar layout automatically */}
      <Route path="/mission-control" element={<ProtectedRoute><MissionControl /></ProtectedRoute>} />
      <Route path="/events" element={<ProtectedRoute><EventHome /></ProtectedRoute>} />
      <Route path="/events/:eventId/prep" element={<ProtectedRoute><EventPrep /></ProtectedRoute>} />
      <Route path="/events/:eventId/live" element={<ProtectedRoute><LiveEvent /></ProtectedRoute>} />
      <Route path="/events/:eventId/summary" element={<ProtectedRoute><EventSummary /></ProtectedRoute>} />
      <Route path="/advocacy" element={<ProtectedRoute><AdvocacyHome /></ProtectedRoute>} />
      <Route path="/advocacy/new" element={<ProtectedRoute><RecommendationBuilder /></ProtectedRoute>} />
      <Route path="/advocacy/:recommendationId" element={<ProtectedRoute><RecommendationDetail /></ProtectedRoute>} />
      <Route path="/advocacy/relationships/:schoolId" element={<ProtectedRoute><RelationshipDetail /></ProtectedRoute>} />
      <Route path="/program" element={<ProtectedRoute><ProgramIntelligence /></ProtectedRoute>} />
      <Route path="/invites" element={<ProtectedRoute><InvitesPage /></ProtectedRoute>} />
      <Route path="/roster" element={<ProtectedRoute><RosterPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminStatus /></ProtectedRoute>} />
      <Route path="/support-pods/:athleteId" element={<ProtectedRoute><SupportPod /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={user ? "/mission-control" : "/login"} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <Toaster position="bottom-right" richColors />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
