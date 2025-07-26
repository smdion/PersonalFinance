import React, { useState, useEffect } from 'react';
import { getPerformanceData, setPerformanceData, STORAGE_KEYS, getPaycheckData } from '../utils/localStorage';
import { calculateROI } from '../utils/calculationHelpers';
import DataManager from './DataManager';

const Performance = () => {
  // Schema configuration for DataManager
  const schema = {
    primaryKeyLabel: 'Entry ID',
    primaryKeyType: 'text',
    sections: [
      {
        name: 'account',
        title: '📊 Account Information',
        fields: [
          { name: 'accountName', label: 'Account Name', type: 'text' },
          { name: 'accountType', label: 'Account Type', type: 'text' },
          { name: 'employer', label: 'Employer', type: 'text' },
          { name: 'year', label: 'Year', type: 'number', min: 1900, max: 2100 }
        ]
      },
      {
        name: 'financial',
        title: '💰 Financial Data',
        fields: [
          { name: 'balance', label: 'Balance', format: 'currency', className: 'currency' },
          { name: 'contributions', label: 'Contributions', format: 'currency', className: 'currency' },
          { name: 'employerMatch', label: 'Employer Match', format: 'currency', className: 'currency' },
          { name: 'gains', label: 'Gains/Losses', format: 'currency', className: 'currency' },
          { name: 'fees', label: 'Fees', format: 'currency', className: 'currency' },
          { name: 'withdrawals', label: 'Withdrawals', format: 'currency', className: 'currency' }
        ]
      }
    ]
  };

  // Generate unique ID for entries
  const generateEntryId = () => {
    return `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Empty form data structure
  const emptyFormData = {
    entryId: generateEntryId(),
    accountName: '',
    accountType: '',
    employer: '',
    year: new Date().getFullYear(),
    balance: '',
    contributions: '',
    employerMatch: '',
    gains: '',
    fees: '',
    withdrawals: ''
  };

  // Convert stored entry to form data
  const getFormDataFromEntry = (entry) => ({
    entryId: entry.entryId,
    accountName: entry.accountName || '',
    accountType: entry.accountType || '',
    employer: entry.employer || '',
    year: entry.year || '',
    balance: entry.balance || '',
    contributions: entry.contributions || '',
    employerMatch: entry.employerMatch || '',
    gains: entry.gains || '',
    fees: entry.fees || '',
    withdrawals: entry.withdrawals || ''
  });

  // Convert form data to stored entry
  const getEntryFromFormData = (formData) => ({
    entryId: formData.entryId,
    accountName: formData.accountName,
    accountType: formData.accountType,
    employer: formData.employer,
    year: formData.year,
    balance: formData.balance,
    contributions: formData.contributions,
    employerMatch: formData.employerMatch,
    gains: formData.gains,
    fees: formData.fees,
    withdrawals: formData.withdrawals
  });

  // Parse CSV row
  const parseCSVRow = (headers, values) => {
    const entryId = values[0];
    
    if (!entryId) return null;
    
    const gains = parseFloat(values[8]) || 0;
    const fees = parseFloat(values[9]) || 0;
    const balance = parseFloat(values[5]) || 0;
    const parsedYear = parseInt(values[4]);
    const year = !isNaN(parsedYear) ? parsedYear : '';
    
    return {
      entryId: entryId,
      accountName: values[1] || '',
      accountType: values[2] || '',
      employer: values[3] || '',
      year: year,
      balance: balance,
      contributions: parseFloat(values[6]) || 0,
      employerMatch: parseFloat(values[7]) || 0,
      gains: gains,
      fees: fees,
      withdrawals: parseFloat(values[10]) || 0,
      // Calculate derived fields using utility function
      totalContributions: (parseFloat(values[6]) || 0) + (parseFloat(values[7]) || 0),
      netGains: gains - fees,
      roi: balance > 0 ? calculateROI(gains, fees, balance) : 0
    };
  };

  // Format entry for CSV
  const formatCSVRow = (entry) => [
    entry.entryId,
    entry.accountName || '',
    entry.accountType || '',
    entry.employer || '',
    entry.year || '',
    entry.balance || 0,
    entry.contributions || 0,
    entry.employerMatch || 0,
    entry.gains || 0,
    entry.fees || 0,
    entry.withdrawals || 0
  ];

  // Add CSV upload guard: require name fields in Paycheck for "your" and (if dual calculator mode) "spouse"
  const [paycheckData, setPaycheckDataState] = useState(null);

  useEffect(() => {
    setPaycheckDataState(getPaycheckData());
  }, []);

  const handleBeforeCSVImport = () => {
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
        <h1>📊 Account Performance Tracker</h1>
        <p>Track Investment Account Performance and Returns</p>
      </div>

      <DataManager
        title="Performance Data"
        subtitle="Add your first account entry to start tracking performance"
        dataKey={STORAGE_KEYS.PERFORMANCE_DATA}
        getData={getPerformanceData}
        setData={setPerformanceData}
        schema={schema}
        userNames={[]} // No user-specific fields for performance data
        emptyFormData={emptyFormData}
        getFormDataFromEntry={getFormDataFromEntry}
        getEntryFromFormData={getEntryFromFormData}
        primaryKey="entryId"
        sortField="year"
        sortOrder="desc"
        csvTemplate={{}} // Provide an empty object or your template if needed
        parseCSVRow={parseCSVRow}
        formatCSVRow={formatCSVRow}
        csvHeaders={[
          'entryId', 'accountName', 'accountType', 'employer', 'year',
          'balance', 'contributions', 'employerMatch', 'gains', 'fees', 'withdrawals'
        ]}
        fieldCssClasses={{
          accountName: 'performance-account-cell',
          accountType: 'performance-account-cell',
          employer: 'performance-account-cell',
          year: 'performance-account-cell'
        }}
        beforeCSVImport={handleBeforeCSVImport}
      />
    </div>
  );
};

export default Performance;
