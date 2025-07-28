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
  PORTFOLIO_UPDATE_HISTORY: 'portfolioUpdateHistory',
  PORTFOLIO_RECORDS: 'portfolioRecords',
  SHARED_ACCOUNTS: 'sharedAccounts'
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
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage (${key}):`, error);
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

// Helper function to migrate old budgetImpacting format to new format
const migrateBudgetImpactingData = (oldData) => {
  if (!oldData || typeof oldData !== 'object') return oldData;
  
  const newData = {
    traditionalIraMonthly: oldData.traditionalIraMonthly || 0,
    rothIraMonthly: oldData.rothIraMonthly || 0,
    brokerageAccounts: []
  };

  // Migrate old hard-coded fields to brokerage accounts array
  if (oldData.retirementBrokerageMonthly > 0) {
    newData.brokerageAccounts.push({
      id: `migrated-retirement-${Date.now()}`,
      name: 'Retirement Brokerage',
      monthlyAmount: oldData.retirementBrokerageMonthly
    });
  }

  if (oldData.longTermSavingsMonthly > 0) {
    newData.brokerageAccounts.push({
      id: `migrated-savings-${Date.now()}`,
      name: 'Long-Term Savings',
      monthlyAmount: oldData.longTermSavingsMonthly
    });
  }

  // Keep existing brokerage accounts if they exist
  if (oldData.brokerageAccounts && Array.isArray(oldData.brokerageAccounts)) {
    newData.brokerageAccounts = [...newData.brokerageAccounts, ...oldData.brokerageAccounts];
  }

  return newData;
};

export const getPaycheckData = () => {
  const data = getFromStorage(STORAGE_KEYS.PAYCHECK_DATA, {});
  
  // Migrate old format if needed
  let needsMigration = false;
  const migratedData = { ...data };
  
  if (data.your?.budgetImpacting) {
    const hasOldFormat = data.your.budgetImpacting.retirementBrokerageMonthly !== undefined || 
                        data.your.budgetImpacting.longTermSavingsMonthly !== undefined;
    if (hasOldFormat) {
      migratedData.your.budgetImpacting = migrateBudgetImpactingData(data.your.budgetImpacting);
      needsMigration = true;
    }
  }
  
  if (data.spouse?.budgetImpacting) {
    const hasOldFormat = data.spouse.budgetImpacting.retirementBrokerageMonthly !== undefined || 
                        data.spouse.budgetImpacting.longTermSavingsMonthly !== undefined;
    if (hasOldFormat) {
      migratedData.spouse.budgetImpacting = migrateBudgetImpactingData(data.spouse.budgetImpacting);
      needsMigration = true;
    }
  }
  
  // Save migrated data back to localStorage
  if (needsMigration) {
    setPaycheckData(migratedData);
  }
  
  return migratedData;
};

export const setPaycheckData = (data) => {
  return setToStorage(STORAGE_KEYS.PAYCHECK_DATA, data);
};

export const getFormData = () => {
  const data = getFromStorage(STORAGE_KEYS.FORM_DATA, {});
  
  // Migrate old format if needed
  let needsMigration = false;
  const migratedData = { ...data };
  
  if (data.yourBudgetImpacting) {
    const hasOldFormat = data.yourBudgetImpacting.retirementBrokerageMonthly !== undefined || 
                        data.yourBudgetImpacting.longTermSavingsMonthly !== undefined;
    if (hasOldFormat) {
      migratedData.yourBudgetImpacting = migrateBudgetImpactingData(data.yourBudgetImpacting);
      needsMigration = true;
    }
  }
  
  if (data.spouseBudgetImpacting) {
    const hasOldFormat = data.spouseBudgetImpacting.retirementBrokerageMonthly !== undefined || 
                        data.spouseBudgetImpacting.longTermSavingsMonthly !== undefined;
    if (hasOldFormat) {
      migratedData.spouseBudgetImpacting = migrateBudgetImpactingData(data.spouseBudgetImpacting);
      needsMigration = true;
    }
  }
  
  // Save migrated data back to localStorage
  if (needsMigration) {
    setFormData(migratedData);
  }
  
  return migratedData;
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
    version: '1.0.0',
    budgetData: getBudgetData(),
    paycheckData: getPaycheckData(),
    formData: getFormData(),
    appSettings: getAppSettings(),
    historicalData: getHistoricalData(),
    performanceData: getPerformanceData(),
    retirementData: getRetirementData()
  };
  
  return exportData;
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
    
    // Clear any existing name mappings and localStorage to prevent conflicts
    setNameMapping({});
    localStorage.removeItem(NAME_MAPPING_KEY);
    
    // Clear the in-memory cache
    nameMapping = {};
    nameMappingLoaded = false;
    
    // Import each section if it exists
    if (importData.budgetData !== undefined) {
      setBudgetData(importData.budgetData);
      importedSections.push('Budget Data');
    }
    
    if (importData.paycheckData !== undefined) {
      // Migrate imported paycheck data if needed
      const migratedPaycheckData = { ...importData.paycheckData };
      if (migratedPaycheckData.your?.budgetImpacting) {
        migratedPaycheckData.your.budgetImpacting = migrateBudgetImpactingData(migratedPaycheckData.your.budgetImpacting);
      }
      if (migratedPaycheckData.spouse?.budgetImpacting) {
        migratedPaycheckData.spouse.budgetImpacting = migrateBudgetImpactingData(migratedPaycheckData.spouse.budgetImpacting);
      }
      setPaycheckData(migratedPaycheckData);
      importedSections.push('Paycheck Data');
    }
    
    if (importData.formData !== undefined) {
      // Migrate imported form data if needed
      const migratedFormData = { ...importData.formData };
      if (migratedFormData.yourBudgetImpacting) {
        migratedFormData.yourBudgetImpacting = migrateBudgetImpactingData(migratedFormData.yourBudgetImpacting);
      }
      if (migratedFormData.spouseBudgetImpacting) {
        migratedFormData.spouseBudgetImpacting = migrateBudgetImpactingData(migratedFormData.spouseBudgetImpacting);
      }
      setFormData(migratedFormData);
      importedSections.push('Form Data');
    }
    
    if (importData.appSettings !== undefined) {
      setAppSettings(importData.appSettings);
      importedSections.push('App Settings');
    }
    
    if (importData.historicalData !== undefined) {
      // Clean empty user data before importing
      const cleanedHistoricalData = cleanEmptyUserData(importData.historicalData);
      setHistoricalData(cleanedHistoricalData);
      importedSections.push('Historical Data');
    }
    
    if (importData.performanceData !== undefined) {
      // Handle both array and object formats during import
      let performanceDataToImport = importData.performanceData;
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
    
    
    if (importData.retirementData !== undefined) {
      setRetirementData(importData.retirementData);
      importedSections.push('Retirement Data');
    }

    // Import completed successfully
    
    // Trigger events to notify components
    setTimeout(() => {
      dispatchGlobalEvent('budgetDataUpdated');
      dispatchGlobalEvent('paycheckDataUpdated');
      dispatchGlobalEvent('historicalDataUpdated');
      dispatchGlobalEvent('performanceDataUpdated');
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
      'portfolioUpdateHistory',
      'portfolioRecords',
      'sharedAccounts', // Also clear shared accounts
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

// Enhanced export function with consistent timestamp format
import { generateDataFilename } from './calculationHelpers';

// Export all data with descriptive timestamp filename
export const exportAllDataWithTimestamp = () => {
  try {
    const allData = {
      budgetData: getBudgetData(),
      paycheckData: getPaycheckData(),
      formData: getFormData(),
      historicalData: getHistoricalData(),
      performanceData: getPerformanceData(),
      retirementData: getRetirementData()
    };

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
      setPortfolioUpdateHistory([]); // Reset portfolio update history
      setPortfolioRecords([]); // Reset portfolio records
      clearSharedAccounts(); // Reset shared accounts system
      
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

// Portfolio update history utilities
export const getPortfolioUpdateHistory = () => {
  return getFromStorage(STORAGE_KEYS.PORTFOLIO_UPDATE_HISTORY, []);
};

export const setPortfolioUpdateHistory = (history) => {
  return setToStorage(STORAGE_KEYS.PORTFOLIO_UPDATE_HISTORY, history);
};

export const addPortfolioUpdateRecord = (accounts, totals, previousTotals = null) => {
  const history = getPortfolioUpdateHistory();
  
  // Calculate changes from previous update
  const changes = {};
  if (previousTotals) {
    changes.taxFree = (totals.taxFree || 0) - (previousTotals.taxFree || 0);
    changes.taxDeferred = (totals.taxDeferred || 0) - (previousTotals.taxDeferred || 0);
    changes.brokerage = (totals.brokerage || 0) - (previousTotals.brokerage || 0);
    changes.espp = (totals.espp || 0) - (previousTotals.espp || 0);
    changes.hsa = (totals.hsa || 0) - (previousTotals.hsa || 0);
    changes.total = Object.values(changes).reduce((sum, change) => sum + change, 0);
  }
  
  const updateRecord = {
    id: generateUniqueId(),
    timestamp: new Date().toISOString(),
    year: new Date().getFullYear(),
    accountsUpdated: accounts.length,
    accounts: accounts.map(acc => ({
      accountName: acc.accountName,
      owner: acc.owner,
      taxType: acc.taxType,
      accountType: acc.accountType,
      amount: parseFloat(acc.amount) || 0
    })),
    totals: {
      taxFree: totals.taxFree || 0,
      taxDeferred: totals.taxDeferred || 0,
      brokerage: totals.brokerage || 0,
      espp: totals.espp || 0,
      hsa: totals.hsa || 0
    },
    previousTotals: previousTotals ? {
      taxFree: previousTotals.taxFree || 0,
      taxDeferred: previousTotals.taxDeferred || 0,
      brokerage: previousTotals.brokerage || 0,
      espp: previousTotals.espp || 0,
      hsa: previousTotals.hsa || 0
    } : null,
    changes: Object.keys(changes).length > 0 ? changes : null,
    totalAmount: accounts.reduce((sum, acc) => sum + (parseFloat(acc.amount) || 0), 0)
  };
  
  // Add to beginning of array to show most recent first
  history.unshift(updateRecord);
  
  // Keep only last 50 updates to prevent excessive storage usage
  if (history.length > 50) {
    history.splice(50);
  }
  
  setPortfolioUpdateHistory(history);
  return updateRecord;
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
    employer = '',
    taxType = '',
    source = 'manual' // 'portfolio' or 'performance' or 'manual'
  } = accountData;

  // Validate required fields
  if (!accountName || !owner || !accountType) {
    console.error('Missing required account fields:', { accountName, owner, accountType });
    return null;
  }

  // Smart matching: find similar accounts that should be combined
  // 1. Exact match (name, owner, type, employer)
  // 2. Similar match (name, owner, type - ignore employer differences)
  let existingIndex = accounts.findIndex(acc => 
    acc.accountName.toLowerCase() === accountName.toLowerCase().trim() &&
    acc.owner === owner &&
    acc.accountType === accountType &&
    acc.employer === employer
  );

  // If no exact match, look for similar account (same name, owner, type but different employer)
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
        employer: source === 'portfolio' ? employer : (existing.employer || employer),
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
      employer,
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
      employer: '', // Portfolio doesn't track employer
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
          const accountKey = `${userData.accountName}-${owner}-${userData.accountType}-${userData.employer || ''}`;
          
          if (!processedAccounts.has(accountKey)) {
            const synced = addOrUpdateSharedAccount({
              accountName: userData.accountName,
              owner: owner,
              accountType: userData.accountType,
              employer: userData.employer || '',
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

// Delete a shared account
export const deleteSharedAccount = (accountId) => {
  const accounts = getSharedAccounts();
  const filteredAccounts = accounts.filter(acc => acc.id !== accountId);
  setSharedAccounts(filteredAccounts);
  return filteredAccounts;
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
