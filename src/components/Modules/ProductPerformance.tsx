import React from 'react';
import Card from '../UI/Card';
import MetricCard from '../UI/MetricCard';
import BarChart from '../Charts/BarChart';
import LoadingSpinner from '../UI/LoadingSpinner';
import { ProductPerformance as ProductPerformanceType, ProductCategory } from '../../types';

interface ProductPerformanceProps {
  data: ProductPerformanceType | null;
  onExport: () => void;
}

const ProductPerformance: React.FC<ProductPerformanceProps> = ({ data, onExport }) => {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Prepare top products chart data
  const topProductsData = {
    labels: data.topProducts.slice(0, 8).map(p => p.name),
    datasets: [
      {
        label: 'Revenue',
        data: data.topProducts.slice(0, 8).map(p => p.totalRevenue || 0),
        backgroundColor: [
          'rgba(159, 122, 234, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(16, 185, 129, 0.8)'
        ],
        borderWidth: 1
      }
    ]
  };

  // Prepare category performance chart data
  const categoryData = {
    labels: data.categoryPerformance.map(c => c.category.replace('_', ' ').toUpperCase()),
    datasets: [
      {
        label: 'Revenue',
        data: data.categoryPerformance.map(c => c.revenue),
        backgroundColor: 'rgba(159, 122, 234, 0.8)',
        borderColor: 'rgba(159, 122, 234, 1)',
        borderWidth: 1
      }
    ]
  };

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

  const exportButton = (
    <button
      onClick={onExport}
      className="bg-coffee-600 hover:bg-coffee-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
    >
      Export CSV
    </button>
  );

  const totalRevenue = data.categoryPerformance.reduce((sum, cat) => sum + cat.revenue, 0);
  const totalSales = data.topProducts.reduce((sum, product) => sum + (product.totalSales || 0), 0);
  const averageProductPrice = totalRevenue / totalSales;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Product Performance</h2>
        {exportButton}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Products"
          value={data.totalProducts}
          subtitle="Unique products"
          icon="☕"
        />
        <MetricCard
          title="Total Sales"
          value={totalSales}
          subtitle="All products"
          icon="📦"
        />
        <MetricCard
          title="Average Price"
          value={`$${averageProductPrice.toFixed(2)}`}
          subtitle="Per item"
          icon="💰"
        />
        <MetricCard
          title="Categories"
          value={data.categoryPerformance.length}
          subtitle="Product categories"
          icon="📊"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Top Products by Revenue">
          <BarChart
            data={topProductsData}
            height={350}
            horizontal={true}
          />
        </Card>

        <Card title="Category Performance">
          <BarChart
            data={categoryData}
            height={350}
          />
        </Card>
      </div>

      {/* Product Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Top Performing Products">
          <div className="space-y-3">
            {data.topProducts.slice(0, 10).map((product, index) => (
              <div key={product.name} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                  <span className="text-xl">{getCategoryIcon(product.category)}</span>
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.totalSales || 0} sales</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${(product.totalRevenue || 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-500">${(product.averagePrice || 0).toFixed(2)} avg</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Category Breakdown">
          <div className="space-y-3">
            {data.categoryPerformance.map((category, index) => (
              <div key={category.category} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{getCategoryIcon(category.category)}</span>
                  <div>
                    <p className="font-medium text-gray-900">
                      {category.category.replace('_', ' ').toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-500">{category.count} items sold</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${category.revenue.toLocaleString()}</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-500">{category.percentage.toFixed(1)}%</p>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-coffee-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(category.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Performers */}
      <Card title="Products Needing Attention">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.topProducts.slice(-6).reverse().map((product) => (
            <div key={product.name} className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-xl">{getCategoryIcon(product.category)}</span>
                <h4 className="font-medium text-gray-900">{product.name}</h4>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-gray-600">Sales: {product.totalSales || 0}</p>
                <p className="text-gray-600">Revenue: ${(product.totalRevenue || 0).toLocaleString()}</p>
                <p className="text-gray-600">Avg Price: ${(product.averagePrice || 0).toFixed(2)}</p>
              </div>
              <div className="mt-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Low Performance
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ProductPerformance;