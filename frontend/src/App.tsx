import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage }                  from './pages/LoginPage';
import { DashboardPage }              from './pages/DashboardPage';
import { CustomersListPage }          from './pages/CustomersListPage';
import { CustomerRecordPage }         from './pages/CustomerRecordPage';
import { SuppliersListPage }          from './pages/SuppliersListPage';
import { SupplierRecordPage }         from './pages/SupplierRecordPage';
import { LocationsListPage }          from './pages/LocationsListPage';
import { LocationRecordPage }         from './pages/LocationRecordPage';
import { MaterialsListPage }          from './pages/MaterialsListPage';
import { MaterialRecordPage }         from './pages/MaterialRecordPage';
import { ProductCategoriesListPage }  from './pages/ProductCategoriesListPage';
import { MasterSpecsListPage }        from './pages/MasterSpecsListPage';
import { MasterSpecRecordPage }       from './pages/MasterSpecRecordPage';
import { CustomerItemsListPage }      from './pages/CustomerItemsListPage';
import { CustomerItemRecordPage }     from './pages/CustomerItemRecordPage';
import { ToolingListPage }            from './pages/ToolingListPage';
import { ToolingRecordPage }          from './pages/ToolingRecordPage';
import { ResourcesListPage }          from './pages/ResourcesListPage';
import { ResourceRecordPage }         from './pages/ResourceRecordPage';
import { OperationsListPage }         from './pages/OperationsListPage';
import { InventoryPage }              from './pages/InventoryPage';
import { PartiesListPage }            from './pages/PartiesListPage';
import { PaymentTermsPage }           from './pages/PaymentTermsPage';
import { MaterialTypesPage }          from './pages/MaterialTypesPage';
import { ResourceTypesPage }          from './pages/ResourceTypesPage';
import { ProductModulesPage }         from './pages/ProductModulesPage';
import { VariantRecordPage }         from './pages/VariantRecordPage';
import { BoardGradesPage }           from './pages/BoardGradesPage';
import { ProspectsListPage }         from './pages/ProspectsListPage';
import { BlanketContractsListPage }  from './pages/BlanketContractsListPage';
import { BlanketContractRecordPage } from './pages/BlanketContractRecordPage';
import { QuotesListPage }           from './pages/QuotesListPage';
import { QuoteRecordPage }          from './pages/QuoteRecordPage';
import { BoardPricesPage }          from './pages/BoardPricesPage';
import { BoardUpchargesPage }       from './pages/BoardUpchargesPage';

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

          {/* Protected — sales */}
          <Route path="/dashboard"           element={<Protected><DashboardPage /></Protected>} />
          <Route path="/quotes"              element={<Protected><QuotesListPage /></Protected>} />
          <Route path="/quotes/:id"          element={<Protected><QuoteRecordPage /></Protected>} />

          {/* Protected — master data */}
          <Route path="/customers"           element={<Protected><CustomersListPage /></Protected>} />
          <Route path="/customers/:id"       element={<Protected><CustomerRecordPage /></Protected>} />
          <Route path="/prospects"           element={<Protected><ProspectsListPage /></Protected>} />
          <Route path="/suppliers"           element={<Protected><SuppliersListPage /></Protected>} />
          <Route path="/suppliers/:id"       element={<Protected><SupplierRecordPage /></Protected>} />
          <Route path="/locations"           element={<Protected><LocationsListPage /></Protected>} />
          <Route path="/locations/:id"       element={<Protected><LocationRecordPage /></Protected>} />
          <Route path="/parties"             element={<Protected><PartiesListPage /></Protected>} />
          <Route path="/materials"           element={<Protected><MaterialsListPage /></Protected>} />
          <Route path="/materials/:id"       element={<Protected><MaterialRecordPage /></Protected>} />
          <Route path="/product-categories"  element={<Protected><ProductCategoriesListPage /></Protected>} />

          {/* Protected — products */}
          <Route path="/master-specs"        element={<Protected><MasterSpecsListPage /></Protected>} />
          <Route path="/master-specs/:id/variants/:vid" element={<Protected><VariantRecordPage /></Protected>} />
          <Route path="/master-specs/:id"    element={<Protected><MasterSpecRecordPage /></Protected>} />
          <Route path="/customer-items"      element={<Protected><CustomerItemsListPage /></Protected>} />
          <Route path="/customer-items/:id"  element={<Protected><CustomerItemRecordPage /></Protected>} />
          <Route path="/tooling"             element={<Protected><ToolingListPage /></Protected>} />
          <Route path="/tooling/:id"         element={<Protected><ToolingRecordPage /></Protected>} />

          {/* Protected — resources & operations */}
          <Route path="/resources"           element={<Protected><ResourcesListPage /></Protected>} />
          <Route path="/resources/:id"       element={<Protected><ResourceRecordPage /></Protected>} />
          <Route path="/operations"          element={<Protected><OperationsListPage /></Protected>} />

          {/* Protected — inventory */}
          <Route path="/inventory"           element={<Protected><InventoryPage /></Protected>} />

          {/* Protected — admin settings */}
          <Route path="/admin/payment-terms"     element={<Protected><PaymentTermsPage /></Protected>} />
          <Route path="/admin/material-types"    element={<Protected><MaterialTypesPage /></Protected>} />
          <Route path="/admin/resource-types"    element={<Protected><ResourceTypesPage /></Protected>} />
          <Route path="/admin/product-modules"   element={<Protected><ProductModulesPage /></Protected>} />
          <Route path="/admin/board-grades"      element={<Protected><BoardGradesPage /></Protected>} />
          <Route path="/admin/board-prices"     element={<Protected><BoardPricesPage /></Protected>} />
          <Route path="/admin/board-upcharges"  element={<Protected><BoardUpchargesPage /></Protected>} />
          <Route path="/admin/blanket-contracts" element={<Protected><BlanketContractsListPage /></Protected>} />
          <Route path="/admin/blanket-contracts/:id" element={<Protected><BlanketContractRecordPage /></Protected>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
