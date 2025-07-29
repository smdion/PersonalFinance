import React, { useEffect } from 'react';
import { 
  getHistoricalData, 
  setHistoricalData, 
  STORAGE_KEYS,
  syncPaycheckToHistorical,
  cleanupJointDataFromHistorical 
} from '../utils/localStorage';
import DataManager from './DataManager';
import Navigation from './Navigation';

const Historical = () => {
  // Sync paycheck data and cleanup joint data on component mount
  useEffect(() => {
    syncPaycheckToHistorical();
    cleanupJointDataFromHistorical();
  }, []);

  // Schema configuration for DataManager
  const schema = {
    primaryKeyLabel: 'Year',
    primaryKeyType: 'number',
    sections: [
      {
        name: 'users',
        title: '👥 User Information',
        fields: [
          { name: 'employer', label: 'Employer', type: 'text', readonly: true, lockedBy: 'Paycheck Calculator' },
          { name: 'salary', label: 'Salary', format: 'currency', className: 'currency', readonly: true, lockedBy: 'Paycheck Calculator' },
          { name: 'bonus', label: 'Bonus', format: 'currency', className: 'currency', readonly: true, lockedBy: 'Paycheck Calculator' }
        ]
      },
      {
        name: 'taxes',
        title: '💰 Tax Information',
        fields: [
          { name: 'agi', label: 'AGI', format: 'currency', className: 'currency' },
          { name: 'ssaEarnings', label: 'SSA Earnings', format: 'currency', className: 'currency' },
          { name: 'effectiveTaxRate', label: 'Effective Tax Rate', type: 'number', step: '0.001', className: 'percentage' },
          { name: 'taxPaid', label: 'Tax Paid', format: 'currency', className: 'currency' }
        ]
      },
      {
        name: 'investments',
        title: '📈 Investments',
        fields: [
          { name: 'taxFree', label: 'Tax-Free', format: 'currency', className: 'currency', readonly: true, lockedBy: 'Portfolio Component' },
          { name: 'taxDeferred', label: 'Tax-Deferred', format: 'currency', className: 'currency', readonly: true, lockedBy: 'Portfolio Component' },
          { name: 'brokerage', label: 'Brokerage', format: 'currency', className: 'currency', readonly: true, lockedBy: 'Portfolio Component' },
          { name: 'espp', label: 'ESPP', format: 'currency', className: 'currency', readonly: true, lockedBy: 'Portfolio Component' },
          { name: 'hsa', label: 'HSA', format: 'currency', className: 'currency', readonly: true, lockedBy: 'Portfolio Component' },
          { name: 'cash', label: 'Cash', format: 'currency', className: 'currency' }
        ]
      },
      {
        name: 'assets',
        title: '🏠 Assets & Liabilities',
        fields: [
          { name: 'house', label: 'House Value', format: 'currency', className: 'currency', readonly: true, lockedBy: 'Asset Manager' },
          { name: 'homeImprovements', label: 'Home Improvements', format: 'currency', className: 'currency' },
          { name: 'mortgage', label: 'Mortgage', format: 'currency', className: 'currency', readonly: true, lockedBy: 'Liability Manager' },
          { name: 'othAsset', label: 'Assets', format: 'currency', className: 'currency', readonly: true, lockedBy: 'Asset Manager' },
          { name: 'othLia', label: 'Other Liabilities', format: 'currency', className: 'currency', readonly: true, lockedBy: 'Liability Manager' }
        ]
      }
    ]
  };

  return (
    <>
      <Navigation />
      <div className="app-container">
        <div className="header">
          <h1>📈 Historical Data Tracker</h1>
          <p>Track Your Financial Journey Over Time</p>
        </div>

        <DataManager
          title="Historical Data"
          subtitle="Add your first year of data to start tracking your financial progress"
          dataKey={STORAGE_KEYS.HISTORICAL_DATA}
          getData={getHistoricalData}
          setData={setHistoricalData}
          schema={schema}
          usePaycheckUsers={true}
          primaryKey="year"
          sortField="year"
          sortOrder="desc"
        />
      </div>
    </>
  );
};

export default Historical;