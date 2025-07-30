import React, { useEffect } from 'react';
import { 
  getHistoricalData, 
  setHistoricalData, 
  STORAGE_KEYS,
  syncPaycheckToHistorical,
  cleanupJointDataFromHistorical,
  cleanupEmptyHistoricalEntries,
  // Import performance data functions
  getPerformanceData, 
  setPerformanceData,
  // Import shared account functions
  getSharedAccounts,
  addOrUpdateSharedAccount,
  initializeSharedAccounts
} from '../utils/localStorage';
import DataManager from './DataManager';
import Navigation from './Navigation';
import { syncPerformanceAccountsFromLatestPortfolio, generateAccountName } from '../utils/portfolioPerformanceSync';

const Historical = () => {
  // Sync paycheck data and cleanup on component mount
  useEffect(() => {
    syncPaycheckToHistorical();
    cleanupJointDataFromHistorical();
    cleanupEmptyHistoricalEntries();
    // Initialize shared accounts system for performance data
    initializeSharedAccounts();
    // Sync to show only accounts from latest portfolio record
    syncPerformanceAccountsFromLatestPortfolio();
  }, []);

  // Custom function to handle when Performance data is updated
  const handlePerformanceDataUpdate = (data) => {
    // First save the data normally
    const result = setPerformanceData(data);
    
    // Then sync accounts to shared system (only from latest portfolio)
    if (result) {
      syncPerformanceAccountsFromLatestPortfolio();
    }
    
    return result;
  };

  // Custom CSV parsing that updates shared accounts
  const customParseCSVRow = (row, generateEntryId, userNames) => {
    if (!row || typeof row !== 'object') {
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
      const entry = {
        entryId: generateEntryId(),
        year: safeParseInt(row['year'] || row['Year'])
      };

      // Handle user fields - parse all user columns (including Joint)
      const ownerOptions = [...userNames, 'Joint'];
      entry.users = {};
      
      ownerOptions.forEach(ownerName => {
        const userData = {};
        
        // Parse account fields
        const dashAccountName = `${ownerName}-accountName`;
        const underscoreAccountName = `${ownerName}_accountName`;
        const accountName = safeGetString(row[dashAccountName] ?? row[underscoreAccountName] ?? '');
        
        const dashAccountType = `${ownerName}-accountType`;
        const underscoreAccountType = `${ownerName}_accountType`;
        const accountType = safeGetString(row[dashAccountType] ?? row[underscoreAccountType] ?? '');
        
        const dashInvestmentCompany = `${ownerName}-investmentCompany`;
        const underscoreInvestmentCompany = `${ownerName}_investmentCompany`;
        const investmentCompany = safeGetString(row[dashInvestmentCompany] ?? row[underscoreInvestmentCompany] ?? '');
        
        userData.accountName = accountName;
        userData.accountType = accountType;
        userData.investmentCompany = investmentCompany;
        
        // Generate consistent account name if we have the required fields
        if (accountType && investmentCompany) {
          userData.generatedAccountName = generateAccountName(
            ownerName,
            '', // Performance doesn't track tax type
            accountType,
            investmentCompany
          );
        }
        
        // Parse financial fields
        ['balance', 'contributions', 'employerMatch', 'gains', 'fees', 'withdrawals'].forEach(field => {
          const dashKey = `${ownerName}-${field}`;
          const underscoreKey = `${ownerName}_${field}`;
          const value = row[dashKey] ?? row[underscoreKey] ?? '';
          userData[field] = safeParseFloat(value);
        });
        
        // Only add user data if it has meaningful content
        const hasData = accountName || accountType || Object.values(userData).some(v => 
          typeof v === 'number' && v !== 0
        );
        
        if (hasData) {
          entry.users[ownerName] = userData;
          
          // Add to shared accounts if this is a valid account
          if (accountName && accountType) {
            addOrUpdateSharedAccount({
              accountName: accountName,
              owner: ownerName,
              accountType: accountType,
              investmentCompany: investmentCompany,
              taxType: '', // Performance doesn't track tax type
              source: 'performance'
            });
          }
        }
      });

      // Parse other fields
      ['balance', 'contributions', 'employerMatch', 'gains', 'fees', 'withdrawals'].forEach(field => {
        const value = row[field];
        if (value !== undefined && value !== null && value !== '') {
          entry[field] = safeParseFloat(value);
        }
      });

      return entry;
    } catch (error) {
      console.error('Error parsing CSV row:', error);
      return null;
    }
  };

  // Schema configuration for Historical DataManager
  const historicalSchema = {
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
          { name: 'agi', label: 'AGI', format: 'currency', className: 'currency', readonly: true, lockedBy: 'Paycheck Calculator' },
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

  // Schema configuration for Performance DataManager
  const performanceSchema = {
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
          { name: 'investmentCompany', label: 'Investment Company', type: 'text' }
        ]
      },
      {
        name: 'financial',
        title: '💰 Financial Data',
        fields: [
          { name: 'balance', label: 'Balance', format: 'currency', className: 'currency', readonly: true, lockedBy: 'Portfolio Component' },
          { name: 'contributions', label: 'Contributions', format: 'currency', className: 'currency', readonly: true, lockedBy: 'Portfolio Component (current year)' },
          { name: 'employerMatch', label: 'Employer Match', format: 'currency', className: 'currency', readonly: true, lockedBy: 'Portfolio Component (current year)' },
          { name: 'gains', label: 'Gains/Losses', format: 'currency', className: 'currency', readonly: true, lockedBy: 'Portfolio Component (current year)' },
          { name: 'fees', label: 'Fees', format: 'currency', className: 'currency', readonly: true, lockedBy: 'Portfolio Component (current year)' },
          { name: 'withdrawals', label: 'Withdrawals', format: 'currency', className: 'currency', readonly: true, lockedBy: 'Portfolio Component (current year)' }
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
          schema={historicalSchema}
          usePaycheckUsers={true}
          primaryKey="year"
          sortField="year"
          sortOrder="desc"
          itemsPerPage={10}
        />

        <DataManager
          title="Performance Data"
          subtitle="Account performance data synced from Portfolio component"
          dataKey={STORAGE_KEYS.PERFORMANCE_DATA}
          getData={getPerformanceData}
          setData={handlePerformanceDataUpdate}
          schema={performanceSchema}
          usePaycheckUsers={true}
          primaryKey="entryId"
          sortField="year"
          sortOrder="desc"
          customParseCSVRow={customParseCSVRow}
          itemsPerPage={10}
        />
      </div>
    </>
  );
};

export default Historical;