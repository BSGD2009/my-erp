import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage }                  from './pages/LoginPage';
import { DashboardPage }              from './pages/DashboardPage';
import { CustomersListPage }          from './pages/CustomersListPage';
import { CustomerRecordPage }         from './pages/CustomerRecordPage';
import { SuppliersListPage }          from './pages/SuppliersListPage';
import { SupplierRecordPage }        from './pages/SupplierRecordPage';
import { LocationsListPage }          from './pages/LocationsListPage';
import { LocationRecordPage }         from './pages/LocationRecordPage';
import { WorkCentersListPage }        from './pages/WorkCentersListPage';
import { WorkCenterRecordPage }       from './pages/WorkCenterRecordPage';
import { MaterialsListPage }          from './pages/MaterialsListPage';
import { MaterialRecordPage }         from './pages/MaterialRecordPage';
import { ProductCategoriesListPage }  from './pages/ProductCategoriesListPage';
import { ProductListPage }            from './pages/ProductListPage';
import { ProductRecordPage }          from './pages/ProductRecordPage';
import { ToolingListPage }            from './pages/ToolingListPage';
import { ToolingRecordPage }          from './pages/ToolingRecordPage';
import { InventoryPage }              from './pages/InventoryPage';
import { EquipmentListPage }          from './pages/EquipmentListPage';
import { EquipmentRecordPage }        from './pages/EquipmentRecordPage';
import { OperationsListPage }         from './pages/OperationsListPage';
import { PaymentTermsPage }           from './pages/PaymentTermsPage';
import { MaterialTypesPage }          from './pages/MaterialTypesPage';
import { WorkCenterTypesPage }        from './pages/WorkCenterTypesPage';

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
          <Route path="/customers/:id"      element={<Protected><CustomerRecordPage /></Protected>} />
          <Route path="/suppliers"           element={<Protected><SuppliersListPage /></Protected>} />
          <Route path="/suppliers/:id"      element={<Protected><SupplierRecordPage /></Protected>} />
          <Route path="/locations"           element={<Protected><LocationsListPage /></Protected>} />
          <Route path="/locations/:id"      element={<Protected><LocationRecordPage /></Protected>} />
          <Route path="/work-centers"        element={<Protected><WorkCentersListPage /></Protected>} />
          <Route path="/work-centers/:id"   element={<Protected><WorkCenterRecordPage /></Protected>} />
          <Route path="/materials"           element={<Protected><MaterialsListPage /></Protected>} />
          <Route path="/materials/:id"       element={<Protected><MaterialRecordPage /></Protected>} />
          <Route path="/product-categories"  element={<Protected><ProductCategoriesListPage /></Protected>} />

          {/* Protected — products */}
          <Route path="/products"            element={<Protected><ProductListPage /></Protected>} />
          <Route path="/products/:id"        element={<Protected><ProductRecordPage /></Protected>} />
          <Route path="/tooling"             element={<Protected><ToolingListPage /></Protected>} />
          <Route path="/tooling/:id"         element={<Protected><ToolingRecordPage /></Protected>} />

          {/* Protected — equipment & operations */}
          <Route path="/equipment"           element={<Protected><EquipmentListPage /></Protected>} />
          <Route path="/equipment/:id"       element={<Protected><EquipmentRecordPage /></Protected>} />
          <Route path="/operations"          element={<Protected><OperationsListPage /></Protected>} />

          {/* Protected — inventory */}
          <Route path="/inventory"           element={<Protected><InventoryPage /></Protected>} />
          <Route path="/transfers"           element={<Protected><InventoryPage /></Protected>} />

          {/* Protected — admin settings */}
          <Route path="/admin/payment-terms"      element={<Protected><PaymentTermsPage /></Protected>} />
          <Route path="/admin/material-types"     element={<Protected><MaterialTypesPage /></Protected>} />
          <Route path="/admin/work-center-types"  element={<Protected><WorkCenterTypesPage /></Protected>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
