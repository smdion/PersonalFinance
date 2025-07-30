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
import { getPerformanceData, getPerformanceSettings, setPerformanceSettings, getPaycheckData, setPaycheckData } from '../utils/localStorage';
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

const Performance = () => {
  const [performanceData, setPerformanceDataState] = useState({});
  const [paycheckData, setPaycheckDataState] = useState(null);
  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'returns', 'details'
  const [showAllYearsInChart, setShowAllYearsInChart] = useState(false);
  const [useReverseChronological, setUseReverseChronological] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showFloatingControls, setShowFloatingControls] = useState(false);
  const [isCompactTable, setIsCompactTable] = useState(false);
  const [yoySort, setYoySort] = useState('year');
  const [includeContributionsInReturns, setIncludeContributionsInReturns] = useState(false);
  
  // Details tab filtering and sorting
  const [detailsSort, setDetailsSort] = useState('year');
  const [detailsSortOrder, setDetailsSortOrder] = useState('desc');
  const [hideInactiveAccounts, setHideInactiveAccounts] = useState(true);
  const [hideNoDataAccounts, setHideNoDataAccounts] = useState(false);
  const [showDetailsFilters, setShowDetailsFilters] = useState(false);
  const [detailsCurrentPage, setDetailsCurrentPage] = useState(1);
  const [detailsItemsPerPage, setDetailsItemsPerPage] = useState(10);
  
  // Advanced filters
  const [filterAccountType, setFilterAccountType] = useState('all');
  const [filterOwner, setFilterOwner] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterBalanceRange, setFilterBalanceRange] = useState({ min: '', max: '' });
  const [filterReturnPerformance, setFilterReturnPerformance] = useState('all'); // 'all', 'positive', 'negative', 'breakeven'

  // Get current year for YTD indicators
  const currentYear = new Date().getFullYear();

  // Helper function to check if a year is current year (for YTD indicators)
  const isCurrentYear = (year) => year === currentYear;

  // Helper function to get YTD indicator JSX
  const getYTDIndicator = (year, className = '') => {
    if (!isCurrentYear(year)) return null;
    return (
      <span className={`performance-ytd-indicator ${className}`} title="Year-to-date data - some metrics may be incomplete">
        YTD
      </span>
    );
  };

  // Helper function to safely format percentage
  const formatPercentage = (value, hasData = true) => {
    if (!hasData || value === null || value === undefined || isNaN(value) || !isFinite(value)) {
      return 'No Data';
    }
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Handle scroll to show/hide floating controls
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const controlsElement = document.querySelector('.performance-controls');
      
      if (controlsElement) {
        const controlsBottom = controlsElement.offsetTop + controlsElement.offsetHeight;
        setShowFloatingControls(scrollPosition > controlsBottom + 50);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load data and settings
  useEffect(() => {
    const loadData = () => {
      const performance = getPerformanceData();
      const paycheck = getPaycheckData();
      const savedSettings = getPerformanceSettings();
      
      setPerformanceDataState(performance);
      setPaycheckDataState(paycheck);
      
      // Load saved settings
      setActiveTab(savedSettings.activeTab);
      setShowAllYearsInChart(savedSettings.showAllYearsInChart || false);
      setUseReverseChronological(savedSettings.useReverseChronological !== undefined ? savedSettings.useReverseChronological : false);
      setIsCompactTable(savedSettings.isCompactTable || false);
      setYoySort(savedSettings.yoySort || 'year');
      setIncludeContributionsInReturns(savedSettings.includeContributionsInReturns || false);
      
      // Details tab settings
      setDetailsSort(savedSettings.detailsSort || 'year');
      setDetailsSortOrder(savedSettings.detailsSortOrder || 'desc');
      setHideInactiveAccounts(savedSettings.hideInactiveAccounts !== undefined ? savedSettings.hideInactiveAccounts : true);
      setHideNoDataAccounts(savedSettings.hideNoDataAccounts || false);
      setShowDetailsFilters(savedSettings.showDetailsFilters || false);
      setDetailsItemsPerPage(savedSettings.detailsItemsPerPage || 10);
      
      // Advanced filter settings
      setFilterAccountType(savedSettings.filterAccountType || 'all');
      setFilterOwner(savedSettings.filterOwner || 'all');
      setFilterYear(savedSettings.filterYear || 'all');
      setFilterBalanceRange(savedSettings.filterBalanceRange || { min: '', max: '' });
      setFilterReturnPerformance(savedSettings.filterReturnPerformance || 'all');
      
      // Get available years and accounts
      const availableYears = getAvailableYears(performance);
      const availableAccounts = getAvailableAccounts(performance);
      
      // Use saved selected years if valid, otherwise auto-select all
      if (savedSettings.selectedYears.length > 0) {
        const validSavedYears = savedSettings.selectedYears.filter(year => availableYears.includes(year));
        setSelectedYears(validSavedYears.length > 0 ? validSavedYears : availableYears);
      } else {
        setSelectedYears(availableYears);
      }

      // Use saved selected accounts if valid, otherwise auto-select all
      if (savedSettings.selectedAccounts.length > 0) {
        const validSavedAccounts = savedSettings.selectedAccounts.filter(account => 
          availableAccounts.some(acc => acc.id === account)
        );
        setSelectedAccounts(validSavedAccounts.length > 0 ? validSavedAccounts : availableAccounts.map(acc => acc.id));
      } else {
        setSelectedAccounts(availableAccounts.map(acc => acc.id));
      }
      
      // Mark initialization as complete
      setTimeout(() => {
        setIsInitialized(true);
      }, 100);
    };

    loadData();

    // Listen for data updates
    const handlePerformanceUpdate = () => {
      const performance = getPerformanceData();
      setPerformanceDataState(performance);
      
      // Update available options
      const availableYears = getAvailableYears(performance);
      const availableAccounts = getAvailableAccounts(performance);
      
      // Preserve existing selections if they're still valid
      setSelectedYears(currentSelectedYears => {
        const validCurrentYears = currentSelectedYears.filter(year => availableYears.includes(year));
        return validCurrentYears.length > 0 ? validCurrentYears : availableYears;
      });

      setSelectedAccounts(currentSelectedAccounts => {
        const validCurrentAccounts = currentSelectedAccounts.filter(account => 
          availableAccounts.some(acc => acc.id === account)
        );
        return validCurrentAccounts.length > 0 ? validCurrentAccounts : availableAccounts.map(acc => acc.id);
      });
    };

    // Listen for paycheck data updates to sync dual calculator state
    const handlePaycheckUpdate = () => {
      const paycheck = getPaycheckData();
      setPaycheckDataState(paycheck);
    };

    window.addEventListener('performanceDataUpdated', handlePerformanceUpdate);
    window.addEventListener('paycheckDataUpdated', handlePaycheckUpdate);
    
    return () => {
      window.removeEventListener('performanceDataUpdated', handlePerformanceUpdate);
      window.removeEventListener('paycheckDataUpdated', handlePaycheckUpdate);
    };
  }, []);

  // Save settings when they change
  useEffect(() => {
    if (!isInitialized) return;
    
    const settings = {
      selectedYears,
      selectedAccounts,
      activeTab,
      showAllYearsInChart,
      useReverseChronological,
      isCompactTable,
      yoySort,
      includeContributionsInReturns,
      
      // Details tab settings
      detailsSort,
      detailsSortOrder,
      hideInactiveAccounts,
      hideNoDataAccounts,
      showDetailsFilters,
      detailsItemsPerPage,
      
      // Advanced filter settings
      filterAccountType,
      filterOwner,
      filterYear,
      filterBalanceRange,
      filterReturnPerformance
    };
    setPerformanceSettings(settings);
  }, [selectedYears, selectedAccounts, activeTab, showAllYearsInChart, useReverseChronological, isCompactTable, yoySort, includeContributionsInReturns, detailsSort, detailsSortOrder, hideInactiveAccounts, hideNoDataAccounts, showDetailsFilters, detailsItemsPerPage, filterAccountType, filterOwner, filterYear, filterBalanceRange, filterReturnPerformance, isInitialized]);

  // Helper functions to get available years and accounts
  const getAvailableYears = (data) => {
    return Object.values(data)
      .map(entry => entry.year)
      .filter(year => year && !isNaN(year) && year > 0)
      .filter((year, index, arr) => arr.indexOf(year) === index) // Remove duplicates
      .sort();
  };

  const getAvailableAccounts = (data) => {
    const accountsMap = new Map();
    const currentYear = new Date().getFullYear();
    
    // Find the most recent year in the data
    const mostRecentYear = Math.max(...Object.values(data).map(entry => entry.year).filter(year => year && !isNaN(year)));
    
    // Collect all unique accounts across ALL years
    Object.values(data).forEach(entry => {
      if (entry.users && typeof entry.users === 'object') {
        Object.entries(entry.users).forEach(([owner, userData]) => {
          if (userData.accountName && userData.accountType) {
            const accountId = `${userData.accountName}-${owner}`;
            if (!accountsMap.has(accountId)) {
              accountsMap.set(accountId, {
                id: accountId,
                accountName: userData.accountName,
                owner: owner,
                accountType: userData.accountType,
                investmentCompany: userData.investmentCompany || '',
                // Track which years this account appears in
                yearsAvailable: [],
                isActive: false
              });
            }
            // Add this year to the account's available years
            if (!accountsMap.get(accountId).yearsAvailable.includes(entry.year)) {
              accountsMap.get(accountId).yearsAvailable.push(entry.year);
            }
            // Mark as active if it exists in the most recent year
            if (entry.year === mostRecentYear) {
              accountsMap.get(accountId).isActive = true;
            }
          }
        });
      }
    });
    
    // Sort years for each account and determine last active year
    accountsMap.forEach(account => {
      account.yearsAvailable.sort((a, b) => a - b);
      account.lastActiveYear = Math.max(...account.yearsAvailable);
    });
    
    return Array.from(accountsMap.values()).sort((a, b) => {
      // Sort by active status first (active accounts first), then by name
      if (a.isActive !== b.isActive) {
        return b.isActive - a.isActive; // true (1) comes before false (0)
      }
      return a.accountName.localeCompare(b.accountName) || a.owner.localeCompare(b.owner);
    });
  };

  const availableYears = getAvailableYears(performanceData);
  const availableAccounts = getAvailableAccounts(performanceData);

  // Process performance data with calculations
  const processedData = useMemo(() => {
    const results = [];
    
    // For each selected account, generate entries for all available years
    selectedAccounts.forEach(accountId => {
      const account = availableAccounts.find(acc => acc.id === accountId);
      if (!account) return;
      
      availableYears.forEach(year => {
        // Try to find actual data for this account and year
        let userData = null;
        let parentEntry = null;
        const yearEntries = Object.values(performanceData).filter(entry => entry.year === year);
        
        for (const entry of yearEntries) {
          if (entry.users && entry.users[account.owner]) {
            const ownerData = entry.users[account.owner];
            if (ownerData.accountName === account.accountName && ownerData.accountType === account.accountType) {
              userData = ownerData;
              parentEntry = entry;
              break;
            }
          }
        }
        
        // If no data exists for this year, create empty entry
        if (!userData) {
          results.push({
            year,
            accountId,
            accountName: account.accountName,
            owner: account.owner,
            accountType: account.accountType,
            investmentCompany: account.investmentCompany,
            balance: null,
            contributions: null,
            employerMatch: null,
            gains: null,
            fees: null,
            withdrawals: null,
            totalReturns: null,
            netContributions: null,
            beginningBalance: null,
            returnPercentage: 0,
            hasData: false,
            isActive: account.isActive,
            lastActiveYear: account.lastActiveYear
          });
        } else {
          // Process actual data using both user-level and entry-level data
          // Use user-level balance if available, otherwise fall back to entry-level
          const balance = parseFloat(userData.balance) || parseFloat(parentEntry?.balance) || 0;
          
          // For financial data, prefer user-level data if it's not empty, otherwise use entry-level
          const getUserOrEntryValue = (userValue, entryValue) => {
            const userNum = parseFloat(userValue);
            const entryNum = parseFloat(entryValue);
            
            // If user value exists and is a valid number, use it
            if (!isNaN(userNum) && userValue !== '' && userValue != null) {
              return userNum;
            }
            // Otherwise use entry value
            return isNaN(entryNum) ? 0 : entryNum;
          };
          
          const contributions = getUserOrEntryValue(userData.contributions, parentEntry?.contributions);
          const employerMatch = getUserOrEntryValue(userData.employerMatch, parentEntry?.employerMatch);
          const gains = getUserOrEntryValue(userData.gains, parentEntry?.gains);
          const fees = getUserOrEntryValue(userData.fees, parentEntry?.fees);
          const withdrawals = getUserOrEntryValue(userData.withdrawals, parentEntry?.withdrawals);
          
          // Calculate total returns (gains - fees)
          const totalReturns = gains - fees;
          
          // Calculate net contributions (contributions + employer match - withdrawals)
          const netContributions = contributions + employerMatch - withdrawals;
          
          // Calculate beginning balance (balance - gains + fees - netContributions)
          const beginningBalance = balance - gains + fees - netContributions;
          
          // Calculate return percentage - affected by includeContributionsInReturns setting
          let returnPercentage = 0;
          if (beginningBalance > 0) {
            if (includeContributionsInReturns) {
              // Include contributions in return calculation (total growth %)
              const totalGrowth = totalReturns + netContributions;
              returnPercentage = (totalGrowth / beginningBalance) * 100;
            } else {
              // Traditional return calculation (investment returns only)
              returnPercentage = (totalReturns / beginningBalance) * 100;
            }
          } else if (beginningBalance === 0 && totalReturns !== 0) {
            returnPercentage = totalReturns > 0 ? 100 : -100;
          }
          
          // Ensure it's a valid number
          if (isNaN(returnPercentage) || !isFinite(returnPercentage)) {
            returnPercentage = 0;
          }
          
          results.push({
            year,
            accountId,
            accountName: userData.accountName,
            owner: account.owner,
            accountType: userData.accountType,
            investmentCompany: userData.investmentCompany || '',
            balance,
            contributions,
            employerMatch,
            gains,
            fees,
            withdrawals,
            totalReturns,
            netContributions,
            beginningBalance,
            returnPercentage,
            hasData: true,
            isActive: account.isActive,
            lastActiveYear: account.lastActiveYear
          });
        }
      });
    });
    
    return results;
  }, [performanceData, selectedAccounts, availableYears, availableAccounts, includeContributionsInReturns]);

  // Filter data for selected years
  const filteredData = useMemo(() => {
    return processedData.filter(data => selectedYears.includes(data.year));
  }, [processedData, selectedYears]);

  // Data for charts with "show all years" override support
  const chartFilteredData = useMemo(() => {
    return showAllYearsInChart ? processedData : filteredData;
  }, [processedData, filteredData, showAllYearsInChart]);

  // Get unique values for filter dropdowns
  const availableAccountTypes = useMemo(() => {
    const types = [...new Set(filteredData.map(item => item.accountType).filter(type => type))];
    return types.sort();
  }, [filteredData]);

  const availableOwners = useMemo(() => {
    const owners = [...new Set(filteredData.map(item => item.owner).filter(owner => owner))];
    return owners.sort();
  }, [filteredData]);

  // Filtered and sorted data for details tab
  const detailsFilteredData = useMemo(() => {
    let data = filteredData;
    
    // Filter out inactive accounts if hideInactiveAccounts is true
    if (hideInactiveAccounts) {
      data = data.filter(item => item.isActive);
    }
    
    // Filter out accounts with no data if hideNoDataAccounts is true
    if (hideNoDataAccounts) {
      data = data.filter(item => item.hasData);
    }
    
    // Advanced filters
    
    // Filter by account type
    if (filterAccountType !== 'all') {
      data = data.filter(item => item.accountType === filterAccountType);
    }
    
    // Filter by owner
    if (filterOwner !== 'all') {
      data = data.filter(item => item.owner === filterOwner);
    }
    
    // Filter by year
    if (filterYear !== 'all') {
      data = data.filter(item => item.year === parseInt(filterYear));
    }
    
    // Filter by balance range
    if (filterBalanceRange.min !== '' || filterBalanceRange.max !== '') {
      data = data.filter(item => {
        if (!item.hasData) return filterBalanceRange.min === '' && filterBalanceRange.max === '';
        const balance = item.balance || 0;
        const minBalance = filterBalanceRange.min !== '' ? parseFloat(filterBalanceRange.min) : -Infinity;
        const maxBalance = filterBalanceRange.max !== '' ? parseFloat(filterBalanceRange.max) : Infinity;
        return balance >= minBalance && balance <= maxBalance;
      });
    }
    
    // Filter by return performance
    if (filterReturnPerformance !== 'all') {
      data = data.filter(item => {
        if (!item.hasData) return false;
        const returnPercent = item.returnPercentage || 0;
        switch (filterReturnPerformance) {
          case 'positive':
            return returnPercent > 0;
          case 'negative':
            return returnPercent < 0;
          case 'breakeven':
            return Math.abs(returnPercent) < 0.01; // Within 0.01% of zero
          default:
            return true;
        }
      });
    }
    
    // Sort the data
    const sortedData = [...data].sort((a, b) => {
      let aVal, bVal;
      
      switch(detailsSort) {
        case 'accountName':
          aVal = a.accountName || '';
          bVal = b.accountName || '';
          break;
        case 'owner':
          aVal = a.owner || '';
          bVal = b.owner || '';
          break;
        case 'accountType':
          aVal = a.accountType || '';
          bVal = b.accountType || '';
          break;
        case 'balance':
          aVal = a.balance || 0;
          bVal = b.balance || 0;
          break;
        case 'totalReturns':
          aVal = a.totalReturns || 0;
          bVal = b.totalReturns || 0;
          break;
        case 'returnPercentage':
          aVal = a.returnPercentage || 0;
          bVal = b.returnPercentage || 0;
          break;
        case 'year':
        default:
          aVal = a.year || 0;
          bVal = b.year || 0;
          break;
      }
      
      // Handle string vs number comparison
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.localeCompare(bVal);
        return detailsSortOrder === 'asc' ? comparison : -comparison;
      } else {
        const comparison = aVal - bVal;
        return detailsSortOrder === 'asc' ? comparison : -comparison;
      }
    });
    
    return sortedData;
  }, [filteredData, hideInactiveAccounts, hideNoDataAccounts, filterAccountType, filterOwner, filterYear, filterBalanceRange, filterReturnPerformance, detailsSort, detailsSortOrder]);

  // Pagination for details tab
  const detailsTotalItems = detailsFilteredData.length;
  const detailsTotalPages = Math.ceil(detailsTotalItems / detailsItemsPerPage);
  const detailsStartIndex = (detailsCurrentPage - 1) * detailsItemsPerPage;
  const detailsEndIndex = detailsStartIndex + detailsItemsPerPage;
  const detailsPaginatedData = detailsFilteredData.slice(detailsStartIndex, detailsEndIndex);

  // Reset details page when filters change
  useEffect(() => {
    setDetailsCurrentPage(1);
  }, [hideInactiveAccounts, hideNoDataAccounts, detailsSort, detailsSortOrder, selectedYears, selectedAccounts, filterAccountType, filterOwner, filterYear, filterBalanceRange, filterReturnPerformance]);



  // Calculate year-over-year data for performance analysis
  const yearOverYearData = useMemo(() => {
    const yoyResults = [];
    const sortedYears = [...selectedYears].sort();
    
    selectedAccounts.forEach(accountId => {
      const accountData = [];
      
      sortedYears.forEach(year => {
        const yearData = filteredData.find(d => d.year === year && d.accountId === accountId);
        if (yearData) {
          accountData.push(yearData);
        }
      });
      
      // Calculate year-over-year changes
      for (let i = 1; i < accountData.length; i++) {
        const currentYear = accountData[i];
        const previousYear = accountData[i - 1];
        
        const balanceChange = currentYear.balance - previousYear.balance;
        const balanceChangePercent = previousYear.balance > 0 ? 
          ((balanceChange / previousYear.balance) * 100) : 0;
        
        const returnsChange = currentYear.totalReturns - previousYear.totalReturns;
        const returnsChangePercent = Math.abs(previousYear.totalReturns) > 0 ? 
          ((returnsChange / Math.abs(previousYear.totalReturns)) * 100) : 0;
        
        yoyResults.push({
          ...currentYear,
          previousYear: previousYear.year,
          balanceChange,
          balanceChangePercent,
          returnsChange,
          returnsChangePercent
        });
      }
    });
    
    return yoyResults;
  }, [filteredData, selectedYears, selectedAccounts]);

  // Sort year-over-year data based on current sort setting
  const sortedYoyData = useMemo(() => {
    const filteredYoyData = yearOverYearData.filter(data => 
      data.balanceChange !== 0 || data.returnsChange !== 0
    );
    
    const sortedData = [...filteredYoyData];
    
    switch(yoySort) {
      case 'balance-desc':
        sortedData.sort((a, b) => Math.abs(b.balanceChange) - Math.abs(a.balanceChange));
        break;
      case 'balance-asc':
        sortedData.sort((a, b) => Math.abs(a.balanceChange) - Math.abs(b.balanceChange));
        break;
      case 'returns-desc':
        sortedData.sort((a, b) => Math.abs(b.returnPercentage) - Math.abs(a.returnPercentage));
        break;
      case 'returns-asc':
        sortedData.sort((a, b) => Math.abs(a.returnPercentage) - Math.abs(b.returnPercentage));
        break;
      case 'account':
        sortedData.sort((a, b) => a.accountName.localeCompare(b.accountName) || a.owner.localeCompare(b.owner));
        break;
      case 'year':
      default:
        sortedData.sort((a, b) => useReverseChronological ? b.year - a.year : a.year - b.year);
        break;
    }
    
    return sortedData;
  }, [yearOverYearData, yoySort, useReverseChronological]);

  // Chart data for account performance over time
  const performanceChartData = useMemo(() => {
    const sortedData = useReverseChronological ? 
      [...chartFilteredData].sort((a, b) => b.year - a.year) :
      [...chartFilteredData].sort((a, b) => a.year - b.year);
    
    // Group by account for multiple lines
    const accountGroups = {};
    sortedData.forEach(data => {
      if (!accountGroups[data.accountId]) {
        accountGroups[data.accountId] = {
          label: `${data.accountName} (${data.owner})${!data.isActive ? ' [Inactive]' : ''}`,
          data: [],
          years: []
        };
      }
      // Only push actual data values, null for missing data
      accountGroups[data.accountId].data.push(data.hasData ? data.balance : null);
      accountGroups[data.accountId].years.push(data.year);
    });
    
    // Get all unique years for x-axis
    const allYears = [...new Set(sortedData.map(d => d.year))].sort((a, b) => 
      useReverseChronological ? b - a : a - b
    );
    
    const labelsWithYTD = allYears.map(year => {
      return isCurrentYear(year) ? `${year} (YTD)` : year.toString();
    });
    
    // Generate colors for each account
    const colors = [
      'rgb(59, 130, 246)', 'rgb(34, 197, 94)', 'rgb(168, 85, 247)', 
      'rgb(251, 146, 60)', 'rgb(239, 68, 68)', 'rgb(6, 182, 212)',
      'rgb(139, 92, 246)', 'rgb(245, 101, 101)', 'rgb(52, 211, 153)'
    ];
    
    const datasets = Object.values(accountGroups).map((group, index) => ({
      label: group.label,
      data: allYears.map(year => {
        const yearIndex = group.years.indexOf(year);
        const value = yearIndex >= 0 ? group.data[yearIndex] : null;
        // Only return actual numeric values, null for missing data
        return (value !== null && !isNaN(value)) ? value : null;
      }),
      borderColor: colors[index % colors.length],
      backgroundColor: colors[index % colors.length].replace('rgb', 'rgba').replace(')', ', 0.1)'),
      borderWidth: 2,
      tension: 0.1,
      fill: false,
      spanGaps: false // Don't connect lines across missing data points - show gaps for inactive periods
    }));
    
    return {
      labels: labelsWithYTD,
      datasets
    };
  }, [chartFilteredData, useReverseChronological]);

  // Returns chart data
  const returnsChartData = useMemo(() => {
    const sortedData = useReverseChronological ? 
      [...filteredData].sort((a, b) => b.year - a.year) :
      [...filteredData].sort((a, b) => a.year - b.year);
    
    const allYears = [...new Set(sortedData.map(d => d.year))].sort((a, b) => 
      useReverseChronological ? b - a : a - b
    );
    
    const labelsWithYTD = allYears.map(year => {
      return isCurrentYear(year) ? `${year} (YTD)` : year.toString();
    });
    
    // Aggregate returns by year (only include accounts with actual data)
    const yearlyReturns = allYears.map(year => {
      const yearData = sortedData.filter(d => d.year === year && d.hasData);
      if (includeContributionsInReturns) {
        // Include contributions in returns calculation (total growth)
        return yearData.reduce((sum, d) => sum + (d.totalReturns || 0) + (d.netContributions || 0), 0);
      } else {
        // Traditional returns calculation (gains - fees only)
        return yearData.reduce((sum, d) => sum + (d.totalReturns || 0), 0);
      }
    });
    
    const yearlyReturnPercents = allYears.map(year => {
      const yearData = sortedData.filter(d => d.year === year && d.hasData);
      const totalBeginning = yearData.reduce((sum, d) => sum + Math.max(0, d.beginningBalance || 0), 0);
      
      if (includeContributionsInReturns) {
        // Include contributions in percentage calculation
        const totalGrowth = yearData.reduce((sum, d) => sum + (d.totalReturns || 0) + (d.netContributions || 0), 0);
        return totalBeginning > 0 ? (totalGrowth / totalBeginning) * 100 : 0;
      } else {
        // Traditional percentage calculation
        const totalReturns = yearData.reduce((sum, d) => sum + (d.totalReturns || 0), 0);
        return totalBeginning > 0 ? (totalReturns / totalBeginning) * 100 : 0;
      }
    });
    
    return {
      labels: labelsWithYTD,
      datasets: [
        {
          label: includeContributionsInReturns ? 'Total Growth ($)' : 'Total Returns ($)',
          data: yearlyReturns,
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
          yAxisID: 'y'
        },
        {
          label: includeContributionsInReturns ? 'Growth %' : 'Return %',
          data: yearlyReturnPercents,
          type: 'line',
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          borderWidth: 2,
          tension: 0.1,
          yAxisID: 'y1'
        }
      ]
    };
  }, [filteredData, useReverseChronological, includeContributionsInReturns]);

  // Chart options
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
          font: { size: 12, weight: '500' },
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
        titleFont: { size: 13, weight: '600' },
        bodyFont: { size: 12 },
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
        grid: { color: 'rgba(148, 163, 184, 0.15)', drawBorder: false },
        border: { display: false },
        ticks: {
          callback: function(value) { return formatCurrency(value); },
          font: { size: 11 },
          color: '#64748b'
        }
      },
      x: {
        grid: { color: 'rgba(148, 163, 184, 0.15)', drawBorder: false },
        border: { display: false },
        ticks: {
          font: { size: 11, weight: '500' },
          color: '#475569'
        }
      }
    }
  };

  const returnsChartOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: {
          callback: function(value) { return value.toFixed(1) + '%'; },
          font: { size: 11 },
          color: '#64748b'
        }
      }
    }
  };

  // Year and account selection handlers
  const toggleYear = (year) => {
    if (selectedYears.includes(year)) {
      setSelectedYears(selectedYears.filter(y => y !== year));
    } else {
      setSelectedYears([...selectedYears, year].sort());
    }
  };

  const toggleAccount = (accountId) => {
    if (selectedAccounts.includes(accountId)) {
      setSelectedAccounts(selectedAccounts.filter(a => a !== accountId));
    } else {
      setSelectedAccounts([...selectedAccounts, accountId]);
    }
  };

  const selectAllYears = () => setSelectedYears(availableYears);
  const selectNoneYears = () => setSelectedYears([]);
  const selectAllAccounts = () => setSelectedAccounts(availableAccounts.map(acc => acc.id));
  const selectNoneAccounts = () => setSelectedAccounts([]);

  // Filter reset functions
  const resetAdvancedFilters = () => {
    setFilterAccountType('all');
    setFilterOwner('all');
    setFilterYear('all');
    setFilterBalanceRange({ min: '', max: '' });
    setFilterReturnPerformance('all');
  };

  const hasActiveAdvancedFilters = () => {
    return filterAccountType !== 'all' || 
           filterOwner !== 'all' || 
           filterYear !== 'all' ||
           filterBalanceRange.min !== '' || 
           filterBalanceRange.max !== '' ||
           filterReturnPerformance !== 'all';
  };

  if (availableYears.length === 0) {
    return (
      <>
        <Navigation />
        <div className="app-container">
          <div className="header">
            <h1>📈 Performance Dashboard</h1>
            <p>Analyze your investment account performance over time</p>
          </div>
          <div className="performance-empty-state">
            <div className="performance-empty-state-content">
              <div className="performance-empty-state-icon">💹</div>
              <h2>Welcome to Performance Dashboard!</h2>
              <p className="performance-empty-state-description">
                Your performance dashboard provides comprehensive analysis of your investment account returns, contributions, and growth over time.
              </p>
              
              <div className="performance-empty-state-steps">
                <h3>How to Get Started:</h3>
                <div className="performance-step">
                  <div className="performance-step-number">1</div>
                  <div className="performance-step-content">
                    <strong>Add Performance Data</strong>
                    <p>Go to the Portfolio page and enter your investment account performance for one or more years</p>
                  </div>
                </div>
                
                <div className="performance-step">
                  <div className="performance-step-number">2</div>
                  <div className="performance-step-content">
                    <strong>Track Key Metrics</strong>
                    <p>Include account balances, employee contributions, employer matches, gains, fees, and withdrawals</p>
                  </div>
                </div>
                
                <div className="performance-step">
                  <div className="performance-step-number">3</div>
                  <div className="performance-step-content">
                    <strong>Analyze Performance</strong>
                    <p>Return here to see detailed analysis of your investment returns, year-over-year changes, and account comparisons</p>
                  </div>
                </div>
              </div>
              
              <div className="performance-empty-state-features">
                <h3>What You'll See Here:</h3>
                <div className="performance-features-grid">
                  <div className="performance-feature">
                    <div className="performance-feature-icon">📊</div>
                    <div className="performance-feature-text">
                      <strong>Performance Trends</strong>
                      <p>Track account balance growth and investment returns over time</p>
                    </div>
                  </div>
                  
                  <div className="performance-feature">
                    <div className="performance-feature-icon">💰</div>
                    <div className="performance-feature-text">
                      <strong>Return Analysis</strong>
                      <p>Calculate year-over-year returns, dollar changes, and percentage gains</p>
                    </div>
                  </div>
                  
                  <div className="performance-feature">
                    <div className="performance-feature-icon">📈</div>
                    <div className="performance-feature-text">
                      <strong>Contribution Tracking</strong>
                      <p>Monitor your employee contributions, employer matches, and net cash flows</p>
                    </div>
                  </div>
                  
                  <div className="performance-feature">
                    <div className="performance-feature-icon">🔍</div>
                    <div className="performance-feature-text">
                      <strong>Detailed Analytics</strong>
                      <p>Compare accounts, analyze fees, and get actionable performance insights</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="performance-empty-state-cta">
                <p><strong>Ready to start?</strong></p>
                <p>Head to the <a href="/portfolio" className="performance-portfolio-link">Portfolio page</a> to add your first year of performance data!</p>
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
          <h1>📈 Performance Dashboard</h1>
          <p>Analyze your investment account performance over time</p>
        </div>

        {/* Floating Controls */}
        {showFloatingControls && (
          <div className="performance-floating-controls">
            <div className="performance-floating-controls-content">
              <div className="performance-floating-control-group">
                <span className="performance-floating-label">Chart Order:</span>
                <div className="performance-floating-buttons">
                  <button
                    className={`btn performance-floating-button ${!useReverseChronological ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setUseReverseChronological(false)}
                  >
                    Old→New
                  </button>
                  <button
                    className={`btn performance-floating-button ${useReverseChronological ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setUseReverseChronological(true)}
                  >
                    New→Old
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls Section */}
        <div className="performance-controls">
          <div className="performance-control-panel">
            <h3 className="performance-control-panel-title">Dashboard Settings</h3>
            
            <div className="performance-control-items">
              <div className="performance-control-item">
                <div className="performance-control-header">
                  <span className="performance-control-label">Chart Order</span>
                  <div className="performance-mode-buttons">
                    <button
                      className={`btn performance-mode-button ${!useReverseChronological ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setUseReverseChronological(false)}
                    >
                      Oldest First
                    </button>
                    <button
                      className={`btn performance-mode-button ${useReverseChronological ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setUseReverseChronological(true)}
                    >
                      Newest First
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Year Selection Panel */}
          <div className="performance-control-panel">
            <h3 className="performance-control-panel-title">Year Selection</h3>
            
            <div className="performance-year-controls">
              <div className="performance-year-actions">
                <span className="performance-control-label">Quick Actions:</span>
                <button className="btn btn-secondary performance-year-action-btn" onClick={selectAllYears}>
                  Select All
                </button>
                <button className="btn btn-secondary performance-year-action-btn" onClick={selectNoneYears}>
                  Clear All
                </button>
              </div>

              <div className="performance-year-selection">
                <div className="performance-year-checkboxes">
                  {availableYears.map(year => (
                    <label key={year} className={`performance-year-checkbox ${selectedYears.includes(year) ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={selectedYears.includes(year)}
                        onChange={() => toggleYear(year)}
                      />
                      {year}
                    </label>
                  ))}
                </div>
                <div className="performance-year-summary">
                  {selectedYears.length} of {availableYears.length} years selected
                </div>
              </div>
            </div>
          </div>

          {/* Account Selection Panel */}
          <div className="performance-control-panel">
            <h3 className="performance-control-panel-title">Account Selection</h3>
            
            <div className="performance-account-controls">
              <div className="performance-account-actions">
                <span className="performance-control-label">Quick Actions:</span>
                <button className="btn btn-secondary performance-account-action-btn" onClick={selectAllAccounts}>
                  Select All
                </button>
                <button className="btn btn-secondary performance-account-action-btn" onClick={selectNoneAccounts}>
                  Clear All
                </button>
              </div>

              <div className="performance-account-selection">
                <div className="performance-account-checkboxes">
                  {availableAccounts.filter(account => {
                    // If dual calculator mode is disabled, only show first user and Joint accounts
                    const isDualMode = paycheckData?.settings?.showSpouseCalculator ?? true;
                    if (!isDualMode) {
                      const firstUserName = paycheckData?.your?.name?.trim();
                      return account.owner === firstUserName || account.owner === 'Joint';
                    }
                    return true;
                  }).map(account => (
                    <label key={account.id} className={`performance-account-checkbox ${selectedAccounts.includes(account.id) ? 'selected' : ''} ${!account.isActive ? 'inactive' : ''}`}>
                      <input
                        type="checkbox"
                        checked={selectedAccounts.includes(account.id)}
                        onChange={() => toggleAccount(account.id)}
                      />
                      <span className="performance-account-name">
                        {account.accountName}
                        {!account.isActive && <span className="performance-account-status"> (Inactive - Last: {account.lastActiveYear})</span>}
                      </span>
                      <span className="performance-account-owner">({account.owner})</span>
                    </label>
                  ))}
                </div>
                <div className="performance-account-summary">
                  {(() => {
                    const isDualMode = paycheckData?.settings?.showSpouseCalculator ?? true;
                    const visibleAccounts = isDualMode ? availableAccounts : availableAccounts.filter(account => {
                      const firstUserName = paycheckData?.your?.name?.trim();
                      return account.owner === firstUserName || account.owner === 'Joint';
                    });
                    return `${selectedAccounts.length} of ${visibleAccounts.length} accounts selected`;
                  })()}
                  {paycheckData?.settings?.showSpouseCalculator === false && (
                    <span style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginTop: '4px' }}>
                      (Dual calculator mode disabled - showing primary user accounts only)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        {selectedYears.length > 0 && selectedAccounts.length > 0 && (
          <div className="networth-tabs">
            <div className="networth-tab-border">
              <div className="networth-tab-buttons">
                {[
                  { id: 'overview', label: '📊 Overview & Balance Trends', icon: '📊' },
                  { id: 'returns', label: '💰 Returns Analysis', icon: '💰' },
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
        {selectedYears.length > 0 && selectedAccounts.length > 0 && (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                {/* Summary Statistics */}
                {filteredData.length > 0 && (
                  <div className="performance-summary">
                    <h2 className="performance-summary-title">📊 Performance Summary</h2>
                    <div className="performance-summary-grid">
                      {(() => {
                        const dataWithValues = filteredData.filter(d => d.hasData);
                        const totalCurrentBalance = dataWithValues.reduce((sum, d) => sum + (d.balance || 0), 0);
                        const totalReturns = dataWithValues.reduce((sum, d) => sum + (d.totalReturns || 0), 0);
                        const totalContributions = dataWithValues.reduce((sum, d) => sum + (d.netContributions || 0), 0);
                        const totalBeginningBalance = dataWithValues.reduce((sum, d) => sum + Math.max(0, d.beginningBalance || 0), 0);
                        const avgReturnPercent = totalBeginningBalance > 0 ? (totalReturns / totalBeginningBalance) * 100 : 0;
                        
                        return [
                          { label: 'Total Current Balance', value: formatCurrency(totalCurrentBalance) },
                          { label: 'Total Returns', value: formatCurrency(totalReturns), change: `${avgReturnPercent >= 0 ? '+' : ''}${avgReturnPercent.toFixed(1)}%` },
                          { label: 'Total Net Contributions', value: formatCurrency(totalContributions) },
                          { label: 'Number of Accounts', value: selectedAccounts.length.toString() },
                          { label: 'Years of Data', value: selectedYears.length.toString() }
                        ].map((stat, idx) => (
                          <div key={idx} className="performance-summary-card">
                            <div className="performance-summary-label">{stat.label}</div>
                            <div className="performance-summary-value">{stat.value}</div>
                            {stat.change && (
                              <div className={`performance-summary-change ${avgReturnPercent >= 0 ? 'positive' : 'negative'}`}>
                                {stat.change}
                              </div>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* Account Balance Chart */}
                <div className="performance-chart-container">
                  <div className="performance-chart-header">
                    <h3 className="performance-chart-title">💼 Account Balance Trends</h3>
                    <div className="performance-chart-controls">
                      <label className="performance-chart-toggle">
                        <input
                          type="checkbox"
                          checked={showAllYearsInChart}
                          onChange={(e) => setShowAllYearsInChart(e.target.checked)}
                        />
                        <span className="performance-chart-toggle-label">
                          Show All Years {showAllYearsInChart && `(${processedData.length} entries)`}
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="performance-chart-wrapper">
                    <Line data={performanceChartData} options={chartOptions} />
                  </div>
                </div>
              </div>
            )}

            {/* Returns Tab */}
            {activeTab === 'returns' && (
              <div>
                <div className="performance-chart-container">
                  <div className="performance-chart-header">
                    <h3 className="performance-chart-title">💰 Investment Returns Analysis</h3>
                    <div className="performance-chart-controls">
                      <label className="performance-chart-toggle">
                        <input
                          type="checkbox"
                          checked={includeContributionsInReturns}
                          onChange={(e) => setIncludeContributionsInReturns(e.target.checked)}
                        />
                        <span className="performance-chart-toggle-label">
                          Include Contributions in Returns
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="performance-chart-wrapper">
                    <Bar data={returnsChartData} options={returnsChartOptions} />
                  </div>
                </div>

                {/* Year-over-Year Analysis */}
                {sortedYoyData.length > 0 && (
                  <div className="performance-yoy-analysis">
                    <div className="performance-yoy-header">
                      <h3 className="performance-yoy-title">📈 Year-over-Year Changes</h3>
                      <div className="performance-yoy-controls">
                        <select 
                          className="performance-yoy-sort-select"
                          value={yoySort}
                          onChange={(e) => setYoySort(e.target.value)}
                        >
                          <option value="year">Sort by Year</option>
                          <option value="account">Sort by Account</option>
                          <option value="balance-desc">Largest Balance Change</option>
                          <option value="balance-asc">Smallest Balance Change</option>
                          <option value="returns-desc">Highest Return %</option>
                          <option value="returns-asc">Lowest Return %</option>
                        </select>
                        <span className="performance-yoy-count">
                          {sortedYoyData.length} change{sortedYoyData.length !== 1 ? 's' : ''} found
                        </span>
                      </div>
                    </div>
                    <div className="performance-yoy-grid">
                      {sortedYoyData.map((data, idx) => (
                        <div key={`${data.accountId}-${data.year}`} className="performance-yoy-card">
                          <div className="performance-yoy-header">
                            <h4>{data.accountName} ({data.owner})</h4>
                            <span className="performance-yoy-years">{data.previousYear} → {data.year}</span>
                          </div>
                          <div className="performance-yoy-metrics">
                            <div className="performance-yoy-metric">
                              <span className="performance-yoy-label">Balance Change:</span>
                              <span className={`performance-yoy-value ${data.balanceChange >= 0 ? 'positive' : 'negative'}`}>
                                {data.balanceChange >= 0 ? '+' : ''}{formatCurrency(data.balanceChange)}
                                ({data.balanceChangePercent >= 0 ? '+' : ''}{data.balanceChangePercent.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="performance-yoy-metric">
                              <span className="performance-yoy-label">Returns:</span>
                              <span className={`performance-yoy-value ${data.totalReturns >= 0 ? 'positive' : 'negative'}`}>
                                {formatCurrency(data.totalReturns)} ({data.returnPercentage >= 0 ? '+' : ''}{data.returnPercentage.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* Details Tab */}
            {activeTab === 'details' && (
              <div>
                {/* Always Visible Filter Controls */}
                <div style={{ 
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={hideInactiveAccounts}
                          onChange={(e) => setHideInactiveAccounts(e.target.checked)}
                        />
                        <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                          Hide Inactive Accounts ({filteredData.filter(d => !d.isActive).length} inactive)
                        </span>
                      </label>
                      
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={hideNoDataAccounts}
                          onChange={(e) => setHideNoDataAccounts(e.target.checked)}
                        />
                        <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                          Hide No Data Entries ({filteredData.filter(d => !d.hasData).length} no data)
                        </span>
                      </label>
                      
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={includeContributionsInReturns}
                          onChange={(e) => setIncludeContributionsInReturns(e.target.checked)}
                        />
                        <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#059669' }}>
                          Include Contributions in Returns
                        </span>
                      </label>
                    </div>
                    
                    <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>
                      Showing {detailsFilteredData.length} of {filteredData.length} entries
                    </span>
                  </div>
                </div>

                {/* Additional Filter Controls (Collapsible) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      className="filter-toggle-btn"
                      onClick={() => setShowDetailsFilters(v => !v)}
                      style={{
                        fontSize: '0.9rem',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        background: hasActiveAdvancedFilters() ? '#fef3c7' : '#f8fafc',
                        color: hasActiveAdvancedFilters() ? '#92400e' : '#0891b2',
                        cursor: 'pointer'
                      }}
                    >
                      {showDetailsFilters ? 'Hide Advanced Filters ▲' : 'Show Advanced Filters ▼'}
                      {hasActiveAdvancedFilters() && ' 🔍'}
                    </button>
                    <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                      {hasActiveAdvancedFilters() ? 'Advanced filters are active' : 'Additional filtering options'}
                    </span>
                  </div>
                  {hasActiveAdvancedFilters() && (
                    <button
                      onClick={resetAdvancedFilters}
                      style={{
                        fontSize: '0.85rem',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #dc2626',
                        background: '#fee2e2',
                        color: '#dc2626',
                        cursor: 'pointer'
                      }}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>

                {/* Expandable Advanced Filter Section */}
                {showDetailsFilters && (
                  <div style={{ 
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* Account Type Filter */}
                      {availableAccountTypes.length > 1 && (
                        <div>
                          <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#0369a1', display: 'block', marginBottom: '12px' }}>
                            Account Type:
                          </label>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => setFilterAccountType('all')}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                background: filterAccountType === 'all' ? '#3b82f6' : '#ffffff',
                                color: filterAccountType === 'all' ? '#ffffff' : '#374151',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '500'
                              }}
                            >
                              All Types ({availableAccountTypes.length})
                            </button>
                            {availableAccountTypes.map(type => (
                              <button
                                key={type}
                                onClick={() => setFilterAccountType(type)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #d1d5db',
                                  background: filterAccountType === type ? '#3b82f6' : '#ffffff',
                                  color: filterAccountType === type ? '#ffffff' : '#374151',
                                  cursor: 'pointer',
                                  fontSize: '0.85rem',
                                  fontWeight: '500'
                                }}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Owner Filter */}
                      {availableOwners.length > 1 && (
                        <div>
                          <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#0369a1', display: 'block', marginBottom: '12px' }}>
                            Owner:
                          </label>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => setFilterOwner('all')}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                background: filterOwner === 'all' ? '#3b82f6' : '#ffffff',
                                color: filterOwner === 'all' ? '#ffffff' : '#374151',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '500'
                              }}
                            >
                              All Owners ({availableOwners.length})
                            </button>
                            {availableOwners.map(owner => (
                              <button
                                key={owner}
                                onClick={() => setFilterOwner(owner)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #d1d5db',
                                  background: filterOwner === owner ? '#3b82f6' : '#ffffff',
                                  color: filterOwner === owner ? '#ffffff' : '#374151',
                                  cursor: 'pointer',
                                  fontSize: '0.85rem',
                                  fontWeight: '500'
                                }}
                              >
                                {owner}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Return Performance Filter */}
                      <div>
                        <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#0369a1', display: 'block', marginBottom: '12px' }}>
                          Return Performance:
                        </label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {[
                            { value: 'all', label: 'All Performance' },
                            { value: 'positive', label: 'Positive Returns (+)' },
                            { value: 'negative', label: 'Negative Returns (-)' },
                            { value: 'breakeven', label: 'Break-even (~0%)' }
                          ].map(option => (
                            <button
                              key={option.value}
                              onClick={() => setFilterReturnPerformance(option.value)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                background: filterReturnPerformance === option.value ? '#3b82f6' : '#ffffff',
                                color: filterReturnPerformance === option.value ? '#ffffff' : '#374151',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '500'
                              }}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Year Filter */}
                      {availableYears.length > 1 && (
                        <div>
                          <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#0369a1', display: 'block', marginBottom: '12px' }}>
                            Year:
                          </label>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => setFilterYear('all')}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                background: filterYear === 'all' ? '#3b82f6' : '#ffffff',
                                color: filterYear === 'all' ? '#ffffff' : '#374151',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '500'
                              }}
                            >
                              All Years ({availableYears.length})
                            </button>
                            {[...availableYears].sort((a, b) => b - a).map(year => (
                              <button
                                key={year}
                                onClick={() => setFilterYear(year.toString())}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #d1d5db',
                                  background: filterYear === year.toString() ? '#3b82f6' : '#ffffff',
                                  color: filterYear === year.toString() ? '#ffffff' : '#374151',
                                  cursor: 'pointer',
                                  fontSize: '0.85rem',
                                  fontWeight: '500'
                                }}
                              >
                                {year}
                                {isCurrentYear(year) && <span style={{ fontSize: '0.7rem', marginLeft: '4px' }}>YTD</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Balance Range Filter */}
                      <div>
                        <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#0369a1', display: 'block', marginBottom: '12px' }}>
                          Balance Range ($):
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <input
                            type="number"
                            placeholder="Min Balance"
                            value={filterBalanceRange.min}
                            onChange={(e) => setFilterBalanceRange(prev => ({ ...prev, min: e.target.value }))}
                            min="0"
                            step="1000"
                            style={{
                              padding: '8px',
                              borderRadius: '6px',
                              border: '1px solid #d1d5db',
                              fontSize: '0.85rem',
                              width: '120px'
                            }}
                          />
                          <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>to</span>
                          <input
                            type="number"
                            placeholder="Max Balance"
                            value={filterBalanceRange.max}
                            onChange={(e) => setFilterBalanceRange(prev => ({ ...prev, max: e.target.value }))}
                            min="0"
                            step="1000"
                            style={{
                              padding: '8px',
                              borderRadius: '6px',
                              border: '1px solid #d1d5db',
                              fontSize: '0.85rem',
                              width: '120px'
                            }}
                          />
                          {(filterBalanceRange.min || filterBalanceRange.max) && (
                            <button
                              onClick={() => setFilterBalanceRange({ min: '', max: '' })}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid #dc2626',
                                background: '#fee2e2',
                                color: '#dc2626',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Filter Summary */}
                    {hasActiveAdvancedFilters() && (
                      <div style={{ 
                        marginTop: '20px', 
                        padding: '12px', 
                        background: '#fef3c7', 
                        border: '1px solid #f59e0b', 
                        borderRadius: '6px' 
                      }}>
                        <div style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: '500' }}>
                          <strong>Active Filters:</strong>
                          {filterAccountType !== 'all' && (
                            <span style={{ marginLeft: '8px', padding: '2px 6px', background: '#ffffff', borderRadius: '4px' }}>
                              Type: {filterAccountType}
                            </span>
                          )}
                          {filterOwner !== 'all' && (
                            <span style={{ marginLeft: '8px', padding: '2px 6px', background: '#ffffff', borderRadius: '4px' }}>
                              Owner: {filterOwner}
                            </span>
                          )}
                          {filterReturnPerformance !== 'all' && (
                            <span style={{ marginLeft: '8px', padding: '2px 6px', background: '#ffffff', borderRadius: '4px' }}>
                              Performance: {filterReturnPerformance}
                            </span>
                          )}
                          {filterYear !== 'all' && (
                            <span style={{ marginLeft: '8px', padding: '2px 6px', background: '#ffffff', borderRadius: '4px' }}>
                              Year: {filterYear}
                            </span>
                          )}
                          {(filterBalanceRange.min || filterBalanceRange.max) && (
                            <span style={{ marginLeft: '8px', padding: '2px 6px', background: '#ffffff', borderRadius: '4px' }}>
                              Balance: ${filterBalanceRange.min || '0'}-${filterBalanceRange.max || '∞'}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="performance-table-container">
                  {/* Header with sorting and controls */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <h2 className="performance-table-title">📋 Detailed Performance Data</h2>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: '500', color: '#374151', whiteSpace: 'nowrap' }}>
                          Sort by:
                        </label>
                        <select
                          value={detailsSort}
                          onChange={(e) => setDetailsSort(e.target.value)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.9rem',
                            minWidth: '120px'
                          }}
                        >
                          <option value="year">Year</option>
                          <option value="accountName">Account Name</option>
                          <option value="owner">Owner</option>
                          <option value="accountType">Account Type</option>
                          <option value="balance">Balance</option>
                          <option value="totalReturns">Total Returns</option>
                          <option value="returnPercentage">Return %</option>
                        </select>
                        <select
                          value={detailsSortOrder}
                          onChange={(e) => setDetailsSortOrder(e.target.value)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.9rem',
                            minWidth: '100px'
                          }}
                        >
                          <option value="desc">High to Low</option>
                          <option value="asc">Low to High</option>
                        </select>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginLeft: '12px' }}>
                          <input
                            type="checkbox"
                            checked={isCompactTable}
                            onChange={(e) => setIsCompactTable(e.target.checked)}
                            style={{ margin: 0 }}
                          />
                          <span style={{ fontSize: '0.9rem', color: '#374151' }}>Compact view</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Pagination Controls - Top */}
                  {detailsTotalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: '#6b7280', flexWrap: 'wrap' }}>
                        <span>Showing {detailsStartIndex + 1}-{Math.min(detailsEndIndex, detailsTotalItems)} of {detailsTotalItems} entries</span>
                        <select
                          value={detailsItemsPerPage}
                          onChange={(e) => {
                            setDetailsItemsPerPage(Number(e.target.value));
                            setDetailsCurrentPage(1);
                          }}
                          style={{
                            padding: '4px 6px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.8rem'
                          }}
                        >
                          <option value={10}>10 per page</option>
                          <option value={25}>25 per page</option>
                          <option value={50}>50 per page</option>
                          <option value={100}>100 per page</option>
                          <option value={200}>200 per page</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => setDetailsCurrentPage(Math.max(1, detailsCurrentPage - 1))}
                          disabled={detailsCurrentPage === 1}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
                            background: detailsCurrentPage === 1 ? '#f9fafb' : '#fff',
                            color: detailsCurrentPage === 1 ? '#9ca3af' : '#374151',
                            cursor: detailsCurrentPage === 1 ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem'
                          }}
                        >
                          ← Previous
                        </button>
                        <span style={{ fontSize: '0.9rem', color: '#6b7280', padding: '0 8px' }}>
                          Page {detailsCurrentPage} of {detailsTotalPages}
                        </span>
                        <button
                          onClick={() => setDetailsCurrentPage(Math.min(detailsTotalPages, detailsCurrentPage + 1))}
                          disabled={detailsCurrentPage === detailsTotalPages}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
                            background: detailsCurrentPage === detailsTotalPages ? '#f9fafb' : '#fff',
                            color: detailsCurrentPage === detailsTotalPages ? '#9ca3af' : '#374151',
                            cursor: detailsCurrentPage === detailsTotalPages ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem'
                          }}
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="performance-table-wrapper">
                    <div className="performance-table-scroll">
                      <table className={`performance-table ${isCompactTable ? 'compact-mode' : ''}`}>
                        <thead>
                          <tr>
                            <th className="sticky">Account</th>
                            <th className="sticky">Owner</th>
                            <th className="sticky">Year</th>
                            <th>Balance</th>
                            <th>Employee Contributions</th>
                            <th>Employer Match</th>
                            <th>Gains</th>
                            <th>Fees</th>
                            <th>Withdrawals</th>
                            <th>{includeContributionsInReturns ? 'Total Growth' : 'Total Returns'}</th>
                            <th>{includeContributionsInReturns ? 'Growth %' : 'Return %'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailsPaginatedData.map((data, idx) => (
                            <tr key={`${data.accountId}-${data.year}`} className={!data.hasData ? 'no-data' : ''}>
                              <td className="performance-table-account">
                                {data.accountName}
                                {!data.isActive && <span className="performance-inactive-badge">[Inactive]</span>}
                              </td>
                              <td className="performance-table-owner">{data.owner}</td>
                              <td className="performance-table-year">
                                {data.year}
                                {getYTDIndicator(data.year, 'table')}
                              </td>
                              <td className="performance-table-currency">{data.hasData ? formatCurrency(data.balance) : 'No Data'}</td>
                              <td className="performance-table-currency" title="Employee contributions only">{data.hasData ? formatCurrency(data.contributions) : 'No Data'}</td>
                              <td className="performance-table-currency">{data.hasData ? formatCurrency(data.employerMatch) : 'No Data'}</td>
                              <td className="performance-table-currency">{data.hasData ? formatCurrency(data.gains) : 'No Data'}</td>
                              <td className="performance-table-currency negative">{data.hasData ? formatCurrency(data.fees) : 'No Data'}</td>
                              <td className="performance-table-currency negative">{data.hasData ? formatCurrency(data.withdrawals) : 'No Data'}</td>
                              <td className={`performance-table-currency ${data.hasData && (includeContributionsInReturns ? (data.totalReturns + data.netContributions) >= 0 : data.totalReturns >= 0) ? 'positive' : data.hasData && (includeContributionsInReturns ? (data.totalReturns + data.netContributions) < 0 : data.totalReturns < 0) ? 'negative' : ''}`}>
                                {data.hasData ? formatCurrency(includeContributionsInReturns ? data.totalReturns + data.netContributions : data.totalReturns) : 'No Data'}
                              </td>
                              <td className={`performance-table-percent ${data.hasData && data.returnPercentage !== null && !isNaN(data.returnPercentage) && data.returnPercentage >= 0 ? 'positive' : data.hasData && data.returnPercentage !== null && !isNaN(data.returnPercentage) && data.returnPercentage < 0 ? 'negative' : ''}`}>
                                {formatPercentage(data.returnPercentage, data.hasData)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination Controls - Bottom */}
                  {detailsTotalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '16px', gap: '8px' }}>
                      <button
                        onClick={() => setDetailsCurrentPage(Math.max(1, detailsCurrentPage - 1))}
                        disabled={detailsCurrentPage === 1}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: '1px solid #d1d5db',
                          background: detailsCurrentPage === 1 ? '#f9fafb' : '#fff',
                          color: detailsCurrentPage === 1 ? '#9ca3af' : '#374151',
                          cursor: detailsCurrentPage === 1 ? 'not-allowed' : 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        ← Previous
                      </button>
                      <span style={{ fontSize: '0.9rem', color: '#6b7280', padding: '0 12px' }}>
                        Page {detailsCurrentPage} of {detailsTotalPages}
                      </span>
                      <button
                        onClick={() => setDetailsCurrentPage(Math.min(detailsTotalPages, detailsCurrentPage + 1))}
                        disabled={detailsCurrentPage === detailsTotalPages}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: '1px solid #d1d5db',
                          background: detailsCurrentPage === detailsTotalPages ? '#f9fafb' : '#fff',
                          color: detailsCurrentPage === detailsTotalPages ? '#9ca3af' : '#374151',
                          cursor: detailsCurrentPage === detailsTotalPages ? 'not-allowed' : 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {(selectedYears.length === 0 || selectedAccounts.length === 0) && availableYears.length > 0 && (
          <div className="performance-empty-state">
            <div className="empty-state-icon">📊</div>
            <h3>Select Years and Accounts</h3>
            <p>Choose one or more years and accounts above to view performance analysis.</p>
            <p>Currently selected: <strong>{selectedYears.length} year{selectedYears.length !== 1 ? 's' : ''}</strong> and <strong>{selectedAccounts.length} account{selectedAccounts.length !== 1 ? 's' : ''}</strong></p>
          </div>
        )}
      </div>
    </>
  );
};

export default Performance;