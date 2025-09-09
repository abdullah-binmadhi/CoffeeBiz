import React from 'react';

interface DataDisplayProps {
  title: string;
  data: any;
}

const DataDisplay: React.FC<DataDisplayProps> = ({ title, data }) => {
  if (!data) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-4">
        {/* Revenue Metrics */}
        {data.totalRevenue !== undefined && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-green-900">${data.totalRevenue?.toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Transactions</p>
              <p className="text-2xl font-bold text-blue-900">{data.transactionCount?.toLocaleString()}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-600 font-medium">Avg Transaction</p>
              <p className="text-2xl font-bold text-purple-900">${data.averageTransactionValue?.toFixed(2)}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-orange-600 font-medium">Growth Rate</p>
              <p className="text-2xl font-bold text-orange-900">{data.growthRate?.toFixed(1)}%</p>
            </div>
          </div>
        )}

        {/* Product Performance */}
        {data.topProducts && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Top Products</h4>
            <div className="space-y-2">
              {data.topProducts.slice(0, 5).map((product: any, index: number) => (
                <div key={product.id || index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.totalSales} sales</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${product.totalRevenue?.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">${product.averagePrice?.toFixed(2)} avg</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Traffic Analysis */}
        {data.hourlyStats && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Peak Hours</h4>
            <div className="flex space-x-2">
              {data.peakHours?.map((hour: number) => (
                <span key={hour} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {hour}:00
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Customer Insights */}
        {data.totalCustomers !== undefined && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="text-sm text-indigo-600 font-medium">Total Customers</p>
              <p className="text-xl font-bold text-indigo-900">{data.totalCustomers?.toLocaleString()}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Returning</p>
              <p className="text-xl font-bold text-green-900">{data.returningCustomers?.toLocaleString()}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-600 font-medium">New Customers</p>
              <p className="text-xl font-bold text-yellow-900">{data.newCustomers?.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataDisplay;