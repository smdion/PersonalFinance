import { generateDataFilename } from './calculationHelpers';

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
  BUDGET_DATA: 'budgetData',
  PAYCHECK_DATA: 'paycheckData',
  FORM_DATA: 'formData',
  APP_SETTINGS: 'appSettings',
  HISTORICAL_DATA: 'historicalData',
  PERFORMANCE_DATA: 'performanceData',
  NETWORTH_SETTINGS: 'networthSettings',
  SAVINGS_DATA: 'savingsData',
  RETIREMENT_DATA: 'retirementData',
  PORTFOLIO_ACCOUNTS: 'portfolioAccounts',
  PORTFOLIO_RECORDS: 'portfolioRecords',
  PORTFOLIO_INPUTS: 'portfolioInputs',
  SHARED_ACCOUNTS: 'sharedAccounts',
  MANUAL_ACCOUNT_GROUPS: 'manualAccountGroups'
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

// Name mapping utilities for handling name changes
export const NAME_MAPPING_KEY = 'nameMapping';

export const getNameMapping = () => {
  return getFromStorage(NAME_MAPPING_KEY, {});
};

export const setNameMapping = (mapping) => {
  return setToStorage(NAME_MAPPING_KEY, mapping);
};

// Add name mapping functionality - Enhanced for consistency
let nameMapping = {};
let nameMappingLoaded = false;

// Load name mapping from localStorage consistently
const loadNameMapping = () => {
  if (!nameMappingLoaded) {
    try {
      const savedMappings = JSON.parse(localStorage.getItem('nameMapping') || '{}');
      nameMapping = { ...savedMappings };
      nameMappingLoaded = true;
    } catch (error) {
        nameMapping = {};
      nameMappingLoaded = true;
    }
  }
  return nameMapping;
};

export const updateNameMapping = (oldName, newName) => {
  if (!oldName || !newName || oldName === newName) return;
  
  // Ensure we're working with trimmed names but preserve spaces within the name
  const trimmedOldName = oldName.trim();
  const trimmedNewName = newName.trim();
  
  if (!trimmedOldName || !trimmedNewName || trimmedOldName === trimmedNewName) return;
  
  
  // Load current mappings first
  loadNameMapping();
  
  // Update in-memory mapping
  nameMapping[trimmedOldName] = trimmedNewName;
  
  // Save to localStorage immediately and synchronously
  try {
    localStorage.setItem('nameMapping', JSON.stringify(nameMapping));
    
    // Force immediate migration of all data
    migrateAllDataForNameChange(trimmedOldName, trimmedNewName);
    
  } catch (error) {
  }
  
  // Dispatch event to notify components
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('nameMappingUpdated'));
  }, 100);
};

export const getCurrentUserName = (originalName) => {
  if (!originalName) return originalName;
  
  // Ensure we're working with the trimmed version for lookup but preserve the original structure
  const trimmedOriginalName = originalName.trim();
  
  // Always load mappings to ensure we have the latest
  loadNameMapping();
  
  // Return mapped name or original if no mapping exists
  const mappedName = nameMapping[trimmedOriginalName] || trimmedOriginalName;
  return mappedName;
};

// Enhanced function to apply name mapping to any data structure
export const applyNameMappingToData = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const mapping = getNameMapping();
  if (!mapping || Object.keys(mapping).length === 0) return data;
  
  
  const processedData = {};
  
  Object.entries(data).forEach(([key, entry]) => {
    if (entry.users && typeof entry.users === 'object') {
      const mappedUsers = {};
      
      Object.entries(entry.users).forEach(([userName, userData]) => {
        const mappedName = getCurrentUserName(userName);
        mappedUsers[mappedName] = userData;
      });
      
      processedData[key] = { ...entry, users: mappedUsers };
    } else {
      processedData[key] = entry;
    }
  });
  
  return processedData;
};

// Get all historical names for a user
export const getAllUserNames = (currentName) => {
  if (!currentName) return [];
  
  const mapping = getNameMapping();
  const names = [currentName];
  
  // Find original name that maps to current name
  Object.keys(mapping).forEach(originalName => {
    if (mapping[originalName] === currentName && !names.includes(originalName)) {
      names.push(originalName);
    }
  });
  
  return names;
};

export const migrateDataForNameChange = (data, oldName, newName) => {
  
  if (!data || typeof data !== 'object') return data;
  
  // Ensure we're working with trimmed names but preserve spaces
  const trimmedOldName = oldName.trim();
  const trimmedNewName = newName.trim();
  
  if (!trimmedOldName || !trimmedNewName || trimmedOldName === trimmedNewName) {
    return data;
  }
  
  const migratedData = {};
  let hasChanges = false;
  
  Object.entries(data).forEach(([key, entry]) => {
    if (entry && entry.users && typeof entry.users === 'object') {
      const migratedEntry = { ...entry };
      const migratedUsers = {};
      
      Object.entries(entry.users).forEach(([userName, userData]) => {
        // Use exact string comparison with trimmed names to handle names with spaces
        const trimmedUserName = userName.trim();
        if (trimmedUserName === trimmedOldName) {
          hasChanges = true;
          // Update the name field within the user data if it exists
          if (userData && typeof userData === 'object') {
            migratedUsers[trimmedNewName] = {
              ...userData,
              // Ensure the name field is updated with the full new name including spaces
              ...(userData.name !== undefined && { name: trimmedNewName })
            };
          } else {
            migratedUsers[trimmedNewName] = userData;
          }
        } else {
          // Keep other users as-is but ensure we preserve their full names
          migratedUsers[userName] = userData;
        }
      });
      
      migratedEntry.users = migratedUsers;
      migratedData[key] = migratedEntry;
    } else {
      migratedData[key] = entry;
    }
  });
  
  return migratedData;
};

