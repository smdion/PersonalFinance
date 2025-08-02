// Personal Finance App Data Structure Migration Utilities
// Converts old nested structure to normalized array-based structure

// Generate consistent IDs for entities
const generateId = (prefix, index = null) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return index !== null ? `${prefix}-${index}-${random}` : `${prefix}-${random}`;
};

// Convert users from paycheckData.user1/user2 to normalized users array
const convertUsers = (oldData) => {
  const users = [
    {
      id: "user0",
      name: "Joint"
    }
  ];

  // Convert user1 (Sean Dion)
  if (oldData.paycheckData?.user1) {
    const user1 = oldData.paycheckData.user1;
    users.push({
      id: "user1",
      name: user1.name || "User 1",
      employer: user1.employer || "",
      birthday: user1.birthday || "",
      paycheck: {
        salary: user1.salary || 0,
        payPeriod: user1.payPeriod || "biWeekly",
        filingStatus: user1.filingStatus || "single",
        w4Type: user1.w4Type || "new",
        w4Options: user1.w4Options || {},
        retirementOptions: user1.retirementOptions || {},
        medicalDeductions: user1.medicalDeductions || {},
        esppDeductionPercent: user1.esppDeductionPercent || 0,
        bonusTarget: user1.bonusTarget || 0,
        bonusMultiplier: user1.bonusMultiplier || 0,
        hsaCoverageType: user1.hsaCoverageType || "self",
        payWeekType: user1.payWeekType || "odd"
      },
      retirement: oldData.retirementData?.user1 || {
        ageAtRetirement: 65,
        ageOfDeath: 95,
        raisesInRetirement: 2
      },
      budgetImpacting: {
        traditionalIraMonthly: 0,
        rothIraMonthly: 0,
        brokerageAccounts: []
      }
    });
  }

  // Convert user2 (Joanna Dion)
  if (oldData.paycheckData?.user2) {
    const user2 = oldData.paycheckData.user2;
    users.push({
      id: "user2", 
      name: user2.name || "User 2",
      employer: user2.employer || "",
      birthday: user2.birthday || "",
      paycheck: {
        salary: user2.salary || 0,
        payPeriod: user2.payPeriod || "biWeekly",
        filingStatus: user2.filingStatus || "single",
        w4Type: user2.w4Type || "new",
        w4Options: user2.w4Options || {},
        retirementOptions: user2.retirementOptions || {},
        medicalDeductions: user2.medicalDeductions || {},
        esppDeductionPercent: user2.esppDeductionPercent || 0,
        bonusTarget: user2.bonusTarget || 0,
        bonusMultiplier: user2.bonusMultiplier || 0,
        hsaCoverageType: user2.hsaCoverageType || "self",
        payWeekType: user2.payWeekType || "even"
      },
      retirement: oldData.retirementData?.user2 || {
        ageAtRetirement: 65,
        ageOfDeath: 95,
        raisesInRetirement: 2
      },
      budgetImpacting: {
        traditionalIraMonthly: 0,
        rothIraMonthly: 0,
        brokerageAccounts: []
      }
    });
  }

  return users;
};

// Convert budget data from nested structure to normalized arrays
const convertBudgetData = (oldData) => {
  const budgetCategories = [];
  const budgetItems = [];

  if (!oldData.budgetData || !Array.isArray(oldData.budgetData)) {
    return { budgetCategories, budgetItems };
  }

  // Convert each budget category and its items
  oldData.budgetData.forEach((category, categoryIndex) => {
    // Create budget category
    const categoryId = `budget-category-${categoryIndex + 1}`;
    budgetCategories.push({
      id: categoryId,
      name: category.name,
      order: categoryIndex + 1,
      isAutoManaged: category.isAutoManaged || false
    });

    // Convert budget items for this category
    if (category.items && Array.isArray(category.items)) {
      category.items.forEach((item, itemIndex) => {
        // Determine userId based on item name or ID patterns
        let userId = "user0"; // Default to Joint
        const itemIdStr = String(item.id || "");
        if (item.name?.includes("Sean") || itemIdStr.includes("user1")) {
          userId = "user1";
        } else if (item.name?.includes("Joanna") || itemIdStr.includes("user2")) {
          userId = "user2";
        }

        budgetItems.push({
          id: `budget-item-${categoryIndex + 1}-${itemIndex + 1}`,
          userId: userId,
          name: item.name,
          categoryId: categoryId,
          amounts: {
            standard: item.standard || 0,
            tight: item.tight || 0,
            emergency: item.emergency || 0
          }
        });
      });
    }
  });

  return { budgetCategories, budgetItems };
};

