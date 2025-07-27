import React, { useState, useEffect, useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import Navigation from './Navigation';
import { getHistoricalData, getPerformanceData, getPaycheckData, getNetWorthSettings, setNetWorthSettings } from '../utils/localStorage';
import { formatCurrency } from '../utils/calculationHelpers';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const NetWorth = () => {
  const [historicalData, setHistoricalData] = useState({});
  const [performanceData, setPerformanceData] = useState({});
  const [paycheckData, setPaycheckData] = useState(null);
  const [selectedYears, setSelectedYears] = useState([]);
  const [netWorthMode, setNetWorthMode] = useState('market'); // 'market' or 'costBasis'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'charts', 'analysis', 'scores'

  // Load data from localStorage
  useEffect(() => {
    const loadData = () => {
      const historical = getHistoricalData();
      const performance = getPerformanceData();
      const paycheck = getPaycheckData();
      const savedSettings = getNetWorthSettings();
      
      setHistoricalData(historical);
      setPerformanceData(performance);
      setPaycheckData(paycheck);
      
      // Load saved settings
      setNetWorthMode(savedSettings.netWorthMode);
      setActiveTab(savedSettings.activeTab);
      
      const availableYears = Object.keys(historical).map(year => parseInt(year)).sort();
      
      // Use saved selected years if they exist and are valid, otherwise auto-select all
      if (savedSettings.selectedYears.length > 0) {
        // Filter saved years to only include available years
        const validSavedYears = savedSettings.selectedYears.filter(year => availableYears.includes(year));
        setSelectedYears(validSavedYears.length > 0 ? validSavedYears : availableYears);
      } else {
        setSelectedYears(availableYears);
      }
    };

    loadData();

    // Listen for data updates
    const handleHistoricalUpdate = () => {
      const historical = getHistoricalData();
      setHistoricalData(historical);
      const availableYears = Object.keys(historical).map(year => parseInt(year)).sort();
      
      // When historical data updates, preserve existing selections if they're still valid
      setSelectedYears(currentSelectedYears => {
        const validCurrentYears = currentSelectedYears.filter(year => availableYears.includes(year));
        return validCurrentYears.length > 0 ? validCurrentYears : availableYears;
      });
    };

    const handlePerformanceUpdate = () => {
      setPerformanceData(getPerformanceData());
    };

    const handlePaycheckUpdate = () => {
      setPaycheckData(getPaycheckData());
    };

    window.addEventListener('historicalDataUpdated', handleHistoricalUpdate);
    window.addEventListener('performanceDataUpdated', handlePerformanceUpdate);
    window.addEventListener('paycheckDataUpdated', handlePaycheckUpdate);
    
    return () => {
      window.removeEventListener('historicalDataUpdated', handleHistoricalUpdate);
      window.removeEventListener('performanceDataUpdated', handlePerformanceUpdate);
      window.removeEventListener('paycheckDataUpdated', handlePaycheckUpdate);
    };
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    const settings = {
      selectedYears,
      netWorthMode,
      activeTab
    };
    setNetWorthSettings(settings);
  }, [selectedYears, netWorthMode, activeTab]);

  // Calculate house value based on mode
  const calculateHouseValue = (year, historicalEntry) => {
    if (netWorthMode === 'market') {
      // Use online estimated value from historical data
      return historicalEntry.house || 0;
    } else {
      // Cost basis: $315k purchase price + cumulative home improvements
      const purchasePrice = 315000;
      const purchaseYear = 2018;
      
      if (year < purchaseYear) return 0;
      
      // Calculate cumulative home improvements from purchase year to current year
      let cumulativeImprovements = 0;
      for (let y = purchaseYear; y <= year; y++) {
        const yearData = historicalData[y];
        if (yearData && yearData.homeImprovements) {
          cumulativeImprovements += yearData.homeImprovements;
        }
      }
      
      return purchasePrice + cumulativeImprovements;
    }
  };

  // Helper: Calculate average age for a given year using paycheck birthdays
  const getAverageAgeForYear = (year) => {
    if (!paycheckData) return null;
    
    const birthdays = [];
    if (paycheckData.your?.birthday) birthdays.push(paycheckData.your.birthday);
    if (paycheckData.spouse?.birthday) birthdays.push(paycheckData.spouse.birthday);
    
    if (birthdays.length === 0) return null;
    
    const ages = birthdays.map(birthday => {
      const dob = new Date(birthday);
      const refDate = new Date(year, 11, 31); // End of year
      
      let age = refDate.getFullYear() - dob.getFullYear();
      if (
        refDate.getMonth() < dob.getMonth() ||
        (refDate.getMonth() === dob.getMonth() && refDate.getDate() < dob.getDate())
      ) {
        age--;
      }
      return age;
    }).filter(a => a !== null);
    
    if (ages.length === 0) return null;
    return ages.reduce((a, b) => a + b, 0) / ages.length;
  };

  // Helper: Calculate cumulative lifetime earnings up to a given year
  const getCumulativeEarnings = (targetYear) => {
    let cumulative = 0;
    const years = Object.keys(historicalData).map(y => parseInt(y)).sort();
    
    for (const year of years) {
      if (year > targetYear) break;
      const yearData = historicalData[year];
      if (yearData && yearData.agi) {
        cumulative += yearData.agi;
      }
    }
    
    return cumulative;
  };

  // Process and calculate net worth data
  const processedData = useMemo(() => {
    const years = Object.keys(historicalData).map(year => parseInt(year)).sort();
    
    return years.map(year => {
      const historicalEntry = historicalData[year];
      const performanceEntry = performanceData[year];
      
      if (!historicalEntry) return null;
      
      // Calculate investment components
      const taxFree = historicalEntry.taxFree || 0;
      const taxDeferred = historicalEntry.taxDeferred || 0;
      const brokerage = historicalEntry.brokerage || 0;
      const espp = historicalEntry.espp || 0;
      const hsa = historicalEntry.hsa || 0;
      
      // Calculate portfolio value (investments)
      const portfolio = taxFree + taxDeferred + brokerage + espp + hsa;
      const retirement = taxFree + taxDeferred; // Retirement accounts only
      
      // Calculate house value based on selected mode
      const houseValue = calculateHouseValue(year, historicalEntry);
      
      // Cash and other assets
      const cash = historicalEntry.cash || 0;
      const otherAssets = historicalEntry.othAssets || 0;
      
      // Get AGI directly from historical data
      const agi = historicalEntry.agi || 0;
      
      // Liabilities
      const mortgage = historicalEntry.mortgage || 0;
      const otherLiabilities = historicalEntry.othLia || 0;
      const totalLiabilities = mortgage + otherLiabilities;
      
      // Calculate net worth
      const totalAssets = portfolio + houseValue + cash + otherAssets;
      const netWorth = totalAssets - totalLiabilities;
      
      // Calculate Money Guy Score
      const averageAge = getAverageAgeForYear(year);
      let moneyGuyScore = null;
      let averageAccumulator = null;
      
      if (averageAge !== null && agi > 0) {
        const yearsUntil40 = Math.abs(averageAge - 40);
        averageAccumulator = (averageAge * agi) / (10 + yearsUntil40);
        if (averageAccumulator > 0) {
          moneyGuyScore = netWorth / averageAccumulator;
        }
      }
      
      // Calculate Wealth Score (Net Worth / Cumulative Lifetime Earnings as percentage)
      const cumulativeEarnings = getCumulativeEarnings(year);
      const wealthScore = cumulativeEarnings > 0 ? (netWorth / cumulativeEarnings) * 100 : null;
      
      return {
        year,
        agi,
        netWorth,
        houseValue,
        hsa,
        cash,
        espp,
        retirement,
        portfolio,
        taxFree,
        taxDeferred,
        brokerage,
        otherAssets,
        totalAssets,
        mortgage,
        otherLiabilities,
        totalLiabilities,
        homeImprovements: historicalEntry.homeImprovements || 0,
        // Custom scores
        averageAge,
        averageAccumulator,
        moneyGuyScore,
        cumulativeEarnings,
        wealthScore
      };
    }).filter(Boolean);
  }, [historicalData, performanceData, paycheckData, netWorthMode]);

  // Filter data for selected years
  const filteredData = useMemo(() => {
    return processedData.filter(data => selectedYears.includes(data.year));
  }, [processedData, selectedYears]);

  // Chart data for net worth over time
  const chartData = useMemo(() => {
    const years = filteredData.map(d => d.year);
    const netWorthData = filteredData.map(d => d.netWorth);
    const portfolioData = filteredData.map(d => d.portfolio);
    const houseData = filteredData.map(d => d.houseValue);
    const cashData = filteredData.map(d => d.cash);
    const liabilityData = filteredData.map(d => d.totalLiabilities); // Show as positive values

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
          label: 'Portfolio',
          data: portfolioData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          tension: 0.1,
          fill: false
        },
        {
          label: 'House Value',
          data: houseData,
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          borderWidth: 2,
          tension: 0.1,
          fill: false
        },
        {
          label: 'Cash',
          data: cashData,
          borderColor: 'rgb(251, 146, 60)',
          backgroundColor: 'rgba(251, 146, 60, 0.1)',
          borderWidth: 2,
          tension: 0.1,
          fill: false
        },
        {
          label: 'Liabilities',
          data: liabilityData,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 2,
          tension: 0.1,
          fill: false
        }
      ]
    };
  }, [filteredData]);

  // Portfolio Tax Location Chart Data - restructured for year-by-year comparison
  const portfolioTaxLocationData = useMemo(() => {
    // Create data structure where each year's composition is compared
    const years = filteredData.map(d => d.year);
    const categories = ['Tax-Free (Roth)', 'Tax-Deferred (401k/IRA)', 'Brokerage (Taxable)', 'HSA', 'ESPP'];
    const colors = [
      'rgba(34, 197, 94, 0.8)',
      'rgba(59, 130, 246, 0.8)', 
      'rgba(168, 85, 247, 0.8)',
      'rgba(251, 146, 60, 0.8)',
      'rgba(239, 68, 68, 0.8)'
    ];

    // Create datasets for each category showing all years
    const datasets = categories.map((category, categoryIndex) => {
      const data = filteredData.map(d => {
        const total = d.portfolio;
        if (total <= 0) return 0;
        
        switch (categoryIndex) {
          case 0: return (d.taxFree / total) * 100;
          case 1: return (d.taxDeferred / total) * 100;
          case 2: return (d.brokerage / total) * 100;
          case 3: return (d.hsa / total) * 100;
          case 4: return (d.espp / total) * 100;
          default: return 0;
        }
      });

      return {
        label: category,
        data: data,
        backgroundColor: colors[categoryIndex],
        borderColor: colors[categoryIndex].replace('0.8', '1'),
        borderWidth: 1
      };
    });

    return {
      labels: years,
      datasets: datasets
    };
  }, [filteredData]);

  // Net Worth Location Chart Data - restructured for year-by-year comparison
  const netWorthLocationData = useMemo(() => {
    // Create data structure where each year's composition is compared
    const years = filteredData.map(d => d.year);
    const categories = ['Portfolio', 'House Value', 'Cash', 'Other Assets', 'Liabilities'];
    const colors = [
      'rgba(59, 130, 246, 0.8)',
      'rgba(168, 85, 247, 0.8)',
      'rgba(251, 146, 60, 0.8)',
      'rgba(34, 197, 94, 0.8)',
      'rgba(239, 68, 68, 0.8)'
    ];

    // Create datasets for each category showing all years
    const datasets = categories.map((category, categoryIndex) => {
      const data = filteredData.map(d => {
        const total = d.netWorth;
        if (total <= 0) return 0;
        
        switch (categoryIndex) {
          case 0: return (d.portfolio / total) * 100;
          case 1: return (d.houseValue / total) * 100;
          case 2: return (d.cash / total) * 100;
          case 3: return (d.otherAssets / total) * 100;
          case 4: return -(d.totalLiabilities / total) * 100; // Negative to show as reduction
          default: return 0;
        }
      });

      return {
        label: category,
        data: data,
        backgroundColor: colors[categoryIndex],
        borderColor: colors[categoryIndex].replace('0.8', '1'),
        borderWidth: 1
      };
    });

    return {
      labels: years,
      datasets: datasets
    };
  }, [filteredData]);

  // Money Guy Score Comparison Chart Data
  const moneyGuyComparisonData = useMemo(() => {
    const years = filteredData.map(d => d.year);
    
    // Calculate Average Accumulator values for each year
    const averageAccumulatorData = filteredData.map(d => d.averageAccumulator || 0);
    
    // Calculate Prodigious Accumulator (2x Average Accumulator)
    const prodigiousAccumulatorData = filteredData.map(d => (d.averageAccumulator || 0) * 2);
    
    // Net Worth and Portfolio data
    const netWorthData = filteredData.map(d => d.netWorth);
    const portfolioData = filteredData.map(d => d.portfolio);

    return {
      labels: years,
      datasets: [
        {
          label: 'Average Accumulator',
          data: averageAccumulatorData,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 2,
          tension: 0.1,
          fill: false
        },
        {
          label: 'Prodigious Accumulator (2x Average)',
          data: prodigiousAccumulatorData,
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          borderWidth: 2,
          tension: 0.1,
          fill: false
        },
        {
          label: 'Net Worth',
          data: netWorthData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          tension: 0.1,
          fill: false
        },
        {
          label: 'Portfolio',
          data: portfolioData,
          borderColor: 'rgb(251, 146, 60)',
          backgroundColor: 'rgba(251, 146, 60, 0.1)',
          borderWidth: 2,
          tension: 0.1,
          fill: false
        }
      ]
    };
  }, [filteredData]);

  // Chart options for main net worth chart
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: '500'
          },
          boxWidth: 12,
          boxHeight: 12
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f1f5f9',
        bodyColor: '#e2e8f0',
        borderColor: '#475569',
        borderWidth: 1,
        cornerRadius: 8,
        titleFont: {
          size: 13,
          weight: '600'
        },
        bodyFont: {
          size: 12
        },
        padding: 12,
        callbacks: {
          label: function(context) {
            return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(148, 163, 184, 0.15)',
          drawBorder: false
        },
        border: {
          display: false
        },
        ticks: {
          callback: function(value) {
            return formatCurrency(value);
          },
          font: {
            size: 11
          },
          color: '#64748b'
        }
      },
      x: {
        grid: {
          color: 'rgba(148, 163, 184, 0.15)',
          drawBorder: false
        },
        border: {
          display: false
        },
        ticks: {
          font: {
            size: 11,
            weight: '500'
          },
          color: '#475569'
        }
      }
    }
  };

  // Bar chart options for percentage charts - stacked for better comparison
  const percentageBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: '500'
          },
          boxWidth: 12,
          boxHeight: 12
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f1f5f9',
        bodyColor: '#e2e8f0',
        borderColor: '#475569',
        borderWidth: 1,
        cornerRadius: 8,
        titleFont: {
          size: 13,
          weight: '600'
        },
        bodyFont: {
          size: 12
        },
        padding: 12,
        callbacks: {
          label: function(context) {
            return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%';
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        stacked: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.15)',
          drawBorder: false
        },
        border: {
          display: false
        },
        ticks: {
          callback: function(value) {
            return value + '%';
          },
          font: {
            size: 11
          },
          color: '#64748b'
        }
      },
      x: {
        stacked: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.15)',
          drawBorder: false
        },
        border: {
          display: false
        },
        ticks: {
          font: {
            size: 11,
            weight: '500'
          },
          color: '#475569'
        }
      }
    }
  };

  // Money Guy comparison chart options
  const moneyGuyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: '500'
          },
          boxWidth: 12,
          boxHeight: 12
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f1f5f9',
        bodyColor: '#e2e8f0',
        borderColor: '#475569',
        borderWidth: 1,
        cornerRadius: 8,
        titleFont: {
          size: 13,
          weight: '600'
        },
        bodyFont: {
          size: 12
        },
        padding: 12,
        callbacks: {
          label: function(context) {
            return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(148, 163, 184, 0.15)',
          drawBorder: false
        },
        border: {
          display: false
        },
        ticks: {
          callback: function(value) {
            return formatCurrency(value);
          },
          font: {
            size: 11
          },
          color: '#64748b'
        }
      },
      x: {
        grid: {
          color: 'rgba(148, 163, 184, 0.15)',
          drawBorder: false
        },
        border: {
          display: false
        },
        ticks: {
          font: {
            size: 11,
            weight: '500'
          },
          color: '#475569'
        }
      }
    }
  };

  // Get available years for selection
  const availableYears = Object.keys(historicalData).map(year => parseInt(year)).sort();

  // Toggle year selection
  const toggleYear = (year) => {
    if (selectedYears.includes(year)) {
      setSelectedYears(selectedYears.filter(y => y !== year));
    } else {
      setSelectedYears([...selectedYears, year].sort());
    }
  };

  // Select all/none helpers
  const selectAllYears = () => setSelectedYears(availableYears);
  const selectNoneYears = () => setSelectedYears([]);

  if (availableYears.length === 0) {
    return (
      <>
        <Navigation />
        <div className="app-container">
          <div className="header">
            <h1>📊 Net Worth Dashboard</h1>
            <p>Track your financial progress over time</p>
          </div>
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <h2>No Historical Data</h2>
            <p>Add some data in the Historical Tracker to see your net worth analysis.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="app-container">
        <div className="header">
          <h1>📊 Net Worth Dashboard</h1>
          <p>Track your financial progress over time</p>
        </div>

        {/* Controls Section */}
        <div className="networth-controls">
          {/* Net Worth Calculation Mode Toggle */}
          <div className="networth-control-card">
            <div className="networth-control-header">
              <span className="networth-control-label">Calculation Mode:</span>
              <div className="networth-mode-buttons">
                <button
                  className={`btn networth-mode-button ${netWorthMode === 'market' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setNetWorthMode('market')}
                >
                  Market Value
                </button>
                <button
                  className={`btn networth-mode-button ${netWorthMode === 'costBasis' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setNetWorthMode('costBasis')}
                >
                  Cost Basis
                </button>
              </div>
            </div>
            <div className="networth-control-description">
              {netWorthMode === 'market' 
                ? 'Uses estimated house values from online sources' 
                : 'Uses $315k purchase price + home improvements'}
            </div>
          </div>

          {/* Year Selection */}
          <div className="networth-control-card">
            <div className="networth-year-actions">
              <span className="networth-control-label">Years to Display:</span>
              <button className="btn btn-secondary networth-year-action-btn" onClick={selectAllYears}>
                All
              </button>
              <button className="btn btn-secondary networth-year-action-btn" onClick={selectNoneYears}>
                Clear
              </button>
            </div>
            <div className="networth-year-checkboxes">
              {availableYears.map(year => (
                <label key={year} className={`networth-year-checkbox ${selectedYears.includes(year) ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedYears.includes(year)}
                    onChange={() => toggleYear(year)}
                  />
                  {year}
                </label>
              ))}
            </div>
            <div className="networth-year-summary">
              {selectedYears.length}/{availableYears.length} selected
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        {selectedYears.length > 0 && (
          <div className="networth-tabs">
            <div className="networth-tab-border">
              <div className="networth-tab-buttons">
                {[
                  { id: 'overview', label: '📈 Overview & Trends', icon: '📈' },
                  { id: 'breakdown', label: '📊 Portfolio Breakdown', icon: '📊' },
                  { id: 'comparison', label: '⚖️ Money Guy Analysis', icon: '⚖️' },
                  { id: 'details', label: '📋 Detailed Data', icon: '📋' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`networth-tab-button ${activeTab === tab.id ? 'active' : ''}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {selectedYears.length > 0 && (
          <>
            {/* Overview & Trends Tab */}
            {activeTab === 'overview' && (
              <div>
                {/* Summary Statistics */}
                {filteredData.length > 0 && (
                  <div className="networth-summary">
                    <h2 className="networth-summary-title">📊 Quick Summary</h2>
                    <div className="networth-summary-grid">
                      {(() => {
                        const latest = filteredData[filteredData.length - 1];
                        const earliest = filteredData[0];
                        const totalGrowth = latest.netWorth - earliest.netWorth;
                        const percentGrowth = earliest.netWorth !== 0 ? ((totalGrowth / Math.abs(earliest.netWorth)) * 100) : 0;
                        
                        return [
                          { label: 'Latest Net Worth', value: formatCurrency(latest.netWorth), year: latest.year },
                          { label: 'Total Growth', value: formatCurrency(totalGrowth), change: `${percentGrowth >= 0 ? '+' : ''}${percentGrowth.toFixed(1)}%` },
                          { label: 'Current Portfolio', value: formatCurrency(latest.portfolio) },
                          { label: 'Current House Value', value: formatCurrency(latest.houseValue) },
                          { label: 'Current Liabilities', value: formatCurrency(latest.totalLiabilities) }
                        ].map((stat, idx) => (
                          <div key={idx} className="networth-summary-card">
                            <div className="networth-summary-label">
                              {stat.label} {stat.year && `(${stat.year})`}
                            </div>
                            <div className="networth-summary-value">
                              {stat.value}
                            </div>
                            {stat.change && (
                              <div className={`networth-summary-change ${percentGrowth >= 0 ? 'positive' : 'negative'}`}>
                                {stat.change}
                              </div>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* Net Worth Chart */}
                <div className="networth-chart-container">
                  <h3 className="networth-chart-title">
                    📈 Net Worth Over Time ({netWorthMode === 'market' ? 'Market Value' : 'Cost Basis'})
                  </h3>
                  <div className="networth-chart-wrapper">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                </div>
              </div>
            )}

            {/* Portfolio Breakdown Tab */}
            {activeTab === 'breakdown' && (
              <div className="networth-breakdown-grid">
                {/* Portfolio Tax Location Chart */}
                <div className="networth-chart-container">
                  <h3 className="networth-chart-title">
                    🏛️ Portfolio Tax Location Breakdown (%)
                  </h3>
                  <div className="networth-chart-wrapper medium">
                    <Bar data={portfolioTaxLocationData} options={percentageBarOptions} />
                  </div>
                </div>

                {/* Net Worth Location Chart */}
                <div className="networth-chart-container">
                  <h3 className="networth-chart-title">
                    🏠 Net Worth Component Breakdown (%)
                  </h3>
                  <div className="networth-chart-wrapper medium">
                    <Bar data={netWorthLocationData} options={percentageBarOptions} />
                  </div>
                </div>
              </div>
            )}

            {/* Money Guy Analysis Tab */}
            {activeTab === 'comparison' && (
              <div>
                {/* Money Guy Score Comparison Chart */}
                <div className="networth-chart-container">
                  <h3 className="networth-chart-title">
                    ⚖️ Money Guy Score Analysis - Average vs Prodigious Accumulator
                  </h3>
                  <div className="networth-chart-wrapper">
                    <Line data={moneyGuyComparisonData} options={moneyGuyChartOptions} />
                  </div>
                </div>

                {/* Custom Scores Section */}
                {filteredData.length > 0 && (
                  <div className="networth-scores">
                    <h2 className="networth-scores-title">🎯 Financial Scores by Year</h2>
                    <div className="networth-scores-grid">
                      {filteredData.map(data => (
                        <div key={data.year} className="networth-score-card">
                          <h3 className="networth-score-year">
                            {data.year}
                          </h3>
                          
                          {/* Money Guy Score */}
                          <div className="networth-score-item money-guy">
                            <div className="networth-score-label money-guy">
                              Money Guy Score
                            </div>
                            <div className="networth-score-value money-guy">
                              {data.moneyGuyScore !== null ? data.moneyGuyScore.toFixed(2) : 'N/A'}
                            </div>
                            {data.averageAge === null ? (
                              <div className="networth-score-warning">
                                ⚠️ Birthday info required in Paycheck Calculator
                              </div>
                            ) : (
                              <div className="networth-score-details money-guy">
                                Avg Age: {data.averageAge.toFixed(1)} • AGI: {formatCurrency(data.agi)}
                              </div>
                            )}
                          </div>

                          {/* Wealth Score */}
                          <div className="networth-score-item wealth">
                            <div className="networth-score-label wealth">
                              Wealth Score
                            </div>
                            <div className="networth-score-value wealth">
                              {data.wealthScore !== null ? `${data.wealthScore.toFixed(1)}%` : 'N/A'}
                            </div>
                            <div className="networth-score-details wealth">
                              Net Worth ÷ Cumulative Earnings
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Detailed Data Tab */}
            {activeTab === 'details' && (
              <div>
                {/* Year-over-Year Comparison Table */}
                {filteredData.length > 1 && (
                  <div className="networth-table-container">
                    <h2 className="networth-table-title">📋 Year-over-Year Comparison</h2>
                    <div className="networth-table-wrapper">
                      <div className="networth-table-scroll">
                        <table className="networth-table">
                          <thead>
                            <tr>
                              <th className="sticky">
                                Metric
                              </th>
                              {filteredData.map(data => (
                                <th key={data.year} className="year-header">
                                  {data.year}
                                </th>
                              ))}
                            </tr>
                          </thead>
                  <tbody>
                    {(() => {
                      const metrics = [
                        { key: 'agi', label: 'AGI (Income)', format: 'currency' },
                        { key: 'netWorth', label: 'Net Worth', format: 'currency' },
                        { key: 'houseValue', label: 'House Value', format: 'currency' },
                        { key: 'hsa', label: 'HSA', format: 'currency' },
                        { key: 'cash', label: 'Cash', format: 'currency' },
                        { key: 'espp', label: 'ESPP', format: 'currency' },
                        { key: 'retirement', label: 'Retirement', format: 'currency' },
                        { key: 'portfolio', label: 'Total Portfolio', format: 'currency' },
                        { key: 'moneyGuyScore', label: 'Money Guy Score', format: 'decimal' },
                        { key: 'wealthScore', label: 'Wealth Score (%)', format: 'percentage' }
                      ];

                      return metrics.map((metric, metricIdx) => (
                        <tr key={metric.key}>
                          <td className="metric-label">
                            {metric.label}
                          </td>
                          {filteredData.map((data, dataIdx) => {
                            const currentValue = data[metric.key];
                            const previousData = dataIdx > 0 ? filteredData[dataIdx - 1] : null;
                            const previousValue = previousData ? previousData[metric.key] : null;
                            
                            let dollarChange = null;
                            let percentChange = null;
                            
                            if (previousValue !== null && currentValue !== null) {
                              dollarChange = currentValue - previousValue;
                              percentChange = previousValue !== 0 ? ((dollarChange / Math.abs(previousValue)) * 100) : 0;
                            }

                            return (
                              <td key={data.year}>
                                <div className="networth-table-value">
                                  {(() => {
                                    if (currentValue === null || currentValue === undefined) return 'N/A';
                                    
                                    switch (metric.format) {
                                      case 'currency':
                                        return formatCurrency(currentValue);
                                      case 'percentage':
                                        return `${currentValue.toFixed(1)}%`;
                                      case 'decimal':
                                        return currentValue.toFixed(2);
                                      default:
                                        return formatCurrency(currentValue);
                                    }
                                  })()}
                                </div>
                                {dollarChange !== null && (
                                  <div className="networth-table-change">
                                    <div className={`networth-table-change-amount ${dollarChange >= 0 ? 'positive' : 'negative'}`}>
                                      {dollarChange >= 0 ? '+' : ''}{(() => {
                                        switch (metric.format) {
                                          case 'currency':
                                            return formatCurrency(dollarChange);
                                          case 'percentage':
                                            return `${dollarChange.toFixed(1)}%`;
                                          case 'decimal':
                                            return dollarChange.toFixed(2);
                                          default:
                                            return formatCurrency(dollarChange);
                                        }
                                      })()}
                                    </div>
                                    <div className={`networth-table-change-percent ${percentChange >= 0 ? 'positive' : 'negative'}`}>
                                      ({percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%)
                                    </div>
                                  </div>
                                )}
                                {dollarChange === null && dataIdx > 0 && (
                                  <div className="networth-table-no-data">
                                    No data
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ));
                    })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {selectedYears.length === 0 && (
          <div className="networth-empty-state">
            <p>Select one or more years above to view the net worth chart and analysis.</p>
          </div>
        )}
      </div>
    </>
  );
};

export default NetWorth;