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