// Centralized localStorage utilities for consistent data persistence

export const STORAGE_KEYS = {
  BUDGET_DATA: 'budgetData',
  PAYCHECK_DATA: 'paycheckData',
  FORM_DATA: 'formData',
  APP_SETTINGS: 'appSettings',
  HISTORICAL_DATA: 'historicalData',
  PERFORMANCE_DATA: 'performanceData'
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

export const getHistoricalData = () => {
  return getFromStorage(STORAGE_KEYS.HISTORICAL_DATA, {});
};

export const setHistoricalData = (data) => {
  return setToStorage(STORAGE_KEYS.HISTORICAL_DATA, data);
};

export const getPerformanceData = () => {
  return getFromStorage(STORAGE_KEYS.PERFORMANCE_DATA, []);
};

export const setPerformanceData = (data) => {
  return setToStorage(STORAGE_KEYS.PERFORMANCE_DATA, data);
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

// Import data from JSON (validation included)
export const importAllData = (importData) => {
  try {
    if (!importData || typeof importData !== 'object') {
      throw new Error('Invalid import data format');
    }
    
    // Validate required structure
    const requiredKeys = ['budgetData', 'paycheckData', 'formData', 'historicalData', 'performanceData'];
    const hasRequiredKeys = requiredKeys.some(key => importData[key] !== undefined);
    
    if (!hasRequiredKeys) {
      throw new Error('Import data missing required sections');
    }
    
    // Import each section if it exists
    if (importData.budgetData !== undefined) {
      setBudgetData(importData.budgetData);
    }
    
    if (importData.paycheckData !== undefined) {
      setPaycheckData(importData.paycheckData);
    }
    
    if (importData.formData !== undefined) {
      setFormData(importData.formData);
    }
    
    if (importData.appSettings !== undefined) {
      setAppSettings(importData.appSettings);
    }
    
    if (importData.historicalData !== undefined) {
      setHistoricalData(importData.historicalData);
    }
    
    if (importData.performanceData !== undefined) {
      setPerformanceData(importData.performanceData);
    }
    
    return { success: true, message: 'Data imported successfully' };
  } catch (error) {
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
export const exportAllDataWithTimestamp = () => {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const exportData = exportAllData();
  const filename = `personal-finance-data-${timestamp}.json`;
  
  if (downloadJsonFile(exportData, filename)) {
    return { success: true, message: 'Data exported successfully!' };
  } else {
    return { success: false, message: 'Failed to export data.' };
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
           (performanceData && performanceData.length > 0);
  } catch (error) {
    console.error('Error checking existing data:', error);
    return false;
  }
};

// Consolidated demo data import function with export option
export const importDemoData = async () => {
  try {
    // Check if user has existing data and offer export
    if (hasExistingData()) {
      const shouldExport = window.confirm(
        'You have existing data in your calculator. Would you like to export it before loading the demo data?\n\n' +
        'Click "OK" to export your data first, or "Cancel" to proceed without exporting.'
      );
      
      if (shouldExport) {
        const exportResult = exportAllDataWithTimestamp();
        if (exportResult.success) {
          alert('Your data has been exported successfully! Now loading demo data...');
        } else {
          alert('Export failed, but you can still proceed with loading demo data.');
        }
      }
    }
    
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
      return { success: true, message: 'Demo data loaded successfully!' };
    } else {
      return { success: false, message: result.message };
    }
  } catch (error) {
    console.error('Error loading demo data:', error);
    return { success: false, message: 'Failed to load demo data. Please try again.' };
  }
};
