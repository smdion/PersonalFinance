import React, { useState, useEffect } from 'react';
import { getHistoricalData, setHistoricalData, getPaycheckData, STORAGE_KEYS } from '../utils/localStorage';
import DataManager from './DataManager';

// Define per-user fields
const USER_FIELDS = ['employer', 'salary', 'bonus'];

// Define combined fields
const COMBINED_FIELDS = [
  'agi', 'ssaEarnings', 'effectiveTaxRate', 'taxPaid',
  'taxFree', 'taxDeferred', 'brokerage', 'espp', 'hsa', 'cash', 'house',
  'mortgage', 'othAsset', 'retirement', 'othLia', 'homeImprovements'
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
          { name: 'taxPaid', label: 'Taxes Paid', format: 'currency', className: 'currency' },
          { name: 'taxFree', label: 'Tax Free', format: 'currency', className: 'currency' },
          { name: 'taxDeferred', label: 'Tax Deferred', format: 'currency', className: 'currency' },
          { name: 'brokerage', label: 'Brokerage', format: 'currency', className: 'currency' },
          { name: 'espp', label: 'ESPP', format: 'currency', className: 'currency' },
          { name: 'hsa', label: 'HSA', format: 'currency', className: 'currency' },
          { name: 'cash', label: 'Cash', format: 'currency', className: 'currency' },
          { name: 'house', label: 'House', format: 'currency', className: 'currency' },
          { name: 'mortgage', label: 'Mortgage', format: 'currency', className: 'currency' },
          { name: 'othAsset', label: 'Other Assets', format: 'currency', className: 'currency' },
          { name: 'retirement', label: 'Retirement', format: 'currency', className: 'currency' },
          { name: 'othLia', label: 'Other Liabilities', format: 'currency', className: 'currency' },
          { name: 'homeImprovements', label: 'Home Improvements', format: 'currency', className: 'currency' }
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
      taxFree: 200000,
      taxDeferred: 150000,
      brokerage: 40000,
      espp: 5000,
      hsa: 25000,
      cash: 50000,
      house: 400000,
      mortgage: 150000,
      othAsset: 30000,
      retirement: 350000,
      othLia: 0,
      homeImprovements: 20000
    }
  };

  // Dynamically generate user-specific CSV headers
  const getUserHeaders = (userNames) => {
    return userNames.flatMap((user, idx) => [
      `${user} Employer`,
      `${user} Salary`,
      `${user} Bonus`
    ]);
  };

  // CSV headers: Year, [user columns...], [combined fields...]
  const csvHeaders = React.useMemo(() => {
    return [
      'Year',
      ...getUserHeaders(userNames),
      'AGI',
      'SSA Earnings',
      'Effective Tax Rate',
      'Taxes Paid',
      'Tax Free',
      'Tax Deferred',
      'Brokerage',
      'ESPP',
      'HSA',
      'Cash',
      'House',
      'Mortgage',
      'Other Assets',
      'Retirement',
      'Other Liabilities',
      'Home Improvements'
    ];
  }, [userNames]);

  // Format entry for CSV: output each user's employer/salary/bonus in separate columns
  const formatCSVRow = (entry) => {
    const row = [];
    row.push(entry.year);

    // Output each user's employer, salary, bonus in order of userNames
    userNames.forEach(user => {
      const userData = entry.users?.[user] || {};
      row.push(userData.employer || '');
      row.push(userData.salary || 0);
      row.push(userData.bonus || 0);
    });

    row.push(
      entry.agi || 0,
      entry.ssaEarnings || 0,
      entry.effectiveTaxRate || 0,
      entry.taxPaid || 0,
      entry.taxFree || 0,
      entry.taxDeferred || 0,
      entry.brokerage || 0,
      entry.espp || 0,
      entry.hsa || 0,
      entry.cash || 0,
      entry.house || 0,
      entry.mortgage || 0,
      entry.othAsset || 0,
      entry.retirement || 0,
      entry.othLia || 0,
      entry.homeImprovements || 0
    );
    return row;
  };

  // Parse CSV row: map user columns back to users object
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
      // Build users object from user columns
      const usersData = {};
      userNames.forEach(user => {
        usersData[user] = {
          employer: safeGetString(row[`${user} Employer`]),
          salary: safeParseFloat(row[`${user} Salary`]),
          bonus: safeParseFloat(row[`${user} Bonus`])
        };
      });
      
      return {
        year: year,
        users: usersData,
        agi: safeParseFloat(row['AGI']),
        ssaEarnings: safeParseFloat(row['SSA Earnings']),
        effectiveTaxRate: safeParseFloat(row['Effective Tax Rate']),
        taxPaid: safeParseFloat(row['Taxes Paid'] || row['Tax Paid']), // Support both old and new naming
        taxFree: safeParseFloat(row['Tax Free']),
        taxDeferred: safeParseFloat(row['Tax Deferred']),
        brokerage: safeParseFloat(row['Brokerage'] || row['R Brokerage']), // Support both old and new naming
        espp: safeParseFloat(row['ESPP']),
        hsa: safeParseFloat(row['HSA']),
        cash: safeParseFloat(row['Cash']),
        house: safeParseFloat(row['House']),
        mortgage: safeParseFloat(row['Mortgage']),
        othAsset: safeParseFloat(row['Other Assets']),
        retirement: safeParseFloat(row['Retirement']),
        othLia: safeParseFloat(row['Other Liabilities']),
        homeImprovements: safeParseFloat(row['Home Improvements'])
      };
    } catch (error) {
      console.error('Error parsing CSV row:', error, row);
      return null;
    }
  };

  // Add CSV upload guard: require name fields in Paycheck for "your" and (if dual calculator mode) "spouse"
  const handleBeforeCSVImport = () => {
    // Check for missing names in paycheckData
    const yourName = paycheckData?.your?.name?.trim();
    const dualMode = paycheckData?.settings?.showSpouseCalculator ?? true;
    const spouseName = paycheckData?.spouse?.name?.trim();

    if (!yourName) {
      alert(
        "Please fill out the Name field for 'Your' in the Paycheck Calculator before importing a CSV.\n\n" +
        "Go to the Paycheck Calculator and enter a name for yourself. This ensures your data is mapped correctly."
      );
      return false;
    }
    if (dualMode && !spouseName) {
      alert(
        "Please fill out the Name field for 'Spouse' in the Paycheck Calculator before importing a CSV.\n\n" +
        "Go to the Paycheck Calculator and enter a name for your spouse. This ensures your data is mapped correctly."
      );
      return false;
    }
    return true;
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
        sortField="year" // Default sort field  
        sortOrder="desc" // Default sort order
        csvTemplate={csvTemplate}
        parseCSVRow={parseCSVRow}
        formatCSVRow={formatCSVRow}
        csvHeaders={csvHeaders}
        beforeCSVImport={handleBeforeCSVImport}
      />
    </div>
  );
};

export default Historical;