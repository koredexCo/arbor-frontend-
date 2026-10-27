import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { AppShell } from "./components/AppShell";

// Existing Pages
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { ChatPage } from "./pages/ChatPage";
import { SettingsPage } from "./pages/SettingsPage";
import { CompareBranches } from "./pages/CompareBranches";
import { AccountPage } from "./pages/AccountPage";
import { JoinPage } from "./pages/JoinPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";
import { AcceptTermsPage } from "./pages/AcceptTermsPage";
import { ProjectPage } from "./pages/ProjectPage";
import { TeamPage } from "./pages/TeamPage";
import { WorkspaceIDE } from "./pages/WorkspaceIDE";

// Ops IDE Imports
import { OpsLayout } from "./components/OpsLayout";
import { CognitiveGraphExplorer } from "./modules/cognitive-graph/CognitiveGraphExplorer";
import { RetrievalExplainability } from "./modules/retrieval/RetrievalExplainability";
import { CivilizationReplay } from "./modules/replay/CivilizationReplay";

// Phase B: 13 Primary Section Route Pages
import { HomePage } from "./pages/HomePage";
import { ResearchPage } from "./pages/ResearchPage";
import { MissionsPage } from "./pages/MissionsPage";
import { WorkspacesPage } from "./pages/WorkspacesPage";
import { ComputerOperatorPage } from "./pages/ComputerOperatorPage";
import { IntelligencePage } from "./pages/IntelligencePage";
import { MemoryPage } from "./pages/MemoryPage";
import { ToolsPage } from "./pages/ToolsPage";
import { EngineeringPage } from "./pages/EngineeringPage";
import { DevicesPage } from "./pages/DevicesPage";
import { GovernancePage } from "./pages/GovernancePage";
import { SystemHealthPage } from "./pages/SystemHealthPage";
import { NotificationsPage } from "./pages/NotificationsPage";

function AppContent() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-app-bg text-app-text flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-xl bg-app-card border border-app-border flex items-center justify-center shadow-lg animate-pulse-soft">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
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
          <p className="text-xs font-mono text-app-muted">Initializing Arbor Level 2...</p>
        </div>
      </div>
    );
  }

  const isAuthenticated = Boolean(session?.access_token);

  const renderProtected = (element: React.ReactElement) => {
    return isAuthenticated ? <AppShell>{element}</AppShell> : <Navigate to="/" replace />;
  };

  return (
    <Router>
      <Routes>
        {/* Public Landing & Product Entry */}
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/home" replace /> : <Landing />}
        />
        <Route path="/welcome" element={<Landing />} />

        {/* 13 Primary Navigation Routes */}
        <Route path="/home" element={renderProtected(<HomePage />)} />
        <Route path="/research" element={renderProtected(<ResearchPage />)} />
        <Route path="/missions" element={renderProtected(<MissionsPage />)} />
        <Route path="/workspaces" element={renderProtected(<WorkspacesPage />)} />
        <Route path="/workspace/:id" element={renderProtected(<WorkspaceIDE />)} />
        <Route path="/workspace" element={renderProtected(<WorkspaceIDE />)} />
        <Route path="/computer" element={renderProtected(<ComputerOperatorPage />)} />
        <Route path="/computer-operator" element={renderProtected(<ComputerOperatorPage />)} />
        <Route path="/intelligence" element={renderProtected(<IntelligencePage />)} />
        <Route path="/intelligence/compare" element={renderProtected(<CompareBranches />)} />
        <Route path="/memory" element={renderProtected(<MemoryPage />)} />
        <Route
          path="/memory/debugger"
          element={renderProtected(<OpsLayout><RetrievalExplainability /></OpsLayout>)}
        />
        <Route
          path="/memory/replay"
          element={renderProtected(<OpsLayout><CivilizationReplay /></OpsLayout>)}
        />
        <Route path="/tools" element={renderProtected(<ToolsPage />)} />
        <Route path="/engineering" element={renderProtected(<EngineeringPage />)} />
        <Route path="/devices" element={renderProtected(<DevicesPage />)} />
        <Route path="/governance" element={renderProtected(<GovernancePage />)} />
        <Route path="/health" element={renderProtected(<SystemHealthPage />)} />
        <Route path="/settings" element={renderProtected(<SettingsPage />)} />
        <Route path="/notifications" element={renderProtected(<NotificationsPage />)} />

        {/* Preserved Predecessor & Secondary Routes */}
        <Route path="/dashboard" element={renderProtected(<Dashboard />)} />
        <Route path="/chat/:conversationId" element={renderProtected(<ChatPage />)} />
        <Route path="/compare" element={renderProtected(<CompareBranches />)} />
        <Route
          path="/ops"
          element={renderProtected(<OpsLayout><Navigate to="/ops/graph" replace /></OpsLayout>)}
        />
        <Route
          path="/ops/graph"
          element={renderProtected(<OpsLayout><CognitiveGraphExplorer /></OpsLayout>)}
        />
        <Route
          path="/ops/retrieval"
          element={renderProtected(<OpsLayout><RetrievalExplainability /></OpsLayout>)}
        />
        <Route
          path="/ops/replay"
          element={renderProtected(<OpsLayout><CivilizationReplay /></OpsLayout>)}
        />
        <Route path="/account" element={renderProtected(<AccountPage />)} />
        <Route path="/project/:projectId" element={renderProtected(<ProjectPage />)} />
        <Route path="/team/:projectId" element={renderProtected(<TeamPage />)} />

        {/* Public & Legal Gateways */}
        <Route path="/join" element={<JoinPage />} />
        <Route path="/accept-terms" element={<AcceptTermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
