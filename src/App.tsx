import React, { useState } from 'react';
import DashboardLayout, { ModuleType } from './components/Layout/DashboardLayout';
import RevenueAnalytics from './components/Modules/RevenueAnalytics';
import ProductPerformance from './components/Modules/ProductPerformance';
import TrafficAnalysis from './components/Modules/TrafficAnalysis';
import CustomerInsights from './components/Modules/CustomerInsights';
import InventoryManagement from './components/Modules/InventoryManagement';
import ErrorMessage from './components/UI/ErrorMessage';
import { useAnalytics } from './hooks/useAnalytics';

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ModuleType>('revenue');
  const { 
    isLoading, 
    error, 
    revenueMetrics, 
    productPerformance, 
    trafficAnalysis, 
    customerInsights,
    refreshData,
    exportData
  } = useAnalytics();

  const renderModule = () => {
    if (error) {
      return <ErrorMessage message={error} onRetry={refreshData} />;
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
        return <InventoryManagement data={productPerformance} onExport={() => exportData('products')} />;
      default:
        return <RevenueAnalytics data={revenueMetrics} onExport={() => exportData('revenue')} />;
    }
  };

  return (
    <DashboardLayout
      activeModule={activeModule}
      onModuleChange={setActiveModule}
      isLoading={isLoading}
    >
      {renderModule()}
    </DashboardLayout>
  );
};

export default App;