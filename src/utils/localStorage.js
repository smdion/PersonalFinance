// Centralized localStorage utilities for consistent data persistence

// Global flag to bypass savings warnings during reset operations
let isResettingAllData = false;

export const setResettingAllData = (value) => {
  isResettingAllData = value;
};

export const getIsResettingAllData = () => {
  return isResettingAllData;
};

export const STORAGE_KEYS = {
  USERS: 'users',
  ACCOUNTS: 'accounts',
  SUB_ACCOUNTS: 'subAccounts',
  BUDGET_CATEGORIES: 'budgetCategories',
  BUDGET_ITEMS: 'budgetItems',
  ANNUAL_DATA: 'annualData',
  SUB_ACCOUNT_PERFORMANCE: 'subAccountPerformance',
  SAVINGS_GOALS: 'savingsGoals',
  PRIMARY_HOME: 'primaryHome',
  OTHER_ASSETS: 'otherAssets',
  OTHER_LIABILITIES: 'otherLiabilities',
  RETIREMENT_PLANNING: 'retirementPlanning',
  UI_STATE: 'uiState',
  // Legacy keys for backward compatibility during migration
  BUDGET_DATA: 'budgetData',
  PAYCHECK_DATA: 'paycheckData',
  APP_SETTINGS: 'appSettings',
  ACCOUNT_DATA: 'accountData',
  NETWORTH_SETTINGS: 'networthSettings',
  ACCOUNT_SETTINGS: 'accountSettings',
  SAVINGS_DATA: 'savingsData',
  RETIREMENT_DATA: 'retirementData',
  LIQUID_ASSETS_ACCOUNTS: 'liquidAssetsAccounts',
  LIQUID_ASSETS_RECORDS: 'liquidAssetsRecords',
  LIQUID_ASSETS_INPUTS: 'liquidAssetsInputs',
  SHARED_ACCOUNTS: 'sharedAccounts',
  MANUAL_ACCOUNT_GROUPS: 'liquidAssetsAccountGroups',
  PRIMARY_HOME_DATA: 'primaryHomeData',
  ASSET_LIABILITY_DATA: 'assetLiabilityData',
  TAX_CONSTANTS: 'taxConstants'
};

// Helper function to generate unique IDs
const generateUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Generic localStorage utilities
export const getFromStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue;
  }
};

export const setToStorage = (key, value) => {
  try {
    const jsonString = JSON.stringify(value);
    localStorage.setItem(key, jsonString);
    
    return true;
  } catch (error) {
    console.error(`🔧 setToStorage: Error writing to localStorage (${key}):`, error);
    return false;
  }
};

export const removeFromStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
    return false;
  }
};











// New structure data utilities
export const getUsers = () => {
  try {
    const rawUsers = localStorage.getItem(STORAGE_KEYS.USERS);
    if (rawUsers) {
      return JSON.parse(rawUsers);
    }
    return [];
  } catch (error) {
    console.error('Error parsing users from localStorage:', error);
    return [];
  }
};

export const setUsers = (data) => {
  return setToStorage(STORAGE_KEYS.USERS, data);
};

export const getAccounts = () => {
  try {
    const rawData = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    if (rawData) {
      return JSON.parse(rawData);
    }
    return [];
  } catch (error) {
    console.error('Error parsing accounts from localStorage:', error);
    return [];
  }
};

export const setAccounts = (data) => {
  return setToStorage(STORAGE_KEYS.ACCOUNTS, data);
};

export const getSubAccounts = () => {
  try {
    const rawData = localStorage.getItem(STORAGE_KEYS.SUB_ACCOUNTS);
    if (rawData) {
      return JSON.parse(rawData);
    }
    return [];
  } catch (error) {
    console.error('Error parsing sub accounts from localStorage:', error);
    return [];
  }
};

export const setSubAccounts = (data) => {
  return setToStorage(STORAGE_KEYS.SUB_ACCOUNTS, data);
};

export const getBudgetCategories = () => {
  try {
    const rawData = localStorage.getItem(STORAGE_KEYS.BUDGET_CATEGORIES);
    if (rawData) {
      return JSON.parse(rawData);
    }
    return [];
  } catch (error) {
    console.error('Error parsing budget categories from localStorage:', error);
    return [];
  }
};

export const setBudgetCategories = (data) => {
  return setToStorage(STORAGE_KEYS.BUDGET_CATEGORIES, data);
};

export const getBudgetItems = () => {
  try {
    const rawData = localStorage.getItem(STORAGE_KEYS.BUDGET_ITEMS);
    if (rawData) {
      return JSON.parse(rawData);
    }
    return [];
  } catch (error) {
    console.error('Error parsing budget items from localStorage:', error);
    return [];
  }
};

export const setBudgetItems = (data) => {
  return setToStorage(STORAGE_KEYS.BUDGET_ITEMS, data);
};

export const getSubAccountPerformance = () => {
  try {
    const rawData = localStorage.getItem(STORAGE_KEYS.SUB_ACCOUNT_PERFORMANCE);
    if (rawData) {
      return JSON.parse(rawData);
    }
    return [];
  } catch (error) {
    console.error('Error parsing sub account performance from localStorage:', error);
    return [];
  }
};

export const setSubAccountPerformance = (data) => {
  return setToStorage(STORAGE_KEYS.SUB_ACCOUNT_PERFORMANCE, data);
};

export const getSavingsGoals = () => {
  try {
    const rawData = localStorage.getItem(STORAGE_KEYS.SAVINGS_GOALS);
    if (rawData) {
      return JSON.parse(rawData);
    }
    return [];
  } catch (error) {
    console.error('Error parsing savings goals from localStorage:', error);
    return [];
  }
};

export const setSavingsGoals = (data) => {
  return setToStorage(STORAGE_KEYS.SAVINGS_GOALS, data);
};

export const getPrimaryHome = () => {
  try {
    const rawData = localStorage.getItem(STORAGE_KEYS.PRIMARY_HOME);
    if (rawData) {
      return JSON.parse(rawData);
    }
    return {};
  } catch (error) {
    console.error('Error parsing primary home from localStorage:', error);
    return {};
  }
};

export const setPrimaryHome = (data) => {
  return setToStorage(STORAGE_KEYS.PRIMARY_HOME, data);
};

export const getOtherAssets = () => {
  try {
    const rawData = localStorage.getItem(STORAGE_KEYS.OTHER_ASSETS);
    if (rawData) {
      return JSON.parse(rawData);
    }
    return [];
  } catch (error) {
    console.error('Error parsing other assets from localStorage:', error);
    return [];
  }
};

export const setOtherAssets = (data) => {
  return setToStorage(STORAGE_KEYS.OTHER_ASSETS, data);
};

export const getOtherLiabilities = () => {
  try {
    const rawData = localStorage.getItem(STORAGE_KEYS.OTHER_LIABILITIES);
    if (rawData) {
      return JSON.parse(rawData);
    }
    return [];
  } catch (error) {
    console.error('Error parsing other liabilities from localStorage:', error);
    return [];
  }
};

export const setOtherLiabilities = (data) => {
  return setToStorage(STORAGE_KEYS.OTHER_LIABILITIES, data);
};

export const getRetirementPlanning = () => {
  try {
    const rawData = localStorage.getItem(STORAGE_KEYS.RETIREMENT_PLANNING);
    if (rawData) {
      return JSON.parse(rawData);
    }
    return {};
  } catch (error) {
    console.error('Error parsing retirement planning from localStorage:', error);
    return {};
  }
};

export const setRetirementPlanning = (data) => {
  return setToStorage(STORAGE_KEYS.RETIREMENT_PLANNING, data);
};

export const getUIState = () => {
  try {
    const rawData = localStorage.getItem(STORAGE_KEYS.UI_STATE);
    if (rawData) {
      return JSON.parse(rawData);
    }
    return {};
  } catch (error) {
    console.error('Error parsing UI state from localStorage:', error);
    return {};
  }
};

export const setUIState = (data) => {
  return setToStorage(STORAGE_KEYS.UI_STATE, data);
};

// Legacy data utilities (for backward compatibility)
export const getBudgetData = () => {
  return getFromStorage(STORAGE_KEYS.BUDGET_DATA, []);
};

export const setBudgetData = (data) => {
  return setToStorage(STORAGE_KEYS.BUDGET_DATA, data);
};



export const getPaycheckData = () => {
  return getFromStorage(STORAGE_KEYS.PAYCHECK_DATA, {});
};

export const setPaycheckData = (data) => {
  return setToStorage(STORAGE_KEYS.PAYCHECK_DATA, data);
};

// Centralized User Name Resolution
// Resolves normalized user keys (user1, user2, joint) to display names
export const resolveUserDisplayName = (userKey) => {
  if (!userKey) return '';
  
  // Handle joint accounts
  if (userKey.toLowerCase() === 'joint') {
    return 'Joint';
  }
  
  // Resolve user1/user2 to actual names from paycheck data
  if (userKey === 'user1' || userKey === 'user2') {
    try {
      const paycheckData = getPaycheckData();
      if (userKey === 'user1' && paycheckData?.user1?.name) {
        return paycheckData.user1.name;
      } else if (userKey === 'user2' && paycheckData?.user2?.name) {
        return paycheckData.user2.name;
      }
    } catch (error) {
      console.warn('Could not resolve user name from paycheck data:', error);
    }
  }
  
  // Return as-is for any other values (including actual names for backward compatibility)
  return userKey;
};

// Helper to get all normalized user keys with their display names
export const getAllUserMappings = () => {
  const paycheckData = getPaycheckData();
  const mappings = {};
  
  if (paycheckData?.user1?.name) {
    mappings.user1 = paycheckData.user1.name;
  }
  
  if (paycheckData?.user2?.name) {
    mappings.user2 = paycheckData.user2.name;
  }
  
  mappings.joint = 'Joint';
  
  return mappings;
};

export const getFormData = () => {
  const paycheckData = getPaycheckData();
  return paycheckData.formData || {};
};

export const setFormData = (data) => {
  const paycheckData = getPaycheckData();
  const updatedPaycheckData = {
    ...paycheckData,
    formData: data
  };
  return setPaycheckData(updatedPaycheckData);
};

export const getAppSettings = () => {
  return getFromStorage(STORAGE_KEYS.APP_SETTINGS, {
    hasSeenBetaWelcome: false,
    isDemoData: false
  });
};

export const setAppSettings = (data) => {
  return setToStorage(STORAGE_KEYS.APP_SETTINGS, data);
};

// Beta welcome utilities
export const getHasSeenBetaWelcome = () => {
  const appSettings = getAppSettings();
  return appSettings.hasSeenBetaWelcome;
};

export const setHasSeenBetaWelcome = (value) => {
  const appSettings = getAppSettings();
  const updatedSettings = {
    ...appSettings,
    hasSeenBetaWelcome: value
  };
  return setAppSettings(updatedSettings);
};

