import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import MissionControl from "./pages/MissionControl";
import SupportPod from "./pages/SupportPod";

function App() {
  return (
    <div className="App">
      <Toaster position="bottom-right" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/mission-control" element={<MissionControl />} />
          <Route path="/support-pods/:athleteId" element={<SupportPod />} />
          <Route path="*" element={<Navigate to="/mission-control" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
