// Liquid Assets-Accounts Sync System
// This handles automatic background synchronization between Liquid Assets and Accounts components
// Liquid Assets data is the master for account definitions and balances

import { 
  getAccountData as getAccountsData, 
  setAccountData as setAccountsData,
  getSharedAccounts,
  addOrUpdateSharedAccount,
  getLiquidAssetsRecords,
  getAccountSyncSettings,
  getManualAccountGroups,
  setManualAccountGroups,
  calculateManualGroupBalance
} from './localStorage';

// Generate consistent account names from structured data
export const generateAccountName = (owner, taxType, accountType, investmentCompany, description = '') => {
  // Build readable account name from components
  // Format: [Owner's] [Investment Company] [Account Type] [(Tax Status)] [- Description]
  
  // Handle undefined/null values
  const safeOwner = owner || '';
  const safeTaxType = taxType || '';
  const safeAccountType = accountType || '';
  const safeInvestmentCompany = investmentCompany || '';
  const safeDescription = description ? description.trim() : '';
  
  let name = '';
  
  // Add owner prefix (unless Joint)
  if (safeOwner && safeOwner.toLowerCase() !== 'joint') {
    name += `${safeOwner}'s `;
  } else if (safeOwner && safeOwner.toLowerCase() === 'joint') {
    name += 'Joint ';
  }
  
  // Add investment company
  if (safeInvestmentCompany) {
    name += `${safeInvestmentCompany} `;
  }
  
  // Add account type
  if (safeAccountType) {
    name += safeAccountType;
  }
  
  // Add tax status for clarity (optional, in parentheses)
  if (safeTaxType) {
    const taxLabel = {
      'Tax-Free': 'Roth',
      'Tax-Deferred': 'Traditional', 
      'After-Tax': 'Taxable'
    }[safeTaxType] || safeTaxType;
    
    // Only add tax label for accounts where it adds clarity
    if (safeAccountType === 'IRA' || safeAccountType === '401k') {
      name += ` (${taxLabel})`;
    }
  }
  
  // Add optional description for duplicate disambiguation
  if (safeDescription) {
    name += ` - ${safeDescription}`;
  }
  
  return name.trim();
};

// Account matching logic: match on Account Type and Investment Company
// This allows liquidAssets to be the master for account names and ownership
// Liquid Assets has: Owner, Tax Type, Account Type, Investment Company (generates Account Name)
// Accounts has: Owner, Account Name, Account Type, Investment Company
export const findMatchingAccountsAccount = (liquidAssetsAccount, accountsAccounts) => {
  const liquidAssetsType = liquidAssetsAccount.accountType?.trim().toLowerCase() || '';
  const liquidAssetsCompany = liquidAssetsAccount.investmentCompany?.trim().toLowerCase() || '';
  const liquidAssetsOwner = liquidAssetsAccount.owner?.trim().toLowerCase() || '';
  const liquidAssetsDescription = liquidAssetsAccount.description?.trim() || '';
  
  // Use the actual liquid assets owner (no special IRA handling)
  const targetOwner = liquidAssetsOwner;
  
  // Generate the expected account name from liquid assets data for exact matching
  const expectedAccountName = generateAccountName(
    targetOwner,
    liquidAssetsAccount.taxType,
    liquidAssetsAccount.accountType,
    liquidAssetsAccount.investmentCompany,
    liquidAssetsDescription
  );
  
  
  // Find best match from accounts accounts
  // Priority 1: Try exact account name match first (includes description)
  for (const acctAccount of accountsAccounts) {
    const acctOwner = acctAccount.owner?.trim().toLowerCase() || '';
    const acctAccountName = acctAccount.accountName?.trim() || '';
    
    // Check for exact account name match with correct owner
    if (acctAccountName === expectedAccountName && acctOwner === targetOwner.toLowerCase()) {
      return acctAccount;
    }
  }
  
  // Priority 2: Fall back to component-based matching (for backward compatibility)
  for (const acctAccount of accountsAccounts) {
    const acctType = acctAccount.accountType?.trim().toLowerCase() || '';
    const acctCompany = acctAccount.investmentCompany?.trim().toLowerCase() || '';
    const acctOwner = acctAccount.owner?.trim().toLowerCase() || '';
    
    // Match on expected owner first (most important)
    const ownerMatch = acctOwner === targetOwner;
    
    // If liquid assets investment company is empty, try to match by owner + type only
    // This handles cases where liquid assets data is incomplete
    if (!liquidAssetsCompany && ownerMatch) {
      // For empty investment company in liquid assets, look for any account with same owner + type
      const typeMatch = liquidAssetsType === acctType;
      
      // Only match if no description is provided (to avoid conflicts with exact name matching)
      if (typeMatch && !liquidAssetsDescription) {
        return acctAccount;
      }
    } else {
      // Normal matching: owner + type + company (but only if no description to avoid conflicts)
      const typeMatch = liquidAssetsType === acctType;
      const companyMatch = liquidAssetsCompany === acctCompany;
      
      // All three must match and no description provided for a valid component-based match
      if (typeMatch && companyMatch && ownerMatch && !liquidAssetsDescription) {
        return acctAccount;
      }
    }
  }
  
  return null; // No match found
};

