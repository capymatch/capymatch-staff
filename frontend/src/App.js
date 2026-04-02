import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";
import { SubscriptionProvider } from "./lib/subscription";
import ErrorBoundary from "./components/ErrorBoundary";
import AppLayout from "./components/layout/AppLayout";
import { PlanProvider } from "./PlanContext";
import { lazy, Suspense } from "react";

// ── Eagerly loaded (auth flow — needed immediately) ──
import LoginPage from "./pages/LoginPage";

// ── Lazy-loaded pages (code-split into separate chunks) ──
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const MissionControl = lazy(() => import("./pages/MissionControl"));
const SupportPod = lazy(() => import("./pages/SupportPod"));
const SchoolPod = lazy(() => import("./pages/SchoolPod"));
const EventHome = lazy(() => import("./pages/EventHome"));
const EventPrep = lazy(() => import("./pages/EventPrep"));
const LiveEvent = lazy(() => import("./pages/LiveEvent"));
const EventSummary = lazy(() => import("./pages/EventSummary"));
const AdvocacyHome = lazy(() => import("./pages/AdvocacyHome"));
const RecommendationBuilder = lazy(() => import("./pages/RecommendationBuilder"));
const RecommendationDetail = lazy(() => import("./pages/RecommendationDetail"));
const RelationshipDetail = lazy(() => import("./pages/RelationshipDetail"));
const ProgramIntelligence = lazy(() => import("./pages/ProgramIntelligence"));
const InvitesPage = lazy(() => import("./pages/InvitesPage"));
const AcceptInvitePage = lazy(() => import("./pages/AcceptInvitePage"));
const AdminStatus = lazy(() => import("./pages/AdminStatus"));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminIntegrationsPage = lazy(() => import("./pages/admin/AdminIntegrationsPage"));
const AdminUniversitiesPage = lazy(() => import("./pages/admin/AdminUniversitiesPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminUserDetailPage = lazy(() => import("./pages/admin/AdminUserDetailPage"));
const AdminSubscriptionsPage = lazy(() => import("./pages/admin/AdminSubscriptionsPage"));
const AdminOrganizationsPage = lazy(() => import("./pages/admin/AdminOrganizationsPage"));
const RosterPage = lazy(() => import("./pages/RosterPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const AthleteComingSoonPage = lazy(() => import("./pages/AthleteComingSoonPage"));
const AthleteSettingsPage = lazy(() => import("./pages/athlete/SettingsPage"));
const AthleteAccountPage = lazy(() => import("./pages/athlete/AccountPage"));
const AthleteBillingPage = lazy(() => import("./pages/athlete/BillingPage"));
const AthleteDashboard = lazy(() => import("./pages/AthleteDashboard"));
const AthleteProfilePage = lazy(() => import("./pages/athlete/ProfilePage"));
const RecapPage = lazy(() => import("./pages/athlete/RecapPage"));
const AthleteCalendarPage = lazy(() => import("./pages/athlete/CalendarPage"));
const AthleteSchoolsPage = lazy(() => import("./pages/athlete/SchoolsPage"));
const AthleteSchoolDetailPage = lazy(() => import("./pages/athlete/SchoolDetailPage"));
const AthletePipelinePage = lazy(() => import("./pages/athlete/PipelinePage"));
const AthleteJourneyPage = lazy(() => import("./pages/athlete/JourneyPage"));
const AthleteOnboardingQuiz = lazy(() => import("./pages/athlete/OnboardingQuiz"));
const AthletePublicProfile = lazy(() => import("./pages/public/AthletePublicProfile"));
const InternalAthleteProfile = lazy(() => import("./pages/staff/InternalAthleteProfile"));
const LoopInsightsPage = lazy(() => import("./pages/staff/LoopInsightsPage"));
const AthleteInboxPage = lazy(() => import("./pages/athlete/InboxPage"));
const AthleteMessagesPage = lazy(() => import("./pages/athlete/MessagesPage"));
const AthleteOutreachPage = lazy(() => import("./pages/athlete/OutreachAnalysisPage"));
const AthleteHighlightPage = lazy(() => import("./pages/athlete/HighlightAdvisorPage"));
const SocialSpotlight = lazy(() => import("./pages/SocialSpotlight"));
const ClubBillingPage = lazy(() => import("./pages/ClubBillingPage"));

function getHomeRoute(role, onboardingDone) {
  if (role === "platform_admin") return "/admin/dashboard";
  if (role === "director" || role === "club_coach" || role === "coach") return "/mission-control";
  if ((role === "athlete" || role === "parent") && onboardingDone === false) return "/onboarding";
  return "/board"; // athlete, parent
}

function ProtectedRoute({ children, useLayout = true, allowedRoles }) {
  const { user, loading, onboardingDone, effectiveRole } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--cm-bg)" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  const role = effectiveRole || user.role;
  if (allowedRoles && !allowedRoles.includes(role) && role !== "platform_admin") {
    return <Navigate to={getHomeRoute(role, onboardingDone)} replace />;
  }
  const isAthlete = role === "athlete" || role === "parent";
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

function LazyFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--cm-bg)" }}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
    </div>
  );
}

function AppRoutes() {
  const { user, loading, onboardingDone, effectiveRole } = useAuth();

  if (loading) {
    return <LazyFallback />;
  }

  const role = effectiveRole || user?.role;
  const home = user ? getHomeRoute(role, onboardingDone) : "/login";

  return (
    <Suspense fallback={<LazyFallback />}>
      <Routes>
      <Route path="/login" element={user ? <Navigate to={home} replace /> : <LoginPage />} />
      <Route path="/signup" element={user ? <Navigate to={home} replace /> : <LoginPage />} />
      <Route path="/forgot-password" element={user ? <Navigate to={home} replace /> : <ForgotPasswordPage />} />
      <Route path="/reset-password" element={user ? <Navigate to={home} replace /> : <ResetPasswordPage />} />
      <Route path="/invite/:token" element={user ? <Navigate to={home} replace /> : <AcceptInvitePage />} />

      {/* ── Staff routes (director + coach) ── */}
      <Route path="/mission-control" element={<ProtectedRoute allowedRoles={["director","club_coach","coach"]}><MissionControl /></ProtectedRoute>} />
      <Route path="/events" element={<ProtectedRoute allowedRoles={["director","club_coach","coach"]}><EventHome /></ProtectedRoute>} />
      <Route path="/events/:eventId/prep" element={<ProtectedRoute allowedRoles={["director","club_coach","coach"]}><EventPrep /></ProtectedRoute>} />
      <Route path="/events/:eventId/live" element={<ProtectedRoute useLayout={false} allowedRoles={["director","club_coach","coach"]}><LiveEvent /></ProtectedRoute>} />
      <Route path="/events/:eventId/summary" element={<ProtectedRoute allowedRoles={["director","club_coach","coach"]}><EventSummary /></ProtectedRoute>} />
      <Route path="/advocacy" element={<ProtectedRoute allowedRoles={["director","club_coach","coach"]}><AdvocacyHome /></ProtectedRoute>} />
      <Route path="/advocacy/new" element={<ProtectedRoute allowedRoles={["director","club_coach","coach"]}><RecommendationBuilder /></ProtectedRoute>} />
      <Route path="/advocacy/:recommendationId" element={<ProtectedRoute allowedRoles={["director","club_coach","coach"]}><RecommendationDetail /></ProtectedRoute>} />
      <Route path="/advocacy/relationships/:schoolId" element={<ProtectedRoute allowedRoles={["director","club_coach","coach"]}><RelationshipDetail /></ProtectedRoute>} />
      <Route path="/program" element={<ProtectedRoute allowedRoles={["director","club_coach","coach"]}><ProgramIntelligence /></ProtectedRoute>} />
      <Route path="/invites" element={<ProtectedRoute allowedRoles={["director","coach"]}><InvitesPage /></ProtectedRoute>} />
      <Route path="/roster" element={<ProtectedRoute allowedRoles={["director"]}><RosterPage /></ProtectedRoute>} />
      <Route path="/club-billing" element={<ProtectedRoute allowedRoles={["director"]}><ClubBillingPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute allowedRoles={["director","platform_admin"]}><AdminStatus /></ProtectedRoute>} />
      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={["director","platform_admin"]}><AdminDashboardPage /></ProtectedRoute>} />
      <Route path="/admin/integrations" element={<ProtectedRoute allowedRoles={["director","platform_admin"]}><AdminIntegrationsPage /></ProtectedRoute>} />
      <Route path="/admin/universities" element={<ProtectedRoute allowedRoles={["director","platform_admin"]}><AdminUniversitiesPage /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["platform_admin"]}><AdminUsersPage /></ProtectedRoute>} />
      <Route path="/admin/users/:userId" element={<ProtectedRoute allowedRoles={["platform_admin"]}><AdminUserDetailPage /></ProtectedRoute>} />
      <Route path="/admin/subscriptions" element={<ProtectedRoute allowedRoles={["platform_admin"]}><AdminSubscriptionsPage /></ProtectedRoute>} />
      <Route path="/admin/organizations" element={<ProtectedRoute allowedRoles={["platform_admin"]}><AdminOrganizationsPage /></ProtectedRoute>} />
      <Route path="/support-pods/:athleteId" element={<ProtectedRoute allowedRoles={["director","club_coach","coach"]}><SupportPod /></ProtectedRoute>} />
      <Route path="/support-pods/:athleteId/school/:programId" element={<ProtectedRoute allowedRoles={["director","club_coach","coach"]}><SchoolPod /></ProtectedRoute>} />
      <Route path="/internal/athlete/:athleteId/profile" element={<ProtectedRoute allowedRoles={["director","club_coach","coach","platform_admin"]}><InternalAthleteProfile /></ProtectedRoute>} />
      <Route path="/internal/loop-insights" element={<ProtectedRoute allowedRoles={["director","platform_admin"]}><LoopInsightsPage /></ProtectedRoute>} />

      {/* ── Athlete / Parent routes ── */}
      <Route path="/onboarding" element={<ProtectedRoute useLayout={false} allowedRoles={["athlete","parent"]}><AthleteOnboardingQuiz /></ProtectedRoute>} />
      <Route path="/board" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteDashboard /></ProtectedRoute>} />
      <Route path="/pipeline" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthletePipelinePage /></ProtectedRoute>} />
      <Route path="/recap" element={<Navigate to="/pipeline" replace />} />
      <Route path="/pipeline/:programId" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteJourneyPage /></ProtectedRoute>} />
      <Route path="/schools" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteSchoolsPage /></ProtectedRoute>} />
      <Route path="/schools/:domain" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteSchoolDetailPage /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteCalendarPage /></ProtectedRoute>} />
      <Route path="/inbox" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteInboxPage /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute allowedRoles={["athlete","parent","club_coach","coach","director"]}><AthleteMessagesPage /></ProtectedRoute>} />
      <Route path="/athlete-profile" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteProfilePage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteOutreachPage /></ProtectedRoute>} />
      <Route path="/highlights" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteHighlightPage /></ProtectedRoute>} />
      <Route path="/athlete-settings" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteSettingsPage /></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteAccountPage /></ProtectedRoute>} />
      <Route path="/billing" element={<ProtectedRoute allowedRoles={["athlete","parent"]}><AthleteBillingPage /></ProtectedRoute>} />
      <Route path="/spotlight" element={<ProtectedRoute allowedRoles={["athlete","parent","club_coach","coach","director"]}><SocialSpotlight /></ProtectedRoute>} />

      {/* ── Public routes (no auth) ── */}
      <Route path="/p/:slug" element={<AthletePublicProfile />} />
      <Route path="/s/:shortId" element={<AthletePublicProfile />} />

      <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <div className="App">
      <Toaster position="bottom-right" richColors />
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <PlanProvider>
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </PlanProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </div>
  );
}

export default App;
