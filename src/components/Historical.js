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
    'year',
    'user1_name', 'user1_employer', 'user1_salary', 'user1_bonus',
    'user2_name', 'user2_employer', 'user2_salary', 'user2_bonus',
    'agi', 'ssaEarnings', 'effectiveTaxRate', 'taxPaid',
    'netWorthPlus', 'netWorthMinus', 'taxFree', 'taxDeferred',
    'rBrokerage', 'ltBrokerage', 'espp', 'hsa', 'cash',
    'house', 'mortgage', 'othAsset', 'retirement', 'othLia',
    'homeImprovements', 'liabilities'
  ];

  // Format entry for CSV
  const formatCSVRow = (yearEntry) => [
    yearEntry.year,
    yearEntry.users?.user1?.name || '',
    yearEntry.users?.user1?.employer || '',
    yearEntry.users?.user1?.salary || 0,
    yearEntry.users?.user1?.bonus || 0,
    yearEntry.users?.user2?.name || '',
    yearEntry.users?.user2?.employer || '',
    yearEntry.users?.user2?.salary || 0,
    yearEntry.users?.user2?.bonus || 0,
    yearEntry.agi || 0,
    yearEntry.ssaEarnings || 0,
    yearEntry.effectiveTaxRate || 0,
    yearEntry.taxPaid || 0,
    yearEntry.netWorthPlus || 0,
    yearEntry.netWorthMinus || 0,
    yearEntry.taxFree || 0,
    yearEntry.taxDeferred || 0,
    yearEntry.rBrokerage || 0,
    yearEntry.ltBrokerage || 0,
    yearEntry.espp || 0,
    yearEntry.hsa || 0,
    yearEntry.cash || 0,
    yearEntry.house || 0,
    yearEntry.mortgage || 0,
    yearEntry.othAsset || 0,
    yearEntry.retirement || 0,
    yearEntry.othLia || 0,
    yearEntry.homeImprovements || 0,
    yearEntry.liabilities || 0
  ];

  // Parse CSV row
  const parseCSVRow = (headers, values) => {
    const year = parseInt(values[0]);
    
    if (!year || year < 1900 || year > 2100) return null;
    
    return {
      year: year,
      users: {
        user1: {
          name: values[1] || '',
          employer: values[2] || '',
          salary: parseFloat(values[3]) || 0,
          bonus: parseFloat(values[4]) || 0
        },
        user2: {
          name: values[5] || '',
          employer: values[6] || '',
          salary: parseFloat(values[7]) || 0,
          bonus: parseFloat(values[8]) || 0
        }
      },
      agi: parseFloat(values[9]) || 0,
      ssaEarnings: parseFloat(values[10]) || 0,
      effectiveTaxRate: parseFloat(values[11]) || 0,
      taxPaid: parseFloat(values[12]) || 0,
      netWorthPlus: parseFloat(values[13]) || 0,
      netWorthMinus: parseFloat(values[14]) || 0,
      taxFree: parseFloat(values[15]) || 0,
      taxDeferred: parseFloat(values[16]) || 0,
      rBrokerage: parseFloat(values[17]) || 0,
      ltBrokerage: parseFloat(values[18]) || 0,
      espp: parseFloat(values[19]) || 0,
      hsa: parseFloat(values[20]) || 0,
      cash: parseFloat(values[21]) || 0,
      house: parseFloat(values[22]) || 0,
      mortgage: parseFloat(values[23]) || 0,
      othAsset: parseFloat(values[24]) || 0,
      retirement: parseFloat(values[25]) || 0,
      othLia: parseFloat(values[26]) || 0,
      homeImprovements: parseFloat(values[27]) || 0,
      liabilities: parseFloat(values[28]) || 0
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