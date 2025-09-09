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
import DataDisplay from './components/UI/DataDisplay';
import { useMockAnalytics } from './hooks/useMockAnalytics';

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
  } = useMockAnalytics();

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
        return <DataDisplay title="Revenue Analytics" data={revenueMetrics} />;
      case 'products':
        return <DataDisplay title="Product Performance" data={productPerformance} />;
      case 'traffic':
        return <DataDisplay title="Traffic Analysis" data={trafficAnalysis} />;
      case 'customers':
        return <DataDisplay title="Customer Insights" data={customerInsights} />;
      case 'inventory':
        return <DataDisplay title="Inventory Management" data={productPerformance} />;
      default:
        return <DataDisplay title="Revenue Analytics" data={revenueMetrics} />;
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