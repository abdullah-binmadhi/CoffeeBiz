import React from 'react';
import Card from '../UI/Card';
import MetricCard from '../UI/MetricCard';
import LoadingSpinner from '../UI/LoadingSpinner';
import { CustomerInsights as CustomerInsightsType } from '../../types';

interface CustomerInsightsProps {
  data: CustomerInsightsType | null;
  onExport: () => void;
}

const CustomerInsights: React.FC<CustomerInsightsProps> = ({ data, onExport }) => {
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

  const retentionRate = (data.returningCustomers / data.totalCustomers) * 100;
  const newCustomerRate = (data.newCustomers / data.totalCustomers) * 100;
  const loyaltyRate = (data.loyaltyStats.repeatCardUsers / data.loyaltyStats.cardCustomers) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Customer Insights</h2>
        {exportButton}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Customers"
          value={data.totalCustomers}
          subtitle="Unique customers"
          icon="👥"
        />
        <MetricCard
          title="Returning Customers"
          value={data.returningCustomers}
          subtitle={`${retentionRate.toFixed(1)}% retention rate`}
          trend={{
            value: retentionRate,
            isPositive: retentionRate > 50
          }}
          icon="🔄"
        />
        <MetricCard
          title="New Customers"
          value={data.newCustomers}
          subtitle={`${newCustomerRate.toFixed(1)}% of total`}
          icon="✨"
        />
        <MetricCard
          title="Avg Spend per Customer"
          value={data.averageSpendPerCustomer}
          subtitle="Lifetime value"
          icon="💰"
        />
      </div>

      {/* Customer Segmentation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Customer Retention Analysis">
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🔄</span>
                <div>
                  <p className="font-medium text-gray-900">Returning Customers</p>
                  <p className="text-sm text-gray-500">Customers with multiple visits</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{data.returningCustomers}</p>
                <p className="text-sm text-green-600">{retentionRate.toFixed(1)}%</p>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">✨</span>
                <div>
                  <p className="font-medium text-gray-900">New Customers</p>
                  <p className="text-sm text-gray-500">First-time visitors</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{data.newCustomers}</p>
                <p className="text-sm text-blue-600">{newCustomerRate.toFixed(1)}%</p>
              </div>
            </div>

            {/* Retention Rate Visualization */}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Customer Retention Rate</span>
                <span>{retentionRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-green-500 h-3 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(retentionRate, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {retentionRate > 60 ? 'Excellent retention' : retentionRate > 40 ? 'Good retention' : 'Needs improvement'}
              </p>
            </div>
          </div>
        </Card>

        <Card title="Payment Method Preferences">
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">💳</span>
                <div>
                  <p className="font-medium text-gray-900">Card Customers</p>
                  <p className="text-sm text-gray-500">Trackable customers</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{data.loyaltyStats.cardCustomers}</p>
                <p className="text-sm text-gray-500">
                  {((data.loyaltyStats.cardCustomers / data.totalCustomers) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">💵</span>
                <div>
                  <p className="font-medium text-gray-900">Cash Customers</p>
                  <p className="text-sm text-gray-500">Anonymous transactions</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{data.loyaltyStats.cashCustomers}</p>
                <p className="text-sm text-gray-500">
                  {((data.loyaltyStats.cashCustomers / data.totalCustomers) * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">⭐</span>
                <div>
                  <p className="font-medium text-gray-900">Loyal Card Users</p>
                  <p className="text-sm text-gray-500">Repeat card customers</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{data.loyaltyStats.repeatCardUsers}</p>
                <p className="text-sm text-purple-600">{loyaltyRate.toFixed(1)}% loyalty</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Customer Value Analysis */}
      <Card title="Customer Value Analysis">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
            <div className="text-3xl mb-2">💎</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">High Value Customers</h3>
            <p className="text-2xl font-bold text-green-600 mb-1">
              {Math.round(data.returningCustomers * 0.3)}
            </p>
            <p className="text-sm text-gray-600">
              Estimated top 30% of returning customers
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Avg spend: ${(data.averageSpendPerCustomer * 1.5).toFixed(2)}
            </p>
          </div>

          <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
            <div className="text-3xl mb-2">👤</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Regular Customers</h3>
            <p className="text-2xl font-bold text-blue-600 mb-1">
              {Math.round(data.returningCustomers * 0.7)}
            </p>
            <p className="text-sm text-gray-600">
              Remaining returning customers
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Avg spend: ${data.averageSpendPerCustomer.toFixed(2)}
            </p>
          </div>

          <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg">
            <div className="text-3xl mb-2">🆕</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">New Customers</h3>
            <p className="text-2xl font-bold text-yellow-600 mb-1">
              {data.newCustomers}
            </p>
            <p className="text-sm text-gray-600">
              First-time visitors
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Conversion opportunity
            </p>
          </div>
        </div>
      </Card>

      {/* Recommendations */}
      <Card title="Customer Retention Recommendations">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xl">🎯</span>
              <h4 className="font-medium text-gray-900">Loyalty Program</h4>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              {loyaltyRate < 50 
                ? "Consider implementing a loyalty program to increase repeat visits"
                : "Your loyalty program is working well - consider expanding rewards"
              }
            </p>
            <div className="text-xs text-green-700 font-medium">
              Current loyalty rate: {loyaltyRate.toFixed(1)}%
            </div>
          </div>

          <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xl">📱</span>
              <h4 className="font-medium text-gray-900">Digital Engagement</h4>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              {data.loyaltyStats.cashCustomers > data.loyaltyStats.cardCustomers
                ? "Encourage card payments to better track customer behavior"
                : "Good card payment adoption - leverage data for personalization"
              }
            </p>
            <div className="text-xs text-blue-700 font-medium">
              Card usage: {((data.loyaltyStats.cardCustomers / data.totalCustomers) * 100).toFixed(1)}%
            </div>
          </div>

          <div className="p-4 border border-purple-200 bg-purple-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xl">💰</span>
              <h4 className="font-medium text-gray-900">Value Optimization</h4>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Focus on increasing average spend per customer through upselling and bundling
            </p>
            <div className="text-xs text-purple-700 font-medium">
              Current avg: ${data.averageSpendPerCustomer.toFixed(2)}
            </div>
          </div>

          <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xl">🔄</span>
              <h4 className="font-medium text-gray-900">Retention Strategy</h4>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              {retentionRate < 40 
                ? "Implement retention campaigns to convert new customers to regulars"
                : "Maintain current retention strategies and focus on customer experience"
              }
            </p>
            <div className="text-xs text-orange-700 font-medium">
              Retention rate: {retentionRate.toFixed(1)}%
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CustomerInsights;