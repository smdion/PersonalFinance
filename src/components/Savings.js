import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Navigation from './Navigation';
import { getBudgetData, getSavingsData, setSavingsData } from '../utils/localStorage';

// Resizable header component for savings table
const ResizableHeader = ({ columnKey, children, width, onResize, className = '', style = {} }) => {
  return (
    <div 
      className={`resizable-header ${className}`}
      style={{
        ...style,
        width: width || 'auto',
        minWidth: '100px',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        borderRight: '1px solid #e2e8f0'
      }}
    >
      {children}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '8px',
          height: '100%',
          cursor: 'col-resize',
          backgroundColor: 'transparent',
          borderRight: '2px solid transparent',
          marginRight: '-4px'
        }}
        onMouseDown={(e) => onResize(columnKey, e)}
        onMouseEnter={(e) => {
          e.target.style.borderRightColor = '#3b82f6';
          e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.target.style.borderRightColor = 'transparent';
          e.target.style.backgroundColor = 'transparent';
        }}
        title="Drag to resize column"
      />
    </div>
  );
};

const Savings = () => {
  const [budgetData, setBudgetDataState] = useState([]);
  const [savingsData, setSavingsDataState] = useState({});
  const [showDetailedView, setShowDetailedView] = useState(null);
  const [purchaseForms, setPurchaseForms] = useState({}); // Track purchase forms by goalId-month
  
  // Bulk editing state
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [selectionStart, setSelectionStart] = useState(null);
  const [bulkEditValue, setBulkEditValue] = useState('');
  const [bulkEditType, setBulkEditType] = useState('dollar'); // 'dollar' or 'percentage'
  const [copiedPattern, setCopiedPattern] = useState(null);
  
  // Column resizing state
  const [columnWidths, setColumnWidths] = useState({
    month: 80,
    date: 100
  });
  const [resizing, setResizing] = useState(null);

  // Format currency helper function
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle shortcuts when not typing in inputs
      if (e.target.tagName === 'INPUT') return;
      
      // Escape - Exit bulk edit mode
      if (e.key === 'Escape') {
        setBulkEditMode(false);
        setSelectedCells(new Set());
        return;
      }
      
      // Ctrl/Cmd + B - Toggle bulk edit mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setBulkEditMode(!bulkEditMode);
        setSelectedCells(new Set());
        return;
      }
      
      // Ctrl/Cmd + A - Select all contribution cells (in bulk edit mode)
      if (bulkEditMode && (e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const allCells = new Set();
        Object.keys(savingsData).forEach(goalId => {
          for (let month = 0; month < 120; month++) {
            allCells.add(`${goalId}-${month}-contribution`);
          }
        });
        setSelectedCells(allCells);
        return;
      }
      
      // Delete - Clear selected cells (in bulk edit mode)
      if (bulkEditMode && e.key === 'Delete') {
        e.preventDefault();
        clearSelectedCells();
        return;
      }
      
      // Ctrl/Cmd + C - Copy pattern from first selected cell
      if (bulkEditMode && (e.ctrlKey || e.metaKey) && e.key === 'c' && selectedCells.size > 0) {
        e.preventDefault();
        const firstCell = Array.from(selectedCells)[0];
        const [goalId, month] = firstCell.split('-');
        copyContributionPattern(goalId, parseInt(month), parseInt(month) + 11);
        return;
      }
      
      // Ctrl/Cmd + V - Paste pattern to selected cells
      if (bulkEditMode && (e.ctrlKey || e.metaKey) && e.key === 'v' && copiedPattern && selectedCells.size > 0) {
        e.preventDefault();
        const firstCell = Array.from(selectedCells)[0];
        const [goalId, month] = firstCell.split('-');
        pasteContributionPattern(goalId, parseInt(month));
        return;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [bulkEditMode, selectedCells, savingsData, copiedPattern]);

  // Load budget and savings data on mount
  useEffect(() => {
    const loadData = () => {
      try {
        const budget = getBudgetData();
        setBudgetDataState(budget || []);
        
        const savings = getSavingsData();
        setSavingsDataState(savings || {});
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();

    // Listen for budget data updates
    const handleBudgetUpdate = () => loadData();
    window.addEventListener('budgetDataUpdated', handleBudgetUpdate);
    
    return () => {
      window.removeEventListener('budgetDataUpdated', handleBudgetUpdate);
    };
  }, []);

  // Extract savings categories from budget data (standard mode only)
  const savingsCategories = useMemo(() => {
    const categories = [];
    
    budgetData.forEach(category => {
      // Only include items from the "Savings" category
      if (category.name.toLowerCase().includes('saving')) {
        category.items.forEach(item => {
          const amount = item.standard || 0;
          if (amount > 0) {
            categories.push({
              categoryName: category.name,
              categoryId: category.id,
              itemName: item.name,
              itemId: item.id,
              monthlyAmount: amount,
              fullKey: `${category.id}-${item.id}`
            });
          }
        });
      }
    });
    
    return categories;
  }, [budgetData]);

  // Calculate total budget for all savings combined
  const totalSavingsBudget = useMemo(() => {
    return savingsCategories.reduce((total, cat) => total + cat.monthlyAmount, 0);
  }, [savingsCategories]);

  // Monthly balance update logic with contribution tracking
  const updateBalancesForNewMonth = useCallback(() => {
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
    
    const updatedSavingsData = { ...savingsData };
    let hasChanges = false;
    
    Object.keys(updatedSavingsData).forEach(goalId => {
      const goal = updatedSavingsData[goalId];
      
      if (!goal.lastUpdatedMonth || goal.lastUpdatedMonth !== currentMonth) {
        // Calculate months since last update
        const lastUpdate = goal.lastUpdatedMonth ? new Date(goal.lastUpdatedMonth.split('-')[0], parseInt(goal.lastUpdatedMonth.split('-')[1])) : new Date(goal.createdDate);
        const monthsDiff = (currentDate.getFullYear() - lastUpdate.getFullYear()) * 12 + (currentDate.getMonth() - lastUpdate.getMonth());
        
        // Add contributions for each missed month
        for (let i = 1; i <= monthsDiff; i++) {
          const monthIndex = i - 1; // Zero-based month index for tracking
          
          // Get contribution for this month (percentage, custom, or default)
          let monthContribution;
          const percentageContribution = goal.monthlyContributionPercentages?.[monthIndex];
          const customContribution = goal.monthlyContributions?.[monthIndex];
          
          if (percentageContribution !== undefined) {
            // Use percentage-based contribution
            monthContribution = (totalSavingsBudget * percentageContribution) / 100;
          } else if (customContribution !== undefined) {
            // Use custom contribution
            monthContribution = customContribution;
          } else {
            // Use default contribution
            monthContribution = goal.monthlyContribution || 0;
          }
          
          // Get purchases for this month
          let monthPurchases = 0;
          const monthlyPurchases = goal.monthlyPurchases?.[monthIndex];
          if (monthlyPurchases && Array.isArray(monthlyPurchases)) {
            monthPurchases = monthlyPurchases.reduce((total, purchase) => total + (purchase.amount || 0), 0);
          }
          
          // Update balance
          goal.currentBalance = (goal.currentBalance || 0) + monthContribution - monthPurchases;
        }
        
        goal.lastUpdatedMonth = currentMonth;
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setSavingsDataState(updatedSavingsData);
      setSavingsData(updatedSavingsData);
    }
  }, [savingsData]);

  // Run balance update on component mount and when data changes
  useEffect(() => {
    updateBalancesForNewMonth();
  }, [updateBalancesForNewMonth]);

  // Auto-sync savings goals with budget items
  useEffect(() => {
    if (savingsCategories.length === 0) return;
    
    const updatedSavingsData = { ...savingsData };
    let hasChanges = false;
    
    // Create or update goals for each savings category
    savingsCategories.forEach(category => {
      const goalId = category.fullKey;
      const existingGoal = updatedSavingsData[goalId];
      
      if (existingGoal) {
        // Update monthly contribution if it changed
        if (existingGoal.monthlyContribution !== category.monthlyAmount) {
          updatedSavingsData[goalId] = {
            ...existingGoal,
            monthlyContribution: category.monthlyAmount
          };
          hasChanges = true;
        }
      } else {
        // Create new goal
        const currentDate = new Date();
        updatedSavingsData[goalId] = {
          id: goalId,
          name: category.itemName,
          currentBalance: 0,
          monthlyContribution: category.monthlyAmount,
          category: category.categoryId,
          item: category.itemId,
          createdDate: new Date().toISOString(),
          lastUpdatedMonth: `${currentDate.getFullYear()}-${currentDate.getMonth()}`,
          monthlyContributions: {}, // Store custom contributions by month
          monthlyContributionPercentages: {}, // Store percentage adjustments by month
          monthlyPurchases: {}, // Store purchases by month
          purchases: [] // Keep for backward compatibility
        };
        hasChanges = true;
      }
    });
    
    // Remove goals that no longer have corresponding budget items
    Object.keys(updatedSavingsData).forEach(goalId => {
      const hasMatchingCategory = savingsCategories.some(cat => cat.fullKey === goalId);
      if (!hasMatchingCategory) {
        delete updatedSavingsData[goalId];
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setSavingsDataState(updatedSavingsData);
      setSavingsData(updatedSavingsData);
    }
  }, [savingsCategories, savingsData, setSavingsData]);

  // Get total budgeted contributions for a specific month across all goals
  const getTotalContributionsForMonth = (targetMonth, excludeGoalId = null) => {
    return Object.values(savingsData).reduce((total, goal) => {
      if (excludeGoalId && goal.id === excludeGoalId) return total;
      
      const customContribution = goal.monthlyContributions?.[targetMonth];
      const contribution = customContribution !== undefined ? customContribution : goal.monthlyContribution || 0;
      return total + contribution;
    }, 0);
  };

  // Update contribution for a specific month with budget validation
  const updateMonthlyContribution = (goalId, month, newAmount) => {
    const amount = Math.max(0, parseFloat(newAmount) || 0);
    
    // Calculate total contributions for this month from all other goals
    const otherGoalsTotal = Object.values(savingsData).reduce((total, goal) => {
      if (goal.id === goalId) return total; // Skip the goal being updated
      
      // Get contribution for this specific month
      const customContribution = goal.monthlyContributions?.[month];
      const contribution = customContribution !== undefined ? customContribution : goal.monthlyContribution || 0;
      return total + contribution;
    }, 0);
    
    const availableBudget = totalSavingsBudget - otherGoalsTotal;
    
    if (amount > availableBudget) {
      alert(`Cannot set contribution to ${formatCurrency(amount)}.\nTotal budget: ${formatCurrency(totalSavingsBudget)}\nOther goals using: ${formatCurrency(otherGoalsTotal)}\nAvailable: ${formatCurrency(availableBudget)}`);
      return;
    }
    
    const updatedSavingsData = {
      ...savingsData,
      [goalId]: {
        ...savingsData[goalId],
        monthlyContributions: {
          ...savingsData[goalId].monthlyContributions,
          [month]: amount
        },
        // Clear percentage if manually setting amount
        monthlyContributionPercentages: {
          ...savingsData[goalId].monthlyContributionPercentages,
          [month]: undefined
        }
      }
    };
    
    setSavingsDataState(updatedSavingsData);
    setSavingsData(updatedSavingsData);
  };

  // Update contribution percentage for a specific month
  const updateMonthlyContributionPercentage = (goalId, month, percentage) => {
    const percent = Math.max(0, Math.min(100, parseFloat(percentage) || 0));
    const calculatedAmount = (totalSavingsBudget * percent) / 100;
    
    // Calculate total contributions for this month from all other goals
    const otherGoalsTotal = Object.values(savingsData).reduce((total, goal) => {
      if (goal.id === goalId) return total; // Skip the goal being updated
      
      // Get contribution for this specific month
      const customContribution = goal.monthlyContributions?.[month];
      const contribution = customContribution !== undefined ? customContribution : goal.monthlyContribution || 0;
      return total + contribution;
    }, 0);
    
    const availableBudget = totalSavingsBudget - otherGoalsTotal;
    
    if (calculatedAmount > availableBudget) {
      const maxPercentage = (availableBudget / totalSavingsBudget) * 100;
      alert(`Cannot set ${percent}% (${formatCurrency(calculatedAmount)}).\nMaximum available: ${maxPercentage.toFixed(1)}% (${formatCurrency(availableBudget)})`);
      return;
    }
    
    const updatedSavingsData = {
      ...savingsData,
      [goalId]: {
        ...savingsData[goalId],
        monthlyContributionPercentages: {
          ...savingsData[goalId].monthlyContributionPercentages,
          [month]: percent
        },
        monthlyContributions: {
          ...savingsData[goalId].monthlyContributions,
          [month]: calculatedAmount
        }
      }
    };
    
    setSavingsDataState(updatedSavingsData);
    setSavingsData(updatedSavingsData);
  };

  // Add a new purchase to a specific month
  const addPurchaseToMonth = (goalId, month, amount, description) => {
    const purchaseAmount = Math.max(0, parseFloat(amount) || 0);
    const purchaseDesc = description.trim() || `Purchase ${Date.now()}`;
    
    if (purchaseAmount <= 0 || !purchaseDesc) {
      alert('Please enter a valid amount and description for the purchase.');
      return;
    }
    
    const goal = savingsData[goalId];
    const existingPurchases = goal.monthlyPurchases?.[month] || [];
    
    const newPurchase = {
      id: Date.now().toString(),
      amount: purchaseAmount,
      description: purchaseDesc
    };
    
    const updatedSavingsData = {
      ...savingsData,
      [goalId]: {
        ...goal,
        monthlyPurchases: {
          ...goal.monthlyPurchases,
          [month]: [...existingPurchases, newPurchase]
        }
      }
    };
    
    setSavingsDataState(updatedSavingsData);
    setSavingsData(updatedSavingsData);
  };

  // Remove a specific purchase from a month
  const removePurchaseFromMonth = (goalId, month, purchaseId) => {
    const goal = savingsData[goalId];
    const existingPurchases = goal.monthlyPurchases?.[month] || [];
    
    const updatedPurchases = existingPurchases.filter(p => p.id !== purchaseId);
    
    const updatedSavingsData = {
      ...savingsData,
      [goalId]: {
        ...goal,
        monthlyPurchases: {
          ...goal.monthlyPurchases,
          [month]: updatedPurchases
        }
      }
    };
    
    setSavingsDataState(updatedSavingsData);
    setSavingsData(updatedSavingsData);
  };

  // Bulk editing functions
  const toggleCellSelection = (goalId, month, cellType) => {
    if (!bulkEditMode) return;
    
    const cellKey = `${goalId}-${month}-${cellType}`;
    const newSelection = new Set(selectedCells);
    
    if (newSelection.has(cellKey)) {
      newSelection.delete(cellKey);
    } else {
      newSelection.add(cellKey);
    }
    
    setSelectedCells(newSelection);
  };

  const selectRange = (startGoalId, startMonth, endGoalId, endMonth, cellType) => {
    const goalIds = Object.keys(savingsData);
    const startGoalIndex = goalIds.indexOf(startGoalId);
    const endGoalIndex = goalIds.indexOf(endGoalId);
    
    const newSelection = new Set(selectedCells);
    
    for (let goalIndex = Math.min(startGoalIndex, endGoalIndex); goalIndex <= Math.max(startGoalIndex, endGoalIndex); goalIndex++) {
      for (let month = Math.min(startMonth, endMonth); month <= Math.max(startMonth, endMonth); month++) {
        newSelection.add(`${goalIds[goalIndex]}-${month}-${cellType}`);
      }
    }
    
    setSelectedCells(newSelection);
  };

  const applyBulkEdit = () => {
    if (selectedCells.size === 0 || !bulkEditValue) return;
    
    const updatedSavingsData = { ...savingsData };
    let hasChanges = false;
    
    selectedCells.forEach(cellKey => {
      const [goalId, month, cellType] = cellKey.split('-');
      const monthIndex = parseInt(month);
      
      if (cellType === 'contribution') {
        if (bulkEditType === 'percentage') {
          // Apply percentage
          const percent = parseFloat(bulkEditValue) || 0;
          const calculatedAmount = (totalSavingsBudget * percent) / 100;
          
          updatedSavingsData[goalId] = {
            ...updatedSavingsData[goalId],
            monthlyContributionPercentages: {
              ...updatedSavingsData[goalId].monthlyContributionPercentages,
              [monthIndex]: percent
            },
            monthlyContributions: {
              ...updatedSavingsData[goalId].monthlyContributions,
              [monthIndex]: calculatedAmount
            }
          };
        } else {
          // Apply dollar amount
          const amount = parseFloat(bulkEditValue) || 0;
          updatedSavingsData[goalId] = {
            ...updatedSavingsData[goalId],
            monthlyContributions: {
              ...updatedSavingsData[goalId].monthlyContributions,
              [monthIndex]: amount
            },
            monthlyContributionPercentages: {
              ...updatedSavingsData[goalId].monthlyContributionPercentages,
              [monthIndex]: undefined
            }
          };
        }
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setSavingsDataState(updatedSavingsData);
      setSavingsData(updatedSavingsData);
    }
    
    // Clear selection and values
    setSelectedCells(new Set());
    setBulkEditValue('');
  };

  const copyContributionPattern = (goalId, startMonth, endMonth) => {
    const goal = savingsData[goalId];
    const pattern = [];
    
    for (let month = startMonth; month <= endMonth; month++) {
      const percentage = goal.monthlyContributionPercentages?.[month];
      const amount = goal.monthlyContributions?.[month] || goal.monthlyContribution || 0;
      
      pattern.push({
        month: month - startMonth,
        percentage: percentage,
        amount: amount,
        hasPercentage: percentage !== undefined
      });
    }
    
    setCopiedPattern({
      pattern,
      length: endMonth - startMonth + 1
    });
  };

  const pasteContributionPattern = (targetGoalId, targetStartMonth) => {
    if (!copiedPattern) return;
    
    const updatedSavingsData = { ...savingsData };
    
    copiedPattern.pattern.forEach(patternItem => {
      const targetMonth = targetStartMonth + patternItem.month;
      if (targetMonth >= 120) return; // Don't paste beyond 10 years
      
      if (patternItem.hasPercentage) {
        updatedSavingsData[targetGoalId] = {
          ...updatedSavingsData[targetGoalId],
          monthlyContributionPercentages: {
            ...updatedSavingsData[targetGoalId].monthlyContributionPercentages,
            [targetMonth]: patternItem.percentage
          },
          monthlyContributions: {
            ...updatedSavingsData[targetGoalId].monthlyContributions,
            [targetMonth]: (totalSavingsBudget * patternItem.percentage) / 100
          }
        };
      } else {
        updatedSavingsData[targetGoalId] = {
          ...updatedSavingsData[targetGoalId],
          monthlyContributions: {
            ...updatedSavingsData[targetGoalId].monthlyContributions,
            [targetMonth]: patternItem.amount
          },
          monthlyContributionPercentages: {
            ...updatedSavingsData[targetGoalId].monthlyContributionPercentages,
            [targetMonth]: undefined
          }
        };
      }
    });
    
    setSavingsDataState(updatedSavingsData);
    setSavingsData(updatedSavingsData);
  };

  const clearSelectedCells = () => {
    const updatedSavingsData = { ...savingsData };
    let hasChanges = false;
    
    selectedCells.forEach(cellKey => {
      const [goalId, month, cellType] = cellKey.split('-');
      const monthIndex = parseInt(month);
      
      if (cellType === 'contribution') {
        updatedSavingsData[goalId] = {
          ...updatedSavingsData[goalId],
          monthlyContributions: {
            ...updatedSavingsData[goalId].monthlyContributions,
            [monthIndex]: 0
          },
          monthlyContributionPercentages: {
            ...updatedSavingsData[goalId].monthlyContributionPercentages,
            [monthIndex]: undefined
          }
        };
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setSavingsDataState(updatedSavingsData);
      setSavingsData(updatedSavingsData);
    }
    
    setSelectedCells(new Set());
  };

  // Apply to all months below function
  const applyToMonthsBelow = (goalId, startMonth, value, isPercentage) => {
    const updatedSavingsData = { ...savingsData };
    
    // Apply the value to all months from startMonth to the end (month 119)
    for (let monthIndex = startMonth; monthIndex < 120; monthIndex++) {
      if (isPercentage) {
        const percent = parseFloat(value) || 0;
        const calculatedAmount = (totalSavingsBudget * percent) / 100;
        
        updatedSavingsData[goalId] = {
          ...updatedSavingsData[goalId],
          monthlyContributionPercentages: {
            ...updatedSavingsData[goalId].monthlyContributionPercentages,
            [monthIndex]: percent
          },
          monthlyContributions: {
            ...updatedSavingsData[goalId].monthlyContributions,
            [monthIndex]: calculatedAmount
          }
        };
      } else {
        const amount = parseFloat(value) || 0;
        updatedSavingsData[goalId] = {
          ...updatedSavingsData[goalId],
          monthlyContributions: {
            ...updatedSavingsData[goalId].monthlyContributions,
            [monthIndex]: amount
          },
          monthlyContributionPercentages: {
            ...updatedSavingsData[goalId].monthlyContributionPercentages,
            [monthIndex]: undefined
          }
        };
      }
    }
    
    setSavingsDataState(updatedSavingsData);
    setSavingsData(updatedSavingsData);
  };

  // Export savings data function
  const exportSavingsData = () => {
    try {
      const dataStr = JSON.stringify(savingsData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `savings-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting savings data:', error);
      alert('Failed to export savings data.');
    }
  };

  // Calculate totals across all goals for allocation display
  const calculateTotalAllocated = useMemo(() => {
    const currentMonth = 0; // Current month index
    return Object.values(savingsData).reduce((total, goal) => {
      const customContribution = goal.monthlyContributions?.[currentMonth];
      const contribution = customContribution !== undefined ? customContribution : goal.monthlyContribution || 0;
      return total + contribution;
    }, 0);
  }, [savingsData]);

  const remainingBudget = totalSavingsBudget - calculateTotalAllocated;

  // Column resizing functionality
  const handleMouseDown = useCallback((columnKey, e) => {
    e.preventDefault();
    const startWidth = columnWidths[columnKey] || 150;
    const startX = e.clientX;
    
    setResizing({ columnKey, startX, startWidth });
    
    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(80, startWidth + deltaX); // minimum width of 80px
      
      setColumnWidths(prev => ({
        ...prev,
        [columnKey]: newWidth
      }));
    };
    
    const handleMouseUp = () => {
      setResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths]);

  // Calculate projections for savings goals (10 years)
  const calculateProjections = (goal) => {
    const currentBalance = goal.currentBalance || 0;
    
    const projections = [];
    let runningBalance = currentBalance;
    const currentDate = new Date();
    
    // Project forward 120 months (10 years)
    for (let month = 0; month < 120; month++) {
      const projectionDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + month);
      
      // Get contribution for this month (percentage, custom, or default)
      let monthContribution;
      const percentageContribution = goal.monthlyContributionPercentages?.[month];
      const customContribution = goal.monthlyContributions?.[month];
      
      if (percentageContribution !== undefined) {
        // Use percentage-based contribution
        monthContribution = (totalSavingsBudget * percentageContribution) / 100;
      } else if (customContribution !== undefined) {
        // Use custom contribution
        monthContribution = customContribution;
      } else {
        // Use default contribution
        monthContribution = goal.monthlyContribution || 0;
      }
      
      // Get purchases for this month
      let monthPurchases = 0;
      const monthPurchasesList = [];
      
      // From monthly purchases (now array of purchases)
      const monthlyPurchases = goal.monthlyPurchases?.[month];
      if (monthlyPurchases && Array.isArray(monthlyPurchases)) {
        monthlyPurchases.forEach(purchase => {
          monthPurchases += purchase.amount || 0;
          monthPurchasesList.push(purchase);
        });
      }
      
      // From legacy purchases array
      if (goal.purchases) {
        goal.purchases.forEach(purchase => {
          const purchaseDate = new Date(purchase.date);
          const purchaseMonth = (purchaseDate.getFullYear() - currentDate.getFullYear()) * 12 + 
                               (purchaseDate.getMonth() - currentDate.getMonth());
          if (purchaseMonth === month) {
            monthPurchases += purchase.amount;
            monthPurchasesList.push({
              id: purchase.id,
              amount: purchase.amount,
              description: purchase.name
            });
          }
        });
      }
      
      runningBalance += monthContribution - monthPurchases;
      
      projections.push({
        month: month,
        date: projectionDate,
        balance: Math.max(0, runningBalance),
        contribution: monthContribution,
        purchases: monthPurchases,
        purchasesList: monthPurchasesList,
        isCustomContribution: customContribution !== undefined,
        hasPurchase: monthPurchases > 0
      });
    }
    
    return projections;
  };





  return (
    <>
      <Navigation />
      <div className="app-container">
        <div className="header">
          <h1>🎯 Savings Goals</h1>
          <p>Track your savings goals and project future balances based on your budget</p>
        </div>



        {/* Savings Summary */}
        {Object.keys(savingsData).length > 0 && (
          <div className="household-summary">
            <div className="household-header">
              <h2>📊 Savings Summary</h2>
            </div>
            <div className="household-metrics">
              <div className="metric-card">
                <div className="metric-value">
                  {Object.keys(savingsData).length}
                </div>
                <div className="metric-label">Active Goals</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">
                  {formatCurrency(totalSavingsBudget)}
                </div>
                <div className="metric-label">Total Savings Budget</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">
                  {formatCurrency(calculateTotalAllocated)}
                </div>
                <div className="metric-label">Total Allocated</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">
                  {formatCurrency(remainingBudget)}
                </div>
                <div className="metric-label">Remaining Budget</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">
                  {formatCurrency(Object.values(savingsData).reduce((total, goal) => total + (goal.currentBalance || 0), 0))}
                </div>
                <div className="metric-label">Current Total Balance</div>
              </div>
            </div>
          </div>
        )}

        {/* Legend and Shortcuts */}
        {Object.keys(savingsData).length > 0 && (
          <div className="savings-summary">
            <div className="savings-summary-header">
              <h2>📊 Legend & Shortcuts</h2>
            </div>
            
            <div className="savings-summary-additional">
              {/* Legend */}
              <div className="savings-legend">
                <div className="legend-section">
                  <h4>Color Coding</h4>
                  <div className="legend-items">
                    <div className="legend-item">
                      <div className="legend-indicator yellow"></div>
                      <span>Custom contributions (percentage-based calculations shown in yellow)</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-indicator blue"></div>
                      <span>Editable balance or contribution amounts (blue background)</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-indicator green"></div>
                      <span>Selected cells for bulk editing (green highlight)</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-indicator red"></div>
                      <span>Planned purchases or major expenses (red indicator)</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-indicator percent"></div>
                      <span>Percentage contributions (small % indicator shown)</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Shortcuts */}
              <div className="savings-shortcuts">
                <div className="shortcuts-section">
                  <h4>Keyboard Shortcuts</h4>
                  <div className="shortcut-items">
                    <div className="shortcut-item">
                      <kbd>Arrow Keys</kbd> <span>Navigate between cells</span>
                    </div>
                    <div className="shortcut-item">
                      <kbd>Tab/Shift+Tab</kbd> <span>Move between goals</span>
                    </div>
                    <div className="shortcut-item">
                      <kbd>Enter</kbd> <span>Start editing cell</span>
                    </div>
                    <div className="shortcut-item">
                      <kbd>Escape</kbd> <span>Clear selection</span>
                    </div>
                    <div className="shortcut-item">
                      <kbd>Shift+Click</kbd> <span>Select range</span>
                    </div>
                    <div className="shortcut-item">
                      <kbd>Ctrl+A</kbd> <span>Select all</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Editing Toolbar */}
        {Object.keys(savingsData).length > 0 && (
          <div className="bulk-edit-toolbar">
            <div className="bulk-edit-controls">
              <button
                onClick={() => {
                  setBulkEditMode(!bulkEditMode);
                  setSelectedCells(new Set());
                }}
                className={`bulk-edit-toggle ${bulkEditMode ? 'active' : ''}`}
              >
                {bulkEditMode ? '✓ Exit Bulk Edit' : '📝 Bulk Edit Mode'}
              </button>
              
              {bulkEditMode && (
                <>
                  <div className="bulk-edit-input-group">
                    <select
                      value={bulkEditType}
                      onChange={(e) => setBulkEditType(e.target.value)}
                      className="bulk-edit-type-select"
                    >
                      <option value="dollar">Dollar Amount</option>
                      <option value="percentage">Percentage</option>
                    </select>
                    <input
                      type="number"
                      value={bulkEditValue}
                      onChange={(e) => setBulkEditValue(e.target.value)}
                      placeholder={bulkEditType === 'percentage' ? 'Enter %' : 'Enter $'}
                      className="bulk-edit-input"
                      step={bulkEditType === 'percentage' ? '0.1' : '0.01'}
                      min="0"
                      max={bulkEditType === 'percentage' ? '100' : undefined}
                    />
                    <button
                      onClick={applyBulkEdit}
                      disabled={selectedCells.size === 0 || !bulkEditValue}
                      className="bulk-edit-apply"
                    >
                      Apply to {selectedCells.size} cells
                    </button>
                  </div>
                  
                  <div className="bulk-edit-actions">
                    <button
                      onClick={clearSelectedCells}
                      disabled={selectedCells.size === 0}
                      className="bulk-edit-clear"
                    >
                      Clear Selected
                    </button>
                    <button
                      onClick={() => setSelectedCells(new Set())}
                      disabled={selectedCells.size === 0}
                      className="bulk-edit-deselect"
                    >
                      Deselect All
                    </button>
                    <button onClick={exportSavingsData} className="bulk-edit-export">
                      💾 Export Data
                    </button>
                    {copiedPattern && (
                      <span className="copied-pattern-indicator">
                        📋 Pattern copied ({copiedPattern.length} months)
                      </span>
                    )}
                  </div>
                </>
              )}
              
              {!bulkEditMode && (
                <button onClick={exportSavingsData} className="bulk-edit-export">
                  💾 Export Data
                </button>
              )}
            </div>
            
            {bulkEditMode && selectedCells.size > 0 && (
              <div className="selection-info">
                {selectedCells.size} cells selected - Click cells to select/deselect, Shift+Click for ranges
              </div>
            )}
          </div>
        )}

        {/* Consolidated Projections Table - All Goals */}
        {Object.keys(savingsData).length > 0 && (
          <div className="consolidated-projections">
            <h2>📊 10-Year Savings Projections</h2>
            <div className="spreadsheet-table">
              <div className="spreadsheet-header">
                <div className="month-header resizable-header" style={{ width: columnWidths.month }}>
                  Month
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: '8px',
                      height: '100%',
                      cursor: 'col-resize',
                      backgroundColor: 'transparent',
                      borderRight: '2px solid transparent',
                      marginRight: '-4px'
                    }}
                    onMouseDown={(e) => handleMouseDown('month', e)}
                    onMouseEnter={(e) => {
                      e.target.style.borderRightColor = '#3b82f6';
                      e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderRightColor = 'transparent';
                      e.target.style.backgroundColor = 'transparent';
                    }}
                    title="Drag to resize column"
                  />
                </div>
                <div className="date-header resizable-header" style={{ width: columnWidths.date }}>
                  Date
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: '8px',
                      height: '100%',
                      cursor: 'col-resize',
                      backgroundColor: 'transparent',
                      borderRight: '2px solid transparent',
                      marginRight: '-4px'
                    }}
                    onMouseDown={(e) => handleMouseDown('date', e)}
                    onMouseEnter={(e) => {
                      e.target.style.borderRightColor = '#3b82f6';
                      e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderRightColor = 'transparent';
                      e.target.style.backgroundColor = 'transparent';
                    }}
                    title="Drag to resize column"
                  />
                </div>
                {Object.values(savingsData).map(goal => {
                  const contributionKey = `${goal.id}-contribution`;
                  const purchaseKey = `${goal.id}-purchase`;
                  const balanceKey = `${goal.id}-balance`;
                  
                  const contributionWidth = columnWidths[contributionKey] || 150;
                  const purchaseWidth = columnWidths[purchaseKey] || 120;
                  const balanceWidth = columnWidths[balanceKey] || 120;
                  const totalGoalWidth = contributionWidth + purchaseWidth + balanceWidth;
                  
                  return (
                    <div key={goal.id} className="goal-header-group" style={{
                      display: 'flex',
                      flexDirection: 'column',
                      width: totalGoalWidth
                    }}>
                      <div className="goal-name" style={{
                        padding: '8px',
                        borderBottom: '1px solid #e2e8f0',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRight: '1px solid #e2e8f0'
                      }}>
                        {goal.name}
                      </div>
                      <div className="goal-subheaders" style={{ display: 'flex' }}>
                        <div className="resizable-header" style={{ width: contributionWidth }}>
                          Contribution
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              right: 0,
                              width: '8px',
                              height: '100%',
                              cursor: 'col-resize',
                              backgroundColor: 'transparent',
                              borderRight: '2px solid transparent',
                              marginRight: '-4px'
                            }}
                            onMouseDown={(e) => handleMouseDown(contributionKey, e)}
                            onMouseEnter={(e) => {
                              e.target.style.borderRightColor = '#3b82f6';
                              e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.borderRightColor = 'transparent';
                              e.target.style.backgroundColor = 'transparent';
                            }}
                            title="Drag to resize column"
                          />
                        </div>
                        <div className="resizable-header" style={{ width: purchaseWidth }}>
                          Purchase
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              right: 0,
                              width: '8px',
                              height: '100%',
                              cursor: 'col-resize',
                              backgroundColor: 'transparent',
                              borderRight: '2px solid transparent',
                              marginRight: '-4px'
                            }}
                            onMouseDown={(e) => handleMouseDown(purchaseKey, e)}
                            onMouseEnter={(e) => {
                              e.target.style.borderRightColor = '#3b82f6';
                              e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.borderRightColor = 'transparent';
                              e.target.style.backgroundColor = 'transparent';
                            }}
                            title="Drag to resize column"
                          />
                        </div>
                        <div className="resizable-header" style={{ width: balanceWidth }}>
                          Balance
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              right: 0,
                              width: '8px',
                              height: '100%',
                              cursor: 'col-resize',
                              backgroundColor: 'transparent',
                              borderRight: '2px solid transparent',
                              marginRight: '-4px'
                            }}
                            onMouseDown={(e) => handleMouseDown(balanceKey, e)}
                            onMouseEnter={(e) => {
                              e.target.style.borderRightColor = '#3b82f6';
                              e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.borderRightColor = 'transparent';
                              e.target.style.backgroundColor = 'transparent';
                            }}
                            title="Drag to resize column"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="totals-header" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: (columnWidths['total-contributions'] || 120) + (columnWidths['total-purchases'] || 120) + (columnWidths['total-balances'] || 120)
                }}>
                  <div className="total-name" style={{
                    padding: '8px',
                    borderBottom: '1px solid #e2e8f0',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    minHeight: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRight: '1px solid #e2e8f0'
                  }}>
                    Monthly Totals
                  </div>
                  <div className="total-subheaders" style={{ display: 'flex' }}>
                    <div className="resizable-header" style={{ width: columnWidths['total-contributions'] || 120 }}>
                      Contributions
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          width: '8px',
                          height: '100%',
                          cursor: 'col-resize',
                          backgroundColor: 'transparent',
                          borderRight: '2px solid transparent',
                          marginRight: '-4px'
                        }}
                        onMouseDown={(e) => handleMouseDown('total-contributions', e)}
                        onMouseEnter={(e) => {
                          e.target.style.borderRightColor = '#3b82f6';
                          e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.borderRightColor = 'transparent';
                          e.target.style.backgroundColor = 'transparent';
                        }}
                        title="Drag to resize column"
                      />
                    </div>
                    <div className="resizable-header" style={{ width: columnWidths['total-purchases'] || 120 }}>
                      Purchases
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          width: '8px',
                          height: '100%',
                          cursor: 'col-resize',
                          backgroundColor: 'transparent',
                          borderRight: '2px solid transparent',
                          marginRight: '-4px'
                        }}
                        onMouseDown={(e) => handleMouseDown('total-purchases', e)}
                        onMouseEnter={(e) => {
                          e.target.style.borderRightColor = '#3b82f6';
                          e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.borderRightColor = 'transparent';
                          e.target.style.backgroundColor = 'transparent';
                        }}
                        title="Drag to resize column"
                      />
                    </div>
                    <div className="resizable-header" style={{ width: columnWidths['total-balances'] || 120 }}>
                      Balances
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          width: '8px',
                          height: '100%',
                          cursor: 'col-resize',
                          backgroundColor: 'transparent',
                          borderRight: '2px solid transparent',
                          marginRight: '-4px'
                        }}
                        onMouseDown={(e) => handleMouseDown('total-balances', e)}
                        onMouseEnter={(e) => {
                          e.target.style.borderRightColor = '#3b82f6';
                          e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.borderRightColor = 'transparent';
                          e.target.style.backgroundColor = 'transparent';
                        }}
                        title="Drag to resize column"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="spreadsheet-body">
                {Array.from({ length: 120 }, (_, monthIndex) => {
                  const currentDate = new Date();
                  const projectionDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthIndex);
                  
                  // Calculate totals for this month across all goals
                  let totalContributions = 0;
                  let totalPurchases = 0;
                  let totalBalances = 0;
                  
                  return (
                    <div key={monthIndex} className="spreadsheet-row">
                      <div className="month-cell" style={{ width: columnWidths.month }}>{monthIndex + 1}</div>
                      <div className="date-cell" style={{ width: columnWidths.date }}>{projectionDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}</div>
                      
                      {Object.values(savingsData).map(goal => {
                        const projections = calculateProjections(goal);
                        const projection = projections[monthIndex];
                        
                        // Add to totals
                        totalContributions += projection?.contribution || 0;
                        totalPurchases += projection?.purchases || 0;
                        totalBalances += projection?.balance || 0;
                        
                        const contributionKey = `${goal.id}-contribution`;
                        const purchaseKey = `${goal.id}-purchase`;
                        const balanceKey = `${goal.id}-balance`;
                        
                        return (
                          <div key={goal.id} className="goal-cell-group" style={{ display: 'flex' }}>
                            <div 
                              className={`contribution-cell ${bulkEditMode ? 'bulk-edit-mode' : ''} ${selectedCells.has(`${goal.id}-${monthIndex}-contribution`) ? 'selected' : ''}`}
                              style={{ width: columnWidths[contributionKey] || 150 }}
                              onClick={(e) => {
                                if (bulkEditMode) {
                                  e.preventDefault();
                                  if (e.shiftKey && selectionStart) {
                                    selectRange(selectionStart.goalId, selectionStart.month, goal.id, monthIndex, 'contribution');
                                  } else {
                                    toggleCellSelection(goal.id, monthIndex, 'contribution');
                                    setSelectionStart({ goalId: goal.id, month: monthIndex });
                                  }
                                }
                              }}
                              onContextMenu={(e) => {
                                if (bulkEditMode) {
                                  e.preventDefault();
                                  // Copy pattern context menu
                                  const startMonth = Math.max(0, monthIndex - 5);
                                  const endMonth = Math.min(119, monthIndex + 5);
                                  copyContributionPattern(goal.id, startMonth, endMonth);
                                }
                              }}
                            >
                              <div className="contribution-input-wrapper">
                                <input
                                  type="number"
                                  value={projection?.contribution || 0}
                                  onChange={(e) => updateMonthlyContribution(goal.id, monthIndex, e.target.value)}
                                  className="cell-input"
                                  step="0.01"
                                  min="0"
                                  style={{
                                    backgroundColor: projection?.isCustomContribution ? '#fef3c7' : 'transparent'
                                  }}
                                  title="Dollar amount contribution"
                                  disabled={bulkEditMode}
                                />
                                <div className="percentage-input-container">
                                  <input
                                    type="number"
                                    value={goal.monthlyContributionPercentages?.[monthIndex] || ''}
                                    onChange={(e) => updateMonthlyContributionPercentage(goal.id, monthIndex, e.target.value)}
                                    className="percentage-input"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    placeholder="%"
                                    title="Percentage of total savings budget"
                                    disabled={bulkEditMode}
                                  />
                                  <span className="percentage-symbol">%</span>
                                </div>
                                <div className="cell-action-overlay">
                                  <div className="cell-actions">
                                    {/* Apply to All Below buttons - always visible */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const currentValue = projection?.contribution || 0;
                                        applyToMonthsBelow(goal.id, monthIndex, currentValue, false);
                                      }}
                                      className="apply-below-btn"
                                      title="Apply this dollar amount to all months below"
                                    >
                                      ⬇️$
                                    </button>
                                    {goal.monthlyContributionPercentages?.[monthIndex] && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const currentPercentage = goal.monthlyContributionPercentages[monthIndex];
                                          applyToMonthsBelow(goal.id, monthIndex, currentPercentage, true);
                                        }}
                                        className="apply-below-btn percentage-btn"
                                        title="Apply this percentage to all months below"
                                      >
                                        ⬇️%
                                      </button>
                                    )}
                                    
                                    {/* Bulk edit actions - only visible in bulk mode */}
                                    {bulkEditMode && (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            copyContributionPattern(goal.id, monthIndex, monthIndex + 11); // Copy 12 months
                                          }}
                                          className="copy-pattern-btn"
                                          title="Copy 12-month pattern starting from this month"
                                        >
                                          📋
                                        </button>
                                        {copiedPattern && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              pasteContributionPattern(goal.id, monthIndex);
                                            }}
                                            className="paste-pattern-btn"
                                            title="Paste copied pattern starting from this month"
                                          >
                                            📄
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="purchase-cell" style={{ width: columnWidths[purchaseKey] || 120 }}>
                              <div className="purchase-cell-content">
                                {/* Show purchase list directly in cell */}
                                {projection?.purchasesList?.length > 0 ? (
                                  <div className="purchase-items-display">
                                    {projection.purchasesList.map((purchase, index) => (
                                      <div key={purchase.id} className="purchase-item-mini">
                                        <span className="purchase-mini-desc">{purchase.description}</span>
                                        <span className="purchase-mini-amount">{formatCurrency(purchase.amount)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="no-purchases">
                                    <span className="purchase-zero">$0</span>
                                  </div>
                                )}
                                
                                <button
                                  onClick={() => {
                                    const formKey = `${goal.id}-${monthIndex}`;
                                    setPurchaseForms(prev => ({
                                      ...prev,
                                      [formKey]: {
                                        show: !purchaseForms[formKey]?.show,
                                        amount: '',
                                        description: ''
                                      }
                                    }));
                                  }}
                                  className="purchase-manage-btn"
                                  title="Manage purchases for this month"
                                >
                                  {projection?.purchasesList?.length > 0 ? 'Edit' : '+ Add'}
                                </button>
                                
                                {/* Purchase Management Popup */}
                                {purchaseForms[`${goal.id}-${monthIndex}`]?.show && (
                                  <div className="purchase-popup">
                                    <div className="purchase-popup-header">
                                      <span>Purchases for {projectionDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                                      <button
                                        onClick={() => {
                                          const formKey = `${goal.id}-${monthIndex}`;
                                          setPurchaseForms(prev => ({
                                            ...prev,
                                            [formKey]: { show: false, amount: '', description: '' }
                                          }));
                                        }}
                                        className="purchase-popup-close"
                                      >
                                        ×
                                      </button>
                                    </div>
                                    
                                    {/* Existing Purchases */}
                                    {projection?.purchasesList?.length > 0 && (
                                      <div className="existing-purchases">
                                        {projection.purchasesList.map(purchase => (
                                          <div key={purchase.id} className="purchase-item">
                                            <span className="purchase-desc">{purchase.description}</span>
                                            <span className="purchase-amount">{formatCurrency(purchase.amount)}</span>
                                            <button
                                              onClick={() => removePurchaseFromMonth(goal.id, monthIndex, purchase.id)}
                                              className="purchase-remove-btn"
                                            >
                                              ×
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {/* Add New Purchase Form */}
                                    <div className="add-purchase-form">
                                      <input
                                        type="text"
                                        placeholder="Purchase description"
                                        value={purchaseForms[`${goal.id}-${monthIndex}`]?.description || ''}
                                        onChange={(e) => {
                                          const formKey = `${goal.id}-${monthIndex}`;
                                          setPurchaseForms(prev => ({
                                            ...prev,
                                            [formKey]: {
                                              ...prev[formKey],
                                              description: e.target.value
                                            }
                                          }));
                                        }}
                                        className="purchase-desc-input"
                                      />
                                      <input
                                        type="number"
                                        placeholder="Amount"
                                        value={purchaseForms[`${goal.id}-${monthIndex}`]?.amount || ''}
                                        onChange={(e) => {
                                          const formKey = `${goal.id}-${monthIndex}`;
                                          setPurchaseForms(prev => ({
                                            ...prev,
                                            [formKey]: {
                                              ...prev[formKey],
                                              amount: e.target.value
                                            }
                                          }));
                                        }}
                                        className="purchase-amount-input"
                                        step="0.01"
                                        min="0"
                                      />
                                      <button
                                        onClick={() => {
                                          const formKey = `${goal.id}-${monthIndex}`;
                                          const form = purchaseForms[formKey];
                                          if (form?.amount && form?.description) {
                                            addPurchaseToMonth(goal.id, monthIndex, form.amount, form.description);
                                            setPurchaseForms(prev => ({
                                              ...prev,
                                              [formKey]: { ...prev[formKey], amount: '', description: '' }
                                            }));
                                          }
                                        }}
                                        className="purchase-add-btn"
                                      >
                                        Add
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="balance-cell" style={{ width: columnWidths[balanceKey] || 120 }}>
                              {monthIndex === 0 ? (
                                // Month 1 - Allow manual balance editing
                                <input
                                  type="number"
                                  value={goal.currentBalance || 0}
                                  onChange={(e) => {
                                    const newBalance = parseFloat(e.target.value) || 0;
                                    const updatedSavingsData = {
                                      ...savingsData,
                                      [goal.id]: {
                                        ...goal,
                                        currentBalance: newBalance
                                      }
                                    };
                                    setSavingsDataState(updatedSavingsData);
                                    setSavingsData(updatedSavingsData);
                                  }}
                                  className="cell-input"
                                  step="0.01"
                                  style={{
                                    backgroundColor: '#e0f2fe',
                                    fontWeight: 'bold'
                                  }}
                                  title="Starting balance (editable)"
                                />
                              ) : (
                                // Months 2+ - Auto-calculated balance display
                                <span className={`balance-display ${(projection?.balance || 0) < 0 ? 'negative' : ''}`}>
                                  {formatCurrency(projection?.balance || 0)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Monthly Totals Column */}
                      <div className="totals-cell-group" style={{ display: 'flex' }}>
                        <div className="total-contributions" style={{ width: columnWidths['total-contributions'] || 120 }}>{formatCurrency(totalContributions)}</div>
                        <div className="total-purchases" style={{ width: columnWidths['total-purchases'] || 120 }}>{formatCurrency(totalPurchases)}</div>
                        <div className="total-balances" style={{ width: columnWidths['total-balances'] || 120 }}>{formatCurrency(totalBalances)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default Savings;