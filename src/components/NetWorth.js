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
import ChartDataLabels from 'chartjs-plugin-datalabels';
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
  const [showAllYearsInChart, setShowAllYearsInChart] = useState(false); // Override for net worth chart
  const [showAllYearsInPortfolioChart, setShowAllYearsInPortfolioChart] = useState(false); // Override for portfolio chart
  const [showAllYearsInNetWorthBreakdownChart, setShowAllYearsInNetWorthBreakdownChart] = useState(false); // Override for net worth breakdown chart
  const [showAllYearsInMoneyGuyChart, setShowAllYearsInMoneyGuyChart] = useState(false); // Override for money guy chart
  const [useThreeYearIncomeAverage, setUseThreeYearIncomeAverage] = useState(false); // Toggle for 3-year income averaging in Money Guy scores
  const [useReverseChronological, setUseReverseChronological] = useState(false); // Global toggle for chronological order (default: oldest first)
  const [isInitialized, setIsInitialized] = useState(false); // Prevent saving during initial load

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
      setShowAllYearsInChart(savedSettings.showAllYearsInChart || false);
      setShowAllYearsInPortfolioChart(savedSettings.showAllYearsInPortfolioChart || false);
      setShowAllYearsInNetWorthBreakdownChart(savedSettings.showAllYearsInNetWorthBreakdownChart || false);
      setShowAllYearsInMoneyGuyChart(savedSettings.showAllYearsInMoneyGuyChart || false);
      setUseThreeYearIncomeAverage(savedSettings.useThreeYearIncomeAverage || false);
      setUseReverseChronological(savedSettings.useReverseChronological !== undefined ? savedSettings.useReverseChronological : false);
      
      const availableYears = Object.values(historical)
        .map(entry => entry.year)
        .filter(year => year && !isNaN(year) && year > 0)
        .filter((year, index, arr) => arr.indexOf(year) === index) // Remove duplicates
        .sort();
      
      // Use saved selected years if they exist and are valid, otherwise auto-select all
      if (savedSettings.selectedYears.length > 0) {
        // Filter saved years to only include available years
        const validSavedYears = savedSettings.selectedYears.filter(year => availableYears.includes(year));
        const finalSelectedYears = validSavedYears.length > 0 ? validSavedYears : availableYears;
        setSelectedYears(finalSelectedYears);
      } else {
        setSelectedYears(availableYears);
      }
      
      // Mark initialization as complete after all state is set
      setTimeout(() => {
        setIsInitialized(true);
      }, 100);
    };

    loadData();

    // Listen for data updates
    const handleHistoricalUpdate = () => {
      const historical = getHistoricalData();
      setHistoricalData(historical);
      const availableYears = Object.values(historical)
        .map(entry => entry.year)
        .filter(year => year && !isNaN(year) && year > 0)
        .filter((year, index, arr) => arr.indexOf(year) === index) // Remove duplicates
        .sort();
      
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

  // Save settings to localStorage whenever they change (but only after initialization)
  useEffect(() => {
    if (!isInitialized) {
      return;
    }
    
    const settings = {
      selectedYears,
      netWorthMode,
      activeTab,
      showAllYearsInChart,
      showAllYearsInPortfolioChart,
      showAllYearsInNetWorthBreakdownChart,
      showAllYearsInMoneyGuyChart,
      useThreeYearIncomeAverage,
      useReverseChronological
    };
    setNetWorthSettings(settings);
  }, [selectedYears, netWorthMode, activeTab, showAllYearsInChart, showAllYearsInPortfolioChart, showAllYearsInNetWorthBreakdownChart, showAllYearsInMoneyGuyChart, useThreeYearIncomeAverage, useReverseChronological, isInitialized]);

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

  // Helper: Calculate 3-year average income for a given year
  const getThreeYearAverageIncome = (targetYear) => {
    const years = Object.values(historicalData)
      .map(entry => entry.year)
      .filter(year => year && !isNaN(year) && year > 0)
      .sort();
    
    // Get the 3 years including and before target year
    const relevantYears = years.filter(year => year <= targetYear).slice(-3);
    
    if (relevantYears.length === 0) return 0;
    
    let totalIncome = 0;
    let validYears = 0;
    
    for (const year of relevantYears) {
      const yearData = Object.values(historicalData).find(entry => entry.year === year);
      if (yearData && yearData.agi) {
        totalIncome += yearData.agi;
        validYears++;
      }
    }
    
    return validYears > 0 ? totalIncome / validYears : 0;
  };

  // Helper: Calculate cumulative lifetime earnings up to a given year
  const getCumulativeEarnings = (targetYear) => {
    let cumulative = 0;
    const years = Object.values(historicalData)
      .map(entry => entry.year)
      .filter(year => year && !isNaN(year) && year > 0)
      .sort();
    
    for (const year of years) {
      if (year > targetYear) break;
      const yearData = Object.values(historicalData).find(entry => entry.year === year);
      if (yearData && yearData.agi) {
        cumulative += yearData.agi;
      }
    }
    
    return cumulative;
  };

  // Process and calculate net worth data
  const processedData = useMemo(() => {
    const years = Object.values(historicalData)
      .map(entry => entry.year)
      .filter(year => year && !isNaN(year) && year > 0)
      .sort();
    
    return years.map(year => {
      const historicalEntry = Object.values(historicalData).find(entry => entry.year === year);
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
      
      // Calculate income for Money Guy Score (either current year or 3-year average)
      const incomeForScore = useThreeYearIncomeAverage ? getThreeYearAverageIncome(year) : agi;
      
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
      
      if (averageAge !== null && incomeForScore > 0) {
        const yearsUntil40 = Math.abs(averageAge - 40);
        averageAccumulator = (averageAge * incomeForScore) / (10 + yearsUntil40);
        if (averageAccumulator > 0) {
          moneyGuyScore = netWorth / averageAccumulator;
        }
      }
      
      // Calculate Wealth Score (Net Worth / Cumulative Lifetime Earnings as percentage)
      const cumulativeEarnings = getCumulativeEarnings(year);
      const wealthScore = cumulativeEarnings > 0 ? (netWorth / cumulativeEarnings) * 100 : null;
      
      // Calculate contribution rates from performance data
      const yearPerformanceEntries = Object.values(performanceData).filter(entry => entry.year === year);
      const totalContributions = yearPerformanceEntries.reduce((sum, entry) => sum + (entry.contributions || 0), 0);
      const totalEmployerMatch = yearPerformanceEntries.reduce((sum, entry) => sum + (entry.employerMatch || 0), 0);
      
      // Calculate contribution rates as percentage of AGI
      const contributionRateWithMatch = agi > 0 ? ((totalContributions + totalEmployerMatch) / agi) * 100 : 0;
      const contributionRateWithoutMatch = agi > 0 ? (totalContributions / agi) * 100 : 0;
      
      // Determine which rate to display based on AGI threshold
      const shouldShowWithMatch = agi < 200000;
      const displayedContributionRate = shouldShowWithMatch ? contributionRateWithMatch : contributionRateWithoutMatch;
      
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
        wealthScore,
        // Contribution rates
        totalContributions,
        totalEmployerMatch,
        contributionRateWithMatch,
        contributionRateWithoutMatch,
        shouldShowWithMatch,
        displayedContributionRate
      };
    }).filter(Boolean);
  }, [historicalData, performanceData, paycheckData, netWorthMode, useThreeYearIncomeAverage]);

  // Filter data for selected years
  const filteredData = useMemo(() => {
    return processedData.filter(data => selectedYears.includes(data.year));
  }, [processedData, selectedYears]);

  // Data for the main net worth chart (respects the "show all years" override)
  const chartFilteredData = useMemo(() => {
    return showAllYearsInChart ? processedData : filteredData;
  }, [processedData, filteredData, showAllYearsInChart]);

  // Data for the portfolio tax location chart (respects the "show all years" override)
  const portfolioChartFilteredData = useMemo(() => {
    return showAllYearsInPortfolioChart ? processedData : filteredData;
  }, [processedData, filteredData, showAllYearsInPortfolioChart]);

  // Data for the net worth breakdown chart (respects the "show all years" override)
  const netWorthBreakdownChartFilteredData = useMemo(() => {
    return showAllYearsInNetWorthBreakdownChart ? processedData : filteredData;
  }, [processedData, filteredData, showAllYearsInNetWorthBreakdownChart]);

  // Data for the money guy chart (respects the "show all years" override)
  const moneyGuyChartFilteredData = useMemo(() => {
    return showAllYearsInMoneyGuyChart ? processedData : filteredData;
  }, [processedData, filteredData, showAllYearsInMoneyGuyChart]);

  // Chart data for net worth over time
  const chartData = useMemo(() => {
    // Sort data based on global chronological toggle
    const sortedData = useReverseChronological ? 
      [...chartFilteredData].sort((a, b) => b.year - a.year) :
      [...chartFilteredData].sort((a, b) => a.year - b.year);
      
    const years = sortedData.map(d => d.year);
    const netWorthData = sortedData.map(d => d.netWorth);
    const portfolioData = sortedData.map(d => d.portfolio);
    const houseData = sortedData.map(d => d.houseValue);
    const cashData = sortedData.map(d => d.cash);
    const liabilityData = sortedData.map(d => d.totalLiabilities); // Show as positive values

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
          label: 'House',
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
  }, [chartFilteredData, useReverseChronological]);

  // Portfolio Tax Location Chart Data - restructured for year-by-year comparison
  const portfolioTaxLocationData = useMemo(() => {
    // Create data structure where each year's composition is compared
    const sortedData = useReverseChronological ? 
      [...portfolioChartFilteredData].sort((a, b) => b.year - a.year) :
      [...portfolioChartFilteredData].sort((a, b) => a.year - b.year);
    const years = sortedData.map(d => d.year);
    const categories = ['Tax-Free (Roth)', 'Tax-Deferred (Trad)', 'Brokerage (Taxable)', 'HSA', 'ESPP'];
    const colors = [
      'rgba(34, 197, 94, 0.8)',
      'rgba(59, 130, 246, 0.8)', 
      'rgba(168, 85, 247, 0.8)',
      'rgba(251, 146, 60, 0.8)',
      'rgba(239, 68, 68, 0.8)'
    ];

    // Create datasets for each category showing all years
    const datasets = categories.map((category, categoryIndex) => {
      const data = sortedData.map(d => {
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
  }, [portfolioChartFilteredData, useReverseChronological]);

  // Net Worth Location Chart Data - restructured for year-by-year comparison
  const netWorthLocationData = useMemo(() => {
    // Create data structure where each year's composition is compared
    const sortedData = useReverseChronological ? 
      [...netWorthBreakdownChartFilteredData].sort((a, b) => b.year - a.year) :
      [...netWorthBreakdownChartFilteredData].sort((a, b) => a.year - b.year);
    const years = sortedData.map(d => d.year);
    const categories = ['Portfolio', 'House Equity', 'Cash', 'Other Assets'];
    const colors = [
      'rgba(59, 130, 246, 0.8)',
      'rgba(168, 85, 247, 0.8)',
      'rgba(251, 146, 60, 0.8)',
      'rgba(34, 197, 94, 0.8)'
    ];

    // Create datasets for each category showing all years
    const datasets = categories.map((category, categoryIndex) => {
      const data = sortedData.map(d => {
        // Calculate house equity (house value - mortgage)
        const houseEquity = Math.max(0, d.houseValue - (d.mortgage || 0));
        
        // Total of all positive components for percentage calculation (no liabilities)
        const totalAssets = d.portfolio + houseEquity + d.cash + d.otherAssets;
        
        if (totalAssets <= 0) return 0;
        
        switch (categoryIndex) {
          case 0: return (d.portfolio / totalAssets) * 100;
          case 1: return (houseEquity / totalAssets) * 100;
          case 2: return (d.cash / totalAssets) * 100;
          case 3: return (d.otherAssets / totalAssets) * 100;
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
  }, [netWorthBreakdownChartFilteredData, useReverseChronological]);

  // Money Guy Score Comparison Chart Data
  const moneyGuyComparisonData = useMemo(() => {
    // Sort data based on global chronological toggle
    const sortedData = useReverseChronological ? 
      [...moneyGuyChartFilteredData].sort((a, b) => b.year - a.year) :
      [...moneyGuyChartFilteredData].sort((a, b) => a.year - b.year);
    
    const years = sortedData.map(d => d.year);
    
    // Calculate Average Accumulator values for each year
    const averageAccumulatorData = sortedData.map(d => d.averageAccumulator || 0);
    
    // Calculate Prodigious Accumulator (2x Average Accumulator)
    const prodigiousAccumulatorData = sortedData.map(d => (d.averageAccumulator || 0) * 2);
    
    // Net Worth and Portfolio data
    const netWorthData = sortedData.map(d => d.netWorth);
    const portfolioData = sortedData.map(d => d.portfolio);

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
          label: 'Prodigious Accumulator',
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
  }, [moneyGuyChartFilteredData, useReverseChronological]);

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
      },
      datalabels: {
        display: function(context) {
          // Safely get the actual data value for this segment
          const actualValue = context?.dataset?.data?.[context?.dataIndex] || 0;
          // Show labels for values >= 3% to see more labels
          return actualValue >= 3;
        },
        color: 'white',
        font: function(context) {
          // Safely access chart data
          const numBars = context?.chart?.data?.labels?.length || 1;
          const segmentValue = context?.dataset?.data?.[context?.dataIndex] || 0;
          
          // Base font size scales inversely with number of bars
          let baseFontSize = Math.max(8, Math.min(16, 20 - numBars));
          
          // Adjust font size based on segment size
          if (segmentValue >= 20) {
            baseFontSize = Math.min(baseFontSize + 2, 16);
          } else if (segmentValue >= 10) {
            baseFontSize = Math.min(baseFontSize + 1, 14);
          } else if (segmentValue < 5) {
            baseFontSize = Math.max(baseFontSize - 1, 8);
          }
          
          return {
            size: baseFontSize,
            weight: 'bold'
          };
        },
        formatter: function(value, context) {
          // Safely get the raw data value
          const actualValue = context?.dataset?.data?.[context?.dataIndex] || value || 0;
          if (actualValue < 0.1) return ''; // Don't show very small values
          return actualValue.toFixed(1) + '%';
        },
        anchor: 'center',
        align: 'center',
        textStrokeColor: 'rgba(0, 0, 0, 0.3)',
        textStrokeWidth: 1
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
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
  const availableYears = Object.values(historicalData)
    .map(entry => entry.year)
    .filter(year => year && !isNaN(year) && year > 0)
    .filter((year, index, arr) => arr.indexOf(year) === index) // Remove duplicates
    .sort();

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

          {/* Chronological Order Toggle */}
          <div className="networth-control-card">
            <div className="networth-control-header">
              <span className="networth-control-label">Chart Order:</span>
              <div className="networth-mode-buttons">
                <button
                  className={`btn networth-mode-button ${useReverseChronological ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setUseReverseChronological(true)}
                >
                  Newest First
                </button>
                <button
                  className={`btn networth-mode-button ${!useReverseChronological ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setUseReverseChronological(false)}
                >
                  Oldest First
                </button>
              </div>
            </div>
            <div className="networth-control-description">
              {useReverseChronological 
                ? 'Show newest data first in charts and scores (reverse chronological)' 
                : 'Show oldest data first in charts and scores (chronological)'}
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
                  <div className="networth-chart-header">
                    <h3 className="networth-chart-title">
                      📈 Net Worth Over Time ({netWorthMode === 'market' ? 'Market Value' : 'Cost Basis'})
                    </h3>
                    <div className="networth-chart-controls">
                      <label className="networth-chart-toggle">
                        <input
                          type="checkbox"
                          checked={showAllYearsInChart}
                          onChange={(e) => setShowAllYearsInChart(e.target.checked)}
                        />
                        <span className="networth-chart-toggle-label">
                          Show All Years {showAllYearsInChart && `(${processedData.length} total)`}
                        </span>
                      </label>
                    </div>
                  </div>
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
                  <div className="networth-chart-header">
                    <h3 className="networth-chart-title">
                      🏛️ Portfolio Tax Location Breakdown (%)
                    </h3>
                    <div className="networth-chart-controls">
                      <label className="networth-chart-toggle">
                        <input
                          type="checkbox"
                          checked={showAllYearsInPortfolioChart}
                          onChange={(e) => setShowAllYearsInPortfolioChart(e.target.checked)}
                        />
                        <span className="networth-chart-toggle-label">
                          Show All Years {showAllYearsInPortfolioChart && `(${processedData.length} total)`}
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="networth-chart-wrapper medium">
                    <Bar 
                      data={portfolioTaxLocationData} 
                      options={percentageBarOptions}
                      plugins={[ChartDataLabels]}
                    />
                  </div>
                </div>

                {/* Net Worth Location Chart */}
                <div className="networth-chart-container">
                  <div className="networth-chart-header">
                    <h3 className="networth-chart-title">
                      🏠 Asset Allocation Breakdown (%)
                    </h3>
                    <div className="networth-chart-controls">
                      <label className="networth-chart-toggle">
                        <input
                          type="checkbox"
                          checked={showAllYearsInNetWorthBreakdownChart}
                          onChange={(e) => setShowAllYearsInNetWorthBreakdownChart(e.target.checked)}
                        />
                        <span className="networth-chart-toggle-label">
                          Show All Years {showAllYearsInNetWorthBreakdownChart && `(${processedData.length} total)`}
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="networth-chart-wrapper medium">
                    <Bar 
                      data={netWorthLocationData} 
                      options={percentageBarOptions}
                      plugins={[ChartDataLabels]}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Money Guy Analysis Tab */}
            {activeTab === 'comparison' && (
              <div>
                {/* Money Guy Score Comparison Chart */}
                <div className="networth-chart-container">
                  <div className="networth-chart-header">
                    <h3 className="networth-chart-title">
                      ⚖️ Money Guy Score Analysis - Average vs Prodigious Accumulator
                    </h3>
                    <div className="networth-chart-controls">
                      <label className="networth-chart-toggle">
                        <input
                          type="checkbox"
                          checked={showAllYearsInMoneyGuyChart}
                          onChange={(e) => setShowAllYearsInMoneyGuyChart(e.target.checked)}
                        />
                        <span className="networth-chart-toggle-label">
                          Show All Years {showAllYearsInMoneyGuyChart && `(${processedData.length} total)`}
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="networth-chart-wrapper">
                    <Line data={moneyGuyComparisonData} options={moneyGuyChartOptions} />
                  </div>
                </div>

                {/* Custom Scores Section */}
                {filteredData.length > 0 && (
                  <div className="networth-scores">
                    {/* Explanatory text for contribution rate logic */}
                    <div style={{ 
                      background: '#f8fafc', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px', 
                      padding: '16px', 
                      marginBottom: '24px',
                      fontSize: '0.875rem',
                      color: '#475569'
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '8px', color: '#334155' }}>
                        📊 About Contribution Rates
                      </div>
                      <p style={{ margin: '0 0 8px 0' }}>
                        Contribution rates show your total retirement savings as a percentage of AGI (Adjusted Gross Income).
                      </p>
                      <ul style={{ margin: '0', paddingLeft: '20px' }}>
                        <li><strong>AGI under $200,000:</strong> Shows rate including employer match (total retirement benefit)</li>
                        <li><strong>AGI $200,000+:</strong> Shows personal contributions only (high earners typically max out employer match)</li>
                      </ul>
                    </div>

                    <div className="networth-scores-header">
                      <h2 className="networth-scores-title">🎯 Financial Scores by Year</h2>
                      <div className="networth-scores-controls">
                        <label className="networth-chart-toggle">
                          <input
                            type="checkbox"
                            checked={useThreeYearIncomeAverage}
                            onChange={(e) => setUseThreeYearIncomeAverage(e.target.checked)}
                          />
                          <span className="networth-chart-toggle-label">
                            Use 3-Year Income Average
                          </span>
                        </label>
                      </div>
                    </div>
                    <div className="networth-scores-grid">
                      {(useReverseChronological ? 
                        [...filteredData].sort((a, b) => b.year - a.year) :
                        [...filteredData].sort((a, b) => a.year - b.year)
                      ).map(data => (
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

                          {/* Contribution Rate Score */}
                          <div className="networth-score-item contribution">
                            <div className="networth-score-label contribution">
                              Contribution Rate
                            </div>
                            <div className="networth-score-value contribution">
                              {data.displayedContributionRate > 0 ? `${data.displayedContributionRate.toFixed(1)}%` : 'N/A'}
                            </div>
                            <div className="networth-score-details contribution">
                              {data.shouldShowWithMatch ? 
                                `Employee: ${formatCurrency(data.totalContributions)} + Employer: ${formatCurrency(data.totalEmployerMatch)}` :
                                `Employee: ${formatCurrency(data.totalContributions)} (match not included)`
                              }
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
                {filteredData.length >= 2 ? (
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
                              {[...filteredData].reverse().map(data => (
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
                          {[...filteredData].reverse().map((data, dataIdx) => {
                            const currentValue = data[metric.key];
                            // Find the actual chronologically previous year in the dataset (handles non-consecutive years)
                            const availableYears = filteredData
                              .map(d => d.year)
                              .filter(year => !isNaN(year) && year > 0)
                              .filter((year, index, arr) => arr.indexOf(year) === index) // Remove duplicates
                              .sort((a, b) => a - b);
                            const currentYearIndex = availableYears.indexOf(data.year);
                            const previousYear = currentYearIndex > 0 ? availableYears[currentYearIndex - 1] : null;
                            const previousData = previousYear ? filteredData.find(d => d.year === previousYear) : null;
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
                                {dollarChange === null && previousData === null && (
                                  <div className="networth-table-no-data">
                                    No previous year
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
                ) : (
                  <div className="networth-table-container">
                    <h2 className="networth-table-title">📋 Year-over-Year Comparison</h2>
                    <div className="networth-empty-state">
                      <div className="empty-state-icon">📊</div>
                      <h3>Select 2 or More Years</h3>
                      <p>Year-over-year comparison requires at least 2 years of data to show changes and trends.</p>
                      <p>Currently selected: <strong>{filteredData.length} year{filteredData.length !== 1 ? 's' : ''}</strong></p>
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