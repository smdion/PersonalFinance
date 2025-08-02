// Enhanced data import utility with migration support
import { 
  migrateDataStructure, 
  isOldFormat, 
  validateMigration 
} from './dataStructureMigration.js';

import {
  setBudgetData,
  setPaycheckData,
  setAppSettings,
  setAnnualData,
  setAccountData,
  setRetirementData,
  setPrimaryHomeData,
  setAssetLiabilityData,
  setNetWorthSettings,
  setAccountSettings,
  setSavingsData,
  setLiquidAssetsAccounts,
  setLiquidAssetsRecords,
  setSharedAccounts,
  setLiquidAssetsInputs,
  setManualAccountGroups,
  setTaxConstants,
  setToStorage,
  removeFromStorage,
  STORAGE_KEYS,
  dispatchGlobalEvent,
  filterAnnualDataForSingleMode,
  filterAccountDataForSingleMode,
  // New normalized structure functions
  setUsers,
  setAccounts,
  setSubAccounts,
  setBudgetCategories,
  setBudgetItems,
  setSubAccountPerformance,
  setSavingsGoals,
  setPrimaryHome,
  setOtherAssets,
  setOtherLiabilities,
  setRetirementPlanning,
  setUIState,
  getUsers,
  getAnnualData
} from './localStorage.js';

// Import data with automatic migration support
export const importDataWithMigration = (importData) => {
  try {
    console.log('Starting data import with migration support...');
    
    let importedSections = [];
    let errors = [];
    let migrationApplied = false;
    
    if (!importData || typeof importData !== 'object') {
      throw new Error('Invalid import data format');
    }

    // Check if data needs migration
    let dataToImport = importData;
    console.log('Import data check - isOldFormat:', isOldFormat(importData));
    console.log('Import data structure check - has users:', !!importData.users, 'has paycheckData:', !!importData.paycheckData);
    
    if (isOldFormat(importData)) {
      console.log('Old data format detected, applying migration...');
      
      try {
        const originalData = { ...importData };
        dataToImport = migrateDataStructure(importData);
        migrationApplied = true;
        
        // Validate migration
        const validation = validateMigration(originalData, dataToImport);
        if (!validation.isValid) {
          console.warn('Migration validation issues:', validation.issues);
          errors.push(...validation.issues.map(issue => `Migration: ${issue}`));
        } else {
          console.log('Migration validation passed successfully');
        }
        
        importedSections.push('Data Structure Migration Applied');
      } catch (migrationError) {
        console.error('Migration failed:', migrationError);
        errors.push(`Migration failed: ${migrationError.message}`);
        // Continue with original data if migration fails
        dataToImport = importData;
      }
    } else {
      console.log('Data already in new format, no migration needed');
    }

    // Clear only the specific keys we're importing (don't clear everything)
    console.log('Clearing only specific import keys...');
    const keysToImport = ['users', 'accounts', 'subAccounts', 'budgetCategories', 'budgetItems', 'annualData', 'subAccountPerformance', 'savingsGoals', 'primaryHome', 'otherAssets', 'otherLiabilities', 'retirementPlanning', 'uiState'];
    keysToImport.forEach(key => {
      console.log('Removing key:', key);
      removeFromStorage(key);
    });

    // Import normalized data structure
    console.log('Deciding import path - migrationApplied:', migrationApplied, 'has users:', !!dataToImport.users);
    
    if (migrationApplied && dataToImport.users) {
      // Handle new normalized structure
      console.log('Using importNormalizedData path');
      return importNormalizedData(dataToImport, importedSections, errors);
    } else if (!migrationApplied && dataToImport.users) {
      // Data is already in new format, no migration needed
      console.log('Data already in new format, using importNormalizedData path');
      return importNormalizedData(dataToImport, importedSections, errors);
    } else {
      // Handle legacy structure (backward compatibility)
      console.log('Using importLegacyData path');
      return importLegacyData(dataToImport, importedSections, errors);
    }

  } catch (error) {
    console.error('Import failed:', error);
    return { success: false, message: error.message, sections: [], errors: [error.message] };
  }
};

