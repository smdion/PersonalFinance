import React, { useState, useEffect } from 'react';
import { getHistoricalData, setHistoricalData, getPaycheckData, STORAGE_KEYS } from '../utils/localStorage';
import DataManager from './DataManager';

// Define per-user fields
const USER_FIELDS = ['employer', 'salary', 'bonus'];

// Define combined fields
const COMBINED_FIELDS = [
  'agi', 'ssaEarnings', 'effectiveTaxRate', 'taxPaid', 'netWorthPlus', 'netWorthMinus',
  'taxFree', 'taxDeferred', 'rBrokerage', 'ltBrokerage', 'espp', 'hsa', 'cash', 'house',
  'mortgage', 'othAsset', 'retirement', 'othLia', 'homeImprovements', 'liabilities'
];

const Historical = () => {
  const currentYear = new Date().getFullYear();
  const [paycheckData, setPaycheckDataState] = useState(null);
  const [userNames, setUserNames] = useState(['User1', 'User2']);
  
  // Load paycheck data
  useEffect(() => {
    const loadedPaycheckData = getPaycheckData();
    setPaycheckDataState(loadedPaycheckData);
    
    const names = [];
    if (loadedPaycheckData?.your?.name) names.push(loadedPaycheckData.your.name);
    if (loadedPaycheckData?.spouse?.name) names.push(loadedPaycheckData.spouse.name);
    if (names.length === 0) {
      names.push('Jordan', 'Alex'); // Default demo names
    }
    setUserNames(names);
  }, []);

  // Schema configuration for DataManager
  const schema = {
    primaryKeyLabel: 'Year',
    primaryKeyType: 'number',
    sections: [
      {
        name: 'users',
        title: '👥 Individual Information',
        fields: [
          { name: 'employer', label: 'Employer', type: 'text' },
          { name: 'salary', label: 'Salary', type: 'text', format: 'currency', className: 'currency' },
          { name: 'bonus', label: 'Bonus', type: 'text', format: 'currency', className: 'currency' }
        ]
      },
      {
        name: 'financial',
        title: '💰 Financial Metrics',
        fields: [
          { name: 'agi', label: 'AGI', format: 'currency', className: 'currency' },
          { name: 'ssaEarnings', label: 'SSA Earnings', format: 'currency', className: 'currency' },
          { name: 'effectiveTaxRate', label: 'Effective Tax Rate', format: 'percentage', className: 'percentage' },
          { name: 'taxPaid', label: 'Tax Paid', format: 'currency', className: 'currency' },
          { name: 'netWorthPlus', label: 'Net Worth Plus', format: 'currency', className: 'currency' },
          { name: 'netWorthMinus', label: 'Net Worth Minus', format: 'currency', className: 'currency' },
          { name: 'taxFree', label: 'Tax Free', format: 'currency', className: 'currency' },
          { name: 'taxDeferred', label: 'Tax Deferred', format: 'currency', className: 'currency' },
          { name: 'rBrokerage', label: 'R Brokerage', format: 'currency', className: 'currency' },
          { name: 'ltBrokerage', label: 'LT Brokerage', format: 'currency', className: 'currency' },
          { name: 'espp', label: 'ESPP', format: 'currency', className: 'currency' },
          { name: 'hsa', label: 'HSA', format: 'currency', className: 'currency' },
          { name: 'cash', label: 'Cash', format: 'currency', className: 'currency' },
          { name: 'house', label: 'House', format: 'currency', className: 'currency' },
          { name: 'mortgage', label: 'Mortgage', format: 'currency', className: 'currency' },
          { name: 'othAsset', label: 'Other Assets', format: 'currency', className: 'currency' },
          { name: 'retirement', label: 'Retirement', format: 'currency', className: 'currency' },
          { name: 'othLia', label: 'Other Liabilities', format: 'currency', className: 'currency' },
          { name: 'homeImprovements', label: 'Home Improvements', format: 'currency', className: 'currency' },
          { name: 'liabilities', label: 'Liabilities', format: 'currency', className: 'currency' }
        ]
      }
    ]
  };

  // Empty form data structure
  const emptyFormData = {
    year: currentYear,
    users: Object.fromEntries(userNames.map(name => [name, { employer: '', salary: '', bonus: '' }])),
    ...Object.fromEntries(COMBINED_FIELDS.map(f => [f, '']))
  };

  // Convert stored entry to form data
  const getFormDataFromEntry = (entry) => ({
    year: entry.year,
    users: entry.users || {},
    ...Object.fromEntries(COMBINED_FIELDS.map(f => [f, entry[f] || '']))
  });

  // Convert form data to stored entry
  const getEntryFromFormData = (formData) => ({
    year: formData.year,
    users: { ...formData.users },
    ...Object.fromEntries(COMBINED_FIELDS.map(f => [f, parseFloat(formData[f]) || 0]))
  });

  // CSV template data
  const csvTemplate = {
    [currentYear]: {
      year: currentYear,
      users: {
        user1: { name: 'Person 1', employer: 'Company A', salary: 75000, bonus: 5000 },
        user2: { name: 'Person 2', employer: 'Company B', salary: 65000, bonus: 3000 }
      },
      agi: 140000,
      ssaEarnings: 145000,
      effectiveTaxRate: 0.185,
      taxPaid: 25900,
      netWorthPlus: 500000,
      netWorthMinus: 150000,
      taxFree: 200000,
      taxDeferred: 150000,
      rBrokerage: 25000,
      ltBrokerage: 15000,
      espp: 5000,
      hsa: 25000,
      cash: 50000,
      house: 400000,
      mortgage: 150000,
      othAsset: 30000,
      retirement: 350000,
      othLia: 0,
      homeImprovements: 20000,
      liabilities: 150000
    }
  };

  // CSV headers
  const csvHeaders = [
    'Year',
    'Employer',
    'Salary',
    'Bonus',
    'AGI',
    'SSA Earnings',
    'Effective Tax Rate',
    'Tax Paid',
    'Net Worth Plus',
    'Net Worth Minus',
    'Tax Free',
    'Tax Deferred',
    'R Brokerage',
    'LT Brokerage',
    'ESPP',
    'HSA',
    'Cash',
    'House',
    'Mortgage',
    'Other Assets',
    'Retirement',
    'Other Liabilities',
    'Home Improvements',
    'Liabilities'
  ];

  // Format entry for CSV
  const formatCSVRow = (entry) => {
    // Handle users data properly - aggregate or use first user's data
    const usersData = entry.users || {};
    const userNames = Object.keys(usersData);
    
    // For CSV export, we'll aggregate salary/bonus and use first employer
    // or we could flatten to include all users (would require changing CSV headers)
    let totalSalary = 0;
    let totalBonus = 0;
    let firstEmployer = '';
    
    userNames.forEach((userName, index) => {
      const userData = usersData[userName] || {};
      totalSalary += userData.salary || 0;
      totalBonus += userData.bonus || 0;
      
      // Use first employer or concatenate multiple employers
      if (index === 0) {
        firstEmployer = userData.employer || '';
      } else if (userData.employer && userData.employer !== firstEmployer) {
        firstEmployer += ` & ${userData.employer}`;
      }
    });

    return {
      Year: entry.year,
      Employer: firstEmployer,
      Salary: totalSalary,
      Bonus: totalBonus,
      AGI: entry.agi || 0,
      'SSA Earnings': entry.ssaEarnings || 0,
      'Effective Tax Rate': entry.effectiveTaxRate || 0,
      'Tax Paid': entry.taxPaid || 0,
      'Net Worth Plus': entry.netWorthPlus || 0,
      'Net Worth Minus': entry.netWorthMinus || 0,
      'Tax Free': entry.taxFree || 0,
      'Tax Deferred': entry.taxDeferred || 0,
      'R Brokerage': entry.rBrokerage || 0,
      'LT Brokerage': entry.ltBrokerage || 0,
      'ESPP': entry.espp || 0,
      'HSA': entry.hsa || 0,
      'Cash': entry.cash || 0,
      'House': entry.house || 0,
      'Mortgage': entry.mortgage || 0,
      'Other Assets': entry.othAsset || 0,
      'Retirement': entry.retirement || 0,
      'Other Liabilities': entry.othLia || 0,
      'Home Improvements': entry.homeImprovements || 0,
      'Liabilities': entry.liabilities || 0
    };
  };

  // Parse CSV row
  const parseCSVRow = (row) => {
    // Validate that row is an object and has required fields
    if (!row || typeof row !== 'object') {
      console.warn('Invalid CSV row format:', row);
      return null;
    }
    
    // Check for required 'Year' field with various possible key formats
    const yearValue = row['Year'] || row['year'] || row['YEAR'] || row['YR'];
    const year = parseInt(yearValue);
    
    if (!year || isNaN(year) || year < 1900 || year > 2100) {
      console.warn('Invalid or missing year in CSV row:', yearValue, row);
      return null;
    }
    
    // Helper function to safely parse numeric values
    const safeParseFloat = (value) => {
      if (value === null || value === undefined || value === '') return 0;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    };
    
    // Helper function to safely get string values
    const safeGetString = (value) => {
      if (value === null || value === undefined) return '';
      return String(value).trim();
    };
    
    try {
      // Create users object with proper userName keys structure
      // For CSV import, we'll create a single aggregated user entry since CSV format
      // doesn't distinguish between multiple users in a single row
      const usersData = {};
      
      // Use the first available user name from userNames, or create a default
      const primaryUserName = userNames.length > 0 ? userNames[0] : 'User';
      
      usersData[primaryUserName] = {
        employer: safeGetString(row['Employer']),
        salary: safeParseFloat(row['Salary']),
        bonus: safeParseFloat(row['Bonus'])
      };
      
      return {
        year: year,
        users: usersData,
        // Store financial data directly on the entry object (not nested under 'financial')
        agi: safeParseFloat(row['AGI']),
        ssaEarnings: safeParseFloat(row['SSA Earnings']),
        effectiveTaxRate: safeParseFloat(row['Effective Tax Rate']),
        taxPaid: safeParseFloat(row['Tax Paid']),
        netWorthPlus: safeParseFloat(row['Net Worth Plus']),
        netWorthMinus: safeParseFloat(row['Net Worth Minus']),
        taxFree: safeParseFloat(row['Tax Free']),
        taxDeferred: safeParseFloat(row['Tax Deferred']),
        rBrokerage: safeParseFloat(row['R Brokerage']),
        ltBrokerage: safeParseFloat(row['LT Brokerage']),
        espp: safeParseFloat(row['ESPP']),
        hsa: safeParseFloat(row['HSA']),
        cash: safeParseFloat(row['Cash']),
        house: safeParseFloat(row['House']),
        mortgage: safeParseFloat(row['Mortgage']),
        othAsset: safeParseFloat(row['Other Assets']),
        retirement: safeParseFloat(row['Retirement']),
        othLia: safeParseFloat(row['Other Liabilities']),
        homeImprovements: safeParseFloat(row['Home Improvements']),
        liabilities: safeParseFloat(row['Liabilities'])
      };
    } catch (error) {
      console.error('Error parsing CSV row:', error, row);
      return null;
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>📈 Historical Data Tracker</h1>
        <p>Track Your Financial Progress Year Over Year</p>
      </div>

      <DataManager
        title="Historical Data"
        subtitle="Add your first year of financial data to start tracking your progress"
        dataKey={STORAGE_KEYS.HISTORICAL_DATA}
        getData={getHistoricalData}
        setData={setHistoricalData}
        schema={schema}
        userNames={userNames}
        emptyFormData={emptyFormData}
        getFormDataFromEntry={getFormDataFromEntry}
        getEntryFromFormData={getEntryFromFormData}
        primaryKey="year"
        sortField="year"
        sortOrder="desc"
        csvTemplate={csvTemplate}
        parseCSVRow={parseCSVRow}
        formatCSVRow={formatCSVRow}
        csvHeaders={csvHeaders}
      />
    </div>
  );
};

export default Historical;