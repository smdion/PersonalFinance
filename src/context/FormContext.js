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
    setFormDataState(initialFormData);
  }, []);

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
    let budgetCategories = getBudgetData();
    const existingCategoryIndex = budgetCategories.findIndex(cat => cat.id === 'budget-impacting');
    
    // Create the budget impacting contributions items
    let budgetItems = [];
    
    // Add your contributions
    budgetItems = budgetItems.concat(
      createBudgetItemsForPerson(formData.yourBudgetImpacting, 'your', 'Your')
    );

    // Add spouse contributions if dual calculator is enabled
    if (formData.showSpouseCalculator) {
      budgetItems = budgetItems.concat(
        createBudgetItemsForPerson(formData.spouseBudgetImpacting, 'spouse', 'Spouse')
      );
    }

    // Only create/update the category if there are items to show
    if (budgetItems.length > 0) {
      const budgetImpactingCategory = {
        id: 'budget-impacting',
        name: 'Budget Impacting Contributions',
        isAutoManaged: true,
        items: budgetItems
      };

      let updatedCategories;
      if (existingCategoryIndex >= 0) {
        updatedCategories = [...budgetCategories];
        updatedCategories[existingCategoryIndex] = budgetImpactingCategory;
      } else {
        updatedCategories = [budgetImpactingCategory, ...budgetCategories];
      }

      setBudgetData(updatedCategories);
      window.dispatchEvent(new CustomEvent('budgetDataUpdated'));
    } else if (existingCategoryIndex >= 0) {
      const updatedCategories = budgetCategories.filter(cat => cat.id !== 'budget-impacting');
      setBudgetData(updatedCategories);
      window.dispatchEvent(new CustomEvent('budgetDataUpdated'));
    }
  }, [formData.yourBudgetImpacting, formData.spouseBudgetImpacting, formData.showSpouseCalculator, createBudgetItemsForPerson]);

  // Run sync immediately on mount
  useEffect(() => {
    syncBudgetCategories();
  }, []);

  // Debounced sync to prevent excessive updates
  useEffect(() => {
    const timer = setTimeout(() => {
      syncBudgetCategories();
    }, 100);

    return () => clearTimeout(timer);
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