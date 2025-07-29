import { 
  ANNUAL_WAGE_WITHHOLDING_2025, 
  ANNUAL_MULTIPLE_JOBS_WITHHOLDING_2025,
  PAYROLL_TAX_RATES,
  CONTRIBUTION_LIMITS_2025,
  PAY_PERIODS 
} from '../config/taxConstants';

// Utility Functions
export const calculatePercentageOfMax = (amount, max) => {
  if (!amount || !max) return '0%';
  return `${((amount / max) * 100).toFixed(1)}%`;
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

export const formatSalaryDisplay = (value) => {
  if (!value || isNaN(parseFloat(value))) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(parseFloat(value));
};

export const formatDeductionDisplay = (value) => {
  if (!value || value === 0) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export const formatPercentageDisplay = (value) => {
  if (!value || value === 0) return '';
  return `${parseFloat(value).toFixed(1)}%`;
};

// Age Calculation
export const calculateAge = (birthday) => {
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Contribution Calculation Helpers
export const calculateRequired401kPercentage = (salary, isOver50) => {
  const maxContribution = isOver50
    ? CONTRIBUTION_LIMITS_2025.k401_employee + CONTRIBUTION_LIMITS_2025.k401_catchUp
    : CONTRIBUTION_LIMITS_2025.k401_employee;
  return ((maxContribution / salary) * 100).toFixed(2);
};

export const calculateRequiredIraContribution = (isOver50) => {
  const maxContribution = isOver50
    ? CONTRIBUTION_LIMITS_2025.ira_self + CONTRIBUTION_LIMITS_2025.ira_catchUp
    : CONTRIBUTION_LIMITS_2025.ira_self;
  return (maxContribution / 12).toFixed(2);
};

export const calculateRequiredHsaContribution = (hsaCoverageType, payPeriod, employerHsa, isOver55) => {
  const maxContribution = hsaCoverageType === 'self'
    ? CONTRIBUTION_LIMITS_2025.hsa_self + (isOver55 ? CONTRIBUTION_LIMITS_2025.hsa_catchUp : 0)
    : CONTRIBUTION_LIMITS_2025.hsa_family + (isOver55 ? CONTRIBUTION_LIMITS_2025.hsa_catchUp : 0);
  return ((maxContribution - employerHsa) / PAY_PERIODS[payPeriod].periodsPerYear).toFixed(2);
};

export const calculateRequiredHsaPerPaycheckContribution = (hsaCoverageType, payPeriod, employerHsa, isOver55) => {
  if (hsaCoverageType === 'none') return '0.00';
  
  const maxContribution = hsaCoverageType === 'self'
    ? CONTRIBUTION_LIMITS_2025.hsa_self + (isOver55 ? CONTRIBUTION_LIMITS_2025.hsa_catchUp : 0)
    : CONTRIBUTION_LIMITS_2025.hsa_family + (isOver55 ? CONTRIBUTION_LIMITS_2025.hsa_catchUp : 0);
  return ((maxContribution - employerHsa) / PAY_PERIODS[payPeriod].periodsPerYear).toFixed(2);
};

// Calculate which months have 3 paychecks for bi-weekly pay periods
export const calculateExtraPaycheckMonths = (biWeeklyType = 'even', year = new Date().getFullYear()) => {
  const months = [];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Start date for calculation - first paycheck of the year
  // Even weeks: Start on first Friday of January
  // Odd weeks: Start on second Friday of January
  const startDate = new Date(year, 0, 1); // January 1st
  
  // Find first Friday
  let firstFriday = 1;
  while (new Date(year, 0, firstFriday).getDay() !== 5) {
    firstFriday++;
  }
  
  // Adjust based on bi-weekly type
  const baseDate = biWeeklyType === 'even' ? firstFriday : firstFriday + 7;
  
  // Track paychecks throughout the year
  let currentDate = new Date(year, 0, baseDate);
  const paychecksByMonth = {};
  
  // Initialize month counters
  for (let i = 0; i < 12; i++) {
    paychecksByMonth[i] = 0;
  }
  
  // Count paychecks for each month
  while (currentDate.getFullYear() === year) {
    const month = currentDate.getMonth();
    paychecksByMonth[month]++;
    
    // Move to next paycheck (14 days later)
    currentDate.setDate(currentDate.getDate() + 14);
  }
  
  // Find months with 3 paychecks
  for (let month = 0; month < 12; month++) {
    if (paychecksByMonth[month] === 3) {
      months.push({
        month: month + 1,
        name: monthNames[month],
        paychecks: 3
      });
    }
  }
  
  return months;
};

// Calculate total extra paycheck income for the year
export const calculateExtraPaycheckIncome = (netPaycheckAmount, biWeeklyType = 'even', year = new Date().getFullYear()) => {
  const extraMonths = calculateExtraPaycheckMonths(biWeeklyType, year);
  return {
    extraMonths,
    totalExtraPaychecks: extraMonths.length,
    totalExtraIncome: extraMonths.length * netPaycheckAmount
  };
};

// Tax Calculation Functions
export const calculateWithholdingFromAnnualTable = (annualGrossPay, table) => {
  let applicableThreshold = table[0];
  
  for (let i = table.length - 1; i >= 0; i--) {
    if (annualGrossPay >= table[i].threshold) {
      applicableThreshold = table[i];
      break;
    }
  }
  
  const amountOverThreshold = Math.max(0, annualGrossPay - applicableThreshold.threshold);
  const withholding = applicableThreshold.baseWithholding + (amountOverThreshold * applicableThreshold.rate);
  
  return Math.max(0, withholding);
};

export const calculateAnnualWageWithholding = (annualGrossPay, filingStatus, isMultipleJobs = false) => {
  const tableToUse = isMultipleJobs ? ANNUAL_MULTIPLE_JOBS_WITHHOLDING_2025 : ANNUAL_WAGE_WITHHOLDING_2025;
  const table = tableToUse[filingStatus];
  
  if (!table) {
    const fallbackTable = (isMultipleJobs ? ANNUAL_MULTIPLE_JOBS_WITHHOLDING_2025 : ANNUAL_WAGE_WITHHOLDING_2025).single;
    if (!fallbackTable) return 0;
    return calculateWithholdingFromAnnualTable(annualGrossPay, fallbackTable);
  }

  return calculateWithholdingFromAnnualTable(annualGrossPay, table);
};

export const calculatePayrollTaxes = (grossIncome) => {
  const socialSecurityTax = grossIncome * PAYROLL_TAX_RATES.socialSecurity;
  const medicareTax = grossIncome * PAYROLL_TAX_RATES.medicare;
  
  return {
    socialSecurity: socialSecurityTax,
    medicare: medicareTax,
    total: socialSecurityTax + medicareTax
  };
};

// ROI Calculation Utility
export const calculateROI = (gains, fees, balance) => {
  const netGains = (gains || 0) - (fees || 0);
  const totalBalance = balance || 0;
  
  if (totalBalance <= 0) return 0;
  return (netGains / totalBalance) * 100;
};

// Generate descriptive filename with date and user names
export const generateDescriptiveFilename = (baseType, userNames = [], fileExtension = 'csv') => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, ''); // HHMMSS format
  
  // Create user part of filename
  let userPart = '';
  if (userNames && userNames.length > 0) {
    // Clean user names for filename (remove spaces, special chars)
    const cleanNames = userNames
      .filter(name => name && name.trim())
      .map(name => name.trim().replace(/[^a-zA-Z0-9]/g, ''));
    
    if (cleanNames.length > 0) {
      userPart = `_${cleanNames.join('_')}`;
    }
  }
  
  return `${baseType}${userPart}_${dateStr}_${timeStr}.${fileExtension}`;
};

// Generate filename specifically for different data types
export const generateDataFilename = (dataType, userNames = [], fileExtension = 'csv') => {
  const typeMap = {
    'historical': 'Historical_Financial_Data',
    'performance': 'Account_Performance_Data',
    'budget': 'Budget_Categories_Data',
    'paycheck': 'Paycheck_Calculator_Data',
    'all_data': 'Complete_Financial_Data'
  };
  
  const baseType = typeMap[dataType.toLowerCase()] || dataType;
  return generateDescriptiveFilename(baseType, userNames, fileExtension);
};

// Net Worth Dashboard Calculation Functions

// Calculate house value based on mode (market value vs cost basis)
export const calculateHouseValue = (year, historicalEntry, netWorthMode, historicalData) => {
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

// Calculate average age for a given year using paycheck birthdays
export const getAverageAgeForYear = (year, paycheckData) => {
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

// Calculate cumulative lifetime earnings up to a given year
export const getCumulativeEarnings = (targetYear, historicalData) => {
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

// Process net worth data with all calculations
export const processNetWorthData = (historicalData, performanceData, paycheckData, netWorthMode) => {
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
    const retirement = taxFree + taxDeferred;
    
    // Calculate house value based on selected mode
    const houseValue = calculateHouseValue(year, historicalEntry, netWorthMode, historicalData);
    
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
    const averageAge = getAverageAgeForYear(year, paycheckData);
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
    const cumulativeEarnings = getCumulativeEarnings(year, historicalData);
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
};

// Generate chart data for main net worth chart
export const generateMainNetWorthChartData = (filteredData) => {
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
};

// Generate portfolio tax location chart data
export const generatePortfolioTaxLocationData = (filteredData) => {
  const years = filteredData.map(d => d.year);
  const categories = ['Tax-Free (Roth)', 'Tax-Deferred (Trad)', 'Brokerage (Taxable)', 'HSA', 'ESPP'];
  const colors = [
    'rgba(34, 197, 94, 0.8)',
    'rgba(59, 130, 246, 0.8)', 
    'rgba(168, 85, 247, 0.8)',
    'rgba(251, 146, 60, 0.8)',
    'rgba(239, 68, 68, 0.8)'
  ];

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
};

// Generate net worth location chart data
export const generateNetWorthLocationData = (filteredData) => {
  const years = filteredData.map(d => d.year);
  const categories = ['Portfolio', 'House Value', 'Cash', 'Assets', 'Liabilities'];
  const colors = [
    'rgba(59, 130, 246, 0.8)',
    'rgba(168, 85, 247, 0.8)',
    'rgba(251, 146, 60, 0.8)',
    'rgba(34, 197, 94, 0.8)',
    'rgba(239, 68, 68, 0.8)'
  ];

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
};

// Generate Money Guy Score comparison chart data
export const generateMoneyGuyComparisonData = (filteredData) => {
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
};

// YTD Income Calculation Helpers

// Helper function to calculate number of pay periods between two dates
const calculatePayPeriodsBetweenDates = (startDate, endDate, payPeriod) => {
  const periodsPerYear = PAY_PERIODS[payPeriod].periodsPerYear;
  const millisecondsInYear = 365.25 * 24 * 60 * 60 * 1000; // Account for leap years
  const timeDifferenceMs = endDate - startDate;
  const yearsSpanned = timeDifferenceMs / millisecondsInYear;
  
  return yearsSpanned * periodsPerYear;
};

// Calculate actual YTD income from income periods
export const calculateYTDIncome = (incomePeriodsData, payPeriod = 'biWeekly', currentSalary = 0) => {
  const currentYear = new Date().getFullYear();
  
  // If no income periods are defined, use current salary for entire year
  if (!incomePeriodsData || incomePeriodsData.length === 0) {
    return parseFloat(currentSalary) || 0;
  }
  
  let ytdIncome = 0;
  
  incomePeriodsData.forEach(period => {
    // Skip periods with missing or invalid dates
    if (!period.startDate || !period.endDate) {
      console.warn(`Skipping income period with missing dates:`, period);
      return;
    }
    
    // Parse dates in local timezone to avoid UTC issues
    const startDateParts = period.startDate.split('-');
    const endDateParts = period.endDate.split('-');
    
    // Validate date parts
    if (startDateParts.length !== 3 || endDateParts.length !== 3) {
      console.warn(`Skipping income period with invalid date format:`, period);
      return;
    }
    
    const startDate = new Date(parseInt(startDateParts[0]), parseInt(startDateParts[1]) - 1, parseInt(startDateParts[2]));
    const endDate = new Date(parseInt(endDateParts[0]), parseInt(endDateParts[1]) - 1, parseInt(endDateParts[2]));
    const grossSalary = parseFloat(period.grossSalary) || 0;
    
    // Validate that dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.warn(`Skipping income period with invalid dates:`, period);
      return;
    }
    
    // Check that dates are for current year only
    if (startDate.getFullYear() !== currentYear || endDate.getFullYear() !== currentYear) {
      console.warn(`Income period dates must be for current year (${currentYear}). Skipping period with dates ${period.startDate} to ${period.endDate}`);
      return;
    }
    
    // Check if this period covers the entire year
    const isFullYear = startDate.getMonth() === 0 && startDate.getDate() === 1 &&
                      endDate.getMonth() === 11 && endDate.getDate() === 31;
    
    if (isFullYear) {
      // If it's a full year period, use the full salary directly
      ytdIncome += grossSalary;
    } else {
      // Use the dates as specified in the income period
      const periodsPerYear = PAY_PERIODS[payPeriod].periodsPerYear;
      const grossPayPerPaycheck = grossSalary / periodsPerYear;
      
      // Calculate pay periods between start and end date as specified
      const payPeriodsWorked = calculatePayPeriodsBetweenDates(startDate, endDate, payPeriod);
      
      // Calculate income earned during this specific period
      const periodIncome = grossPayPerPaycheck * payPeriodsWorked;
      ytdIncome += periodIncome;
    }
  });
  
  return ytdIncome;
};

// Calculate projected annual income (YTD + projected remaining)
export const calculateProjectedAnnualIncome = (incomePeriodsData, currentSalary, payPeriod = 'biWeekly') => {
  if (!incomePeriodsData || incomePeriodsData.length === 0) {
    return parseFloat(currentSalary) || 0;
  }
  
  const today = new Date();
  const endOfYear = new Date(today.getFullYear(), 11, 31);
  let projectedIncome = 0;
  
  // Add YTD income
  projectedIncome += calculateYTDIncome(incomePeriodsData, payPeriod);
  
  // Add projected income for rest of year using current salary
  const lastPeriod = incomePeriodsData.sort((a, b) => new Date(b.endDate) - new Date(a.endDate))[0];
  if (lastPeriod) {
    const lastEndDate = new Date(lastPeriod.endDate);
    if (lastEndDate < endOfYear) {
      // Calculate remaining pay periods using the same method as YTD calculation
      const periodsPerYear = PAY_PERIODS[payPeriod].periodsPerYear;
      const grossPayPerPaycheck = (parseFloat(currentSalary) || 0) / periodsPerYear;
      
      // Calculate remaining pay periods between last period end and end of year
      const remainingPayPeriods = calculatePayPeriodsBetweenDates(lastEndDate, endOfYear, payPeriod);
      
      projectedIncome += grossPayPerPaycheck * remainingPayPeriods;
    }
  }
  
  return projectedIncome;
};

// Calculate YTD contributions for a person from Performance data
export const calculateYTDContributionsFromPerformance = (performanceData, userNames, currentYear = new Date().getFullYear()) => {
  const result = {
    traditional401k: 0,
    roth401k: 0,
    traditionalIra: 0,
    rothIra: 0,
    hsa: 0,
    espp: 0,
    brokerage: 0,
    total401k: 0,
    totalIra: 0,
    totalContributions: 0,
    totalEmployerMatch: 0
  };
  
  if (!performanceData || !userNames || userNames.length === 0) {
    return result;
  }
  
  // Performance data is organized by entryId, not by year directly
  // We need to find all entries for the current year
  const relevantUsers = [...userNames, 'Joint'];
  
  // Iterate through all performance entries
  Object.values(performanceData).forEach(entry => {
    // Check if this entry is for the current year
    if (entry.year !== currentYear) return;
    
    // Check if this entry has users data
    if (!entry.users) return;
    
    // Process each user in this entry
    Object.keys(entry.users).forEach(userName => {
      // Skip if this user is not relevant
      if (!relevantUsers.includes(userName)) return;
      
      const account = entry.users[userName];
      if (!account || !account.accountType) return;
      
      // Try user-level contributions first, then fall back to entry-level
      let contributions = parseFloat(account.contributions) || 0;
      let employerMatch = parseFloat(account.employerMatch) || 0;
      
      // If user-level is empty/zero, use entry-level data
      if (contributions === 0 && entry.contributions) {
        contributions = parseFloat(entry.contributions) || 0;
      }
      if (employerMatch === 0 && entry.employerMatch) {
        employerMatch = parseFloat(entry.employerMatch) || 0;
      }
      
      const accountType = account.accountType.toLowerCase();
      
      // Categorize by account type
      if (accountType.includes('401k') || accountType.includes('401(k)')) {
        if (accountType.includes('roth')) {
          result.roth401k += contributions;
        } else {
          result.traditional401k += contributions;
        }
        result.totalEmployerMatch += employerMatch;
      } else if (accountType.includes('ira')) {
        if (accountType.includes('roth')) {
          result.rothIra += contributions;
        } else {
          result.traditionalIra += contributions;
        }
      } else if (accountType.includes('hsa')) {
        result.hsa += contributions;
      } else if (accountType.includes('espp') || accountType.includes('employee stock')) {
        result.espp += contributions;
      } else if (accountType.includes('brokerage') || accountType.includes('taxable')) {
        result.brokerage += contributions;
      }
      
      result.totalContributions += contributions;
    });
  });
  
  // Calculate totals
  result.total401k = result.traditional401k + result.roth401k;
  result.totalIra = result.traditionalIra + result.rothIra;
  
  return result;
};

// Calculate remaining contribution room based on YTD contributions
export const calculateRemainingContributionRoom = (ytdContributions, age, hsaCoverage) => {
  const isOver50 = age >= 50;
  const isOver55 = age >= 55;
  
  // 401k limits
  const max401k = isOver50 
    ? CONTRIBUTION_LIMITS_2025.k401_employee + CONTRIBUTION_LIMITS_2025.k401_catchUp
    : CONTRIBUTION_LIMITS_2025.k401_employee;
  
  // IRA limits
  const maxIra = isOver50 
    ? CONTRIBUTION_LIMITS_2025.ira_self + CONTRIBUTION_LIMITS_2025.ira_catchUp
    : CONTRIBUTION_LIMITS_2025.ira_self;
  
  // HSA limits
  let maxHsa = 0;
  if (hsaCoverage === 'self') {
    maxHsa = CONTRIBUTION_LIMITS_2025.hsa_self + (isOver55 ? CONTRIBUTION_LIMITS_2025.hsa_catchUp : 0);
  } else if (hsaCoverage === 'family') {
    maxHsa = CONTRIBUTION_LIMITS_2025.hsa_family + (isOver55 ? CONTRIBUTION_LIMITS_2025.hsa_catchUp : 0);
  }
  
  return {
    k401_remaining: Math.max(0, max401k - ytdContributions.total401k),
    ira_remaining: Math.max(0, maxIra - ytdContributions.totalIra),
    hsa_remaining: Math.max(0, maxHsa - ytdContributions.hsa),
    k401_max: max401k,
    ira_max: maxIra,
    hsa_max: maxHsa
  };
};

