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
import AthleteComingSoonPage from "./pages/AthleteComingSoonPage";
import AthleteDashboard from "./pages/AthleteDashboard";
import AthleteProfilePage from "./pages/athlete/ProfilePage";
import AthleteCalendarPage from "./pages/athlete/CalendarPage";
import AthleteSchoolsPage from "./pages/athlete/SchoolsPage";
import AthleteSchoolDetailPage from "./pages/athlete/SchoolDetailPage";
import AthletePipelinePage from "./pages/athlete/PipelinePage";
import AthleteJourneyPage from "./pages/athlete/JourneyPage";
import AthletePublicProfile from "./pages/public/AthletePublicProfile";

function getHomeRoute(role) {
  if (role === "director" || role === "coach") return "/mission-control";
  return "/board"; // athlete, parent
}

function ProtectedRoute({ children, useLayout = true, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7FAFC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getHomeRoute(user.role)} replace />;
  }
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

  const home = user ? getHomeRoute(user.role) : "/login";

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={home} replace /> : <LoginPage />} />
      <Route path="/forgot-password" element={user ? <Navigate to={home} replace /> : <ForgotPasswordPage />} />
      <Route path="/reset-password" element={user ? <Navigate to={home} replace /> : <ResetPasswordPage />} />
      <Route path="/invite/:token" element={user ? <Navigate to={home} replace /> : <AcceptInvitePage />} />

      {/* ── Staff routes (director + coach) ── */}
      <Route path="/mission-control" element={<ProtectedRoute allowedRoles={["director","coach"]}><MissionControl /></ProtectedRoute>} />
      <Route path="/events" element={<ProtectedRoute allowedRoles={["director","coach"]}><EventHome /></ProtectedRoute>} />
      <Route path="/events/:eventId/prep" element={<ProtectedRoute allowedRoles={["director","coach"]}><EventPrep /></ProtectedRoute>} />
      <Route path="/events/:eventId/live" element={<ProtectedRoute allowedRoles={["director","coach"]}><LiveEvent /></ProtectedRoute>} />
      <Route path="/events/:eventId/summary" element={<ProtectedRoute allowedRoles={["director","coach"]}><EventSummary /></ProtectedRoute>} />
      <Route path="/advocacy" element={<ProtectedRoute allowedRoles={["director","coach"]}><AdvocacyHome /></ProtectedRoute>} />
      <Route path="/advocacy/new" element={<ProtectedRoute allowedRoles={["director","coach"]}><RecommendationBuilder /></ProtectedRoute>} />
      <Route path="/advocacy/:recommendationId" element={<ProtectedRoute allowedRoles={["director","coach"]}><RecommendationDetail /></ProtectedRoute>} />
      <Route path="/advocacy/relationships/:schoolId" element={<ProtectedRoute allowedRoles={["director","coach"]}><RelationshipDetail /></ProtectedRoute>} />
      <Route path="/program" element={<ProtectedRoute allowedRoles={["director","coach"]}><ProgramIntelligence /></ProtectedRoute>} />
      <Route path="/invites" element={<ProtectedRoute allowedRoles={["director"]}><InvitesPage /></ProtectedRoute>} />
      <Route path="/roster" element={<ProtectedRoute allowedRoles={["director"]}><RosterPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute allowedRoles={["director"]}><AdminStatus /></ProtectedRoute>} />
      <Route path="/support-pods/:athleteId" element={<ProtectedRoute allowedRoles={["director","coach"]}><SupportPod /></ProtectedRoute>} />

      {/* ── Athlete / Parent routes ── */}
      <Route path="/board" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteDashboard /></ProtectedRoute>} />
      <Route path="/pipeline" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthletePipelinePage /></ProtectedRoute>} />
      <Route path="/pipeline/:programId" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteJourneyPage /></ProtectedRoute>} />
      <Route path="/schools" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteSchoolsPage /></ProtectedRoute>} />
      <Route path="/schools/:domain" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteSchoolDetailPage /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteCalendarPage /></ProtectedRoute>} />
      <Route path="/inbox" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteComingSoonPage /></ProtectedRoute>} />
      <Route path="/athlete-profile" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteProfilePage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteComingSoonPage /></ProtectedRoute>} />
      <Route path="/athlete-settings" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteComingSoonPage /></ProtectedRoute>} />

      {/* ── Public routes (no auth) ── */}
      <Route path="/s/:shortId" element={<AthletePublicProfile />} />

      <Route path="*" element={<Navigate to={home} replace />} />
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
