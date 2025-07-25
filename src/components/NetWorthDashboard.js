import React, { useState, useEffect } from 'react';
import { getHistoricalData } from '../utils/localStorage';
import { formatCurrency } from '../utils/calculationHelpers';

const HISTORICAL_STORAGE_KEY = 'historicalData';

const NetWorthDashboard = () => {
  const [yearData, setYearData] = useState({});
  const [selectedYears, setSelectedYears] = useState([]);
  const [activeChart, setActiveChart] = useState('netWorth');
  const [showComparison, setShowComparison] = useState(true);

  // Load historical data using centralized localStorage utilities
  useEffect(() => {
    const loadHistoricalData = () => {
      const savedData = getHistoricalData();
      if (savedData && Object.keys(savedData).length > 0) {
        setYearData(savedData);
      }
    };

    // Load initially
    loadHistoricalData();

    // Listen for historical data updates
    const handleHistoricalUpdate = (event) => {
      console.log('Historical data update event received:', event.detail);
      loadHistoricalData();
    };

    window.addEventListener('historicalDataUpdated', handleHistoricalUpdate);

    return () => {
      window.removeEventListener('historicalDataUpdated', handleHistoricalUpdate);
    };
  }, []);

  // Add global event listeners for settings menu actions
  useEffect(() => {
    const handleResetAll = () => {
      setYearData({});
      setSelectedYears([]);
      setActiveChart('netWorth');
      setShowComparison(true);
    };

    window.addEventListener('resetAllData', handleResetAll);

    return () => {
      window.removeEventListener('resetAllData', handleResetAll);
    };
  }, []);

  const sortedYears = Object.keys(yearData).sort((a, b) => a - b);
  const availableYears = Object.keys(yearData).sort((a, b) => b - a);

  // Chart data generators
  const getChartData = (field) => {
    return sortedYears.map(year => ({
      year: parseInt(year),
      value: yearData[year][field] || 0
    }));
  };

  const getSelectedYearData = (field) => {
    if (selectedYears.length === 0) return getChartData(field);
    
    return selectedYears
      .sort((a, b) => a - b)
      .map(year => ({
        year: parseInt(year),
        value: yearData[year][field] || 0
      }));
  };

  // Calculate growth rates
  const calculateGrowthRate = (field, fromYear, toYear) => {
    const fromValue = yearData[fromYear]?.[field] || 0;
    const toValue = yearData[toYear]?.[field] || 0;
    
    if (fromValue === 0) return 0;
    return ((toValue - fromValue) / fromValue) * 100;
  };

  // Calculate compound annual growth rate
  const calculateCAGR = (field) => {
    const years = sortedYears;
    if (years.length < 2) return 0;
    
    const firstYear = years[0];
    const lastYear = years[years.length - 1];
    const firstValue = yearData[firstYear]?.[field] || 0;
    const lastValue = yearData[lastYear]?.[field] || 0;
    const numYears = parseInt(lastYear) - parseInt(firstYear);
    
    if (firstValue === 0 || numYears === 0) return 0;
    return (Math.pow(lastValue / firstValue, 1 / numYears) - 1) * 100;
  };

  // Simple bar chart component
  const BarChart = ({ data, title, color = '#0891b2' }) => {
    const maxValue = Math.max(...data.map(d => d.value));
    
    return (
      <div className="mb-30">
        <h3 className="chart-title">{title}</h3>
        <div className="chart-wrapper">
          {data.map((item, index) => (
            <div key={index} className="chart-bar">
              <div
                className="chart-bar-column"
                style={{
                  height: `${maxValue > 0 ? (item.value / maxValue) * 150 : 0}px`,
                  backgroundColor: color
                }}
              />
              <div className="chart-bar-year">{item.year}</div>
              <div className="chart-bar-value">
                ${(item.value / 1000).toFixed(0)}k
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Line chart component
  const LineChart = ({ data, title, color = '#0891b2' }) => {
    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const range = maxValue - minValue;
    
    return (
      <div className="mb-30">
        <h3 className="chart-title">{title}</h3>
        <div className="line-chart-container">
          <svg width="100%" height="160" className="line-chart-svg">
            {data.map((item, index) => {
              if (index === 0) return null;
              const prevItem = data[index - 1];
              const x1 = ((index - 1) / (data.length - 1)) * 100;
              const x2 = (index / (data.length - 1)) * 100;
              const y1 = range > 0 ? 160 - ((prevItem.value - minValue) / range) * 140 : 80;
              const y2 = range > 0 ? 160 - ((item.value - minValue) / range) * 140 : 80;
              
              return (
                <line
                  key={index}
                  x1={`${x1}%`}
                  y1={y1}
                  x2={`${x2}%`}
                  y2={y2}
                  stroke={color}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              );
            })}
            {data.map((item, index) => {
              const x = (index / (data.length - 1)) * 100;
              const y = range > 0 ? 160 - ((item.value - minValue) / range) * 140 : 80;
              
              return (
                <g key={index}>
                  <circle
                    cx={`${x}%`}
                    cy={y}
                    r="4"
                    fill={color}
                  />
                  <text
                    x={`${x}%`}
                    y={y - 10}
                    textAnchor="middle"
                    fontSize="12"
                    fill="#374151"
                  >
                    ${(item.value / 1000).toFixed(0)}k
                  </text>
                  <text
                    x={`${x}%`}
                    y="180"
                    textAnchor="middle"
                    fontSize="12"
                    fill="#6b7280"
                  >
                    {item.year}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  // Chart configurations
  const chartConfigs = {
    netWorth: { title: 'Net Worth Progress', color: '#0891b2', field: 'netWorthPlus' },
    income: { title: 'AGI Progression', color: '#059669', field: 'agi' },
    assets: { title: 'Total Assets', color: '#7c3aed', field: 'retirement' },
    house: { title: 'House Value', color: '#ea580c', field: 'house' },
    cash: { title: 'Cash Holdings', color: '#16a34a', field: 'cash' },
    retirement: { title: 'Retirement Accounts', color: '#dc2626', field: 'retirement' }
  };

  // Asset breakdown for pie chart
  const getAssetBreakdown = (year) => {
    const data = yearData[year];
    if (!data) return [];
    
    return [
      { name: 'Tax-Free', value: data.taxFree || 0, color: '#10b981' },
      { name: 'Tax-Deferred', value: data.taxDeferred || 0, color: '#3b82f6' },
      { name: 'Brokerage', value: (data.rBrokerage || 0) + (data.ltBrokerage || 0), color: '#8b5cf6' },
      { name: 'Cash', value: data.cash || 0, color: '#06b6d4' },
      { name: 'House', value: data.house || 0, color: '#f59e0b' },
      { name: 'Other', value: data.othAsset || 0, color: '#6b7280' }
    ].filter(item => item.value > 0);
  };

  // Simple pie chart
  const PieChart = ({ data, title }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativePercentage = 0;
    
    return (
      <div className="mb-30">
        <h3 className="chart-title">{title}</h3>
        <div className="pie-chart-container">
          <svg width="200" height="200">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const startAngle = (cumulativePercentage / 100) * 360;
              const endAngle = startAngle + (percentage / 100) * 360;
              
              const startAngleRad = (startAngle - 90) * (Math.PI / 180);
              const endAngleRad = (endAngle - 90) * (Math.PI / 180);
              
              const x1 = 100 + 80 * Math.cos(startAngleRad);
              const y1 = 100 + 80 * Math.sin(startAngleRad);
              const x2 = 100 + 80 * Math.cos(endAngleRad);
              const y2 = 100 + 80 * Math.sin(endAngleRad);
              
              const largeArcFlag = percentage > 50 ? 1 : 0;
              
              const pathData = [
                `M 100 100`,
                `L ${x1} ${y1}`,
                `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ');
              
              cumulativePercentage += percentage;
              
              return (
                <path
                  key={index}
                  d={pathData}
                  fill={item.color}
                  stroke="#fff"
                  strokeWidth="2"
                />
              );
            })}
          </svg>
          <div className="pie-chart-legend">
            {data.map((item, index) => (
              <div key={index} className="pie-legend-item">
                <div
                  className="pie-legend-color"
                  style={{ backgroundColor: item.color }}
                />
                <div className="pie-legend-text">
                  {item.name}: ${(item.value / 1000).toFixed(0)}k ({((item.value / total) * 100).toFixed(1)}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (Object.keys(yearData).length === 0) {
    return (
      <div className="app-container">
        <div className="header">
          <h1>📊 Net Worth Dashboard</h1>
          <p>Visualize Your Financial Progress With Interactive Charts</p>
        </div>
        
        <div className="text-center p-60-20 color-gray">
          <h2>No Historical Data Available</h2>
          <p className="mb-30 fs-11">
            Add your financial data in the Historical Data section to see charts and analytics here.
          </p>
          <a href="/historical" className="btn-primary">
            📈 Add Historical Data
          </a>
        </div>
      </div>
    );
  }

  const chartConfig = chartConfigs[activeChart];
  const chartData = showComparison ? getSelectedYearData(chartConfig.field) : getChartData(chartConfig.field);

  return (
    <div className="app-container">
      <div className="header">
        <h1>📊 Net Worth Dashboard</h1>
        <p>Visualize Your Financial Progress With Interactive Charts</p>
      </div>

      {/* Controls */}
      <div className="chart-controls">
        {/* Chart Selection */}
        <div className="chart-control-group">
          <label className="chart-control-label">
            Select Chart:
          </label>
          <select
            value={activeChart}
            onChange={(e) => setActiveChart(e.target.value)}
            className="chart-select"
          >
            {Object.entries(chartConfigs).map(([key, config]) => (
              <option key={key} value={key}>{config.title}</option>
            ))}
          </select>
        </div>

        {/* Year Selection */}
        <div className="chart-control-group year-selection">
          <label className="chart-control-label">
            Select Years to Compare (optional):
          </label>
          <div className="year-checkboxes">
            {availableYears.map(year => (
              <label key={year} className="year-checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedYears.includes(year)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedYears([...selectedYears, year]);
                    } else {
                      setSelectedYears(selectedYears.filter(y => y !== year));
                    }
                  }}
                />
                <span>{year}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <h4>Current {chartConfig.title}</h4>
          <div className="stat-value primary">
            ${((yearData[sortedYears[sortedYears.length - 1]]?.[chartConfig.field] || 0) / 1000).toFixed(0)}k
          </div>
        </div>
        
        {sortedYears.length >= 2 && (
          <div className="stat-card">
            <h4>YoY Growth</h4>
            <div className={`stat-value ${calculateGrowthRate(chartConfig.field, sortedYears[sortedYears.length - 2], sortedYears[sortedYears.length - 1]) >= 0 ? 'positive' : 'negative'}`}>
              {calculateGrowthRate(chartConfig.field, sortedYears[sortedYears.length - 2], sortedYears[sortedYears.length - 1]).toFixed(1)}%
            </div>
          </div>
        )}
        
        {sortedYears.length >= 3 && (
          <div className="stat-card">
            <h4>CAGR</h4>
            <div className={`stat-value ${calculateCAGR(chartConfig.field) >= 0 ? 'positive' : 'negative'}`}>
              {calculateCAGR(chartConfig.field).toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      {/* Main Chart */}
      <div className="chart-container">
        <LineChart
          data={chartData}
          title={chartConfig.title}
          color={chartConfig.color}
        />
      </div>

      {/* Asset Breakdown */}
      {availableYears.length > 0 && (
        <div className="chart-container">
          <h3 className="text-center mb-20 color-gray-dark">
            Asset Breakdown - {availableYears[0]}
          </h3>
          <PieChart
            data={getAssetBreakdown(availableYears[0])}
            title=""
          />
        </div>
      )}
    </div>
  );
};

export default NetWorthDashboard;
