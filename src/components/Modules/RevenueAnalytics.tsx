import React from 'react';
import Card from '../UI/Card';
import MetricCard from '../UI/MetricCard';
import LineChart from '../Charts/LineChart';
import LoadingSpinner from '../UI/LoadingSpinner';
import { RevenueMetrics } from '../../types';

interface RevenueAnalyticsProps {
  data: RevenueMetrics | null;
  onExport: () => void;
}

const RevenueAnalytics: React.FC<RevenueAnalyticsProps> = ({ data, onExport }) => {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Prepare chart data
  const chartData = {
    labels: data.dailyRevenue.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Daily Revenue',
        data: data.dailyRevenue.map(d => d.revenue),
        borderColor: 'rgb(159, 122, 234)',
        backgroundColor: 'rgba(159, 122, 234, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Transaction Count',
        data: data.dailyRevenue.map(d => d.transactions),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        yAxisID: 'y1',
      }
    ]
  };

  const exportButton = (
    <button
      onClick={onExport}
      className="bg-coffee-600 hover:bg-coffee-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
    >
      Export CSV
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Revenue Analytics</h2>
        {exportButton}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={data.totalRevenue}
          trend={{
            value: data.growthRate,
            isPositive: data.growthRate >= 0
          }}
          icon="💰"
        />
        <MetricCard
          title="Total Transactions"
          value={data.transactionCount}
          subtitle="All time"
          icon="🧾"
        />
        <MetricCard
          title="Average Transaction"
          value={`$${data.averageTransactionValue.toFixed(2)}`}
          subtitle="Per transaction"
          icon="📊"
        />
        <MetricCard
          title="Growth Rate"
          value={`${data.growthRate.toFixed(1)}%`}
          trend={{
            value: data.growthRate,
            isPositive: data.growthRate >= 0
          }}
          icon={data.growthRate >= 0 ? "📈" : "📉"}
        />
      </div>

      {/* Revenue Trend Chart */}
      <Card title="Revenue Trend Over Time">
        <LineChart
          data={chartData}
          height={400}
        />
      </Card>

      {/* Payment Method Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Payment Method Breakdown">
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">💳</span>
                <div>
                  <p className="font-medium text-gray-900">Card Payments</p>
                  <p className="text-sm text-gray-500">{data.paymentMethodBreakdown.card.count} transactions</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  ${data.paymentMethodBreakdown.card.revenue.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">
                  {((data.paymentMethodBreakdown.card.revenue / data.totalRevenue) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">💵</span>
                <div>
                  <p className="font-medium text-gray-900">Cash Payments</p>
                  <p className="text-sm text-gray-500">{data.paymentMethodBreakdown.cash.count} transactions</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  ${data.paymentMethodBreakdown.cash.revenue.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">
                  {((data.paymentMethodBreakdown.cash.revenue / data.totalRevenue) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Daily Performance Summary">
          <div className="space-y-3">
            {data.dailyRevenue.slice(-5).map((day, index) => (
              <div key={day.date} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(day.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                  <p className="text-sm text-gray-500">{day.transactions} transactions</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${day.revenue.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">
                    ${(day.revenue / day.transactions).toFixed(2)} avg
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RevenueAnalytics;