// Create account key for grouping - now uses account name as primary identifier
export const createAccountKey = (accountName, accountType, owner, investmentCompany) => {
  // Handle undefined/null values
  const safeName = accountName || '';
  const safeType = accountType || '';
  const safeOwner = owner || '';
  const safeCompany = investmentCompany || '';
  
  // Create unique key based on account name (which includes description) + owner
  // Account name is now the primary identifier since it includes all distinguishing info
  if (safeName) {
    return `${safeName}-${safeOwner}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
  }
  
  // Fallback to component-based key for backward compatibility
  return `${safeType}-${safeCompany}-${safeOwner}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
};

// Find Accounts account by exact account name match
export const findAccountsAccountByName = (accountName, accountsAccounts) => {
  if (!accountName) return null;
  
  const targetName = accountName.trim().toLowerCase();
  
  return accountsAccounts.find(acctAccount => {
    const acctName = (acctAccount.accountName || '').trim().toLowerCase();
    return acctName === targetName;
  }) || null;
};

// Sync liquid assets balance updates to accounts using manual account groups
export const syncLiquidAssetsBalanceToAccounts = (liquidAssetsData, updateType = 'detailed') => {
  
  const accountsData = getAccountsData();
  const manualGroups = getManualAccountGroups();
  const currentYear = new Date().getFullYear();
  let hasChanges = false;
  
  
  // Get ALL existing accounts accounts from ALL current year entries for matching
  const existingAccountsAccounts = [];
  const currentYearEntries = Object.entries(accountsData).filter(([_, entry]) => entry.year === currentYear);
  
  currentYearEntries.forEach(([entryId, entry]) => {
    Object.entries(entry.users || {}).forEach(([owner, userData]) => {
      // Include accounts that have accountType (even if accountName is empty)
      if (userData.accountType) {
        const acctAccount = {
          owner: owner,
          accountName: userData.accountName || userData.generatedAccountName || '',
          accountType: userData.accountType,
          investmentCompany: userData.investmentCompany || '',
          userData: userData,
          entryId: entryId,  // Track which entry this account belongs to
          entry: entry       // Reference to the parent entry
        };
        existingAccountsAccounts.push(acctAccount);
      }
    });
  });
  
  // If no current year entries exist, create one for liquid assets updates
  let fallbackCurrentYearEntry = null;
  if (currentYearEntries.length === 0) {
    const entryId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    fallbackCurrentYearEntry = {
      entryId: entryId,
      year: currentYear,
      users: {}
    };
    accountsData[entryId] = fallbackCurrentYearEntry;
    hasChanges = true;
  }
  
  
  // If no manual groups exist, handle ungrouped accounts individually (fallback behavior)
  if (Object.keys(manualGroups).length === 0) {
    // Process each liquid assets account individually
    liquidAssetsData.forEach((account) => {
      if (!account.accountName || !account.accountType || !account.owner || !account.amount) {
        return;
      }
      
      // Try to find matching accounts account
      const matchingAcctAccount = findMatchingAccountsAccount(account, existingAccountsAccounts);
      
      if (matchingAcctAccount) {
        // Always update balance
        matchingAcctAccount.userData.balance = parseFloat(account.amount);
        
        // CRITICAL: Also update the entry-level balance field that DataManager displays
        matchingAcctAccount.entry.balance = parseFloat(account.amount);
        
        // Update additional financial fields only for detailed updates
        if (updateType === 'detailed') {
          if (account.contributions && account.contributions !== '') {
            matchingAcctAccount.userData.contributions = parseFloat(account.contributions);
            matchingAcctAccount.entry.contributions = parseFloat(account.contributions);
          }
          if (account.employerMatch && account.employerMatch !== '') {
            matchingAcctAccount.userData.employerMatch = parseFloat(account.employerMatch);
            matchingAcctAccount.entry.employerMatch = parseFloat(account.employerMatch);
          }
          if (account.gains && account.gains !== '') {
            matchingAcctAccount.userData.gains = parseFloat(account.gains);
            matchingAcctAccount.entry.gains = parseFloat(account.gains);
          }
          if (account.fees && account.fees !== '') {
            matchingAcctAccount.userData.fees = parseFloat(account.fees);
            matchingAcctAccount.entry.fees = parseFloat(account.fees);
          }
          if (account.withdrawals && account.withdrawals !== '') {
            matchingAcctAccount.userData.withdrawals = parseFloat(account.withdrawals);
            matchingAcctAccount.entry.withdrawals = parseFloat(account.withdrawals);
          }
          
          // Track detailed update
          matchingAcctAccount.userData.lastDetailedUpdate = new Date().toISOString();
          matchingAcctAccount.userData.balanceUpdatedFrom = 'liquidAssets-individual-detailed';
        } else {
          // Track balance-only update (preserve existing detailed data)
          matchingAcctAccount.userData.balanceUpdatedFrom = 'liquidAssets-individual-balance-only';
        }
        
        matchingAcctAccount.userData.balanceUpdatedAt = new Date().toISOString();
        matchingAcctAccount.userData.lastUpdateType = updateType;
        hasChanges = true;
      } else {
        // Create new accounts account entry for ungrouped account
        const newEntryId = `entry_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        // Only include detailed fields if this is a detailed update
        const newAccountsEntry = {
          entryId: newEntryId,
          year: currentYear,
          // CRITICAL: Add entry-level balance that DataManager displays
          balance: parseFloat(account.amount),
          contributions: updateType === 'detailed' && account.contributions ? parseFloat(account.contributions) : '',
          employerMatch: updateType === 'detailed' && account.employerMatch ? parseFloat(account.employerMatch) : '',
          gains: updateType === 'detailed' && account.gains ? parseFloat(account.gains) : '',
          fees: updateType === 'detailed' && account.fees ? parseFloat(account.fees) : '',
          withdrawals: updateType === 'detailed' && account.withdrawals ? parseFloat(account.withdrawals) : '',
          users: {
            [account.owner]: {
              accountName: account.accountName,
              accountType: account.accountType,
              investmentCompany: account.investmentCompany || '',
              balance: parseFloat(account.amount),
              contributions: updateType === 'detailed' && account.contributions ? parseFloat(account.contributions) : '',
              employerMatch: updateType === 'detailed' && account.employerMatch ? parseFloat(account.employerMatch) : '',
              gains: updateType === 'detailed' && account.gains ? parseFloat(account.gains) : '',
              fees: updateType === 'detailed' && account.fees ? parseFloat(account.fees) : '',
              withdrawals: updateType === 'detailed' && account.withdrawals ? parseFloat(account.withdrawals) : '',
              balanceUpdatedFrom: updateType === 'detailed' ? 'liquidAssets-individual-detailed' : 'liquidAssets-individual-balance-only',
              balanceUpdatedAt: new Date().toISOString(),
              lastUpdateType: updateType,
              lastDetailedUpdate: updateType === 'detailed' ? new Date().toISOString() : undefined
            }
          }
        };
        
        accountsData[newEntryId] = newAccountsEntry;
        hasChanges = true;
      }
    });
  } else {
    // Process manual account groups
    const updatedGroups = { ...manualGroups };
    
    Object.entries(manualGroups).forEach(([groupId, group]) => {
      if (!group.performanceAccountName) {
        return;
      }
      
      // Calculate total balance for this group
      const totalBalance = (group.liquidAssetsAccounts || []).reduce((sum, accountId) => {
        const account = liquidAssetsData.find(acc => acc.id === accountId);
        if (account && account.amount) {
          return sum + parseFloat(account.amount);
        }
        return sum;
      }, 0);
      
      // Find the target Accounts account by name
      const targetAcctAccount = findAccountsAccountByName(
        group.performanceAccountName, 
        existingAccountsAccounts
      );
      
      if (targetAcctAccount) {
        // Always update balance
        targetAcctAccount.userData.balance = totalBalance;
        
        // CRITICAL: Also update the entry-level balance field that DataManager displays
        // This matches the Historical data structure pattern
        targetAcctAccount.entry.balance = totalBalance;
        
        // Update additional financial fields only for detailed updates
        if (updateType === 'detailed') {
          // Calculate totals for combined fields from all accounts in group
          const groupTotals = (group.liquidAssetsAccounts || []).reduce((totals, accountId) => {
            const account = liquidAssetsData.find(acc => acc.id === accountId);
            if (account) {
              totals.contributions += account.contributions ? parseFloat(account.contributions) : 0;
              totals.employerMatch += account.employerMatch ? parseFloat(account.employerMatch) : 0;
              totals.gains += account.gains ? parseFloat(account.gains) : 0;
              totals.fees += account.fees ? parseFloat(account.fees) : 0;
              totals.withdrawals += account.withdrawals ? parseFloat(account.withdrawals) : 0;
            }
            return totals;
          }, { contributions: 0, employerMatch: 0, gains: 0, fees: 0, withdrawals: 0 });

          // Update additional financial fields from combined group totals
          targetAcctAccount.userData.contributions = groupTotals.contributions || '';
          targetAcctAccount.entry.contributions = groupTotals.contributions || '';
          targetAcctAccount.userData.employerMatch = groupTotals.employerMatch || '';
          targetAcctAccount.entry.employerMatch = groupTotals.employerMatch || '';
          targetAcctAccount.userData.gains = groupTotals.gains || '';
          targetAcctAccount.entry.gains = groupTotals.gains || '';
          targetAcctAccount.userData.fees = groupTotals.fees || '';
          targetAcctAccount.entry.fees = groupTotals.fees || '';
          targetAcctAccount.userData.withdrawals = groupTotals.withdrawals || '';
          targetAcctAccount.entry.withdrawals = groupTotals.withdrawals || '';
          
          // Track detailed update
          targetAcctAccount.userData.lastDetailedUpdate = new Date().toISOString();
          targetAcctAccount.userData.balanceUpdatedFrom = 'liquidAssets-manual-group-detailed';
        } else {
          // Track balance-only update (preserve existing detailed data)
          targetAcctAccount.userData.balanceUpdatedFrom = 'liquidAssets-manual-group-balance-only';
        }
        
        targetAcctAccount.userData.balanceUpdatedAt = new Date().toISOString();
        targetAcctAccount.userData.lastUpdateType = updateType;
        targetAcctAccount.userData.manualGroupId = groupId;
        targetAcctAccount.userData.manualGroupName = group.name;
        hasChanges = true;
      } else {
        // Create new Accounts account for this manual group
        const newEntryId = `entry_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        
        // Calculate totals for combined fields from all accounts in group only for detailed updates
        let groupTotals = { contributions: 0, employerMatch: 0, gains: 0, fees: 0, withdrawals: 0 };
        if (updateType === 'detailed') {
          groupTotals = (group.liquidAssetsAccounts || []).reduce((totals, accountId) => {
            const account = liquidAssetsData.find(acc => acc.id === accountId);
            if (account) {
              totals.contributions += account.contributions ? parseFloat(account.contributions) : 0;
              totals.employerMatch += account.employerMatch ? parseFloat(account.employerMatch) : 0;
              totals.gains += account.gains ? parseFloat(account.gains) : 0;
              totals.fees += account.fees ? parseFloat(account.fees) : 0;
              totals.withdrawals += account.withdrawals ? parseFloat(account.withdrawals) : 0;
            }
            return totals;
          }, { contributions: 0, employerMatch: 0, gains: 0, fees: 0, withdrawals: 0 });
        }

        const newAccountsEntry = {
          entryId: newEntryId,
          year: currentYear,
          // CRITICAL: Add entry-level balance that DataManager displays
          balance: totalBalance,
          contributions: updateType === 'detailed' ? (groupTotals.contributions || '') : '',
          employerMatch: updateType === 'detailed' ? (groupTotals.employerMatch || '') : '',
          gains: updateType === 'detailed' ? (groupTotals.gains || '') : '',
          fees: updateType === 'detailed' ? (groupTotals.fees || '') : '',
          withdrawals: updateType === 'detailed' ? (groupTotals.withdrawals || '') : '',
          users: {
            [group.owner]: {
              accountName: group.performanceAccountName,
              accountType: 'Combined', // Generic type for manual groups
              investmentCompany: 'Multiple', // Generic company for combined accounts
              balance: totalBalance,
              contributions: updateType === 'detailed' ? (groupTotals.contributions || '') : '',
              employerMatch: updateType === 'detailed' ? (groupTotals.employerMatch || '') : '',
              gains: updateType === 'detailed' ? (groupTotals.gains || '') : '',
              fees: updateType === 'detailed' ? (groupTotals.fees || '') : '',
              withdrawals: updateType === 'detailed' ? (groupTotals.withdrawals || '') : '',
              balanceUpdatedFrom: updateType === 'detailed' ? 'liquidAssets-manual-group-detailed' : 'liquidAssets-manual-group-balance-only',
              balanceUpdatedAt: new Date().toISOString(),
              lastUpdateType: updateType,
              lastDetailedUpdate: updateType === 'detailed' ? new Date().toISOString() : undefined,
              manualGroupId: groupId,
              manualGroupName: group.name
            }
          }
        };
        
        accountsData[newEntryId] = newAccountsEntry;
        hasChanges = true;
      }
      
      // Update group metadata
      updatedGroups[groupId] = {
        ...group,
        totalBalance: totalBalance,
        lastSync: new Date().toISOString()
      };
    });
    
    // Save updated group metadata
    setManualAccountGroups(updatedGroups);
  }
  
  // Save accounts data if there were changes
  if (hasChanges) {
    setAccountsData(accountsData);
    
    // Dispatch event to notify accounts component
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('accountDataUpdated', { 
        detail: { source: 'liquidAssets', year: currentYear } 
      }));
    }, 50);
  }
  
  // Summary of what happened
  const manualGroupCount = Object.keys(manualGroups).length;
  const liquidAssetsAccountCount = liquidAssetsData.length;

  return {
    hasChanges,
    liquidAssetsAccountsProcessed: liquidAssetsAccountCount,
    manualGroupsProcessed: manualGroupCount,
    syncMethod: manualGroupCount > 0 ? 'manual-groups' : 'individual-fallback',
    year: currentYear
  };
};

