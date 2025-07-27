import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { getFormData, setFormData, setBudgetData, getBudgetData } from '../utils/localStorage';

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
    biWeeklyType: 'even', // 'even' or 'odd'
    yourBudgetImpacting: {
      traditionalIraMonthly: 0,
      rothIraMonthly: 0,
      retirementBrokerageMonthly: 0,
      longTermSavingsMonthly: 0, // Changed from longtermSavingsMonthly
    },
    spouseBudgetImpacting: {
      traditionalIraMonthly: 0,
      rothIraMonthly: 0,
      retirementBrokerageMonthly: 0,
      longTermSavingsMonthly: 0, // Changed from longtermSavingsMonthly
    },
    showSpouseCalculator: true,
  };

  const [formData, setFormDataState] = useState(() => {
    const savedData = getFormData();
    return { ...initialFormData, ...savedData };
  });

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    setFormData(formData);
  }, [formData]);

  const updateFormData = useCallback((key, value) => {
    setFormDataState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateBudgetImpacting = useCallback((person, contributions) => {
    const key = person === 'your' ? 'yourBudgetImpacting' : 'spouseBudgetImpacting';
    setFormDataState((prev) => ({ ...prev, [key]: contributions }));
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
    const contributions = [
      { key: 'traditionalIraMonthly', label: 'Traditional IRA' },
      { key: 'rothIraMonthly', label: 'Roth IRA' },
      { key: 'retirementBrokerageMonthly', label: 'Retirement Brokerage' },
      { key: 'longTermSavingsMonthly', label: 'Long-Term Savings' }
    ];

    contributions.forEach(({ key, label }) => {
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
      createBudgetItemsForPerson(formData.yourBudgetImpacting, 'your', yourName)
    );

    // Add spouse contributions ONLY if dual calculator is enabled with actual current name
    if (formData.showSpouseCalculator) {
      const spouseName = paycheckData?.spouse?.name?.trim() || 'Spouse';
      budgetItems = budgetItems.concat(
        createBudgetItemsForPerson(formData.spouseBudgetImpacting, 'spouse', spouseName)
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
  }, [formData.yourBudgetImpacting, formData.spouseBudgetImpacting, formData.showSpouseCalculator, createBudgetItemsForPerson]);

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
  }, [formData.yourBudgetImpacting, formData.spouseBudgetImpacting, formData.showSpouseCalculator]);

  // Add effect to load budget impacting data from paycheck data
  useEffect(() => {
    const loadBudgetImpactingFromPaycheck = () => {
      try {
        const { getPaycheckData } = require('../utils/localStorage');
        const paycheckData = getPaycheckData();
        
        if (paycheckData?.your?.budgetImpacting) {
          const yourContributions = paycheckData.your.budgetImpacting;
          if (typeof yourContributions === 'object') {
            setFormDataState(prev => ({
              ...prev,
              yourBudgetImpacting: {
                traditionalIraMonthly: yourContributions.traditionalIraMonthly || 0,
                rothIraMonthly: yourContributions.rothIraMonthly || 0,
                retirementBrokerageMonthly: yourContributions.retirementBrokerageMonthly || 0,
                longTermSavingsMonthly: yourContributions.longTermSavingsMonthly || 0
              }
            }));
          }
        }
        
        if (paycheckData?.spouse?.budgetImpacting) {
          const spouseContributions = paycheckData.spouse.budgetImpacting;
          if (typeof spouseContributions === 'object') {
            setFormDataState(prev => ({
              ...prev,
              spouseBudgetImpacting: {
                traditionalIraMonthly: spouseContributions.traditionalIraMonthly || 0,
                rothIraMonthly: spouseContributions.rothIraMonthly || 0,
                retirementBrokerageMonthly: spouseContributions.retirementBrokerageMonthly || 0,
                longTermSavingsMonthly: spouseContributions.longTermSavingsMonthly || 0
              }
            }));
          }
        }
      } catch (error) {
        // Silent error handling in production
      }
    };

    loadBudgetImpactingFromPaycheck();
  }, []);

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
    formData, 
    updateFormData, 
    updateBudgetImpacting, 
    resetFormData
  };

  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
};