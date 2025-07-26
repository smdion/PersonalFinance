import React, { useState, useEffect } from 'react';
import { getHistoricalData, setHistoricalData, getPaycheckData, STORAGE_KEYS } from '../utils/localStorage';
import DataManager from './DataManager';

// Define combined fields for CSV export
const COMBINED_FIELDS = [
  'agi', 'ssaEarnings', 'effectiveTaxRate', 'taxPaid',
  'taxFree', 'taxDeferred', 'brokerage', 'espp', 'hsa', 'cash', 'house',
  'homeImprovements', 'mortgage', 'othAsset', 'othLia'
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
          { name: 'homeImprovements', label: 'Home Improvements', format: 'currency', className: 'currency' },
          { name: 'mortgage', label: 'Mortgage', format: 'currency', className: 'currency' },
          { name: 'othAsset', label: 'Other Assets', format: 'currency', className: 'currency' },
          { name: 'othLia', label: 'Other Liabilities', format: 'currency', className: 'currency' }
        ]
      }
    ]
  };

  // Empty form data structure
  const emptyFormData = {
    year: currentYear,
    users: userNames.reduce((acc, name) => ({
      ...acc,
      [name]: {
        employer: '',
        salary: '',
        bonus: ''
      }
    }), {}),
    agi: '',
    ssaEarnings: '',
    effectiveTaxRate: '',
    taxPaid: '',
    taxFree: '',
    taxDeferred: '',
    brokerage: '',
    espp: '',
    hsa: '',
    cash: '',
    house: '',
    homeImprovements: '',
    mortgage: '',
    othAsset: '',
    othLia: ''
  };

  // Convert stored entry to form data
  const getFormDataFromEntry = (entry) => ({
    year: entry.year || '',
    users: entry.users || userNames.reduce((acc, name) => ({
      ...acc,
      [name]: {
        employer: '',
        salary: '',
        bonus: ''
      }
    }), {}),
    agi: entry.agi || '',
    ssaEarnings: entry.ssaEarnings || '',
    effectiveTaxRate: entry.effectiveTaxRate || '',
    taxPaid: entry.taxPaid || '',
    taxFree: entry.taxFree || '',
    taxDeferred: entry.taxDeferred || '',
    brokerage: entry.brokerage || '',
    espp: entry.espp || '',
    hsa: entry.hsa || '',
    cash: entry.cash || '',
    house: entry.house || '',
    homeImprovements: entry.homeImprovements || '',
    mortgage: entry.mortgage || '',
    othAsset: entry.othAsset || '',
    othLia: entry.othLia || ''
  });

  // Convert form data to stored entry
  const getEntryFromFormData = (formData) => ({
    year: formData.year,
    users: formData.users,
    agi: formData.agi,
    ssaEarnings: formData.ssaEarnings,
    effectiveTaxRate: formData.effectiveTaxRate,
    taxPaid: formData.taxPaid,
    taxFree: formData.taxFree,
    taxDeferred: formData.taxDeferred,
    brokerage: formData.brokerage,
    espp: formData.espp,
    hsa: formData.hsa,
    cash: formData.cash,
    house: formData.house,
    homeImprovements: formData.homeImprovements,
    mortgage: formData.mortgage,
    othAsset: formData.othAsset,
    othLia: formData.othLia
  });

  // Parse CSV row
  const parseCSVRow = (row) => {
    if (!row || typeof row !== 'object') {
      console.warn('Invalid CSV row format:', row);
      return null;
    }
    
    const safeParseFloat = (value) => {
      if (value === null || value === undefined || value === '') return '';
      const parsed = parseFloat(value);
      return isNaN(parsed) ? '' : parsed;
    };
    
    const safeGetString = (value) => {
      if (value === null || value === undefined) return '';
      return String(value).trim();
    };
    
    const safeParseInt = (value) => {
      if (value === null || value === undefined || value === '') return '';
      const parsed = parseInt(value);
      return isNaN(parsed) ? '' : parsed;
    };
    
    try {
      return {
        year: safeParseInt(row['year'] || row['Year']),
        users: userNames.reduce((acc, name) => ({
          ...acc,
          [name]: {
            employer: safeGetString(row[`${name}_employer`] || row[`${name} Employer`]),
            salary: safeParseFloat(row[`${name}_salary`] || row[`${name} Salary`]),
            bonus: safeParseFloat(row[`${name}_bonus`] || row[`${name} Bonus`])
          }
        }), {}),
        agi: safeParseFloat(row['agi'] || row['AGI']),
        ssaEarnings: safeParseFloat(row['ssaEarnings'] || row['SSA Earnings']),
        effectiveTaxRate: safeParseFloat(row['effectiveTaxRate'] || row['Effective Tax Rate']),
        taxPaid: safeParseFloat(row['taxPaid'] || row['Tax Paid']),
        taxFree: safeParseFloat(row['taxFree'] || row['Tax Free']),
        taxDeferred: safeParseFloat(row['taxDeferred'] || row['Tax Deferred']),
        brokerage: safeParseFloat(row['brokerage'] || row['Brokerage']),
        espp: safeParseFloat(row['espp'] || row['ESPP']),
        hsa: safeParseFloat(row['hsa'] || row['HSA']),
        cash: safeParseFloat(row['cash'] || row['Cash']),
        house: safeParseFloat(row['house'] || row['House']),
        homeImprovements: safeParseFloat(row['homeImprovements'] || row['Home Improvements']),
        mortgage: safeParseFloat(row['mortgage'] || row['Mortgage']),
        othAsset: safeParseFloat(row['othAsset'] || row['Other Assets']),
        othLia: safeParseFloat(row['othLia'] || row['Other Liabilities'])
      };
    } catch (error) {
      console.error('Error parsing CSV row:', error, row);
      return null;
    }
  };

  // Format entry for CSV
  const formatCSVRow = (entry) => {
    const row = [entry.year || ''];
    
    // Add user fields
    userNames.forEach(name => {
      row.push(
        entry.users?.[name]?.employer || '',
        entry.users?.[name]?.salary || '',
        entry.users?.[name]?.bonus || ''
      );
    });
    
    // Add financial fields
    COMBINED_FIELDS.forEach(field => {
      row.push(entry[field] || '');
    });
    
    return row;
  };

  // CSV headers
  const csvHeaders = ['year'];
  userNames.forEach(name => {
    csvHeaders.push(`${name}_employer`, `${name}_salary`, `${name}_bonus`);
  });
  csvHeaders.push(...COMBINED_FIELDS);

  return (
    <div className="app-container">
      <div className="header">
        <h1>📈 Historical Data Tracker</h1>
        <p>Track Your Financial Progress Year Over Year</p>
      </div>

      <DataManager
        title="Historical Data"
        subtitle="Add your first year's data to start tracking progress"
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
        csvTemplate={{}}
        parseCSVRow={parseCSVRow}
        formatCSVRow={formatCSVRow}
        csvHeaders={csvHeaders}
        fieldCssClasses={{
          year: 'historical-year-cell'
        }}
      />
    </div>
  );
};

export default Historical;