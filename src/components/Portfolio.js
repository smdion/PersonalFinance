import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import { 
  getHistoricalData, 
  setHistoricalData,
  getPaycheckData,
  getPortfolioAccounts,
  addPortfolioAccount,
  addPortfolioUpdateRecord,
  getPortfolioUpdateHistory,
  getPortfolioRecords,
  addPortfolioRecord,
  deletePortfolioRecord,
  // New shared account functions
  getSharedAccounts,
  setSharedAccounts,
  addOrUpdateSharedAccount,
  initializeSharedAccounts,
  clearSharedAccounts,
  deleteSharedAccountsByMatch,
  // Manual account groups functions
  getManualAccountGroups,
  createManualAccountGroup,
  updateManualAccountGroup,
  deleteManualAccountGroup,
  addAccountToManualGroup,
  removeAccountFromManualGroup,
  getAvailablePerformanceAccounts,
  getUnusedPerformanceAccounts,
  getUngroupedPortfolioAccounts,
  calculateManualGroupBalance,
  clearManualAccountGroups,
  // Portfolio inputs persistence
  getPortfolioInputs,
  setPortfolioInputs as savePortfolioInputsToLocalStorage,
  clearPortfolioInputs
} from '../utils/localStorage';
import { generateDataFilename } from '../utils/calculationHelpers';
import CSVImportExport from './CSVImportExport';
import { 
  syncPortfolioBalanceToPerformance,
  syncPerformanceAccountsFromLatestPortfolio,
  generateAccountName
} from '../utils/portfolioPerformanceSync';
import { 
  getPerformanceSyncSettings,
  setPerformanceSyncSettings
} from '../utils/localStorage';
import '../styles/portfolio.css';

