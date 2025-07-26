import React, { useState, useEffect } from 'react';
import { getPerformanceData, setPerformanceData } from '../utils/localStorage';
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
          { name: 'year', label: 'Year', type: 'number' }
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
    entryId: formData.entryId || generateEntryId(),
    accountName: formData.accountName,
    accountType: formData.accountType,
    employer: formData.employer,
    year: formData.year,
    balance: parseFloat(formData.balance) || 0,
    contributions: parseFloat(formData.contributions) || 0,
    employerMatch: parseFloat(formData.employerMatch) || 0,
    gains: parseFloat(formData.gains) || 0,
    fees: parseFloat(formData.fees) || 0,
    withdrawals: parseFloat(formData.withdrawals) || 0,
    // Calculate derived fields
    totalContributions: (parseFloat(formData.contributions) || 0) + (parseFloat(formData.employerMatch) || 0),
    netGains: (parseFloat(formData.gains) || 0) - (parseFloat(formData.fees) || 0),
    roi: (parseFloat(formData.balance) || 0) > 0 ? 
      (((parseFloat(formData.gains) || 0) - (parseFloat(formData.fees) || 0)) / (parseFloat(formData.balance) || 1)) * 100 : 0
  });

  // CSV template data
  const csvTemplate = {
    'sample_entry_1': {
      entryId: 'sample_entry_1',
      accountName: 'Company 401k',
      accountType: 'Traditional 401k',
      employer: 'Tech Corp',
      year: 2024,
      balance: 50000,
      contributions: 8000,
      employerMatch: 4000,
      gains: 5000,
      fees: 100,
      withdrawals: 0,
      totalContributions: 12000,
      netGains: 4900,
      roi: 9.8
    }
  };

  // CSV headers
  const csvHeaders = [
    'entryId', 'accountName', 'accountType', 'employer', 'year',
    'balance', 'contributions', 'employerMatch', 'gains', 'fees', 'withdrawals'
  ];

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

  // Parse CSV row
  const parseCSVRow = (headers, values) => {
    const entryId = values[0];
    
    if (!entryId) return null;
    
    return {
      entryId: entryId,
      accountName: values[1] || '',
      accountType: values[2] || ACCOUNT_TYPES[0],
      employer: values[3] || '',
      year: parseInt(values[4]) || '',
      balance: parseFloat(values[5]) || 0,
      contributions: parseFloat(values[6]) || 0,
      employerMatch: parseFloat(values[7]) || 0,
      gains: parseFloat(values[8]) || 0,
      fees: parseFloat(values[9]) || 0,
      withdrawals: parseFloat(values[10]) || 0,
      // Calculate derived fields
      totalContributions: (parseFloat(values[6]) || 0) + (parseFloat(values[7]) || 0),
      netGains: (parseFloat(values[8]) || 0) - (parseFloat(values[9]) || 0),
      roi: (parseFloat(values[5]) || 0) > 0 ? 
        (((parseFloat(values[8]) || 0) - (parseFloat(values[9]) || 0)) / (parseFloat(values[5]) || 1)) * 100 : 0
    };
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
        dataKey="performance_data"
        getData={getPerformanceData}
        setData={setPerformanceData}
        schema={schema}
        userNames={[]} // No user-specific fields for performance data
        emptyFormData={emptyFormData}
        getFormDataFromEntry={getFormDataFromEntry}
        getEntryFromFormData={getEntryFromFormData}
        primaryKey="entryId"
        sortField="entryDate"
        sortOrder="desc"
        csvTemplate={csvTemplate}
        parseCSVRow={parseCSVRow}
        formatCSVRow={formatCSVRow}
        csvHeaders={csvHeaders}
      />
    </div>
  );
};

export default Performance;
