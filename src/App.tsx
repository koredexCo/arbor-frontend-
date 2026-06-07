import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { ChatPage } from "./pages/ChatPage";
import { SettingsPage } from "./pages/SettingsPage";
import { CompareBranches } from "./pages/CompareBranches";
import { AccountPage } from "./pages/AccountPage";
import { JoinPage } from "./pages/JoinPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";
import { ProjectPage } from "./pages/ProjectPage";
import { TeamPage } from "./pages/TeamPage";

// Ops IDE Imports
import { OpsLayout } from "./components/OpsLayout";
import { CognitiveGraphExplorer } from "./modules/cognitive-graph/CognitiveGraphExplorer";
import { RetrievalExplainability } from "./modules/retrieval/RetrievalExplainability";
import { CivilizationReplay } from "./modules/replay/CivilizationReplay";

function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded bg-white  to-white 
                          flex items-center justify-center shadow-lg shadow-none -soft">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
          </div>
          <p className="text-sm text-[#52504b] font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public route */}
        <Route
          path="/"
          element={
            session?.access_token ? <Navigate to="/dashboard" replace /> : <Landing />
          }
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            session?.access_token ? <Dashboard /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/chat/:conversationId"
          element={
            session?.access_token ? <ChatPage /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/settings"
          element={
            session?.access_token ? <SettingsPage /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/compare"
          element={
            session?.access_token ? <CompareBranches /> : <Navigate to="/" replace />
          }
        />

        {/* Ops IDE Routes */}
        <Route path="/ops" element={session?.access_token ? <OpsLayout><Navigate to="/ops/graph" replace /></OpsLayout> : <Navigate to="/" replace />} />
        <Route path="/ops/graph" element={session?.access_token ? <OpsLayout><CognitiveGraphExplorer /></OpsLayout> : <Navigate to="/" replace />} />
        <Route path="/ops/retrieval" element={session?.access_token ? <OpsLayout><RetrievalExplainability /></OpsLayout> : <Navigate to="/" replace />} />
        <Route path="/ops/replay" element={session?.access_token ? <OpsLayout><CivilizationReplay /></OpsLayout> : <Navigate to="/" replace />} />

        {/* Account */}
        <Route
          path="/account"
          element={session?.access_token ? <AccountPage /> : <Navigate to="/" replace />}
        />

        {/* Join via invite — public, handles own auth state */}
        <Route path="/join" element={<JoinPage />} />

        {/* Team project pages */}
        <Route
          path="/project/:projectId"
          element={session?.access_token ? <ProjectPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/team/:projectId"
          element={session?.access_token ? <TeamPage /> : <Navigate to="/" replace />}
        />

        {/* Static public pages */}
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
