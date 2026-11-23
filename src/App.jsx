import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useState, useEffect } from 'react';
import LoadingScreen from './components/LoadingScreen';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import CategoryPage from './pages/CategoryPage';
import ProductDetail from './pages/ProductDetail';
import SearchPage from './pages/SearchPage';
import ProtectedRoute from './pages/ProtectedRoute';
import UnderProgress from './pages/UnderProgress';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import ProductManagement from './pages/admin/ProductManagement';
import AddProduct from './pages/admin/AddProduct';
import BillingDashboard from './pages/admin/BillingDashboard';
import RegularBillingDashboard from './pages/admin/RegularBillingDashboard'; // NEW

// Wholesale Dashboard Imports
import WholesaleDashboard from './pages/wholesale/WholesaleDashboard';
import WholesaleHome from './pages/wholesale/WholesaleHome';
import WholesaleBilling from './pages/wholesale/WholesaleBilling';
import JamaKharchSilver from './pages/wholesale/JamaKharchSilver';
import JamaKharchCash from './pages/wholesale/JamaKharchCash';
import WholesaleBullen from './pages/wholesale/WholesaleBullen';
import ProductBilling from './pages/wholesale/ProductBilling'; // NEW
import GSTBilling from './pages/wholesale/GSTBilling'; // NEW


// Regular Dashboard Imports
import RegularDashboard from './pages/regular/RegularDashboard';
import RegularHome from './pages/regular/RegularHome';
import RegularBilling from './pages/regular/RegularBilling';
import RJamaKharchSilver from './pages/regular/JamaKharchSilver';
import RJamaKharchCash from './pages/regular/JamaKharchCash';
import MetalCalculator from './pages/regular/MetalCalculator';
import RegularBullen from './pages/regular/RegularBullen';

import WholesaleBullenList from './pages/wholesale/BullenList';
import WholesaleBullenLedger from './pages/wholesale/BullenLedger';
import RegularBullenList from './pages/regular/BullenList';
import RegularBullenLedger from './pages/regular/BullenLedger';
import Employee from './pages/regular/Employee';              // ← ADD THIS
import EmployeeLedger from './pages/regular/EmployeeLedger';
import PitalKaam from './pages/regular/PitalKaam';

// Redirects visitors based on authentication status & role:
// - Not logged in -> /login (shows login page directly after loading)
// - Logged in Admin -> /admin
// - Logged in Regular User -> /under-progress
const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-purple-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/under-progress" replace />;
};

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hasSeenLoading = sessionStorage.getItem('hasSeenLoading');
    if (hasSeenLoading) {
      setLoading(false);
    }
  }, []);

  const handleLoadingComplete = () => {
    sessionStorage.setItem('hasSeenLoading', 'true');
    setLoading(false);
  };

  if (loading) {
    return <LoadingScreen onLoadingComplete={handleLoadingComplete} />;
  }

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute adminOnly>
                <ProductManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products/add"
            element={
              <ProtectedRoute adminOnly>
                <AddProduct />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products/edit/:id"
            element={
              <ProtectedRoute adminOnly>
                <AddProduct />
              </ProtectedRoute>
            }
          />

          {/* Wholesale Billing Admin Routes */}
          <Route
            path="/admin/billing"
            element={
              <ProtectedRoute adminOnly>
                <BillingDashboard />
              </ProtectedRoute>
            }
          />

          {/* Regular Billing Admin Routes */}
          <Route
            path="/admin/regular-billing"
            element={
              <ProtectedRoute adminOnly>
                <RegularBillingDashboard />
              </ProtectedRoute>
            }
          />

          {/* Wholesale Dashboard Routes */}
          <Route
            path="/wholesale"
            element={
              <ProtectedRoute adminOnly>
                <WholesaleHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wholesale/billing"
            element={
              <ProtectedRoute adminOnly>
                <WholesaleBilling />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wholesale/gst-billing"
            element={
              <ProtectedRoute adminOnly>
                <GSTBilling />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wholesale/product-billing"
            element={
              <ProtectedRoute adminOnly>
                <ProductBilling />
              </ProtectedRoute>
            }
          />

          <Route
            path="/wholesale/jama-kharch-silver"
            element={
              <ProtectedRoute adminOnly>
                <JamaKharchSilver />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wholesale/jama-kharch-cash"
            element={
              <ProtectedRoute adminOnly>
                <JamaKharchCash />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wholesale/bullen"
            element={
              <ProtectedRoute adminOnly>
                <WholesaleBullen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wholesale/bullen-list"
            element={
              <ProtectedRoute adminOnly>
                <WholesaleBullenList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wholesale/bullen-ledger/:bullenName"
            element={
              <ProtectedRoute adminOnly>
                <WholesaleBullenLedger />
              </ProtectedRoute>
            }
          />

          {/* Regular Dashboard Routes */}
          <Route
            path="/regular"
            element={
              <ProtectedRoute adminOnly>
                <RegularHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/regular/billing"
            element={
              <ProtectedRoute adminOnly>
                <RegularBilling />
              </ProtectedRoute>
            }
          />
          <Route
            path="/regular/pital-kaam"
            element={
              <ProtectedRoute adminOnly>
                <PitalKaam />
              </ProtectedRoute>
            }
          />
          <Route
            path="/regular/production-batch"
            element={
              <ProtectedRoute adminOnly>
                <PitalKaam />
              </ProtectedRoute>
            }
          />
          <Route
            path="/regular/jama-kharch-silver"
            element={
              <ProtectedRoute adminOnly>
                <RJamaKharchSilver />
              </ProtectedRoute>
            }
          />
          <Route
            path="/regular/jama-kharch-cash"
            element={
              <ProtectedRoute adminOnly>
                <RJamaKharchCash />
              </ProtectedRoute>
            }
          />
          <Route
            path="/regular/metal-calculator"
            element={
              <ProtectedRoute adminOnly>
                <MetalCalculator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/regular/bullen"
            element={
              <ProtectedRoute adminOnly>
                <RegularBullen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/regular-billing/bullen-list"
            element={
              <ProtectedRoute adminOnly>
                <RegularBullenList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/regular-billing/bullen-ledger/:bullenName"
            element={
              <ProtectedRoute adminOnly>
                <RegularBullenLedger />
              </ProtectedRoute>
            }
          />
          {/* Employee Management Routes */}
          <Route
            path="/regular/employee"
            element={
              <ProtectedRoute adminOnly>
                <Employee />
              </ProtectedRoute>
            }
          />
          <Route
            path="/regular/employee-ledger/:id"
            element={
              <ProtectedRoute adminOnly>
                <EmployeeLedger />
              </ProtectedRoute>
            }
          />


          {/* Root / Default Landing Route */}
          <Route path="/" element={<RootRedirect />} />

          {/* Under Progress Route for Non-Admin Users */}
          <Route
            path="/under-progress"
            element={
              <ProtectedRoute>
                <UnderProgress />
              </ProtectedRoute>
            }
          />

          {/* 
            ========================================================================
            TEMPORARILY DISABLED STOREFRONT - CODE PRESERVED FOR FUTURE RESTORATION
            To re-enable the customer storefront pages later, simply restore this route block:
            ========================================================================
            <Route
              path="/store/*"
              element={
                <div className="flex flex-col min-h-screen">
                  <Header />
                  <main className="flex-grow">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/category/:category" element={<CategoryPage />} />
                      <Route path="/product/:id" element={<ProductDetail />} />
                      <Route path="/search" element={<SearchPage />} />
                    </Routes>
                  </main>
                  <Footer />
                </div>
              }
            />
          */}

          {/* Catch-all: Redirect unknown routes via RootRedirect */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
