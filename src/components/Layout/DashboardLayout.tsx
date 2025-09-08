import React, { useState } from 'react';

export type ModuleType = 'revenue' | 'products' | 'traffic' | 'customers' | 'inventory';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeModule: ModuleType;
  onModuleChange: (module: ModuleType) => void;
  isLoading?: boolean;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeModule,
  onModuleChange,
  isLoading = false
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const modules = [
    { id: 'revenue' as ModuleType, name: 'Revenue Analytics', icon: '💰' },
    { id: 'products' as ModuleType, name: 'Product Performance', icon: '☕' },
    { id: 'traffic' as ModuleType, name: 'Peak Hours', icon: '📊' },
    { id: 'customers' as ModuleType, name: 'Customer Insights', icon: '👥' },
    { id: 'inventory' as ModuleType, name: 'Inventory', icon: '📦' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-coffee-800">
                ☕ CoffeeBiz Analytics
              </h1>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <nav className={`lg:w-64 ${isMobileMenuOpen ? 'block' : 'hidden'} lg:block`}>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Analytics Modules</h2>
              <ul className="space-y-2">
                {modules.map((module) => (
                  <li key={module.id}>
                    <button
                      onClick={() => {
                        onModuleChange(module.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-3 ${
                        activeModule === module.id
                          ? 'bg-coffee-100 text-coffee-800 border-l-4 border-coffee-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className="text-xl">{module.icon}</span>
                      <span className="font-medium">{module.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1">
            {isLoading ? (
              <div className="bg-white rounded-lg shadow p-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coffee-600"></div>
                  <span className="ml-4 text-lg text-gray-600">Loading analytics data...</span>
                </div>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;