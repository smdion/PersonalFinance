import React, { useState, useEffect } from 'react';
import { getHistoricalData } from '../utils/localStorage';

const NetWorthDashboard = () => {
  const [historicalData, setHistoricalData] = useState({});
  const [selectedYears, setSelectedYears] = useState([]);
  const [activeChart, setActiveChart] = useState('netWorth');
  const [showComparison, setShowComparison] = useState(true);

  // Load historical data
  useEffect(() => {
    const loadData = () => {
      const data = getHistoricalData();
      setHistoricalData(data);
      
      // Auto-select recent years for comparison
      const years = Object.keys(data).sort((a, b) => b - a);
      if (years.length > 0) {
        setSelectedYears(years.slice(0, Math.min(3, years.length)));
      }
    };

    loadData();

    // Listen for data updates
    const handleDataUpdate = () => {
      loadData();
    };

    window.addEventListener('historicalDataUpdated', handleDataUpdate);
    return () => {
      window.removeEventListener('historicalDataUpdated', handleDataUpdate);
    };
  }, []);

  const sortedYears = Object.keys(historicalData).sort((a, b) => a - b);
  const availableYears = Object.keys(historicalData).sort((a, b) => b - a);

  // Calculate net worth for a given year
  const calculateNetWorth = (yearData) => {
    if (!yearData) return 0;

    const assets = (yearData.cash || 0) + 
                  (yearData.retirement || 0) + 
                  (yearData.house || 0) + 
                  (yearData.otherAssets || 0);
    
    const liabilities = (yearData.mortgage || 0) + 
                       (yearData.studentLoans || 0) + 
                       (yearData.otherDebt || 0);
    
    return assets - liabilities;
  };

  // Calculate total assets for a given year
  const calculateTotalAssets = (yearData) => {
    if (!yearData) return 0;
    return (yearData.cash || 0) + 
           (yearData.retirement || 0) + 
           (yearData.house || 0) + 
           (yearData.otherAssets || 0);
  };

  // Calculate total liabilities for a given year
  const calculateTotalLiabilities = (yearData) => {
    if (!yearData) return 0;
    return (yearData.mortgage || 0) + 
           (yearData.studentLoans || 0) + 
           (yearData.otherDebt || 0);
  };

  // Chart data generators
  const getChartData = (field) => {
    return sortedYears.map(year => {
      const yearData = historicalData[year];
      let value = 0;

      switch (field) {
        case 'netWorth':
          value = calculateNetWorth(yearData);
          break;
        case 'totalAssets':
          value = calculateTotalAssets(yearData);
          break;
        case 'totalLiabilities':
          value = calculateTotalLiabilities(yearData);
          break;
        case 'agi':
          value = yearData?.agi || 0;
          break;
        case 'cash':
          value = yearData?.cash || 0;
          break;
        case 'retirement':
          value = yearData?.retirement || 0;
          break;
        case 'house':
          value = yearData?.house || 0;
          break;
        case 'mortgage':
          value = yearData?.mortgage || 0;
          break;
        default:
          value = yearData?.[field] || 0;
      }

      return {
        year: parseInt(year),
        value: value,
        label: year
      };
    });
  };

  const getSelectedYearData = (field) => {
    return selectedYears.map(year => {
      const yearData = historicalData[year];
      let value = 0;

      switch (field) {
        case 'netWorth':
          value = calculateNetWorth(yearData);
          break;
        case 'totalAssets':
          value = calculateTotalAssets(yearData);
          break;
        case 'totalLiabilities':
          value = calculateTotalLiabilities(yearData);
          break;
        case 'agi':
          value = yearData?.agi || 0;
          break;
        case 'cash':
          value = yearData?.cash || 0;
          break;
        case 'retirement':
          value = yearData?.retirement || 0;
          break;
        case 'house':
          value = yearData?.house || 0;
          break;
        case 'mortgage':
          value = yearData?.mortgage || 0;
          break;
        default:
          value = yearData?.[field] || 0;
      }

      return {
        year: parseInt(year),
        value: value,
        label: year
      };
    }).sort((a, b) => a.year - b.year);
  };

  // Calculate growth rates
  const calculateGrowthRate = (field, fromYear, toYear) => {
    const fromData = historicalData[fromYear];
    const toData = historicalData[toYear];
    
    if (!fromData || !toData) return 0;
    
    let fromValue = 0;
    let toValue = 0;

    switch (field) {
      case 'netWorth':
        fromValue = calculateNetWorth(fromData);
        toValue = calculateNetWorth(toData);
        break;
      case 'totalAssets':
        fromValue = calculateTotalAssets(fromData);
        toValue = calculateTotalAssets(toData);
        break;
      default:
        fromValue = fromData[field] || 0;
        toValue = toData[field] || 0;
    }
    
    if (fromValue === 0) return 0;
    return ((toValue - fromValue) / fromValue) * 100;
  };

  // Calculate compound annual growth rate
  const calculateCAGR = (field) => {
    const data = getChartData(field);
    if (data.length < 2) return 0;
    
    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const years = data.length - 1;
    
    if (firstValue <= 0) return 0;
    return (Math.pow(lastValue / firstValue, 1 / years) - 1) * 100;
  };

  // Simple bar chart component
  const BarChart = ({ data, title, color = '#0891b2' }) => {
    if (data.length === 0) return null;

    const maxValue = Math.max(...data.map(d => Math.abs(d.value)));
    const hasNegativeValues = data.some(d => d.value < 0);

    return (
      <div className="chart-container">
        <h3 className="chart-title">{title}</h3>
        <div className="chart-wrapper" style={{ position: 'relative' }}>
          {hasNegativeValues && (
            <div 
              style={{
                position: 'absolute',
                left: '20px',
                right: '20px',
                top: '50%',
                height: '1px',
                backgroundColor: '#e5e7eb',
                zIndex: 1
              }}
            />
          )}
          {data.map((item, index) => {
            const isNegative = item.value < 0;
            const height = maxValue > 0 ? Math.abs(item.value) / maxValue * 150 : 0;
            
            return (
              <div key={index} className="chart-bar">
                <div 
                  className="chart-bar-column" 
                  style={{ 
                    backgroundColor: isNegative ? '#dc2626' : color,
                    height: `${height}px`,
                    marginBottom: hasNegativeValues ? '75px' : '10px',
                    marginTop: hasNegativeValues && isNegative ? `${150 - height}px` : '0'
                  }}
                />
                <div className="chart-bar-year">{item.label}</div>
                <div className="chart-bar-value">
                  ${(item.value / 1000).toFixed(0)}k
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Line chart component
  const LineChart = ({ data, title, color = '#0891b2' }) => {
    if (data.length === 0) return null;

    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const range = maxValue - minValue;
    const hasNegativeValues = minValue < 0;

    const points = data.map((item, index) => {
      const x = (index / (data.length - 1)) * 280 + 20;
      const normalizedValue = range > 0 ? (item.value - minValue) / range : 0.5;
      const y = 160 - (normalizedValue * 120);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="chart-container">
        <h3 className="chart-title">{title}</h3>
        <div className="line-chart-container">
          <svg width="320" height="180" className="line-chart-svg">
            {hasNegativeValues && (
              <line
                x1="20"
                y1={160 - ((-minValue) / range * 120)}
                x2="300"
                y2={160 - ((-minValue) / range * 120)}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            )}
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="3"
              points={points}
            />
            {data.map((item, index) => {
              const x = (index / (data.length - 1)) * 280 + 20;
              const normalizedValue = range > 0 ? (item.value - minValue) / range : 0.5;
              const y = 160 - (normalizedValue * 120);
              return (
                <g key={index}>
                  <circle cx={x} cy={y} r="4" fill={color} />
                  <text x={x} y="175" textAnchor="middle" fontSize="12" fill="#374151">
                    {item.label}
                  </text>
                  <text x={x} y={y - 10} textAnchor="middle" fontSize="10" fill="#6b7280">
                    ${(item.value / 1000).toFixed(0)}k
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
    netWorth: { title: 'Net Worth Progress', color: '#0891b2', field: 'netWorth' },
    totalAssets: { title: 'Total Assets', color: '#059669', field: 'totalAssets' },
    totalLiabilities: { title: 'Total Liabilities', color: '#dc2626', field: 'totalLiabilities' },
    agi: { title: 'AGI Progression', color: '#7c3aed', field: 'agi' },
    cash: { title: 'Cash Holdings', color: '#16a34a', field: 'cash' },
    retirement: { title: 'Retirement Accounts', color: '#ea580c', field: 'retirement' },
    house: { title: 'House Value', color: '#0891b2', field: 'house' }
  };

  // Asset breakdown for pie chart
  const getAssetBreakdown = (year) => {
    const yearData = historicalData[year];
    if (!yearData) return [];

    const assets = [
      { name: 'Cash', value: yearData.cash || 0, color: '#16a34a' },
      { name: 'Retirement', value: yearData.retirement || 0, color: '#ea580c' },
      { name: 'House', value: yearData.house || 0, color: '#0891b2' },
      { name: 'Other Assets', value: yearData.otherAssets || 0, color: '#7c3aed' }
    ].filter(asset => asset.value > 0);

    return assets;
  };

  // Simple pie chart
  const PieChart = ({ data, title }) => {
    if (data.length === 0) return null;

    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return null;

    let currentAngle = 0;
    const radius = 60;
    const centerX = 80;
    const centerY = 80;

    return (
      <div className="chart-container">
        <h3 className="chart-title">{title}</h3>
        <div className="pie-chart-container">
          <svg width="160" height="160">
            {data.map((item, index) => {
              const percentage = item.value / total;
              const angle = percentage * 360;
              const x1 = centerX + radius * Math.cos((currentAngle - 90) * Math.PI / 180);
              const y1 = centerY + radius * Math.sin((currentAngle - 90) * Math.PI / 180);
              const x2 = centerX + radius * Math.cos((currentAngle + angle - 90) * Math.PI / 180);
              const y2 = centerY + radius * Math.sin((currentAngle + angle - 90) * Math.PI / 180);
              
              const largeArcFlag = angle > 180 ? 1 : 0;
              const pathData = [
                `M ${centerX} ${centerY}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ');

              currentAngle += angle;

              return (
                <path
                  key={index}
                  d={pathData}
                  fill={item.color}
                  stroke="white"
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

  if (Object.keys(historicalData).length === 0) {
    return (
      <div className="app-container">
        <div className="header">
          <h1>📊 Net Worth Dashboard</h1>
          <p>Track your financial progress over time</p>
        </div>
        
        <div className="empty-state">
          <div className="empty-state-icon">📈</div>
          <h2>No Historical Data Available</h2>
          <p>Add some historical financial data to see your net worth progression and analysis.</p>
          <p>Visit the Historical Data page to get started!</p>
        </div>
      </div>
    );
  }

  const chartConfig = chartConfigs[activeChart];
  const chartData = showComparison ? getSelectedYearData(chartConfig.field) : getChartData(chartConfig.field);
  const latestYear = Math.max(...sortedYears.map(y => parseInt(y)));
  const latestData = historicalData[latestYear];

  return (
    <div className="app-container">
      <div className="header">
        <h1>📊 Net Worth Dashboard</h1>
        <p>Track your financial progress over time</p>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h4>Current Net Worth ({latestYear})</h4>
          <div className="stat-value primary">
            ${(calculateNetWorth(latestData) / 1000).toFixed(0)}k
          </div>
        </div>
        
        <div className="stat-card">
          <h4>Total Assets ({latestYear})</h4>
          <div className="stat-value positive">
            ${(calculateTotalAssets(latestData) / 1000).toFixed(0)}k
          </div>
        </div>
        
        <div className="stat-card">
          <h4>Total Liabilities ({latestYear})</h4>
          <div className="stat-value negative">
            ${(calculateTotalLiabilities(latestData) / 1000).toFixed(0)}k
          </div>
        </div>
        
        <div className="stat-card">
          <h4>Net Worth CAGR</h4>
          <div className={`stat-value ${calculateCAGR('netWorth') >= 0 ? 'positive' : 'negative'}`}>
            {calculateCAGR('netWorth').toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Chart Controls */}
      <div className="chart-controls">
        <div className="chart-control-group">
          <label className="chart-control-label">Chart Type</label>
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

        <div className="chart-control-group">
          <label className="chart-control-label">
            <input
              type="checkbox"
              checked={showComparison}
              onChange={(e) => setShowComparison(e.target.checked)}
            />
            Compare Selected Years Only
          </label>
        </div>

        {showComparison && (
          <div className="chart-control-group year-selection">
            <label className="chart-control-label">Select Years to Compare</label>
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
                  {year}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Chart */}
      {chartData.length > 0 && (
        activeChart === 'netWorth' || activeChart === 'totalLiabilities' ? 
          <BarChart 
            data={chartData} 
            title={chartConfig.title} 
            color={chartConfig.color} 
          /> :
          <LineChart 
            data={chartData} 
            title={chartConfig.title} 
            color={chartConfig.color} 
          />
      )}

      {/* Asset Breakdown for Latest Year */}
      {latestData && (
        <PieChart 
          data={getAssetBreakdown(latestYear)} 
          title={`Asset Breakdown (${latestYear})`} 
        />
      )}

      {/* Detailed Analysis */}
      {sortedYears.length > 1 && (
        <div className="chart-container">
          <h3 className="chart-title">Growth Analysis</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <h4>1-Year Net Worth Growth</h4>
              <div className={`stat-value ${calculateGrowthRate('netWorth', sortedYears[sortedYears.length-2], sortedYears[sortedYears.length-1]) >= 0 ? 'positive' : 'negative'}`}>
                {calculateGrowthRate('netWorth', sortedYears[sortedYears.length-2], sortedYears[sortedYears.length-1]).toFixed(1)}%
              </div>
            </div>
            
            <div className="stat-card">
              <h4>Asset Growth CAGR</h4>
              <div className={`stat-value ${calculateCAGR('totalAssets') >= 0 ? 'positive' : 'negative'}`}>
                {calculateCAGR('totalAssets').toFixed(1)}%
              </div>
            </div>
            
            <div className="stat-card">
              <h4>Retirement Growth CAGR</h4>
              <div className={`stat-value ${calculateCAGR('retirement') >= 0 ? 'positive' : 'negative'}`}>
                {calculateCAGR('retirement').toFixed(1)}%
              </div>
            </div>
            
            <div className="stat-card">
              <h4>Years of Data</h4>
              <div className="stat-value primary">
                {sortedYears.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetWorthDashboard;
