import React, { useContext, useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { FormContext } from '../context/FormContext';
import { getBudgetData, setBudgetData, getPaycheckData, getSavingsData, getIsResettingAllData } from '../utils/localStorage';
import { calculateExtraPaycheckIncome, generateDataFilename } from '../utils/calculationHelpers';
import Navigation from './Navigation';

// Define empty budget categories constant
const EMPTY_BUDGET_CATEGORIES = [];

const BudgetForm = () => {
  const { formData, resetFormData } = useContext(FormContext);
  
  // Remove settings menu state and ref
  
  // Budget state management
  const [budgetCategories, setBudgetCategories] = useState([]);
  const [activeBudgetMode, setActiveBudgetMode] = useState('standard');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());
  
  // State for savings removal confirmation dialog
  const [savingsRemovalConfirmation, setSavingsRemovalConfirmation] = useState(null);
  
  // Add state for paycheck data
  const [paycheckData, setPaycheckData] = useState(null);

  // Add data migration function to handle old budget data format
  const migrateBudgetData = (data) => {
    if (!Array.isArray(data)) return data;
    
    return data.map(category => {
      if (!category.items) return category;
      
      const migratedItems = category.items.map(item => {
        // Check if item uses old format with nested amounts
        if (item.amounts && typeof item.amounts === 'object') {
          return {
            ...item,
            standard: item.amounts.standard || 0,
            tight: item.amounts.tight || 0,
            emergency: item.amounts.emergency || 0,
            // Remove the old amounts object
            amounts: undefined
          };
        }
        
        // Item is already in new format or needs default values
        return {
          ...item,
          standard: item.standard || 0,
          tight: item.tight || 0,
          emergency: item.emergency || 0
        };
      });
      
      return {
        ...category,
        items: migratedItems
      };
    });
  };
  
  // Load budget data from localStorage on mount and listen for updates
  useEffect(() => {
    const loadBudgetData = () => {
      try {
        const savedData = getBudgetData();
        if (savedData && savedData.length > 0) {
          // Migrate data to ensure compatibility
          const migratedData = migrateBudgetData(savedData);
          setBudgetCategories(migratedData);
          
          // Save migrated data back to localStorage if migration occurred
          if (JSON.stringify(migratedData) !== JSON.stringify(savedData)) {
            setBudgetData(migratedData);
          }          
        } else {
          // Initialize with empty budget categories instead of hardcoded defaults
          setBudgetCategories(EMPTY_BUDGET_CATEGORIES);
          setBudgetData(EMPTY_BUDGET_CATEGORIES);
        }
      } catch (error) {
        console.error('Error loading budget data:', error);
        // Reset to empty categories on error
        setBudgetCategories(EMPTY_BUDGET_CATEGORIES);
      }
    };

    // Load data immediately
    loadBudgetData();

    // Listen for budget data updates from FormContext with consistent event handling
    const handleBudgetUpdate = (event) => {
      loadBudgetData();
    };

    window.addEventListener('budgetDataUpdated', handleBudgetUpdate);
    
    return () => {
      window.removeEventListener('budgetDataUpdated', handleBudgetUpdate);
    };
  }, []); // Remove dependencies to prevent re-running

  // Load paycheck data for extra paycheck calculations
  useEffect(() => {
    const loadPaycheckData = () => {
      const savedPaycheckData = getPaycheckData();
      if (savedPaycheckData) {
        setPaycheckData(savedPaycheckData);
      }
    };

    // Load initially
    loadPaycheckData();

    // Listen for paycheck data updates with consistent event handling
    const handlePaycheckUpdate = (event) => {
      loadPaycheckData();
    };

    window.addEventListener('paycheckDataUpdated', handlePaycheckUpdate);
    
    return () => {
      window.removeEventListener('paycheckDataUpdated', handlePaycheckUpdate);
    };
  }, []);

  // Calculate extra paycheck income using the corrected function
  const extraPaycheckInfo = React.useMemo(() => {
    if (!paycheckData) {
      return { totalExtraIncome: 0, extraMonths: [], totalExtraPaychecks: 0, individuals: [] };
    }
    const currentYear = new Date().getFullYear();
    const individuals = [];
    let totalExtraIncome = 0;
    let totalExtraPaychecks = 0;
    const allExtraMonths = new Set();

    // Use actual netTakeHomePaycheck from paycheck calculator, fallback to 0 if missing or invalid
    const getIndividualNetPay = (person) => {
      const val = paycheckData[person]?.netTakeHomePaycheck;
      return (typeof val === 'number' && !isNaN(val) && val > 0) ? val : 0;
    };

    // Calculate for "your" paycheck if data exists
    if (paycheckData.your && paycheckData.your.salary) {
      const yourBiWeeklyType = paycheckData.your.payWeekType || 'even';
      const yourPayPeriod = paycheckData.your.payPeriod || 'biWeekly';
      
      if (yourPayPeriod === 'biWeekly') {
        const yourNetPerPaycheck = getIndividualNetPay('your');
        const yourExtra = calculateExtraPaycheckIncome(yourNetPerPaycheck, yourBiWeeklyType, currentYear);
        
        if (yourExtra.totalExtraPaychecks > 0) {
          individuals.push({
            name: paycheckData.your.name || 'Your',
            ...yourExtra,
            netPerPaycheck: yourNetPerPaycheck
          });
          
          totalExtraIncome += yourExtra.totalExtraIncome;
          totalExtraPaychecks += yourExtra.totalExtraPaychecks;
          yourExtra.extraMonths.forEach(month => allExtraMonths.add(month.name));
        }
      }
    }
    
    // Calculate for spouse if dual mode is enabled and spouse data exists
    if (formData.showSpouseCalculator && paycheckData.spouse && paycheckData.spouse.salary) {
      const spouseBiWeeklyType = paycheckData.spouse.payWeekType || 'even';
      const spousePayPeriod = paycheckData.spouse.payPeriod || 'biWeekly';
      
      if (spousePayPeriod === 'biWeekly') {
        const spouseNetPerPaycheck = getIndividualNetPay('spouse');
        const spouseExtra = calculateExtraPaycheckIncome(spouseNetPerPaycheck, spouseBiWeeklyType, currentYear);
        
        if (spouseExtra.totalExtraPaychecks > 0) {
          individuals.push({
            name: paycheckData.spouse.name || 'Spouse',
            ...spouseExtra,
            netPerPaycheck: spouseNetPerPaycheck
          });
          
          totalExtraIncome += spouseExtra.totalExtraIncome;
          totalExtraPaychecks += spouseExtra.totalExtraPaychecks;
          spouseExtra.extraMonths.forEach(month => allExtraMonths.add(month.name));
        }
      }
    }
    
    return {
      totalExtraIncome,
      totalExtraPaychecks,
      extraMonths: Array.from(allExtraMonths).map(name => ({ name })),
      individuals
    };
  }, [paycheckData, formData.showSpouseCalculator]);

  // Save budget data to localStorage whenever it changes (with error handling)
  useEffect(() => {
    if (budgetCategories && budgetCategories.length > 0) {
      try {
        setBudgetData(budgetCategories);
      } catch (error) {
        console.error('Error saving budget data:', error);
      }
    }
  }, [budgetCategories]);
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const addCategory = () => {
    if (newCategoryName.trim()) {
      const newCategory = {
        id: Date.now(),
        name: newCategoryName.trim(),
        items: []
      };
      setBudgetCategories([...budgetCategories, newCategory]);
      setNewCategoryName('');
      setShowAddCategory(false);
    }
  };

  const deleteCategory = (categoryId) => {
    // Prevent deletion of auto-managed categories
    if (categoryId === 'budget-impacting') {
      alert('This category is automatically managed by your paycheck calculator settings and cannot be deleted.');
      return;
    }
    setBudgetCategories(budgetCategories.filter(cat => cat.id !== categoryId));
  };

  const addItem = (categoryId) => {
    // Prevent adding items to auto-managed categories
    if (categoryId === 'budget-impacting') {
      alert('Items in this category are automatically managed by your paycheck calculator. To add contributions, update your Budget Impacting Contributions in the paycheck calculator.');
      return;
    }
    
    const newItem = {
      id: Date.now(),
      name: 'New Item',
      standard: 0,
      tight: 0,
      emergency: 0
    };
    
    setBudgetCategories(budgetCategories.map(category =>
      category.id === categoryId
        ? { ...category, items: [...category.items, newItem] }
        : category
    ));
  };

  const updateItem = (categoryId, itemId, field, value) => {
    // Prevent editing auto-managed categories
    if (categoryId === 'budget-impacting') {
      alert('Items in this category are automatically managed by your paycheck calculator. To modify contributions, update your Budget Impacting Contributions in the paycheck calculator.');
      return;
    }
    
    const numericValue = field === 'name' ? value : (parseFloat(value) || 0);
    
    setBudgetCategories(budgetCategories.map(category =>
      category.id === categoryId
        ? {
            ...category,
            items: category.items.map(item =>
              item.id === itemId
                ? { ...item, [field]: numericValue }
                : item
            )
          }
        : category
    ));
  };

  const deleteItem = (categoryId, itemId) => {
    // Prevent deleting items from auto-managed categories
    if (categoryId === 'budget-impacting') {
      alert('Items in this category are automatically managed by your paycheck calculator. To remove contributions, update your Budget Impacting Contributions in the paycheck calculator.');
      return;
    }
    
    // Skip savings warnings if we're in the middle of a reset operation
    if (getIsResettingAllData()) {
      performItemDeletion(categoryId, itemId);
      return;
    }
    
    // Check if this item has associated savings goals
    const savingsData = getSavingsData();
    const savingsGoalKey = `${categoryId}-${itemId}`;
    const linkedSavingsGoal = savingsData && savingsData[savingsGoalKey];
    
    if (linkedSavingsGoal) {
      // Check if savings goal has significant data
      const hasSignificantData = 
        (linkedSavingsGoal.currentBalance && linkedSavingsGoal.currentBalance > 1) ||
        Object.keys(linkedSavingsGoal.monthlyContributions || {}).length > 0 ||
        Object.keys(linkedSavingsGoal.monthlyPurchases || {}).length > 0 ||
        (linkedSavingsGoal.purchases && linkedSavingsGoal.purchases.length > 0);
      
      if (hasSignificantData) {
        // Show confirmation dialog
        const category = budgetCategories.find(cat => cat.id === categoryId);
        const item = category?.items.find(itm => itm.id === itemId);
        
        setSavingsRemovalConfirmation({
          categoryId,
          itemId,
          categoryName: category?.name || 'Unknown Category',
          itemName: item?.name || 'Unknown Item',
          savingsGoal: linkedSavingsGoal
        });
        return;
      }
    }
    
    // Proceed with deletion if no significant savings data
    performItemDeletion(categoryId, itemId);
  };
  
  const performItemDeletion = (categoryId, itemId) => {
    setBudgetCategories(budgetCategories.map(category =>
      category.id === categoryId
        ? { ...category, items: category.items.filter(item => item.id !== itemId) }
        : category
    ));
  };

  const calculateTotalByMode = (mode) => {
    return budgetCategories.reduce((total, category) =>
      total + category.items.reduce((catTotal, item) => catTotal + (item[mode] || 0), 0)
    , 0);
  };

  const calculateCategoryTotal = (category, mode) => {
    return category.items.reduce((total, item) => total + (item[mode] || 0), 0);
  };

  const calculateCategoryPercentage = (category, mode) => {
    const categoryTotal = calculateCategoryTotal(category, mode);
    const monthlyNet = formData.combinedMonthlyTakeHome;
    
    if (monthlyNet <= 0) return 0;
    return (categoryTotal / monthlyNet) * 100;
  };

  const budgetModes = [
    { key: 'standard', name: 'Standard Budget', icon: '💰', color: '#0891b2' },
    { key: 'tight', name: 'Tight Budget', icon: '⚡', color: '#ea580c' },
    { key: 'emergency', name: 'Emergency Budget', icon: '🚨', color: '#dc2626' }
  ];

  const remainingIncome = formData.combinedMonthlyTakeHome - calculateTotalByMode(activeBudgetMode);

  const toggleCategoryCollapse = (categoryId) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const expandAllCategories = () => {
    setCollapsedCategories(new Set());
  };

  const collapseAllCategories = () => {
    const allCategoryIds = new Set(budgetCategories.map(cat => cat.id));
    setCollapsedCategories(allCategoryIds);
  };

  // Handle drag and drop reordering
  const handleDragEnd = (result) => {
    if (!result.destination) {
      return;
    }

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) {
      return;
    }

    const reorderedCategories = Array.from(budgetCategories);
    const [movedCategory] = reorderedCategories.splice(sourceIndex, 1);
    reorderedCategories.splice(destinationIndex, 0, movedCategory);

    setBudgetCategories(reorderedCategories);
  };

  // Handle reset to default categories
  const resetToDefaults = () => {
    // Reset to empty categories using localStorage utilities
    setBudgetData(EMPTY_BUDGET_CATEGORIES);
    setBudgetCategories(EMPTY_BUDGET_CATEGORIES);
  };

  // Add global event listeners
  useEffect(() => {
    const handleResetAll = () => {
      try {
        // Clear budget data from localStorage
        setBudgetData([]);
        
        // Reset all local state
        setBudgetCategories([]);
        setCollapsedCategories(new Set());
        setNewCategoryName('');
        setShowAddCategory(false);
        setActiveBudgetMode('standard');
        
      } catch (error) {
        console.error('Error resetting budget data:', error);
      }
    };

    window.addEventListener('resetAllData', handleResetAll);

    return () => {
      window.removeEventListener('resetAllData', handleResetAll);
    };
  }, [setBudgetData]);

  // Add enhanced demo data loading function for settings menu
  const loadDemoDataWithExport = async () => {
    try {
      const { importDemoData } = await import('../utils/localStorage');
      const result = await importDemoData();
      
      if (result.success) {
        if (window.confirm('Demo data loaded successfully! The page will refresh to show the demo data. You can explore all features with realistic financial data.')) {
          window.location.reload();
        }
      } else {
        alert(`Failed to load demo data: ${result.message}`);
      }
    } catch (error) {
      console.error('Error loading demo data:', error);
      alert('Failed to load demo data. Please try again.');
    }
  };

  // Add budget export function if needed
  const exportBudgetData = () => {
    try {
      const dataStr = JSON.stringify(budgetCategories, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      // Get user names from paycheck data
      const userNames = [];
      if (paycheckData?.your?.name?.trim()) {
        userNames.push(paycheckData.your.name.trim());
      }
      if (paycheckData?.spouse?.name?.trim() && formData.showSpouseCalculator) {
        userNames.push(paycheckData.spouse.name.trim());
      }
      
      const link = document.createElement('a');
      link.href = url;
      link.download = generateDataFilename('budget', userNames, 'json');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting budget data:', error);
      alert('Failed to export budget data.');
    }
  };

  // Event listeners for navigation controls
  useEffect(() => {
    const handleExpandAllCategories = () => {
      setCollapsedCategories(new Set());
      // Notify navigation of state change
      window.dispatchEvent(new CustomEvent('updateNavigationExpandState', { 
        detail: { page: 'budget', expanded: true } 
      }));
    };
    
    const handleCollapseAllCategories = () => {
      const allCategoryIds = new Set(budgetCategories.map(cat => cat.id));
      setCollapsedCategories(allCategoryIds);
      // Notify navigation of state change
      window.dispatchEvent(new CustomEvent('updateNavigationExpandState', { 
        detail: { page: 'budget', expanded: false } 
      }));
    };

    window.addEventListener('expandAllCategories', handleExpandAllCategories);
    window.addEventListener('collapseAllCategories', handleCollapseAllCategories);

    return () => {
      window.removeEventListener('expandAllCategories', handleExpandAllCategories);
      window.removeEventListener('collapseAllCategories', handleCollapseAllCategories);
    };
  }, [budgetCategories]);

  return (
    <>
      <Navigation />
      <div className="app-container">
        <div className="header">
          <h1>💵 Budget Planner</h1>
          <p>Plan And Track Your Monthly Budget Based On Your Calculated Income</p>
        </div>

        {/* Income Summary */}
        <div className="household-summary">
          <div className="household-header">
            <h2>📊 Income Summary</h2>
          </div>
          
          <div className="household-metrics" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="metric-card">
              <div className="metric-value">
                {formatCurrency(formData.combinedMonthlyTakeHome)}
              </div>
              <div className="metric-label">Combined Monthly Net (2 paychecks)</div>
            </div>

            <div className="metric-card">
              <div className="metric-value">
                {formatCurrency(formData.combinedMonthlyTakeHome * 12)}
              </div>
              <div className="metric-label">Combined Annual Net</div>
            </div>

            {/* Extra Paycheck Details in place of metric */}
            {extraPaycheckInfo.totalExtraPaychecks > 0 ? (
              <div className="metric-card">
                <div className="metric-value" style={{ fontSize: '1rem', lineHeight: '1.4' }}>
                  {extraPaycheckInfo.individuals.map((individual, index) => (
                    <div key={index} style={{ marginBottom: index < extraPaycheckInfo.individuals.length - 1 ? '8px' : '0' }}>
                      <strong>{individual.name}:</strong> {formatCurrency(individual.netPerPaycheck)}/paycheck × {individual.totalExtraPaychecks} = {formatCurrency(individual.totalExtraIncome)}
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {individual.extraMonths.map(m => m.name.slice(0, 3)).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="metric-label">
                  Extra Paychecks ({new Date().getFullYear()})
                </div>
              </div>
            ) : (
              <div className="metric-card">
                <div className="metric-value" style={{ fontSize: '1.2rem', color: '#94a3b8' }}>
                  No extra paychecks
                </div>
                <div className="metric-label">Extra Paychecks ({new Date().getFullYear()})</div>
              </div>
            )}
          </div>
        </div>

        {/* Budget Overview */}
        <div className="budget-overview">
          <div className="budget-overview-header">
            <h2>💡 Budget Overview</h2>
            
            {/* Budget Mode Selectors */}
            <div className="budget-mode-selectors">
              {budgetModes.map(mode => (
                <button
                  key={mode.key}
                  onClick={() => setActiveBudgetMode(mode.key)}
                  className={`budget-mode-selector ${activeBudgetMode === mode.key ? 'active' : ''}`}
                  style={{
                    backgroundColor: activeBudgetMode === mode.key ? mode.color : 'transparent',
                    borderColor: mode.color,
                    color: activeBudgetMode === mode.key ? 'white' : mode.color
                  }}
                  title={`Switch to ${mode.name}`}
                >
                  {mode.icon} {mode.name}
                </button>
              ))}
            </div>
          </div>
          
          <div className="budget-overview-metrics">
            <div className="budget-metric-card">
              <div className="budget-metric-value">
                {formatCurrency(calculateTotalByMode(activeBudgetMode))}
              </div>
              <div className="budget-metric-label">Total Budget ({budgetModes.find(m => m.key === activeBudgetMode)?.name})</div>
            </div>

            <div className={`budget-metric-card ${remainingIncome < 0 ? 'negative' : 'positive'}`}>
              <div className="budget-metric-value">
                {formatCurrency(remainingIncome)}
              </div>
              <div className="budget-metric-label">
                {remainingIncome < 0 ? 'Over Budget' : 'Remaining Income'}
              </div>
            </div>
          </div>
        </div>

        {/* Savings Removal Confirmation Dialog */}
        {savingsRemovalConfirmation && (
          <div className="savings-removal-overlay">
            <div className="savings-removal-dialog">
              <div className="savings-removal-header">
                <h3>⚠️ Linked Savings Goal Found</h3>
                <p>This budget item has an associated savings goal that contains data:</p>
              </div>
              
              <div className="savings-removal-content">
                <div className="savings-removal-item">
                  <div className="savings-removal-item-name">
                    <strong>{savingsRemovalConfirmation.categoryName}</strong> → {savingsRemovalConfirmation.itemName}
                  </div>
                  <div className="savings-removal-item-details">
                    <span>Current Balance: {formatCurrency(savingsRemovalConfirmation.savingsGoal.currentBalance || 0)}</span>
                    {Object.keys(savingsRemovalConfirmation.savingsGoal.monthlyContributions || {}).length > 0 && (
                      <span className="savings-custom-data-warning">
                        ⚠️ Has custom monthly contributions
                      </span>
                    )}
                    {(Object.keys(savingsRemovalConfirmation.savingsGoal.monthlyPurchases || {}).length > 0 || 
                      (savingsRemovalConfirmation.savingsGoal.purchases && savingsRemovalConfirmation.savingsGoal.purchases.length > 0)) && (
                      <span className="savings-custom-data-warning">
                        ⚠️ Has purchase history
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="savings-removal-actions">
                <button
                  onClick={() => {
                    // Proceed with deletion - this will also remove the savings goal
                    performItemDeletion(savingsRemovalConfirmation.categoryId, savingsRemovalConfirmation.itemId);
                    setSavingsRemovalConfirmation(null);
                  }}
                  className="savings-removal-confirm-btn"
                >
                  ✓ Delete Budget Item & Savings Goal
                </button>
                <button
                  onClick={() => {
                    // Cancel deletion
                    setSavingsRemovalConfirmation(null);
                  }}
                  className="savings-removal-cancel-btn"
                >
                  ✕ Cancel
                </button>
              </div>
              
              <div className="savings-removal-note">
                <p><small>
                  <strong>Warning:</strong> Deleting this budget item will also trigger removal of the linked savings goal. 
                  You can manage savings goals separately in the Savings page if needed.
                </small></p>
              </div>
            </div>
          </div>
        )}

        {/* Budget Categories */}
        <div className="budget-categories">
          <div className="budget-categories-header">
            <h2>📂 Budgets</h2>
            <div className="categories-header-actions">
              <div className="drag-hint">💡 Drag categories to reorder</div>
              <button
                onClick={() => setShowAddCategory(true)}
                className="btn-primary"
              >
                ➕ Add Category
              </button>
            </div>
          </div>

          {/* Add Category Form */}
          {showAddCategory && (
            <div className="add-category-form">
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Enter category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="form-input"
                  onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                />
              </div>
              <div className="form-actions">
                <button onClick={addCategory} className="btn-primary">Add</button>
                <button onClick={() => {setShowAddCategory(false); setNewCategoryName('');}} className="btn-secondary">Cancel</button>
              </div>
            </div>
          )}

          {/* Empty State Placeholder */}
          {budgetCategories.length === 0 && (
            <div className="budget-empty-state">
              <div className="budget-empty-state-content">
                <div className="budget-empty-state-icon">💵</div>
                <h2>Welcome to Budget Planning!</h2>
                <p className="budget-empty-state-description">
                  Create budget categories and track your monthly expenses to take control of your finances.
                </p>
                
                <div className="budget-empty-state-steps">
                  <h3>How to Get Started:</h3>
                  <div className="budget-step">
                    <div className="budget-step-number">1</div>
                    <div className="budget-step-content">
                      <strong>Create Categories</strong>
                      <p>Add budget categories like "Housing", "Food", "Transportation", etc.</p>
                    </div>
                  </div>
                  
                  <div className="budget-step">
                    <div className="budget-step-number">2</div>
                    <div className="budget-step-content">
                      <strong>Add Budget Items</strong>
                      <p>Within each category, add specific items with monthly amounts</p>
                    </div>
                  </div>
                  
                  <div className="budget-step">
                    <div className="budget-step-number">3</div>
                    <div className="budget-step-content">
                      <strong>Use Budget Modes</strong>
                      <p>Plan for different scenarios with Standard, Tight, and Emergency budgets</p>
                    </div>
                  </div>
                </div>
                
                <div className="budget-empty-state-features">
                  <h3>What You Can Do Here:</h3>
                  <div className="budget-features-grid">
                    <div className="budget-feature">
                      <div className="budget-feature-icon">📊</div>
                      <div className="budget-feature-text">
                        <strong>Multi-Mode Planning</strong>
                        <p>Plan standard, tight, and emergency budget scenarios</p>
                      </div>
                    </div>
                    
                    <div className="budget-feature">
                      <div className="budget-feature-icon">🔗</div>
                      <div className="budget-feature-text">
                        <strong>Paycheck Integration</strong>
                        <p>Auto-sync with your paycheck calculator for accurate budgeting</p>
                      </div>
                    </div>
                    
                    <div className="budget-feature">
                      <div className="budget-feature-icon">🎯</div>
                      <div className="budget-feature-text">
                        <strong>Savings Goals</strong>
                        <p>Categories with "saving" in the name become trackable savings goals</p>
                      </div>
                    </div>
                    
                    <div className="budget-feature">
                      <div className="budget-feature-icon">🔄</div>
                      <div className="budget-feature-text">
                        <strong>Drag & Drop</strong>
                        <p>Reorder categories and customize your budget layout</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="budget-empty-state-cta">
                  <p><strong>Ready to start budgeting?</strong></p>
                  <div className="budget-empty-state-buttons">
                    <button onClick={() => setShowAddCategory(true)} className="btn-primary budget-add-first-category">
                      ➕ Create Your First Category
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Drag and Drop Categories List */}
          {budgetCategories.length > 0 && (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="budget-categories">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`categories-list ${snapshot.isDraggingOver ? 'drag-active' : ''}`}
                  >
                    {budgetCategories.map((category, index) => (
                    <Draggable 
                      key={category.id} 
                      draggableId={category.id.toString()} 
                      index={index}
                      isDragDisabled={category.isAutoManaged}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`category-card ${snapshot.isDragging ? 'dragging' : ''} ${collapsedCategories.has(category.id) ? 'collapsed' : ''} ${category.isAutoManaged ? 'auto-managed' : ''}`}
                        >
                          <div className="category-header">
                            <div className="category-title">
                              {!category.isAutoManaged && (
                                <div
                                  {...provided.dragHandleProps}
                                  className="drag-handle"
                                  title="Drag to reorder"
                                >
                                  ⋮⋮
                                </div>
                              )}
                              {category.isAutoManaged && (
                                <div className="auto-managed-indicator" title="Auto-managed by paycheck calculator">
                                  🔒
                                </div>
                              )}
                              <button
                                onClick={() => toggleCategoryCollapse(category.id)}
                                className="collapse-toggle"
                                title={collapsedCategories.has(category.id) ? "Expand category" : "Collapse category"}
                              >
                                {collapsedCategories.has(category.id) ? '▶️' : '▼'}
                              </button>
                              <h3>
                                {category.name}
                                {category.isAutoManaged && (
                                  <span className="auto-managed-badge">Auto-Managed</span>
                                )}
                              </h3>
                              <span className="category-total">
                                {formatCurrency(calculateCategoryTotal(category, activeBudgetMode))}
                                <span className="category-percentage">
                                  {calculateCategoryPercentage(category, activeBudgetMode).toFixed(1)}% of Monthly Net
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Budget Items */}
                          {!collapsedCategories.has(category.id) && (
                            <>
                              <div className="budget-items">
                                {category.items.map(item => (
                                  <div key={item.id} className={`budget-item ${category.isAutoManaged ? 'auto-managed-item' : ''}`}>
                                    <div className="item-name">
                                      <input
                                        type="text"
                                        value={item.name}
                                        onChange={(e) => updateItem(category.id, item.id, 'name', e.target.value)}
                                        className="item-name-input"
                                        readOnly={category.isAutoManaged}
                                        title={category.isAutoManaged ? "This item is managed by the paycheck calculator" : ""}
                                      />
                                    </div>
                                    
                                    <div className="item-amounts">
                                      {budgetModes.map(mode => (
                                        <div key={mode.key} className={`amount-input ${activeBudgetMode === mode.key ? 'active' : ''}`}>
                                          <div className="amount-input-label">
                                            <span>{mode.icon}</span>
                                            <span>{mode.name.split(' ')[0]}</span>
                                          </div>
                                          <input
                                            type="number"
                                            value={item[mode.key]}
                                            onChange={(e) => updateItem(category.id, item.id, mode.key, e.target.value)}
                                            className="form-input"
                                            placeholder="0"
                                            readOnly={category.isAutoManaged}
                                            title={category.isAutoManaged ? "This amount is managed by the paycheck calculator" : ""}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                    
                                    {!category.isAutoManaged && (
                                      <button
                                        onClick={() => deleteItem(category.id, item.id)}
                                        className="btn-danger item-delete"
                                        title="Delete this budget item"
                                      >
                                        🗑️ Delete
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Category Actions - Moved to Bottom */}
                              {!category.isAutoManaged && (
                                <div className="category-footer">
                                  <div className="category-actions">
                                    <button
                                      onClick={() => addItem(category.id)}
                                      className="btn-secondary"
                                    >
                                      ➕ Add Item
                                    </button>
                                    <button
                                      onClick={() => deleteCategory(category.id)}
                                      className="btn-danger"
                                    >
                                      🗑️ Delete Category
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {/* Auto-managed category notice */}
                              {category.isAutoManaged && (
                                <div className="category-footer">
                                  <div className="auto-managed-notice">
                                    💡 This category is automatically updated based on your paycheck calculator settings.
                                    To modify these amounts, update your Budget Impacting Contributions in the paycheck calculator.
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          )}
        </div>
      </div>
    </>
  );
};

export default BudgetForm;