const Portfolio = () => {
  const [portfolioInputs, setPortfolioInputs] = useState([]);
  const [currentYearData, setCurrentYearData] = useState({});
  const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [updateHistory, setUpdateHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [portfolioRecords, setPortfolioRecords] = useState([]);
  const [showRecords, setShowRecords] = useState(false);
  const [sortRecordsNewestFirst, setSortRecordsNewestFirst] = useState(true);
  const [syncSettings, setSyncSettings] = useState({});
  // Manual account grouping state
  const [manualGroups, setManualGroups] = useState({});
  const [showManualGrouping, setShowManualGrouping] = useState(false);

  // Validation options
  const TAX_TYPES = ['Tax-Free', 'Tax-Deferred', 'After-Tax'];
  const ACCOUNT_TYPES = ['IRA', 'Brokerage', '401k', 'ESPP', 'HSA'];

  useEffect(() => {
    // Initialize shared accounts system on component mount
    initializeSharedAccounts();
    
    loadCurrentYearData();
    loadUpdateHistory();
    loadPortfolioRecords();
    loadManualGroups();
    
    // Load sync settings
    const settings = getPerformanceSyncSettings();
    setSyncSettings(settings);

    // Listen for global reset event
    const handleResetAllData = () => {
      // Reset all portfolio component state
      setPortfolioInputs([{
        id: generateUniqueId(),
        accountName: '',
        owner: '',
        taxType: '',
        accountType: '',
        amount: '',
        description: ''
      }]);
      setCurrentYearData({});
      setUpdateHistory([]);
      setPortfolioRecords([]);
      setErrors({});
      setSuccessMessage('');
      setShowHistory(false);
      setShowRecords(false);
      setManualGroups({});
      setShowManualGrouping(false);
      
      // Also clear shared accounts, manual groups, and portfolio inputs when global reset happens
      clearSharedAccounts();
      clearManualAccountGroups();
      clearPortfolioInputs();
    };

    // Listen for shared accounts updates from Performance component
    const handleSharedAccountsUpdated = () => {
      // Refresh portfolio inputs when shared accounts are updated
      loadCurrentYearData();
    };

    // Listen for manual groups updates
    const handleManualGroupsUpdated = () => {
      loadManualGroups();
    };

    // Listen for portfolio inputs updates (from imports)
    const handlePortfolioInputsUpdated = () => {
      loadPortfolioInputs();
    };

    window.addEventListener('resetAllData', handleResetAllData);
    window.addEventListener('sharedAccountsUpdated', handleSharedAccountsUpdated);
    window.addEventListener('manualAccountGroupsUpdated', handleManualGroupsUpdated);
    window.addEventListener('portfolioInputsUpdated', handlePortfolioInputsUpdated);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('resetAllData', handleResetAllData);
      window.removeEventListener('sharedAccountsUpdated', handleSharedAccountsUpdated);
      window.removeEventListener('manualAccountGroupsUpdated', handleManualGroupsUpdated);
      window.removeEventListener('portfolioInputsUpdated', handlePortfolioInputsUpdated);
    };
  }, []);

  // Save portfolio inputs to localStorage whenever they change
  // Removed automatic saving useEffect to prevent input refresh issues
  // Portfolio account definitions are now saved manually when adding/removing accounts
  // Amount values are intentionally not persisted

  const loadUpdateHistory = () => {
    const history = getPortfolioUpdateHistory();
    setUpdateHistory(history);
  };

  const loadPortfolioRecords = () => {
    const records = getPortfolioRecords();
    setPortfolioRecords(records);
  };

  const loadManualGroups = () => {
    const groups = getManualAccountGroups();
    setManualGroups(groups);
  };

  const loadPortfolioInputs = () => {
    const savedInputs = getPortfolioInputs();
    if (savedInputs.length > 0) {
      console.log('📥 Loading saved portfolio inputs:', savedInputs.length, 'accounts');
      // Ensure loaded inputs have empty amount fields (not persisted)
      const inputsWithEmptyAmounts = savedInputs.map(input => ({
        id: input.id || generateUniqueId(),
        accountName: input.accountName || '',
        owner: input.owner || '',
        taxType: input.taxType || '',
        accountType: input.accountType || '',
        investmentCompany: input.investmentCompany || '',
        description: input.description || '',
        amount: '', // Always start with empty amount - not persisted
        ...input // Preserve any other fields, but amount will be overridden
      }));
      setPortfolioInputs(inputsWithEmptyAmounts);
    } else {
      console.log('📥 No saved portfolio inputs found');
    }
  };

  // Wrapper to avoid naming conflict with state setter
  // Excludes amount/balance values from persistence - only saves account definitions
  const savePortfolioInputsToStorage = (inputs) => {
    console.log('💾 savePortfolioInputsToStorage called with:', inputs.length, 'inputs');
    
    // Remove amount field before saving to localStorage
    const inputsWithoutAmounts = inputs.map(input => {
      const { amount, ...inputWithoutAmount } = input;
      return inputWithoutAmount;
    });
    
    console.log('💾 Saving without amounts:', inputsWithoutAmounts.length, 'inputs');
    const result = savePortfolioInputsToLocalStorage(inputsWithoutAmounts);
    console.log('💾 localStorage save result:', result);
    return result;
  };

  const loadCurrentYearData = (forceReloadAccounts = false) => {
    const currentYear = new Date().getFullYear();
    const historicalData = getHistoricalData();
    const paycheckData = getPaycheckData();
    
    
    // Get users from paycheck data
    const userList = [];
    if (paycheckData?.your?.name?.trim()) {
      userList.push(paycheckData.your.name.trim());
    }
    if (paycheckData?.spouse?.name?.trim() && (paycheckData?.settings?.showSpouseCalculator ?? true)) {
      userList.push(paycheckData.spouse.name.trim());
    }
    
    // Get all existing users from historical data for the current year
    const existingUsers = Object.keys(historicalData[currentYear]?.users || {});
    
    // Combine paycheck users with historical users and remove duplicates
    const allUsers = [...new Set([...userList, ...existingUsers])];
    
    // If still no users, create default
    if (allUsers.length === 0) {
      allUsers.push('User'); // Default user name
    }
    
    // Add "Joint" as an additional owner option if not already present
    const ownerOptions = [...allUsers];
    if (!ownerOptions.includes('Joint')) {
      ownerOptions.push('Joint');
    }
    
    
    setUsers(ownerOptions);
    setCurrentYearData(historicalData[currentYear] || { users: {} });
    
    // Only auto-populate portfolio inputs from shared accounts when explicitly forced
    // Don't auto-populate on initial load to keep form clean for new entries
    if (forceReloadAccounts) {
      const sharedAccounts = getSharedAccounts();
      
      // Convert shared accounts to portfolio inputs, maintaining Portfolio as master
      const allAccounts = sharedAccounts.map(account => {
        // For accounts without tax type (from Performance), infer based on account type
        let taxType = account.taxType;
        if (!taxType && account.accountType) {
          if (account.accountType === 'HSA' || account.accountType === 'ESPP') {
            taxType = 'After-Tax';
          } else if (account.accountType === '401k') {
            taxType = 'Tax-Deferred';
          } else if (account.accountType === 'IRA') {
            taxType = 'Tax-Free'; // Default to Roth IRA
          } else if (account.accountType === 'Brokerage') {
            taxType = 'After-Tax';
          }
        }
        
        return {
          id: generateUniqueId(),
          taxType: taxType || '',
          accountType: account.accountType,
          owner: account.owner,
          investmentCompany: account.investmentCompany || '',
          amount: '', // Always start with empty amount for new updates
          description: '', // Initialize description field
          source: account.source,
          // Show which systems this account appears in
          sources: account.sources || [account.source]
        };
      });
      
      if (allAccounts.length > 0) {
        setPortfolioInputs(allAccounts);
      } else {
        // If no stored accounts, initialize with empty form
        setPortfolioInputs([{
          id: generateUniqueId(),
          taxType: '',
          amount: '',
          accountType: '',
          owner: ownerOptions[0] || 'User',
          investmentCompany: '',
          description: ''
        }]);
      }
    } else {
      // Check if we have saved portfolio inputs, if not initialize with empty form
      const savedInputs = getPortfolioInputs();
      if (savedInputs.length > 0) {
        console.log('📥 Using saved portfolio inputs from localStorage');
        // Ensure loaded inputs have empty amount fields (not persisted)
        const inputsWithEmptyAmounts = savedInputs.map(input => ({
          id: input.id || generateUniqueId(),
          accountName: input.accountName || '',
          owner: input.owner || '',
          taxType: input.taxType || '',
          accountType: input.accountType || '',
          investmentCompany: input.investmentCompany || '',
          description: input.description || '',
          amount: '', // Always start with empty amount - not persisted
          ...input // Preserve any other fields, but amount will be overridden
        }));
        setPortfolioInputs(inputsWithEmptyAmounts);
      } else if (portfolioInputs.length === 0) {
        // Initialize with empty form on first load
        console.log('📝 Initializing with empty portfolio form');
        setPortfolioInputs([{
          id: generateUniqueId(),
          taxType: '',
          amount: '',
          accountType: '',
          owner: ownerOptions[0] || 'User',
          investmentCompany: '',
          description: ''
        }]);
      }
    }
  };

  const validateInputs = () => {
    const newErrors = {};
    let hasErrors = false;

    portfolioInputs.forEach((input, index) => {
      const inputErrors = {};
      
      // Validate required fields for account name generation
      if (!input.owner.trim()) {
        inputErrors.owner = 'Owner is required';
        hasErrors = true;
      }

      if (!input.taxType) {
        inputErrors.taxType = 'Tax type is required';
        hasErrors = true;
      } else if (!TAX_TYPES.includes(input.taxType)) {
        inputErrors.taxType = `Tax type must be one of: ${TAX_TYPES.join(', ')}`;
        hasErrors = true;
      }

      if (!input.accountType) {
        inputErrors.accountType = 'Account type is required';
        hasErrors = true;
      } else if (!ACCOUNT_TYPES.includes(input.accountType)) {
        inputErrors.accountType = `Account type must be one of: ${ACCOUNT_TYPES.join(', ')}`;
        hasErrors = true;
      }

      if (!input.investmentCompany.trim()) {
        inputErrors.investmentCompany = 'Investment company is required';
        hasErrors = true;
      }

      if (!input.amount || isNaN(parseFloat(input.amount))) {
        inputErrors.amount = 'Valid amount is required';
        hasErrors = true;
      } else if (parseFloat(input.amount) < 0) {
        inputErrors.amount = 'Amount must be positive';
        hasErrors = true;
      }

      if (Object.keys(inputErrors).length > 0) {
        newErrors[index] = inputErrors;
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  };

  const handleInputChange = (index, field, value) => {
    const updatedInputs = [...portfolioInputs];
    updatedInputs[index] = {
      ...updatedInputs[index],
      [field]: value
    };
    
    // Auto-set tax type for special account types
    if (field === 'accountType') {
      if (value === 'HSA' || value === 'ESPP') {
        updatedInputs[index].taxType = 'After-Tax'; // Default for special accounts
      }
    }
    
    setPortfolioInputs(updatedInputs);
    
    // Save account definitions when non-amount fields change
    if (field !== 'amount') {
      savePortfolioInputsToStorage(updatedInputs);
    }
    
    // Clear error when user starts typing
    if (errors[index]?.[field]) {
      const newErrors = { ...errors };
      delete newErrors[index][field];
      if (Object.keys(newErrors[index]).length === 0) {
        delete newErrors[index];
      }
      setErrors(newErrors);
    }
  };

  const handleDeleteRecord = (recordId) => {
    if (window.confirm('Are you sure you want to delete this portfolio record? This action cannot be undone.')) {
      deletePortfolioRecord(recordId);
      loadPortfolioRecords(); // Refresh the records list
      setSuccessMessage('Portfolio record deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const addPortfolioInput = () => {
    const newInputs = [...portfolioInputs, {
      id: generateUniqueId(),
      taxType: '',
      amount: '',
      accountType: '',
      owner: users[0] || 'User',
      investmentCompany: '',
      description: ''
    }];
    setPortfolioInputs(newInputs);
    // Save account definitions (without amounts) when adding accounts
    savePortfolioInputsToStorage(newInputs);
  };

  const removePortfolioInput = (index) => {
    if (portfolioInputs.length > 1) {
      const accountToRemove = portfolioInputs[index];
      
      // Clean up shared accounts if this account has been saved before
      const generatedAccountName = generateAccountName(
        accountToRemove.owner,
        accountToRemove.taxType,
        accountToRemove.accountType,
        accountToRemove.investmentCompany,
        accountToRemove.description
      );
      
      if (generatedAccountName && accountToRemove.accountType && accountToRemove.owner) {
        const cleanupResult = deleteSharedAccountsByMatch(
          generatedAccountName,
          accountToRemove.accountType,
          accountToRemove.owner
        );
        console.log('Cleaned up shared accounts:', cleanupResult);
      }
      
      const updatedInputs = portfolioInputs.filter((_, i) => i !== index);
      setPortfolioInputs(updatedInputs);
      // Save account definitions (without amounts) when removing accounts
      savePortfolioInputsToStorage(updatedInputs);
      
      // Remove errors for this input
      const newErrors = { ...errors };
      delete newErrors[index];
      
      // Reindex remaining errors
      const reindexedErrors = {};
      Object.keys(newErrors).forEach(key => {
        const errorIndex = parseInt(key);
        if (errorIndex > index) {
          reindexedErrors[errorIndex - 1] = newErrors[key];
        } else if (errorIndex < index) {
          reindexedErrors[errorIndex] = newErrors[key];
        }
      });
      
      setErrors(reindexedErrors);
    }
  };

  const updateHistoricalData = () => {
    if (!validateInputs()) {
      return;
    }

    try {
      const currentYear = new Date().getFullYear();
      const historicalData = getHistoricalData();
      
      // Start with existing balances to preserve accounts not being updated
      const currentTotals = {
        taxFree: historicalData[currentYear]?.taxFree || 0,
        taxDeferred: historicalData[currentYear]?.taxDeferred || 0,
        brokerage: historicalData[currentYear]?.brokerage || 0,
        espp: historicalData[currentYear]?.espp || 0,
        hsa: historicalData[currentYear]?.hsa || 0
      };

      // Track which account types are being updated so we can preserve others
      const accountTypesBeingUpdated = new Set();
      const taxTypesBeingUpdated = new Set();
      
      portfolioInputs.forEach(input => {
        if (input.accountType === 'ESPP' || input.accountType === 'HSA') {
          accountTypesBeingUpdated.add(input.accountType.toLowerCase());
        } else {
          switch (input.taxType) {
            case 'Tax-Free':
              taxTypesBeingUpdated.add('taxFree');
              break;
            case 'Tax-Deferred':
              taxTypesBeingUpdated.add('taxDeferred');
              break;
            case 'After-Tax':
            case 'Roth':
              taxTypesBeingUpdated.add('brokerage');
              break;
          }
        }
      });

      // Calculate new totals from portfolio inputs
      const newAmounts = portfolioInputs.reduce((acc, input) => {
        const amount = parseFloat(input.amount) || 0;
        
        // Use account type first for special accounts, then fall back to tax type
        if (input.accountType === 'ESPP') {
          acc.espp += amount;
        } else if (input.accountType === 'HSA') {
          acc.hsa += amount;
        } else {
          // Map by tax type for regular accounts
          switch (input.taxType) {
            case 'Tax-Free':
              acc.taxFree += amount;
              break;
            case 'Tax-Deferred':
              acc.taxDeferred += amount;
              break;
            case 'After-Tax':
            case 'Roth':
              acc.brokerage += amount;
              break;
          }
        }
        
        return acc;
      }, {
        taxFree: 0,
        taxDeferred: 0,
        brokerage: 0,
        espp: 0,
        hsa: 0
      });

      // Merge new amounts with existing, only updating categories that have portfolio inputs
      const totals = {
        taxFree: taxTypesBeingUpdated.has('taxFree') ? newAmounts.taxFree : currentTotals.taxFree,
        taxDeferred: taxTypesBeingUpdated.has('taxDeferred') ? newAmounts.taxDeferred : currentTotals.taxDeferred,
        brokerage: taxTypesBeingUpdated.has('brokerage') ? newAmounts.brokerage : currentTotals.brokerage,
        espp: accountTypesBeingUpdated.has('espp') ? newAmounts.espp : currentTotals.espp,
        hsa: accountTypesBeingUpdated.has('hsa') ? newAmounts.hsa : currentTotals.hsa
      };

      // Update current year entry
      if (!historicalData[currentYear]) {
        historicalData[currentYear] = { users: {} };
      }

      
      // Calculate new amounts by owner from portfolio inputs
      const newAmountsByOwner = portfolioInputs.reduce((acc, input) => {
        const amount = parseFloat(input.amount) || 0;
        const owner = input.owner;
        
        if (!acc[owner]) {
          acc[owner] = {
            taxFree: 0,
            taxDeferred: 0,
            brokerage: 0,
            espp: 0,
            hsa: 0
          };
        }
        
        // Use account type first for special accounts, then fall back to tax type
        if (input.accountType === 'ESPP') {
          acc[owner].espp += amount;
        } else if (input.accountType === 'HSA') {
          acc[owner].hsa += amount;
        } else {
          // Map by tax type for regular accounts
          switch (input.taxType) {
            case 'Tax-Free':
              acc[owner].taxFree += amount;
              break;
            case 'Tax-Deferred':
              acc[owner].taxDeferred += amount;
              break;
            case 'After-Tax':
            case 'Roth':
              acc[owner].brokerage += amount;
              break;
          }
        }
        
        return acc;
      }, {});
      
      // Build final totals by owner, preserving existing values for non-updated categories
      const totalsByOwner = {};
      const allOwners = new Set([
        ...Object.keys(newAmountsByOwner),
        ...Object.keys(historicalData[currentYear]?.users || {})
      ]);
      
      allOwners.forEach(owner => {
        const existingUserData = historicalData[currentYear]?.users?.[owner] || {};
        const newUserData = newAmountsByOwner[owner] || {};
        
        // Check which categories this owner has in current portfolio inputs
        const ownerInputs = portfolioInputs.filter(input => input.owner === owner);
        const ownerAccountTypes = new Set();
        const ownerTaxTypes = new Set();
        
        ownerInputs.forEach(input => {
          if (input.accountType === 'ESPP' || input.accountType === 'HSA') {
            ownerAccountTypes.add(input.accountType.toLowerCase());
          } else {
            switch (input.taxType) {
              case 'Tax-Free':
                ownerTaxTypes.add('taxFree');
                break;
              case 'Tax-Deferred':
                ownerTaxTypes.add('taxDeferred');
                break;
              case 'After-Tax':
              case 'Roth':
                ownerTaxTypes.add('brokerage');
                break;
            }
          }
        });
        
        totalsByOwner[owner] = {
          taxFree: ownerTaxTypes.has('taxFree') ? newUserData.taxFree || 0 : existingUserData.taxFree || 0,
          taxDeferred: ownerTaxTypes.has('taxDeferred') ? newUserData.taxDeferred || 0 : existingUserData.taxDeferred || 0,
          brokerage: ownerTaxTypes.has('brokerage') ? newUserData.brokerage || 0 : existingUserData.brokerage || 0,
          espp: ownerAccountTypes.has('espp') ? newUserData.espp || 0 : existingUserData.espp || 0,
          hsa: ownerAccountTypes.has('hsa') ? newUserData.hsa || 0 : existingUserData.hsa || 0
        };
      });
      

      // Get previous totals for change tracking BEFORE updating
      const previousTotals = {
        taxFree: historicalData[currentYear].taxFree || 0,
        taxDeferred: historicalData[currentYear].taxDeferred || 0,
        brokerage: historicalData[currentYear].brokerage || 0,
        espp: historicalData[currentYear].espp || 0,
        hsa: historicalData[currentYear].hsa || 0
      };

      // Update root-level investment data (this is how historical data is structured)
      historicalData[currentYear].taxFree = totals.taxFree;
      historicalData[currentYear].taxDeferred = totals.taxDeferred;
      historicalData[currentYear].brokerage = totals.brokerage;
      historicalData[currentYear].espp = totals.espp;
      historicalData[currentYear].hsa = totals.hsa;
      
      // Keep existing cash value or set to 0
      if (historicalData[currentYear].cash === undefined) {
        historicalData[currentYear].cash = 0;
      }

      // Also store individual owner data in users object for reference
      Object.entries(totalsByOwner).forEach(([ownerName, ownerTotals]) => {
        if (!historicalData[currentYear].users[ownerName]) {
          historicalData[currentYear].users[ownerName] = {};
        }
        
        const userData = historicalData[currentYear].users[ownerName];
        
        // Update investment fields with owner-specific totals for reference
        userData.taxFree = ownerTotals.taxFree;
        userData.taxDeferred = ownerTotals.taxDeferred;
        userData.brokerage = ownerTotals.brokerage;
        userData.espp = ownerTotals.espp;
        userData.hsa = ownerTotals.hsa;
        
        // Keep existing cash value or set to 0
        if (userData.cash === undefined) {
          userData.cash = 0;
        }
      });
      
      
      // Save updated historical data
      const saveResult = setHistoricalData(historicalData);
      if (saveResult) {
        setSuccessMessage(`Successfully updated ${currentYear} investment data!`);
        setCurrentYearData(historicalData[currentYear]);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
        
        // Clear existing portfolio accounts from shared system and add current ones
        // This ensures that deleted accounts don't persist
        const sharedAccounts = getSharedAccounts();
        const nonPortfolioAccounts = sharedAccounts.filter(acc => acc.source !== 'portfolio');
        
        // Add current portfolio inputs to shared system
        const updatedSharedAccounts = [...nonPortfolioAccounts];
        portfolioInputs.forEach(input => {
          // Generate account name from structured data
          const generatedAccountName = generateAccountName(
            input.owner,
            input.taxType,
            input.accountType,
            input.investmentCompany,
            input.description
          );
          
          if (generatedAccountName) {
            // Save to old Portfolio system for backward compatibility
            addPortfolioAccount(generatedAccountName, input.taxType, input.accountType, input.owner);
            
            // Add to updated shared accounts list
            const newSharedAccount = {
              id: generateUniqueId(),
              accountName: generatedAccountName,
              owner: input.owner,
              accountType: input.accountType,
              investmentCompany: input.investmentCompany || '',
              taxType: input.taxType,
              source: 'portfolio',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              sources: ['portfolio']
            };
            updatedSharedAccounts.push(newSharedAccount);
          }
        });
        
        // Update shared accounts with only current portfolio state
        setSharedAccounts(updatedSharedAccounts);
        
        // Prepare portfolio data with generated account names for all operations
        const portfolioDataWithNames = portfolioInputs.map(input => ({
          ...input,
          accountName: generateAccountName(
            input.owner,
            input.taxType,
            input.accountType,
            input.investmentCompany,
            input.description
          )
        }));
        
        // Add update record to history with change tracking
        addPortfolioUpdateRecord(portfolioDataWithNames, totals, previousTotals);
        
        // Add portfolio record with current date (with generated names)
        addPortfolioRecord(portfolioDataWithNames);
        
        // Automatically sync portfolio balances to performance (background sync)
        const syncResult = syncPortfolioBalanceToPerformance(portfolioDataWithNames);
        console.log('Portfolio->Performance sync result:', syncResult);
        
        // Also update performance accounts to only show latest portfolio accounts
        const performanceSyncResult = syncPerformanceAccountsFromLatestPortfolio();
        console.log('Performance accounts sync result:', performanceSyncResult);
        
        // Repopulate portfolio inputs with all available accounts (including from Performance)
        loadCurrentYearData(true); // Force reload accounts from both sources after update
        
        // Clear any validation errors
        setErrors({});
        
        // Refresh history and records
        loadUpdateHistory();
        loadPortfolioRecords();
        
      } else {
        alert('Failed to save historical data. Please try again.');
      }
      
    } catch (error) {
      console.error('Error updating historical data:', error);
      alert('Error updating historical data. Please try again.');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };


  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatChange = (change) => {
    if (!change || change === 0) return null;
    const formatted = formatCurrency(Math.abs(change));
    const sign = change > 0 ? '+' : '-';
    const color = change > 0 ? '#10b981' : '#ef4444';
    return { formatted, sign, color, value: change };
  };

  // Helper function to generate unique IDs
  const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleSyncSettingChange = (setting, value) => {
    const newSettings = { ...syncSettings, [setting]: value };
    setSyncSettings(newSettings);
    setPerformanceSyncSettings(newSettings);
  };

  // Manual grouping handler functions
  const handleCreateNewGroup = () => {
    const newGroup = createManualAccountGroup();
    loadManualGroups();
    setSuccessMessage(`Created new account group: ${newGroup.name}`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleUpdateGroupName = (groupId, newName) => {
    updateManualAccountGroup(groupId, { name: newName });
    loadManualGroups();
  };

  const handleUpdateGroupPerformanceAccount = (groupId, performanceAccountName) => {
    updateManualAccountGroup(groupId, { performanceAccountName });
    loadManualGroups();
  };

  const handleDeleteGroup = (groupId) => {
    const group = manualGroups[groupId];
    if (window.confirm(`Are you sure you want to delete the group "${group?.name}"? This will remove all account associations.`)) {
      deleteManualAccountGroup(groupId);
      loadManualGroups();
      setSuccessMessage('Account group deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleAddToGroup = (groupId, portfolioAccountId) => {
    if (!portfolioAccountId) return;
    
    addAccountToManualGroup(groupId, portfolioAccountId);
    loadManualGroups();
    
    const account = portfolioInputs.find(acc => acc.id === portfolioAccountId);
    const group = manualGroups[groupId];
    setSuccessMessage(`Added ${account?.accountName || 'account'} to ${group?.name || 'group'}`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleRemoveFromGroup = (groupId, portfolioAccountId) => {
    removeAccountFromManualGroup(groupId, portfolioAccountId);
    loadManualGroups();
    
    const account = portfolioInputs.find(acc => acc.id === portfolioAccountId);
    setSuccessMessage(`Removed ${account?.accountName || 'account'} from group`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // CSV Helper Functions for the reusable component
  const getCSVHeaders = () => {
    return ['owner', 'taxType', 'accountType', 'investmentCompany', 'description', 'amount', 'updateDate'];
  };

  const formatCSVRow = (input) => {
    const currentDate = new Date().toISOString().split('T')[0];
    return [
      input.owner || '',
      input.taxType || '',
      input.accountType || '',
      input.investmentCompany || '',
      input.description || '',
      input.amount || '',
      input.updateDate || currentDate
    ];
  };

  const parseCSVRow = (row) => {
    const owner = row.owner || '';
    const taxType = row.taxType || '';
    const accountType = row.accountType || '';
    const investmentCompany = row.investmentCompany || '';
    const description = row.description || '';
    const amount = row.amount || '';
    const updateDate = row.updateDate || '';
    
    // Validate required fields (no longer need accountName since it's auto-generated)
    if (!owner || !taxType || !accountType || !investmentCompany) {
      return null; // Skip invalid rows
    }

    // Validate against allowed values
    if (!TAX_TYPES.includes(taxType)) {
      return null;
    }

    if (!ACCOUNT_TYPES.includes(accountType)) {
      return null;
    }

    // Check if owner is valid (either in users list or empty for validation later)
    const validOwners = [...users];
    if (!validOwners.includes(owner)) {
      return null;
    }

    return {
      id: generateUniqueId(),
      owner: owner.trim(),
      taxType: taxType.trim(),
      accountType: accountType.trim(),
      investmentCompany: investmentCompany.trim(),
      description: description.trim(),
      amount: amount ? amount.toString().trim() : '',
      updateDate: updateDate ? updateDate.trim() : new Date().toISOString().split('T')[0]
    };
  };

  const generateTemplateData = () => {
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    return [
      {
        owner: users[0] || 'User',
        taxType: 'Tax-Deferred',
        accountType: '401k',
        investmentCompany: 'Fidelity',
        amount: '50000.00',
        updateDate: currentDate
      },
      {
        owner: users[0] || 'User', 
        taxType: 'Tax-Free',
        accountType: 'IRA',
        investmentCompany: 'Vanguard',
        amount: '25000.00',
        updateDate: currentDate
      },
      {
        owner: 'Joint',
        taxType: 'After-Tax',
        accountType: 'Brokerage',
        investmentCompany: 'Charles Schwab',
        amount: '15000.00',
        updateDate: currentDate
      },
      {
        owner: users[0] || 'User',
        taxType: 'After-Tax',
        accountType: 'HSA',
        investmentCompany: 'HSA Bank',
        amount: '5000.00',
        updateDate: currentDate
      }
    ];
  };

  const handleCSVImportSuccess = (parsed) => {
    // Replace current portfolio inputs with CSV data
    console.log('📤 CSV Import: Setting portfolio inputs:', parsed.length, 'accounts');
    console.log('📤 CSV Import: Parsed data:', parsed);
    setPortfolioInputs(parsed);
    
    // Explicitly save to localStorage after CSV import to ensure persistence
    if (parsed.length > 0) {
      console.log('💾 CSV Import: Explicitly saving to localStorage');
      try {
        const saveResult = savePortfolioInputsToStorage(parsed);
        console.log('💾 CSV Import: Save completed, result:', saveResult);
      } catch (error) {
        console.error('❌ CSV Import: Save failed with error:', error);
      }
      
      // Verify the data was saved by reading it back
      setTimeout(() => {
        try {
          const savedData = getPortfolioInputs();
          console.log('🔍 CSV Import: Verification - saved data length:', savedData.length);
          console.log('🔍 CSV Import: Verification - saved data:', savedData);
          
          // Also check raw localStorage
          const rawData = localStorage.getItem('portfolioInputs');
          console.log('🔍 CSV Import: Raw localStorage data:', rawData);
        } catch (error) {
          console.error('❌ CSV Import: Verification failed with error:', error);
        }
      }, 100);
    }
    
    // Add portfolio records for each unique update date in the CSV
    const dateGroups = {};
    parsed.forEach(account => {
      const date = account.updateDate;
      if (!dateGroups[date]) {
        dateGroups[date] = [];
      }
      dateGroups[date].push(account);
    });
    
    // Create records for each date group
    Object.entries(dateGroups).forEach(([date, accounts]) => {
      addPortfolioRecord(accounts, date);
    });
    
    // Refresh records display
    loadPortfolioRecords();
    
    // Clear any existing errors
    setErrors({});
    
    alert(`Successfully imported ${parsed.length} accounts from CSV`);
    if (Object.keys(dateGroups).length > 1) {
      alert(`Created ${Object.keys(dateGroups).length} portfolio records for different update dates.`);
    }
  };

  const handleCSVImportError = (error) => {
    alert(`Error importing CSV: ${error.message}`);
  };

  const getCurrentPortfolioData = () => {
    const currentDate = new Date().toISOString().split('T')[0];
    // Add updateDate to current portfolio inputs
    return portfolioInputs.map(input => ({
      ...input,
      updateDate: currentDate
    }));
  };

  const handleResetPortfolioData = () => {
    if (window.confirm('Are you sure you want to reset all portfolio data? This cannot be undone.')) {
      // Reset all portfolio component state
      setPortfolioInputs([{
        id: generateUniqueId(),
        owner: users[0] || 'User',
        taxType: '',
        accountType: '',
        investmentCompany: '',
        amount: '',
        description: ''
      }]);
      setCurrentYearData({});
      setUpdateHistory([]);
      setPortfolioRecords([]);
      setErrors({});
      setSuccessMessage('');
      setShowHistory(false);
      setShowRecords(false);
      
      // Clear localStorage data related to portfolio
      const currentYear = new Date().getFullYear();
      const historicalData = getHistoricalData();
      if (historicalData[currentYear]) {
        // Reset investment fields to 0
        historicalData[currentYear].taxFree = 0;
        historicalData[currentYear].taxDeferred = 0;
        historicalData[currentYear].brokerage = 0;
        historicalData[currentYear].espp = 0;
        historicalData[currentYear].hsa = 0;
        
        // Reset user investment data
        Object.keys(historicalData[currentYear].users || {}).forEach(userName => {
          if (historicalData[currentYear].users[userName]) {
            historicalData[currentYear].users[userName].taxFree = 0;
            historicalData[currentYear].users[userName].taxDeferred = 0;
            historicalData[currentYear].users[userName].brokerage = 0;
            historicalData[currentYear].users[userName].espp = 0;
            historicalData[currentYear].users[userName].hsa = 0;
          }
        });
        
        setHistoricalData(historicalData);
      }
      
      // Also clear shared accounts, manual groups, and portfolio inputs
      clearSharedAccounts();
      clearManualAccountGroups();
      clearPortfolioInputs();
      
      alert('Portfolio data has been reset successfully.');
    }
  };

  const downloadPortfolioRecordsCSV = () => {
    if (portfolioRecords.length === 0) {
      alert('No portfolio records to export.');
      return;
    }

    const headers = getCSVHeaders();
    const allAccounts = [];
    
    // Flatten all accounts from all records
    portfolioRecords.forEach(record => {
      record.accounts.forEach(account => {
        allAccounts.push({
          owner: account.owner,
          taxType: account.taxType,
          accountType: account.accountType,
          investmentCompany: account.investmentCompany || '',
          description: account.description || '',
          amount: account.amount.toString(),
          updateDate: account.updateDate
        });
      });
    });

    // Generate CSV content manually
    const rows = [headers];
    allAccounts.forEach(account => {
      const row = formatCSVRow(account);
      rows.push(row);
    });
    
    const csvContent = rows.map(row =>
      row.map(value => {
        const stringValue = value == null ? '' : String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = generateDataFilename('portfolio_all_records', users.filter(u => u !== 'Joint'), 'csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getCurrentTotals = () => {
    return portfolioInputs.reduce((acc, input) => {
      const amount = parseFloat(input.amount) || 0;
      
      // Use account type first for special accounts, then fall back to tax type
      if (input.accountType === 'ESPP') {
        acc.espp += amount;
      } else if (input.accountType === 'HSA') {
        acc.hsa += amount;
      } else {
        // Map by tax type for regular accounts
        switch (input.taxType) {
          case 'Tax-Free':
            acc.taxFree += amount;
            break;
          case 'Tax-Deferred':
            acc.taxDeferred += amount;
            break;
          case 'After-Tax':
          case 'Roth':
            acc.brokerage += amount;
            break;
        }
      }
      
      return acc;
    }, {
      taxFree: 0,
      taxDeferred: 0,
      brokerage: 0,
      hsa: 0,
      espp: 0
    });
  };

  const currentTotals = getCurrentTotals();
  const currentYear = new Date().getFullYear();

  return (
    <>
      <Navigation />
      <div className="app-container">
        <div className="header">
          <h1>📈 Portfolio Data Update</h1>
          <p>Input current portfolio values to update {currentYear} historical data</p>
        </div>

        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}


        {/* Manual Account Grouping Section */}
        <div className="manual-grouping-section" style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f0f8ff', borderRadius: '8px', border: '1px solid #cce7ff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#495057' }}>📋 Manual Account Grouping for Performance Sync</h3>
            <button 
              type="button" 
              onClick={() => setShowManualGrouping(!showManualGrouping)}
              className="btn-secondary"
            >
              {showManualGrouping ? 'Hide Grouping' : `Show Grouping (${Object.keys(manualGroups).length} groups)`}
            </button>
          </div>
          
          {showManualGrouping && (
            <div>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#6c757d' }}>
                Group portfolio accounts together to sync their combined balance with specific Performance accounts. 
                This gives you full control over which accounts are combined.
              </p>
              
              {Object.entries(manualGroups).map(([groupId, group]) => {
                const ungroupedAccounts = getUngroupedPortfolioAccounts(portfolioInputs);
                const unusedPerformanceAccounts = getUnusedPerformanceAccounts();
                const groupBalance = calculateManualGroupBalance(groupId, portfolioInputs);
                
                return (
                  <div key={groupId} className="account-group" style={{ 
                    marginBottom: '1.5rem', 
                    padding: '1rem', 
                    backgroundColor: 'white', 
                    borderRadius: '6px', 
                    border: '1px solid #dee2e6' 
                  }}>
                    <div className="group-header" style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem', 
                      marginBottom: '1rem',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ flex: '1', minWidth: '200px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                          Group Name:
                        </label>
                        <input 
                          type="text"
                          value={group.name} 
                          onChange={(e) => handleUpdateGroupName(groupId, e.target.value)}
                          placeholder="Group name (e.g., Combined 401k)"
                          style={{ 
                            width: '100%', 
                            padding: '0.5rem', 
                            border: '1px solid #ced4da', 
                            borderRadius: '4px' 
                          }}
                        />
                      </div>
                      
                      <div style={{ flex: '1', minWidth: '250px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#6c757d', marginBottom: '0.25rem' }}>
                          Sync to Performance Account:
                        </label>
                        <select 
                          value={group.performanceAccountName || ''}
                          onChange={(e) => handleUpdateGroupPerformanceAccount(groupId, e.target.value)}
                          style={{ 
                            width: '100%', 
                            padding: '0.5rem', 
                            border: '1px solid #ced4da', 
                            borderRadius: '4px' 
                          }}
                        >
                          <option value="">Select Performance Account</option>
                          {/* Show unused performance accounts */}
                          {unusedPerformanceAccounts.map(acc => (
                            <option key={acc.id} value={acc.accountName}>
                              {acc.accountName} ({acc.owner}){!acc.isCurrentYear ? ` - ${acc.year}` : ''}
                            </option>
                          ))}
                          {/* Also show the currently selected account for this group (if any) */}
                          {group.performanceAccountName && !unusedPerformanceAccounts.find(acc => acc.accountName === group.performanceAccountName) && (
                            <option key={`current-${groupId}`} value={group.performanceAccountName}>
                              {group.performanceAccountName} (Currently Selected)
                            </option>
                          )}
                        </select>
                      </div>
                      
                      <button 
                        type="button"
                        onClick={() => handleDeleteGroup(groupId)}
                        className="btn-delete"
                        style={{ 
                          padding: '0.5rem 1rem',
                          minHeight: 'auto'
                        }}
                        title="Delete this group"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                    
                    {/* Portfolio accounts in this group */}
                    <div className="group-accounts" style={{ marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '0.9rem', color: '#495057', marginBottom: '0.5rem' }}>
                        Portfolio Accounts in Group ({group.portfolioAccounts.length}):
                      </h4>
                      
                      {group.portfolioAccounts.length === 0 ? (
                        <div style={{ 
                          padding: '1rem', 
                          backgroundColor: '#f8f9fa', 
                          borderRadius: '4px', 
                          fontStyle: 'italic', 
                          color: '#6c757d',
                          textAlign: 'center'
                        }}>
                          No accounts in this group yet. Add accounts below.
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.5rem' }}>
                          {group.portfolioAccounts.map(accountId => {
                            const account = portfolioInputs.find(acc => acc.id === accountId);
                            return account ? (
                              <div 
                                key={accountId} 
                                className="grouped-account" 
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'space-between',
                                  padding: '0.5rem', 
                                  backgroundColor: '#e7f3ff', 
                                  borderRadius: '4px',
                                  fontSize: '0.85rem'
                                }}
                              >
                                <div>
                                  <strong>{generateAccountName(account.owner, account.taxType, account.accountType, account.investmentCompany, account.description)}</strong>
                                  <div style={{ color: '#6c757d' }}>
                                    {formatCurrency(account.amount)}
                                  </div>
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => handleRemoveFromGroup(groupId, accountId)}
                                  style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    cursor: 'pointer',
                                    padding: '0.25rem',
                                    color: '#dc3545'
                                  }}
                                  title="Remove from group"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                      
                      {/* Add accounts to group */}
                      <div style={{ marginTop: '1rem' }}>
                        <select 
                          onChange={(e) => handleAddToGroup(groupId, e.target.value)}
                          value=""
                          style={{ 
                            width: '100%', 
                            padding: '0.5rem', 
                            border: '1px solid #ced4da', 
                            borderRadius: '4px' 
                          }}
                        >
                          <option value="">+ Add Portfolio Account to Group</option>
                          {ungroupedAccounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {generateAccountName(acc.owner, acc.taxType, acc.accountType, acc.investmentCompany, acc.description)} - {formatCurrency(acc.amount)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="group-summary" style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '0.75rem',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      fontWeight: 'bold'
                    }}>
                      <span>Group Total Balance:</span>
                      <span style={{ color: '#28a745' }}>{formatCurrency(groupBalance)}</span>
                    </div>
                    
                    {group.lastSync && (
                      <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.5rem', textAlign: 'right' }}>
                        Last synced: {new Date(group.lastSync).toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {Object.keys(manualGroups).length === 0 && (
                <div style={{ 
                  padding: '2rem', 
                  textAlign: 'center', 
                  backgroundColor: 'white', 
                  borderRadius: '6px', 
                  border: '2px dashed #dee2e6' 
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>📋</div>
                  <div style={{ fontSize: '1rem', color: '#6c757d', marginBottom: '1rem' }}>
                    No manual account groups yet
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#868e96' }}>
                    Create groups to combine multiple portfolio accounts and sync them to specific Performance accounts
                  </div>
                </div>
              )}
              
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button 
                  type="button"
                  onClick={handleCreateNewGroup} 
                  className="btn-secondary"
                  style={{ padding: '0.75rem 1.5rem' }}
                >
                  + Create New Account Group
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Portfolio Accounts Table */}
        <div className="portfolio-accounts">
          <h2>Portfolio Account Values</h2>
          <p>Enter your current account values from investment websites:</p>
          
          <div className="accounts-table">
            <table>
              <thead>
                <tr>
                  <th>Generated Account Name</th>
                  <th>Owner</th>
                  <th>Tax Type</th>
                  <th>Account Type</th>
                  <th>Investment Company</th>
                  <th>Description (Optional)</th>
                  <th>Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {portfolioInputs.map((input, index) => (
                  <tr key={input.id}>
                    <td>
                      <div style={{ padding: '0.5rem', fontStyle: 'italic', color: '#666' }}>
                        {generateAccountName(
                          input.owner,
                          input.taxType,
                          input.accountType,
                          input.investmentCompany,
                          input.description
                        ) || 'Complete fields to see name'}
                      </div>
                    </td>
                    <td>
                      <select
                        value={input.owner}
                        onChange={(e) => handleInputChange(index, 'owner', e.target.value)}
                        className={errors[index]?.owner ? 'error' : ''}
                        style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.5rem' }}
                      >
                        {users.map(user => (
                          <option key={user} value={user}>{user}</option>
                        ))}
                      </select>
                      {errors[index]?.owner && <div className="error-text" style={{ fontSize: '0.7rem' }}>{errors[index].owner}</div>}
                    </td>
                    <td>
                      <select
                        value={input.taxType}
                        onChange={(e) => handleInputChange(index, 'taxType', e.target.value)}
                        className={errors[index]?.taxType ? 'error' : ''}
                        style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.5rem' }}
                      >
                        <option value="">Select</option>
                        {TAX_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      {errors[index]?.taxType && <div className="error-text" style={{ fontSize: '0.7rem' }}>{errors[index].taxType}</div>}
                    </td>
                    <td>
                      <select
                        value={input.accountType}
                        onChange={(e) => handleInputChange(index, 'accountType', e.target.value)}
                        className={errors[index]?.accountType ? 'error' : ''}
                        style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.5rem' }}
                      >
                        <option value="">Select</option>
                        {ACCOUNT_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      {errors[index]?.accountType && <div className="error-text" style={{ fontSize: '0.7rem' }}>{errors[index].accountType}</div>}
                    </td>
                    <td>
                      <input
                        type="text"
                        value={input.investmentCompany || ''}
                        onChange={(e) => handleInputChange(index, 'investmentCompany', e.target.value)}
                        placeholder="e.g., Fidelity"
                        className={errors[index]?.investmentCompany ? 'error' : ''}
                        style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.5rem' }}
                      />
                      {errors[index]?.investmentCompany && <div className="error-text" style={{ fontSize: '0.7rem' }}>{errors[index].investmentCompany}</div>}
                    </td>
                    <td>
                      <input
                        type="text"
                        value={input.description || ''}
                        onChange={(e) => handleInputChange(index, 'description', e.target.value)}
                        placeholder="e.g., Rollover IRA, Main 401k"
                        style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.5rem' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={input.amount || ''}
                        onChange={(e) => handleInputChange(index, 'amount', e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className={errors[index]?.amount ? 'error' : ''}
                        style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.5rem', textAlign: 'right' }}
                      />
                      {errors[index]?.amount && <div className="error-text" style={{ fontSize: '0.7rem' }}>{errors[index].amount}</div>}
                    </td>
                    <td className="actions">
                      <button 
                        type="button" 
                        onClick={() => removePortfolioInput(index)}
                        className="btn-delete"
                        disabled={portfolioInputs.length === 1}
                        title="Delete account"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="form-actions">
            <button type="button" onClick={addPortfolioInput} className="btn-secondary">
              + Add Another Account
            </button>
            <button 
              type="button" 
              onClick={() => loadCurrentYearData(true)} 
              className="btn-tertiary"
              title="Load account definitions from your previous portfolio entries"
            >
              📋 Load Previous Accounts
            </button>
            <button type="button" onClick={updateHistoricalData} className="btn-primary">
              Update Historical Data
            </button>
          </div>


          {/* CSV Import/Export Section */}
          <CSVImportExport
            title="CSV Import/Export"
            subtitle="Import account data from a CSV file or download the current data as CSV."
            data={getCurrentPortfolioData()}
            headers={getCSVHeaders()}
            formatRowData={formatCSVRow}
            parseRowData={parseCSVRow}
            onImportSuccess={handleCSVImportSuccess}
            onImportError={handleCSVImportError}
            generateTemplate={generateTemplateData}
            compact={true}
            dataType="portfolio_current"
            userNames={users.filter(u => u !== 'Joint')}
            showResetButton={true}
            onReset={handleResetPortfolioData}
            className="csv-section"
          />
        </div>

        {/* Summary Preview */}
        <div className="summary-preview">
          <h2>Preview of Updates</h2>
          <div className="summary-cards">
            {(() => {
              // Get current balances from historical data for comparison
              const currentBalances = {
                taxFree: currentYearData?.taxFree || 0,
                taxDeferred: currentYearData?.taxDeferred || 0,
                brokerage: currentYearData?.brokerage || 0,
                hsa: currentYearData?.hsa || 0,
                espp: currentYearData?.espp || 0
              };

              const categories = [
                { key: 'taxFree', label: 'Tax-Free' },
                { key: 'taxDeferred', label: 'Tax-Deferred' },
                { key: 'brokerage', label: 'Brokerage/After-Tax' },
                { key: 'hsa', label: 'HSA' },
                { key: 'espp', label: 'ESPP' }
              ];

              // Calculate totals for current and new amounts
              const currentTotal = Object.values(currentBalances).reduce((sum, amount) => sum + amount, 0);
              const newTotal = Object.values(currentTotals).reduce((sum, amount) => sum + amount, 0);
              const totalChange = newTotal - currentTotal;
              const totalChangeInfo = formatChange(totalChange);

              const categoryCards = categories.map(({ key, label }) => {
                const newAmount = currentTotals[key] || 0;
                const currentAmount = currentBalances[key] || 0;
                const change = newAmount - currentAmount;
                const changeInfo = formatChange(change);

                return (
                  <div key={key} className="summary-card">
                    <h3>{label}</h3>
                    <div className="summary-amounts">
                      <div className="current-amount">
                        <span className="amount-label">Current:</span>
                        <span className="amount">{formatCurrency(currentAmount)}</span>
                      </div>
                      <div className="new-amount">
                        <span className="amount-label">New:</span>
                        <span className="amount">{formatCurrency(newAmount)}</span>
                      </div>
                      {changeInfo && (
                        <div className="amount-change">
                          <span className="amount-label">Change:</span>
                          <span 
                            className="change-value"
                            style={{ color: changeInfo.color }}
                          >
                            {changeInfo.sign}{changeInfo.formatted}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              });

              // Add total card
              const totalCard = (
                <div key="total" className="summary-card summary-card-total">
                  <h3>📊 Total Portfolio</h3>
                  <div className="summary-amounts">
                    <div className="current-amount">
                      <span className="amount-label">Current:</span>
                      <span className="amount">{formatCurrency(currentTotal)}</span>
                    </div>
                    <div className="new-amount">
                      <span className="amount-label">New:</span>
                      <span className="amount">{formatCurrency(newTotal)}</span>
                    </div>
                    {totalChangeInfo && (
                      <div className="amount-change">
                        <span className="amount-label">Change:</span>
                        <span 
                          className="change-value"
                          style={{ color: totalChangeInfo.color }}
                        >
                          {totalChangeInfo.sign}{totalChangeInfo.formatted}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );

              return [...categoryCards, totalCard];
            })()}
          </div>
        </div>

        {/* Current Historical Data Display */}
        {currentYearData && Object.keys(currentYearData).length > 0 && (
          <div className="current-data-section">
            <h2>Current {currentYear} Investment Data</h2>
            {updateHistory.length > 0 && (
              <p className="last-update-info">
                Last updated: {formatDateTime(updateHistory[0].timestamp)}
                {updateHistory[0].changes && updateHistory[0].changes.total !== 0 && (
                  <span 
                    className="last-update-change"
                    style={{ color: formatChange(updateHistory[0].changes.total)?.color }}
                  >
                    {' '}({formatChange(updateHistory[0].changes.total)?.sign}{formatChange(updateHistory[0].changes.total)?.formatted} total change)
                  </span>
                )}
              </p>
            )}
            <div className="current-data-cards">
              <div className="user-data-card">
                <h3>Combined Portfolio Total</h3>
                <div className="investment-fields">
                  <div>Tax-Free: {formatCurrency(currentYearData.taxFree || 0)}</div>
                  <div>Tax-Deferred: {formatCurrency(currentYearData.taxDeferred || 0)}</div>
                  <div>Brokerage: {formatCurrency(currentYearData.brokerage || 0)}</div>
                  <div>ESPP: {formatCurrency(currentYearData.espp || 0)}</div>
                  <div>HSA: {formatCurrency(currentYearData.hsa || 0)}</div>
                  <div>Cash: {formatCurrency(currentYearData.cash || 0)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Update History */}
        {updateHistory.length > 0 && (
          <div className="update-history-section">
            <div className="update-history-header">
              <h2>Update History</h2>
              <button 
                type="button" 
                onClick={() => setShowHistory(!showHistory)}
                className="btn-secondary"
              >
                {showHistory ? 'Hide History' : `Show History (${updateHistory.length})`}
              </button>
            </div>
            
            {showHistory && (
              <div className="update-history-list">
                {updateHistory.map(record => (
                  <div key={record.id} className="update-record">
                    <div className="update-record-header">
                      <div className="update-timestamp">
                        <strong>{formatDateTime(record.timestamp)}</strong>
                        <span className="update-year">Year: {record.year}</span>
                      </div>
                      <div className="update-summary">
                        <span>{record.accountsUpdated} accounts • {formatCurrency(record.totalAmount)} total</span>
                      </div>
                    </div>
                    
                    <div className="update-totals">
                      <div className="update-totals-grid">
                        <div className="update-total-item">
                          <span className="total-label">Tax-Free:</span>
                          <span className="total-amount">{formatCurrency(record.totals.taxFree)}</span>
                          {record.changes && formatChange(record.changes.taxFree) && (
                            <span 
                              className="total-change" 
                              style={{ color: formatChange(record.changes.taxFree).color }}
                            >
                              ({formatChange(record.changes.taxFree).sign}{formatChange(record.changes.taxFree).formatted})
                            </span>
                          )}
                        </div>
                        
                        <div className="update-total-item">
                          <span className="total-label">Tax-Deferred:</span>
                          <span className="total-amount">{formatCurrency(record.totals.taxDeferred)}</span>
                          {record.changes && formatChange(record.changes.taxDeferred) && (
                            <span 
                              className="total-change" 
                              style={{ color: formatChange(record.changes.taxDeferred).color }}
                            >
                              ({formatChange(record.changes.taxDeferred).sign}{formatChange(record.changes.taxDeferred).formatted})
                            </span>
                          )}
                        </div>
                        
                        <div className="update-total-item">
                          <span className="total-label">Brokerage:</span>
                          <span className="total-amount">{formatCurrency(record.totals.brokerage)}</span>
                          {record.changes && formatChange(record.changes.brokerage) && (
                            <span 
                              className="total-change" 
                              style={{ color: formatChange(record.changes.brokerage).color }}
                            >
                              ({formatChange(record.changes.brokerage).sign}{formatChange(record.changes.brokerage).formatted})
                            </span>
                          )}
                        </div>
                        
                        <div className="update-total-item">
                          <span className="total-label">ESPP:</span>
                          <span className="total-amount">{formatCurrency(record.totals.espp)}</span>
                          {record.changes && formatChange(record.changes.espp) && (
                            <span 
                              className="total-change" 
                              style={{ color: formatChange(record.changes.espp).color }}
                            >
                              ({formatChange(record.changes.espp).sign}{formatChange(record.changes.espp).formatted})
                            </span>
                          )}
                        </div>
                        
                        <div className="update-total-item">
                          <span className="total-label">HSA:</span>
                          <span className="total-amount">{formatCurrency(record.totals.hsa)}</span>
                          {record.changes && formatChange(record.changes.hsa) && (
                            <span 
                              className="total-change" 
                              style={{ color: formatChange(record.changes.hsa).color }}
                            >
                              ({formatChange(record.changes.hsa).sign}{formatChange(record.changes.hsa).formatted})
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {record.changes && record.changes.total !== 0 && (
                        <div className="update-total-change-summary">
                          <strong>
                            Total Change: 
                            <span 
                              style={{ color: formatChange(record.changes.total).color, marginLeft: '0.5rem' }}
                            >
                              {formatChange(record.changes.total).sign}{formatChange(record.changes.total).formatted}
                            </span>
                          </strong>
                        </div>
                      )}
                    </div>
                    
                    <details className="update-accounts-details">
                      <summary>View Account Details ({record.accounts.length} accounts)</summary>
                      <div className="update-accounts-list">
                        {record.accounts.map((acc, idx) => (
                          <div key={idx} className="update-account">
                            <strong>{acc.accountName}</strong> ({acc.owner}) - {acc.taxType} - {formatCurrency(acc.amount)}
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Portfolio Records */}
        {portfolioRecords.length > 0 && (
          <div className="portfolio-records-section">
            <div className="portfolio-records-header">
              <h2>📋 Portfolio Records</h2>
              <div className="portfolio-records-controls">
                <button 
                  type="button" 
                  onClick={() => setSortRecordsNewestFirst(!sortRecordsNewestFirst)}
                  className="btn-tertiary sort-records-btn"
                  title={`Currently showing ${sortRecordsNewestFirst ? 'newest first' : 'oldest first'}`}
                >
                  📅 {sortRecordsNewestFirst ? 'Newest First' : 'Oldest First'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowRecords(!showRecords)}
                  className="btn-secondary"
                >
                  {showRecords ? 'Hide Records' : `Show All Records (${portfolioRecords.length})`}
                </button>
              </div>
            </div>
            
            {showRecords && (
              <div className="portfolio-records-list">
                {portfolioRecords
                  .sort((a, b) => {
                    if (sortRecordsNewestFirst) {
                      return new Date(b.updateDate) - new Date(a.updateDate);
                    } else {
                      return new Date(a.updateDate) - new Date(b.updateDate);
                    }
                  })
                  .map(record => (
                  <div key={record.id} className="portfolio-record">
                    <div className="record-header">
                      <div className="record-date">
                        <strong>{record.updateDate}</strong>
                        <span className="record-details">
                          {record.accountsCount} accounts • {formatCurrency(record.totalAmount)} total
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleDeleteRecord(record.id)}
                        className="delete-record-btn"
                        title="Delete this record"
                      >
                        ×
                      </button>
                    </div>
                    
                    <div className="record-totals">
                      <div className="record-totals-grid">
                        <div>Tax-Free: {formatCurrency(record.totals.taxFree)}</div>
                        <div>Tax-Deferred: {formatCurrency(record.totals.taxDeferred)}</div>
                        <div>Brokerage: {formatCurrency(record.totals.brokerage)}</div>
                        <div>HSA: {formatCurrency(record.totals.hsa)}</div>
                        <div>ESPP: {formatCurrency(record.totals.espp)}</div>
                      </div>
                    </div>
                    
                    <details className="record-accounts-details">
                      <summary>View Account Details ({record.accounts.length} accounts)</summary>
                      <div className="record-accounts-list">
                        {record.accounts.map((acc, idx) => (
                          <div key={idx} className="record-account">
                            <strong>{acc.accountName}</strong> ({acc.owner}) - {acc.taxType} - {formatCurrency(acc.amount)}
                            <span className="account-update-date">Updated: {acc.updateDate}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                ))}
                
                <div className="records-export-section">
                  <button 
                    type="button" 
                    onClick={() => downloadPortfolioRecordsCSV()}
                    className="btn-csv-export"
                  >
                    📤 Export All Records as CSV
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Portfolio;