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
import LastUpdateInfo from './LastUpdateInfo';
import { getAnnualData, getAccountData, getPaycheckData, getNetWorthSettings, setNetWorthSettings, getAssetLiabilityData } from '../utils/localStorage';
import { useDualCalculator } from '../hooks/useDualCalculator';
import { formatCurrency } from '../utils/calculationHelpers';
import '../styles/last-update-info.css';

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
  const [annualData, setAnnualData] = useState({});
  const [accountData, setAccountData] = useState({});
  const [paycheckData, setPaycheckData] = useState(null);
  const showSpouseCalculator = useDualCalculator(); // Use shared dual calculator hook
  const [assetLiabilityData, setAssetLiabilityData] = useState({});
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
  const [showScoreInfo, setShowScoreInfo] = useState({}); // State for showing score info panels
  const [isCompactTable, setIsCompactTable] = useState(false); // Toggle for compact table view
  const [showFloatingControls, setShowFloatingControls] = useState(false); // Show floating controls on scroll

  // Get current year for YTD indicators
  const currentYear = new Date().getFullYear();

  // Helper function to check if a year is current year (for YTD indicators)
  const isCurrentYear = (year) => year === currentYear;

  // Helper function to get YTD indicator JSX
  const getYTDIndicator = (year, className = '') => {
    if (!isCurrentYear(year)) return null;
    return (
      <span className={`networth-ytd-indicator ${className}`} title="Year-to-date data - some metrics may be incomplete">
        YTD
      </span>
    );
  };

  // Toggle score info visibility
  const toggleScoreInfo = (scoreType, year) => {
    const key = `${scoreType}_${year}`;
    setShowScoreInfo(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Handle scroll to show/hide floating controls
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const controlsElement = document.querySelector('.networth-controls-redesigned');
      
      if (controlsElement) {
        const controlsBottom = controlsElement.offsetTop + controlsElement.offsetHeight;
        // Show floating controls when user scrolls past the original controls
        setShowFloatingControls(scrollPosition > controlsBottom + 50);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Helper functions to determine benchmark performance levels
  const getMoneyGuyPerformance = (score) => {
    if (score === null || score === undefined) return { level: 'unknown', color: '#9ca3af', label: 'N/A' };
    if (score >= 2.0) return { level: 'excellent', color: '#059669', label: 'Prodigious Accumulator' };
    if (score >= 1.0) return { level: 'good', color: '#3b82f6', label: 'Average Accumulator' };
    return { level: 'needs-improvement', color: '#dc2626', label: 'Under Accumulator' };
  };

  const getWealthScorePerformance = (score) => {
    if (score === null || score === undefined) return { level: 'unknown', color: '#9ca3af', label: 'N/A' };
    if (score > 100) return { level: 'excellent', color: '#7c3aed', label: 'Great Big Beautiful Tomorrow' };
    if (score >= 51) return { level: 'very-good', color: '#059669', label: 'Army of Dollars Work Zone' };
    if (score >= 26) return { level: 'good', color: '#3b82f6', label: 'Critical Mass Approaching' };
    if (score >= 0) return { level: 'starting', color: '#f59e0b', label: 'Starting to Get Traction' };
    return { level: 'needs-improvement', color: '#dc2626', label: 'Below Expectations' };
  };

  const getContributionRatePerformance = (rate) => {
    if (rate === null || rate === undefined || rate <= 0) return { level: 'unknown', color: '#9ca3af', label: 'N/A' };
    if (rate >= 20) return { level: 'excellent', color: '#059669', label: 'Money Guy Recommended' };
    if (rate >= 15) return { level: 'good', color: '#3b82f6', label: 'Above Average' };
    if (rate >= 10) return { level: 'fair', color: '#f59e0b', label: 'Getting Started' };
    return { level: 'needs-improvement', color: '#dc2626', label: 'Below Recommended' };
  };

  const getArmyPowerPerformance = (score) => {
    if (score === null || score === undefined) return { level: 'unknown', emoji: '❓', label: 'N/A' };
    if (score >= 100) return { level: 'excellent', emoji: '🌟', label: 'Financial Independence Ready' };
    if (score >= 50) return { level: 'good', emoji: '👍', label: 'Strong Army Building' };
    if (score >= 25) return { level: 'fair', emoji: '⚠️', label: 'Growing Strength' };
    return { level: 'poor', emoji: '🚨', label: 'Army Needs Reinforcement' };
  };

  // Load data from localStorage
  useEffect(() => {
    const loadData = () => {
      const annual = getAnnualData();
      const accounts = getAccountData();
      const paycheck = getPaycheckData();
      const assetLiability = getAssetLiabilityData();
      const savedSettings = getNetWorthSettings();
      
      setAnnualData(annual);
      setAccountData(accounts);
      setPaycheckData(paycheck);
      setAssetLiabilityData(assetLiability);
      
      // Load saved settings
      setNetWorthMode(savedSettings.netWorthMode);
      setActiveTab(savedSettings.activeTab);
      setShowAllYearsInChart(savedSettings.showAllYearsInChart || false);
      setShowAllYearsInPortfolioChart(savedSettings.showAllYearsInPortfolioChart || false);
      setShowAllYearsInNetWorthBreakdownChart(savedSettings.showAllYearsInNetWorthBreakdownChart || false);
      setShowAllYearsInMoneyGuyChart(savedSettings.showAllYearsInMoneyGuyChart || false);
      setUseThreeYearIncomeAverage(savedSettings.useThreeYearIncomeAverage || false);
      setUseReverseChronological(savedSettings.useReverseChronological !== undefined ? savedSettings.useReverseChronological : false);
      setIsCompactTable(savedSettings.isCompactTable || false);
      
      const availableYears = Object.values(annual)
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
    const handleAnnualUpdate = () => {
      const annual = getAnnualData();
      setAnnualData(annual);
      const availableYears = Object.values(annual)
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

    const handleAccountUpdate = () => {
      setAccountData(getAccountData());
    };

    const handlePaycheckUpdate = () => {
      setPaycheckData(getPaycheckData());
    };

    const handleAssetLiabilityUpdate = () => {
      setAssetLiabilityData(getAssetLiabilityData());
    };

    // Listen for both new and old event names for backward compatibility
    window.addEventListener('annualDataUpdated', handleAnnualUpdate);
    window.addEventListener('accountDataUpdated', handleAccountUpdate);
    window.addEventListener('paycheckDataUpdated', handlePaycheckUpdate);
    window.addEventListener('assetLiabilityDataUpdated', handleAssetLiabilityUpdate);
    
    return () => {
      window.removeEventListener('annualDataUpdated', handleAnnualUpdate);
      window.removeEventListener('accountDataUpdated', handleAccountUpdate);
      window.removeEventListener('paycheckDataUpdated', handlePaycheckUpdate);
      window.removeEventListener('assetLiabilityDataUpdated', handleAssetLiabilityUpdate);
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
      useReverseChronological,
      isCompactTable
    };
    setNetWorthSettings(settings);
  }, [selectedYears, netWorthMode, activeTab, showAllYearsInChart, showAllYearsInPortfolioChart, showAllYearsInNetWorthBreakdownChart, showAllYearsInMoneyGuyChart, useThreeYearIncomeAverage, useReverseChronological, isCompactTable, isInitialized]);

  // Calculate house value based on mode using dynamic data from assetLiabilityData
  const calculateHouseValue = (year, historicalEntry) => {
    if (netWorthMode === 'market') {
      // Use online estimated value from historical data
      return historicalEntry.house || 0;
    } else {
      // Cost basis: Get purchase price and year from assetLiabilityData primary home
      const houseDetails = assetLiabilityData.houseDetails || [];
      const primaryHome = houseDetails.find(asset => asset.type === 'Primary Home');
      
      if (!primaryHome) {
        // Fallback if no primary home data is available
        return historicalEntry.house || 0;
      }
      
      // Extract purchase data from primary home
      const purchasePrice = parseFloat(primaryHome.originalPurchasePrice) || 0;
      const purchaseDate = primaryHome.purchaseDate;
      
      if (!purchaseDate || !purchasePrice) {
        // Fallback to market value if purchase data is incomplete
        return historicalEntry.house || 0;
      }
      
      // Parse purchase year from date string (YYYY-MM-DD format)
      const purchaseYear = parseInt(purchaseDate.split('-')[0]);
      
      if (year < purchaseYear) return 0;
      
      // Calculate cumulative home improvements from purchase year to current year
      let cumulativeImprovements = 0;
      for (let y = purchaseYear; y <= year; y++) {
        const yearData = annualData[y];
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
    const years = Object.values(annualData)
      .map(entry => entry.year)
      .filter(year => year && !isNaN(year) && year > 0)
      .sort();
    
    // Get the 3 years including and before target year
    const relevantYears = years.filter(year => year <= targetYear).slice(-3);
    
    if (relevantYears.length === 0) return 0;
    
    let totalIncome = 0;
    let validYears = 0;
    
    for (const year of relevantYears) {
      const yearData = Object.values(annualData).find(entry => entry.year === year);
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
    const years = Object.values(annualData)
      .map(entry => entry.year)
      .filter(year => year && !isNaN(year) && year > 0)
      .sort();
    
    for (const year of years) {
      if (year > targetYear) break;
      const yearData = Object.values(annualData).find(entry => entry.year === year);
      if (yearData && yearData.agi) {
        cumulative += yearData.agi;
      }
    }
    
    return cumulative;
  };

  // Process and calculate net worth data
  const processedData = useMemo(() => {
    const years = Object.values(annualData)
      .map(entry => entry.year)
      .filter(year => year && !isNaN(year) && year > 0)
      .sort();
    
    return years.map(year => {
      const historicalEntry = Object.values(annualData).find(entry => entry.year === year);
      const accountEntry = accountData[year];
      
      if (!historicalEntry) return null;
      
      // Calculate investment components
      const taxFree = historicalEntry.taxFree || 0;
      const taxDeferred = historicalEntry.taxDeferred || 0;
      const brokerage = historicalEntry.brokerage || 0;
      const espp = historicalEntry.espp || 0;
      const hsa = historicalEntry.hsa || 0;
      
      // Calculate accounts value (investments)
      const accounts = taxFree + taxDeferred + brokerage + espp + hsa;
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
      const totalAssets = accounts + houseValue + cash + otherAssets;
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
      
      // Calculate contribution rates from account data
      let yearAccountEntries = Object.values(accountData).filter(entry => entry.year === year);
      
      // Filter account entries based on dual calculator mode
      if (!showSpouseCalculator && paycheckData?.your?.name?.trim()) {
        const firstUserName = paycheckData.your.name.trim();
        yearAccountEntries = yearAccountEntries.filter(entry => {
          // Include entries for the primary user or Joint accounts
          if (entry.users) {
            return Object.keys(entry.users).some(owner => owner === firstUserName || owner === 'Joint');
          }
          // For entries without user data, include them (backward compatibility)
          return true;
        });
      }
      
      const totalContributions = yearAccountEntries.reduce((sum, entry) => sum + (entry.contributions || 0), 0);
      const totalEmployerMatch = yearAccountEntries.reduce((sum, entry) => sum + (entry.employerMatch || 0), 0);
      
      // Calculate contribution rates as percentage of AGI
      const contributionRateWithMatch = agi > 0 ? ((totalContributions + totalEmployerMatch) / agi) * 100 : 0;
      const contributionRateWithoutMatch = agi > 0 ? (totalContributions / agi) * 100 : 0;
      
      // Determine which rate to display based on AGI threshold
      const shouldShowWithMatch = agi < 200000;
      const displayedContributionRate = shouldShowWithMatch ? contributionRateWithMatch : contributionRateWithoutMatch;
      
      // Calculate Army Power Score (Liquid Assets / AGI as percentage)
      // Liquid assets = Net Worth - House Value (excludes property)
      const liquidAssets = netWorth - houseValue;
      const armyPowerScore = agi > 0 ? (liquidAssets / agi) * 100 : null;
      
      return {
        year,
        agi,
        netWorth,
        houseValue,
        hsa,
        cash,
        espp,
        retirement,
        accounts,
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
        displayedContributionRate,
        // Army Power Score
        liquidAssets,
        armyPowerScore
      };
    }).filter(Boolean);
  }, [annualData, accountData, paycheckData, netWorthMode, useThreeYearIncomeAverage, assetLiabilityData, showSpouseCalculator]);

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
    // Add YTD indicator to current year labels
    const labelsWithYTD = years.map(year => {
      return isCurrentYear(year) ? `${year} (YTD)` : year.toString();
    });
    const netWorthData = sortedData.map(d => d.netWorth);
    const accountsData = sortedData.map(d => d.accounts);
    const houseData = sortedData.map(d => d.houseValue);
    const cashData = sortedData.map(d => d.cash);
    const liabilityData = sortedData.map(d => d.totalLiabilities); // Show as positive values

    return {
      labels: labelsWithYTD,
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
          label: 'Accounts',
          data: accountsData,
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
    // Add YTD indicator to current year labels
    const labelsWithYTD = years.map(year => {
      return isCurrentYear(year) ? `${year} (YTD)` : year.toString();
    });
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
        const total = d.accounts;
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
      labels: labelsWithYTD,
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
    // Add YTD indicator to current year labels
    const labelsWithYTD = years.map(year => {
      return isCurrentYear(year) ? `${year} (YTD)` : year.toString();
    });
    const categories = ['Accounts', 'House Equity', 'Cash', 'Assets'];
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
        const totalAssets = d.accounts + houseEquity + d.cash + d.otherAssets;
        
        if (totalAssets <= 0) return 0;
        
        switch (categoryIndex) {
          case 0: return (d.accounts / totalAssets) * 100;
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
      labels: labelsWithYTD,
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
    // Add YTD indicator to current year labels
    const labelsWithYTD = years.map(year => {
      return isCurrentYear(year) ? `${year} (YTD)` : year.toString();
    });
    
    // Calculate Average Accumulator values for each year
    const averageAccumulatorData = sortedData.map(d => d.averageAccumulator || 0);
    
    // Calculate Prodigious Accumulator (2x Average Accumulator)
    const prodigiousAccumulatorData = sortedData.map(d => (d.averageAccumulator || 0) * 2);
    
    // Net Worth and Portfolio data
    const netWorthData = sortedData.map(d => d.netWorth);
    const accountsData = sortedData.map(d => d.accounts);

    return {
      labels: labelsWithYTD,
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
          label: 'Accounts',
          data: accountsData,
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
  const availableYears = Object.values(annualData)
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
  
  // Select years from a specific year onwards
  const selectYearsFrom = (fromYear) => {
    const yearsFromOnwards = availableYears.filter(year => year >= fromYear);
    setSelectedYears(yearsFromOnwards);
  };

  if (availableYears.length === 0) {
    return (
      <>
        <Navigation />
        <div className="app-container">
          <div className="header">
            <h1>📊 Net Worth Dashboard</h1>
            <p>Track your financial progress over time</p>
          </div>
          <div className="networth-empty-state">
            <div className="networth-empty-state-content">
              <div className="networth-empty-state-icon">💎</div>
              <h2>Welcome to Net Worth Dashboard!</h2>
              <p className="networth-empty-state-description">
                Your net worth dashboard provides comprehensive financial analysis and insights based on your historical data.
              </p>
              
              <div className="networth-empty-state-steps">
                <h3>How to Get Started:</h3>
                <div className="networth-step">
                  <div className="networth-step-number">1</div>
                  <div className="networth-step-content">
                    <strong>Add Annual Data</strong>
                    <p>Go to the Raw Data page and enter your financial data for one or more years</p>
                  </div>
                </div>
                
                <div className="networth-step">
                  <div className="networth-step-number">2</div>
                  <div className="networth-step-content">
                    <strong>Include Investment Accounts</strong>
                    <p>Add account data on the Accounts page for detailed investment analysis</p>
                  </div>
                </div>
                
                <div className="networth-step">
                  <div className="networth-step-number">3</div>
                  <div className="networth-step-content">
                    <strong>Explore Your Dashboard</strong>
                    <p>Return here to see charts, trends, Money Guy scores, and comprehensive analysis</p>
                  </div>
                </div>
              </div>
              
              <div className="networth-empty-state-features">
                <h3>What You'll See Here:</h3>
                <div className="networth-features-grid">
                  <div className="networth-feature">
                    <div className="networth-feature-icon">📈</div>
                    <div className="networth-feature-text">
                      <strong>Net Worth Trends</strong>
                      <p>Track your financial growth over time with interactive charts</p>
                    </div>
                  </div>
                  
                  <div className="networth-feature">
                    <div className="networth-feature-icon">🎯</div>
                    <div className="networth-feature-text">
                      <strong>Financial Health Analysis</strong>
                      <p>See your Financial Health metrics</p>
                    </div>
                  </div>
                  
                  <div className="networth-feature">
                    <div className="networth-feature-icon">💼</div>
                    <div className="networth-feature-text">
                      <strong>Portfolio Breakdown</strong>
                      <p>Analyze your asset allocation and investment mix</p>
                    </div>
                  </div>
                  
                  <div className="networth-feature">
                    <div className="networth-feature-icon">📊</div>
                    <div className="networth-feature-text">
                      <strong>Detailed Analytics</strong>
                      <p>Compare years, track goals, and get actionable insights</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="networth-empty-state-cta">
                <p><strong>Ready to start?</strong></p>
                <p>Head to the <a href="/raw-data" className="networth-historical-link">Raw Data page</a> to add your first year of data!</p>
              </div>
            </div>
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

        {/* Last Update Information */}
        <LastUpdateInfo showDetails={true} />

        {/* Floating Controls (shown when scrolling) */}
        {showFloatingControls && (
          <div className="networth-floating-controls">
            <div className="networth-floating-controls-content">
              {/* Essential Controls */}
              <div className="networth-floating-control-group">
                <span className="networth-floating-label">Value Mode:</span>
                <div className="networth-floating-buttons">
                  <button
                    className={`btn networth-floating-button ${netWorthMode === 'market' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setNetWorthMode('market')}
                    title="Use market value for house"
                  >
                    Market
                  </button>
                  <button
                    className={`btn networth-floating-button ${netWorthMode === 'costBasis' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setNetWorthMode('costBasis')}
                    title="Use cost basis for house"
                  >
                    Cost
                  </button>
                </div>
              </div>

              <div className="networth-floating-control-group">
                <span className="networth-floating-label">Chart Order:</span>
                <div className="networth-floating-buttons">
                  <button
                    className={`btn networth-floating-button ${!useReverseChronological ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setUseReverseChronological(false)}
                    title="Show oldest data first"
                  >
                    Old→New
                  </button>
                  <button
                    className={`btn networth-floating-button ${useReverseChronological ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setUseReverseChronological(true)}
                    title="Show newest data first"
                  >
                    New→Old
                  </button>
                </div>
              </div>

              {/* Year Selection */}
              <div className="networth-floating-control-group">
                <span className="networth-floating-label">Years:</span>
                <div className="networth-floating-year-controls">
                  <button 
                    className="btn btn-secondary networth-floating-year-btn" 
                    onClick={selectAllYears}
                    title="Select all years"
                  >
                    All
                  </button>
                  <button 
                    className="btn btn-secondary networth-floating-year-btn" 
                    onClick={selectNoneYears}
                    title="Clear selection"
                  >
                    None
                  </button>
                  <div className="networth-floating-year-checkboxes">
                    {availableYears.map(year => (
                      <label key={year} className={`networth-floating-year-checkbox ${selectedYears.includes(year) ? 'selected' : ''}`} title={`Toggle ${year}`}>
                        <input
                          type="checkbox"
                          checked={selectedYears.includes(year)}
                          onChange={() => toggleYear(year)}
                        />
                        {year}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Income Average Toggle */}
              <div className="networth-floating-control-group">
                <label className="networth-floating-toggle" title="Use 3-year income average for Money Guy Score">
                  <input
                    type="checkbox"
                    checked={useThreeYearIncomeAverage}
                    onChange={(e) => setUseThreeYearIncomeAverage(e.target.checked)}
                  />
                  <span className="networth-floating-toggle-label">3-Year Avg</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Controls Section */}
        <div className="networth-controls-redesigned">
          {/* Configuration Controls */}
          <div className="networth-control-panel">
            <h3 className="networth-control-panel-title">Dashboard Settings</h3>
            
            <div className="networth-control-items">
              {/* Home Calculation Mode */}
              <div className="networth-control-item">
                <div className="networth-control-header">
                  <span className="networth-control-label">Home Value Calculation</span>
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
                    : 'Uses purchase price + home improvements'}
                </div>
              </div>

              {/* Chart Order */}
              <div className="networth-control-item">
                <div className="networth-control-header">
                  <span className="networth-control-label">Chart Order</span>
                  <div className="networth-mode-buttons">
                    <button
                      className={`btn networth-mode-button ${!useReverseChronological ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setUseReverseChronological(false)}
                    >
                      Oldest First
                    </button>
                    <button
                      className={`btn networth-mode-button ${useReverseChronological ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setUseReverseChronological(true)}
                    >
                      Newest First
                    </button>
                  </div>
                </div>
                <div className="networth-control-description">
                  {useReverseChronological 
                    ? 'Show newest data first in charts and scores (reverse chronological)' 
                    : 'Show oldest data first in charts and scores (chronological)'}
                </div>
              </div>

              {/* Income Calculation */}
              <div className="networth-control-item">
                <div className="networth-control-header">
                  <span className="networth-control-label">Money Guy Score Calculation</span>
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
                <div className="networth-control-description">
                  {useThreeYearIncomeAverage 
                    ? 'Uses 3-year rolling average income for more stable calculations' 
                    : 'Uses current year income only. You may want to check this if you have had a significant income change recently.'}
                </div>
              </div>
            </div>
          </div>

          {/* Year Selection Panel */}
          <div className="networth-control-panel">
            <h3 className="networth-control-panel-title">Year Selection</h3>
            
            <div className="networth-year-controls">
              <div className="networth-year-actions">
                <span className="networth-control-label">Quick Actions:</span>
                <button className="btn btn-secondary networth-year-action-btn" onClick={selectAllYears}>
                  Select All
                </button>
                <button className="btn btn-secondary networth-year-action-btn" onClick={selectNoneYears}>
                  Clear All
                </button>
                <select 
                  className="networth-year-from-select"
                  onChange={(e) => {
                    const fromYear = parseInt(e.target.value);
                    if (!isNaN(fromYear)) {
                      selectYearsFrom(fromYear);
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>From year onwards...</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>
                      {year} onwards
                    </option>
                  ))}
                </select>
              </div>

              <div className="networth-year-selection">
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
                  {selectedYears.length} of {availableYears.length} years selected
                </div>
              </div>
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
                  { id: 'comparison', label: '⚖️ Financial Health Metrics', icon: '⚖️' },
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
                    {!showSpouseCalculator && (
                      <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '16px', fontStyle: 'italic' }}>
                        📊 Dual calculator mode disabled - showing primary user data only
                      </div>
                    )}
                    <div className="networth-summary-grid">
                      {(() => {
                        const latest = filteredData[filteredData.length - 1];
                        const earliest = filteredData[0];
                        const totalGrowth = latest.netWorth - earliest.netWorth;
                        const percentGrowth = earliest.netWorth !== 0 ? ((totalGrowth / Math.abs(earliest.netWorth)) * 100) : 0;
                        
                        return [
                          { label: 'Latest Net Worth', value: formatCurrency(latest.netWorth), year: latest.year },
                          { label: 'Total Growth', value: formatCurrency(totalGrowth), change: `${percentGrowth >= 0 ? '+' : ''}${percentGrowth.toFixed(1)}%` },
                          { label: 'Latest Accounts', value: formatCurrency(latest.accounts), year: latest.year },
                          { label: 'Latest House Value', value: formatCurrency(latest.houseValue), year: latest.year },
                          { label: 'Latest Liabilities', value: formatCurrency(latest.totalLiabilities), year: latest.year }
                        ].map((stat, idx) => (
                          <div key={idx} className="networth-summary-card">
                            <div className="networth-summary-label">
                              {stat.label} {stat.year && `(${stat.year})`}
                              {stat.year && getYTDIndicator(stat.year, 'summary')}
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
                      ⚖️ Average vs Prodigious Accumulator
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
                    <div className="networth-scores-header">
                      <h2 className="networth-scores-title">🎯 Financial Scores by Year</h2>
                    </div>
                    <div className="networth-scores-grid">
                      {(useReverseChronological ? 
                        [...filteredData].sort((a, b) => b.year - a.year) :
                        [...filteredData].sort((a, b) => a.year - b.year)
                      ).map(data => (
                        <div key={data.year} className="networth-score-card">
                          <h3 className="networth-score-year">
                            {data.year}
                            {getYTDIndicator(data.year, 'score-year')}
                          </h3>
                          
                          {/* Money Guy Score */}
                          <div className="networth-score-item money-guy">
                            <div className="networth-score-label money-guy">
                              Money Guy Score
                              <span 
                                className="networth-score-info-icon"
                                onClick={() => toggleScoreInfo('moneyGuy', data.year)}
                              >
                                ℹ️
                              </span>
                            </div>
                            <div className="networth-score-value money-guy">
                              {data.moneyGuyScore !== null ? data.moneyGuyScore.toFixed(2) : 'N/A'}
                              {data.moneyGuyScore !== null && (
                                <div className={`networth-score-indicator ${getMoneyGuyPerformance(data.moneyGuyScore).level}`}>
                                  {getMoneyGuyPerformance(data.moneyGuyScore).emoji} {getMoneyGuyPerformance(data.moneyGuyScore).label}
                                </div>
                              )}
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
                            {showScoreInfo[`moneyGuy_${data.year}`] && (
                              <div className="networth-score-info-panel">
                                <div className="networth-score-info-title">What is Money Guy Score?</div>
                                <p>Measures your wealth accumulation progress compared to expected wealth for someone your age and income.</p>
                                <div className="networth-score-info-formula">
                                  <strong>Formula:</strong> Net Worth ÷ (Age × Annual Income ÷ 10)
                                </div>
                                <div className="networth-score-info-benchmarks">
                                  <strong>Benchmarks:</strong>
                                  <ul>
                                    <li>1.0 = Average Accumulator</li>
                                    <li>2.0+ = Prodigious Accumulator</li>
                                    <li>0.0-1.0 = Under Accumulator</li>
                                  </ul>
                                </div>
                                <div className="networth-score-info-source">
                                  <em>Based on "The Millionaire Next Door" methodology</em>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Wealth Score */}
                          <div className="networth-score-item wealth">
                            <div className="networth-score-label wealth">
                              Wealth Score
                              <span 
                                className="networth-score-info-icon"
                                onClick={() => toggleScoreInfo('wealth', data.year)}
                              >
                                ℹ️
                              </span>
                            </div>
                            <div className="networth-score-value wealth">
                              {data.wealthScore !== null ? `${data.wealthScore.toFixed(1)}%` : 'N/A'}
                              {data.wealthScore !== null && (
                                <div className={`networth-score-indicator ${getWealthScorePerformance(data.wealthScore).level}`}>
                                  {getWealthScorePerformance(data.wealthScore).emoji} {getWealthScorePerformance(data.wealthScore).label}
                                </div>
                              )}
                            </div>
                            <div className="networth-score-details wealth">
                              Net Worth ÷ Cumulative Earnings
                            </div>
                            {showScoreInfo[`wealth_${data.year}`] && (
                              <div className="networth-score-info-panel">
                                <div className="networth-score-info-title">What is Wealth Score?</div>
                                <p>Shows what percentage of your total lifetime earnings you've accumulated as net worth.</p>
                                <div className="networth-score-info-formula">
                                  <strong>Formula:</strong> Net Worth ÷ Cumulative Lifetime Earnings × 100
                                </div>
                                <div className="networth-score-info-benchmarks">
                                  <strong>Benchmarks:</strong>
                                  <ul>
                                    <li>0-25% = Brand New to Wealth Building</li>
                                    <li>26%-50% = Net Worth Starts Growing</li>
                                    <li>51%-100% = Our dollars are working as hard as us</li>
                                    <li>&gt;100% = More Net Worth then we earned</li>
                                  </ul>
                                </div>
                                <div className="networth-score-info-source">
                                  <em>Measures wealth retention and spending discipline over your career</em>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Contribution Rate Score */}
                          <div className="networth-score-item contribution">
                            <div className="networth-score-label contribution">
                              Contribution Rate
                              <span 
                                className="networth-score-info-icon"
                                onClick={() => toggleScoreInfo('contribution', data.year)}
                              >
                                ℹ️
                              </span>
                            </div>
                            <div className="networth-score-value contribution">
                              {data.displayedContributionRate > 0 ? `${data.displayedContributionRate.toFixed(1)}%` : 'N/A'}
                              {data.displayedContributionRate > 0 && (
                                <div className={`networth-score-indicator ${getContributionRatePerformance(data.displayedContributionRate).level}`}>
                                  {getContributionRatePerformance(data.displayedContributionRate).emoji} {getContributionRatePerformance(data.displayedContributionRate).label}
                                </div>
                              )}
                            </div>
                            <div className="networth-score-details contribution">
                              {data.shouldShowWithMatch ? 
                                `Employee: ${formatCurrency(data.totalContributions)} + Employer: ${formatCurrency(data.totalEmployerMatch)}` :
                                `Employee: ${formatCurrency(data.totalContributions)} (match not included)`
                              }
                            </div>
                            {showScoreInfo[`contribution_${data.year}`] && (
                              <div className="networth-score-info-panel">
                                <div className="networth-score-info-title">What is Contribution Rate?</div>
                                <p>Shows your retirement savings as a percentage of AGI (Adjusted Gross Income).</p>
                                <div className="networth-score-info-formula">
                                  <strong>Formula:</strong> Total Retirement Contributions ÷ AGI × 100
                                </div>
                                <div className="networth-score-info-logic">
                                  <strong>AGI-Based Logic:</strong>
                                  <ul>
                                    <li>AGI &lt; $200k: Includes employer match (total benefit)</li>
                                    <li>AGI ≥ $200k: Employee contributions only (high earners typically max match)</li>
                                  </ul>
                                </div>
                                <div className="networth-score-info-benchmarks">
                                  <strong>Benchmarks:</strong>
                                  <ul>
                                    <li>The Money Guy Show Recommends 20-25%</li>
                                  </ul>
                                </div>
                                <div className="networth-score-info-source">
                                  <em>Data sourced from Account Tracker contributions</em>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Army Power Score */}
                          <div className="networth-score-item army-power">
                            <div className="networth-score-label army-power">
                              How Powerful is your Army
                              <span 
                                className="networth-score-info-icon"
                                onClick={() => toggleScoreInfo('army', data.year)}
                              >
                                ℹ️
                              </span>
                            </div>
                            <div className="networth-score-value army-power">
                              {data.armyPowerScore !== null ? `${data.armyPowerScore.toFixed(1)}%` : 'N/A'}
                              {data.armyPowerScore !== null && (
                                <div className={`networth-score-indicator ${getArmyPowerPerformance(data.armyPowerScore).level}`}>
                                  {getArmyPowerPerformance(data.armyPowerScore).emoji} {getArmyPowerPerformance(data.armyPowerScore).label}
                                </div>
                              )}
                            </div>
                            <div className="networth-score-details army-power">
                              Liquid Assets: {formatCurrency(data.liquidAssets)} ÷ AGI: {formatCurrency(data.agi)}
                            </div>
                            {showScoreInfo[`army_${data.year}`] && (
                              <div className="networth-score-info-panel">
                                <div className="networth-score-info-title">How Powerful is your Army?</div>
                                <p>Measures your liquid financial assets (excluding property) as a percentage of your annual income.</p>
                                <div className="networth-score-info-formula">
                                  <strong>Formula:</strong> (Net Worth - House Value) ÷ AGI × 100
                                </div>
                                <div className="networth-score-info-logic">
                                  <strong>What it measures:</strong>
                                  <ul>
                                    <li>Your financial flexibility and liquidity</li>
                                    <li>How many years of income you have in liquid assets</li>
                                    <li>Your readiness for financial emergencies or opportunities</li>
                                  </ul>
                                </div>
                                <div className="networth-score-info-benchmarks">
                                  <strong>Benchmarks:</strong>
                                  <ul>
                                    <li>100%+ = Financial Independence Ready</li>
                                    <li>50-99% = Strong Army Building</li>
                                    <li>25-49% = Growing Strength</li>
                                    <li>&lt;25% = Army Needs Reinforcement</li>
                                  </ul>
                                </div>
                                <div className="networth-score-info-source">
                                  <em>Excludes real estate to focus on liquid financial strength</em>
                                </div>
                              </div>
                            )}
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
                    <div className="networth-chart-header">
                      <h2 className="networth-table-title">📋 Year-over-Year Comparison</h2>
                      <div className="networth-chart-controls">
                        <label className="networth-chart-toggle">
                          <input
                            type="checkbox"
                            checked={isCompactTable}
                            onChange={(e) => setIsCompactTable(e.target.checked)}
                          />
                          <span className="networth-chart-toggle-label">
                            Compact View
                          </span>
                        </label>
                      </div>
                    </div>
                    <div className="networth-table-wrapper">
                      <div className="networth-table-scroll">
                        <table className={`networth-table ${isCompactTable ? 'compact-mode' : ''}`}>
                          <thead>
                            <tr>
                              <th className="sticky">
                                Metric
                              </th>
                              {[...filteredData].reverse().map(data => (
                                <th key={data.year} className="year-header">
                                  {data.year}
                                  {getYTDIndicator(data.year, 'table-header')}
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
                        { key: 'portfolio', label: 'Total Portfolio', format: 'currency' }
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
                              <td key={data.year} className={isCompactTable ? 'compact' : ''}>
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
                                {!isCompactTable && dollarChange !== null && (
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
                                {!isCompactTable && dollarChange === null && previousData === null && (
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