// Add tracking for when non-balance accounts data is accurate
export const updateAccountsDataAccuracy = (owner, accountType, accuracyInfo) => {
  const accountsData = getAccountsData();
  const currentYear = new Date().getFullYear();
  
  let currentYearEntry = Object.values(accountsData).find(entry => entry.year === currentYear);
  
  if (!currentYearEntry) {
    return false; // No entry to update
  }
  
  if (!currentYearEntry.users[owner]) {
    return false; // No user data to update
  }
  
  const userData = currentYearEntry.users[owner];
  
  // Add accuracy tracking
  userData.dataAccuracy = {
    ...userData.dataAccuracy,
    [accountType]: {
      lastUpdated: new Date().toISOString(),
      isAccurate: accuracyInfo.isAccurate,
      source: accuracyInfo.source || 'manual',
      notes: accuracyInfo.notes
    }
  };
  
  setAccountsData(accountsData);
  return true;
};

// Check if accounts data (non-balance) is marked as accurate
export const isAccountsDataAccurate = (owner, accountType, maxAgeHours = 24 * 30) => {
  const accountsData = getAccountsData();
  const currentYear = new Date().getFullYear();
  
  const currentYearEntry = Object.values(accountsData).find(entry => entry.year === currentYear);
  
  if (!currentYearEntry?.users?.[owner]?.dataAccuracy?.[accountType]) {
    return { isAccurate: false, reason: 'No accuracy data available' };
  }
  
  const accuracyData = currentYearEntry.users[owner].dataAccuracy[accountType];
  const lastUpdated = new Date(accuracyData.lastUpdated);
  const hoursOld = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);
  
  if (hoursOld > maxAgeHours) {
    return { 
      isAccurate: false, 
      reason: `Data is ${Math.floor(hoursOld)} hours old, exceeds ${maxAgeHours} hour limit` 
    };
  }
  
  return {
    isAccurate: accuracyData.isAccurate,
    lastUpdated: accuracyData.lastUpdated,
    source: accuracyData.source,
    notes: accuracyData.notes
  };
};

