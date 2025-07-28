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
  SAVINGS_DATA: 'savingsData'
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
      console.log('Loaded name mappings from localStorage:', nameMapping);
    } catch (error) {
      console.error('Error loading name mappings:', error);
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
  
  console.log(`Updating name mapping: "${trimmedOldName}" -> "${trimmedNewName}"`);
  
  // Load current mappings first
  loadNameMapping();
  
  // Update in-memory mapping
  nameMapping[trimmedOldName] = trimmedNewName;
  
  // Save to localStorage immediately and synchronously
  try {
    localStorage.setItem('nameMapping', JSON.stringify(nameMapping));
    console.log('Name mapping saved to localStorage:', nameMapping);
    
    // Force immediate migration of all data
    migrateAllDataForNameChange(trimmedOldName, trimmedNewName);
    
  } catch (error) {
    console.error('Error saving name mapping:', error);
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
  console.log(`Name mapping lookup: "${trimmedOriginalName}" -> "${mappedName}"`);
  return mappedName;
};

// Enhanced function to apply name mapping to any data structure
export const applyNameMappingToData = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const mapping = getNameMapping();
  if (!mapping || Object.keys(mapping).length === 0) return data;
  
  console.log('Applying name mapping to data:', { mapping, dataKeys: Object.keys(data) });
  
  const processedData = {};
  
  Object.entries(data).forEach(([key, entry]) => {
    if (entry.users && typeof entry.users === 'object') {
      const mappedUsers = {};
      
      Object.entries(entry.users).forEach(([userName, userData]) => {
        const mappedName = getCurrentUserName(userName);
        console.log(`Applying mapping: ${userName} -> ${mappedName}`);
        mappedUsers[mappedName] = userData;
      });
      
      processedData[key] = { ...entry, users: mappedUsers };
    } else {
      processedData[key] = entry;
    }
  });
  
  console.log('Data after name mapping:', processedData);
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
  console.log(`Migrating data for name change: "${oldName}" -> "${newName}"`);
  
  if (!data || typeof data !== 'object') return data;
  
  // Ensure we're working with trimmed names but preserve spaces
  const trimmedOldName = oldName.trim();
  const trimmedNewName = newName.trim();
  
  if (!trimmedOldName || !trimmedNewName || trimmedOldName === trimmedNewName) {
    console.log('Skipping migration - invalid names');
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
          console.log(`Migrating user data from "${userName}" to "${trimmedNewName}"`);
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
  
  console.log('Migration completed, hasChanges:', hasChanges);
  return migratedData;
};

// Enhanced function to migrate all data types when names change - Force immediate save
export const migrateAllDataForNameChange = (oldName, newName) => {
  if (!oldName || !newName || oldName === newName) return;
  
  console.log(`Forcefully migrating all data from "${oldName}" to "${newName}"`);
  
  // Migrate historical data - Force save
  try {
    const historicalData = getFromStorage(STORAGE_KEYS.HISTORICAL_DATA, {});
    const migratedHistorical = migrateDataForNameChange(historicalData, oldName, newName);
    
    // Force immediate save
    const saveResult = setToStorage(STORAGE_KEYS.HISTORICAL_DATA, migratedHistorical);
    console.log('Historical data migration save result:', saveResult);
    
    if (saveResult) {
      console.log('Historical data successfully migrated and saved');
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
    console.log('Performance data migration save result:', saveResult);
    
    if (saveResult) {
      console.log('Performance data successfully migrated and saved');
    }
  } catch (error) {
    console.error('Error migrating performance data:', error);
  }
  
  // Dispatch events to notify components of the data changes - with delay to ensure saves are complete
  setTimeout(() => {
    console.log('Dispatching data update events after migration');
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
  console.log('Saving historical data:', data);
  
  // Don't apply name mapping when saving - data should already have correct names
  const result = setToStorage(STORAGE_KEYS.HISTORICAL_DATA, data);
  return result;
};

export const setHistoricalDataWithNameMapping = (data) => {
  console.log('Saving historical data with name mapping:', data);
  
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
  console.log('Saving performance data:', data);
  
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
    performanceData: getPerformanceData()
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
      setPaycheckData(importData.paycheckData);
      importedSections.push('Paycheck Data');
    }
    
    if (importData.formData !== undefined) {
      setFormData(importData.formData);
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
      'nameMapping',
      'hasSeenBetaWelcome' // Also clear beta welcome flag
    ];
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Could not remove ${key}:`, error);
      }
    });
    
    // Dispatch events to notify all components
    setTimeout(() => {
      dispatchGlobalEvent('budgetDataUpdated', []);
      dispatchGlobalEvent('paycheckDataUpdated', {});
      dispatchGlobalEvent('historicalDataUpdated', {});
      dispatchGlobalEvent('performanceDataUpdated', []);
      dispatchGlobalEvent('formDataUpdated', {});
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
      performanceData: getPerformanceData()
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
      console.log('Cleaned up obsolete fields from historical data:', obsoleteFields);
      return { success: true, message: `Removed obsolete fields: ${obsoleteFields.join(', ')}` };
    } else {
      console.log('No obsolete fields found in historical data');
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
