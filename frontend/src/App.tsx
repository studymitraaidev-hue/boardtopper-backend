import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthProvider from './context/AuthContext';
import ProtectedRoute from './components/router/ProtectedRoute';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import LandingPage from './pages/LandingPage';
import NotFound from './pages/NotFound';

const Dashboard         = lazy(() => import('./pages/Dashboard'));
const DoubtSolver       = lazy(() => import('./pages/DoubtSolver'));
const NotesGenerator    = lazy(() => import('./pages/NotesGenerator'));
const ExamSimulation    = lazy(() => import('./pages/ExamSimulation'));
const Login             = lazy(() => import('./pages/Login'));
const Signup            = lazy(() => import('./pages/Signup'));
const Onboarding        = lazy(() => import('./pages/Onboarding'));
const PricingPage       = lazy(() => import('./pages/Pricing'));
const ForgotPassword    = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword     = lazy(() => import('./pages/ResetPassword'));
const AuthCallback      = lazy(() => import('./pages/AuthCallback'));
const EmergencyModePage = lazy(() => import('./pages/EmergencyMode'));
const MyNotes           = lazy(() => import('./pages/MyNotes'));
const Settings          = lazy(() => import('./pages/Settings'));
const LikelyQuestions  = lazy(() => import('./pages/LikelyQuestions'));
const VerifyEmail       = lazy(() => import('./pages/VerifyEmail'));

// Policy pages
const PrivacyPolicy     = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService    = lazy(() => import('./pages/TermsOfService'));
const RefundPolicy      = lazy(() => import('./pages/RefundPolicy'));
const ContactUs         = lazy(() => import('./pages/ContactUs'));

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/"                element={<LandingPage />} />
              <Route path="/login"           element={<Login />} />
              <Route path="/signup"          element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password"  element={<ResetPassword />} />
              <Route path="/auth/callback"   element={<AuthCallback />} />
              <Route path="/pricing"         element={<PricingPage />} />

              {/* Policy pages â€” public, no auth required */}
              <Route path="/privacy"         element={<PrivacyPolicy />} />
              <Route path="/terms"           element={<TermsOfService />} />
              <Route path="/refund"          element={<RefundPolicy />} />
              <Route path="/contact"         element={<ContactUs />} />
              <Route path="/verify-email"    element={<VerifyEmail />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/onboarding"   element={<Onboarding />} />
                <Route path="/dashboard"    element={<Dashboard />} />
                <Route path="/doubt-solver" element={<DoubtSolver />} />
                <Route path="/notes"        element={<NotesGenerator />} />
                <Route path="/simulation"   element={<ExamSimulation />} />
                <Route path="/emergency"    element={<EmergencyModePage />} />
                <Route path="/my-notes"     element={<MyNotes />} />
                <Route path="/settings"     element={<Settings />} />
                <Route path="/likely-questions" element={<LikelyQuestions />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;


