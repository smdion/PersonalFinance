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
  calculateManualGroupBalance,
  getPaycheckData,
  resolveUserDisplayName
} from './localStorage';

// Generate consistent account names from structured data
export const generateAccountName = (owner, taxType, accountType, investmentCompany, description = '') => {
  // Build readable account name from components
  // Format: [Owner's] [Investment Company] [Account Type] [(Tax Status)] [- Description]
  
  // Use centralized name resolver for consistency
  const safeOwner = resolveUserDisplayName(owner || '');
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
    liquidAssetsAccount.owner, // Use original owner with proper capitalization
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
    if (acctAccountName === expectedAccountName && acctOwner === liquidAssetsAccount.owner.toLowerCase()) {
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
export const syncLiquidAssetsBalanceToAccounts = (liquidAssetsData, updateType = 'detailed', updateMode = 'auto') => {
  console.log('🔄 SYNC: Starting syncLiquidAssetsBalanceToAccounts');
  console.log('  📊 Liquid Assets Data:', liquidAssetsData);
  console.log('  🔧 Update Type:', updateType);
  console.log('  🎯 Update Mode:', updateMode);
  
  const accountsData = getAccountsData();
  const manualGroups = getManualAccountGroups();
  const currentYear = new Date().getFullYear();
  let hasChanges = false;
  
  console.log('  📂 Manual Groups:', manualGroups);
  console.log('  📅 Current Year:', currentYear);
  
  
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
  
  
  // Process individually if explicitly in individual mode OR if no manual groups exist (fallback behavior)
  if (updateMode === 'individual' || Object.keys(manualGroups).length === 0) {
    console.log('🔍 SYNC: Processing accounts individually');
    console.log('  📊 Accounts to process:', liquidAssetsData.length);
    console.log('  🎯 Existing accounts for matching:', existingAccountsAccounts.length);
    
    // Process each liquid assets account individually
    liquidAssetsData.forEach((account, index) => {
      console.log(`\n🔄 SYNC: Processing account ${index + 1}/${liquidAssetsData.length}:`, account);
      
      if (!account.accountName || !account.accountType || !account.owner) {
        console.log(`  ❌ Skipping account - missing required fields:`, {
          accountName: !!account.accountName,
          accountType: !!account.accountType,
          owner: !!account.owner
        });
        return;
      }
      
      // Check if this individual account is part of a manual group
      let groupInfo = null;
      Object.entries(manualGroups).forEach(([groupId, group]) => {
        const liquidAssetsAccountIds = group.liquidAssetsAccounts || group.portfolioAccounts || [];
        if (liquidAssetsAccountIds.includes(account.id)) {
          groupInfo = { groupId, group };
          console.log(`  🏢 Account is part of group: ${group.name} (${groupId})`);
        }
      });
      
      let matchingAcctAccount = null;
      
      if (groupInfo) {
        // This account is part of a group, find the group's Accounts account
        const targetAccountName = groupInfo.group.accountName || groupInfo.group.performanceAccountName;
        console.log(`  🎯 Looking for group account: ${targetAccountName}`);
        matchingAcctAccount = findAccountsAccountByName(targetAccountName, existingAccountsAccounts);
        if (matchingAcctAccount) {
          console.log(`    ✅ Found group account for individual update`);
        } else {
          console.log(`    ❌ Group account not found: ${targetAccountName}`);
        }
      } else {
        // Not part of a group, try to find matching individual account
        console.log(`  🔍 Looking for matching individual account in ${existingAccountsAccounts.length} existing accounts`);
        matchingAcctAccount = findMatchingAccountsAccount(account, existingAccountsAccounts);
        console.log(`  🎯 Individual match result:`, matchingAcctAccount ? 'FOUND' : 'NOT FOUND');
        if (matchingAcctAccount) {
          console.log(`    ✅ Matched with individual account:`, {
            accountName: matchingAcctAccount.accountName,
            owner: matchingAcctAccount.owner,
            accountType: matchingAcctAccount.accountType,
            currentBalance: matchingAcctAccount.userData.balance
          });
        }
      }
      
      if (matchingAcctAccount) {
        // Update balance only if amount is not null (preserve existing if null)
        if (account.amount !== null && account.amount !== undefined && account.amount !== '') {
          const newBalance = parseFloat(account.amount);
          
          if (groupInfo) {
            // This is updating a group account from an individual account
            // We need to calculate the new group total by replacing this account's contribution
            console.log(`    🏢 Updating group account balance - calculating new group total`);
            
            // Get all accounts in this group
            const liquidAssetsAccountIds = groupInfo.group.liquidAssetsAccounts || groupInfo.group.portfolioAccounts || [];
            
            // Calculate total from all accounts in the group (using updated data)
            const groupTotal = liquidAssetsAccountIds.reduce((sum, accountId) => {
              if (accountId === account.id) {
                // Use the new balance for the current account
                return sum + newBalance;
              } else {
                // Find the other account's balance from liquidAssetsData
                const otherAccount = liquidAssetsData.find(acc => acc.id === accountId);
                if (otherAccount && otherAccount.amount !== null && otherAccount.amount !== undefined && otherAccount.amount !== '') {
                  // Use the amount from liquid assets data if available
                  return sum + parseFloat(otherAccount.amount);
                } else {
                  // Fallback: Try to find existing balance for this account in the same group
                  // Look through all liquid assets accounts in the group to find one that might have existing balance
                  const existingAccountInGroup = existingAccountsAccounts.find(existingAcc => {
                    return existingAcc.accountName === matchingAcctAccount.accountName && 
                           existingAcc.owner === matchingAcctAccount.owner;
                  });
                  
                  if (existingAccountInGroup && existingAccountInGroup.userData.balance) {
                    // Get the current group balance and subtract the account being updated
                    const currentGroupBalance = parseFloat(existingAccountInGroup.userData.balance) || 0;
                    // This is a rough approximation - in individual mode we can't perfectly split group balances
                    // So we preserve the existing group balance and just add the new contribution
                    // This prevents losing existing balances when updating individual accounts
                    return sum; // Don't add anything here, we'll handle this differently
                  }
                }
              }
              return sum;
            }, 0);
            
            // Special handling for individual mode: preserve existing group balance and add/update individual contribution
            const currentGroupBalance = parseFloat(matchingAcctAccount.userData.balance) || 0;
            let finalGroupTotal = groupTotal;
            
            // If we're only updating one account and others don't have amounts, preserve existing group balance
            const accountsWithAmounts = liquidAssetsAccountIds.filter(id => {
              const acc = liquidAssetsData.find(a => a.id === id);
              return acc && acc.amount !== null && acc.amount !== undefined && acc.amount !== '';
            }).length;
            
            if (accountsWithAmounts === 1 && currentGroupBalance > 0) {
              // Only one account has an amount, preserve existing balance and update the contribution
              // This is an approximation - we can't perfectly track individual contributions in group mode
              finalGroupTotal = Math.max(currentGroupBalance, newBalance);
              console.log(`    🔄 Individual mode: preserving group balance ${currentGroupBalance}, new contribution: ${newBalance}, final: ${finalGroupTotal}`);
            } else {
              finalGroupTotal = groupTotal;
            }
            
            console.log(`    💰 Updating group balance from ${matchingAcctAccount.userData.balance} to ${finalGroupTotal} (individual contribution: ${newBalance}, calculated total: ${groupTotal})`);
            matchingAcctAccount.userData.balance = finalGroupTotal;
            matchingAcctAccount.entry.balance = finalGroupTotal;
          } else {
            // This is a regular individual account update
            console.log(`    💰 Updating individual balance from ${matchingAcctAccount.userData.balance} to ${newBalance}`);
            matchingAcctAccount.userData.balance = newBalance;
            matchingAcctAccount.entry.balance = newBalance;
          }
          console.log(`    ✅ Balance updated successfully`);
        } else {
          console.log(`    🔒 Preserving existing balance (amount is null/empty): ${matchingAcctAccount.userData.balance}`);
        }
        
        // Update additional financial fields only for detailed updates
        console.log(`    🔍 Checking if should update detailed fields - updateType: ${updateType}, groupInfo: ${!!groupInfo}`);
        if (updateType === 'detailed') {
          console.log(`    ⚠️  WARNING: Individual mode should never have updateType === 'detailed'!`);
          console.log(`    📊 Processing detailed fields for ${groupInfo ? 'group' : 'individual'} account`);
          
          // For group accounts updated from individual mode, we should NOT update detailed fields
          // Individual mode should only update balance, not detailed data
          if (groupInfo) {
            console.log(`    🚫 Skipping detailed field updates for group account - individual mode should only update balance`);
          } else {
            console.log(`    ✅ Updating detailed fields for individual account`);
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
          }
        } else {
          // Track balance-only update (preserve existing detailed data)
          matchingAcctAccount.userData.balanceUpdatedFrom = groupInfo ? 
            'liquidAssets-individual-to-group-balance-only' : 
            'liquidAssets-individual-balance-only';
        }
        
        // Add group tracking info if applicable
        if (groupInfo) {
          matchingAcctAccount.userData.manualGroupId = groupInfo.groupId;
          matchingAcctAccount.userData.manualGroupName = groupInfo.group.name;
          matchingAcctAccount.userData.updatedFromIndividualAccount = account.id;
        }
        
        matchingAcctAccount.userData.balanceUpdatedAt = new Date().toISOString();
        matchingAcctAccount.userData.lastUpdateType = updateType;
        hasChanges = true;
      } else if (account.amount !== null && account.amount !== undefined && account.amount !== '') {
        // Create new accounts account entry for ungrouped account (only if amount is provided)
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
              balance: updateType === 'detailed-group-preserve-balance' ? (matchingAccount?.userData?.balance || 0) : parseFloat(account.amount),
              contributions: (updateType === 'detailed' || updateType === 'detailed-group-preserve-balance') ? 
                (account.contributions === null ? (matchingAccount?.userData?.contributions || '') : 
                 (account.contributions ? parseFloat(account.contributions) : '')) : '',
              employerMatch: (updateType === 'detailed' || updateType === 'detailed-group-preserve-balance') ? 
                (account.employerMatch === null ? (matchingAccount?.userData?.employerMatch || '') : 
                 (account.employerMatch ? parseFloat(account.employerMatch) : '')) : '',
              gains: (updateType === 'detailed' || updateType === 'detailed-group-preserve-balance') ? 
                (account.gains === null ? (matchingAccount?.userData?.gains || '') : 
                 (account.gains ? parseFloat(account.gains) : '')) : '',
              fees: (updateType === 'detailed' || updateType === 'detailed-group-preserve-balance') ? 
                (account.fees === null ? (matchingAccount?.userData?.fees || '') : 
                 (account.fees ? parseFloat(account.fees) : '')) : '',
              withdrawals: (updateType === 'detailed' || updateType === 'detailed-group-preserve-balance') ? 
                (account.withdrawals === null ? (matchingAccount?.userData?.withdrawals || '') : 
                 (account.withdrawals ? parseFloat(account.withdrawals) : '')) : '',
              balanceUpdatedFrom: updateType === 'detailed' ? 'liquidAssets-individual-detailed' : 
                                 updateType === 'detailed-group-preserve-balance' ? 'liquidAssets-group-detailed-preserve-balance' : 
                                 'liquidAssets-individual-balance-only',
              balanceUpdatedAt: updateType === 'detailed-group-preserve-balance' ? (matchingAccount?.userData?.balanceUpdatedAt || new Date().toISOString()) : new Date().toISOString(),
              lastUpdateType: updateType,
              lastDetailedUpdate: (updateType === 'detailed' || updateType === 'detailed-group-preserve-balance') ? new Date().toISOString() : undefined
            }
          }
        };
        
        accountsData[newEntryId] = newAccountsEntry;
        hasChanges = true;
      }
    });
  } else {
    // Process manual account groups
    console.log('🏢 SYNC: Processing manual account groups');
    console.log('  📊 Groups count:', Object.keys(manualGroups).length);
    
    const updatedGroups = { ...manualGroups };
    
    Object.entries(manualGroups).forEach(([groupId, group]) => {
      console.log(`🔍 SYNC: Processing group ${groupId}:`, group);
      // Support both old and new field names during transition
      const targetAccountName = group.accountName || group.performanceAccountName;
      console.log(`  📋 Target account name: ${targetAccountName}`);
      if (!targetAccountName) {
        console.log(`  ❌ No target account name found for group ${groupId}`);
        return;
      }
      
      // Calculate total balance for this group
      // Support both old and new field names during transition
      const liquidAssetsAccountIds = group.liquidAssetsAccounts || group.portfolioAccounts || [];
      console.log(`  📊 Liquid assets account IDs: ${JSON.stringify(liquidAssetsAccountIds)}`);
      console.log(`  🔍 Available liquid assets IDs:`, liquidAssetsData.map(acc => acc.id));
      console.log(`  💰 Available liquid assets with amounts:`, liquidAssetsData.filter(acc => acc.amount && acc.amount !== '').map(acc => ({ id: acc.id, amount: acc.amount })));
      
      const totalBalance = liquidAssetsAccountIds.reduce((sum, accountId) => {
        const account = liquidAssetsData.find(acc => acc.id === accountId);
        if (account && account.amount) {
          console.log(`    ✅ Found account ${accountId} with amount: ${account.amount}`);
          return sum + parseFloat(account.amount);
        } else {
          console.log(`    ❌ Account ${accountId} not found or has no amount`);
        }
        return sum;
      }, 0);
      
      console.log(`  💰 Total balance calculated: ${totalBalance}`);
      
      // Find the target Accounts account by name
      const targetAcctAccount = findAccountsAccountByName(
        targetAccountName, 
        existingAccountsAccounts
      );
      
      if (targetAcctAccount) {
        console.log(`💰 SYNC: Found target account for group ${groupId}:`, targetAccountName);
        console.log(`  📊 Current balance: ${targetAcctAccount.userData.balance}`);
        console.log(`  🆕 New total balance: ${totalBalance}`);
        console.log(`  🔧 Update type: ${updateType}`);
        
        // Update balance based on update type
        if (updateType === 'detailed-group-preserve-balance') {
          console.log(`🔒 SYNC: Preserving existing balance for detailed-group-preserve-balance`);
          console.log(`  📊 Existing balance will remain: ${targetAcctAccount.userData.balance}`);
          // Don't update balance - preserve existing
        } else {
          console.log(`🔄 SYNC: Updating balance to ${totalBalance} for update type: ${updateType}`);
          // Update balance for all other cases (balance comes from sum of liquid assets)
          targetAcctAccount.userData.balance = totalBalance;
          
          // CRITICAL: Also update the entry-level balance field that DataManager displays
          // This matches the Annual data structure pattern
          targetAcctAccount.entry.balance = totalBalance;
        }
        
        console.log(`✅ SYNC: Balance update complete. Final balance: ${targetAcctAccount.userData.balance}`);
        
        // Update additional financial fields only for detailed updates
        if (updateType === 'detailed') {
          // Calculate totals for combined fields from all accounts in group
          const groupTotals = liquidAssetsAccountIds.reduce((totals, accountId) => {
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
        } else if (updateType === 'detailed-group-preserve-balance') {
          // Calculate totals for combined fields, but preserve existing data for null values
          // First check if ANY account in the group has non-null values for each field
          const hasAnyValues = liquidAssetsAccountIds.reduce((hasValues, accountId) => {
            const account = liquidAssetsData.find(acc => acc.id === accountId);
            if (account) {
              if (account.contributions !== null && account.contributions !== undefined && account.contributions !== '') {
                hasValues.hasContributions = true;
              }
              if (account.employerMatch !== null && account.employerMatch !== undefined && account.employerMatch !== '') {
                hasValues.hasEmployerMatch = true;
              }
              if (account.gains !== null && account.gains !== undefined && account.gains !== '') {
                hasValues.hasGains = true;
              }
              if (account.fees !== null && account.fees !== undefined && account.fees !== '') {
                hasValues.hasFees = true;
              }
              if (account.withdrawals !== null && account.withdrawals !== undefined && account.withdrawals !== '') {
                hasValues.hasWithdrawals = true;
              }
            }
            return hasValues;
          }, { 
            hasContributions: false, hasEmployerMatch: false, hasGains: false, hasFees: false, hasWithdrawals: false
          });

          // Only calculate and update totals for fields that have non-null values in the input
          if (hasAnyValues.hasContributions) {
            const contributionsTotal = liquidAssetsAccountIds.reduce((sum, accountId) => {
              const account = liquidAssetsData.find(acc => acc.id === accountId);
              return sum + (account && account.contributions ? parseFloat(account.contributions) : 0);
            }, 0);
            targetAcctAccount.userData.contributions = contributionsTotal || '';
            targetAcctAccount.entry.contributions = contributionsTotal || '';
          }
          if (hasAnyValues.hasEmployerMatch) {
            const employerMatchTotal = liquidAssetsAccountIds.reduce((sum, accountId) => {
              const account = liquidAssetsData.find(acc => acc.id === accountId);
              return sum + (account && account.employerMatch ? parseFloat(account.employerMatch) : 0);
            }, 0);
            targetAcctAccount.userData.employerMatch = employerMatchTotal || '';
            targetAcctAccount.entry.employerMatch = employerMatchTotal || '';
          }
          if (hasAnyValues.hasGains) {
            const gainsTotal = liquidAssetsAccountIds.reduce((sum, accountId) => {
              const account = liquidAssetsData.find(acc => acc.id === accountId);
              return sum + (account && account.gains ? parseFloat(account.gains) : 0);
            }, 0);
            targetAcctAccount.userData.gains = gainsTotal || '';
            targetAcctAccount.entry.gains = gainsTotal || '';
          }
          if (hasAnyValues.hasFees) {
            const feesTotal = liquidAssetsAccountIds.reduce((sum, accountId) => {
              const account = liquidAssetsData.find(acc => acc.id === accountId);
              return sum + (account && account.fees ? parseFloat(account.fees) : 0);
            }, 0);
            targetAcctAccount.userData.fees = feesTotal || '';
            targetAcctAccount.entry.fees = feesTotal || '';
          }
          if (hasAnyValues.hasWithdrawals) {
            const withdrawalsTotal = liquidAssetsAccountIds.reduce((sum, accountId) => {
              const account = liquidAssetsData.find(acc => acc.id === accountId);
              return sum + (account && account.withdrawals ? parseFloat(account.withdrawals) : 0);
            }, 0);
            targetAcctAccount.userData.withdrawals = withdrawalsTotal || '';
            targetAcctAccount.entry.withdrawals = withdrawalsTotal || '';
          }
          
          // Track detailed update
          targetAcctAccount.userData.lastDetailedUpdate = new Date().toISOString();
          targetAcctAccount.userData.balanceUpdatedFrom = 'liquidAssets-manual-group-detailed-preserve-balance';
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
        console.log(`🆕 SYNC: Creating new account for group ${groupId}: ${targetAccountName}`);
        // Create new Accounts account for this manual group
        const newEntryId = `entry_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        
        // Calculate totals for combined fields from all accounts in group only for detailed updates
        let groupTotals = { contributions: 0, employerMatch: 0, gains: 0, fees: 0, withdrawals: 0 };
        if (updateType === 'detailed') {
          groupTotals = liquidAssetsAccountIds.reduce((totals, accountId) => {
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
        } else if (updateType === 'detailed-group-preserve-balance') {
          // For new accounts with preserve balance, only calculate totals for fields that have non-null values
          const hasAnyValues = liquidAssetsAccountIds.reduce((hasValues, accountId) => {
            const account = liquidAssetsData.find(acc => acc.id === accountId);
            if (account) {
              if (account.contributions !== null && account.contributions !== undefined && account.contributions !== '') {
                hasValues.hasContributions = true;
              }
              if (account.employerMatch !== null && account.employerMatch !== undefined && account.employerMatch !== '') {
                hasValues.hasEmployerMatch = true;
              }
              if (account.gains !== null && account.gains !== undefined && account.gains !== '') {
                hasValues.hasGains = true;
              }
              if (account.fees !== null && account.fees !== undefined && account.fees !== '') {
                hasValues.hasFees = true;
              }
              if (account.withdrawals !== null && account.withdrawals !== undefined && account.withdrawals !== '') {
                hasValues.hasWithdrawals = true;
              }
            }
            return hasValues;
          }, { 
            hasContributions: false, hasEmployerMatch: false, hasGains: false, hasFees: false, hasWithdrawals: false
          });

          // Only calculate totals for fields that have values, leave others as empty string
          groupTotals = {
            contributions: hasAnyValues.hasContributions ? liquidAssetsAccountIds.reduce((sum, accountId) => {
              const account = liquidAssetsData.find(acc => acc.id === accountId);
              return sum + (account && account.contributions ? parseFloat(account.contributions) : 0);
            }, 0) : '',
            employerMatch: hasAnyValues.hasEmployerMatch ? liquidAssetsAccountIds.reduce((sum, accountId) => {
              const account = liquidAssetsData.find(acc => acc.id === accountId);
              return sum + (account && account.employerMatch ? parseFloat(account.employerMatch) : 0);
            }, 0) : '',
            gains: hasAnyValues.hasGains ? liquidAssetsAccountIds.reduce((sum, accountId) => {
              const account = liquidAssetsData.find(acc => acc.id === accountId);
              return sum + (account && account.gains ? parseFloat(account.gains) : 0);
            }, 0) : '',
            fees: hasAnyValues.hasFees ? liquidAssetsAccountIds.reduce((sum, accountId) => {
              const account = liquidAssetsData.find(acc => acc.id === accountId);
              return sum + (account && account.fees ? parseFloat(account.fees) : 0);
            }, 0) : '',
            withdrawals: hasAnyValues.hasWithdrawals ? liquidAssetsAccountIds.reduce((sum, accountId) => {
              const account = liquidAssetsData.find(acc => acc.id === accountId);
              return sum + (account && account.withdrawals ? parseFloat(account.withdrawals) : 0);
            }, 0) : ''
          };
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
              accountName: targetAccountName,
              accountType: 'Combined', // Generic type for manual groups
              investmentCompany: 'Multiple', // Generic company for combined accounts
              balance: updateType === 'detailed-group-preserve-balance' ? (existingAccount?.userData?.balance || totalBalance) : totalBalance,
              contributions: (updateType === 'detailed' || updateType === 'detailed-group-preserve-balance') ? (groupTotals.contributions || '') : '',
              employerMatch: (updateType === 'detailed' || updateType === 'detailed-group-preserve-balance') ? (groupTotals.employerMatch || '') : '',
              gains: (updateType === 'detailed' || updateType === 'detailed-group-preserve-balance') ? (groupTotals.gains || '') : '',
              fees: (updateType === 'detailed' || updateType === 'detailed-group-preserve-balance') ? (groupTotals.fees || '') : '',
              withdrawals: (updateType === 'detailed' || updateType === 'detailed-group-preserve-balance') ? (groupTotals.withdrawals || '') : '',
              balanceUpdatedFrom: updateType === 'detailed' ? 'liquidAssets-manual-group-detailed' : 
                                 updateType === 'detailed-group-preserve-balance' ? 'liquidAssets-manual-group-detailed-preserve-balance' : 
                                 'liquidAssets-manual-group-balance-only',
              balanceUpdatedAt: updateType === 'detailed-group-preserve-balance' ? (existingAccount?.userData?.balanceUpdatedAt || new Date().toISOString()) : new Date().toISOString(),
              lastUpdateType: updateType,
              lastDetailedUpdate: (updateType === 'detailed' || updateType === 'detailed-group-preserve-balance') ? new Date().toISOString() : undefined,
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
    syncMethod: updateMode === 'individual' ? 'individual-mode' : 
                (manualGroupCount > 0 ? 'manual-groups' : 'individual-fallback'),
    updateMode: updateMode,
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
  // Clear out old accounts and liquidAssets entries to refresh with current data
  sharedAccounts.filter(acc => 
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