// Demo data utilities
export const getIsDemoData = () => {
  const appSettings = getAppSettings();
  return appSettings.isDemoData;
};

export const setIsDemoData = (value) => {
  const appSettings = getAppSettings();
  const updatedSettings = {
    ...appSettings,
    isDemoData: value
  };
  return setAppSettings(updatedSettings);
};

// Account sync settings utilities
export const getAccountSyncSettings = () => {
  const appSettings = getAppSettings();
  return {
    combineAccountsAcrossOwners: appSettings.combineAccountsAcrossOwners ?? false,
    ...appSettings.performanceSync
  };
};

export const setAccountSyncSettings = (settings) => {
  const appSettings = getAppSettings();
  const updatedSettings = {
    ...appSettings,
    combineAccountsAcrossOwners: settings.combineAccountsAcrossOwners,
    performanceSync: {
      ...appSettings.performanceSync,
      ...settings
    }
  };
  return setAppSettings(updatedSettings);
};

// Read-only override settings utilities
export const getReadOnlyOverrideSettings = () => {
  const appSettings = getAppSettings();
  return {
    disableReadOnlyMode: appSettings.disableReadOnlyMode ?? false,
    ...appSettings.readOnlyOverride
  };
};

export const setReadOnlyOverrideSettings = (settings) => {
  const appSettings = getAppSettings();
  const updatedSettings = {
    ...appSettings,
    disableReadOnlyMode: settings.disableReadOnlyMode,
    readOnlyOverride: {
      ...appSettings.readOnlyOverride,
      ...settings
    }
  };
  return setAppSettings(updatedSettings);
};

export const getAnnualData = () => {
  try {
    const annualData = getFromStorage(STORAGE_KEYS.ANNUAL_DATA, {});
    return annualData;
  } catch (error) {
    console.error('Error loading annual data:', error);
    return {};
  }
};

export const setAnnualData = (data) => {
  const result = setToStorage(STORAGE_KEYS.ANNUAL_DATA, data);
  if (result) {
    // Dispatch update event to notify components
    setTimeout(() => {
      dispatchGlobalEvent('annualDataUpdated', data);
    }, 50);
  }
  return result;
};


export const getAccountData = () => {
  try {
    return getFromStorage(STORAGE_KEYS.ACCOUNT_DATA, {});
  } catch (error) {
    console.error('Error loading account data:', error);
    return {};
  }
};

export const setAccountData = (data) => {
  const result = setToStorage(STORAGE_KEYS.ACCOUNT_DATA, data);
  if (result) {
    // Dispatch update event to notify components
    setTimeout(() => {
      dispatchGlobalEvent('accountDataUpdated', data);
    }, 50);
  }
  return result;
};


// Export all app data to JSON
export const exportAllData = () => {
  const timestamp = new Date().toISOString();
  const exportData = {
    metadata: {
      exportedAt: timestamp,
      version: '3.0.0', // Updated version to reflect new normalized structure
      dataSource: 'normalized-structure'
    },
    // New normalized structure
    users: getUsers(),
    accounts: getAccounts(),
    subAccounts: getSubAccounts(),
    budgetCategories: getBudgetCategories(),
    budgetItems: getBudgetItems(),
    annualData: getAnnualData(),
    subAccountPerformance: getSubAccountPerformance(),
    savingsGoals: getSavingsGoals(),
    primaryHome: getPrimaryHome(),
    otherAssets: getOtherAssets(),
    otherLiabilities: getOtherLiabilities(),
    retirementPlanning: getRetirementPlanning(),
    uiState: getUIState(),
    // Legacy data for backward compatibility
    budgetData: getBudgetData(),
    paycheckData: getPaycheckData(),
    appSettings: getAppSettings(),
    accountData: getAccountData(),
    retirementData: getRetirementData(),
    primaryHomeData: getFromStorage(STORAGE_KEYS.PRIMARY_HOME_DATA, {}),
    assetLiabilityData: getAssetLiabilityData(),
    networthSettings: getNetWorthSettings(),
    accountSettings: getAccountSettings(),
    savingsData: getSavingsData(),
    liquidAssetsAccounts: getLiquidAssetsAccounts(),
    liquidAssetsRecords: getLiquidAssetsRecords(),
    liquidAssetsInputs: getLiquidAssetsInputs(),
    sharedAccounts: getSharedAccounts(),
    liquidAssetsAccountGroups: getManualAccountGroups(),
    taxConstants: getTaxConstants(),
  };
  
  return exportData;
};

// Export all localStorage data (comprehensive export)
export const exportAllLocalStorageData = () => {
  const timestamp = new Date().toISOString();
  const allData = {
    exportedAt: timestamp,
    version: '2.0.0',
    dataSource: 'localStorage-complete'
  };
  
  // Export all known storage keys
  Object.entries(STORAGE_KEYS).forEach(([keyName, storageKey]) => {
    let data = getFromStorage(storageKey, null);
    
    // For account data, ensure we get the raw data without any transformations
    if (storageKey === 'accountData' && data !== null) {
      try {
        // Get raw account data directly from localStorage to ensure completeness
        const rawData = localStorage.getItem('accountData');
        if (rawData) {
          data = JSON.parse(rawData);
        }
      } catch (error) {
        console.error('Error getting raw account data for export:', error);
        // Fall back to the transformed data if raw access fails
      }
    }
    
    if (data !== null) {
      allData[storageKey] = data;
    }
  });
  
  // Legacy keys are now handled in appSettings - no additional export needed
  
  // Export ALL localStorage items (catch any we might have missed)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !allData.hasOwnProperty(key)) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            // Try to parse as JSON, if it fails store as string
            try {
              allData[key] = JSON.parse(value);
            } catch {
              allData[key] = value;
            }
          }
        } catch (error) {
          console.warn(`Could not export localStorage key: ${key}`, error);
        }
      }
    }
  } catch (error) {
    console.warn('Could not iterate through all localStorage keys:', error);
  }
  
  return allData;
};

// Export all localStorage data with dual calculator filtering
export const exportAllLocalStorageDataFiltered = () => {
  const timestamp = new Date().toISOString();
  const allData = {
    exportedAt: timestamp,
    version: '2.0.0',
    dataSource: 'localStorage-filtered'
  };
  
  // First, get paycheck data to check dual calculator setting
  const paycheckData = getPaycheckData();
  const isMultiUserMode = paycheckData?.settings?.activeUsers?.includes('user2') ?? true;
  
  // Get user names for filtering
  const userNames = [];
  if (paycheckData?.user1?.name?.trim()) {
    userNames.push(paycheckData.user1.name.trim());
  }
  if (isMultiUserMode && paycheckData?.user2?.name?.trim()) {
    userNames.push(paycheckData.user2.name.trim());
  }
  
  // Export all known storage keys with filtering
  Object.entries(STORAGE_KEYS).forEach(([keyName, storageKey]) => {
    let data = getFromStorage(storageKey, null);
    
    // Apply filtering to annual and account data if multi-user mode is disabled
    if (!isMultiUserMode && data !== null) {
      if (storageKey === 'annualData') {
        data = filterAnnualDataForSingleMode(data, 'user1');
      } else if (storageKey === 'accountData') {
        data = filterAccountDataForSingleMode(data, 'user1');
      }
    }
    
    if (data !== null) {
      allData[storageKey] = data;
    }
  });
  
  // Legacy keys are now handled in appSettings - no additional export needed
  
  // Export ALL localStorage items (catch any we might have missed)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !Object.values(STORAGE_KEYS).includes(key)) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              allData[key] = JSON.parse(value);
            } catch {
              allData[key] = value;
            }
          }
        } catch (error) {
          console.warn(`Could not export localStorage key: ${key}`, error);
        }
      }
    }
  } catch (error) {
    console.warn('Could not iterate through all localStorage keys:', error);
  }
  
  return allData;
};

// Helper function to filter annual data for single mode (works with normalized keys)
const filterAnnualDataForSingleMode = (annualData, primaryUserKey) => {
  if (!annualData || typeof annualData !== 'object') return annualData;
  
  const filteredData = {};
  
  Object.entries(annualData).forEach(([year, yearData]) => {
    if (yearData && typeof yearData === 'object' && yearData.users) {
      // Filter out user data that isn't the primary user (no Joint in single mode)
      const filteredUsers = {};
      Object.entries(yearData.users).forEach(([userKey, userData]) => {
        if (userKey === primaryUserKey) {
          filteredUsers[userKey] = userData;
        }
        // Note: Joint data is excluded in single mode
      });
      
      filteredData[year] = {
        ...yearData,
        users: filteredUsers
      };
    } else {
      // Keep non-user data as-is
      filteredData[year] = yearData;
    }
  });
  
  return filteredData;
};

// Helper function to filter account data for single mode (works with normalized keys)
const filterAccountDataForSingleMode = (accountData, primaryUserKey) => {
  if (!accountData || typeof accountData !== 'object') return accountData;
  
  const filteredData = {};
  
  Object.entries(accountData).forEach(([entryId, entry]) => {
    if (entry && typeof entry === 'object' && entry.users) {
      // Filter out user data that isn't the primary user (no Joint in single mode)
      const filteredUsers = {};
      Object.entries(entry.users).forEach(([userKey, userData]) => {
        if (userKey === primaryUserKey) {
          filteredUsers[userKey] = userData;
        }
        // Note: Joint data is excluded in single mode
      });
      
      // Only include entries that have remaining user data
      if (Object.keys(filteredUsers).length > 0) {
        filteredData[entryId] = {
          ...entry,
          users: filteredUsers
        };
      }
    } else {
      // Keep non-user entries as-is
      filteredData[entryId] = entry;
    }
  });
  
  return filteredData;
};

