import { BrowserRouter, Routes, Route } from "react-router-dom";
import MissionControl from "@/pages/MissionControl";
import "@/App.css";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MissionControl />} />
          <Route path="/mission-control" element={<MissionControl />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;
