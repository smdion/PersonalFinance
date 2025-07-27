import React from 'react';
import { 
  getPerformanceData, 
  setPerformanceData, 
  STORAGE_KEYS 
} from '../utils/localStorage';
import DataManager from './DataManager';
import Navigation from './Navigation';

const Performance = () => {
  // Schema configuration for DataManager
  const schema = {
    primaryKeyLabel: 'Entry ID',
    primaryKeyType: 'text',
    sections: [
      {
        name: 'basic',
        title: '📊 Basic Information',
        fields: [
          { name: 'year', label: 'Year', type: 'number', min: 1900, max: 2100 }
        ]
      },
      {
        name: 'users',
        title: '👥 Account Owners',
        fields: [
          { name: 'accountName', label: 'Account Name', type: 'text' },
          { name: 'accountType', label: 'Account Type', type: 'text' },
          { name: 'employer', label: 'Employer', type: 'text' }
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

  return (
    <>
      <Navigation />
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
          usePaycheckUsers={true}
          primaryKey="entryId"
          sortField="year"
          sortOrder="desc"
        />
      </div>
    </>
  );
};

export default Performance;
