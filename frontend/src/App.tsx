import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage }                  from './pages/LoginPage';
import { DashboardPage }              from './pages/DashboardPage';
import { CustomersListPage }          from './pages/CustomersListPage';
import { SuppliersListPage }          from './pages/SuppliersListPage';
import { LocationsListPage }          from './pages/LocationsListPage';
import { WorkCentersListPage }        from './pages/WorkCentersListPage';
import { MaterialsListPage }          from './pages/MaterialsListPage';
import { ProductCategoriesListPage }  from './pages/ProductCategoriesListPage';
import { ProductListPage }            from './pages/ProductListPage';
import { ProductRecordPage }          from './pages/ProductRecordPage';
import { ToolingListPage }            from './pages/ToolingListPage';
import { ToolingRecordPage }          from './pages/ToolingRecordPage';
import { InventoryPage }              from './pages/InventoryPage';

function Protected({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected — master data */}
          <Route path="/dashboard"           element={<Protected><DashboardPage /></Protected>} />
          <Route path="/customers"           element={<Protected><CustomersListPage /></Protected>} />
          <Route path="/suppliers"           element={<Protected><SuppliersListPage /></Protected>} />
          <Route path="/locations"           element={<Protected><LocationsListPage /></Protected>} />
          <Route path="/work-centers"        element={<Protected><WorkCentersListPage /></Protected>} />
          <Route path="/materials"           element={<Protected><MaterialsListPage /></Protected>} />
          <Route path="/product-categories"  element={<Protected><ProductCategoriesListPage /></Protected>} />

          {/* Protected — products */}
          <Route path="/products"            element={<Protected><ProductListPage /></Protected>} />
          <Route path="/products/:id"        element={<Protected><ProductRecordPage /></Protected>} />
          <Route path="/tooling"             element={<Protected><ToolingListPage /></Protected>} />
          <Route path="/tooling/:id"         element={<Protected><ToolingRecordPage /></Protected>} />

          {/* Protected — inventory */}
          <Route path="/inventory"           element={<Protected><InventoryPage /></Protected>} />
          <Route path="/transfers"           element={<Protected><InventoryPage /></Protected>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
