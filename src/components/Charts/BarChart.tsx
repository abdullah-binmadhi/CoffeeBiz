import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface BarChartProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
    }[];
  };
  title?: string;
  height?: number;
  horizontal?: boolean;
}

const BarChart: React.FC<BarChartProps> = ({ 
  data, 
  title, 
  height = 300, 
  horizontal = false 
}) => {
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' as const : 'x' as const,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: !!title,
        text: title,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (label.toLowerCase().includes('revenue')) {
                label += '$' + context.parsed.y.toLocaleString();
              } else {
                label += context.parsed.y.toLocaleString();
              }
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: horizontal ? 'Value' : 'Category'
        },
        ticks: horizontal ? {
          callback: function(value) {
            if (typeof value === 'number') {
              return '$' + value.toLocaleString();
            }
            return value;
          }
        } : undefined
      },
      y: {
        display: true,
        title: {
          display: true,
          text: horizontal ? 'Category' : 'Value'
        },
        ticks: !horizontal ? {
          callback: function(value) {
            if (typeof value === 'number') {
              return '$' + value.toLocaleString();
            }
            return value;
          }
        } : undefined
      }
    }
  };

  return (
    <div style={{ height: `${height}px` }}>
      <Bar data={data} options={options} />
    </div>
  );
};

export default BarChart;