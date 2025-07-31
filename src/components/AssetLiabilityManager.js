import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import { 
  getAssetLiabilityData, 
  setAssetLiabilityData,
  getPaycheckData
} from '../utils/localStorage';
import CSVImportExport from './CSVImportExport';
import '../styles/liquid-assets.css';

// Helper function to convert plural type to singular
const getSingularType = (type) => {
  if (type === 'Liabilities') {
    return 'Liability';
  }
  if (type === 'Assets') {
    return 'Asset';
  }
  // Default fallback (remove 's' from the end)
  return type.slice(0, -1);
};

const AssetLiabilityManager = ({ 
  type, 
  title, 
  icon, 
  description, 
  itemTypes, 
  historicalField,
  itemTypeLabel = "Type",
  amountLabel = "Current Value"
}) => {
  const [inputs, setInputs] = useState([]);
  const [currentYearData, setCurrentYearData] = useState({});
  const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    loadCurrentYearData();
  }, []);

  const loadCurrentYearData = () => {
    const assetLiabilityData = getAssetLiabilityData();
    console.log(`🏠 AssetLiabilityManager (${type}) loadCurrentYearData - assetLiabilityData:`, assetLiabilityData);
    
    // For assets and liabilities, always use "Joint" as the only owner
    const userList = ['Joint'];
    
    setUsers(userList);
    setCurrentYearData(assetLiabilityData);
    
    // Load existing entries from asset liability data if available
    let loadedInputs = [];
    
    if (type === 'Liabilities') {
      // For liabilities, load both mortgage and other liability details from root level
      const mortgageData = assetLiabilityData.mortgageDetails || [];
      const otherLiabilityData = assetLiabilityData[`${historicalField}Details`] || [];
      
      // Combine mortgage and other liability data
      const allLiabilityData = [...mortgageData, ...otherLiabilityData];
      
      if (allLiabilityData.length > 0) {
        loadedInputs = allLiabilityData.map((item, index) => ({
          id: `loaded_${index}_${Date.now()}`,
          name: item.name || '',
          type: item.type || '',
          amount: item.amount ? item.amount.toString() : '',
          owner: 'Joint',
          // Additional fields for Mortgage
          lenderName: item.lenderName || '',
          originalLoanAmount: item.originalLoanAmount || '',
          interestRate: item.interestRate || '',
          loanTerm: item.loanTerm || '',
          monthlyPayment: item.monthlyPayment || '',
          principalAndInterest: item.principalAndInterest || '',
          pmi: item.pmi || '',
          escrow: item.escrow || '',
          startDate: item.startDate || ''
        }));
      }
    } else if (type === 'Assets') {
      // For assets, load both house and other asset details from root level
      const houseData = assetLiabilityData.houseDetails || [];
      const otherAssetData = assetLiabilityData[`${historicalField}Details`] || [];
      
      // Combine house and other asset data
      const allAssetData = [...houseData, ...otherAssetData];
      
      if (allAssetData.length > 0) {
        loadedInputs = allAssetData.map((item, index) => ({
          id: `loaded_${index}_${Date.now()}`,
          name: item.name || '',
          type: item.type || '',
          amount: item.amount ? item.amount.toString() : '',
          owner: 'Joint',
          // Additional fields for Primary Home
          originalPurchasePrice: item.originalPurchasePrice || '',
          purchaseDate: item.purchaseDate || '',
          propertyType: item.propertyType || item.type || ''
        }));
      }
    }
    
    if (loadedInputs.length > 0) {
      setInputs(loadedInputs);
    } else {
      // Initialize with one empty input if no existing data
      const baseInput = {
        id: Date.now().toString(),
        name: '',
        type: '',
        amount: '',
        owner: 'Joint'
      };

      // Add type-specific fields
      if (type === 'Assets') {
        baseInput.originalPurchasePrice = '';
        baseInput.purchaseDate = '';
        baseInput.propertyType = '';
      } else if (type === 'Liabilities') {
        baseInput.lenderName = '';
        baseInput.originalLoanAmount = '';
        baseInput.interestRate = '';
        baseInput.loanTerm = '';
        baseInput.monthlyPayment = '';
        baseInput.principalAndInterest = '';
        baseInput.pmi = '';
        baseInput.escrow = '';
        baseInput.startDate = '';
      }

      setInputs([baseInput]);
    }
  };

  const validateInputs = () => {
    const newErrors = {};
    let hasErrors = false;

    // Check for multiple primary homes if this is an Assets manager
    if (type === 'Assets') {
      const primaryHomes = inputs.filter(input => input.type === 'Primary Home' && input.name.trim());
      if (primaryHomes.length > 1) {
        // Mark all primary home entries (except the first one) with an error
        inputs.forEach((input, index) => {
          if (input.type === 'Primary Home' && input.name.trim()) {
            const primaryHomeIndex = primaryHomes.findIndex(ph => ph.id === input.id);
            if (primaryHomeIndex > 0) { // Allow the first one, mark others as errors
              if (!newErrors[index]) newErrors[index] = {};
              newErrors[index].type = 'Only one Primary Home is allowed. Please remove duplicate entries.';
              hasErrors = true;
            }
          }
        });
      }
    }

    inputs.forEach((input, index) => {
      const inputErrors = newErrors[index] || {};
      
      if (!input.name.trim()) {
        inputErrors.name = 'Name is required';
        hasErrors = true;
      }

      if (!input.type) {
        inputErrors.type = `${itemTypeLabel} is required`;
        hasErrors = true;
      } else if (!itemTypes.includes(input.type)) {
        inputErrors.type = `${itemTypeLabel} must be one of: ${itemTypes.join(', ')}`;
        hasErrors = true;
      }

      if (!input.amount || isNaN(parseFloat(input.amount))) {
        inputErrors.amount = `Valid ${amountLabel.toLowerCase()} is required`;
        hasErrors = true;
      } else if (parseFloat(input.amount) < 0) {
        inputErrors.amount = `${amountLabel} must be positive`;
        hasErrors = true;
      }

      if (!input.owner.trim()) {
        inputErrors.owner = 'Owner is required';
        hasErrors = true;
      }

      if (Object.keys(inputErrors).length > 0) {
        newErrors[index] = inputErrors;
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  };

  const handleInputChange = (index, field, value) => {
    // Special validation for Primary Home type selection
    if (type === 'Assets' && field === 'type' && value === 'Primary Home') {
      const existingPrimaryHomes = inputs.filter((input, idx) => 
        idx !== index && input.type === 'Primary Home' && input.name.trim()
      );
      
      if (existingPrimaryHomes.length > 0) {
        // Show error and prevent the change
        const newErrors = { ...errors };
        if (!newErrors[index]) newErrors[index] = {};
        newErrors[index].type = 'Only one Primary Home is allowed. Please remove the existing Primary Home first.';
        setErrors(newErrors);
        return; // Don't allow the change
      }
    }

    const updatedInputs = [...inputs];
    updatedInputs[index] = {
      ...updatedInputs[index],
      [field]: value
    };
    setInputs(updatedInputs);
    
    // Clear error when user starts typing
    if (errors[index] && errors[index][field]) {
      const newErrors = { ...errors };
      delete newErrors[index][field];
      if (Object.keys(newErrors[index]).length === 0) {
        delete newErrors[index];
      }
      setErrors(newErrors);
    }
    
    // Auto-save after a short delay
    setTimeout(() => {
      console.log(`🏠 Auto-save triggered by ${field} change in ${type}`);
      autoSaveData(updatedInputs, true);
    }, 1000);
  };

  const addInput = () => {
    const baseInput = {
      id: Date.now().toString(),
      name: '',
      type: '',
      amount: '',
      owner: 'Joint'
    };

    // Add type-specific fields
    if (type === 'Assets') {
      baseInput.originalPurchasePrice = '';
      baseInput.purchaseDate = '';
      baseInput.propertyType = '';
    } else if (type === 'Liabilities') {
      baseInput.lenderName = '';
      baseInput.originalLoanAmount = '';
      baseInput.interestRate = '';
      baseInput.loanTerm = '';
      baseInput.monthlyPayment = '';
      baseInput.principalAndInterest = '';
      baseInput.pmi = '';
      baseInput.escrow = '';
      baseInput.startDate = '';
    }

    const updatedInputs = [...inputs, baseInput];
    setInputs(updatedInputs);
    
    // Auto-save after adding
    setTimeout(() => {
      console.log(`🏠 Auto-save triggered by adding new ${getSingularType(type).toLowerCase()}`);
      autoSaveData(updatedInputs, true);
    }, 100);
  };

  const removeInput = (index) => {
    if (inputs.length > 1) {
      const updatedInputs = inputs.filter((_, i) => i !== index);
      setInputs(updatedInputs);
      
      // Remove errors for this input
      const newErrors = { ...errors };
      delete newErrors[index];
      
      // Reindex remaining errors
      const reindexedErrors = {};
      Object.keys(newErrors).forEach(key => {
        const errorIndex = parseInt(key);
        if (errorIndex > index) {
          reindexedErrors[errorIndex - 1] = newErrors[key];
        } else if (errorIndex < index) {
          reindexedErrors[errorIndex] = newErrors[key];
        }
      });
      
      setErrors(reindexedErrors);
      
      // Auto-save immediately when removing
      setTimeout(() => {
        console.log(`🏠 Auto-save triggered by removing ${getSingularType(type).toLowerCase()}`);
        autoSaveData(updatedInputs, true);
      }, 100);
    }
  };

  const deleteEntry = (index) => {
    if (window.confirm(`Are you sure you want to delete this ${getSingularType(type).toLowerCase()} entry? This will permanently remove it from your records.`)) {
      const updatedInputs = inputs.filter((_, i) => i !== index);
      
      // Ensure at least one empty input remains
      if (updatedInputs.length === 0) {
        const baseInput = {
          id: Date.now().toString(),
          name: '',
          type: '',
          amount: '',
          owner: 'Joint'
        };

        // Add type-specific fields
        if (type === 'Assets') {
          baseInput.originalPurchasePrice = '';
          baseInput.purchaseDate = '';
          baseInput.propertyType = '';
        } else if (type === 'Liabilities') {
          baseInput.lenderName = '';
          baseInput.originalLoanAmount = '';
          baseInput.interestRate = '';
          baseInput.loanTerm = '';
          baseInput.monthlyPayment = '';
          baseInput.principalAndInterest = '';
          baseInput.pmi = '';
          baseInput.escrow = '';
          baseInput.startDate = '';
        }

        updatedInputs.push(baseInput);
      }
      
      setInputs(updatedInputs);
      
      // Clear any errors for the deleted input
      const newErrors = { ...errors };
      delete newErrors[index];
      
      // Reindex remaining errors
      const reindexedErrors = {};
      Object.keys(newErrors).forEach(key => {
        const errorIndex = parseInt(key);
        if (errorIndex > index) {
          reindexedErrors[errorIndex - 1] = newErrors[key];
        } else if (errorIndex < index) {
          reindexedErrors[errorIndex] = newErrors[key];
        }
      });
      
      setErrors(reindexedErrors);
      
      // Immediately save the changes to historical data
      saveUpdatedData(updatedInputs);
      
      setSuccessMessage(`${getSingularType(type)} entry permanently deleted!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const startEditEntry = (index) => {
    setEditingIndex(index);
  };

  const cancelEditEntry = () => {
    setEditingIndex(null);
  };

  const saveEditEntry = () => {
    setEditingIndex(null);
    // Immediately save the changes to historical data
    saveUpdatedData(inputs);
    setSuccessMessage(`${getSingularType(type)} entry updated!`);
    setTimeout(() => setSuccessMessage(''), 2000);
  };

  const autoSaveData = (inputsToSave, isAutoSave = false) => {
    // For auto-save, skip if there's no meaningful data to save
    if (isAutoSave) {
      const hasValidData = inputsToSave.some(input => 
        input.name.trim() && input.type && input.amount && !isNaN(parseFloat(input.amount))
      );
      if (!hasValidData) {
        console.log(`🏠 Auto-save skipped for ${type}, no valid data`);
        return;
      }
    }
    
    saveUpdatedData(inputsToSave, isAutoSave);
  };

  const saveUpdatedData = (inputsToSave, isAutoSave = false) => {
    try {
      const assetLiabilityData = getAssetLiabilityData();
      
      // Filter out empty entries for saving
      const validInputs = inputsToSave.filter(input => 
        input.name.trim() && input.type && input.amount && !isNaN(parseFloat(input.amount))
      );
      
      // Separate by type based on component type
      let primaryInputs, otherInputs, primaryTotal, otherTotal;
      
      if (type === 'Liabilities') {
        // Separate mortgages from other liabilities
        primaryInputs = validInputs.filter(input => input.type === 'Mortgage');
        otherInputs = validInputs.filter(input => input.type !== 'Mortgage');
      } else if (type === 'Assets') {
        // Separate primary homes from other assets - ensure only one primary home
        const allPrimaryHomes = validInputs.filter(input => input.type === 'Primary Home');
        if (allPrimaryHomes.length > 1) {
          console.warn('⚠️ Multiple Primary Home entries detected. Using only the first one.');
          primaryInputs = [allPrimaryHomes[0]]; // Keep only the first primary home
        } else {
          primaryInputs = allPrimaryHomes;
        }
        otherInputs = validInputs.filter(input => input.type !== 'Primary Home');
      }
      
      // Calculate totals separately
      primaryTotal = primaryInputs.reduce((acc, input) => {
        return acc + (parseFloat(input.amount) || 0);
      }, 0);
      
      otherTotal = otherInputs.reduce((acc, input) => {
        return acc + (parseFloat(input.amount) || 0);
      }, 0);

      // Ensure the data structure has users object at root level
      if (!assetLiabilityData.users) {
        assetLiabilityData.users = {};
      }
      
      // Update the appropriate fields based on type - directly at root level
      if (type === 'Liabilities') {
        // Update mortgage field with mortgage total
        assetLiabilityData.mortgage = Math.round(primaryTotal);
        
        // Update other liabilities field with non-mortgage total
        assetLiabilityData[historicalField] = Math.round(otherTotal);
        
        // Store detailed items for display - separate for mortgages and other liabilities
        assetLiabilityData.mortgageDetails = primaryInputs.map(input => ({
          name: input.name.trim(),
          type: input.type,
          amount: Math.round(parseFloat(input.amount) || 0),
          // Additional mortgage fields
          lenderName: input.lenderName || '',
          originalLoanAmount: input.originalLoanAmount || '',
          interestRate: input.interestRate || '',
          loanTerm: input.loanTerm || '',
          monthlyPayment: input.monthlyPayment || '',
          principalAndInterest: input.principalAndInterest || '',
          pmi: input.pmi || '',
          escrow: input.escrow || '',
          startDate: input.startDate || ''
        }));
        
        const detailsField = `${historicalField}Details`;
        assetLiabilityData[detailsField] = otherInputs.map(input => ({
          name: input.name.trim(),
          type: input.type,
          amount: Math.round(parseFloat(input.amount) || 0)
        }));
      } else if (type === 'Assets') {
        // Update house field with primary home total
        assetLiabilityData.house = Math.round(primaryTotal);
        
        // Update other assets field with non-primary-home total
        assetLiabilityData[historicalField] = Math.round(otherTotal);
        
        // Store detailed items for display - separate for houses and other assets
        assetLiabilityData.houseDetails = primaryInputs.map(input => ({
          name: input.name.trim(),
          type: input.type,
          amount: Math.round(parseFloat(input.amount) || 0),
          // Additional home fields
          originalPurchasePrice: input.originalPurchasePrice || '',
          purchaseDate: input.purchaseDate || '',
          propertyType: input.propertyType || input.type || ''
        }));
        
        const detailsField = `${historicalField}Details`;
        assetLiabilityData[detailsField] = otherInputs.map(input => ({
          name: input.name.trim(),
          type: input.type,
          amount: Math.round(parseFloat(input.amount) || 0)
        }));
      }
      
      // Save updated asset liability data
      console.log(`🏠 AssetLiabilityManager (${type}) saveUpdatedData - Saving assetLiabilityData:`, assetLiabilityData);
      const saveResult = setAssetLiabilityData(assetLiabilityData);
      console.log(`🏠 AssetLiabilityManager (${type}) saveUpdatedData - Save result:`, saveResult);
      if (saveResult) {
        setCurrentYearData(assetLiabilityData);
        
        // Dispatch event to notify other components of the data update
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('assetLiabilityDataUpdated', { detail: assetLiabilityData }));
        }, 50);
        
      }
      
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const saveChanges = () => {
    // Filter out empty entries for saving
    const validInputs = inputs.filter(input => 
      input.name.trim() && input.type && input.amount && !isNaN(parseFloat(input.amount))
    );

    if (validInputs.length === 0) {
      alert(`Please add at least one valid ${getSingularType(type).toLowerCase()} entry before saving.`);
      return;
    }

    try {
      saveUpdatedData(inputs, false);
      
      const totalAmount = validInputs.reduce((acc, input) => {
        return acc + (parseFloat(input.amount) || 0);
      }, 0);
      
      setSuccessMessage(`Successfully saved ${validInputs.length} ${type.toLowerCase()} entries! Total: ${formatCurrency(totalAmount)}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Error saving changes. Please try again.');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getCurrentTotal = () => {
    return inputs.reduce((acc, input) => {
      return acc + (parseFloat(input.amount) || 0);
    }, 0);
  };

  // CSV Import/Export functions
  const formatRowData = (input) => {
    const baseRow = [
      input.name || '',
      input.type || '',
      input.amount || '',
      input.owner || 'Joint'
    ];

    // Add type-specific fields
    if (type === 'Assets') {
      baseRow.push(
        input.originalPurchasePrice || '',
        input.purchaseDate || '',
        input.propertyType || ''
      );
    } else if (type === 'Liabilities') {
      baseRow.push(
        input.lenderName || '',
        input.originalLoanAmount || '',
        input.interestRate || '',
        input.loanTerm || '',
        input.monthlyPayment || '',
        input.principalAndInterest || '',
        input.pmi || '',
        input.escrow || '',
        input.startDate || ''
      );
    }

    return baseRow;
  };

  const parseRowData = (row) => {
    if (!row.name?.trim() || !row.type?.trim()) {
      return null;
    }

    const baseInput = {
      id: Date.now().toString() + Math.random(),
      name: row.name?.trim() || '',
      type: row.type?.trim() || '',
      amount: row.amount?.toString() || '',
      owner: row.owner?.trim() || 'Joint'
    };

    // Add type-specific fields
    if (type === 'Assets') {
      baseInput.originalPurchasePrice = row.originalPurchasePrice?.toString() || '';
      baseInput.purchaseDate = row.purchaseDate?.toString() || '';
      baseInput.propertyType = row.propertyType?.toString() || '';
    } else if (type === 'Liabilities') {
      baseInput.lenderName = row.lenderName?.toString() || '';
      baseInput.originalLoanAmount = row.originalLoanAmount?.toString() || '';
      baseInput.interestRate = row.interestRate?.toString() || '';
      baseInput.loanTerm = row.loanTerm?.toString() || '';
      baseInput.monthlyPayment = row.monthlyPayment?.toString() || '';
      baseInput.principalAndInterest = row.principalAndInterest?.toString() || '';
      baseInput.pmi = row.pmi?.toString() || '';
      baseInput.escrow = row.escrow?.toString() || '';
      baseInput.startDate = row.startDate?.toString() || '';
    }

    return baseInput;
  };

  const generateTemplate = () => {
    const baseTemplate = {
      name: `Sample ${getSingularType(type)}`,
      type: itemTypes[0] || '',
      amount: '100000',
      owner: 'Joint'
    };

    // Add type-specific template fields
    if (type === 'Assets') {
      baseTemplate.originalPurchasePrice = '350000';
      baseTemplate.purchaseDate = '2020-01-01';
      baseTemplate.propertyType = 'Primary Home';
    } else if (type === 'Liabilities') {
      baseTemplate.lenderName = 'Sample Bank';
      baseTemplate.originalLoanAmount = '280000';
      baseTemplate.interestRate = '3.5';
      baseTemplate.loanTerm = '30';
      baseTemplate.monthlyPayment = '1850';
      baseTemplate.principalAndInterest = '1450';
      baseTemplate.pmi = '150';
      baseTemplate.escrow = '250';
      baseTemplate.startDate = '2020-01-01';
    }

    return [baseTemplate];
  };

  const getCSVHeaders = () => {
    const baseHeaders = ['Name', itemTypeLabel, amountLabel, 'Owner'];
    
    if (type === 'Assets') {
      baseHeaders.push('Original Purchase Price', 'Purchase Date', 'Property Type');
    } else if (type === 'Liabilities') {
      baseHeaders.push(
        'Lender Name', 'Original Loan Amount', 'Interest Rate (%)', 
        'Loan Term (years)', 'Monthly Payment', 'Principal & Interest',
        'PMI', 'Escrow', 'Start Date'
      );
    }

    return baseHeaders;
  };

  const handleCSVImportSuccess = (parsedData) => {
    setInputs(parsedData);
    setSuccessMessage(`Successfully imported ${parsedData.length} ${type.toLowerCase()} entries from CSV!`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleCSVImportError = (error) => {
    alert(`Error importing CSV: ${error.message}`);
  };

  const handleResetData = () => {
    if (window.confirm(`Are you sure you want to reset all ${type.toLowerCase()} data? This will permanently delete all entries and cannot be undone.`)) {
      const baseInput = {
        id: Date.now().toString(),
        name: '',
        type: '',
        amount: '',
        owner: 'Joint'
      };

      // Add type-specific fields
      if (type === 'Assets') {
        baseInput.originalPurchasePrice = '';
        baseInput.purchaseDate = '';
        baseInput.propertyType = '';
      } else if (type === 'Liabilities') {
        baseInput.lenderName = '';
        baseInput.originalLoanAmount = '';
        baseInput.interestRate = '';
        baseInput.loanTerm = '';
        baseInput.monthlyPayment = '';
        baseInput.principalAndInterest = '';
        baseInput.pmi = '';
        baseInput.escrow = '';
        baseInput.startDate = '';
      }

      setInputs([baseInput]);
      saveUpdatedData([], false);
      setSuccessMessage(`All ${type.toLowerCase()} data has been reset!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const currentTotal = getCurrentTotal();

  return (
    <>
      <Navigation />
      <div className="app-container">
        <div className="header">
          <h1>{icon} {title}</h1>
          <p>{description}</p>
        </div>

        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}


        {/* Live Total Display */}
        <div className="live-total-section">
          <div className="live-total-card">
            <h3>Current Total {type}</h3>
            <div className="live-total-amount">
              {formatCurrency(getCurrentTotal())}
            </div>
            <p className="live-total-description">
              Total from {inputs.filter(input => input.name.trim() && input.amount && !isNaN(parseFloat(input.amount))).length} active entries
            </p>
          </div>
        </div>

        {/* Asset Management Section */}
        <div className="portfolio-form-section">
          <h2>Manage Your {type}</h2>
          <p>Add, edit, or remove your {type.toLowerCase()} entries. Click "Save Changes" to update your financial records.</p>
          
          {inputs.map((input, index) => (
            <div key={input.id} className="portfolio-input-row">
              <div className="input-header">
                <h4>{getSingularType(type)} {index + 1}</h4>
                <div className="input-actions">
                  {editingIndex === index ? (
                    <>
                      <button 
                        type="button" 
                        onClick={saveEditEntry}
                        className="btn-save"
                        title="Save changes"
                      >
                        💾 Save
                      </button>
                      <button 
                        type="button" 
                        onClick={cancelEditEntry}
                        className="btn-cancel"
                        title="Cancel editing"
                      >
                        ✕ Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        type="button" 
                        onClick={() => startEditEntry(index)}
                        className="btn-edit"
                        title="Edit this entry"
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        type="button" 
                        onClick={() => deleteEntry(index)}
                        className="btn-remove"
                        title="Delete this entry"
                      >
                        🗑️ Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-field">
                  <label>Name</label>
                  <input
                    type="text"
                    value={input.name}
                    onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                    placeholder={`e.g., ${type === 'Assets' ? 'Primary Home' : 'Mortgage'}`}
                    className={errors[index] && errors[index].name ? 'error' : ''}
                  />
                  {errors[index] && errors[index].name && <span className="error-text">{errors[index].name}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>{itemTypeLabel}</label>
                  <select
                    value={input.type}
                    onChange={(e) => handleInputChange(index, 'type', e.target.value)}
                    className={errors[index] && errors[index].type ? 'error' : ''}
                  >
                    <option value="">Select {itemTypeLabel}</option>
                    {itemTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors[index] && errors[index].type && <span className="error-text">{errors[index].type}</span>}
                </div>

                <div className="form-field">
                  <label>{amountLabel}</label>
                  <input
                    type="number"
                    value={input.amount}
                    onChange={(e) => handleInputChange(index, 'amount', e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className={errors[index] && errors[index].amount ? 'error' : ''}
                  />
                  {errors[index] && errors[index].amount && <span className="error-text">{errors[index].amount}</span>}
                </div>
              </div>

              {/* Additional fields for Primary Home */}
              {type === 'Assets' && input.type === 'Primary Home' && (
                <>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Original Purchase Price</label>
                      <input
                        type="number"
                        value={input.originalPurchasePrice || ''}
                        onChange={(e) => handleInputChange(index, 'originalPurchasePrice', e.target.value)}
                        placeholder="350000"
                        step="1000"
                        min="0"
                      />
                    </div>

                    <div className="form-field">
                      <label>Purchase Date</label>
                      <input
                        type="date"
                        value={input.purchaseDate || ''}
                        onChange={(e) => handleInputChange(index, 'purchaseDate', e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Additional fields for Mortgage */}
              {type === 'Liabilities' && input.type === 'Mortgage' && (
                <>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Lender Name</label>
                      <input
                        type="text"
                        value={input.lenderName || ''}
                        onChange={(e) => handleInputChange(index, 'lenderName', e.target.value)}
                        placeholder="e.g., Wells Fargo, Chase Bank"
                      />
                    </div>

                    <div className="form-field">
                      <label>Original Loan Amount</label>
                      <input
                        type="number"
                        value={input.originalLoanAmount || ''}
                        onChange={(e) => handleInputChange(index, 'originalLoanAmount', e.target.value)}
                        placeholder="280000"
                        step="1000"
                        min="0"
                      />
                    </div>

                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label>Interest Rate (%)</label>
                      <input
                        type="number"
                        value={input.interestRate || ''}
                        onChange={(e) => handleInputChange(index, 'interestRate', e.target.value)}
                        placeholder="3.5"
                        step="0.01"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label>Loan Term (years)</label>
                      <input
                        type="number"
                        value={input.loanTerm || ''}
                        onChange={(e) => handleInputChange(index, 'loanTerm', e.target.value)}
                        placeholder="30"
                        min="1"
                        max="50"
                      />
                    </div>

                    <div className="form-field">
                      <label>Loan Start Date</label>
                      <input
                        type="date"
                        value={input.startDate || ''}
                        onChange={(e) => handleInputChange(index, 'startDate', e.target.value)}
                      />
                    </div>
                  </div>

                  <h4>Monthly Payment Breakdown</h4>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Total Monthly Payment</label>
                      <input
                        type="number"
                        value={input.monthlyPayment || ''}
                        onChange={(e) => handleInputChange(index, 'monthlyPayment', e.target.value)}
                        placeholder="1850"
                        step="0.01"
                        min="0"
                      />
                    </div>

                    <div className="form-field">
                      <label>Principal & Interest</label>
                      <input
                        type="number"
                        value={input.principalAndInterest || ''}
                        onChange={(e) => handleInputChange(index, 'principalAndInterest', e.target.value)}
                        placeholder="1450"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label>PMI (Private Mortgage Insurance)</label>
                      <input
                        type="number"
                        value={input.pmi || ''}
                        onChange={(e) => handleInputChange(index, 'pmi', e.target.value)}
                        placeholder="150"
                        step="0.01"
                        min="0"
                      />
                    </div>

                    <div className="form-field">
                      <label>Escrow (Taxes & Insurance)</label>
                      <input
                        type="number"
                        value={input.escrow || ''}
                        onChange={(e) => handleInputChange(index, 'escrow', e.target.value)}
                        placeholder="250"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}

          <div className="form-actions">
            <button type="button" onClick={addInput} className="btn-secondary">
              + Add Another {getSingularType(type)}
            </button>
          </div>
        </div>

        {/* CSV Import/Export Section */}
        <CSVImportExport
          title={`${type} Data Management`}
          subtitle={`Import and export your ${type.toLowerCase()} data using CSV files`}
          data={inputs}
          headers={getCSVHeaders()}
          formatRowData={formatRowData}
          parseRowData={parseRowData}
          generateTemplate={generateTemplate}
          onImportSuccess={handleCSVImportSuccess}
          onImportError={handleCSVImportError}
          dataType={type.toLowerCase()}
          userNames={users}
          showResetButton={true}
          onReset={handleResetData}
          className="asset-liability-csv"
        />

      </div>
    </>
  );
};

export default AssetLiabilityManager;