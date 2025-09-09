import React from 'react';
import Card from '../UI/Card';
import MetricCard from '../UI/MetricCard';
import LoadingSpinner from '../UI/LoadingSpinner';
import { ProductPerformance, ProductCategory } from '../../types';

interface InventoryManagementProps {
  data: ProductPerformance | null;
  onExport: () => void;
}

const InventoryManagement: React.FC<InventoryManagementProps> = ({ data, onExport }) => {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const exportButton = (
    <button
      onClick={onExport}
      className="bg-coffee-600 hover:bg-coffee-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
    >
      Export CSV
    </button>
  );

  // Calculate inventory insights
  const totalSales = data.topProducts.reduce((sum, product) => sum + (product.totalSales || 0), 0);
  const averageSalesPerProduct = totalSales / data.totalProducts;
  const highDemandProducts = data.topProducts.filter(p => (p.totalSales || 0) > averageSalesPerProduct * 1.5);
  const lowDemandProducts = data.topProducts.filter(p => (p.totalSales || 0) < averageSalesPerProduct * 0.5);

  const getCategoryIcon = (category: ProductCategory): string => {
    switch (category) {
      case ProductCategory.ESPRESSO: return '☕';
      case ProductCategory.LATTE: return '🥛';
      case ProductCategory.AMERICANO: return '☕';
      case ProductCategory.HOT_CHOCOLATE: return '🍫';
      case ProductCategory.TEA: return '🍵';
      case ProductCategory.SPECIALTY: return '🥃';
      default: return '☕';
    }
  };

  const getStockRecommendation = (sales: number | undefined): { level: string; color: string; icon: string } => {
    const safeSales = sales || 0;
    if (safeSales > averageSalesPerProduct * 2) {
      return { level: 'High Stock', color: 'green', icon: '📈' };
    } else if (safeSales > averageSalesPerProduct) {
      return { level: 'Medium Stock', color: 'blue', icon: '📊' };
    } else if (safeSales > averageSalesPerProduct * 0.5) {
      return { level: 'Low Stock', color: 'yellow', icon: '⚠️' };
    } else {
      return { level: 'Minimal Stock', color: 'red', icon: '🔻' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
        {exportButton}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Products"
          value={data.totalProducts}
          subtitle="In inventory"
          icon="📦"
        />
        <MetricCard
          title="High Demand Items"
          value={highDemandProducts.length}
          subtitle="Above avg sales"
          icon="🔥"
        />
        <MetricCard
          title="Low Demand Items"
          value={lowDemandProducts.length}
          subtitle="Below avg sales"
          icon="📉"
        />
        <MetricCard
          title="Avg Sales per Product"
          value={averageSalesPerProduct.toFixed(0)}
          subtitle="Units sold"
          icon="📊"
        />
      </div>

      {/* Stock Level Recommendations */}
      <Card title="Stock Level Recommendations">
        <div className="space-y-3">
          {data.topProducts.slice(0, 15).map((product) => {
            const recommendation = getStockRecommendation(product.totalSales);
            const colorClasses = {
              green: 'bg-green-50 border-green-200 text-green-800',
              blue: 'bg-blue-50 border-blue-200 text-blue-800',
              yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
              red: 'bg-red-50 border-red-200 text-red-800'
            };

            return (
              <div key={product.name} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{getCategoryIcon(product.category)}</span>
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.totalSales || 0} units sold</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${(product.totalRevenue || 0).toLocaleString()}</p>
                    <p className="text-sm text-gray-500">${(product.averagePrice || 0).toFixed(2)} avg</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium border ${colorClasses[recommendation.color as keyof typeof colorClasses]}`}>
                    {recommendation.icon} {recommendation.level}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Demand Forecasting */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="High Demand Products">
          <div className="space-y-3">
            {highDemandProducts.slice(0, 8).map((product, index) => (
              <div key={product.name} className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-green-600 w-6">#{index + 1}</span>
                  <span className="text-xl">{getCategoryIcon(product.category)}</span>
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.totalSales || 0} units</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-700">
                    {(((product.totalSales || 0) / averageSalesPerProduct) * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500">vs avg</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-green-100 rounded-lg">
            <p className="text-sm text-green-800 font-medium">💡 Recommendation</p>
            <p className="text-sm text-green-700 mt-1">
              Increase stock levels for these high-performing items to avoid stockouts during peak times.
            </p>
          </div>
        </Card>

        <Card title="Low Demand Products">
          <div className="space-y-3">
            {lowDemandProducts.slice(0, 8).map((product, index) => (
              <div key={product.name} className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-red-600 w-6">#{index + 1}</span>
                  <span className="text-xl">{getCategoryIcon(product.category)}</span>
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.totalSales || 0} units</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-700">
                    {(((product.totalSales || 0) / averageSalesPerProduct) * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500">vs avg</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-red-100 rounded-lg">
            <p className="text-sm text-red-800 font-medium">⚠️ Recommendation</p>
            <p className="text-sm text-red-700 mt-1">
              Consider reducing stock levels or promotional pricing for these slower-moving items.
            </p>
          </div>
        </Card>
      </div>

      {/* Category-based Inventory Analysis */}
      <Card title="Category Inventory Analysis">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.categoryPerformance.map((category) => {
            const categoryProducts = data.topProducts.filter(p => p.category === category.category);
            const avgSalesInCategory = categoryProducts.reduce((sum, p) => sum + (p.totalSales || 0), 0) / categoryProducts.length;
            
            return (
              <div key={category.category} className="p-4 border border-gray-200 bg-white rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-2xl">{getCategoryIcon(category.category)}</span>
                  <h4 className="font-medium text-gray-900">
                    {category.category.replace('_', ' ').toUpperCase()}
                  </h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Products:</span>
                    <span className="font-medium">{categoryProducts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Sales:</span>
                    <span className="font-medium">{category.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg per Product:</span>
                    <span className="font-medium">{avgSalesInCategory.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenue Share:</span>
                    <span className="font-medium">{category.percentage.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-coffee-600 h-2 rounded-full" 
                      style={{ width: `${Math.min(category.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Waste Reduction Insights */}
      <Card title="Waste Reduction Insights">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <span className="text-xl mr-2">♻️</span>
              Optimization Opportunities
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Focus inventory on top {Math.ceil(data.totalProducts * 0.8)} performing products</li>
              <li>• Consider seasonal adjustments for specialty items</li>
              <li>• Implement just-in-time ordering for high-turnover items</li>
              <li>• Bundle slow-moving items with popular products</li>
            </ul>
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <span className="text-xl mr-2">📊</span>
              Inventory Metrics
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Fast-moving items:</span>
                <span className="font-medium text-green-600">{highDemandProducts.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Slow-moving items:</span>
                <span className="font-medium text-red-600">{lowDemandProducts.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Inventory efficiency:</span>
                <span className="font-medium text-blue-600">
                  {(((data.totalProducts - lowDemandProducts.length) / data.totalProducts) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default InventoryManagement;