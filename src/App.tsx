import React, { useState } from 'react';
import DashboardLayout, { ModuleType } from './components/Layout/DashboardLayout';
import RevenueAnalytics from './components/Modules/RevenueAnalytics';
import ProductPerformance from './components/Modules/ProductPerformance';
import TrafficAnalysis from './components/Modules/TrafficAnalysis';
import CustomerInsights from './components/Modules/CustomerInsights';
import InventoryManagement from './components/Modules/InventoryManagement';
import ErrorMessage from './components/UI/ErrorMessage';
import ErrorBoundary from './components/UI/ErrorBoundary';
import Toast from './components/UI/Toast';
import { useApiAnalytics } from './hooks/useApiAnalytics';

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ModuleType>('revenue');
  const { 
    isLoading, 
    error, 
    revenueMetrics, 
    productPerformance, 
    trafficAnalysis, 
    customerInsights,
    inventoryData,
    refreshData,
    exportData,
    toasts,
    removeToast
  } = useApiAnalytics();

  const renderModule = () => {
    if (error) {
      return (
        <ErrorMessage 
          error={{ message: error, userMessage: error }} 
          onRetry={refreshData}
          showTimestamp={true}
        />
      );
    }

    switch (activeModule) {
      case 'revenue':
        return <RevenueAnalytics data={revenueMetrics} onExport={() => exportData('revenue')} />;
      case 'products':
        return <ProductPerformance data={productPerformance} onExport={() => exportData('products')} />;
      case 'traffic':
        return <TrafficAnalysis data={trafficAnalysis} onExport={() => exportData('traffic')} />;
      case 'customers':
        return <CustomerInsights data={customerInsights} onExport={() => exportData('customers')} />;
      case 'inventory':
        return <InventoryManagement data={productPerformance} onExport={() => exportData('inventory')} />;
      default:
        return <RevenueAnalytics data={revenueMetrics} onExport={() => exportData('revenue')} />;
    }
  };

  return (
    <ErrorBoundary>
      <DashboardLayout
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        isLoading={isLoading}
      >
        {renderModule()}
      </DashboardLayout>
      
      {/* Toast Notifications */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </ErrorBoundary>
  );
};

export default App;