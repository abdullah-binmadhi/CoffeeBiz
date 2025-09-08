import React from 'react';
import Card from '../UI/Card';
import MetricCard from '../UI/MetricCard';
import LineChart from '../Charts/LineChart';
import BarChart from '../Charts/BarChart';
import LoadingSpinner from '../UI/LoadingSpinner';
import { TrafficAnalysis as TrafficAnalysisType } from '../../types';

interface TrafficAnalysisProps {
  data: TrafficAnalysisType | null;
  onExport: () => void;
}

const TrafficAnalysis: React.FC<TrafficAnalysisProps> = ({ data, onExport }) => {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Prepare hourly traffic chart data
  const hourlyChartData = {
    labels: data.hourlyStats.map(h => `${h.hour}:00`),
    datasets: [
      {
        label: 'Revenue',
        data: data.hourlyStats.map(h => h.revenue),
        borderColor: 'rgb(159, 122, 234)',
        backgroundColor: 'rgba(159, 122, 234, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Transactions',
        data: data.hourlyStats.map(h => h.transactions),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      }
    ]
  };

  // Prepare daily patterns chart data
  const dailyPatternsData = {
    labels: data.dailyPatterns.map(d => d.dayOfWeek),
    datasets: [
      {
        label: 'Revenue',
        data: data.dailyPatterns.map(d => d.revenue),
        backgroundColor: 'rgba(159, 122, 234, 0.8)',
        borderColor: 'rgba(159, 122, 234, 1)',
        borderWidth: 1
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

  const totalTransactions = data.hourlyStats.reduce((sum, h) => sum + h.transactions, 0);
  const totalRevenue = data.hourlyStats.reduce((sum, h) => sum + h.revenue, 0);
  const peakHourRevenue = Math.max(...data.peakHours.map(hour => 
    data.hourlyStats.find(h => h.hour === hour)?.revenue || 0
  ));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Peak Hours & Traffic Analysis</h2>
        {exportButton}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Peak Hours"
          value={data.peakHours.map(h => `${h}:00`).join(', ')}
          subtitle="Busiest times"
          icon="⏰"
        />
        <MetricCard
          title="Peak Hour Revenue"
          value={peakHourRevenue}
          subtitle="Highest earning hour"
          icon="💰"
        />
        <MetricCard
          title="Total Traffic"
          value={totalTransactions}
          subtitle="All transactions"
          icon="👥"
        />
        <MetricCard
          title="Avg Hourly Revenue"
          value={`$${(totalRevenue / 24).toFixed(0)}`}
          subtitle="Per hour average"
          icon="📊"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6">
        <Card title="Hourly Traffic Pattern">
          <LineChart
            data={hourlyChartData}
            height={400}
          />
        </Card>

        <Card title="Daily Performance Comparison">
          <BarChart
            data={dailyPatternsData}
            height={350}
          />
        </Card>
      </div>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Peak Hours Breakdown">
          <div className="space-y-3">
            {data.peakHours.map((hour) => {
              const hourData = data.hourlyStats.find(h => h.hour === hour);
              if (!hourData) return null;
              
              return (
                <div key={hour} className="flex justify-between items-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">⭐</span>
                    <div>
                      <p className="font-medium text-gray-900">{hour}:00 - {hour + 1}:00</p>
                      <p className="text-sm text-gray-500">{hourData.transactions} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${hourData.revenue.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">
                      ${(hourData.revenue / hourData.transactions).toFixed(2)} avg
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Daily Performance Summary">
          <div className="space-y-3">
            {data.dailyPatterns
              .sort((a, b) => b.revenue - a.revenue)
              .map((day, index) => (
                <div key={day.dayOfWeek} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                    <div>
                      <p className="font-medium text-gray-900">{day.dayOfWeek}</p>
                      <p className="text-sm text-gray-500">{day.transactions} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${day.revenue.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">
                      ${day.averagePerHour.toFixed(2)}/hr
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>

      {/* Staffing Recommendations */}
      <Card title="Staffing Recommendations">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.peakHours.map((hour) => {
            const hourData = data.hourlyStats.find(h => h.hour === hour);
            if (!hourData) return null;
            
            const staffNeeded = Math.ceil(hourData.transactions / 10); // Assume 10 transactions per staff member
            
            return (
              <div key={hour} className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xl">👥</span>
                  <h4 className="font-medium text-gray-900">{hour}:00 - {hour + 1}:00</h4>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-600">Transactions: {hourData.transactions}</p>
                  <p className="text-gray-600">Revenue: ${hourData.revenue.toLocaleString()}</p>
                  <p className="font-medium text-blue-800">Recommended Staff: {staffNeeded}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default TrafficAnalysis;