// Convert account data from scattered objects to normalized structure
const convertAccountData = (oldData) => {
  const accounts = [];
  const subAccounts = [];

  // Convert liquidAssetsAccounts
  if (oldData.liquidAssetsAccounts && Array.isArray(oldData.liquidAssetsAccounts)) {
    oldData.liquidAssetsAccounts.forEach((account, index) => {
      const accountId = `account-${index + 1}`;
      
      // Map owner references to user IDs
      let ownerId = "user0";
      if (account.owner === "user1") ownerId = "user1";
      if (account.owner === "user2") ownerId = "user2";

      accounts.push({
        id: accountId,
        name: account.accountName || `Account ${index + 1}`,
        type: account.accountType || "Unknown",
        ownerId: ownerId,
        provider: account.investmentCompany || "",
        balance: account.balance || 0,
        balanceUpdatedAt: account.balanceUpdatedAt || null,
        createdAt: account.createdAt || new Date().toISOString()
      });
    });
  }

  return { accounts, subAccounts };
};

// Convert annual/historical data to normalized structure
const convertAnnualData = (oldData) => {
  const annualData = [];

  // Look for historical data patterns (hist_YYYY_*, annual data, etc.)
  Object.keys(oldData).forEach(key => {
    if (key.startsWith('hist_') || key.includes('annual') || key.match(/\d{4}/)) {
      const data = oldData[key];
      if (data && typeof data === 'object') {
        // Extract year from key
        const yearMatch = key.match(/(\d{4})/);
        const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

        annualData.push({
          id: `annual-${year}`,
          year: year,
          data: data,
          source: key
        });
      }
    }
  });

  return annualData;
};

// Main migration function - converts old structure to new normalized structure
const migrateDataStructure = (oldData) => {
  console.log('Starting data structure migration...');
  
  // Validate input
  if (!oldData || typeof oldData !== 'object') {
    throw new Error('Invalid data provided for migration');
  }

  // Convert each data type
  const users = convertUsers(oldData);
  const { budgetCategories, budgetItems } = convertBudgetData(oldData);
  const { accounts, subAccounts } = convertAccountData(oldData);
  const annualData = convertAnnualData(oldData);

  // Build new normalized structure
  const newData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      version: "3.0.0",
      dataSource: "migrated-from-v2",
      originalVersion: oldData.version || "2.0.0",
      migrationTimestamp: new Date().toISOString()
    },
    users,
    budgetCategories,
    budgetItems,
    accounts,
    subAccounts,
    annualData
  };

  // Preserve any additional data from old structure
  const preservedFields = ['primaryHomeData', 'savingsData', 'liquidAssetsRecords'];
  preservedFields.forEach(field => {
    if (oldData[field]) {
      newData[field] = oldData[field];
    }
  });

  console.log(`Migration completed: ${users.length} users, ${budgetCategories.length} categories, ${budgetItems.length} items, ${accounts.length} accounts`);
  
  return newData;
};

// Check if data is in old format (needs migration)
const isOldFormat = (data) => {
  if (!data || typeof data !== 'object') return false;
  
  // Check for old structure indicators
  const hasOldStructure = (
    data.paycheckData || // Old user structure
    (data.budgetData && Array.isArray(data.budgetData) && data.budgetData.some(cat => cat.items)) || // Old budget structure
    !data.users // Missing new structure
  );

  const hasNewStructure = (
    data.users && Array.isArray(data.users) &&
    data.budgetCategories && Array.isArray(data.budgetCategories) &&
    data.budgetItems && Array.isArray(data.budgetItems)
  );

  return hasOldStructure && !hasNewStructure;
};

// Validate migrated data integrity
const validateMigration = (originalData, migratedData) => {
  const issues = [];

  // Check user count
  const originalUserCount = (originalData.paycheckData?.user1 ? 1 : 0) + (originalData.paycheckData?.user2 ? 1 : 0);
  const migratedUserCount = migratedData.users?.length - 1 || 0; // Subtract 1 for Joint user
  if (originalUserCount !== migratedUserCount) {
    issues.push(`User count mismatch: original ${originalUserCount}, migrated ${migratedUserCount}`);
  }

  // Check budget categories
  const originalCategoryCount = originalData.budgetData?.length || 0;
  const migratedCategoryCount = migratedData.budgetCategories?.length || 0;
  if (originalCategoryCount !== migratedCategoryCount) {
    issues.push(`Budget category count mismatch: original ${originalCategoryCount}, migrated ${migratedCategoryCount}`);
  }

  // Check budget items
  const originalItemCount = originalData.budgetData?.reduce((sum, cat) => sum + (cat.items?.length || 0), 0) || 0;
  const migratedItemCount = migratedData.budgetItems?.length || 0;
  if (originalItemCount !== migratedItemCount) {
    issues.push(`Budget item count mismatch: original ${originalItemCount}, migrated ${migratedItemCount}`);
  }

  return {
    isValid: issues.length === 0,
    issues
  };
};

export {
  migrateDataStructure,
  isOldFormat,
  validateMigration,
  convertUsers,
  convertBudgetData,
  convertAccountData,
  convertAnnualData
};