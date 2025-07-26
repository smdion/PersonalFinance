import React, { useState, useEffect } from 'react';
import { getPerformanceData, setPerformanceData, STORAGE_KEYS } from '../utils/localStorage';
import { calculateROI } from '../utils/calculationHelpers';
import DataManager from './DataManager';

// Account types for dropdown
const ACCOUNT_TYPES = [
  'Traditional 401k',
  'Roth 401k',
  'Traditional IRA',
  'Roth IRA',
  'HSA',
  'Regular Brokerage',
  'ESPP',
  'Pension',
  'Cash/Savings',
  'CD',
  'Money Market',
  'Other'
];

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
          { name: 'accountType', label: 'Account Type', type: 'select', options: ACCOUNT_TYPES },
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
    accountType: ACCOUNT_TYPES[0],
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
    accountType: entry.accountType || ACCOUNT_TYPES[0],
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
      accountType: values[2] || ACCOUNT_TYPES[0],
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
      />
    </div>
  );
};

export default Performance;