// Get the most recent liquid assets accounts (only from the latest record)
export const getMostRecentLiquidAssetsAccounts = () => {
  const liquidAssetsRecords = getLiquidAssetsRecords();
  
  if (liquidAssetsRecords.length === 0) {
    return [];
  }
  
  // Sort by updateDate to get the most recent record
  const sortedRecords = liquidAssetsRecords.sort((a, b) => 
    new Date(b.updateDate) - new Date(a.updateDate)
  );
  
  const mostRecentRecord = sortedRecords[0];
  
  // Only return accounts from recent records (current year)
  // This prevents old liquid assets data from contaminating the current view
  const recordDate = new Date(mostRecentRecord.updateDate);
  const currentYear = new Date().getFullYear();
  const recordYear = recordDate.getFullYear();
  
  if (recordYear < currentYear) {
    return [];
  }
  
  return mostRecentRecord.accounts || [];
};

// Sync accounts accounts based only on the most recent liquid assets record
export const syncAccountsFromLatestLiquidAssets = () => {
  const accountsData = getAccountsData();
  const mostRecentAccounts = getMostRecentLiquidAssetsAccounts();
  const currentYear = new Date().getFullYear();
  
  if (mostRecentAccounts.length === 0) {
    return { accountsFound: 0, accountsUpdated: 0 };
  }
  
  // Get existing accounts accounts to match against
  const existingAccountsAccounts = [];
  Object.values(accountsData).forEach(entry => {
    if (entry.year === currentYear && entry.users) {
      Object.entries(entry.users).forEach(([owner, userData]) => {
        if (userData.accountName && userData.accountType) {
          existingAccountsAccounts.push({
            owner: owner,
            accountName: userData.accountName,
            accountType: userData.accountType,
            investmentCompany: userData.investmentCompany || '',
            userData: userData
          });
        }
      });
    }
  });
  
  // Group accounts by accounts account key (using matching logic)
  const accountGroups = {};
  
  mostRecentAccounts.forEach(account => {
    // Try to find matching accounts account
    const matchingAcctAccount = findMatchingAccountsAccount(account, existingAccountsAccounts);
    
    let accountKey;
    if (matchingAcctAccount) {
      // Use the accounts account's details as the key
      accountKey = createAccountKey(matchingAcctAccount.accountName, matchingAcctAccount.accountType, matchingAcctAccount.owner, matchingAcctAccount.investmentCompany);
    } else {
      // No match found, create new key from liquid assets data
      // Use the actual account owner (no special IRA handling)
      const accountsOwner = account.owner;
      
      // Generate account name since liquid assets data no longer includes it
      const generatedAccountName = generateAccountName(
        accountsOwner,
        account.taxType,
        account.accountType,
        account.investmentCompany,
        account.description || ''
      );
      
      accountKey = createAccountKey(generatedAccountName, account.accountType, accountsOwner, account.investmentCompany);
    }
    
    if (!accountGroups[accountKey]) {
      // Use existing accounts account name if matched, otherwise generate from structured data
      let finalAccountName, finalOwner, finalAccountType, finalInvestmentCompany;
      
      if (matchingAcctAccount) {
        finalAccountName = matchingAcctAccount.accountName;
        finalOwner = matchingAcctAccount.owner;
        finalAccountType = matchingAcctAccount.accountType;
        finalInvestmentCompany = matchingAcctAccount.investmentCompany;
      } else {
        // Generate account name since liquid assets data no longer includes it
        finalAccountType = account.accountType;
        finalInvestmentCompany = account.investmentCompany || '';
        // Use the actual account owner (no special IRA handling)
        finalOwner = account.owner;
        
        // Generate the account name from structured data
        finalAccountName = generateAccountName(
          finalOwner,
          account.taxType,
          finalAccountType,
          finalInvestmentCompany,
          account.description || ''
        );
      }
      
      accountGroups[accountKey] = {
        accounts: [],
        owner: finalOwner,
        accountType: finalAccountType,
        accountName: finalAccountName,
        investmentCompany: finalInvestmentCompany,
        matchedAcctAccount: matchingAcctAccount
      };
    }
    
    accountGroups[accountKey].accounts.push(account);
  });
  
  // Clear existing accounts accounts for current year that aren't in latest liquid assets
  Object.values(accountsData).forEach(entry => {
    if (entry.year === currentYear && entry.users) {
      Object.keys(entry.users).forEach(owner => {
        // Keep the user entry but clear account-specific data if account no longer exists
        const userData = entry.users[owner];
        const userAccountKey = createAccountKey(
          userData.accountName || '', 
          userData.accountType || '', 
          owner,
          userData.investmentCompany || ''
        );
        
        if (!accountGroups[userAccountKey]) {
          // This account is no longer in the latest liquid assets, clear it
          delete entry.users[owner];
        }
      });
    }
  });
  
  // Update shared accounts to only include latest liquid assets accounts
  const sharedAccounts = getSharedAccounts();
  const updatedSharedAccounts = sharedAccounts.filter(acc => 
    acc.source !== 'accounts' && acc.source !== 'liquidAssets'
  );
  
  // Add accounts from latest liquid assets only - using liquid assets' generated names
  Object.values(accountGroups).forEach(group => {
    addOrUpdateSharedAccount({
      accountName: group.accountName, // Use liquid assets' generated account name
      owner: group.owner,
      accountType: group.accountType,
      investmentCompany: group.investmentCompany,
      taxType: '', // Accounts doesn't track tax type
      source: 'accounts'
    });
  });
  
  const liquidAssetsRecords = getLiquidAssetsRecords();
  return {
    accountsFound: mostRecentAccounts.length,
    accountsUpdated: Object.keys(accountGroups).length,
    recordDate: liquidAssetsRecords.length > 0 ? liquidAssetsRecords[0]?.updateDate : null
  };
};

