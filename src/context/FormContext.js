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
      longtermSavingsMonthly: 0,
    },
    spouseBudgetImpacting: {
      traditionalIraMonthly: 0,
      rothIraMonthly: 0,
      retirementBrokerageMonthly: 0,
      longtermSavingsMonthly: 0,
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

  // Function to sync budget categories with budget impacting contributions
  const syncBudgetCategories = useCallback(() => {
    let budgetCategories = getBudgetData();
    const existingCategoryIndex = budgetCategories.findIndex(cat => cat.id === 'budget-impacting');
    
    // Create the budget impacting contributions items
    const budgetItems = [];
    
    // Add your contributions
    if (formData.yourBudgetImpacting.traditionalIraMonthly > 0) {
      budgetItems.push({
        id: 'your-traditional-ira',
        name: 'Your Traditional IRA',
        standard: formData.yourBudgetImpacting.traditionalIraMonthly,
        tight: formData.yourBudgetImpacting.traditionalIraMonthly,
        emergency: formData.yourBudgetImpacting.traditionalIraMonthly
      });
    }
    
    if (formData.yourBudgetImpacting.rothIraMonthly > 0) {
      budgetItems.push({
        id: 'your-roth-ira',
        name: 'Your Roth IRA',
        standard: formData.yourBudgetImpacting.rothIraMonthly,
        tight: formData.yourBudgetImpacting.rothIraMonthly,
        emergency: formData.yourBudgetImpacting.rothIraMonthly
      });
    }
    
    if (formData.yourBudgetImpacting.retirementBrokerageMonthly > 0) {
      budgetItems.push({
        id: 'your-retirement-brokerage',
        name: 'Your Retirement Brokerage',
        standard: formData.yourBudgetImpacting.retirementBrokerageMonthly,
        tight: formData.yourBudgetImpacting.retirementBrokerageMonthly,
        emergency: formData.yourBudgetImpacting.retirementBrokerageMonthly
      });
    }
    
    if (formData.yourBudgetImpacting.longtermSavingsMonthly > 0) {
      budgetItems.push({
        id: 'your-longterm-savings',
        name: 'Your Long-Term Savings',
        standard: formData.yourBudgetImpacting.longtermSavingsMonthly,
        tight: formData.yourBudgetImpacting.longtermSavingsMonthly,
        emergency: formData.yourBudgetImpacting.longtermSavingsMonthly
      });
    }

    // Add spouse contributions if dual calculator is enabled
    if (formData.showSpouseCalculator) {
      if (formData.spouseBudgetImpacting.traditionalIraMonthly > 0) {
        budgetItems.push({
          id: 'spouse-traditional-ira',
          name: 'Spouse Traditional IRA',
          standard: formData.spouseBudgetImpacting.traditionalIraMonthly,
          tight: formData.spouseBudgetImpacting.traditionalIraMonthly,
          emergency: formData.spouseBudgetImpacting.traditionalIraMonthly
        });
      }
      
      if (formData.spouseBudgetImpacting.rothIraMonthly > 0) {
        budgetItems.push({
          id: 'spouse-roth-ira',
          name: 'Spouse Roth IRA',
          standard: formData.spouseBudgetImpacting.rothIraMonthly,
          tight: formData.spouseBudgetImpacting.rothIraMonthly,
          emergency: formData.spouseBudgetImpacting.rothIraMonthly
        });
      }
      
      if (formData.spouseBudgetImpacting.retirementBrokerageMonthly > 0) {
        budgetItems.push({
          id: 'spouse-retirement-brokerage',
          name: 'Spouse Retirement Brokerage',
          standard: formData.spouseBudgetImpacting.retirementBrokerageMonthly,
          tight: formData.spouseBudgetImpacting.retirementBrokerageMonthly,
          emergency: formData.spouseBudgetImpacting.retirementBrokerageMonthly
        });
      }
      
      if (formData.spouseBudgetImpacting.longtermSavingsMonthly > 0) {
        budgetItems.push({
          id: 'spouse-longterm-savings',
          name: 'Spouse Long-Term Savings',
          standard: formData.spouseBudgetImpacting.longtermSavingsMonthly,
          tight: formData.spouseBudgetImpacting.longtermSavingsMonthly,
          emergency: formData.spouseBudgetImpacting.longtermSavingsMonthly
        });
      }
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
  }, [formData.yourBudgetImpacting, formData.spouseBudgetImpacting, formData.showSpouseCalculator]);

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