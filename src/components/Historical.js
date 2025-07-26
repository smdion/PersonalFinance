import React, { useState, useEffect } from 'react';
import { getHistoricalData, setHistoricalData, getPaycheckData } from '../utils/localStorage';
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
  const formatCSVRow = (entry) => ({
    Year: entry.year,
    Employer: entry.users?.employer || '',
    Salary: entry.users?.salary || 0,
    Bonus: entry.users?.bonus || 0,
    AGI: entry.financial?.agi || 0,
    'SSA Earnings': entry.financial?.ssaEarnings || 0,
    'Effective Tax Rate': entry.financial?.effectiveTaxRate || 0,
    'Tax Paid': entry.financial?.taxPaid || 0,
    'Net Worth Plus': entry.financial?.netWorthPlus || 0,
    'Net Worth Minus': entry.financial?.netWorthMinus || 0,
    'Tax Free': entry.financial?.taxFree || 0,
    'Tax Deferred': entry.financial?.taxDeferred || 0,
    'R Brokerage': entry.financial?.rBrokerage || 0,
    'LT Brokerage': entry.financial?.ltBrokerage || 0,
    'ESPP': entry.financial?.espp || 0,
    'HSA': entry.financial?.hsa || 0,
    'Cash': entry.financial?.cash || 0,
    'House': entry.financial?.house || 0,
    'Mortgage': entry.financial?.mortgage || 0,
    'Other Assets': entry.financial?.othAsset || 0,
    'Retirement': entry.financial?.retirement || 0,
    'Other Liabilities': entry.financial?.othLia || 0,
    'Home Improvements': entry.financial?.homeImprovements || 0,
    'Liabilities': entry.financial?.liabilities || 0
  });

  // Parse CSV row
  const parseCSVRow = (row) => {
    const year = parseInt(row['Year']);
    
    if (!year || year < 1900 || year > 2100) return null;
    
    return {
      year: year,
      users: {
        employer: row['Employer'] || '',
        salary: parseFloat(row['Salary']) || 0,
        bonus: parseFloat(row['Bonus']) || 0
      },
      financial: {
        agi: parseFloat(row['AGI']) || 0,
        ssaEarnings: parseFloat(row['SSA Earnings']) || 0,
        effectiveTaxRate: parseFloat(row['Effective Tax Rate']) || 0,
        taxPaid: parseFloat(row['Tax Paid']) || 0,
        netWorthPlus: parseFloat(row['Net Worth Plus']) || 0,
        netWorthMinus: parseFloat(row['Net Worth Minus']) || 0,
        taxFree: parseFloat(row['Tax Free']) || 0,
        taxDeferred: parseFloat(row['Tax Deferred']) || 0,
        rBrokerage: parseFloat(row['R Brokerage']) || 0,
        ltBrokerage: parseFloat(row['LT Brokerage']) || 0,
        espp: parseFloat(row['ESPP']) || 0,
        hsa: parseFloat(row['HSA']) || 0,
        cash: parseFloat(row['Cash']) || 0,
        house: parseFloat(row['House']) || 0,
        mortgage: parseFloat(row['Mortgage']) || 0,
        othAsset: parseFloat(row['Other Assets']) || 0,
        retirement: parseFloat(row['Retirement']) || 0,
        othLia: parseFloat(row['Other Liabilities']) || 0,
        homeImprovements: parseFloat(row['Home Improvements']) || 0,
        liabilities: parseFloat(row['Liabilities']) || 0
      }
    };
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
        dataKey="historical_data"
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