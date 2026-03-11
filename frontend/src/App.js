import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";
import { SubscriptionProvider } from "./lib/subscription";
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
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminIntegrationsPage from "./pages/admin/AdminIntegrationsPage";
import AdminUniversitiesPage from "./pages/admin/AdminUniversitiesPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminUserDetailPage from "./pages/admin/AdminUserDetailPage";
import AdminSubscriptionsPage from "./pages/admin/AdminSubscriptionsPage";
import RosterPage from "./pages/RosterPage";
import ProfilePage from "./pages/ProfilePage";
import AthleteComingSoonPage from "./pages/AthleteComingSoonPage";
import AthleteSettingsPage from "./pages/athlete/SettingsPage";
import AthleteDashboard from "./pages/AthleteDashboard";
import AthleteProfilePage from "./pages/athlete/ProfilePage";
import AthleteCalendarPage from "./pages/athlete/CalendarPage";
import AthleteSchoolsPage from "./pages/athlete/SchoolsPage";
import AthleteSchoolDetailPage from "./pages/athlete/SchoolDetailPage";
import AthletePipelinePage from "./pages/athlete/PipelinePage";
import AthleteJourneyPage from "./pages/athlete/JourneyPage";
import AthleteOnboardingQuiz from "./pages/athlete/OnboardingQuiz";
import AthletePublicProfile from "./pages/public/AthletePublicProfile";
import AthleteInboxPage from "./pages/athlete/InboxPage";
import AthleteOutreachPage from "./pages/athlete/OutreachAnalysisPage";
import AthleteHighlightPage from "./pages/athlete/HighlightAdvisorPage";

function getHomeRoute(role, onboardingDone) {
  if (role === "platform_admin") return "/admin/dashboard";
  if (role === "director" || role === "club_coach") return "/mission-control";
  if ((role === "athlete" || role === "parent") && onboardingDone === false) return "/onboarding";
  return "/board"; // athlete, parent
}

function ProtectedRoute({ children, useLayout = true, allowedRoles }) {
  const { user, loading, onboardingDone } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--cm-bg)" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== "platform_admin") {
    return <Navigate to={getHomeRoute(user.role, onboardingDone)} replace />;
  }
  // For athletes: wait for onboarding check, then redirect if needed
  const isAthlete = user.role === "athlete" || user.role === "parent";
  if (isAthlete && onboardingDone === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--cm-bg)" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }
  if (isAthlete && onboardingDone === false && window.location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  if (useLayout) return <AppLayout>{children}</AppLayout>;
  return children;
}

function AppRoutes() {
  const { user, loading, onboardingDone } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--cm-bg)" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const home = user ? getHomeRoute(user.role, onboardingDone) : "/login";

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={home} replace /> : <LoginPage />} />
      <Route path="/forgot-password" element={user ? <Navigate to={home} replace /> : <ForgotPasswordPage />} />
      <Route path="/reset-password" element={user ? <Navigate to={home} replace /> : <ResetPasswordPage />} />
      <Route path="/invite/:token" element={user ? <Navigate to={home} replace /> : <AcceptInvitePage />} />

      {/* ── Staff routes (director + coach) ── */}
      <Route path="/mission-control" element={<ProtectedRoute allowedRoles={["director","club_coach"]}><MissionControl /></ProtectedRoute>} />
      <Route path="/events" element={<ProtectedRoute allowedRoles={["director","club_coach"]}><EventHome /></ProtectedRoute>} />
      <Route path="/events/:eventId/prep" element={<ProtectedRoute allowedRoles={["director","club_coach"]}><EventPrep /></ProtectedRoute>} />
      <Route path="/events/:eventId/live" element={<ProtectedRoute allowedRoles={["director","club_coach"]}><LiveEvent /></ProtectedRoute>} />
      <Route path="/events/:eventId/summary" element={<ProtectedRoute allowedRoles={["director","club_coach"]}><EventSummary /></ProtectedRoute>} />
      <Route path="/advocacy" element={<ProtectedRoute allowedRoles={["director","club_coach"]}><AdvocacyHome /></ProtectedRoute>} />
      <Route path="/advocacy/new" element={<ProtectedRoute allowedRoles={["director","club_coach"]}><RecommendationBuilder /></ProtectedRoute>} />
      <Route path="/advocacy/:recommendationId" element={<ProtectedRoute allowedRoles={["director","club_coach"]}><RecommendationDetail /></ProtectedRoute>} />
      <Route path="/advocacy/relationships/:schoolId" element={<ProtectedRoute allowedRoles={["director","club_coach"]}><RelationshipDetail /></ProtectedRoute>} />
      <Route path="/program" element={<ProtectedRoute allowedRoles={["director","club_coach"]}><ProgramIntelligence /></ProtectedRoute>} />
      <Route path="/invites" element={<ProtectedRoute allowedRoles={["director"]}><InvitesPage /></ProtectedRoute>} />
      <Route path="/roster" element={<ProtectedRoute allowedRoles={["director"]}><RosterPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute allowedRoles={["director","platform_admin"]}><AdminStatus /></ProtectedRoute>} />
      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={["director","platform_admin"]}><AdminDashboardPage /></ProtectedRoute>} />
      <Route path="/admin/integrations" element={<ProtectedRoute allowedRoles={["director","platform_admin"]}><AdminIntegrationsPage /></ProtectedRoute>} />
      <Route path="/admin/universities" element={<ProtectedRoute allowedRoles={["director","platform_admin"]}><AdminUniversitiesPage /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["platform_admin"]}><AdminUsersPage /></ProtectedRoute>} />
      <Route path="/admin/users/:userId" element={<ProtectedRoute allowedRoles={["platform_admin"]}><AdminUserDetailPage /></ProtectedRoute>} />
      <Route path="/admin/subscriptions" element={<ProtectedRoute allowedRoles={["platform_admin"]}><AdminSubscriptionsPage /></ProtectedRoute>} />
      <Route path="/support-pods/:athleteId" element={<ProtectedRoute allowedRoles={["director","club_coach"]}><SupportPod /></ProtectedRoute>} />

      {/* ── Athlete / Parent routes ── */}
      <Route path="/onboarding" element={<ProtectedRoute useLayout={false} allowedRoles={["athlete","parent"]}><AthleteOnboardingQuiz /></ProtectedRoute>} />
      <Route path="/board" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteDashboard /></ProtectedRoute>} />
      <Route path="/pipeline" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthletePipelinePage /></ProtectedRoute>} />
      <Route path="/pipeline/:programId" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteJourneyPage /></ProtectedRoute>} />
      <Route path="/schools" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteSchoolsPage /></ProtectedRoute>} />
      <Route path="/schools/:domain" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteSchoolDetailPage /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteCalendarPage /></ProtectedRoute>} />
      <Route path="/inbox" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteInboxPage /></ProtectedRoute>} />
      <Route path="/athlete-profile" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteProfilePage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteOutreachPage /></ProtectedRoute>} />
      <Route path="/highlights" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteHighlightPage /></ProtectedRoute>} />
      <Route path="/athlete-settings" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteSettingsPage /></ProtectedRoute>} />

      {/* ── Public routes (no auth) ── */}
      <Route path="/p/:slug" element={<AthletePublicProfile />} />
      <Route path="/s/:shortId" element={<AthletePublicProfile />} />

      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <Toaster position="bottom-right" richColors />
      <ThemeProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </SubscriptionProvider>
        </AuthProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