// Enhanced function to migrate all data types when names change - Force immediate save
export const migrateAllDataForNameChange = (oldName, newName) => {
  if (!oldName || !newName || oldName === newName) return;
  
  
  // Migrate historical data - Force save
  try {
    const historicalData = getFromStorage(STORAGE_KEYS.HISTORICAL_DATA, {});
    const migratedHistorical = migrateDataForNameChange(historicalData, oldName, newName);
    
    // Force immediate save
    const saveResult = setToStorage(STORAGE_KEYS.HISTORICAL_DATA, migratedHistorical);
    
    if (saveResult) {
    }
  } catch (error) {
    console.error('Error migrating historical data:', error);
  }
  
  // Migrate performance data - Force save
  try {
    const performanceData = getFromStorage(STORAGE_KEYS.PERFORMANCE_DATA, {});
    const migratedPerformance = migrateDataForNameChange(performanceData, oldName, newName);
    
    // Force immediate save
    const saveResult = setToStorage(STORAGE_KEYS.PERFORMANCE_DATA, migratedPerformance);
    
    if (saveResult) {
    }
  } catch (error) {
    console.error('Error migrating performance data:', error);
  }
  
  // Dispatch events to notify components of the data changes - with delay to ensure saves are complete
  setTimeout(() => {
    dispatchGlobalEvent('historicalDataUpdated', getFromStorage(STORAGE_KEYS.HISTORICAL_DATA, {}));
    dispatchGlobalEvent('performanceDataUpdated', getFromStorage(STORAGE_KEYS.PERFORMANCE_DATA, {}));
  }, 200);
};

// Specific data utilities
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

export const getFormData = () => {
  return getFromStorage(STORAGE_KEYS.FORM_DATA, {});
};

export const setFormData = (data) => {
  return setToStorage(STORAGE_KEYS.FORM_DATA, data);
};

export const getAppSettings = () => {
  return getFromStorage(STORAGE_KEYS.APP_SETTINGS, {});
};

export const setAppSettings = (data) => {
  return setToStorage(STORAGE_KEYS.APP_SETTINGS, data);
};

// Performance sync settings utilities
export const getPerformanceSyncSettings = () => {
  const appSettings = getAppSettings();
  return {
    combineAccountsAcrossOwners: appSettings.combineAccountsAcrossOwners ?? false,
    ...appSettings.performanceSync
  };
};

