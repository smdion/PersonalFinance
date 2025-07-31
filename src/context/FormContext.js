import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { getFormData, setFormData, setBudgetData, getBudgetData, getPaycheckData, setPaycheckData } from '../utils/localStorage';

export const FormContext = createContext();

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
};

export const FormProvider = ({ children }) => {
  // Initialize with saved data or defaults
  const initialFormData = {
    combinedMonthlyTakeHome: 0,
    combinedTakeHomePerPayPeriod: 0,
    biWeeklyType: 'even' // 'even' or 'odd'
  };

  const initialBudgetImpacting = {
    traditionalIraMonthly: 0,
    rothIraMonthly: 0,
    brokerageAccounts: [], // Array of {id, name, monthlyAmount} objects
  };

  const [formData, setFormDataState] = useState(() => {
    const savedData = getFormData();
    return { ...initialFormData, ...savedData };
  });

  // Get budget impacting data from paycheck data
  const [budgetImpactingData, setBudgetImpactingData] = useState(() => {
    const paycheckData = getPaycheckData();
    return {
      yourBudgetImpacting: paycheckData?.your?.budgetImpacting || initialBudgetImpacting,
      spouseBudgetImpacting: paycheckData?.spouse?.budgetImpacting || initialBudgetImpacting
    };
  });

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    setFormData(formData);
  }, [formData]);

  // Save budget impacting data to paycheck data whenever it changes
  useEffect(() => {
    const paycheckData = getPaycheckData();
    const updatedPaycheckData = {
      ...paycheckData,
      your: {
        ...paycheckData.your,
        budgetImpacting: budgetImpactingData.yourBudgetImpacting
      },
      spouse: {
        ...paycheckData.spouse,
        budgetImpacting: budgetImpactingData.spouseBudgetImpacting
      }
    };
    setPaycheckData(updatedPaycheckData);
  }, [budgetImpactingData]);

  const updateFormData = useCallback((key, value) => {
    setFormDataState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateBudgetImpacting = useCallback((person, contributions) => {
    const key = person === 'your' ? 'yourBudgetImpacting' : 'spouseBudgetImpacting';
    setBudgetImpactingData((prev) => ({ ...prev, [key]: contributions }));
  }, []);

  const addBrokerageAccount = useCallback((person, accountName = 'New Brokerage Account') => {
    const key = person === 'your' ? 'yourBudgetImpacting' : 'spouseBudgetImpacting';
    setBudgetImpactingData((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        brokerageAccounts: [
          ...(prev[key]?.brokerageAccounts || []),
          {
            id: Date.now() + Math.random(),
            name: accountName,
            monthlyAmount: 0
          }
        ]
      }
    }));
  }, []);

  const updateBrokerageAccount = useCallback((person, accountId, field, value) => {
    const key = person === 'your' ? 'yourBudgetImpacting' : 'spouseBudgetImpacting';
    setBudgetImpactingData((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        brokerageAccounts: (prev[key]?.brokerageAccounts || []).map(account =>
          account.id === accountId
            ? { ...account, [field]: value }
            : account
        )
      }
    }));
  }, []);

  const removeBrokerageAccount = useCallback((person, accountId) => {
    const key = person === 'your' ? 'yourBudgetImpacting' : 'spouseBudgetImpacting';
    setBudgetImpactingData((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        brokerageAccounts: (prev[key]?.brokerageAccounts || []).filter(account => account.id !== accountId)
      }
    }));
  }, []);

  const resetFormData = useCallback(() => {
    try {
      // Reset to initial empty state
      setFormDataState(initialFormData);
      
      // Clear from localStorage
      setFormData({});
    } catch (error) {
      console.error('Error resetting form context data:', error);
    }
  }, [initialFormData]);

  // Add global reset listener
  useEffect(() => {
    const handleResetAll = () => {
      resetFormData();
    };

    window.addEventListener('resetAllData', handleResetAll);
    
    return () => {
      window.removeEventListener('resetAllData', handleResetAll);
    };
  }, [resetFormData]);

  // Helper function to create budget items for a person
  const createBudgetItemsForPerson = useCallback((personData, personPrefix, personLabel) => {
    const items = [];
    
    // Add traditional IRA and Roth IRA if they have values
    const iraContributions = [
      { key: 'traditionalIraMonthly', label: 'Traditional IRA' },
      { key: 'rothIraMonthly', label: 'Roth IRA' }
    ];

    iraContributions.forEach(({ key, label }) => {
      if (personData[key] > 0) {
        items.push({
          id: `${personPrefix}-${key.replace('Monthly', '').replace(/([A-Z])/g, '-$1').toLowerCase()}`,
          name: `${personLabel} ${label}`,
          standard: personData[key],
          tight: personData[key],
          emergency: personData[key]
        });
      }
    });

    // Add brokerage accounts
    if (personData.brokerageAccounts && Array.isArray(personData.brokerageAccounts)) {
      personData.brokerageAccounts.forEach((account) => {
        if (account.monthlyAmount > 0) {
          items.push({
            id: `${personPrefix}-brokerage-${account.id}`,
            name: `${personLabel} ${account.name}`,
            standard: account.monthlyAmount,
            tight: account.monthlyAmount,
            emergency: account.monthlyAmount
          });
        }
      });
    }

    return items;
  }, []);

  // Function to sync budget categories with budget impacting contributions
  const syncBudgetCategories = useCallback(() => {
    // Get paycheck data to access current names
    const { getPaycheckData } = require('../utils/localStorage');
    const paycheckData = getPaycheckData();
    
    let budgetCategories = getBudgetData();
    
    const existingCategoryIndex = budgetCategories.findIndex(cat => cat.id === 'budget-impacting');
    
    // Create the budget impacting contributions items with CURRENT names
    let budgetItems = [];
    
    // Add your contributions with actual current name
    const yourName = paycheckData?.your?.name?.trim() || 'Your';
    budgetItems = budgetItems.concat(
      createBudgetItemsForPerson(budgetImpactingData.yourBudgetImpacting, 'your', yourName)
    );

    // Add spouse contributions ONLY if dual calculator is enabled with actual current name
    const showSpouseCalculator = paycheckData?.settings?.showSpouseCalculator ?? true;
    if (showSpouseCalculator) {
      const spouseName = paycheckData?.spouse?.name?.trim() || 'Spouse';
      budgetItems = budgetItems.concat(
        createBudgetItemsForPerson(budgetImpactingData.spouseBudgetImpacting, 'spouse', spouseName)
      );
    }

    // Always update the category if there are items OR if it already exists
    if (budgetItems.length > 0 || existingCategoryIndex >= 0) {
      const budgetCategory = {
        id: 'budget-impacting',
        name: 'Budget Impacting Contributions',
        isAutoManaged: true,
        items: budgetItems
      };

      if (existingCategoryIndex >= 0) {
        budgetCategories[existingCategoryIndex] = budgetCategory;
      } else {
        budgetCategories = [budgetCategory, ...budgetCategories];
      }
    } else {
      // Remove the category if no items
      if (existingCategoryIndex >= 0) {
        budgetCategories = budgetCategories.filter(cat => cat.id !== 'budget-impacting');
      }
    }

    // Save updated budget categories
    setBudgetData(budgetCategories);
    
    // Dispatch event to notify components
    window.dispatchEvent(new CustomEvent('budgetDataUpdated', { detail: budgetCategories }));
  }, [budgetImpactingData.yourBudgetImpacting, budgetImpactingData.spouseBudgetImpacting, createBudgetItemsForPerson]);

  // Run sync with a slight delay to ensure all data is loaded
  useEffect(() => {
    const timer = setTimeout(() => {
      syncBudgetCategories();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Sync when budget impacting data changes with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      syncBudgetCategories();
    }, 50);
    
    return () => clearTimeout(timer);
  }, [budgetImpactingData.yourBudgetImpacting, budgetImpactingData.spouseBudgetImpacting]);


  // Add effect to listen for paycheck data updates and re-sync names
  useEffect(() => {
    const handlePaycheckDataUpdate = () => {
      // Small delay to ensure paycheck data is saved
      setTimeout(() => {
        syncBudgetCategories();
      }, 100);
    };

    // Also listen for name mapping updates to re-sync budget categories
    const handleNameMappingUpdate = () => {
      setTimeout(() => {
        syncBudgetCategories();
      }, 100);
    };

    window.addEventListener('paycheckDataUpdated', handlePaycheckDataUpdate);
    window.addEventListener('nameMappingUpdated', handleNameMappingUpdate);
    
    return () => {
      window.removeEventListener('paycheckDataUpdated', handlePaycheckDataUpdate);
      window.removeEventListener('nameMappingUpdated', handleNameMappingUpdate);
    };
  }, [syncBudgetCategories]);

  const value = {
    formData: {
      ...formData,
      yourBudgetImpacting: budgetImpactingData.yourBudgetImpacting,
      spouseBudgetImpacting: budgetImpactingData.spouseBudgetImpacting,
      showSpouseCalculator: (() => {
        const paycheckData = getPaycheckData();
        return paycheckData?.settings?.showSpouseCalculator ?? true;
      })()
    }, 
    updateFormData, 
    updateBudgetImpacting, 
    addBrokerageAccount,
    updateBrokerageAccount,
    removeBrokerageAccount,
    resetFormData
  };

  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
};