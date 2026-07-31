import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { PathProvider } from "@/lib/pathContext";
import Auth from "./pages/Auth";
import NotifDemoTmp from "./pages/NotifDemoTmp";
import Checkout from "./pages/Checkout";
import CheckoutReturn from "./pages/CheckoutReturn";
import PathSelection from "./pages/PathSelection";
import Dashboard from "./pages/Dashboard";
import Levels from "./pages/Levels";
import LevelDetail from "./pages/LevelDetail";
import GroupFinalTest from "./pages/GroupFinalTest";
import Review from "./pages/Review";
import Account from "./pages/Account";

import Diplomas from "./pages/Diplomas";
import AdminPanel from "./pages/AdminPanel";
import AdminShare from "./pages/AdminShare";
import InvitePage from "./pages/InvitePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile } = useAuth();
  if (loading || (user && !profile)) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Načítání...</p></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile.has_paid) return <Navigate to="/checkout" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PathProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/__notif-demo" element={<NotifDemoTmp />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/checkout/return" element={<CheckoutReturn />} />
                <Route path="/invite/:code" element={<InvitePage />} />
                <Route path="/" element={<ProtectedRoute><PathSelection /></ProtectedRoute>} />
                
                {/* Products path */}
                <Route path="/products" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/products/levels" element={<ProtectedRoute><Levels /></ProtectedRoute>} />
                <Route path="/products/level/:levelId" element={<ProtectedRoute><LevelDetail /></ProtectedRoute>} />
                <Route path="/products/review" element={<ProtectedRoute><Review /></ProtectedRoute>} />
                <Route path="/products/achievements" element={<Navigate to="/products" replace />} />
                <Route path="/products/diplomas" element={<ProtectedRoute><Diplomas /></ProtectedRoute>} />
                <Route path="/products/group/:groupId/test" element={<ProtectedRoute><GroupFinalTest /></ProtectedRoute>} />

                {/* Backoffice path */}
                <Route path="/backoffice" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/backoffice/levels" element={<ProtectedRoute><Levels /></ProtectedRoute>} />
                <Route path="/backoffice/level/:levelId" element={<ProtectedRoute><LevelDetail /></ProtectedRoute>} />
                <Route path="/backoffice/review" element={<ProtectedRoute><Review /></ProtectedRoute>} />
                <Route path="/backoffice/achievements" element={<Navigate to="/backoffice" replace />} />
                <Route path="/backoffice/diplomas" element={<ProtectedRoute><Diplomas /></ProtectedRoute>} />
                <Route path="/backoffice/group/:groupId/test" element={<ProtectedRoute><GroupFinalTest /></ProtectedRoute>} />

                {/* Shared - per section */}
                <Route path="/products/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
                <Route path="/backoffice/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
                <Route path="/products/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
                <Route path="/backoffice/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
                <Route path="/products/share" element={<ProtectedRoute><AdminShare /></ProtectedRoute>} />
                <Route path="/backoffice/share" element={<ProtectedRoute><AdminShare /></ProtectedRoute>} />
                
                {/* Legacy redirects */}
                <Route path="/account" element={<Navigate to="/products/account" replace />} />
                <Route path="/admin" element={<Navigate to="/products/admin" replace />} />
                <Route path="/share" element={<Navigate to="/products/share" replace />} />
                <Route path="/admin/share" element={<Navigate to="/products/share" replace />} />
                
                {/* Legacy redirects */}
                <Route path="/levels" element={<Navigate to="/products/levels" replace />} />
                <Route path="/review" element={<Navigate to="/products/review" replace />} />
                <Route path="/achievements" element={<Navigate to="/products/achievements" replace />} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PathProvider>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
