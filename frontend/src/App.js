import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
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
import AdminStatus from "./pages/AdminStatus";

function App() {
  return (
    <div className="App">
      <Toaster position="bottom-right" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/mission-control" element={<MissionControl />} />
          <Route path="/events" element={<EventHome />} />
          <Route path="/events/:eventId/prep" element={<EventPrep />} />
          <Route path="/events/:eventId/live" element={<LiveEvent />} />
          <Route path="/events/:eventId/summary" element={<EventSummary />} />
          <Route path="/advocacy" element={<AdvocacyHome />} />
          <Route path="/advocacy/new" element={<RecommendationBuilder />} />
          <Route path="/advocacy/:recommendationId" element={<RecommendationDetail />} />
          <Route path="/advocacy/relationships/:schoolId" element={<RelationshipDetail />} />
          <Route path="/program" element={<ProgramIntelligence />} />
          <Route path="/admin" element={<AdminStatus />} />
          <Route path="/support-pods/:athleteId" element={<SupportPod />} />
          <Route path="*" element={<Navigate to="/mission-control" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