// Get sync status for display purposes
export const getSyncStatus = () => {
  const accountsData = getAccountsData();
  const sharedAccounts = getSharedAccounts();
  const liquidAssetsRecords = getLiquidAssetsRecords();
  const currentYear = new Date().getFullYear();
  const mostRecentAccounts = getMostRecentLiquidAssetsAccounts();
  
  const currentYearEntry = Object.values(accountsData).find(entry => entry.year === currentYear);
  
  return {
    hasCurrentYearData: !!currentYearEntry,
    accountCount: sharedAccounts.length,
    liquidAssetsAccounts: sharedAccounts.filter(acc => acc.sources?.includes('liquidAssets')).length,
    accountsAccounts: sharedAccounts.filter(acc => acc.sources?.includes('accounts')).length,
    mostRecentLiquidAssetsCount: mostRecentAccounts.length,
    mostRecentLiquidAssetsDate: liquidAssetsRecords.length > 0 ? 
      liquidAssetsRecords.sort((a, b) => new Date(b.updateDate) - new Date(a.updateDate))[0].updateDate : null,
    lastSyncTime: currentYearEntry?.users ? 
      (() => {
        const times = Object.values(currentYearEntry.users)
          .filter(user => user.balanceUpdatedAt)
          .map(user => new Date(user.balanceUpdatedAt).getTime())
          .filter(time => !isNaN(time));
        return times.length > 0 ? Math.max(...times) : null;
      })() : null
  };
};

