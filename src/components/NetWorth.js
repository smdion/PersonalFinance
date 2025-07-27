import React, { useState, useEffect, useMemo } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import Navigation from './Navigation';
import { getHistoricalData } from '../utils/localStorage';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const NetWorth = () => {
  const [historicalData, setHistoricalData] = useState({});
  const [selectedYears, setSelectedYears] = useState([]);
  const [viewMode, setViewMode] = useState('overview'); // overview, comparison, breakdown
  const [expandedSections, setExpandedSections] = useState({
    netWorth: true,
    investments: true,
    assets: true,
    income: false
  });

  // Load historical data
  useEffect(() => {
    const loadData = () => {
      const data = getHistoricalData();
      setHistoricalData(data);
      
      // Auto-select last 3 years for comparison
      const years = Object.values(data)
        .map(entry => entry.year)
        .sort((a, b) => b - a);
      setSelectedYears(years.slice(0, 3));
    };

    loadData();

    // Listen for data updates
    const handleDataUpdate = () => loadData();
    window.addEventListener('historicalDataUpdated', handleDataUpdate);
    
    return () => {
      window.removeEventListener('historicalDataUpdated', handleDataUpdate);
    };
  }, []);

  // Calculate net worth and other metrics
  const processedData = useMemo(() => {
    const entries = Object.values(historicalData).sort((a, b) => a.year - b.year);
    
    return entries.map(entry => {
      const investments = (entry.taxFree || 0) + (entry.taxDeferred || 0) + 
                         (entry.brokerage || 0) + (entry.espp || 0) + 
                         (entry.hsa || 0) + (entry.cash || 0);
      
      const assets = (entry.house || 0) + (entry.homeImprovements || 0) + 
                     (entry.othAsset || 0);
      
      const liabilities = (entry.mortgage || 0) + (entry.othLia || 0);
      
      const totalAssets = investments + assets;
      const netWorth = totalAssets - liabilities;
      
      const totalIncome = Object.values(entry.users || {}).reduce((sum, user) => {
        return sum + (user.salary || 0) + (user.bonus || 0);
      }, 0);

      return {
        ...entry,
        investments,
        totalAssets,
        liabilities,
        netWorth,
        totalIncome,
        investmentBreakdown: {
          taxFree: entry.taxFree || 0,
          taxDeferred: entry.taxDeferred || 0,
          brokerage: entry.brokerage || 0,
          espp: entry.espp || 0,
          hsa: entry.hsa || 0,
          cash: entry.cash || 0
        }
      };
    });
  }, [historicalData]);

  // Chart data for net worth over time
  const netWorthChartData = useMemo(() => {
    const years = processedData.map(d => d.year);
    const netWorthData = processedData.map(d => d.netWorth);
    const investmentData = processedData.map(d => d.investments);
    const totalAssetData = processedData.map(d => d.totalAssets);
    const liabilityData = processedData.map(d => d.liabilities);

    return {
      labels: years,
      datasets: [
        {
          label: 'Net Worth',
          data: netWorthData,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 3,
          tension: 0.1,
          fill: true
        },
        {
          label: 'Total Investments',
          data: investmentData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          tension: 0.1
        },
        {
          label: 'Total Assets',
          data: totalAssetData,
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          borderWidth: 2,
          tension: 0.1
        },
        {
          label: 'Liabilities',
          data: liabilityData,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 2,
          tension: 0.1
        }
      ]
    };
  }, [processedData]);

  // Year-over-year growth chart
  const growthChartData = useMemo(() => {
    if (processedData.length < 2) return null;
    
    const growthData = processedData.slice(1).map((current, idx) => {
      const previous = processedData[idx];
      const netWorthGrowth = ((current.netWorth - previous.netWorth) / Math.abs(previous.netWorth)) * 100;
      const investmentGrowth = ((current.investments - previous.investments) / Math.abs(previous.investments)) * 100;
      const incomeGrowth = ((current.totalIncome - previous.totalIncome) / Math.abs(previous.totalIncome)) * 100;
      
      return {
        year: current.year,
        netWorthGrowth: isFinite(netWorthGrowth) ? netWorthGrowth : 0,
        investmentGrowth: isFinite(investmentGrowth) ? investmentGrowth : 0,
        incomeGrowth: isFinite(incomeGrowth) ? incomeGrowth : 0
      };
    });

    return {
      labels: growthData.map(d => d.year),
      datasets: [
        {
          label: 'Net Worth Growth %',
          data: growthData.map(d => d.netWorthGrowth),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1
        },
        {
          label: 'Investment Growth %',
          data: growthData.map(d => d.investmentGrowth),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1
        },
        {
          label: 'Income Growth %',
          data: growthData.map(d => d.incomeGrowth),
          backgroundColor: 'rgba(168, 85, 247, 0.8)',
          borderColor: 'rgb(168, 85, 247)',
          borderWidth: 1
        }
      ]
    };
  }, [processedData]);

  // Investment allocation for latest year
  const latestInvestmentAllocation = useMemo(() => {
    if (processedData.length === 0) return null;
    
    const latest = processedData[processedData.length - 1];
    const breakdown = latest.investmentBreakdown;
    
    return {
      labels: ['Tax-Free', 'Tax-Deferred', 'Brokerage', 'ESPP', 'HSA', 'Cash'],
      datasets: [{
        data: [
          breakdown.taxFree,
          breakdown.taxDeferred,
          breakdown.brokerage,
          breakdown.espp,
          breakdown.hsa,
          breakdown.cash
        ],
        backgroundColor: [
          '#10b981', // emerald
          '#3b82f6', // blue
          '#8b5cf6', // violet
          '#f59e0b', // amber
          '#06b6d4', // cyan
          '#64748b'  // slate
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };
  }, [processedData]);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(value);
          }
        }
      }
    }
  };

  const growthChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function(value) {
            return value.toFixed(1) + '%';
          }
        }
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getComparisonData = () => {
    return processedData.filter(d => selectedYears.includes(d.year));
  };

  if (Object.keys(historicalData).length === 0) {
    return (
      <>
        <Navigation />
        <div className="app-container">
          <div className="header">
            <h1>📊 Net Worth Dashboard</h1>
            <p>Track your financial progress over time</p>
          </div>
          <div className="empty-state">
            <div className="empty-state-content">
              <h2>No Historical Data Found</h2>
              <p>Start by adding historical data to see your net worth visualizations.</p>
              <div className="empty-state-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => window.location.href = '/historical'}
                >
                  Add Historical Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const latestData = processedData[processedData.length - 1];
  const previousData = processedData.length > 1 ? processedData[processedData.length - 2] : null;

  return (
    <>
      <Navigation />
      <div className="app-container">
        <div className="header">
          <h1>📊 Net Worth Dashboard</h1>
          <p>Track your financial progress over time</p>
        </div>

        {/* View Mode Selector */}
        <div className="view-mode-selector">
          <button 
            className={`btn ${viewMode === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('overview')}
          >
            Overview
          </button>
          <button 
            className={`btn ${viewMode === 'comparison' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('comparison')}
          >
            Year Comparison
          </button>
          <button 
            className={`btn ${viewMode === 'breakdown' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('breakdown')}
          >
            Asset Breakdown
          </button>
        </div>

        {/* Key Metrics Cards */}
        {latestData && (
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-header">
                <h3>Net Worth</h3>
                <span className="metric-year">{latestData.year}</span>
              </div>
              <div className="metric-value">
                {formatCurrency(latestData.netWorth)}
              </div>
              {previousData && (
                <div className={`metric-change ${latestData.netWorth >= previousData.netWorth ? 'positive' : 'negative'}`}>
                  {formatPercentage(((latestData.netWorth - previousData.netWorth) / Math.abs(previousData.netWorth)) * 100)}
                  <span className="metric-change-amount">
                    ({formatCurrency(latestData.netWorth - previousData.netWorth)})
                  </span>
                </div>
              )}
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <h3>Total Investments</h3>
                <span className="metric-year">{latestData.year}</span>
              </div>
              <div className="metric-value">
                {formatCurrency(latestData.investments)}
              </div>
              {previousData && (
                <div className={`metric-change ${latestData.investments >= previousData.investments ? 'positive' : 'negative'}`}>
                  {formatPercentage(((latestData.investments - previousData.investments) / Math.abs(previousData.investments)) * 100)}
                </div>
              )}
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <h3>Total Assets</h3>
                <span className="metric-year">{latestData.year}</span>
              </div>
              <div className="metric-value">
                {formatCurrency(latestData.totalAssets)}
              </div>
              {previousData && (
                <div className={`metric-change ${latestData.totalAssets >= previousData.totalAssets ? 'positive' : 'negative'}`}>
                  {formatPercentage(((latestData.totalAssets - previousData.totalAssets) / Math.abs(previousData.totalAssets)) * 100)}
                </div>
              )}
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <h3>Total Income</h3>
                <span className="metric-year">{latestData.year}</span>
              </div>
              <div className="metric-value">
                {formatCurrency(latestData.totalIncome)}
              </div>
              {previousData && (
                <div className={`metric-change ${latestData.totalIncome >= previousData.totalIncome ? 'positive' : 'negative'}`}>
                  {formatPercentage(((latestData.totalIncome - previousData.totalIncome) / Math.abs(previousData.totalIncome)) * 100)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content Based on View Mode */}
        {viewMode === 'overview' && (
          <div className="dashboard-content">
            {/* Net Worth Over Time */}
            <div className={`chart-section ${expandedSections.netWorth ? 'expanded' : 'collapsed'}`}>
              <div className="section-header" onClick={() => toggleSection('netWorth')}>
                <h2>📈 Net Worth Over Time</h2>
                <button className="expand-btn">
                  {expandedSections.netWorth ? '−' : '+'}
                </button>
              </div>
              {expandedSections.netWorth && (
                <div className="chart-container">
                  <Line data={netWorthChartData} options={chartOptions} />
                </div>
              )}
            </div>

            {/* Year-over-Year Growth */}
            {growthChartData && (
              <div className={`chart-section ${expandedSections.growth ? 'expanded' : 'collapsed'}`}>
                <div className="section-header" onClick={() => toggleSection('growth')}>
                  <h2>📊 Year-over-Year Growth</h2>
                  <button className="expand-btn">
                    {expandedSections.growth ? '−' : '+'}
                  </button>
                </div>
                {expandedSections.growth && (
                  <div className="chart-container">
                    <Bar data={growthChartData} options={growthChartOptions} />
                  </div>
                )}
              </div>
            )}

            {/* Investment Allocation */}
            {latestInvestmentAllocation && (
              <div className={`chart-section ${expandedSections.investments ? 'expanded' : 'collapsed'}`}>
                <div className="section-header" onClick={() => toggleSection('investments')}>
                  <h2>🥧 Investment Allocation ({latestData.year})</h2>
                  <button className="expand-btn">
                    {expandedSections.investments ? '−' : '+'}
                  </button>
                </div>
                {expandedSections.investments && (
                  <div className="chart-container pie-chart">
                    <Doughnut 
                      data={latestInvestmentAllocation} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'right',
                          }
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {viewMode === 'comparison' && (
          <div className="comparison-content">
            <div className="year-selector">
              <h3>Select Years to Compare:</h3>
              <div className="year-checkboxes">
                {processedData.map(data => (
                  <label key={data.year} className="year-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedYears.includes(data.year)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedYears(prev => [...prev, data.year].sort((a, b) => b - a));
                        } else {
                          setSelectedYears(prev => prev.filter(y => y !== data.year));
                        }
                      }}
                    />
                    {data.year}
                  </label>
                ))}
              </div>
            </div>

            <div className="comparison-table">
              <table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    {selectedYears.map(year => (
                      <th key={year}>{year}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'netWorth', label: 'Net Worth' },
                    { key: 'investments', label: 'Total Investments' },
                    { key: 'totalAssets', label: 'Total Assets' },
                    { key: 'liabilities', label: 'Liabilities' },
                    { key: 'totalIncome', label: 'Total Income' },
                  ].map(metric => (
                    <tr key={metric.key}>
                      <td className="metric-label">{metric.label}</td>
                      {selectedYears.map(year => {
                        const yearData = getComparisonData().find(d => d.year === year);
                        return (
                          <td key={year} className="metric-value">
                            {yearData ? formatCurrency(yearData[metric.key]) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === 'breakdown' && latestData && (
          <div className="breakdown-content">
            <h2>Asset Breakdown for {latestData.year}</h2>
            
            <div className="breakdown-grid">
              <div className="breakdown-section">
                <h3>💰 Investments</h3>
                <div className="breakdown-items">
                  <div className="breakdown-item">
                    <span>Tax-Free (Roth)</span>
                    <span>{formatCurrency(latestData.investmentBreakdown.taxFree)}</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Tax-Deferred (401k/IRA)</span>
                    <span>{formatCurrency(latestData.investmentBreakdown.taxDeferred)}</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Brokerage</span>
                    <span>{formatCurrency(latestData.investmentBreakdown.brokerage)}</span>
                  </div>
                  <div className="breakdown-item">
                    <span>ESPP</span>
                    <span>{formatCurrency(latestData.investmentBreakdown.espp)}</span>
                  </div>
                  <div className="breakdown-item">
                    <span>HSA</span>
                    <span>{formatCurrency(latestData.investmentBreakdown.hsa)}</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Cash</span>
                    <span>{formatCurrency(latestData.investmentBreakdown.cash)}</span>
                  </div>
                  <div className="breakdown-total">
                    <span>Total Investments</span>
                    <span>{formatCurrency(latestData.investments)}</span>
                  </div>
                </div>
              </div>

              <div className="breakdown-section">
                <h3>🏠 Other Assets</h3>
                <div className="breakdown-items">
                  <div className="breakdown-item">
                    <span>House Value</span>
                    <span>{formatCurrency(latestData.house)}</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Home Improvements</span>
                    <span>{formatCurrency(latestData.homeImprovements)}</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Other Assets</span>
                    <span>{formatCurrency(latestData.othAsset)}</span>
                  </div>
                </div>
              </div>

              <div className="breakdown-section liabilities">
                <h3>📉 Liabilities</h3>
                <div className="breakdown-items">
                  <div className="breakdown-item">
                    <span>Mortgage</span>
                    <span>{formatCurrency(latestData.mortgage)}</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Other Liabilities</span>
                    <span>{formatCurrency(latestData.othLia)}</span>
                  </div>
                  <div className="breakdown-total">
                    <span>Total Liabilities</span>
                    <span>{formatCurrency(latestData.liabilities)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="net-worth-calculation">
              <div className="calculation-row">
                <span>Total Assets</span>
                <span>{formatCurrency(latestData.totalAssets)}</span>
              </div>
              <div className="calculation-row">
                <span>Total Liabilities</span>
                <span>-{formatCurrency(latestData.liabilities)}</span>
              </div>
              <div className="calculation-total">
                <span>Net Worth</span>
                <span>{formatCurrency(latestData.netWorth)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default NetWorth;