// Generate CSV export for specific data types
export const generateDataCSV = (dataKey, customHeaders = null, customFormatter = null) => {
  const data = getFromStorage(dataKey, null);
  if (!data) return null;
  
  // Convert data to array format if it's an object
  let dataArray = Array.isArray(data) ? data : Object.values(data);
  
  if (dataArray.length === 0) return null;
  
  // Default CSV generation based on data structure
  let headers = [];
  let formatter = null;
  
  if (customHeaders && customFormatter) {
    headers = customHeaders;
    formatter = customFormatter;
  } else {
    // Auto-generate headers from first data item
    const firstItem = dataArray[0];
    if (firstItem && typeof firstItem === 'object') {
      headers = Object.keys(firstItem);
      formatter = (item) => headers.map(header => item[header] || '');
    }
  }
  
  if (!headers.length) return null;
  
  // Generate CSV content
  const rows = [headers];
  dataArray.forEach(item => {
    if (formatter) {
      const row = formatter(item);
      rows.push(Array.isArray(row) ? row : Object.values(row));
    } else {
      rows.push(headers.map(header => item[header] || ''));
    }
  });
  
  return rows.map(row =>
    row.map(value => {
      const stringValue = value == null ? '' : String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  ).join('\n');
};

// Export all data as CSV files (creates multiple CSV files for different data types)
export const exportAllAsCSV = () => {
  const exports = {};
  const timestamp = new Date().toISOString().split('T')[0];
  
  // Liquid Assets Records CSV
  const liquidAssetsRecords = getLiquidAssetsRecords();
  if (liquidAssetsRecords.length > 0) {
    const allAccounts = [];
    liquidAssetsRecords.forEach(record => {
      record.accounts.forEach(account => {
        allAccounts.push({
          ...account,
          recordDate: record.updateDate,
          recordId: record.id
        });
      });
    });
    
    if (allAccounts.length > 0) {
      // Generate CSV content manually for portfolio records
      const headers = ['accountName', 'owner', 'taxType', 'accountType', 'investmentCompany', 'description', 'amount', 'updateDate', 'recordDate', 'recordId'];
      const rows = [headers];
      
      allAccounts.forEach(account => {
        rows.push([
          account.accountName || '',
          account.owner || '',
          account.taxType || '',
          account.accountType || '',
          account.investmentCompany || '',
          account.description || '',
          account.amount || '',
          account.updateDate || '',
          account.recordDate || '',
          account.recordId || ''
        ]);
      });
      
      exports.liquidAssetsRecords = {
        filename: `liquid_assets_records_${timestamp}.csv`,
        content: rows.map(row =>
          row.map(value => {
            const stringValue = value == null ? '' : String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(',')
        ).join('\n')
      };
    }
  }
  
  // Account Data CSV - filtered based on dual calculator setting
  const accountData = getAccountData();
  const paycheckData = getPaycheckData();
  const isMultiUserMode = paycheckData?.settings?.activeUsers?.includes('user2') ?? true;
  
  if (Object.keys(accountData).length > 0) {
    const accountRows = [];
    Object.values(accountData).forEach(entry => {
      if (entry.users) {
        Object.entries(entry.users).forEach(([owner, userData]) => {
          // Filter users based on multi-user calculator setting
          if (!isMultiUserMode) {
            // In single mode, only show user1 data (use normalized keys)
            if (owner !== 'user1') {
              return; // Skip this user
            }
          }
          accountRows.push({
            year: entry.year || '',
            owner: owner,
            accountName: userData.accountName || '',
            accountType: userData.accountType || '',
            balance: userData.balance || '',
            contributions: userData.contributions || '',
            employerMatch: userData.employerMatch || '',
            gains: userData.gains || '',
            fees: userData.fees || '',
            withdrawals: userData.withdrawals || '',
            balanceUpdatedFrom: userData.balanceUpdatedFrom || '',
            balanceUpdatedAt: userData.balanceUpdatedAt || ''
          });
        });
      }
    });
    
    if (accountRows.length > 0) {
      const headers = ['year', 'owner', 'accountName', 'accountType', 'balance', 'contributions', 'employerMatch', 'gains', 'fees', 'withdrawals', 'balanceUpdatedFrom', 'balanceUpdatedAt'];
      const rows = [headers];
      
      accountRows.forEach(row => {
        rows.push(Object.values(row));
      });
      
      exports.accountData = {
        filename: `account_data_${timestamp}.csv`,
        content: rows.map(row =>
          row.map(value => {
            const stringValue = value == null ? '' : String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(',')
        ).join('\n')
      };
    }
  }
  
  // Annual Data CSV - filtered based on dual calculator setting
  const annualData = getAnnualData();
  if (Object.keys(annualData).length > 0) {
    const annualRows = [];
    Object.entries(annualData).forEach(([year, yearData]) => {
      // Add combined totals row
      annualRows.push({
        year: year,
        owner: 'TOTAL',
        taxFree: yearData.taxFree || 0,
        taxDeferred: yearData.taxDeferred || 0,
        brokerage: yearData.brokerage || 0,
        espp: yearData.espp || 0,
        hsa: yearData.hsa || 0,
        cash: yearData.cash || 0
      });
      
      // Add individual user rows - filtered based on dual calculator setting
      if (yearData.users) {
        Object.entries(yearData.users).forEach(([owner, userData]) => {
          // Filter users based on multi-user calculator setting
          if (!isMultiUserMode) {
            // In single mode, only show user1 data (use normalized keys)
            if (owner !== 'user1') {
              return; // Skip this user
            }
          }
          annualRows.push({
            year: year,
            owner: owner,
            taxFree: userData.taxFree || 0,
            taxDeferred: userData.taxDeferred || 0,
            brokerage: userData.brokerage || 0,
            espp: userData.espp || 0,
            hsa: userData.hsa || 0,
            cash: userData.cash || 0
          });
        });
      }
    });
    
    if (annualRows.length > 0) {
      const headers = ['year', 'owner', 'taxFree', 'taxDeferred', 'brokerage', 'espp', 'hsa', 'cash'];
      const rows = [headers];
      
      annualRows.forEach(row => {
        rows.push(Object.values(row));
      });
      
      exports.annualData = {
        filename: `annual_data_${timestamp}.csv`,
        content: rows.map(row =>
          row.map(value => {
            const stringValue = value == null ? '' : String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(',')
        ).join('\n')
      };
    }
  }

  // Manual Account Groups CSV
  const manualGroups = getManualAccountGroups();
  if (Object.keys(manualGroups).length > 0) {
    const headers = ['groupId', 'groupName', 'accountName', 'owner', 'liquidAssetsAccountIds', 'lastSync', 'createdAt', 'updatedAt'];
    const rows = [headers];
    
    Object.entries(manualGroups).forEach(([groupId, group]) => {
      rows.push([
        groupId,
        group.name || '',
        group.accountName || '',
        group.owner || '',
        (group.liquidAssetsAccounts || []).join(';'), // Use semicolon separator for array
        group.lastSync || '',
        group.createdAt || '',
        group.updatedAt || ''
      ]);
    });
    
    exports.liquidAssetsAccountGroups = {
      filename: `manual_account_groups_${timestamp}.csv`,
      content: rows.map(row =>
        row.map(value => {
          const stringValue = value == null ? '' : String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      ).join('\n')
    };
  }
  
  // Liquid Assets Inputs CSV (excluding amounts - only account definitions)
  const liquidAssetsInputs = getLiquidAssetsInputs();
  if (liquidAssetsInputs.length > 0) {
    const headers = ['id', 'accountName', 'owner', 'taxType', 'accountType', 'investmentCompany', 'description'];
    const rows = [headers];
    
    liquidAssetsInputs.forEach(input => {
      rows.push([
        input.id || '',
        input.accountName || '',
        input.owner || '',
        input.taxType || '',
        input.accountType || '',
        input.investmentCompany || '',
        input.description || ''
      ]);
    });
    
    exports.liquidAssetsInputs = {
      filename: `liquid_assets_inputs_${timestamp}.csv`,
      content: rows.map(row =>
        row.map(value => {
          const stringValue = value == null ? '' : String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      ).join('\n')
    };
  }
  
  // Shared Accounts CSV
  const sharedAccounts = getSharedAccounts();
  if (sharedAccounts.length > 0) {
    const headers = ['id', 'accountName', 'owner', 'accountType', 'investmentCompany', 'taxType', 'source', 'sources', 'createdAt', 'updatedAt'];
    const rows = [headers];
    
    sharedAccounts.forEach(account => {
      rows.push([
        account.id || '',
        account.accountName || '',
        account.owner || '',
        account.accountType || '',
        account.investmentCompany || '',
        account.taxType || '',
        account.source || '',
        (account.sources || []).join(';'), // Use semicolon separator for array
        account.createdAt || '',
        account.updatedAt || ''
      ]);
    });
    
    exports.sharedAccounts = {
      filename: `shared_accounts_${timestamp}.csv`,
      content: rows.map(row =>  
        row.map(value => {
          const stringValue = value == null ? '' : String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      ).join('\n')
    };
  }
  
  return exports;
};

// Download all CSV exports as separate files
export const downloadAllCSVExports = () => {
  const csvExports = exportAllAsCSV();
  
  Object.entries(csvExports).forEach(([exportType, exportData]) => {
    const blob = new Blob([exportData.content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = exportData.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
  
  const exportCount = Object.keys(csvExports).length;
  return { success: true, message: `Downloaded ${exportCount} CSV files`, count: exportCount };
};



// Import data from JSON (validation included)
export const importAllData = (importData) => {
  try {
    let importedSections = [];
    let errors = [];

    if (!importData || typeof importData !== 'object') {
      throw new Error('Invalid import data format');
    }
    
    // Clear ALL existing data before importing new data
    Object.values(STORAGE_KEYS).forEach(key => {
      removeFromStorage(key);
    });
    
    
    // Clear ALL localStorage items to ensure complete reset before import
    const keysToRemove = [
      ...Object.values(STORAGE_KEYS)
    ];
    
    // Also clear any other items that might exist in localStorage
    try {
      const allStorageKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          allStorageKeys.push(key);
        }
      }
      keysToRemove.push(...allStorageKeys);
    } catch (error) {
      console.warn('Could not enumerate all localStorage keys for cleanup:', error);
    }
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        // Ignore errors during cleanup
      }
    });
    
    // Clear the in-memory cache (nameMapping removed with normalized data)
    
    // Import new normalized structure first
    if (importData.users !== undefined) {
      setUsers(importData.users);
      importedSections.push('Users');
    }
    
    if (importData.accounts !== undefined) {
      setAccounts(importData.accounts);
      importedSections.push('Accounts');
    }
    
    if (importData.subAccounts !== undefined) {
      setSubAccounts(importData.subAccounts);
      importedSections.push('Sub Accounts');
    }
    
    if (importData.budgetCategories !== undefined) {
      setBudgetCategories(importData.budgetCategories);
      importedSections.push('Budget Categories');
    }
    
    if (importData.budgetItems !== undefined) {
      setBudgetItems(importData.budgetItems);
      importedSections.push('Budget Items');
    }
    
    if (importData.subAccountPerformance !== undefined) {
      setSubAccountPerformance(importData.subAccountPerformance);
      importedSections.push('Sub Account Performance');
    }
    
    if (importData.savingsGoals !== undefined) {
      setSavingsGoals(importData.savingsGoals);
      importedSections.push('Savings Goals');
    }
    
    if (importData.primaryHome !== undefined) {
      setPrimaryHome(importData.primaryHome);
      importedSections.push('Primary Home');
    }
    
    if (importData.otherAssets !== undefined) {
      setOtherAssets(importData.otherAssets);
      importedSections.push('Other Assets');
    }
    
    if (importData.otherLiabilities !== undefined) {
      setOtherLiabilities(importData.otherLiabilities);
      importedSections.push('Other Liabilities');
    }
    
    if (importData.retirementPlanning !== undefined) {
      setRetirementPlanning(importData.retirementPlanning);
      importedSections.push('Retirement Planning');
    }
    
    if (importData.uiState !== undefined) {
      setUIState(importData.uiState);
      importedSections.push('UI State');
    }

    // Import legacy sections (handle both camelCase and snake_case for backward compatibility)
    if (importData.budgetData !== undefined || importData.budget_data !== undefined) {
      setBudgetData(importData.budgetData || importData.budget_data);
      importedSections.push('Budget Data');
    }
    
    if (importData.paycheckData !== undefined || importData.paycheck_data !== undefined) {
      setPaycheckData(importData.paycheckData || importData.paycheck_data);
      importedSections.push('Paycheck Data');
    }
    
    
    if (importData.appSettings !== undefined || importData.app_settings !== undefined) {
      setAppSettings(importData.appSettings || importData.app_settings);
      importedSections.push('App Settings');
    }
    
    if (importData.annualData !== undefined || importData.annual_data !== undefined) {
      // Support current key names
      const dataToImport = importData.annualData || importData.annual_data;
      // Skip cleaning for normalized data - it's already clean
      let cleanedAnnualData = dataToImport;
      
      // Apply multi-user calculator filtering if single mode is enabled
      const currentPaycheckData = importData.paycheckData || importData.paycheck_data;
      const isMultiUserMode = currentPaycheckData?.settings?.activeUsers?.includes('user2') ?? true;
      if (!isMultiUserMode) {
        cleanedAnnualData = filterAnnualDataForSingleMode(cleanedAnnualData, 'user1');
      }
      
      setAnnualData(cleanedAnnualData);
      importedSections.push('Annual Data');
    }
    
    if (importData.accountData !== undefined || importData.account_data !== undefined || importData.performanceData !== undefined || importData.performance_data !== undefined) {
      // Support both new and old key names for backward compatibility
      const dataToImport = importData.accountData || importData.account_data || importData.performanceData || importData.performance_data;
      // Handle both array and object formats during import
      let accountDataToImport = dataToImport;
      if (Array.isArray(accountDataToImport)) {
        // Convert array to object format
        accountDataToImport = accountDataToImport.reduce((acc, entry) => {
          acc[entry.entryId] = entry;
          return acc;
        }, {});
      }
      
      // Skip cleaning for normalized data - it's already clean
      let cleanedAccountData = accountDataToImport;
      
      // Apply multi-user calculator filtering if single mode is enabled
      const currentPaycheckData = importData.paycheckData || importData.paycheck_data;
      const isMultiUserMode = currentPaycheckData?.settings?.activeUsers?.includes('user2') ?? true;
      if (!isMultiUserMode) {
        cleanedAccountData = filterAccountDataForSingleMode(cleanedAccountData, 'user1');
      }
      
      const result = setAccountData(cleanedAccountData);
      if (result) {
        importedSections.push('Account Data');
      } else {
        errors.push('Account Data: Failed to save');
      }
    }
    
    if (importData.retirementData !== undefined || importData.retirement_data !== undefined) {
      setRetirementData(importData.retirementData || importData.retirement_data);
      importedSections.push('Retirement Data');
    }
    
    if (importData.primaryHomeData !== undefined || importData.primary_home_data !== undefined) {
      setPrimaryHomeData(importData.primaryHomeData || importData.primary_home_data);
      importedSections.push('Primary Home Data');
    }
    
    if (importData.assetLiabilityData !== undefined || importData.asset_liability_data !== undefined) {
      setAssetLiabilityData(importData.assetLiabilityData || importData.asset_liability_data);
      importedSections.push('Asset Liability Data');
    }
    
    // Import portfolio-related data
    if (importData.networthSettings !== undefined || importData.networth_settings !== undefined) {
      setNetWorthSettings(importData.networthSettings || importData.networth_settings);
      importedSections.push('Net Worth Settings');
    }
    
    if (importData.accountSettings !== undefined || importData.account_settings !== undefined || importData.performanceSettings !== undefined || importData.performance_settings !== undefined) {
      setAccountSettings(importData.accountSettings || importData.account_settings || importData.performanceSettings || importData.performance_settings);
      importedSections.push('Account Settings');
    }
    
    if (importData.savingsData !== undefined || importData.savings_data !== undefined) {
      setSavingsData(importData.savingsData || importData.savings_data);
      importedSections.push('Savings Data');
    }
    
    if (importData.liquidAssetsAccounts !== undefined || importData.liquid_assets_accounts !== undefined || importData.portfolioAccounts !== undefined || importData.portfolio_accounts !== undefined) {
      setLiquidAssetsAccounts(importData.liquidAssetsAccounts || importData.liquid_assets_accounts || importData.portfolioAccounts || importData.portfolio_accounts);
      importedSections.push('Liquid Assets Accounts');
    }
    
    if (importData.liquidAssetsRecords !== undefined || importData.liquid_assets_records !== undefined || importData.portfolioRecords !== undefined || importData.portfolio_records !== undefined) {
      setLiquidAssetsRecords(importData.liquidAssetsRecords || importData.liquid_assets_records || importData.portfolioRecords || importData.portfolio_records);
      importedSections.push('Liquid Assets Records');
    }
    
    if (importData.sharedAccounts !== undefined || importData.shared_accounts !== undefined) {
      setSharedAccounts(importData.sharedAccounts || importData.shared_accounts);
      importedSections.push('Shared Accounts');
    }
    
    if (importData.liquidAssetsInputs !== undefined || importData.liquid_assets_inputs !== undefined || importData.portfolioInputs !== undefined || importData.portfolio_inputs !== undefined) {
      setLiquidAssetsInputs(importData.liquidAssetsInputs || importData.liquid_assets_inputs || importData.portfolioInputs || importData.portfolio_inputs);
      importedSections.push('Liquid Assets Inputs');
    }
    
    if (importData.liquidAssetsAccountGroups !== undefined) {
      setManualAccountGroups(importData.liquidAssetsAccountGroups);
      importedSections.push('Manual Account Groups');
    }
    
    // Import tax constants data
    if (importData.taxConstants !== undefined || importData.tax_constants !== undefined) {
      setTaxConstants(importData.taxConstants || importData.tax_constants);
      importedSections.push('Tax Constants');
    }
    
    // Import any other localStorage items that were exported
    const knownKeys = new Set([
      ...Object.values(STORAGE_KEYS),
      'exportedAt',
      'version',
      'dataSource'
    ]);
    
    Object.keys(importData).forEach(key => {
      if (!knownKeys.has(key) && importData[key] !== undefined) {
        try {
          setToStorage(key, importData[key]);
          importedSections.push(`Additional: ${key}`);
        } catch (error) {
          errors.push(`Failed to import ${key}: ${error.message}`);
        }
      }
    });

    // Import completed successfully
    
    // Trigger events to notify components
    setTimeout(() => {
      dispatchGlobalEvent('budgetDataUpdated');
      dispatchGlobalEvent('paycheckDataUpdated');
      dispatchGlobalEvent('annualDataUpdated');
      dispatchGlobalEvent('accountDataUpdated');
      dispatchGlobalEvent('sharedAccountsUpdated');
      dispatchGlobalEvent('liquidAssetsInputsUpdated');
      dispatchGlobalEvent('liquidAssetsAccountGroupsUpdated');
    }, 100);
    
    return { 
      success: true, 
      message: `Successfully imported: ${importedSections.join(', ')}` + 
               (errors.length > 0 ? `\n\nErrors: ${errors.join(', ')}` : '')
    };
  } catch (error) {
    console.error('Error importing data:', error);
    return { success: false, message: error.message };
  }
};

// Helper function to import data directly from a JavaScript object (for debugging)
export const importDataDirectly = (jsonData) => {
  return importAllData(jsonData);
};

// Download JSON file
export const downloadJsonFile = (data, filename = 'personal-finance-data.json') => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Error downloading file:', error);
    return false;
  }
};

// Read JSON file and return parsed data
export const readJsonFile = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }
    
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      reject(new Error('Please select a valid JSON file'));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target.result);
        resolve(jsonData);
      } catch (error) {
        reject(new Error('Invalid JSON file format'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
};

// Trigger file input for import
export const triggerFileImport = () => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (event) => {
      try {
        const file = event.target.files[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }
        
        const jsonData = await readJsonFile(file);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      } finally {
        // Clean up
        document.body.removeChild(input);
      }
    };
    
    input.oncancel = () => {
      document.body.removeChild(input);
      reject(new Error('Import cancelled'));
    };
    
    // Hide the input and trigger click
    input.style.display = 'none';
    document.body.appendChild(input);
    input.click();
  });
};

// Clear all app data globally
export const clearAllAppData = () => {
  try {
    // Clear all storage keys including both new and legacy
    Object.values(STORAGE_KEYS).forEach(key => {
      removeFromStorage(key);
    });
    
    
    // Also clear any other potential storage keys that might exist
    const keysToRemove = [
      'budgetData',
      'paycheckData', 
      'formData',
      'appSettings',
      'accountData',
      'networthSettings',
      'retirementData',
      'primaryHomeData',
      'assetLiabilityData',
      'liquidAssetsAccounts',
      'liquidAssetsRecords', 
      'liquidAssetsInputs',
      'portfolioAccounts',
      'portfolioRecords',
      'portfolioInputs',
      'sharedAccounts', 
      'liquidAssetsAccountGroups',
      'savingsData'
    ];
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
      }
    });
    
    // Dispatch events to notify all components
    setTimeout(() => {
      dispatchGlobalEvent('budgetDataUpdated', []);
      dispatchGlobalEvent('paycheckDataUpdated', {});
      dispatchGlobalEvent('annualDataUpdated', {});
      dispatchGlobalEvent('accountDataUpdated', []);
      dispatchGlobalEvent('formDataUpdated', {});
      dispatchGlobalEvent('resetAllData', true); // Notify all components of complete reset
    }, 50);
    
    return true;
  } catch (error) {
    console.error('Error clearing all app data:', error);
    return false;
  }
};

// Dispatch global events for UI updates
export const dispatchGlobalEvent = (eventName, data = null) => {
  window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
};

// Enhanced export function with consistent timestamp format
import { generateDataFilename } from './calculationHelpers';

// Export all data with descriptive timestamp filename
export const exportAllDataWithTimestamp = () => {
  try {
    // Use the filtered export function that respects dual calculator toggle
    const allData = exportAllLocalStorageDataFiltered();

    // Get user names from paycheck data for filename
    const paycheckData = getPaycheckData();
    const userNames = [];
    if (paycheckData?.user1?.name?.trim()) {
      userNames.push(paycheckData.user1.name.trim());
    }
    if (paycheckData?.user2?.name?.trim() && (paycheckData?.settings?.activeUsers?.includes('user2') ?? true)) {
      userNames.push(paycheckData.user2.name.trim());
    }

    const dataStr = JSON.stringify(allData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = generateDataFilename('all_data', userNames, 'json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (error) {
    console.error('Error exporting data:', error);
    return { success: false, message: error.message };
  }
};

// Check if user has any existing data worth preserving
export const hasExistingData = () => {
  try {
    const budgetData = getBudgetData();
    const paycheckData = getPaycheckData();
    const annualData = getAnnualData();
    const accountData = getAccountData();
    
    // Check if any meaningful data exists
    return (budgetData && budgetData.length > 0) ||
           (paycheckData && ((paycheckData.user1 && paycheckData.user1.salary) || 
                            (paycheckData.user2 && paycheckData.user2.salary))) ||
           (annualData && Object.keys(annualData).length > 0) ||
           (accountData && Object.keys(accountData).length > 0);
  } catch (error) {
    console.error('Error checking existing data:', error);
    return false;
  }
};

// Consolidated demo data import function with export option
export const importDemoData = async () => {
  try {
    const response = await fetch('/demo/import_file.json');
    if (!response.ok) {
      throw new Error('Failed to load demo data');
    }
    
    const demoData = await response.json();
    const result = importAllData(demoData);
    
    if (result.success) {
      // Dispatch events to notify all components
      dispatchGlobalEvent('paycheckDataUpdated');
      dispatchGlobalEvent('budgetDataUpdated');
      dispatchGlobalEvent('annualDataUpdated');
      dispatchGlobalEvent('accountDataUpdated');
      return { success: true, message: 'Demo data loaded successfully!' };
    } else {
      return { success: false, message: result.message };
    }
  } catch (error) {
    console.error('Error loading demo data:', error);
    return { success: false, message: 'Failed to load demo data. Please try again.' };
  }
};

// Add the missing function that other components are trying to import
export const importDemoDataWithExportOption = importDemoData;

// Enhanced reset function that ensures complete data clearing
export const resetAllAppData = () => {
  try {
    // Set flag to bypass savings warnings during reset
    setResettingAllData(true);
    
    // Clear all data
    const success = clearAllAppData();
    
    if (success) {
      // Reset new normalized structure
      setUsers([]);
      setAccounts([]);
      setSubAccounts([]);
      setBudgetCategories([]);
      setBudgetItems([]);
      setAnnualData({});
      setSubAccountPerformance([]);
      setSavingsGoals([]);
      setPrimaryHome({});
      setOtherAssets([]);
      setOtherLiabilities([]);
      setRetirementPlanning({});
      setUIState({});
      
      // Reset legacy data structures for backward compatibility
      setBudgetData([]);
      setPaycheckData({});
      setAppSettings({});
      setAccountData({}); // Changed from [] to {}
      setSavingsData({}); // Reset savings data as well
      setRetirementData({}); // Reset retirement data as well
      setLiquidAssetsAccounts([]); // Reset liquid assets accounts
      setLiquidAssetsRecords([]); // Reset liquid assets records
      clearLiquidAssetsInputs(); // Reset liquid assets inputs
      clearSharedAccounts(); // Reset shared accounts system
      clearManualAccountGroups(); // Reset manual account groups
      setAssetLiabilityData({}); // Reset asset liability data
      
      // Reset the flag after a short delay to ensure all events are processed
      setTimeout(() => {
        setResettingAllData(false);
      }, 1000);
      
      return { success: true, message: 'All data has been reset successfully.' };
    } else {
      // Reset flag on failure too
      setResettingAllData(false);
      return { success: false, message: 'Failed to reset all data.' };
    }
  } catch (error) {
    console.error('Error resetting all app data:', error);
    // Reset flag on error too
    setResettingAllData(false);
    return { success: false, message: 'Error occurred while resetting data.' };
  }
};



// Net Worth settings utilities
export const getNetWorthSettings = () => {
  return getFromStorage(STORAGE_KEYS.NETWORTH_SETTINGS, {
    selectedYears: [],
    netWorthMode: 'market',
    activeTab: 'overview',
    showAllYearsInChart: false,
    showAllYearsInLiquidAssetsChart: false,
    showAllYearsInNetWorthBreakdownChart: false,
    showAllYearsInMoneyGuyChart: false,
    useThreeYearIncomeAverage: false,
    useReverseChronological: false,
    isCompactTable: false
  });
};

export const setNetWorthSettings = (settings) => {
  return setToStorage(STORAGE_KEYS.NETWORTH_SETTINGS, settings);
};

// Account settings utilities
export const getAccountSettings = () => {
  return getFromStorage(STORAGE_KEYS.ACCOUNT_SETTINGS, {
    selectedYears: [],
    selectedAccounts: [],
    activeTab: 'overview',
    showAllYearsInChart: false,
    showAllYearsInReturnsChart: false,
    useReverseChronological: false,
    isCompactTable: false,
    includeContributionsInReturns: false
  });
};

export const setAccountSettings = (settings) => {
  return setToStorage(STORAGE_KEYS.ACCOUNT_SETTINGS, settings);
};

// Savings data utilities
export const getSavingsData = () => {
  return getFromStorage(STORAGE_KEYS.SAVINGS_DATA, {});
};

export const setSavingsData = (data) => {
  return setToStorage(STORAGE_KEYS.SAVINGS_DATA, data);
};

// Retirement data utilities
export const getRetirementData = () => {
  return getFromStorage(STORAGE_KEYS.RETIREMENT_DATA, {});
};

export const setRetirementData = (data) => {
  return setToStorage(STORAGE_KEYS.RETIREMENT_DATA, data);
};

// Primary Home data utilities
export const getPrimaryHomeData = () => {
  return getFromStorage(STORAGE_KEYS.PRIMARY_HOME_DATA, {});
};

export const setPrimaryHomeData = (data) => {
  return setToStorage(STORAGE_KEYS.PRIMARY_HOME_DATA, data);
};

// Liquid Assets account names utilities
export const getLiquidAssetsAccounts = () => {
  return getFromStorage(STORAGE_KEYS.LIQUID_ASSETS_ACCOUNTS, []);
};

export const setLiquidAssetsAccounts = (accounts) => {
  return setToStorage(STORAGE_KEYS.LIQUID_ASSETS_ACCOUNTS, accounts);
};

export const addLiquidAssetsAccount = (accountName, taxType, accountType, owner) => {
  const accounts = getLiquidAssetsAccounts();
  const newAccount = {
    id: generateUniqueId(),
    accountName: accountName.trim(),
    taxType,
    accountType,
    owner,
    createdAt: new Date().toISOString()
  };
  
  // Check if account already exists to avoid duplicates
  const exists = accounts.some(acc => 
    acc.accountName.toLowerCase() === accountName.toLowerCase().trim() &&
    acc.owner === owner &&
    acc.taxType === taxType &&
    acc.accountType === accountType
  );
  
  if (!exists) {
    accounts.push(newAccount);
    setLiquidAssetsAccounts(accounts);
  }
  
  return newAccount;
};


// Liquid Assets records utilities (comprehensive update tracking with dates)
export const getLiquidAssetsRecords = () => {
  return getFromStorage(STORAGE_KEYS.LIQUID_ASSETS_RECORDS, []);
};

export const setLiquidAssetsRecords = (records) => {
  return setToStorage(STORAGE_KEYS.LIQUID_ASSETS_RECORDS, records);
};

export const addLiquidAssetsRecord = (accounts, updateDate = null, syncMode = 'balance-only') => {
  const records = getLiquidAssetsRecords();
  const recordDate = updateDate || new Date().toISOString().split('T')[0];
  
  // Parse date correctly to avoid timezone issues
  const dateForTimestamp = recordDate.includes('T') ? new Date(recordDate) : new Date(recordDate + 'T12:00:00');
  
  const newRecord = {
    id: generateUniqueId(),
    updateDate: recordDate,
    timestamp: dateForTimestamp.getTime(), // For sorting
    year: dateForTimestamp.getFullYear(),
    month: dateForTimestamp.getMonth() + 1,
    accountsCount: accounts.length,
    syncMode: syncMode, // Track whether this was a detailed or balance-only sync
    syncTimestamp: new Date().toISOString(),
    accounts: accounts.map(acc => ({
      accountName: acc.accountName,
      owner: acc.owner,
      taxType: acc.taxType,
      accountType: acc.accountType,
      investmentCompany: acc.investmentCompany,
      description: acc.description,
      amount: parseFloat(acc.amount) || 0,
      // Include detailed fields if available
      contributions: acc.contributions ? parseFloat(acc.contributions) : undefined,
      employerMatch: acc.employerMatch ? parseFloat(acc.employerMatch) : undefined,
      gains: acc.gains ? parseFloat(acc.gains) : undefined,
      fees: acc.fees ? parseFloat(acc.fees) : undefined,
      withdrawals: acc.withdrawals ? parseFloat(acc.withdrawals) : undefined,
      updateDate: recordDate
    })),
    totals: {
      taxFree: 0,
      taxDeferred: 0,
      brokerage: 0,
      hsa: 0,
      espp: 0
    }
  };

  // Calculate totals using consistent logic
  newRecord.accounts.forEach(acc => {
    const amount = acc.amount || 0;
    
    // Use account type first for special accounts, then fall back to tax type
    if (acc.accountType === 'ESPP') {
      newRecord.totals.espp += amount;
    } else if (acc.accountType === 'HSA') {
      newRecord.totals.hsa += amount;
    } else {
      // Map by tax type for regular accounts
      switch (acc.taxType) {
        case 'Tax-Free':
          newRecord.totals.taxFree += amount;
          break;
        case 'Tax-Deferred':
          newRecord.totals.taxDeferred += amount;
          break;
        case 'After-Tax':
        case 'Roth':
          newRecord.totals.brokerage += amount;
          break;
      }
    }
  });

  newRecord.totalAmount = Object.values(newRecord.totals).reduce((sum, amount) => sum + amount, 0);

  // Add to beginning of array (most recent first)
  records.unshift(newRecord);
  
  // Keep only last 500 records to prevent excessive storage usage
  if (records.length > 500) {
    records.splice(500);
  }
  
  setLiquidAssetsRecords(records);
  return newRecord;
};

export const deleteLiquidAssetsRecord = (recordId) => {
  const records = getLiquidAssetsRecords();
  const filteredRecords = records.filter(record => record.id !== recordId);
  setLiquidAssetsRecords(filteredRecords);
  return filteredRecords;
};

// Get last liquid assets update information for displaying to users
export const getLastLiquidAssetsUpdate = () => {
  const records = getLiquidAssetsRecords();
  if (records.length === 0) {
    return {
      hasData: false,
      lastBalanceUpdate: null,
      lastDetailedUpdate: null,
      lastAnyUpdate: null
    };
  }

  // Sort records by sync timestamp (most recent first)
  const sortedRecords = records.sort((a, b) => {
    const timeA = new Date(a.syncTimestamp || a.updateDate).getTime();
    const timeB = new Date(b.syncTimestamp || b.updateDate).getTime();
    return timeB - timeA;
  });

  // Find most recent balance-only and detailed updates
  const lastBalanceUpdate = sortedRecords.find(record => record.syncMode === 'balance-only');
  const lastDetailedUpdate = sortedRecords.find(record => record.syncMode === 'detailed');
  const lastAnyUpdate = sortedRecords[0];

  return {
    hasData: true,
    lastBalanceUpdate: lastBalanceUpdate ? {
      date: lastBalanceUpdate.updateDate,
      syncTimestamp: lastBalanceUpdate.syncTimestamp,
      accountsCount: lastBalanceUpdate.accountsCount,
      syncMode: lastBalanceUpdate.syncMode
    } : null,
    lastDetailedUpdate: lastDetailedUpdate ? {
      date: lastDetailedUpdate.updateDate,
      syncTimestamp: lastDetailedUpdate.syncTimestamp,
      accountsCount: lastDetailedUpdate.accountsCount,
      syncMode: lastDetailedUpdate.syncMode
    } : null,
    lastAnyUpdate: {
      date: lastAnyUpdate.updateDate,
      syncTimestamp: lastAnyUpdate.syncTimestamp,
      accountsCount: lastAnyUpdate.accountsCount,
      syncMode: lastAnyUpdate.syncMode
    }
  };
};

// Liquid Assets Inputs Management (current form data)
// These functions handle the current liquid assets input values for persistence

// Get current liquid assets inputs (form data)
export const getLiquidAssetsInputs = () => {
  return getFromStorage(STORAGE_KEYS.LIQUID_ASSETS_INPUTS, []);
};

// Set current liquid assets inputs (form data)
export const setLiquidAssetsInputs = (inputs) => {
  
  const result = setToStorage(STORAGE_KEYS.LIQUID_ASSETS_INPUTS, inputs);
  
  if (result) {
    // Notify components that liquid assets inputs have been updated
    setTimeout(() => {
      dispatchGlobalEvent('liquidAssetsInputsUpdated', inputs);
    }, 50);
  }
  
  return result;
};

// Clear liquid assets inputs (used during reset operations)
export const clearLiquidAssetsInputs = () => {
  const result = setToStorage(STORAGE_KEYS.LIQUID_ASSETS_INPUTS, []);
  if (result) {
    setTimeout(() => {
      dispatchGlobalEvent('liquidAssetsInputsUpdated', []);
    }, 50);
  }
  return result;
};

// =============================================================================
// SHARED ACCOUNT MANAGEMENT SYSTEM
// =============================================================================
// This system allows Portfolio and Account components to share account definitions

export const SHARED_ACCOUNTS_KEY = STORAGE_KEYS.SHARED_ACCOUNTS;

// Get all shared accounts that both Portfolio and Account can use
export const getSharedAccounts = () => {
  return getFromStorage(SHARED_ACCOUNTS_KEY, []);
};

// Set shared accounts (used internally)
export const setSharedAccounts = (accounts) => {
  const result = setToStorage(SHARED_ACCOUNTS_KEY, accounts);
  if (result) {
    // Notify components that shared accounts have been updated
    setTimeout(() => {
      dispatchGlobalEvent('sharedAccountsUpdated', accounts);
    }, 50);
  }
  return result;
};

// Add or update a shared account with Portfolio as master
export const addOrUpdateSharedAccount = (accountData) => {
  const accounts = getSharedAccounts();
  const {
    accountName,
    owner,
    accountType,
    investmentCompany = '',
    taxType = '',
    source = 'manual' // 'portfolio' or 'performance' or 'manual'
  } = accountData;

  // Validate required fields
  if (!accountName || !owner || !accountType) {
    console.error('Missing required account fields:', { accountName, owner, accountType });
    return null;
  }

  // Smart matching: find similar accounts that should be combined
  // 1. Exact match (name, owner, type, investment company)
  // 2. Similar match (name, owner, type - ignore investment company differences)
  let existingIndex = accounts.findIndex(acc => 
    acc.accountName.toLowerCase() === accountName.toLowerCase().trim() &&
    acc.owner === owner &&
    acc.accountType === accountType &&
    (acc.investmentCompany || '') === investmentCompany
  );

  // If no exact match, look for similar account (same name, owner, type but different investment company)
  if (existingIndex === -1) {
    existingIndex = accounts.findIndex(acc => 
      acc.accountName.toLowerCase() === accountName.toLowerCase().trim() &&
      acc.owner === owner &&
      acc.accountType === accountType
    );
  }

  const now = new Date().toISOString();
  let accountEntry;

  if (existingIndex >= 0) {
    const existing = accounts[existingIndex];
    
    // Portfolio data takes precedence over Account data
    if (source === 'portfolio' || existing.source !== 'portfolio') {
      accountEntry = {
        id: existing.id,
        accountName: accountName.trim(),
        owner,
        accountType,
        investmentCompany: source === 'portfolio' ? investmentCompany : (existing.investmentCompany || investmentCompany),
        taxType: source === 'portfolio' ? taxType : (existing.taxType || taxType),
        source: source === 'portfolio' ? 'portfolio' : existing.source,
        createdAt: existing.createdAt,
        updatedAt: now,
        // Keep track of both sources
        sources: [...new Set([...(existing.sources || [existing.source]), source])]
      };
    } else {
      // Keep existing Portfolio data, just update timestamp
      accountEntry = {
        ...existing,
        updatedAt: now,
        sources: [...new Set([...(existing.sources || [existing.source]), source])]
      };
    }
    
    accounts[existingIndex] = accountEntry;
  } else {
    // Add new account
    accountEntry = {
      id: generateUniqueId(),
      accountName: accountName.trim(),
      owner,
      accountType,
      investmentCompany,
      taxType,
      source,
      createdAt: now,
      updatedAt: now,
      sources: [source]
    };
    accounts.push(accountEntry);
  }

  setSharedAccounts(accounts);
  return accountEntry;
};

// Get accounts filtered by source (portfolio, performance, or all)
export const getAccountsBySource = (source = 'all') => {
  const accounts = getSharedAccounts();
  if (source === 'all') {
    return accounts;
  }
  return accounts.filter(acc => acc.source === source);
};

// Sync Liquid Assets accounts to shared system
export const syncLiquidAssetsAccountsToShared = () => {
  const liquidAssetsAccounts = getLiquidAssetsAccounts();
  let syncCount = 0;

  liquidAssetsAccounts.forEach(acc => {
    const synced = addOrUpdateSharedAccount({
      accountName: acc.accountName,
      owner: acc.owner,
      accountType: acc.accountType,
      investmentCompany: '', // Liquid Assets doesn't track investment company in old system
      taxType: acc.taxType,
      source: 'liquidAssets'
    });
    if (synced) syncCount++;
  });

  return syncCount;
};

// Sync Account data accounts to shared system
export const syncAccountDataToShared = () => {
  const accountData = getAccountData();
  let syncCount = 0;
  const processedAccounts = new Set(); // Avoid duplicates in single sync

  Object.values(accountData).forEach(entry => {
    if (entry.users && typeof entry.users === 'object') {
      Object.entries(entry.users).forEach(([owner, userData]) => {
        if (userData.accountName && userData.accountType) {
          const accountKey = `${userData.accountName}-${owner}-${userData.accountType}`;
          
          if (!processedAccounts.has(accountKey)) {
            const synced = addOrUpdateSharedAccount({
              accountName: userData.accountName,
              owner: owner,
              accountType: userData.accountType,
              investmentCompany: userData.investmentCompany || '',
              taxType: '', // Account data doesn't track tax type
              source: 'account'
            });
            if (synced) syncCount++;
            processedAccounts.add(accountKey);
          }
        }
      });
    }
  });

  return syncCount;
};

// Full sync - combines accounts from both Liquid Assets and Account data
export const syncAllAccountsToShared = () => {
  const liquidAssetsCount = syncLiquidAssetsAccountsToShared();
  const accountCount = syncAccountDataToShared();
  
  return {
    liquidAssetsSynced: liquidAssetsCount,
    accountSynced: accountCount,
    totalAccounts: getSharedAccounts().length
  };
};

// Get accounts that can be used in Account component (from Liquid Assets)
export const getAccountsForAccount = () => {
  return getSharedAccounts().filter(acc => acc.source === 'liquidAssets' || acc.source === 'manual');
};

// Get accounts that can be used in Liquid Assets component (from Account data)
export const getAccountsForLiquidAssets = () => {
  return getSharedAccounts().filter(acc => acc.source === 'account' || acc.source === 'manual');
};

// Delete a shared account by ID
export const deleteSharedAccount = (accountId) => {
  const accounts = getSharedAccounts();
  const filteredAccounts = accounts.filter(acc => acc.id !== accountId);
  setSharedAccounts(filteredAccounts);
  return filteredAccounts;
};

// Delete shared accounts by matching criteria (for liquid assets account cleanup)
export const deleteSharedAccountsByMatch = (accountName, accountType, owner) => {
  const accounts = getSharedAccounts();
  const filteredAccounts = accounts.filter(acc => 
    !(acc.accountName.toLowerCase() === accountName.toLowerCase().trim() &&
      acc.accountType === accountType &&
      acc.owner === owner)
  );
  
  const deletedCount = accounts.length - filteredAccounts.length;
  if (deletedCount > 0) {
    setSharedAccounts(filteredAccounts);
  }
  
  return { deletedCount, remainingAccounts: filteredAccounts };
};

// Initialize shared accounts on app startup
export const initializeSharedAccounts = () => {
  // Check if we need to migrate existing data
  const sharedAccounts = getSharedAccounts();
  
  if (sharedAccounts.length === 0) {
    // First time setup - sync existing accounts
    const syncResult = syncAllAccountsToShared();
    return syncResult;
  }
  
  return { message: 'Shared accounts already initialized', totalAccounts: sharedAccounts.length };
};

// Clear all shared accounts (used during reset operations)
export const clearSharedAccounts = () => {
  const result = setToStorage(SHARED_ACCOUNTS_KEY, []);
  if (result) {
    // Notify components that shared accounts have been cleared
    setTimeout(() => {
      dispatchGlobalEvent('sharedAccountsUpdated', []);
    }, 50);
  }
  return result;
};

// Manual Account Groups Management
// These functions handle user-defined groupings of portfolio accounts for performance sync

// Get all manual account groups
export const getManualAccountGroups = () => {
  return getFromStorage(STORAGE_KEYS.MANUAL_ACCOUNT_GROUPS, {});
};

// Set manual account groups
export const setManualAccountGroups = (groups) => {
  const result = setToStorage(STORAGE_KEYS.MANUAL_ACCOUNT_GROUPS, groups);
  if (result) {
    // Notify components that manual groups have been updated
    setTimeout(() => {
      dispatchGlobalEvent('liquidAssetsAccountGroupsUpdated', groups);
    }, 50);
  }
  return result;
};

// Create a new manual account group
export const createManualAccountGroup = (groupName = '', accountName = '') => {
  const groups = getManualAccountGroups();
  const groupId = generateUniqueId();
  
  const newGroup = {
    id: groupId,
    name: groupName || `Account Group ${Object.keys(groups).length + 1}`,
    accountName: accountName,
    liquidAssetsAccounts: [], // Array of liquid assets account IDs
    owner: 'Joint', // Default owner for combined accounts
    totalBalance: 0,
    lastSync: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  groups[groupId] = newGroup;
  setManualAccountGroups(groups);
  
  return newGroup;
};

// Update a manual account group
export const updateManualAccountGroup = (groupId, updates) => {
  const groups = getManualAccountGroups();
  
  if (!groups[groupId]) {
    return null;
  }
  
  groups[groupId] = {
    ...groups[groupId],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  setManualAccountGroups(groups);
  return groups[groupId];
};

// Delete a manual account group
export const deleteManualAccountGroup = (groupId) => {
  const groups = getManualAccountGroups();
  
  if (!groups[groupId]) {
    return false;
  }
  
  delete groups[groupId];
  setManualAccountGroups(groups);
  
  return true;
};

// Add a liquid assets account to a manual group
export const addAccountToManualGroup = (groupId, liquidAssetsAccountId) => {
  if (!liquidAssetsAccountId) return;
  
  const groups = getManualAccountGroups();
  
  if (!groups[groupId]) {
    return null;
  }
  
  // Remove the account from any other groups first
  Object.values(groups).forEach(group => {
    // Add safety check for liquidAssetsAccounts array
    if (!group.liquidAssetsAccounts) {
      group.liquidAssetsAccounts = [];
    } else if (Array.isArray(group.liquidAssetsAccounts)) {
      group.liquidAssetsAccounts = group.liquidAssetsAccounts.filter(id => id !== liquidAssetsAccountId);
    }
  });
  
  // Add to the target group
  // Initialize liquidAssetsAccounts array if it doesn't exist
  if (!groups[groupId].liquidAssetsAccounts) {
    groups[groupId].liquidAssetsAccounts = [];
  }
  
  if (!groups[groupId].liquidAssetsAccounts.includes(liquidAssetsAccountId)) {
    groups[groupId].liquidAssetsAccounts.push(liquidAssetsAccountId);
    groups[groupId].updatedAt = new Date().toISOString();
  }
  
  setManualAccountGroups(groups);
  return groups[groupId];
};

// Remove a liquid assets account from a manual group
export const removeAccountFromManualGroup = (groupId, liquidAssetsAccountId) => {
  const groups = getManualAccountGroups();
  
  if (!groups[groupId]) {
    return null;
  }
  
  // Initialize liquidAssetsAccounts array if it doesn't exist
  if (!groups[groupId].liquidAssetsAccounts) {
    groups[groupId].liquidAssetsAccounts = [];
  } else if (Array.isArray(groups[groupId].liquidAssetsAccounts)) {
    groups[groupId].liquidAssetsAccounts = groups[groupId].liquidAssetsAccounts.filter(id => id !== liquidAssetsAccountId);
  }
  
  groups[groupId].updatedAt = new Date().toISOString();
  
  setManualAccountGroups(groups);
  return groups[groupId];
};

// Get available performance accounts for grouping
export const getAvailableAccounts = () => {
  const accountData = getAccountData();
  const currentYear = new Date().getFullYear();
  const availableAccounts = [];
  const accountSet = new Set(); // To avoid duplicates
  
  // Only get accounts from current year
  Object.values(accountData).forEach(entry => {
    if (entry.year === currentYear && entry.users) {
      Object.entries(entry.users).forEach(([owner, userData]) => {
        // Include accounts that have accountName or can generate one from accountType
        if ((userData.accountName && userData.accountName.trim()) || 
            (userData.accountType && userData.accountType.trim())) {
          
          // Use accountName if available, otherwise generate from accountType + company
          let displayAccountName = userData.accountName;
          if (!displayAccountName && userData.accountType) {
            // Generate name more consistently with Portfolio naming
            const companyPart = userData.investmentCompany ? ` ${userData.investmentCompany}` : '';
            const ownerPrefix = owner.toLowerCase() !== 'joint' ? `${owner}'s` : 'Joint';
            displayAccountName = `${ownerPrefix}${companyPart} ${userData.accountType}`.trim();
          }
          
          // Skip if we still don't have a valid account name
          if (!displayAccountName || displayAccountName.trim() === '') {
            return;
          }
          
          // Create unique identifier for deduplication based on the actual account name
          const uniqueKey = `${displayAccountName.trim()}-${owner}`;
          
          // Only add if we haven't seen this account before
          if (!accountSet.has(uniqueKey)) {
            accountSet.add(uniqueKey);
            
            availableAccounts.push({
              id: `${entry.entryId}-${owner}`,
              entryId: entry.entryId,
              owner: owner,
              accountName: displayAccountName,
              accountType: userData.accountType || 'Unknown',
              investmentCompany: userData.investmentCompany || '',
              balance: userData.balance || 0,
              year: entry.year,
              isCurrentYear: true
            });
          }
        }
      });
    }
  });
  
  // Sort by account name, then by owner
  availableAccounts.sort((a, b) => {
    const nameCompare = a.accountName.localeCompare(b.accountName);
    if (nameCompare !== 0) return nameCompare;
    return a.owner.localeCompare(b.owner);
  });
  
  return availableAccounts;
};

// Get accounts that are not already assigned to any manual group
export const getUnusedAccounts = () => {
  const allAccounts = getAvailableAccounts();
  const manualGroups = getManualAccountGroups();
  
  // Collect all account names that are already assigned to groups
  const usedAccountNames = new Set();
  Object.values(manualGroups).forEach(group => {
    if (group.accountName) {
      usedAccountNames.add(group.accountName);
    }
  });
  
  // Filter out accounts that are already used
  const unusedAccounts = allAccounts.filter(account => 
    !usedAccountNames.has(account.accountName)
  );
  
  return unusedAccounts;
};

// Get liquid assets accounts that are not in any manual group
export const getUngroupedLiquidAssetsAccounts = (liquidAssetsInputs) => {
  const groups = getManualAccountGroups();
  const groupedAccountIds = new Set();
  
  // Collect all account IDs that are already in groups
  Object.values(groups).forEach(group => {
    // Add safety check for liquidAssetsAccounts array
    if (group.liquidAssetsAccounts && Array.isArray(group.liquidAssetsAccounts)) {
      group.liquidAssetsAccounts.forEach(accountId => {
        groupedAccountIds.add(accountId);
      });
    }
  });
  
  // Return accounts that are not in any group (also add safety check for liquidAssetsInputs)
  if (!Array.isArray(liquidAssetsInputs)) {
    return [];
  }
  
  return liquidAssetsInputs.filter(account => !groupedAccountIds.has(account.id));
};

// Calculate total balance for a manual group
export const calculateManualGroupBalance = (groupId, liquidAssetsInputs) => {
  const groups = getManualAccountGroups();
  const group = groups[groupId];
  
  if (!group) {
    return 0;
  }
  
  // Add safety check for liquidAssetsAccounts array
  if (!group.liquidAssetsAccounts || !Array.isArray(group.liquidAssetsAccounts)) {
    return 0;
  }
  
  // Add safety check for liquidAssetsInputs
  if (!Array.isArray(liquidAssetsInputs)) {
    return 0;
  }
  
  return group.liquidAssetsAccounts.reduce((total, accountId) => {
    const account = liquidAssetsInputs.find(acc => acc.id === accountId);
    return total + (parseFloat(account?.amount) || 0);
  }, 0);
};

// Clear all manual account groups (used during reset operations)
export const clearManualAccountGroups = () => {
  const result = setToStorage(STORAGE_KEYS.MANUAL_ACCOUNT_GROUPS, {});
  if (result) {
    setTimeout(() => {
      dispatchGlobalEvent('liquidAssetsAccountGroupsUpdated', {});
    }, 50);
  }
  return result;
};


// Sync paycheck data to annual data for current year
export const syncPaycheckToAnnual = () => {
  try {
    const paycheckData = getPaycheckData();
    const annualData = getAnnualData();
    const currentYear = new Date().getFullYear();

    // Get users from paycheck data
    const users = [];
    if (paycheckData?.user1?.name?.trim()) {
      users.push({
        name: paycheckData.user1.name.trim(),
        data: paycheckData.user1
      });
    }
    if (paycheckData?.user2?.name?.trim() && (paycheckData?.settings?.activeUsers?.includes('user2') ?? true)) {
      users.push({
        name: paycheckData.user2.name.trim(),
        data: paycheckData.user2
      });
    }

    // Only proceed if we have actual paycheck data
    if (users.length === 0) {
      return true; // No data to sync, but not an error
    }

    // Check if there's already a proper annual entry for current year (like hist_2025_demo)
    const hasProperAnnualEntry = Object.keys(annualData).some(key => {
      const entry = annualData[key];
      return entry && entry.year === currentYear && key !== currentYear.toString() && 
             entry.taxFree !== undefined; // Has full annual data structure
    });

    // If there's already a proper annual entry, don't create a duplicate simple entry
    if (hasProperAnnualEntry) {
      return true; // Proper entry exists, no need to sync
    }

    // Initialize current year data if it doesn't exist
    if (!annualData[currentYear]) {
      annualData[currentYear] = { users: {} };
    }

    // Update annual data for each user
    users.forEach(user => {
      if (!annualData[currentYear].users[user.name]) {
        annualData[currentYear].users[user.name] = {};
      }

      const userData = annualData[currentYear].users[user.name];
      
      // Sync salary, employer, and bonus from paycheck data
      userData.employer = user.data.employer || '';
      userData.salary = parseFloat(user.data.salary) || 0;
      
      // Use the effective bonus calculated by PaycheckForm (includes override and 401k removal logic)
      userData.bonus = parseFloat(user.data.effectiveBonus) || 0;
    });

    // Calculate AGI as sum of salary and bonus for all users in current year
    let totalAGI = 0;
    users.forEach(user => {
      const userData = annualData[currentYear].users[user.name];
      if (userData) {
        totalAGI += (userData.salary || 0) + (userData.bonus || 0);
      }
    });
    
    // Set the calculated AGI in the current year entry
    annualData[currentYear].agi = totalAGI;

    // Save updated annual data
    const saveResult = setAnnualData(annualData);
    
    if (saveResult) {
      // Dispatch event to notify other components
      setTimeout(() => {
        dispatchGlobalEvent('annualDataUpdated', annualData);
      }, 50);
    }
    
    return saveResult;
  } catch (error) {
    console.error('Error syncing paycheck to annual data:', error);
    return false;
  }
};

// Asset Liability data utilities
export const getAssetLiabilityData = () => {
  const data = getFromStorage(STORAGE_KEYS.ASSET_LIABILITY_DATA, {});
  return data;
};

export const setAssetLiabilityData = (data) => {
  const result = setToStorage(STORAGE_KEYS.ASSET_LIABILITY_DATA, data);
  if (result) {
    setTimeout(() => {
      dispatchGlobalEvent('assetLiabilityDataUpdated', data);
    }, 50);
  }
  return result;
};

// ============================================================================
// BACKWARD COMPATIBILITY ALIASES
// ============================================================================
// These aliases maintain compatibility with existing code during transition


// Legacy Performance data aliases (backward compatibility)
export const getPerformanceData = getAccountData;
export const setPerformanceData = setAccountData;
export const syncPerformanceAccountsToShared = syncAccountDataToShared;

// ============================================================================
// PORTFOLIO/LIQUID ASSETS BACKWARD COMPATIBILITY ALIASES
// ============================================================================
// These aliases maintain compatibility with existing code during transition

// Portfolio accounts aliases (now liquid assets accounts)
export const getPortfolioAccounts = getLiquidAssetsAccounts;
export const setPortfolioAccounts = setLiquidAssetsAccounts;
export const addPortfolioAccount = addLiquidAssetsAccount;

// Portfolio records aliases (now liquid assets records)
export const getPortfolioRecords = getLiquidAssetsRecords;
export const setPortfolioRecords = setLiquidAssetsRecords;
export const addPortfolioRecord = addLiquidAssetsRecord;
export const deletePortfolioRecord = deleteLiquidAssetsRecord;
export const getLastPortfolioUpdate = getLastLiquidAssetsUpdate;

// Portfolio inputs aliases (now liquid assets inputs)
export const getPortfolioInputs = getLiquidAssetsInputs;
export const setPortfolioInputs = setLiquidAssetsInputs;
export const clearPortfolioInputs = clearLiquidAssetsInputs;

// Shared accounts aliases
export const syncPortfolioAccountsToShared = syncLiquidAssetsAccountsToShared;
export const getAccountsForPortfolio = getAccountsForLiquidAssets;

// Manual groups aliases
export const getUngroupedPortfolioAccounts = getUngroupedLiquidAssetsAccounts;

// ============================================================================
// TAX CONSTANTS UTILITIES
// ============================================================================

// Tax constants data utilities with migration support
export const getTaxConstants = () => {
  const stored = getFromStorage(STORAGE_KEYS.TAX_CONSTANTS, null);
  
  // If no custom tax constants are stored, migrate from the file and store them
  if (!stored) {
    try {
      // Import default tax constants from file for initial migration
      const defaultConstants = require('../config/taxConstants');
      const initialConstants = {
        ANNUAL_WAGE_WITHHOLDING: defaultConstants.ANNUAL_WAGE_WITHHOLDING,
        ANNUAL_MULTIPLE_JOBS_WITHHOLDING: defaultConstants.ANNUAL_MULTIPLE_JOBS_WITHHOLDING,
        STANDARD_DEDUCTIONS: defaultConstants.STANDARD_DEDUCTIONS,
        PAYROLL_TAX_RATES: defaultConstants.PAYROLL_TAX_RATES,
        CONTRIBUTION_LIMITS: defaultConstants.CONTRIBUTION_LIMITS,
        W4_CONFIGS: defaultConstants.W4_CONFIGS,
        TAX_CREDITS: defaultConstants.TAX_CREDITS,
        ALLOWANCE_AMOUNT: defaultConstants.ALLOWANCE_AMOUNT,
        PAY_PERIODS: defaultConstants.PAY_PERIODS
      };
      
      // Store the migrated constants
      setTaxConstants(initialConstants);
      
      return initialConstants;
    } catch (error) {
      console.error('Failed to migrate tax constants:', error);
      // Return hardcoded defaults as fallback
      return getHardcodedTaxConstants();
    }
  }
  
  return stored;
};

export const setTaxConstants = (constants) => {
  const result = setToStorage(STORAGE_KEYS.TAX_CONSTANTS, constants);
  if (result) {
    // Dispatch event to notify components that tax constants have been updated
    setTimeout(() => {
      dispatchGlobalEvent('taxConstantsUpdated', constants);
    }, 50);
  }
  return result;
};

export const resetTaxConstantsToDefaults = () => {
  // Clear stored tax constants to force loading of defaults
  const result = removeFromStorage(STORAGE_KEYS.TAX_CONSTANTS);
  if (result) {
    setTimeout(() => {
      dispatchGlobalEvent('taxConstantsUpdated', getTaxConstants());
    }, 50);
  }
  return result;
};

// Hardcoded tax constants as ultimate fallback (2025 values)
const getHardcodedTaxConstants = () => {
  return {
    ANNUAL_WAGE_WITHHOLDING: {
      single: [
        { threshold: 0, baseWithholding: 0, rate: 0 },
        { threshold: 6400, baseWithholding: 0, rate: 0.10 },
        { threshold: 18325, baseWithholding: 1192.5, rate: 0.12 },
        { threshold: 54875, baseWithholding: 5578.5, rate: 0.22 },
        { threshold: 109750, baseWithholding: 17651, rate: 0.24 },
        { threshold: 203700, baseWithholding: 40199, rate: 0.32 },
        { threshold: 256925, baseWithholding: 57231, rate: 0.35 },
        { threshold: 632750, baseWithholding: 183647.25, rate: 0.37 }
      ],
      marriedJointly: [
        { threshold: 0, baseWithholding: 0, rate: 0 },
        { threshold: 17100, baseWithholding: 0, rate: 0.10 },
        { threshold: 40950, baseWithholding: 2385, rate: 0.12 },
        { threshold: 114050, baseWithholding: 115700, rate: 0.22 },
        { threshold: 223800, baseWithholding: 35302, rate: 0.24 },
        { threshold: 411700, baseWithholding: 80398, rate: 0.32 },
        { threshold: 518150, baseWithholding: 114462, rate: 0.35 },
        { threshold: 768700, baseWithholding: 202154.50, rate: 0.37 }
      ],
      marriedSeparately: [
        { threshold: 0, baseWithholding: 0, rate: 0 },
        { threshold: 6400, baseWithholding: 0, rate: 0.10 },
        { threshold: 18325, baseWithholding: 1192.5, rate: 0.12 },
        { threshold: 54875, baseWithholding: 5578.5, rate: 0.22 },
        { threshold: 109750, baseWithholding: 17651, rate: 0.24 },
        { threshold: 203700, baseWithholding: 40199, rate: 0.32 },
        { threshold: 256925, baseWithholding: 57231, rate: 0.35 },
        { threshold: 632750, baseWithholding: 183647.25, rate: 0.37 }
      ],
      headOfHousehold: [
        { threshold: 0, baseWithholding: 0, rate: 0 },
        { threshold: 13900, baseWithholding: 0, rate: 0.10 },
        { threshold: 30900, baseWithholding: 1700, rate: 0.12 },
        { threshold: 78750, baseWithholding: 7442, rate: 0.22 },
        { threshold: 117250, baseWithholding: 15912, rate: 0.24 },
        { threshold: 211200, baseWithholding: 38460, rate: 0.32 },
        { threshold: 264400, baseWithholding: 55484, rate: 0.35 },
        { threshold: 640250, baseWithholding: 187031.5, rate: 0.37 }
      ]
    },
    ANNUAL_MULTIPLE_JOBS_WITHHOLDING: {
      single: [
        { threshold: 0, baseWithholding: 0, rate: 0 },
        { threshold: 7500, baseWithholding: 0, rate: 0.10 },
        { threshold: 13463, baseWithholding: 596.25, rate: 0.12 },
        { threshold: 31738, baseWithholding: 2789.25, rate: 0.22 },
        { threshold: 59175, baseWithholding: 8825.5, rate: 0.24 },
        { threshold: 106150, baseWithholding: 20099.5, rate: 0.32 },
        { threshold: 132763, baseWithholding: 28615.50, rate: 0.35 },
        { threshold: 320675, baseWithholding: 94354.88, rate: 0.37 }
      ],
      marriedJointly: [
        { threshold: 0, baseWithholding: 0, rate: 0 },
        { threshold: 15000, baseWithholding: 0, rate: 0.10 },
        { threshold: 26925, baseWithholding: 1182.5, rate: 0.12 },
        { threshold: 63475, baseWithholding: 5578.5, rate: 0.22 },
        { threshold: 118350, baseWithholding: 17651, rate: 0.24 },
        { threshold: 212300, baseWithholding: 40199, rate: 0.32 },
        { threshold: 265525, baseWithholding: 57231, rate: 0.35 },
        { threshold: 390800, baseWithholding: 101077.25, rate: 0.37 }
      ],
      marriedSeparately: [
        { threshold: 0, baseWithholding: 0, rate: 0 },
        { threshold: 7500, baseWithholding: 0, rate: 0.10 },
        { threshold: 13463, baseWithholding: 596.25, rate: 0.12 },
        { threshold: 31738, baseWithholding: 2789.25, rate: 0.22 },
        { threshold: 59175, baseWithholding: 8825.5, rate: 0.24 },
        { threshold: 106150, baseWithholding: 20099.5, rate: 0.32 },
        { threshold: 132763, baseWithholding: 28615.50, rate: 0.35 },
        { threshold: 320675, baseWithholding: 94354.88, rate: 0.37 }
      ],
      headOfHousehold: [
        { threshold: 0, baseWithholding: 0, rate: 0 },
        { threshold: 11250, baseWithholding: 0, rate: 0.10 },
        { threshold: 19750, baseWithholding: 850, rate: 0.12 },
        { threshold: 43675, baseWithholding: 3272, rate: 0.22 },
        { threshold: 62925, baseWithholding: 7956, rate: 0.24 },
        { threshold: 109000, baseWithholding: 19230, rate: 0.32 },
        { threshold: 136500, baseWithholding: 27742, rate: 0.35 },
        { threshold: 324425, baseWithholding: 93515.75, rate: 0.37 }
      ]
    },
    STANDARD_DEDUCTIONS: {
      single: 15000,
      marriedJointly: 30000,
      marriedSeparately: 15000,
      headOfHousehold: 22500
    },
    PAYROLL_TAX_RATES: {
      socialSecurity: 0.062,
      medicare: 0.0145
    },
    CONTRIBUTION_LIMITS: {
      k401_employee: 23500,
      k401_catchUp: 7500,
      k401_total: 70000,
      hsa_self: 4300,
      hsa_family: 8550,
      hsa_catchUp: 1000,
      ira_self: 7000,
      ira_catchUp: 1000
    },
    W4_CONFIGS: {
      new: {
        name: "2020+ W-4 Form",
        allowances: false,
        extraWithholding: true,
        dependentCredits: true
      },
      old: {
        name: "2019 and Earlier W-4 Form",
        allowances: true,
        extraWithholding: true,
        dependentCredits: false
      }
    },
    TAX_CREDITS: {
      childTaxCredit: 2000,
      otherDependentCredit: 500
    },
    ALLOWANCE_AMOUNT: 4850,
    PAY_PERIODS: {
      weekly: {
        name: "Weekly",
        periodsPerYear: 52
      },
      biWeekly: {
        name: "Bi-Weekly",
        periodsPerYear: 26
      },
      semiMonthly: {
        name: "Semi-Monthly",
        periodsPerYear: 24
      },
      monthly: {
        name: "Monthly",
        periodsPerYear: 12
      }
    }
  };
};