// Import new normalized data structure
const importNormalizedData = (data, importedSections, errors) => {
  try {
    console.log('Importing normalized data structure...');

    // Store data in new normalized structure
    
    // Import users
    if (data.users && Array.isArray(data.users)) {
      console.log('Importing users data:', data.users);
      const result = setUsers(data.users);
      console.log('setUsers result:', result);
      importedSections.push('Users');
    } else {
      console.log('No users data to import, data.users:', data.users);
    }

    // Import accounts
    if (data.accounts && Array.isArray(data.accounts)) {
      setAccounts(data.accounts);
      importedSections.push('Accounts');
    }

    // Import sub-accounts
    if (data.subAccounts && Array.isArray(data.subAccounts)) {
      setSubAccounts(data.subAccounts);
      importedSections.push('Sub-Accounts');
    }

    // Import budget categories
    if (data.budgetCategories && Array.isArray(data.budgetCategories)) {
      setBudgetCategories(data.budgetCategories);
      importedSections.push('Budget Categories');
    }

    // Import budget items
    if (data.budgetItems && Array.isArray(data.budgetItems)) {
      setBudgetItems(data.budgetItems);
      importedSections.push('Budget Items');
    }

    // Import annual data (keep as array in new structure)
    if (data.annualData && Array.isArray(data.annualData)) {
      console.log('Importing annual data:', data.annualData);
      const result = setAnnualData(data.annualData);
      console.log('setAnnualData result:', result);
      importedSections.push('Annual Data');
    } else {
      console.log('No annual data to import, data.annualData:', data.annualData);
    }

    // Import sub-account performance
    if (data.subAccountPerformance && Array.isArray(data.subAccountPerformance)) {
      setSubAccountPerformance(data.subAccountPerformance);
      importedSections.push('Sub-Account Performance');
    }

    // Import savings goals
    if (data.savingsGoals && Array.isArray(data.savingsGoals)) {
      setSavingsGoals(data.savingsGoals);
      importedSections.push('Savings Goals');
    }

    // Import primary home
    if (data.primaryHome) {
      setPrimaryHome(data.primaryHome);
      importedSections.push('Primary Home');
    }

    // Import other assets
    if (data.otherAssets && Array.isArray(data.otherAssets)) {
      setOtherAssets(data.otherAssets);
      importedSections.push('Other Assets');
    }

    // Import other liabilities
    if (data.otherLiabilities && Array.isArray(data.otherLiabilities)) {
      setOtherLiabilities(data.otherLiabilities);
      importedSections.push('Other Liabilities');
    }

    // Import retirement planning
    if (data.retirementPlanning) {
      setRetirementPlanning(data.retirementPlanning);
      importedSections.push('Retirement Planning');
    }

    // Import UI state
    if (data.uiState) {
      setUIState(data.uiState);
      importedSections.push('UI State');
    }

    // Trigger global events
    console.log('Dispatching dataImported event with sections:', importedSections);
    dispatchGlobalEvent('dataImported', { sections: importedSections });
    dispatchGlobalEvent('budgetDataChanged');
    dispatchGlobalEvent('paycheckDataChanged');
    
    // Also dispatch paycheckDataUpdated as a fallback to trigger PaycheckCalculator reload
    console.log('Setting up fallback event dispatch in 50ms');
    setTimeout(() => {
      console.log('Dispatching paycheckDataUpdated as fallback after import');
      dispatchGlobalEvent('paycheckDataUpdated', { importComplete: true });
    }, 50);
    
    // Also try immediate dispatch
    console.log('Dispatching immediate paycheckDataUpdated after import');
    dispatchGlobalEvent('paycheckDataUpdated', { importComplete: true, immediate: true });

    // Test data retrieval immediately after import
    console.log('Import complete. Testing data retrieval...');
    try {
      const testUsers = getUsers();
      const testAnnualData = getAnnualData();
      console.log('Immediate test retrieval - users:', testUsers);
      console.log('Immediate test retrieval - annualData:', testAnnualData);
    } catch (error) {
      console.error('Error during immediate test retrieval:', error);
    }
    
    // Direct page reload after confirming data
    console.log('Data import complete and confirmed. Reloading page now...');
    setTimeout(() => {
      window.location.href = window.location.href;
    }, 100);
    

    console.log('Normalized data import completed successfully');
    
    return {
      success: true,
      message: `Successfully imported ${importedSections.length} sections with new structure`,
      sections: importedSections,
      errors: errors,
      migrationApplied: true
    };

  } catch (error) {
    console.error('Normalized data import failed:', error);
    return { 
      success: false, 
      message: error.message, 
      sections: importedSections, 
      errors: [...errors, error.message] 
    };
  }
};

// Import legacy data structure (backward compatibility)
const importLegacyData = (importData, importedSections, errors) => {
  // Use the original import logic for backward compatibility
  // This handles data that's already in the old format
  
  console.log('Importing legacy data structure...');
  
  try {
    // Import each section if it exists
    if (importData.paycheckData) {
      setPaycheckData(importData.paycheckData);
      importedSections.push('Paycheck Data');
    }

    if (importData.budgetData) {
      setBudgetData(importData.budgetData);
      importedSections.push('Budget Data');
    }

    if (importData.appSettings) {
      setAppSettings(importData.appSettings);
      importedSections.push('App Settings');
    }

    if (importData.annualData) {
      setAnnualData(importData.annualData);
      importedSections.push('Annual Data');
    }

    if (importData.accountData) {
      setAccountData(importData.accountData);
      importedSections.push('Account Data');
    }

    if (importData.retirementData) {
      setRetirementData(importData.retirementData);
      importedSections.push('Retirement Data');
    }

    if (importData.primaryHomeData) {
      setPrimaryHomeData(importData.primaryHomeData);
      importedSections.push('Primary Home Data');
    }

    if (importData.savingsData) {
      setSavingsData(importData.savingsData);
      importedSections.push('Savings Data');
    }

    if (importData.liquidAssetsAccounts) {
      setLiquidAssetsAccounts(importData.liquidAssetsAccounts);
      importedSections.push('Liquid Assets Accounts');
    }

    if (importData.liquidAssetsRecords) {
      setLiquidAssetsRecords(importData.liquidAssetsRecords);
      importedSections.push('Liquid Assets Records');
    }

    // Trigger global events
    dispatchGlobalEvent('dataImported', { sections: importedSections });
    dispatchGlobalEvent('budgetDataChanged');
    dispatchGlobalEvent('paycheckDataChanged');

    console.log('Legacy data import completed successfully');
    
    return {
      success: true,
      message: `Successfully imported ${importedSections.length} sections`,
      sections: importedSections,
      errors: errors,
      migrationApplied: false
    };

  } catch (error) {
    console.error('Legacy data import failed:', error);
    return { 
      success: false, 
      message: error.message, 
      sections: importedSections, 
      errors: [...errors, error.message] 
    };
  }
};