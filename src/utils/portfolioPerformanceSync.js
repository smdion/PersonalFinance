// Portfolio-Performance Sync System
// This handles automatic background synchronization between Portfolio and Performance components
// Portfolio data is the master for account definitions and balances

import { 
  getPerformanceData, 
  setPerformanceData,
  getSharedAccounts,
  addOrUpdateSharedAccount,
  getPortfolioRecords,
  getPerformanceSyncSettings,
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
// This allows portfolio to be the master for account names and ownership
// Portfolio has: Owner, Tax Type, Account Type, Investment Company (generates Account Name)
// Performance has: Owner, Account Name, Account Type, Investment Company
export const findMatchingPerformanceAccount = (portfolioAccount, performanceAccounts) => {
  const portfolioType = portfolioAccount.accountType?.trim().toLowerCase() || '';
  const portfolioCompany = portfolioAccount.investmentCompany?.trim().toLowerCase() || '';
  const portfolioOwner = portfolioAccount.owner?.trim().toLowerCase() || '';
  const portfolioDescription = portfolioAccount.description?.trim() || '';
  
  // Use the actual portfolio owner (no special IRA handling)
  const targetOwner = portfolioOwner;
  
  // Generate the expected account name from portfolio data for exact matching
  const expectedAccountName = generateAccountName(
    targetOwner,
    portfolioAccount.taxType,
    portfolioAccount.accountType,
    portfolioAccount.investmentCompany,
    portfolioDescription
  );
  
  
  // Find best match from performance accounts
  // Priority 1: Try exact account name match first (includes description)
  for (const perfAccount of performanceAccounts) {
    const perfOwner = perfAccount.owner?.trim().toLowerCase() || '';
    const perfAccountName = perfAccount.accountName?.trim() || '';
    
    // Check for exact account name match with correct owner
    if (perfAccountName === expectedAccountName && perfOwner === targetOwner.toLowerCase()) {
      return perfAccount;
    }
  }
  
  // Priority 2: Fall back to component-based matching (for backward compatibility)
  for (const perfAccount of performanceAccounts) {
    const perfType = perfAccount.accountType?.trim().toLowerCase() || '';
    const perfCompany = perfAccount.investmentCompany?.trim().toLowerCase() || '';
    const perfOwner = perfAccount.owner?.trim().toLowerCase() || '';
    
    // Match on expected owner first (most important)
    const ownerMatch = perfOwner === targetOwner;
    
    // If portfolio investment company is empty, try to match by owner + type only
    // This handles cases where portfolio data is incomplete
    if (!portfolioCompany && ownerMatch) {
      // For empty investment company in portfolio, look for any account with same owner + type
      const typeMatch = portfolioType === perfType;
      
      // Only match if no description is provided (to avoid conflicts with exact name matching)
      if (typeMatch && !portfolioDescription) {
        return perfAccount;
      }
    } else {
      // Normal matching: owner + type + company (but only if no description to avoid conflicts)
      const typeMatch = portfolioType === perfType;
      const companyMatch = portfolioCompany === perfCompany;
      
      // All three must match and no description provided for a valid component-based match
      if (typeMatch && companyMatch && ownerMatch && !portfolioDescription) {
        return perfAccount;
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

// Find Performance account by exact account name match
export const findPerformanceAccountByName = (accountName, performanceAccounts) => {
  if (!accountName) return null;
  
  const targetName = accountName.trim().toLowerCase();
  
  return performanceAccounts.find(perfAccount => {
    const perfName = (perfAccount.accountName || '').trim().toLowerCase();
    return perfName === targetName;
  }) || null;
};

// Sync portfolio balance updates to performance using manual account groups
export const syncPortfolioBalanceToPerformance = (portfolioData) => {
  
  const performanceData = getPerformanceData();
  const manualGroups = getManualAccountGroups();
  const currentYear = new Date().getFullYear();
  let hasChanges = false;
  
  
  // Get ALL existing performance accounts from ALL current year entries for matching
  const existingPerformanceAccounts = [];
  const currentYearEntries = Object.entries(performanceData).filter(([_, entry]) => entry.year === currentYear);
  
  currentYearEntries.forEach(([entryId, entry]) => {
    Object.entries(entry.users || {}).forEach(([owner, userData]) => {
      // Include accounts that have accountType (even if accountName is empty)
      if (userData.accountType) {
        const perfAccount = {
          owner: owner,
          accountName: userData.accountName || userData.generatedAccountName || '',
          accountType: userData.accountType,
          investmentCompany: userData.investmentCompany || '',
          userData: userData,
          entryId: entryId,  // Track which entry this account belongs to
          entry: entry       // Reference to the parent entry
        };
        existingPerformanceAccounts.push(perfAccount);
      }
    });
  });
  
  // If no current year entries exist, create one for portfolio updates
  let fallbackCurrentYearEntry = null;
  if (currentYearEntries.length === 0) {
    const entryId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    fallbackCurrentYearEntry = {
      entryId: entryId,
      year: currentYear,
      users: {}
    };
    performanceData[entryId] = fallbackCurrentYearEntry;
    hasChanges = true;
  }
  
  
  // If no manual groups exist, handle ungrouped accounts individually (fallback behavior)
  if (Object.keys(manualGroups).length === 0) {
    // Process each portfolio account individually
    portfolioData.forEach((account) => {
      if (!account.accountName || !account.accountType || !account.owner || !account.amount) {
        return;
      }
      
      // Try to find matching performance account
      const matchingPerfAccount = findMatchingPerformanceAccount(account, existingPerformanceAccounts);
      
      if (matchingPerfAccount) {
        // Update existing performance account balance
        matchingPerfAccount.userData.balance = parseFloat(account.amount);
        
        // CRITICAL: Also update the entry-level balance field that DataManager displays
        matchingPerfAccount.entry.balance = parseFloat(account.amount);
        
        matchingPerfAccount.userData.balanceUpdatedFrom = 'portfolio-individual';
        matchingPerfAccount.userData.balanceUpdatedAt = new Date().toISOString();
        hasChanges = true;
      } else {
        // Create new performance account entry for ungrouped account
        const newEntryId = `entry_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const newPerformanceEntry = {
          entryId: newEntryId,
          year: currentYear,
          // CRITICAL: Add entry-level balance that DataManager displays
          balance: parseFloat(account.amount),
          contributions: '',
          employerMatch: '',
          gains: '',
          fees: '',
          withdrawals: '',
          users: {
            [account.owner]: {
              accountName: account.accountName,
              accountType: account.accountType,
              investmentCompany: account.investmentCompany || '',
              balance: parseFloat(account.amount),
              contributions: '',
              employerMatch: '',
              gains: '',
              fees: '',
              withdrawals: '',
              balanceUpdatedFrom: 'portfolio-individual',
              balanceUpdatedAt: new Date().toISOString()
            }
          }
        };
        
        performanceData[newEntryId] = newPerformanceEntry;
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
      const totalBalance = group.portfolioAccounts.reduce((sum, accountId) => {
        const account = portfolioData.find(acc => acc.id === accountId);
        if (account && account.amount) {
          return sum + parseFloat(account.amount);
        }
        return sum;
      }, 0);
      
      // Find the target Performance account by name
      const targetPerfAccount = findPerformanceAccountByName(
        group.performanceAccountName, 
        existingPerformanceAccounts
      );
      
      if (targetPerfAccount) {
        // Update existing Performance account balance
        const oldBalance = targetPerfAccount.userData.balance;
        targetPerfAccount.userData.balance = totalBalance;
        
        // CRITICAL: Also update the entry-level balance field that DataManager displays
        // This matches the Historical data structure pattern
        targetPerfAccount.entry.balance = totalBalance;
        targetPerfAccount.userData.balanceUpdatedFrom = 'portfolio-manual-group';
        targetPerfAccount.userData.balanceUpdatedAt = new Date().toISOString();
        targetPerfAccount.userData.manualGroupId = groupId;
        targetPerfAccount.userData.manualGroupName = group.name;
        hasChanges = true;
      } else {
        // Create new Performance account for this manual group
        const newEntryId = `entry_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const newPerformanceEntry = {
          entryId: newEntryId,
          year: currentYear,
          // CRITICAL: Add entry-level balance that DataManager displays
          balance: totalBalance,
          contributions: '',
          employerMatch: '',
          gains: '',
          fees: '',
          withdrawals: '',
          users: {
            [group.owner]: {
              accountName: group.performanceAccountName,
              accountType: 'Combined', // Generic type for manual groups
              investmentCompany: 'Multiple', // Generic company for combined accounts
              balance: totalBalance,
              contributions: '',
              employerMatch: '',
              gains: '',
              fees: '',
              withdrawals: '',
              balanceUpdatedFrom: 'portfolio-manual-group',
              balanceUpdatedAt: new Date().toISOString(),
              manualGroupId: groupId,
              manualGroupName: group.name
            }
          }
        };
        
        performanceData[newEntryId] = newPerformanceEntry;
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
  
  // Save performance data if there were changes
  if (hasChanges) {
    setPerformanceData(performanceData);
    
    // Dispatch event to notify performance component
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('performanceDataUpdated', { 
        detail: { source: 'portfolio', year: currentYear } 
      }));
    }, 50);
  }
  
  // Summary of what happened
  const manualGroupCount = Object.keys(manualGroups).length;
  const portfolioAccountCount = portfolioData.length;

  return {
    hasChanges,
    portfolioAccountsProcessed: portfolioAccountCount,
    manualGroupsProcessed: manualGroupCount,
    syncMethod: manualGroupCount > 0 ? 'manual-groups' : 'individual-fallback',
    year: currentYear
  };
};

// Add tracking for when non-balance performance data is accurate
export const updatePerformanceDataAccuracy = (owner, accountType, accuracyInfo) => {
  const performanceData = getPerformanceData();
  const currentYear = new Date().getFullYear();
  
  let currentYearEntry = Object.values(performanceData).find(entry => entry.year === currentYear);
  
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
  
  setPerformanceData(performanceData);
  return true;
};

// Check if performance data (non-balance) is marked as accurate
export const isPerformanceDataAccurate = (owner, accountType, maxAgeHours = 24 * 30) => {
  const performanceData = getPerformanceData();
  const currentYear = new Date().getFullYear();
  
  const currentYearEntry = Object.values(performanceData).find(entry => entry.year === currentYear);
  
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

// Get the most recent portfolio accounts (only from the latest record)
export const getMostRecentPortfolioAccounts = () => {
  const portfolioRecords = getPortfolioRecords();
  
  if (portfolioRecords.length === 0) {
    return [];
  }
  
  // Sort by updateDate to get the most recent record
  const sortedRecords = portfolioRecords.sort((a, b) => 
    new Date(b.updateDate) - new Date(a.updateDate)
  );
  
  const mostRecentRecord = sortedRecords[0];
  
  // Only return accounts from recent records (current year)
  // This prevents old portfolio data from contaminating the current view
  const recordDate = new Date(mostRecentRecord.updateDate);
  const currentYear = new Date().getFullYear();
  const recordYear = recordDate.getFullYear();
  
  if (recordYear < currentYear) {
    return [];
  }
  
  return mostRecentRecord.accounts || [];
};

// Sync performance accounts based only on the most recent portfolio record
export const syncPerformanceAccountsFromLatestPortfolio = () => {
  const performanceData = getPerformanceData();
  const mostRecentAccounts = getMostRecentPortfolioAccounts();
  const currentYear = new Date().getFullYear();
  
  if (mostRecentAccounts.length === 0) {
    return { accountsFound: 0, accountsUpdated: 0 };
  }
  
  // Get existing performance accounts to match against
  const existingPerformanceAccounts = [];
  Object.values(performanceData).forEach(entry => {
    if (entry.year === currentYear && entry.users) {
      Object.entries(entry.users).forEach(([owner, userData]) => {
        if (userData.accountName && userData.accountType) {
          existingPerformanceAccounts.push({
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
  
  // Group accounts by performance account key (using matching logic)
  const accountGroups = {};
  
  mostRecentAccounts.forEach(account => {
    // Try to find matching performance account
    const matchingPerfAccount = findMatchingPerformanceAccount(account, existingPerformanceAccounts);
    
    let accountKey;
    if (matchingPerfAccount) {
      // Use the performance account's details as the key
      accountKey = createAccountKey(matchingPerfAccount.accountName, matchingPerfAccount.accountType, matchingPerfAccount.owner, matchingPerfAccount.investmentCompany);
    } else {
      // No match found, create new key from portfolio data
      // Use the actual account owner (no special IRA handling)
      const performanceOwner = account.owner;
      
      // Generate account name since portfolio data no longer includes it
      const generatedAccountName = generateAccountName(
        performanceOwner,
        account.taxType,
        account.accountType,
        account.investmentCompany,
        account.description || ''
      );
      
      accountKey = createAccountKey(generatedAccountName, account.accountType, performanceOwner, account.investmentCompany);
    }
    
    if (!accountGroups[accountKey]) {
      // Use existing performance account name if matched, otherwise generate from structured data
      let finalAccountName, finalOwner, finalAccountType, finalInvestmentCompany;
      
      if (matchingPerfAccount) {
        finalAccountName = matchingPerfAccount.accountName;
        finalOwner = matchingPerfAccount.owner;
        finalAccountType = matchingPerfAccount.accountType;
        finalInvestmentCompany = matchingPerfAccount.investmentCompany;
      } else {
        // Generate account name since portfolio data no longer includes it
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
        matchedPerfAccount: matchingPerfAccount
      };
    }
    
    accountGroups[accountKey].accounts.push(account);
  });
  
  // Clear existing performance accounts for current year that aren't in latest portfolio
  Object.values(performanceData).forEach(entry => {
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
          // This account is no longer in the latest portfolio, clear it
          delete entry.users[owner];
        }
      });
    }
  });
  
  // Update shared accounts to only include latest portfolio accounts
  const sharedAccounts = getSharedAccounts();
  const updatedSharedAccounts = sharedAccounts.filter(acc => 
    acc.source !== 'performance' && acc.source !== 'portfolio'
  );
  
  // Add accounts from latest portfolio only - using portfolio's generated names
  Object.values(accountGroups).forEach(group => {
    addOrUpdateSharedAccount({
      accountName: group.accountName, // Use portfolio's generated account name
      owner: group.owner,
      accountType: group.accountType,
      investmentCompany: group.investmentCompany,
      taxType: '', // Performance doesn't track tax type
      source: 'performance'
    });
  });
  
  const portfolioRecords = getPortfolioRecords();
  return {
    accountsFound: mostRecentAccounts.length,
    accountsUpdated: Object.keys(accountGroups).length,
    recordDate: portfolioRecords.length > 0 ? portfolioRecords[0]?.updateDate : null
  };
};

// Get sync status for display purposes
export const getSyncStatus = () => {
  const performanceData = getPerformanceData();
  const sharedAccounts = getSharedAccounts();
  const portfolioRecords = getPortfolioRecords();
  const currentYear = new Date().getFullYear();
  const mostRecentAccounts = getMostRecentPortfolioAccounts();
  
  const currentYearEntry = Object.values(performanceData).find(entry => entry.year === currentYear);
  
  return {
    hasCurrentYearData: !!currentYearEntry,
    accountCount: sharedAccounts.length,
    portfolioAccounts: sharedAccounts.filter(acc => acc.sources?.includes('portfolio')).length,
    performanceAccounts: sharedAccounts.filter(acc => acc.sources?.includes('performance')).length,
    mostRecentPortfolioCount: mostRecentAccounts.length,
    mostRecentPortfolioDate: portfolioRecords.length > 0 ? 
      portfolioRecords.sort((a, b) => new Date(b.updateDate) - new Date(a.updateDate))[0].updateDate : null,
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