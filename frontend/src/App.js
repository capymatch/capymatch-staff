import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import MissionControl from "./pages/MissionControl";
import SupportPod from "./pages/SupportPod";
import EventHome from "./pages/EventHome";
import EventPrep from "./pages/EventPrep";
import LiveEvent from "./pages/LiveEvent";
import EventSummary from "./pages/EventSummary";

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
          <Route path="/support-pods/:athleteId" element={<SupportPod />} />
          <Route path="*" element={<Navigate to="/mission-control" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
