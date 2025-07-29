import React, { useEffect } from 'react';
import { 
  getPerformanceData, 
  setPerformanceData, 
  STORAGE_KEYS,
  // Import shared account functions
  getSharedAccounts,
  addOrUpdateSharedAccount,
  initializeSharedAccounts
} from '../utils/localStorage';
import DataManager from './DataManager';
import Navigation from './Navigation';
import { syncPerformanceAccountsFromLatestPortfolio, generateAccountName } from '../utils/portfolioPerformanceSync';

const Performance = () => {
  // Initialize shared accounts system on component mount
  useEffect(() => {
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
          { name: 'investmentCompany', label: 'Investment Company', type: 'text' }
        ]
      },
      {
        name: 'financial',
        title: '💰 Financial Data',
        fields: [
          { name: 'balance', label: 'Balance', format: 'currency', className: 'currency', readonly: true, lockedBy: 'Portfolio Component' },
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
          setData={handlePerformanceDataUpdate}
          schema={schema}
          usePaycheckUsers={true}
          primaryKey="entryId"
          sortField="year"
          sortOrder="desc"
          customParseCSVRow={customParseCSVRow}
        />
      </div>
    </>
  );
};

export default Performance;
