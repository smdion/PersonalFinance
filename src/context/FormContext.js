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
    console.log('syncBudgetCategories called with:', {
      yourBudgetImpacting: formData.yourBudgetImpacting,
      spouseBudgetImpacting: formData.spouseBudgetImpacting,
      showSpouseCalculator: formData.showSpouseCalculator
    });

    // Get paycheck data to access names
    const { getPaycheckData } = require('../utils/localStorage');
    const paycheckData = getPaycheckData();
    
    let budgetCategories = getBudgetData();
    console.log('Current budget categories:', budgetCategories);
    
    const existingCategoryIndex = budgetCategories.findIndex(cat => cat.id === 'budget-impacting');
    
    // Create the budget impacting contributions items
    let budgetItems = [];
    
    // Add your contributions with actual name
    const yourName = paycheckData?.your?.name || 'Your';
    budgetItems = budgetItems.concat(
      createBudgetItemsForPerson(formData.yourBudgetImpacting, 'your', yourName)
    );

    // Add spouse contributions if dual calculator is enabled with actual name
    if (formData.showSpouseCalculator) {
      const spouseName = paycheckData?.spouse?.name || 'Spouse';
      budgetItems = budgetItems.concat(
        createBudgetItemsForPerson(formData.spouseBudgetImpacting, 'spouse', spouseName)
      );
    }

    console.log('Generated budget items:', budgetItems);

    // Only create/update the category if there are items OR if it already exists
    if (budgetItems.length > 0 || existingCategoryIndex >= 0) {
      const budgetImpactingCategory = {
        id: 'budget-impacting',
        name: 'Budget Impacting Contributions',
        isAutoManaged: true,
        items: budgetItems
      };

      // Update or add the category
      if (existingCategoryIndex >= 0) {
        budgetCategories[existingCategoryIndex] = budgetImpactingCategory;
        console.log('Updated existing category at index:', existingCategoryIndex);
      } else {
        budgetCategories.unshift(budgetImpactingCategory); // Add at the beginning
        console.log('Added new category at beginning');
      }
    } else if (existingCategoryIndex >= 0) {
      // Remove the category if no items and it exists
      budgetCategories.splice(existingCategoryIndex, 1);
      console.log('Removed empty category');
    }

    console.log('Final budget categories:', budgetCategories);

    // Save updated budget categories
    setBudgetData(budgetCategories);
    
    // Dispatch event to notify components
    window.dispatchEvent(new CustomEvent('budgetDataUpdated', { detail: budgetCategories }));
    console.log('Budget data updated and event dispatched');
  }, [formData.yourBudgetImpacting, formData.spouseBudgetImpacting, formData.showSpouseCalculator, createBudgetItemsForPerson]);

  // Run sync with a slight delay to ensure all data is loaded
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Initial sync on mount');
      syncBudgetCategories();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Sync when budget impacting data changes with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Sync triggered by data change');
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

        console.log('Loaded budget impacting from paycheck data:', {
          your: paycheckData?.your?.budgetImpacting,
          spouse: paycheckData?.spouse?.budgetImpacting
        });
      } catch (error) {
        console.error('Error loading budget impacting from paycheck data:', error);
      }
    };

    loadBudgetImpactingFromPaycheck();
  }, []);

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