export const setPerformanceSyncSettings = (settings) => {
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

export const getHistoricalDataWithNameMapping = () => {
  try {
    const data = getFromStorage(STORAGE_KEYS.HISTORICAL_DATA, {});
    // Apply name mapping to ensure current names are displayed
    return applyNameMappingToData(data);
  } catch (error) {
    console.error('Error loading historical data with name mapping:', error);
    return {};
  }
};

export const getHistoricalData = () => {
  // Always return data with name mapping applied for consistency
  return getHistoricalDataWithNameMapping();
};

export const setHistoricalData = (data) => {
  
  // Don't apply name mapping when saving - data should already have correct names
  const result = setToStorage(STORAGE_KEYS.HISTORICAL_DATA, data);
  return result;
};

export const setHistoricalDataWithNameMapping = (data) => {
  
  // Don't apply name mapping when saving - data should already have correct names
  const result = setHistoricalData(data);
  if (result) {
    // Dispatch update event to notify components
    setTimeout(() => {
      dispatchGlobalEvent('historicalDataUpdated', data);
    }, 50);
  }
  return result;
};

export const getPerformanceDataWithNameMapping = () => {
  try {
    const data = getFromStorage(STORAGE_KEYS.PERFORMANCE_DATA, {});
    // Apply name mapping to ensure current names are displayed
    return applyNameMappingToData(data);
  } catch (error) {
    console.error('Error loading performance data with name mapping:', error);
    return {};
  }
};

export const getPerformanceData = () => {
  // Always return data with name mapping applied for consistency
  return getPerformanceDataWithNameMapping();
};

export const setPerformanceData = (data) => {
  
  // Don't apply name mapping when saving - data should already have correct names
  const result = setToStorage(STORAGE_KEYS.PERFORMANCE_DATA, data);
  return result;
};

export const setPerformanceDataWithNameMapping = (data) => {
  const result = setPerformanceData(data);
  
  if (result) {
    // Dispatch update event to notify components
    setTimeout(() => {
      dispatchGlobalEvent('performanceDataUpdated', data);
    }, 50);
  }
  return result;
};

// Export all app data to JSON
export const exportAllData = () => {
  const timestamp = new Date().toISOString();
  const exportData = {
    exportedAt: timestamp,
    version: '2.0.0', // Updated version to reflect new data structure
    budgetData: getBudgetData(),
    paycheckData: getPaycheckData(),
    formData: getFormData(),
    appSettings: getAppSettings(),
    historicalData: getHistoricalData(),
    performanceData: getPerformanceData(),
    retirementData: getRetirementData(),
    // New portfolio-related data
    networthSettings: getNetWorthSettings(),
    savingsData: getSavingsData(),
    portfolioAccounts: getPortfolioAccounts(),
    portfolioRecords: getPortfolioRecords(),
    portfolioInputs: getPortfolioInputs(),
    sharedAccounts: getSharedAccounts(),
    manualAccountGroups: getManualAccountGroups(),
    // Include name mapping for data integrity
    nameMapping: getNameMapping()
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
    
    // For performance data, ensure we get the raw data without any transformations
    if (storageKey === 'performanceData' && data !== null) {
      try {
        // Get raw performance data directly from localStorage to ensure completeness
        const rawData = localStorage.getItem('performanceData');
        if (rawData) {
          data = JSON.parse(rawData);
        }
      } catch (error) {
        console.error('Error getting raw performance data for export:', error);
        // Fall back to the transformed data if raw access fails
      }
    }
    
    if (data !== null) {
      allData[storageKey] = data;
    }
  });
  
  // Also export name mapping
  allData.nameMapping = getNameMapping();
  
  return allData;
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
  
  // Portfolio Records CSV
  const portfolioRecords = getPortfolioRecords();
  if (portfolioRecords.length > 0) {
    const allAccounts = [];
    portfolioRecords.forEach(record => {
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
      
      exports.portfolioRecords = {
        filename: `portfolio_records_${timestamp}.csv`,
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
  
  // Performance Data CSV
  const performanceData = getPerformanceData();
  if (Object.keys(performanceData).length > 0) {
    const performanceRows = [];
    Object.values(performanceData).forEach(entry => {
      if (entry.users) {
        Object.entries(entry.users).forEach(([owner, userData]) => {
          performanceRows.push({
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
    
    if (performanceRows.length > 0) {
      const headers = ['year', 'owner', 'accountName', 'accountType', 'balance', 'contributions', 'employerMatch', 'gains', 'fees', 'withdrawals', 'balanceUpdatedFrom', 'balanceUpdatedAt'];
      const rows = [headers];
      
      performanceRows.forEach(row => {
        rows.push(Object.values(row));
      });
      
      exports.performanceData = {
        filename: `performance_data_${timestamp}.csv`,
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
  
  // Historical Data CSV
  const historicalData = getHistoricalData();
  if (Object.keys(historicalData).length > 0) {
    const historicalRows = [];
    Object.entries(historicalData).forEach(([year, yearData]) => {
      // Add combined totals row
      historicalRows.push({
        year: year,
        owner: 'TOTAL',
        taxFree: yearData.taxFree || 0,
        taxDeferred: yearData.taxDeferred || 0,
        brokerage: yearData.brokerage || 0,
        espp: yearData.espp || 0,
        hsa: yearData.hsa || 0,
        cash: yearData.cash || 0
      });
      
      // Add individual user rows
      if (yearData.users) {
        Object.entries(yearData.users).forEach(([owner, userData]) => {
          historicalRows.push({
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
    
    if (historicalRows.length > 0) {
      const headers = ['year', 'owner', 'taxFree', 'taxDeferred', 'brokerage', 'espp', 'hsa', 'cash'];
      const rows = [headers];
      
      historicalRows.forEach(row => {
        rows.push(Object.values(row));
      });
      
      exports.historicalData = {
        filename: `historical_data_${timestamp}.csv`,
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
    const headers = ['groupId', 'groupName', 'performanceAccountName', 'owner', 'portfolioAccountIds', 'lastSync', 'createdAt', 'updatedAt'];
    const rows = [headers];
    
    Object.entries(manualGroups).forEach(([groupId, group]) => {
      rows.push([
        groupId,
        group.name || '',
        group.performanceAccountName || '',
        group.owner || '',
        (group.portfolioAccounts || []).join(';'), // Use semicolon separator for array
        group.lastSync || '',
        group.createdAt || '',
        group.updatedAt || ''
      ]);
    });
    
    exports.manualAccountGroups = {
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
  
  // Portfolio Inputs CSV (excluding amounts - only account definitions)
  const portfolioInputs = getPortfolioInputs();
  if (portfolioInputs.length > 0) {
    const headers = ['id', 'accountName', 'owner', 'taxType', 'accountType', 'investmentCompany', 'description'];
    const rows = [headers];
    
    portfolioInputs.forEach(input => {
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
    
    exports.portfolioInputs = {
      filename: `portfolio_inputs_${timestamp}.csv`,
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

// Helper function to check if user data is empty/meaningless
const isUserDataEmpty = (userData) => {
  if (!userData || typeof userData !== 'object') return true;
  
  // Check if all values are empty, null, undefined
  // NOTE: We do NOT consider 0 as empty since it can be valid financial data
  return Object.values(userData).every(value => {
    if (value === null || value === undefined || value === '') return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    return false;
  });
};

// Helper function to clean empty user data from entries
const cleanEmptyUserData = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const cleanedData = {};
  
  Object.entries(data).forEach(([key, entry]) => {
    if (entry.users && typeof entry.users === 'object') {
      const cleanedUsers = {};
      
      Object.entries(entry.users).forEach(([userName, userData]) => {
        // Only keep user data that is not empty
        if (!isUserDataEmpty(userData)) {
          cleanedUsers[userName] = userData;
        }
      });
      
      // Only keep entry if it has users or other data
      if (Object.keys(cleanedUsers).length > 0 || Object.keys(entry).some(k => k !== 'users' && entry[k] !== undefined && entry[k] !== '')) {
        cleanedData[key] = { ...entry, users: cleanedUsers };
      }
    } else {
      // Keep entries without users structure
      cleanedData[key] = entry;
    }
  });
  
  return cleanedData;
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
    
    // Also clear name mapping
    removeFromStorage(NAME_MAPPING_KEY);
    
    // Also clear any other potential storage keys that might exist
    const keysToRemove = [
      'budgetData',
      'paycheckData', 
      'formData',
      'appSettings',
      'historicalData',
      'performanceData',
      'networthSettings',
      'retirementData',
      'portfolioAccounts',
      'portfolioRecords',
      'portfolioInputs',
      'sharedAccounts', 
      'manualAccountGroups',
      'savingsData',
      'nameMapping',
      'hasSeenBetaWelcome'
    ];
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        // Ignore errors during cleanup
      }
    });
    
    // Clear the in-memory cache
    nameMapping = {};
    nameMappingLoaded = false;
    
    // Import each section if it exists (handle both camelCase and snake_case for backward compatibility)
    if (importData.budgetData !== undefined || importData.budget_data !== undefined) {
      setBudgetData(importData.budgetData || importData.budget_data);
      importedSections.push('Budget Data');
    }
    
    if (importData.paycheckData !== undefined || importData.paycheck_data !== undefined) {
      setPaycheckData(importData.paycheckData || importData.paycheck_data);
      importedSections.push('Paycheck Data');
    }
    
    if (importData.formData !== undefined || importData.form_data !== undefined) {
      setFormData(importData.formData || importData.form_data);
      importedSections.push('Form Data');
    }
    
    if (importData.appSettings !== undefined || importData.app_settings !== undefined) {
      setAppSettings(importData.appSettings || importData.app_settings);
      importedSections.push('App Settings');
    }
    
    if (importData.historicalData !== undefined || importData.historical_data !== undefined) {
      // Clean empty user data before importing
      const cleanedHistoricalData = cleanEmptyUserData(importData.historicalData || importData.historical_data);
      setHistoricalData(cleanedHistoricalData);
      importedSections.push('Historical Data');
    }
    
    if (importData.performanceData !== undefined || importData.performance_data !== undefined) {
      // Handle both array and object formats during import
      let performanceDataToImport = importData.performanceData || importData.performance_data;
      if (Array.isArray(performanceDataToImport)) {
        // Convert array to object format
        performanceDataToImport = performanceDataToImport.reduce((acc, entry) => {
          acc[entry.entryId] = entry;
          return acc;
        }, {});
      }
      
      // Clean empty user data before importing
      const cleanedPerformanceData = cleanEmptyUserData(performanceDataToImport);
      
      const result = setPerformanceData(cleanedPerformanceData);
      if (result) {
        importedSections.push('Performance Data');
      } else {
        errors.push('Performance Data: Failed to save');
      }
    }
    
    if (importData.retirementData !== undefined || importData.retirement_data !== undefined) {
      setRetirementData(importData.retirementData || importData.retirement_data);
      importedSections.push('Retirement Data');
    }
    
    // Import portfolio-related data
    if (importData.networthSettings !== undefined || importData.networth_settings !== undefined) {
      setNetWorthSettings(importData.networthSettings || importData.networth_settings);
      importedSections.push('Net Worth Settings');
    }
    
    if (importData.savingsData !== undefined || importData.savings_data !== undefined) {
      setSavingsData(importData.savingsData || importData.savings_data);
      importedSections.push('Savings Data');
    }
    
    if (importData.portfolioAccounts !== undefined || importData.portfolio_accounts !== undefined) {
      setPortfolioAccounts(importData.portfolioAccounts || importData.portfolio_accounts);
      importedSections.push('Portfolio Accounts');
    }
    
    if (importData.portfolioRecords !== undefined || importData.portfolio_records !== undefined) {
      setPortfolioRecords(importData.portfolioRecords || importData.portfolio_records);
      importedSections.push('Portfolio Records');
    }
    
    if (importData.sharedAccounts !== undefined || importData.shared_accounts !== undefined) {
      setSharedAccounts(importData.sharedAccounts || importData.shared_accounts);
      importedSections.push('Shared Accounts');
    }
    
    if (importData.portfolioInputs !== undefined || importData.portfolio_inputs !== undefined) {
      setPortfolioInputs(importData.portfolioInputs || importData.portfolio_inputs);
      importedSections.push('Portfolio Inputs');
    }
    
    if (importData.manualAccountGroups !== undefined || importData.manual_account_groups !== undefined) {
      setManualAccountGroups(importData.manualAccountGroups || importData.manual_account_groups);
      importedSections.push('Manual Account Groups');
    }
    
    // Import name mapping (should be done last to ensure data integrity)
    if (importData.nameMapping !== undefined) {
      setNameMapping(importData.nameMapping);
      importedSections.push('Name Mapping');
    }

    // Import completed successfully
    
    // Trigger events to notify components
    setTimeout(() => {
      dispatchGlobalEvent('budgetDataUpdated');
      dispatchGlobalEvent('paycheckDataUpdated');
      dispatchGlobalEvent('historicalDataUpdated');
      dispatchGlobalEvent('performanceDataUpdated');
      dispatchGlobalEvent('sharedAccountsUpdated');
      dispatchGlobalEvent('portfolioInputsUpdated');
      dispatchGlobalEvent('manualAccountGroupsUpdated');
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
  console.log('Direct import data:', jsonData);
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
    Object.values(STORAGE_KEYS).forEach(key => {
      removeFromStorage(key);
    });
    
    // Also clear name mapping
    removeFromStorage(NAME_MAPPING_KEY);
    
    // Also clear any other potential storage keys that might exist
    const keysToRemove = [
      'budgetData',
      'paycheckData', 
      'formData',
      'appSettings',
      'historicalData',
      'performanceData',
      'networthSettings',
      'retirementData',
      'portfolioAccounts',
      'portfolioRecords',
      'portfolioInputs',
      'sharedAccounts', 
      'manualAccountGroups',
      'savingsData',
      'nameMapping',
      'hasSeenBetaWelcome' // Also clear beta welcome flag
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
      dispatchGlobalEvent('historicalDataUpdated', {});
      dispatchGlobalEvent('performanceDataUpdated', []);
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

// Export all data with descriptive timestamp filename
export const exportAllDataWithTimestamp = () => {
  try {
    // Use the comprehensive export function
    const allData = exportAllLocalStorageData();

    // Get user names from paycheck data for filename
    const paycheckData = getPaycheckData();
    const userNames = [];
    if (paycheckData?.your?.name?.trim()) {
      userNames.push(paycheckData.your.name.trim());
    }
    if (paycheckData?.spouse?.name?.trim() && (paycheckData?.settings?.showSpouseCalculator ?? true)) {
      userNames.push(paycheckData.spouse.name.trim());
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
    const historicalData = getHistoricalData();
    const performanceData = getPerformanceData();
    
    // Check if any meaningful data exists
    return (budgetData && budgetData.length > 0) ||
           (paycheckData && ((paycheckData.your && paycheckData.your.salary) || 
                            (paycheckData.spouse && paycheckData.spouse.salary))) ||
           (historicalData && Object.keys(historicalData).length > 0) ||
           (performanceData && Object.keys(performanceData).length > 0);
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
      dispatchGlobalEvent('historicalDataUpdated');
      dispatchGlobalEvent('performanceDataUpdated');
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
      // Reset to default empty states - Updated for object format
      setBudgetData([]);
      setPaycheckData({});
      setFormData({});
      setAppSettings({});
      setHistoricalData({});
      setPerformanceData({}); // Changed from [] to {}
      setSavingsData({}); // Reset savings data as well
      setRetirementData({}); // Reset retirement data as well
      setPortfolioAccounts([]); // Reset portfolio accounts
      setPortfolioRecords([]); // Reset portfolio records
      clearPortfolioInputs(); // Reset portfolio inputs
      clearSharedAccounts(); // Reset shared accounts system
      clearManualAccountGroups(); // Reset manual account groups
      
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

// Add this function to clean up obsolete fields from historical data
export const cleanupObsoleteFields = () => {
  try {
    const historicalData = getHistoricalData();
    const obsoleteFields = ['ltbrokerage', 'rbrokerage', 'networthminus', 'networthplus'];
    let hasChanges = false;
    
    const cleanedData = {};
    
    Object.entries(historicalData).forEach(([key, entry]) => {
      const cleanedEntry = { ...entry };
      
      // Remove obsolete fields from the main entry
      obsoleteFields.forEach(field => {
        if (cleanedEntry.hasOwnProperty(field)) {
          delete cleanedEntry[field];
          hasChanges = true;
        }
      });
      
      // Also clean obsolete fields from user data if they exist
      if (cleanedEntry.users && typeof cleanedEntry.users === 'object') {
        Object.keys(cleanedEntry.users).forEach(userName => {
          obsoleteFields.forEach(field => {
            if (cleanedEntry.users[userName].hasOwnProperty(field)) {
              delete cleanedEntry.users[userName][field];
              hasChanges = true;
            }
          });
        });
      }
      
      cleanedData[key] = cleanedEntry;
    });
    
    if (hasChanges) {
      setHistoricalData(cleanedData);
      return { success: true, message: `Removed obsolete fields: ${obsoleteFields.join(', ')}` };
    } else {
      return { success: true, message: 'No obsolete fields found' };
    }
  } catch (error) {
    console.error('Error cleaning up obsolete fields:', error);
    return { success: false, message: error.message };
  }
};

// Clean up joint data from historical storage since historical data should only track individual users
export const cleanupJointDataFromHistorical = () => {
  try {
    const historicalData = getHistoricalData();
    let hasChanges = false;
    
    const cleanedData = {};
    Object.entries(historicalData).forEach(([year, yearData]) => {
      if (yearData && yearData.users && yearData.users['Joint']) {
        // Remove Joint data
        const cleanedYearData = { ...yearData };
        cleanedYearData.users = { ...yearData.users };
        delete cleanedYearData.users['Joint'];
        
        // If users object is now empty, remove it entirely
        if (Object.keys(cleanedYearData.users).length === 0) {
          delete cleanedYearData.users;
        }
        
        cleanedData[year] = cleanedYearData;
        hasChanges = true;
      } else {
        cleanedData[year] = yearData;
      }
    });
    
    if (hasChanges) {
      setHistoricalData(cleanedData);
      return { success: true, message: 'Removed joint data from historical records' };
    } else {
      return { success: true, message: 'No joint data found in historical records' };
    }
  } catch (error) {
    console.error('Error cleaning up joint data from historical:', error);
    return { success: false, message: error.message };
  }
};


// Net Worth settings utilities
export const getNetWorthSettings = () => {
  return getFromStorage(STORAGE_KEYS.NETWORTH_SETTINGS, {
    selectedYears: [],
    netWorthMode: 'market',
    activeTab: 'overview',
    showAllYearsInChart: false,
    showAllYearsInPortfolioChart: false,
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

// Portfolio account names utilities
export const getPortfolioAccounts = () => {
  return getFromStorage(STORAGE_KEYS.PORTFOLIO_ACCOUNTS, []);
};

export const setPortfolioAccounts = (accounts) => {
  return setToStorage(STORAGE_KEYS.PORTFOLIO_ACCOUNTS, accounts);
};

export const addPortfolioAccount = (accountName, taxType, accountType, owner) => {
  const accounts = getPortfolioAccounts();
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
    setPortfolioAccounts(accounts);
  }
  
  return newAccount;
};


// Portfolio records utilities (comprehensive update tracking with dates)
export const getPortfolioRecords = () => {
  return getFromStorage(STORAGE_KEYS.PORTFOLIO_RECORDS, []);
};

export const setPortfolioRecords = (records) => {
  return setToStorage(STORAGE_KEYS.PORTFOLIO_RECORDS, records);
};

export const addPortfolioRecord = (accounts, updateDate = null) => {
  const records = getPortfolioRecords();
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
    accounts: accounts.map(acc => ({
      accountName: acc.accountName,
      owner: acc.owner,
      taxType: acc.taxType,
      accountType: acc.accountType,
      amount: parseFloat(acc.amount) || 0,
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
  
  setPortfolioRecords(records);
  return newRecord;
};

export const deletePortfolioRecord = (recordId) => {
  const records = getPortfolioRecords();
  const filteredRecords = records.filter(record => record.id !== recordId);
  setPortfolioRecords(filteredRecords);
  return filteredRecords;
};

// Portfolio Inputs Management (current form data)
// These functions handle the current portfolio input values for persistence

// Get current portfolio inputs (form data)
export const getPortfolioInputs = () => {
  return getFromStorage(STORAGE_KEYS.PORTFOLIO_INPUTS, []);
};

// Set current portfolio inputs (form data)
export const setPortfolioInputs = (inputs) => {
  console.log('🔧 setPortfolioInputs called with:', inputs.length, 'inputs');
  console.log('🔧 Storage key:', STORAGE_KEYS.PORTFOLIO_INPUTS);
  console.log('🔧 Input data sample:', inputs[0]);
  
  const result = setToStorage(STORAGE_KEYS.PORTFOLIO_INPUTS, inputs);
  console.log('🔧 setToStorage result:', result);
  
  if (result) {
    // Notify components that portfolio inputs have been updated
    setTimeout(() => {
      dispatchGlobalEvent('portfolioInputsUpdated', inputs);
    }, 50);
  }
  
  console.log('🔧 setPortfolioInputs returning:', result);
  return result;
};

// Clear portfolio inputs (used during reset operations)
export const clearPortfolioInputs = () => {
  const result = setToStorage(STORAGE_KEYS.PORTFOLIO_INPUTS, []);
  if (result) {
    setTimeout(() => {
      dispatchGlobalEvent('portfolioInputsUpdated', []);
    }, 50);
  }
  return result;
};

// =============================================================================
// SHARED ACCOUNT MANAGEMENT SYSTEM
// =============================================================================
// This system allows Portfolio and Performance components to share account definitions

export const SHARED_ACCOUNTS_KEY = STORAGE_KEYS.SHARED_ACCOUNTS;

// Get all shared accounts that both Portfolio and Performance can use
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
    
    // Portfolio data takes precedence over Performance data
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

// Sync Portfolio accounts to shared system
export const syncPortfolioAccountsToShared = () => {
  const portfolioAccounts = getPortfolioAccounts();
  let syncCount = 0;

  portfolioAccounts.forEach(acc => {
    const synced = addOrUpdateSharedAccount({
      accountName: acc.accountName,
      owner: acc.owner,
      accountType: acc.accountType,
      investmentCompany: '', // Portfolio doesn't track investment company in old system
      taxType: acc.taxType,
      source: 'portfolio'
    });
    if (synced) syncCount++;
  });

  return syncCount;
};

// Sync Performance data accounts to shared system
export const syncPerformanceAccountsToShared = () => {
  const performanceData = getPerformanceData();
  let syncCount = 0;
  const processedAccounts = new Set(); // Avoid duplicates in single sync

  Object.values(performanceData).forEach(entry => {
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
              taxType: '', // Performance doesn't track tax type
              source: 'performance'
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

// Full sync - combines accounts from both Portfolio and Performance
export const syncAllAccountsToShared = () => {
  const portfolioCount = syncPortfolioAccountsToShared();
  const performanceCount = syncPerformanceAccountsToShared();
  
  return {
    portfolioSynced: portfolioCount,
    performanceSynced: performanceCount,
    totalAccounts: getSharedAccounts().length
  };
};

// Get accounts that can be used in Performance component (from Portfolio)
export const getAccountsForPerformance = () => {
  return getSharedAccounts().filter(acc => acc.source === 'portfolio' || acc.source === 'manual');
};

// Get accounts that can be used in Portfolio component (from Performance)
export const getAccountsForPortfolio = () => {
  return getSharedAccounts().filter(acc => acc.source === 'performance' || acc.source === 'manual');
};

// Delete a shared account by ID
export const deleteSharedAccount = (accountId) => {
  const accounts = getSharedAccounts();
  const filteredAccounts = accounts.filter(acc => acc.id !== accountId);
  setSharedAccounts(filteredAccounts);
  return filteredAccounts;
};

// Delete shared accounts by matching criteria (for portfolio account cleanup)
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
    console.log('Initialized shared accounts:', syncResult);
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
      dispatchGlobalEvent('manualAccountGroupsUpdated', groups);
    }, 50);
  }
  return result;
};

// Create a new manual account group
export const createManualAccountGroup = (groupName = '', performanceAccountName = '') => {
  const groups = getManualAccountGroups();
  const groupId = generateUniqueId();
  
  const newGroup = {
    id: groupId,
    name: groupName || `Account Group ${Object.keys(groups).length + 1}`,
    performanceAccountName: performanceAccountName,
    portfolioAccounts: [], // Array of portfolio account IDs
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

// Add a portfolio account to a manual group
export const addAccountToManualGroup = (groupId, portfolioAccountId) => {
  const groups = getManualAccountGroups();
  
  if (!groups[groupId]) {
    return null;
  }
  
  // Remove the account from any other groups first
  Object.values(groups).forEach(group => {
    group.portfolioAccounts = group.portfolioAccounts.filter(id => id !== portfolioAccountId);
  });
  
  // Add to the target group
  if (!groups[groupId].portfolioAccounts.includes(portfolioAccountId)) {
    groups[groupId].portfolioAccounts.push(portfolioAccountId);
    groups[groupId].updatedAt = new Date().toISOString();
  }
  
  setManualAccountGroups(groups);
  return groups[groupId];
};

// Remove a portfolio account from a manual group
export const removeAccountFromManualGroup = (groupId, portfolioAccountId) => {
  const groups = getManualAccountGroups();
  
  if (!groups[groupId]) {
    return null;
  }
  
  groups[groupId].portfolioAccounts = groups[groupId].portfolioAccounts.filter(id => id !== portfolioAccountId);
  groups[groupId].updatedAt = new Date().toISOString();
  
  setManualAccountGroups(groups);
  return groups[groupId];
};

// Get available performance accounts for grouping
export const getAvailablePerformanceAccounts = () => {
  const performanceData = getPerformanceData();
  const currentYear = new Date().getFullYear();
  const availableAccounts = [];
  const accountSet = new Set(); // To avoid duplicates
  
  // Only get accounts from current year
  Object.values(performanceData).forEach(entry => {
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

// Get performance accounts that are not already assigned to any manual group
export const getUnusedPerformanceAccounts = () => {
  const allPerformanceAccounts = getAvailablePerformanceAccounts();
  const manualGroups = getManualAccountGroups();
  
  // Collect all performance account names that are already assigned to groups
  const usedPerformanceAccountNames = new Set();
  Object.values(manualGroups).forEach(group => {
    if (group.performanceAccountName) {
      usedPerformanceAccountNames.add(group.performanceAccountName);
    }
  });
  
  // Filter out accounts that are already used
  const unusedAccounts = allPerformanceAccounts.filter(account => 
    !usedPerformanceAccountNames.has(account.accountName)
  );
  
  console.log('🎯 Performance accounts filter:', {
    totalAvailable: allPerformanceAccounts.length,
    alreadyUsed: usedPerformanceAccountNames.size,
    unused: unusedAccounts.length,
    usedAccountNames: Array.from(usedPerformanceAccountNames)
  });
  
  return unusedAccounts;
};

// Get portfolio accounts that are not in any manual group
export const getUngroupedPortfolioAccounts = (portfolioInputs) => {
  const groups = getManualAccountGroups();
  const groupedAccountIds = new Set();
  
  // Collect all account IDs that are already in groups
  Object.values(groups).forEach(group => {
    group.portfolioAccounts.forEach(accountId => {
      groupedAccountIds.add(accountId);
    });
  });
  
  // Return accounts that are not in any group
  return portfolioInputs.filter(account => !groupedAccountIds.has(account.id));
};

// Calculate total balance for a manual group
export const calculateManualGroupBalance = (groupId, portfolioInputs) => {
  const groups = getManualAccountGroups();
  const group = groups[groupId];
  
  if (!group) {
    return 0;
  }
  
  return group.portfolioAccounts.reduce((total, accountId) => {
    const account = portfolioInputs.find(acc => acc.id === accountId);
    return total + (parseFloat(account?.amount) || 0);
  }, 0);
};

// Clear all manual account groups (used during reset operations)
export const clearManualAccountGroups = () => {
  const result = setToStorage(STORAGE_KEYS.MANUAL_ACCOUNT_GROUPS, {});
  if (result) {
    setTimeout(() => {
      dispatchGlobalEvent('manualAccountGroupsUpdated', {});
    }, 50);
  }
  return result;
};

// Clean up empty historical entries (entries with no users or meaningful data)
export const cleanupEmptyHistoricalEntries = () => {
  try {
    const historicalData = getHistoricalData();
    let hasChanges = false;
    
    const cleanedData = {};
    Object.entries(historicalData).forEach(([key, entry]) => {
      // Keep entry if it has users with meaningful data, or if it has other financial data
      const hasUsers = entry.users && Object.keys(entry.users).length > 0;
      const hasFinancialData = entry.taxFree || entry.taxDeferred || entry.brokerage || 
                               entry.espp || entry.hsa || entry.cash || entry.house || 
                               entry.mortgage || entry.othAsset || entry.othLia;
      const hasValidAGI = entry.agi && entry.agi > 0;
      
      if (hasUsers || hasFinancialData || hasValidAGI) {
        cleanedData[key] = entry;
      } else {
        hasChanges = true; // This entry will be removed
      }
    });
    
    if (hasChanges) {
      setHistoricalData(cleanedData);
      return { success: true, message: 'Removed empty historical entries' };
    } else {
      return { success: true, message: 'No empty entries found' };
    }
  } catch (error) {
    console.error('Error cleaning up empty historical entries:', error);
    return { success: false, message: error.message };
  }
};

// Sync paycheck data to historical data for current year
export const syncPaycheckToHistorical = () => {
  try {
    const paycheckData = getPaycheckData();
    const historicalData = getHistoricalData();
    const currentYear = new Date().getFullYear();

    // Get users from paycheck data
    const users = [];
    if (paycheckData?.your?.name?.trim()) {
      users.push({
        name: paycheckData.your.name.trim(),
        data: paycheckData.your
      });
    }
    if (paycheckData?.spouse?.name?.trim() && (paycheckData?.settings?.showSpouseCalculator ?? true)) {
      users.push({
        name: paycheckData.spouse.name.trim(),
        data: paycheckData.spouse
      });
    }

    // Only proceed if we have actual paycheck data
    if (users.length === 0) {
      return true; // No data to sync, but not an error
    }

    // Check if there's already a proper historical entry for current year (like hist_2025_demo)
    const hasProperHistoricalEntry = Object.keys(historicalData).some(key => {
      const entry = historicalData[key];
      return entry && entry.year === currentYear && key !== currentYear.toString() && 
             entry.taxFree !== undefined; // Has full historical data structure
    });

    // If there's already a proper historical entry, don't create a duplicate simple entry
    if (hasProperHistoricalEntry) {
      return true; // Proper entry exists, no need to sync
    }

    // Initialize current year data if it doesn't exist
    if (!historicalData[currentYear]) {
      historicalData[currentYear] = { users: {} };
    }

    // Update historical data for each user
    users.forEach(user => {
      if (!historicalData[currentYear].users[user.name]) {
        historicalData[currentYear].users[user.name] = {};
      }

      const userData = historicalData[currentYear].users[user.name];
      
      // Sync salary, employer, and bonus from paycheck data
      userData.employer = user.data.employer || '';
      userData.salary = parseFloat(user.data.salary) || 0;
      
      // Use the effective bonus calculated by PaycheckForm (includes override and 401k removal logic)
      userData.bonus = parseFloat(user.data.effectiveBonus) || 0;
    });

    // Calculate AGI as sum of salary and bonus for all users in current year
    let totalAGI = 0;
    users.forEach(user => {
      const userData = historicalData[currentYear].users[user.name];
      if (userData) {
        totalAGI += (userData.salary || 0) + (userData.bonus || 0);
      }
    });
    
    // Set the calculated AGI in the current year entry
    historicalData[currentYear].agi = totalAGI;

    // Save updated historical data
    const saveResult = setHistoricalData(historicalData);
    
    if (saveResult) {
      // Dispatch event to notify other components
      setTimeout(() => {
        dispatchGlobalEvent('historicalDataUpdated', historicalData);
      }, 50);
    }
    
    return saveResult;
  } catch (error) {
    console.error('Error syncing paycheck to historical data:', error);
    return false;
  }
};
