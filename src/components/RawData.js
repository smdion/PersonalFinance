import React, { useEffect, useState } from 'react';
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
  initializeSharedAccounts,
  // Import asset liability data functions
  getAssetLiabilityData,
  // Import read-only override functions
  getReadOnlyOverrideSettings,
  setReadOnlyOverrideSettings,
  // Import paycheck data functions for dual calculator toggle
  getPaycheckData,
  setPaycheckData
} from '../utils/localStorage';
import DataManager from './DataManager';
import Navigation from './Navigation';
import { syncPerformanceAccountsFromLatestPortfolio, generateAccountName } from '../utils/portfolioPerformanceSync';

const RawData = () => {
  // State for read-only override
  const [readOnlyOverrideSettings, setReadOnlyOverrideSettingsState] = useState({
    disableReadOnlyMode: false
  });
  const [showReadOnlyWarning, setShowReadOnlyWarning] = useState(false);

  // Load read-only override settings on component mount
  useEffect(() => {
    const settings = getReadOnlyOverrideSettings();
    setReadOnlyOverrideSettingsState(settings);
  }, []);

  // Function to sync ALL Asset Liability data to Historical data
  const syncAssetLiabilityToHistorical = () => {
    try {
      const assetLiabilityData = getAssetLiabilityData();
      const historicalData = getHistoricalData();
      let hasChanges = false;

      // Get current year for asset/liability values (they apply to current year only)
      const currentYear = new Date().getFullYear().toString();

      // Initialize current year entry if it doesn't exist
      if (!historicalData[currentYear]) {
        historicalData[currentYear] = {};
      }

      // Sync house value
      if (assetLiabilityData.house && assetLiabilityData.house > 0) {
        historicalData[currentYear].house = assetLiabilityData.house;
        hasChanges = true;
      }

      // Sync mortgage
      if (assetLiabilityData.mortgage && assetLiabilityData.mortgage > 0) {
        historicalData[currentYear].mortgage = assetLiabilityData.mortgage;
        hasChanges = true;
      }

      // Sync other assets
      if (assetLiabilityData.othAsset && assetLiabilityData.othAsset > 0) {
        historicalData[currentYear].othAsset = assetLiabilityData.othAsset;
        hasChanges = true;
      }

      // Sync other liabilities
      if (assetLiabilityData.othLia && assetLiabilityData.othLia > 0) {
        historicalData[currentYear].othLia = assetLiabilityData.othLia;
        hasChanges = true;
      }

      // Get home improvements from house details and sync for ALL years
      const houseDetails = assetLiabilityData.houseDetails || [];
      const primaryHome = houseDetails.find(house => house.type === 'Primary Home');
      
      if (primaryHome && primaryHome.homeImprovements && primaryHome.homeImprovements.length > 0) {
        // Group improvements by year
        const improvementsByYear = {};
        primaryHome.homeImprovements.forEach((improvement) => {
          const year = improvement.year?.toString();
          if (year && !isNaN(parseInt(year))) {
            if (!improvementsByYear[year]) {
              improvementsByYear[year] = [];
            }
            improvementsByYear[year].push(improvement);
          }
        });

        // Update historical data for each year that has improvements
        Object.entries(improvementsByYear).forEach(([year, improvements]) => {
          // Initialize year entry if it doesn't exist
          if (!historicalData[year]) {
            historicalData[year] = {};
          }

          // Calculate total home improvements value for this year
          const totalValue = improvements.reduce((sum, improvement) => {
            const value = parseFloat(improvement.valueAdded) || 0;
            return sum + value;
          }, 0);

          // Only update if there's a meaningful value
          if (totalValue > 0) {
            historicalData[year].homeImprovements = totalValue;
            hasChanges = true;
          }
        });
      }

      // Save changes if any were made
      if (hasChanges) {
        setHistoricalData(historicalData);
      }

      return hasChanges;
    } catch (error) {
      console.error('Error syncing asset liability data to historical data:', error);
      return false;
    }
  };

  // Sync paycheck data and cleanup on component mount
  useEffect(() => {
    syncPaycheckToHistorical();
    cleanupJointDataFromHistorical();
    cleanupEmptyHistoricalEntries();
    // Initialize shared accounts system for performance data
    initializeSharedAccounts();
    // Sync to show only accounts from latest portfolio record
    syncPerformanceAccountsFromLatestPortfolio();
    // Sync ALL asset liability data to historical data
    syncAssetLiabilityToHistorical();
  }, []);

  // Listen for asset liability data updates to sync all asset liability data
  useEffect(() => {
    const handleAssetLiabilityUpdate = () => {
      syncAssetLiabilityToHistorical();
    };

    // Let TaxCalculator handle the dual calculator toggle
    // RawData will sync via paycheckDataUpdated event

    window.addEventListener('assetLiabilityDataUpdated', handleAssetLiabilityUpdate);
    
    return () => {
      window.removeEventListener('assetLiabilityDataUpdated', handleAssetLiabilityUpdate);
    };
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
          { name: 'homeImprovements', label: 'Home Improvements', format: 'currency', className: 'currency', readonly: true, lockedBy: 'Primary Home' },
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

  // Handle read-only override toggle
  const handleReadOnlyToggle = (enabled) => {
    if (enabled && !showReadOnlyWarning) {
      setShowReadOnlyWarning(true);
      return;
    }
    
    const newSettings = {
      ...readOnlyOverrideSettings,
      disableReadOnlyMode: enabled
    };
    
    // Update both localStorage and local state immediately
    setReadOnlyOverrideSettings(newSettings);
    setReadOnlyOverrideSettingsState(newSettings);
    
    if (!enabled) {
      setShowReadOnlyWarning(false);
    }
  };

  const confirmReadOnlyOverride = () => {
    const newSettings = {
      ...readOnlyOverrideSettings,
      disableReadOnlyMode: true
    };
    
    // Update both localStorage and local state immediately
    setReadOnlyOverrideSettings(newSettings);
    setReadOnlyOverrideSettingsState(newSettings);
    setShowReadOnlyWarning(false);
  };

  const cancelReadOnlyOverride = () => {
    setShowReadOnlyWarning(false);
  };

  return (
    <>
      <Navigation />
      <div className="app-container">
        <div className="header">
          <h1>📈 Annual & Account Data</h1>
          <p>Track Your Financial Journey and Account Performance Over Time</p>
        </div>

        {/* Read-Only Override Controls */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#374151' }}>
                🔒 Data Protection Settings
              </span>
              <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                Historical and Performance data are read-only by default
              </span>
            </div>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: readOnlyOverrideSettings.disableReadOnlyMode ? '#fef2f2' : '#f9fafb'
            }}>
              <input
                type="checkbox"
                checked={readOnlyOverrideSettings.disableReadOnlyMode}
                onChange={(e) => handleReadOnlyToggle(e.target.checked)}
                style={{ margin: 0 }}
              />
              <span style={{ 
                fontSize: '0.9rem', 
                fontWeight: '500',
                color: readOnlyOverrideSettings.disableReadOnlyMode ? '#dc2626' : '#374151'
              }}>
                {readOnlyOverrideSettings.disableReadOnlyMode ? '⚠️ Read-Only Protection Disabled' : 'Enable Read-Only Override'}
              </span>
            </label>
          </div>
          
          {readOnlyOverrideSettings.disableReadOnlyMode && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '1rem' }}>⚠️</span>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#dc2626', marginBottom: '4px' }}>
                    Warning: Read-Only Protection is Disabled
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#7f1d1d', lineHeight: '1.4' }}>
                    You can now edit Historical and Performance data directly. Most updates should be made through 
                    the Paycheck Calculator, Portfolio, Asset Manager, and other source components to maintain data consistency.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Warning Modal */}
        {showReadOnlyWarning && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              margin: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: '600', color: '#dc2626' }}>
                    Disable Read-Only Protection?
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#374151', lineHeight: '1.5' }}>
                    Historical and Performance data are normally read-only because they're automatically updated 
                    from other components (Paycheck Calculator, Portfolio, Asset Manager, etc.).
                  </p>
                </div>
              </div>
              
              <div style={{ 
                background: '#fef3c7', 
                border: '1px solid #f59e0b', 
                borderRadius: '6px', 
                padding: '12px', 
                marginBottom: '20px' 
              }}>
                <div style={{ fontSize: '0.85rem', color: '#92400e', lineHeight: '1.4' }}>
                  <strong>Important:</strong> Manually editing this data may cause inconsistencies. 
                  Most changes should be made through the source components to ensure data integrity 
                  and proper synchronization across the application.
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={cancelReadOnlyOverride}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    background: '#f9fafb',
                    color: '#374151',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReadOnlyOverride}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #dc2626',
                    background: '#dc2626',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}
                >
                  I Understand, Disable Protection
                </button>
              </div>
            </div>
          </div>
        )}

        <DataManager
          key={`historical-${readOnlyOverrideSettings.disableReadOnlyMode}`}
          title="Annual Data"
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
          disableReadOnly={readOnlyOverrideSettings.disableReadOnlyMode}
        />

        <DataManager
          key={`performance-${readOnlyOverrideSettings.disableReadOnlyMode}`}
          title="Account Data"
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
          disableReadOnly={readOnlyOverrideSettings.disableReadOnlyMode}
        />
      </div>
    </>
  );
};

export default RawData;