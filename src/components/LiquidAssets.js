import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import { 
  getAnnualData, 
  setAnnualData,
  getPaycheckData,
  getLiquidAssetsAccounts,
  addLiquidAssetsAccount,
  getLiquidAssetsRecords,
  addLiquidAssetsRecord,
  deleteLiquidAssetsRecord,
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
  getAvailableAccounts,
  getUnusedAccounts,
  getUngroupedLiquidAssetsAccounts,
  calculateManualGroupBalance,
  clearManualAccountGroups,
  // Liquid Assets inputs persistence
  getLiquidAssetsInputs,
  setLiquidAssetsInputs as saveLiquidAssetsInputsToLocalStorage,
  clearLiquidAssetsInputs
} from '../utils/localStorage';
import { generateDataFilename } from '../utils/calculationHelpers';
import CSVImportExport from './CSVImportExport';
import { 
  syncLiquidAssetsBalanceToAccounts,
  syncAccountsFromLatestLiquidAssets,
  generateAccountName
} from '../utils/liquidAssetsAccountsSync';
import { 
  getAccountSyncSettings,
  setAccountSyncSettings
} from '../utils/localStorage';
import '../styles/liquid-assets.css';

const LiquidAssets = () => {
  const [liquidAssetsInputs, setLiquidAssetsInputs] = useState([]);
  const [currentYearData, setCurrentYearData] = useState({});
  const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [liquidAssetsRecords, setLiquidAssetsRecords] = useState([]);
  const [showRecords, setShowRecords] = useState(false);
  const [sortRecordsNewestFirst, setSortRecordsNewestFirst] = useState(true);
  const [syncSettings, setSyncSettings] = useState({});
  // Manual account grouping state
  const [manualGroups, setManualGroups] = useState({});
  const [showManualGrouping, setShowManualGrouping] = useState(false);
  const [showExpandedFields, setShowExpandedFields] = useState(false);
  const [collapsedAccounts, setCollapsedAccounts] = useState(() => {
    try {
      const saved = localStorage.getItem('liquidAssetsCollapsedAccounts');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (error) {
      return new Set();
    }
  });

  // Validation options
  const TAX_TYPES = ['Tax-Free', 'Tax-Deferred', 'After-Tax', 'Cash'];
  const ACCOUNT_TYPES = ['IRA', 'Brokerage', '401k', 'ESPP', 'HSA', 'Cash'];

  // Save collapsed accounts state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('liquidAssetsCollapsedAccounts', JSON.stringify([...collapsedAccounts]));
    } catch (error) {
      console.error('Failed to save collapsed accounts state:', error);
    }
  }, [collapsedAccounts]);

  useEffect(() => {
    // Initialize shared accounts system on component mount
    initializeSharedAccounts();
    
    loadCurrentYearData();
    loadLiquidAssetsRecords();
    loadManualGroups();
    
    // Load sync settings
    const settings = getAccountSyncSettings();
    setSyncSettings(settings);

    // Listen for global reset event
    const handleResetAllData = () => {
      // Reset all liquid assets component state
      setLiquidAssetsInputs([{
        id: generateUniqueId(),
        accountName: '',
        owner: '',
        taxType: '',
        accountType: '',
        amount: '',
        description: '',
        contributions: '',
        employerMatch: '',
        gains: '',
        fees: '',
        withdrawals: ''
      }]);
      setCurrentYearData({});
            setLiquidAssetsRecords([]);
      setErrors({});
      setSuccessMessage('');
            setShowRecords(false);
      setManualGroups({});
      setShowManualGrouping(false);
      setCollapsedAccounts(new Set());
      
      // Also clear shared accounts, manual groups, and liquid assets inputs when global reset happens
      clearSharedAccounts();
      clearManualAccountGroups();
      clearLiquidAssetsInputs();
      localStorage.removeItem('liquidAssetsCollapsedAccounts');
    };

    // Listen for shared accounts updates from Accounts component
    const handleSharedAccountsUpdated = () => {
      // Refresh liquid assets inputs when shared accounts are updated
      loadCurrentYearData();
    };

    // Listen for manual groups updates
    const handleManualGroupsUpdated = () => {
      loadManualGroups();
    };

    // Listen for liquid assets inputs updates but preserve current financial data
    const handleLiquidAssetsInputsUpdated = () => {
      const currentFinancialData = {};
      liquidAssetsInputs.forEach((input) => {
        currentFinancialData[input.id] = {
          amount: input.amount || '',
          contributions: input.contributions || '',
          employerMatch: input.employerMatch || '',
          gains: input.gains || '',
          fees: input.fees || '',
          withdrawals: input.withdrawals || ''
        };
      });
      
      loadLiquidAssetsInputs();
      
      // Restore financial data after loading
      setTimeout(() => {
        setLiquidAssetsInputs(currentInputs => 
          currentInputs.map(input => ({
            ...input,
            ...currentFinancialData[input.id] || {
              amount: '',
              contributions: '',
              employerMatch: '',
              gains: '',
              fees: '',
              withdrawals: ''
            }
          }))
        );
      }, 0);
    };

    window.addEventListener('resetAllData', handleResetAllData);
    window.addEventListener('sharedAccountsUpdated', handleSharedAccountsUpdated);
    window.addEventListener('liquidAssetsAccountGroupsUpdated', handleManualGroupsUpdated);
    window.addEventListener('liquidAssetsInputsUpdated', handleLiquidAssetsInputsUpdated);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('resetAllData', handleResetAllData);
      window.removeEventListener('sharedAccountsUpdated', handleSharedAccountsUpdated);
      window.removeEventListener('liquidAssetsAccountGroupsUpdated', handleManualGroupsUpdated);
      window.removeEventListener('liquidAssetsInputsUpdated', handleLiquidAssetsInputsUpdated);
    };
  }, []);

  // Save liquid assets inputs to localStorage whenever they change
  // Removed automatic saving useEffect to prevent input refresh issues
  // Liquid assets account definitions are now saved manually when adding/removing accounts
  // Amount values are intentionally not persisted


  const loadLiquidAssetsRecords = () => {
    const records = getLiquidAssetsRecords();
    setLiquidAssetsRecords(records);
  };

  const loadManualGroups = () => {
    const groups = getManualAccountGroups();
    setManualGroups(groups);
  };

  const loadLiquidAssetsInputs = () => {
    const savedInputs = getLiquidAssetsInputs();
    if (savedInputs.length > 0) {
      // Load account setup fields but always start with empty financial data
      const inputsWithEmptyFinancialData = savedInputs.map(input => ({
        id: input.id || generateUniqueId(),
        owner: input.owner || '',
        taxType: input.taxType || '',
        accountType: input.accountType || '',
        investmentCompany: input.investmentCompany || '',
        description: input.description || '',
        // Financial data always starts empty - never persisted
        amount: '',
        contributions: '',
        employerMatch: '',
        gains: '',
        fees: '',
        withdrawals: ''
      }));
      setLiquidAssetsInputs(inputsWithEmptyFinancialData);
    }
  };

  // Wrapper to avoid naming conflict with state setter
  // Excludes all financial data from persistence - only saves account setup fields
  const saveLiquidAssetsInputsToStorage = (inputs) => {
    // Remove all financial data fields before saving to localStorage
    const inputsWithoutFinancialData = inputs.map(input => {
      const { amount, contributions, employerMatch, gains, fees, withdrawals, ...inputWithoutFinancialData } = input;
      return inputWithoutFinancialData;
    });
    
    const result = saveLiquidAssetsInputsToLocalStorage(inputsWithoutFinancialData);
    return result;
  };

  const loadCurrentYearData = (forceReloadAccounts = false) => {
    const currentYear = new Date().getFullYear();
    const annualData = getAnnualData();
    const paycheckData = getPaycheckData();
    
    
    // Get users from paycheck data
    const userList = [];
    if (paycheckData?.your?.name?.trim()) {
      userList.push(paycheckData.your.name.trim());
    }
    if (paycheckData?.spouse?.name?.trim() && (paycheckData?.settings?.showSpouseCalculator ?? true)) {
      userList.push(paycheckData.spouse.name.trim());
    }
    
    // Get all existing users from annual data for the current year
    const existingUsers = Object.keys(annualData[currentYear]?.users || {});
    
    // Combine paycheck users with historical users and remove duplicates
    const allUsers = [...new Set([...userList, ...existingUsers])];
    
    // If still no users, create default
    if (allUsers.length === 0) {
      allUsers.push('User'); // Default user name
    }
    
    // Add "Joint" as an additional owner option at the END (so individual users are first)
    const ownerOptions = [...allUsers];
    if (!ownerOptions.includes('Joint')) {
      ownerOptions.push('Joint');
    }
    
    // Ensure Joint is at the end, not first (for better UX when defaulting to users[0])
    const jointIndex = ownerOptions.indexOf('Joint');
    if (jointIndex !== -1 && jointIndex !== ownerOptions.length - 1) {
      // Move Joint to end
      ownerOptions.splice(jointIndex, 1);
      ownerOptions.push('Joint');
    }
    
    
    setUsers(ownerOptions);
    setCurrentYearData(annualData[currentYear] || { users: {} });
    
    // Only auto-populate portfolio inputs from shared accounts when explicitly forced
    // Don't auto-populate on initial load to keep form clean for new entries
    if (forceReloadAccounts) {
      const sharedAccounts = getSharedAccounts();
      
      // Convert shared accounts to portfolio inputs, maintaining Portfolio as master
      const allAccounts = sharedAccounts.map(account => {
        // For accounts without tax type (from Accounts), infer based on account type
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
          } else if (account.accountType === 'Cash') {
            taxType = 'Cash';
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
          contributions: '',
          employerMatch: '',
          gains: '',
          fees: '',
          withdrawals: '',
          source: account.source,
          // Show which systems this account appears in
          sources: account.sources || [account.source]
        };
      });
      
      if (allAccounts.length > 0) {
        setLiquidAssetsInputs(allAccounts);
      } else {
        // If no stored accounts, initialize with empty form
        setLiquidAssetsInputs([{
          id: generateUniqueId(),
          taxType: '',
          amount: '',
          accountType: '',
          owner: ownerOptions[0] || 'User',
          investmentCompany: '',
          description: '',
          contributions: '',
          employerMatch: '',
          gains: '',
          fees: '',
          withdrawals: ''
        }]);
      }
    } else {
      // Load saved account setup fields, but keep financial data empty
      const savedInputs = getLiquidAssetsInputs();
      if (savedInputs.length > 0) {
        // Load account setup fields but always start with empty financial data
        const inputsWithEmptyFinancialData = savedInputs.map(input => ({
          id: input.id || generateUniqueId(),
          owner: input.owner || ownerOptions[0] || 'User',
          taxType: input.taxType || '',
          accountType: input.accountType || '',
          investmentCompany: input.investmentCompany || '',
          description: input.description || '',
          // Financial data always starts empty - never persisted
          amount: '',
          contributions: '',
          employerMatch: '',
          gains: '',
          fees: '',
          withdrawals: ''
        }));
        setLiquidAssetsInputs(inputsWithEmptyFinancialData);
      } else if (liquidAssetsInputs.length === 0) {
        // Initialize with empty form on first load
        setLiquidAssetsInputs([{
          id: generateUniqueId(),
          taxType: '',
          amount: '',
          accountType: '',
          owner: ownerOptions[0] || 'User',
          investmentCompany: '',
          description: '',
          contributions: '',
          employerMatch: '',
          gains: '',
          fees: '',
          withdrawals: ''
        }]);
      }
    }
  };

  const validateInputs = () => {
    const newErrors = {};
    let hasErrors = false;

    liquidAssetsInputs.forEach((input, index) => {
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

      // Validate optional financial fields when expanded fields are shown
      if (showExpandedFields) {
        ['contributions', 'employerMatch', 'gains', 'fees', 'withdrawals'].forEach(field => {
          if (input[field] && input[field] !== '' && isNaN(parseFloat(input[field]))) {
            inputErrors[field] = 'Must be a valid number';
            hasErrors = true;
          }
        });
      }

      if (Object.keys(inputErrors).length > 0) {
        newErrors[index] = inputErrors;
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  };

  const handleInputChange = (index, field, value) => {
    const updatedInputs = [...liquidAssetsInputs];
    updatedInputs[index] = {
      ...updatedInputs[index],
      [field]: value
    };
    
    // Auto-set tax type for special account types
    if (field === 'accountType') {
      if (value === 'HSA' || value === 'ESPP') {
        updatedInputs[index].taxType = 'After-Tax'; // Default for special accounts
      } else if (value === 'Cash') {
        updatedInputs[index].taxType = 'Cash'; // Default for cash accounts
      }
    }
    
    setLiquidAssetsInputs(updatedInputs);
    
    // Save account setup fields when non-financial fields change
    if (['owner', 'taxType', 'accountType', 'investmentCompany', 'description'].includes(field)) {
      saveLiquidAssetsInputsToStorage(updatedInputs);
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
    if (window.confirm('Are you sure you want to delete this liquid assets record? This action cannot be undone.')) {
      deleteLiquidAssetsRecord(recordId);
      loadLiquidAssetsRecords(); // Refresh the records list
      setSuccessMessage('Liquid Assets record deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const addLiquidAssetsInput = () => {
    const newInputs = [...liquidAssetsInputs, {
      id: generateUniqueId(),
      taxType: '',
      amount: '',
      accountType: '',
      owner: users[0] || 'User',
      investmentCompany: '',
      description: '',
      contributions: '',
      employerMatch: '',
      gains: '',
      fees: '',
      withdrawals: ''
    }];
    setLiquidAssetsInputs(newInputs);
    // Save account setup fields when adding accounts
    saveLiquidAssetsInputsToStorage(newInputs);
  };

  const removeLiquidAssetsInput = (index) => {
    if (liquidAssetsInputs.length > 1) {
      const accountToRemove = liquidAssetsInputs[index];
      
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
      }
      
      const updatedInputs = liquidAssetsInputs.filter((_, i) => i !== index);
      setLiquidAssetsInputs(updatedInputs);
      // Save account setup fields when removing accounts
      saveLiquidAssetsInputsToStorage(updatedInputs);
      
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

  const updateAnnualData = () => {
    const validationResult = validateInputs();
    
    if (!validationResult) {
      return;
    }
    try {
      const currentYear = new Date().getFullYear();
      const annualData = getAnnualData();
      
      // Calculate new totals from liquid assets inputs
      const newAmounts = liquidAssetsInputs.reduce((acc, input) => {
        const amount = parseFloat(input.amount) || 0;
        
        // Use account type first for special accounts, then fall back to tax type
        if (input.accountType === 'ESPP') {
          acc.espp += amount;
        } else if (input.accountType === 'HSA') {
          acc.hsa += amount;
        } else if (input.accountType === 'Cash') {
          acc.cash += amount;
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
            case 'Cash':
              acc.cash += amount;
              break;
          }
        }
        
        return acc;
      }, {
        taxFree: 0,
        taxDeferred: 0,
        brokerage: 0,
        espp: 0,
        hsa: 0,
        cash: 0
      });

      // Use new amounts directly
      const totals = newAmounts;

      // Update current year entry
      if (!annualData[currentYear]) {
        annualData[currentYear] = { users: {} };
      }

      
      // Calculate new amounts by owner from liquid assets inputs
      const newAmountsByOwner = liquidAssetsInputs.reduce((acc, input) => {
        const amount = parseFloat(input.amount) || 0;
        const owner = input.owner;
        
        if (!acc[owner]) {
          acc[owner] = {
            taxFree: 0,
            taxDeferred: 0,
            brokerage: 0,
            espp: 0,
            hsa: 0,
            cash: 0
          };
        }
        
        // Use account type first for special accounts, then fall back to tax type
        if (input.accountType === 'ESPP') {
          acc[owner].espp += amount;
        } else if (input.accountType === 'HSA') {
          acc[owner].hsa += amount;
        } else if (input.accountType === 'Cash') {
          acc[owner].cash += amount;
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
            case 'Cash':
              acc[owner].cash += amount;
              break;
          }
        }
        
        return acc;
      }, {});
      
      // Use new amounts by owner directly
      const totalsByOwner = newAmountsByOwner;
      


      // Update root-level investment data (this is how annual data is structured)
      annualData[currentYear].taxFree = totals.taxFree;
      annualData[currentYear].taxDeferred = totals.taxDeferred;
      annualData[currentYear].brokerage = totals.brokerage;
      annualData[currentYear].espp = totals.espp;
      annualData[currentYear].hsa = totals.hsa;
      annualData[currentYear].cash = totals.cash;
      

      // Also store individual owner data in users object for reference
      Object.entries(totalsByOwner).forEach(([ownerName, ownerTotals]) => {
        if (!annualData[currentYear].users[ownerName]) {
          annualData[currentYear].users[ownerName] = {};
        }
        
        const userData = annualData[currentYear].users[ownerName];
        
        // Update investment fields with owner-specific totals for reference
        userData.taxFree = ownerTotals.taxFree;
        userData.taxDeferred = ownerTotals.taxDeferred;
        userData.brokerage = ownerTotals.brokerage;
        userData.espp = ownerTotals.espp;
        userData.hsa = ownerTotals.hsa;
        userData.cash = ownerTotals.cash;
        
      });
      
      
      // Save updated annual data
      const saveResult = setAnnualData(annualData);
      
      if (saveResult) {
        const updateTypeText = showExpandedFields ? 'detailed' : 'balance-only';
        setSuccessMessage(`Successfully updated ${currentYear} investment data! (${updateTypeText} sync to Accounts)`);
        setCurrentYearData(annualData[currentYear]);
        
        // Scroll to top to show success message
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
        
        // Clear existing liquid assets accounts from shared system and add current ones
        // This ensures that deleted accounts don't persist
        const sharedAccounts = getSharedAccounts();
        const nonLiquidAssetsAccounts = sharedAccounts.filter(acc => acc.source !== 'liquidAssets');
        
        // Add current liquid assets inputs to shared system
        const updatedSharedAccounts = [...nonLiquidAssetsAccounts];
        liquidAssetsInputs.forEach(input => {
          // Generate account name from structured data
          const generatedAccountName = generateAccountName(
            input.owner,
            input.taxType,
            input.accountType,
            input.investmentCompany,
            input.description
          );
          
          if (generatedAccountName) {
            // Save to old Liquid Assets system for backward compatibility
            addLiquidAssetsAccount(generatedAccountName, input.taxType, input.accountType, input.owner);
            
            // Add to updated shared accounts list
            const newSharedAccount = {
              id: generateUniqueId(),
              accountName: generatedAccountName,
              owner: input.owner,
              accountType: input.accountType,
              investmentCompany: input.investmentCompany || '',
              taxType: input.taxType,
              source: 'liquidAssets',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              sources: ['liquidAssets']
            };
            updatedSharedAccounts.push(newSharedAccount);
          }
        });
        
        // Update shared accounts with only current liquid assets state
        setSharedAccounts(updatedSharedAccounts);
        
        // Prepare liquid assets data with generated account names for all operations
        const liquidAssetsDataWithNames = liquidAssetsInputs.map(input => ({
          ...input,
          accountName: generateAccountName(
            input.owner,
            input.taxType,
            input.accountType,
            input.investmentCompany,
            input.description
          )
        }));
        
        
        // Add liquid assets record with current date (with generated names)
        const updateType = showExpandedFields ? 'detailed' : 'balance-only';
        addLiquidAssetsRecord(liquidAssetsDataWithNames, null, updateType);
        
        // Automatically sync liquid assets balances to accounts (background sync)
        try {
          syncLiquidAssetsBalanceToAccounts(liquidAssetsDataWithNames, updateType);
          syncAccountsFromLatestLiquidAssets();
        } catch (syncError) {
          console.error('Error during sync operations:', syncError);
          // Continue with other operations even if sync fails
        }
        
        // Repopulate liquid assets inputs with all available accounts (including from Accounts)
        try {
          loadCurrentYearData(true); // Force reload accounts from both sources after update
        } catch (loadError) {
          console.error('❌ Error loading current year data:', loadError);
        }
        
        // Clear any validation errors
        setErrors({});
        
        // Refresh records
        try {
          loadLiquidAssetsRecords();
        } catch (recordsError) {
          console.error('Error loading liquid assets records:', recordsError);
        }
        
      } else {
        alert('Failed to save annual data. Please try again.');
      }
      
    } catch (error) {
      console.error('Error updating annual data:', error);
      alert('Error updating annual data. Please try again.');
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

  // Helper functions for managing collapsed state
  const toggleAccountCollapse = (accountId) => {
    setCollapsedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  const collapseAllAccounts = () => {
    const allIds = new Set(liquidAssetsInputs.map(input => input.id));
    setCollapsedAccounts(allIds);
  };

  const expandAllAccounts = () => {
    setCollapsedAccounts(new Set());
  };

  const handleSyncSettingChange = (setting, value) => {
    const newSettings = { ...syncSettings, [setting]: value };
    setSyncSettings(newSettings);
    setAccountSyncSettings(newSettings);
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

  const handleUpdateGroupAccountReference = (groupId, accountName) => {
    updateManualAccountGroup(groupId, { accountName });
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

  const handleAddToGroup = (groupId, liquidAssetsAccountId) => {
    if (!liquidAssetsAccountId) return;
    
    addAccountToManualGroup(groupId, liquidAssetsAccountId);
    loadManualGroups();
    
    const account = liquidAssetsInputs.find(acc => acc.id === liquidAssetsAccountId);
    const group = manualGroups[groupId];
    setSuccessMessage(`Added ${account?.accountName || 'account'} to ${group?.name || 'group'}`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleRemoveFromGroup = (groupId, liquidAssetsAccountId) => {
    removeAccountFromManualGroup(groupId, liquidAssetsAccountId);
    loadManualGroups();
    
    const account = liquidAssetsInputs.find(acc => acc.id === liquidAssetsAccountId);
    setSuccessMessage(`Removed ${account?.accountName || 'account'} from group`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // CSV Helper Functions for the reusable component
  const getCSVHeaders = () => {
    if (showExpandedFields) {
      return ['owner', 'taxType', 'accountType', 'investmentCompany', 'description', 'amount', 'contributions', 'employerMatch', 'gains', 'fees', 'withdrawals', 'updateDate'];
    } else {
      return ['owner', 'taxType', 'accountType', 'investmentCompany', 'description', 'amount', 'updateDate'];
    }
  };

  const formatCSVRow = (input) => {
    const currentDate = new Date().toISOString().split('T')[0];
    if (showExpandedFields) {
      return [
        input.owner || '',
        input.taxType || '',
        input.accountType || '',
        input.investmentCompany || '',
        input.description || '',
        input.amount || '',
        input.contributions || '',
        input.employerMatch || '',
        input.gains || '',
        input.fees || '',
        input.withdrawals || '',
        input.updateDate || currentDate
      ];
    } else {
      return [
        input.owner || '',
        input.taxType || '',
        input.accountType || '',
        input.investmentCompany || '',
        input.description || '',
        input.amount || '',
        input.updateDate || currentDate
      ];
    }
  };

  const parseCSVRow = (row) => {
    const owner = row.owner || '';
    const taxType = row.taxType || '';
    const accountType = row.accountType || '';
    const investmentCompany = row.investmentCompany || '';
    const description = row.description || '';
    const amount = row.amount || '';
    const contributions = row.contributions || '';
    const employerMatch = row.employerMatch || '';
    const gains = row.gains || '';
    const fees = row.fees || '';
    const withdrawals = row.withdrawals || '';
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
      contributions: contributions ? contributions.toString().trim() : '',
      employerMatch: employerMatch ? employerMatch.toString().trim() : '',
      gains: gains ? gains.toString().trim() : '',
      fees: fees ? fees.toString().trim() : '',
      withdrawals: withdrawals ? withdrawals.toString().trim() : '',
      updateDate: updateDate ? updateDate.trim() : new Date().toISOString().split('T')[0]
    };
  };

  const generateTemplateData = () => {
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const baseData = [
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

    if (showExpandedFields) {
      return baseData.map(item => ({
        ...item,
        contributions: '5000.00',
        employerMatch: '2500.00',
        gains: '3000.00',
        fees: '50.00',
        withdrawals: '0.00'
      }));
    }

    return baseData;
  };

  const handleCSVImportSuccess = (parsed) => {
    // Replace current liquid assets inputs with CSV data
    setLiquidAssetsInputs(parsed);
    
    // Explicitly save to localStorage after CSV import to ensure persistence
    if (parsed.length > 0) {
      try {
        const saveResult = saveLiquidAssetsInputsToStorage(parsed);
      } catch (error) {
        // Handle save error silently
      }
    }
    
    // Add liquid assets records for each unique update date in the CSV
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
      const importSyncMode = showExpandedFields ? 'detailed' : 'balance-only';
      addLiquidAssetsRecord(accounts, date, importSyncMode);
    });
    
    // Refresh records display
    loadLiquidAssetsRecords();
    
    // Clear any existing errors
    setErrors({});
    
    alert(`Successfully imported ${parsed.length} accounts from CSV`);
    if (Object.keys(dateGroups).length > 1) {
      alert(`Created ${Object.keys(dateGroups).length} liquid assets records for different update dates.`);
    }
  };

  const handleCSVImportError = (error) => {
    alert(`Error importing CSV: ${error.message}`);
  };

  const getCurrentLiquidAssetsData = () => {
    const currentDate = new Date().toISOString().split('T')[0];
    // Add updateDate to current liquid assets inputs
    return liquidAssetsInputs.map(input => ({
      ...input,
      updateDate: currentDate
    }));
  };

  const handleResetLiquidAssetsData = () => {
    if (window.confirm('Are you sure you want to reset all liquid assets data? This cannot be undone.')) {
      // Reset all liquid assets component state
      setLiquidAssetsInputs([{
        id: generateUniqueId(),
        owner: users[0] || 'User',
        taxType: '',
        accountType: '',
        investmentCompany: '',
        amount: '',
        description: '',
        contributions: '',
        employerMatch: '',
        gains: '',
        fees: '',
        withdrawals: ''
      }]);
      setCurrentYearData({});
            setLiquidAssetsRecords([]);
      setErrors({});
      setSuccessMessage('');
            setShowRecords(false);
      setCollapsedAccounts(new Set());
      
      // Clear localStorage data related to liquid assets
      const currentYear = new Date().getFullYear();
      const annualData = getAnnualData();
      if (annualData[currentYear]) {
        // Reset investment fields to 0
        annualData[currentYear].taxFree = 0;
        annualData[currentYear].taxDeferred = 0;
        annualData[currentYear].brokerage = 0;
        annualData[currentYear].espp = 0;
        annualData[currentYear].hsa = 0;
        
        // Reset user investment data
        Object.keys(annualData[currentYear].users || {}).forEach(userName => {
          if (annualData[currentYear].users[userName]) {
            annualData[currentYear].users[userName].taxFree = 0;
            annualData[currentYear].users[userName].taxDeferred = 0;
            annualData[currentYear].users[userName].brokerage = 0;
            annualData[currentYear].users[userName].espp = 0;
            annualData[currentYear].users[userName].hsa = 0;
          }
        });
        
        setAnnualData(annualData);
      }
      
      // Also clear shared accounts, manual groups, and liquid assets inputs
      clearSharedAccounts();
      clearManualAccountGroups();
      clearLiquidAssetsInputs();
      localStorage.removeItem('liquidAssetsCollapsedAccounts');
      
      alert('Liquid Assets data has been reset successfully.');
    }
  };

  const downloadLiquidAssetsRecordsCSV = () => {
    if (liquidAssetsRecords.length === 0) {
      alert('No liquid assets records to export.');
      return;
    }

    const headers = getCSVHeaders();
    const allAccounts = [];
    
    // Flatten all accounts from all records
    liquidAssetsRecords.forEach(record => {
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
    link.download = generateDataFilename('liquidAssets_all_records', users.filter(u => u !== 'Joint'), 'csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getCurrentTotals = () => {
    return liquidAssetsInputs.reduce((acc, input) => {
      const amount = parseFloat(input.amount) || 0;
      
      // Use account type first for special accounts, then fall back to tax type
      if (input.accountType === 'ESPP') {
        acc.espp += amount;
      } else if (input.accountType === 'HSA') {
        acc.hsa += amount;
      } else if (input.accountType === 'Cash') {
        acc.cash += amount;
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
          case 'Cash':
            acc.cash += amount;
            break;
        }
      }
      
      return acc;
    }, {
      taxFree: 0,
      taxDeferred: 0,
      brokerage: 0,
      hsa: 0,
      espp: 0,
      cash: 0
    });
  };

  const currentTotals = getCurrentTotals();
  const currentYear = new Date().getFullYear();

  return (
    <>
      <Navigation />
      <div className="app-container">
        <div className="header">
          <h1>📈 Liquid Assets Data Update</h1>
          <p>Input current liquid assets values to update {currentYear} annual data</p>
        </div>

        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}


        {/* Manual Account Grouping Section */}
        <div className="manual-grouping-section" style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f0f8ff', borderRadius: '8px', border: '1px solid #cce7ff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#495057' }}>📋 Manual Account Grouping</h3>
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
                Group liquid assets accounts together to sync their combined balance with specific Accounts accounts. 
                This gives you full control over which accounts are combined.
              </p>
              
              {Object.entries(manualGroups).map(([groupId, group]) => {
                const ungroupedAccounts = getUngroupedLiquidAssetsAccounts(liquidAssetsInputs);
                const unusedAccounts = getUnusedAccounts();
                const groupBalance = calculateManualGroupBalance(groupId, liquidAssetsInputs);
                
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
                          Sync to Accounts Account:
                        </label>
                        <select 
                          value={group.accountName || ''}
                          onChange={(e) => handleUpdateGroupAccountReference(groupId, e.target.value)}
                          style={{ 
                            width: '100%', 
                            padding: '0.5rem', 
                            border: '1px solid #ced4da', 
                            borderRadius: '4px' 
                          }}
                        >
                          <option value="">Select Accounts Account</option>
                          {/* Show unused accounts */}
                          {unusedAccounts.map(acc => (
                            <option key={acc.id} value={acc.accountName}>
                              {acc.accountName} ({acc.owner}){!acc.isCurrentYear ? ` - ${acc.year}` : ''}
                            </option>
                          ))}
                          {/* Also show the currently selected account for this group (if any) */}
                          {group.accountName && !unusedAccounts.find(acc => acc.accountName === group.accountName) && (
                            <option key={`current-${groupId}`} value={group.accountName}>
                              {group.accountName} (Currently Selected)
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
                        Liquid Assets Accounts in Group ({(group.liquidAssetsAccounts || []).length}):
                      </h4>
                      
                      {(!group.liquidAssetsAccounts || group.liquidAssetsAccounts.length === 0) ? (
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
                          {(group.liquidAssetsAccounts || []).map(accountId => {
                            const account = liquidAssetsInputs.find(acc => acc.id === accountId);
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
                          <option value="">+ Add Liquid Assets Account to Group</option>
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
                    Create groups to combine multiple portfolio accounts and sync them to specific Accounts accounts
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

        {/* Liquid Assets Accounts Table */}
        <div className="liquid-assets-accounts">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2>Liquid Assets Account Values</h2>
              <p>Enter your current account values from investment websites:</p>
              {showExpandedFields ? (
                <p style={{ fontSize: '0.9rem', color: '#28a745', margin: '0.5rem 0' }}>
                  📊 <strong>Detailed Update Mode:</strong> Will sync balance + employee contributions, employer match, gains/losses, fees, and withdrawals
                </p>
              ) : (
                <p style={{ fontSize: '0.9rem', color: '#007bff', margin: '0.5rem 0' }}>
                  ⚡ <strong>Balance Only Mode:</strong> Will sync only account balances (preserves existing detailed data)
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button 
                type="button" 
                onClick={() => setShowExpandedFields(!showExpandedFields)}
                className="btn-secondary"
                style={{ height: 'fit-content' }}
              >
                {showExpandedFields ? '⚡ Switch to Balance Only' : '📊 Switch to Detailed Update'}
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          {liquidAssetsInputs.length > 1 && (
            <div className="bulk-actions" style={{
              padding: '0.75rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              marginBottom: '1rem',
              border: '1px solid #dee2e6'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#495057' }}>
                  📁 Bulk Actions:
                </span>
                <button 
                  type="button" 
                  onClick={collapseAllAccounts}
                  className="btn-tertiary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  📌 Collapse All Setup Fields
                </button>
                <button 
                  type="button" 
                  onClick={expandAllAccounts}
                  className="btn-tertiary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  📋 Expand All Setup Fields
                </button>
                <span style={{ fontSize: '0.8rem', color: '#6c757d', marginLeft: 'auto' }}>
                  {collapsedAccounts.size} of {liquidAssetsInputs.length} accounts collapsed
                </span>
              </div>
            </div>
          )}
          
          <div className="accounts-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {liquidAssetsInputs.map((input, index) => {
              const isCollapsed = collapsedAccounts.has(input.id);
              const accountName = generateAccountName(input.owner, input.taxType, input.accountType, input.investmentCompany, input.description);
              
              return (
                <div key={input.id} className="account-row" style={{
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '0.5rem',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                  {/* Main Account Row - Account Name + Financial Data */}
                  <div className="account-main-row" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    minHeight: '2.5rem'
                  }}>
                    {/* Left: Account Info */}
                    <div className="account-info" style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      minWidth: '300px'
                    }}>
                      <button 
                        type="button" 
                        onClick={() => toggleAccountCollapse(input.id)}
                        className="btn-tertiary"
                        style={{ 
                          fontSize: '0.8rem', 
                          padding: '0.2rem 0.4rem',
                          minWidth: 'auto',
                          background: isCollapsed ? '#e7f3ff' : '#f8f9fa',
                          border: `1px solid ${isCollapsed ? '#007bff' : '#dee2e6'}`,
                          flexShrink: 0
                        }}
                        title={isCollapsed ? 'Expand setup fields' : 'Collapse setup fields'}
                      >
                        {isCollapsed ? '👁️' : '📋'}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontSize: '0.9rem',
                          fontWeight: 'bold',
                          color: '#333',
                          fontStyle: accountName ? 'normal' : 'italic',
                          wordWrap: 'break-word',
                          lineHeight: '1.2'
                        }}>
                          {accountName || 'Complete setup fields →'}
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeLiquidAssetsInput(index)}
                        className="btn-delete"
                        disabled={liquidAssetsInputs.length === 1}
                        title="Delete account"
                        style={{ fontSize: '0.8rem', padding: '0.2rem 0.4rem', flexShrink: 0 }}
                      >
                        🗑️
                      </button>
                    </div>

                    {/* Right: Financial Data */}
                    <div className="financial-data" style={{ 
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      backgroundColor: '#f8fbff',
                      padding: '0.5rem',
                      borderRadius: '3px',
                      border: '1px solid #e3f2fd'
                    }}>
                      {/* Balance - Always Visible */}
                      <div className="balance-field" style={{ flex: '0 0 140px' }}>
                        <label style={{ 
                          display: 'block', 
                          fontSize: '0.7rem', 
                          fontWeight: 'bold', 
                          marginBottom: '0.1rem', 
                          color: '#007bff' 
                        }}>
                          Balance *
                        </label>
                        <input
                          type="number"
                          value={input.amount || ''}
                          onChange={(e) => handleInputChange(index, 'amount', e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className={errors[index]?.amount ? 'error' : ''}
                          style={{ 
                            width: '100%', 
                            padding: '0.4rem', 
                            border: '1px solid #007bff', 
                            borderRadius: '3px', 
                            textAlign: 'right',
                            fontSize: '0.9rem',
                            fontWeight: 'bold'
                          }}
                        />
                        {errors[index]?.amount && <div style={{ fontSize: '0.6rem', color: '#dc3545', marginTop: '0.1rem' }}>{errors[index].amount}</div>}
                      </div>

                      {/* Expanded Fields - Only in Detailed Mode */}
                      {showExpandedFields && (
                        <>
                          <div className="financial-field" style={{ flex: '0 0 110px' }}>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '0.65rem', 
                              fontWeight: 'bold', 
                              marginBottom: '0.1rem', 
                              color: '#28a745' 
                            }}>
                              Employee Contributions
                            </label>
                            <input
                              type="number"
                              value={input.contributions || ''}
                              onChange={(e) => handleInputChange(index, 'contributions', e.target.value)}
                              placeholder="0.00"
                              step="0.01"
                              className={errors[index]?.contributions ? 'error' : ''}
                              style={{ 
                                width: '100%', 
                                padding: '0.3rem', 
                                border: '1px solid #28a745', 
                                borderRadius: '3px', 
                                textAlign: 'right',
                                fontSize: '0.8rem'
                              }}
                            />
                          </div>

                          <div className="financial-field" style={{ flex: '0 0 100px' }}>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '0.65rem', 
                              fontWeight: 'bold', 
                              marginBottom: '0.1rem', 
                              color: '#28a745' 
                            }}>
                              Match
                            </label>
                            <input
                              type="number"
                              value={input.employerMatch || ''}
                              onChange={(e) => handleInputChange(index, 'employerMatch', e.target.value)}
                              placeholder="0.00"
                              step="0.01"
                              className={errors[index]?.employerMatch ? 'error' : ''}
                              style={{ 
                                width: '100%', 
                                padding: '0.3rem', 
                                border: '1px solid #28a745', 
                                borderRadius: '3px', 
                                textAlign: 'right',
                                fontSize: '0.8rem'
                              }}
                            />
                          </div>

                          <div className="financial-field" style={{ flex: '0 0 100px' }}>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '0.65rem', 
                              fontWeight: 'bold', 
                              marginBottom: '0.1rem', 
                              color: '#17a2b8' 
                            }}>
                              Gains/Loss
                            </label>
                            <input
                              type="number"
                              value={input.gains || ''}
                              onChange={(e) => handleInputChange(index, 'gains', e.target.value)}
                              placeholder="0.00"
                              step="0.01"
                              className={errors[index]?.gains ? 'error' : ''}
                              style={{ 
                                width: '100%', 
                                padding: '0.3rem', 
                                border: '1px solid #17a2b8', 
                                borderRadius: '3px', 
                                textAlign: 'right',
                                fontSize: '0.8rem'
                              }}
                            />
                          </div>

                          <div className="financial-field" style={{ flex: '0 0 80px' }}>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '0.65rem', 
                              fontWeight: 'bold', 
                              marginBottom: '0.1rem', 
                              color: '#dc3545' 
                            }}>
                              Fees
                            </label>
                            <input
                              type="number"
                              value={input.fees || ''}
                              onChange={(e) => handleInputChange(index, 'fees', e.target.value)}
                              placeholder="0.00"
                              step="0.01"
                              className={errors[index]?.fees ? 'error' : ''}
                              style={{ 
                                width: '100%', 
                                padding: '0.3rem', 
                                border: '1px solid #dc3545', 
                                borderRadius: '3px', 
                                textAlign: 'right',
                                fontSize: '0.8rem'
                              }}
                            />
                          </div>

                          <div className="financial-field" style={{ flex: '0 0 100px' }}>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '0.65rem', 
                              fontWeight: 'bold', 
                              marginBottom: '0.1rem', 
                              color: '#fd7e14' 
                            }}>
                              Withdrawals
                            </label>
                            <input
                              type="number"
                              value={input.withdrawals || ''}
                              onChange={(e) => handleInputChange(index, 'withdrawals', e.target.value)}
                              placeholder="0.00"
                              step="0.01"
                              className={errors[index]?.withdrawals ? 'error' : ''}
                              style={{ 
                                width: '100%', 
                                padding: '0.3rem', 
                                border: '1px solid #fd7e14', 
                                borderRadius: '3px', 
                                textAlign: 'right',
                                fontSize: '0.8rem'
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Collapsible Setup Fields */}
                  {!isCollapsed && (
                    <div className="setup-fields" style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '3px',
                      border: '1px solid #e9ecef'
                    }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                        gap: '0.5rem',
                        alignItems: 'end'
                      }}>
                        <div className="field-group-small">
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.1rem', color: '#495057' }}>
                            Owner *
                          </label>
                          <select
                            value={input.owner}
                            onChange={(e) => handleInputChange(index, 'owner', e.target.value)}
                            className={errors[index]?.owner ? 'error' : ''}
                            style={{ width: '100%', padding: '0.3rem', border: '1px solid #ced4da', borderRadius: '3px', fontSize: '0.8rem' }}
                          >
                            {users.map(user => (
                              <option key={user} value={user}>{user}</option>
                            ))}
                          </select>
                          {errors[index]?.owner && <div style={{ fontSize: '0.6rem', color: '#dc3545', marginTop: '0.05rem' }}>{errors[index].owner}</div>}
                        </div>

                        <div className="field-group-small">
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.1rem', color: '#495057' }}>
                            Tax Type *
                          </label>
                          <select
                            value={input.taxType}
                            onChange={(e) => handleInputChange(index, 'taxType', e.target.value)}
                            className={errors[index]?.taxType ? 'error' : ''}
                            style={{ width: '100%', padding: '0.3rem', border: '1px solid #ced4da', borderRadius: '3px', fontSize: '0.8rem' }}
                          >
                            <option value="">Select</option>
                            {TAX_TYPES.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                          {errors[index]?.taxType && <div style={{ fontSize: '0.6rem', color: '#dc3545', marginTop: '0.05rem' }}>{errors[index].taxType}</div>}
                        </div>

                        <div className="field-group-small">
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.1rem', color: '#495057' }}>
                            Account Type *
                          </label>
                          <select
                            value={input.accountType}
                            onChange={(e) => handleInputChange(index, 'accountType', e.target.value)}
                            className={errors[index]?.accountType ? 'error' : ''}
                            style={{ width: '100%', padding: '0.3rem', border: '1px solid #ced4da', borderRadius: '3px', fontSize: '0.8rem' }}
                          >
                            <option value="">Select</option>
                            {ACCOUNT_TYPES.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                          {errors[index]?.accountType && <div style={{ fontSize: '0.6rem', color: '#dc3545', marginTop: '0.05rem' }}>{errors[index].accountType}</div>}
                        </div>

                        <div className="field-group-small">
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.1rem', color: '#495057' }}>
                            Company *
                          </label>
                          <input
                            type="text"
                            value={input.investmentCompany || ''}
                            onChange={(e) => handleInputChange(index, 'investmentCompany', e.target.value)}
                            placeholder="Fidelity"
                            className={errors[index]?.investmentCompany ? 'error' : ''}
                            style={{ width: '100%', padding: '0.3rem', border: '1px solid #ced4da', borderRadius: '3px', fontSize: '0.8rem' }}
                          />
                          {errors[index]?.investmentCompany && <div style={{ fontSize: '0.6rem', color: '#dc3545', marginTop: '0.05rem' }}>{errors[index].investmentCompany}</div>}
                        </div>

                        <div className="field-group-small">
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.1rem', color: '#495057' }}>
                            Description
                          </label>
                          <input
                            type="text"
                            value={input.description || ''}
                            onChange={(e) => handleInputChange(index, 'description', e.target.value)}
                            placeholder="Optional"
                            style={{ width: '100%', padding: '0.3rem', border: '1px solid #ced4da', borderRadius: '3px', fontSize: '0.8rem' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="form-actions">
            <button type="button" onClick={addLiquidAssetsInput} className="btn-secondary">
              + Add Another Account
            </button>
            <button type="button" onClick={updateAnnualData} className="btn-primary">
              {showExpandedFields ? 'Update Accounts Data (Detailed)' : 'Update Accounts Data (Balance Only)'}
            </button>
          </div>


          {/* CSV Import/Export Section */}
          <CSVImportExport
            title="CSV Import/Export"
            subtitle="Import account data from a CSV file or download the current data as CSV."
            data={getCurrentLiquidAssetsData()}
            headers={getCSVHeaders()}
            formatRowData={formatCSVRow}
            parseRowData={parseCSVRow}
            onImportSuccess={handleCSVImportSuccess}
            onImportError={handleCSVImportError}
            generateTemplate={generateTemplateData}
            compact={true}
            dataType="liquidAssets_current"
            userNames={users.filter(u => u !== 'Joint')}
            showResetButton={true}
            onReset={handleResetLiquidAssetsData}
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
                  <h3>📊 Total Liquid Assets</h3>
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



        {/* Liquid Assets Records */}
        {liquidAssetsRecords.length > 0 && (
          <div className="liquid-assets-records-section">
            <div className="liquid-assets-records-header">
              <h2>📋 Liquid Assets Records</h2>
              <div className="liquid-assets-records-controls">
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
                  {showRecords ? 'Hide Records' : `Show All Records (${liquidAssetsRecords.length})`}
                </button>
              </div>
            </div>
            
            {showRecords && (
              <div className="liquid-assets-records-list">
                {liquidAssetsRecords
                  .sort((a, b) => {
                    if (sortRecordsNewestFirst) {
                      return new Date(b.updateDate) - new Date(a.updateDate);
                    } else {
                      return new Date(a.updateDate) - new Date(b.updateDate);
                    }
                  })
                  .map(record => (
                  <div key={record.id} className="liquid-assets-record">
                    <div className="record-header">
                      <div className="record-date">
                        <strong>{record.updateDate}</strong>
                        <span className="record-details">
                          {record.accountsCount} accounts • {formatCurrency(record.totalAmount)} total
                          {record.syncMode && (
                            <span className={`sync-mode-badge ${record.syncMode === 'detailed' ? 'detailed' : 'balance-only'}`}>
                              {record.syncMode === 'detailed' ? '📊 Detailed' : '⚡ Balance Only'}
                            </span>
                          )}
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
                            <div className="account-main-info">
                              <strong>{acc.accountName}</strong> ({acc.owner}) - {acc.taxType} - {formatCurrency(acc.amount)}
                              {acc.investmentCompany && <span className="account-company"> • {acc.investmentCompany}</span>}
                              {acc.description && <span className="account-description"> • {acc.description}</span>}
                            </div>
                            {record.syncMode === 'detailed' && (acc.contributions || acc.employerMatch || acc.gains || acc.fees || acc.withdrawals) && (
                              <div className="account-detailed-info">
                                {acc.contributions && <span>Contributions: {formatCurrency(acc.contributions)}</span>}
                                {acc.employerMatch && <span>Match: {formatCurrency(acc.employerMatch)}</span>}
                                {acc.gains && <span>Gains: {formatCurrency(acc.gains)}</span>}
                                {acc.fees && <span>Fees: {formatCurrency(acc.fees)}</span>}
                                {acc.withdrawals && <span>Withdrawals: {formatCurrency(acc.withdrawals)}</span>}
                              </div>
                            )}
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
                    onClick={() => downloadLiquidAssetsRecordsCSV()}
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

export default LiquidAssets;