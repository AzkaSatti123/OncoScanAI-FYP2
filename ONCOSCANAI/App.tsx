import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LandingPage            from './pages/LandingPage';
import Login                  from './pages/Login';
import SignUp                 from './pages/SignUp';
import VisionWorkbench        from './pages/VisionWorkbench';
import UploadScans            from './pages/UploadScans';
import MultiClassHistoAnalysis from './pages/MultiClassHistoAnalysis';
import PatientData            from './pages/PatientData';
import Reports                from './pages/Reports';
import Settings               from './pages/Settings';

/* ─── Guards ─── */

/** Redirect to /login when not authenticated */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user)   return <Navigate to="/login" replace />;
  return <>{children}</>;
};

/** Redirect logged-in users away from /login and /signup */
const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading)  return <LoadingScreen />;
  if (user)     return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center"
    style={{ background: 'linear-gradient(135deg,#e8eaf6,#f3e8ff,#fce7f3)' }}>
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow"
        style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <div className="w-6 h-6 border-2 border-brand-pink border-t-transparent rounded-full animate-spin" />
    </div>
  </div>
);

/* ─── Router ─── */
const AppRoutes: React.FC = () => (
  <Routes>
    {/* Public */}
    <Route path="/"       element={<LandingPage />} />
    <Route path="/login"  element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
    <Route path="/signup" element={<PublicOnlyRoute><SignUp /></PublicOnlyRoute>} />

    {/* Protected dashboard routes */}
    <Route path="/dashboard" element={<ProtectedRoute><Navigate to="/dashboard/vision-workbench" replace /></ProtectedRoute>} />
    <Route path="/dashboard/vision-workbench"    element={<ProtectedRoute><VisionWorkbench /></ProtectedRoute>} />
    <Route path="/dashboard/multi-class-histo"   element={<ProtectedRoute><MultiClassHistoAnalysis /></ProtectedRoute>} />
    <Route path="/dashboard/ultrasound-analysis" element={<ProtectedRoute><UploadScans /></ProtectedRoute>} />
    <Route path="/dashboard/patient-data"        element={<ProtectedRoute><PatientData /></ProtectedRoute>} />
    <Route path="/dashboard/reports"             element={<ProtectedRoute><Reports /></ProtectedRoute>} />
    <Route path="/dashboard/settings"            element={<ProtectedRoute><Settings /></ProtectedRoute>} />

    {/* Legacy compatibility */}
    <Route path="/dashboard/upload-scans"   element={<ProtectedRoute><UploadScans /></ProtectedRoute>} />
    <Route path="/dashboard/histo-analysis" element={<Navigate to="/dashboard/vision-workbench" replace />} />

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/" />} />
  </Routes>
);

const App: React.FC = () => (
  <AuthProvider>
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  </AuthProvider>
);

export default App;
