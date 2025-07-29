import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import { 
  getHistoricalData, 
  setHistoricalData,
  getPaycheckData
} from '../utils/localStorage';
import '../styles/portfolio.css';

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
    const currentYear = new Date().getFullYear();
    const historicalData = getHistoricalData();
    
    // For assets and liabilities, always use "Joint" as the only owner
    const userList = ['Joint'];
    
    setUsers(userList);
    setCurrentYearData(historicalData[currentYear] || { users: {} });
    
    // Load existing entries from historical data if available
    let loadedInputs = [];
    
    if (type === 'Liabilities') {
      // For liabilities, load both mortgage and other liability details from root level
      const mortgageData = historicalData[currentYear]?.mortgageDetails || [];
      const otherLiabilityData = historicalData[currentYear]?.[`${historicalField}Details`] || [];
      
      // Combine mortgage and other liability data
      const allLiabilityData = [...mortgageData, ...otherLiabilityData];
      
      if (allLiabilityData.length > 0) {
        loadedInputs = allLiabilityData.map((item, index) => ({
          id: `loaded_${index}_${Date.now()}`,
          name: item.name || '',
          type: item.type || '',
          amount: item.amount ? item.amount.toString() : '',
          owner: 'Joint'
        }));
      }
    } else if (type === 'Assets') {
      // For assets, load both house and other asset details from root level
      const houseData = historicalData[currentYear]?.houseDetails || [];
      const otherAssetData = historicalData[currentYear]?.[`${historicalField}Details`] || [];
      
      // Combine house and other asset data
      const allAssetData = [...houseData, ...otherAssetData];
      
      if (allAssetData.length > 0) {
        loadedInputs = allAssetData.map((item, index) => ({
          id: `loaded_${index}_${Date.now()}`,
          name: item.name || '',
          type: item.type || '',
          amount: item.amount ? item.amount.toString() : '',
          owner: 'Joint'
        }));
      }
    }
    
    if (loadedInputs.length > 0) {
      setInputs(loadedInputs);
    } else {
      // Initialize with one empty input if no existing data
      setInputs([{
        id: Date.now().toString(),
        name: '',
        type: '',
        amount: '',
        owner: 'Joint'
      }]);
    }
  };

  const validateInputs = () => {
    const newErrors = {};
    let hasErrors = false;

    inputs.forEach((input, index) => {
      const inputErrors = {};
      
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
  };

  const addInput = () => {
    setInputs([...inputs, {
      id: Date.now().toString(),
      name: '',
      type: '',
      amount: '',
      owner: 'Joint'
    }]);
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
    }
  };

  const deleteEntry = (index) => {
    if (window.confirm(`Are you sure you want to delete this ${getSingularType(type).toLowerCase()} entry? This will permanently remove it from your records.`)) {
      const updatedInputs = inputs.filter((_, i) => i !== index);
      
      // Ensure at least one empty input remains
      if (updatedInputs.length === 0) {
        updatedInputs.push({
          id: Date.now().toString(),
          name: '',
          type: '',
          amount: '',
          owner: 'Joint'
        });
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

  const saveUpdatedData = (inputsToSave) => {
    try {
      const currentYear = new Date().getFullYear();
      const historicalData = getHistoricalData();
      
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
        // Separate primary homes from other assets
        primaryInputs = validInputs.filter(input => input.type === 'Primary Home');
        otherInputs = validInputs.filter(input => input.type !== 'Primary Home');
      }
      
      // Calculate totals separately
      primaryTotal = primaryInputs.reduce((acc, input) => {
        return acc + (parseFloat(input.amount) || 0);
      }, 0);
      
      otherTotal = otherInputs.reduce((acc, input) => {
        return acc + (parseFloat(input.amount) || 0);
      }, 0);

      // Update current year entry at root level (not user level)
      if (!historicalData[currentYear]) {
        historicalData[currentYear] = { users: {} };
      }
      
      // Update the appropriate fields based on type - directly at root level
      if (type === 'Liabilities') {
        // Update mortgage field with mortgage total
        historicalData[currentYear].mortgage = Math.round(primaryTotal);
        
        // Update other liabilities field with non-mortgage total
        historicalData[currentYear][historicalField] = Math.round(otherTotal);
        
        // Store detailed items for display - separate for mortgages and other liabilities
        historicalData[currentYear].mortgageDetails = primaryInputs.map(input => ({
          name: input.name.trim(),
          type: input.type,
          amount: Math.round(parseFloat(input.amount) || 0)
        }));
        
        const detailsField = `${historicalField}Details`;
        historicalData[currentYear][detailsField] = otherInputs.map(input => ({
          name: input.name.trim(),
          type: input.type,
          amount: Math.round(parseFloat(input.amount) || 0)
        }));
      } else if (type === 'Assets') {
        // Update house field with primary home total
        historicalData[currentYear].house = Math.round(primaryTotal);
        
        // Update other assets field with non-primary-home total
        historicalData[currentYear][historicalField] = Math.round(otherTotal);
        
        // Store detailed items for display - separate for houses and other assets
        historicalData[currentYear].houseDetails = primaryInputs.map(input => ({
          name: input.name.trim(),
          type: input.type,
          amount: Math.round(parseFloat(input.amount) || 0)
        }));
        
        const detailsField = `${historicalField}Details`;
        historicalData[currentYear][detailsField] = otherInputs.map(input => ({
          name: input.name.trim(),
          type: input.type,
          amount: Math.round(parseFloat(input.amount) || 0)
        }));
      }
      
      // Save updated historical data
      const saveResult = setHistoricalData(historicalData);
      if (saveResult) {
        setCurrentYearData(historicalData[currentYear]);
        
        // Dispatch event to notify other components of the data update
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('historicalDataUpdated', { detail: historicalData }));
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
      saveUpdatedData(inputs);
      
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

  const currentTotal = getCurrentTotal();
  const currentYear = new Date().getFullYear();

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
            </div>
          ))}

          <div className="form-actions">
            <button type="button" onClick={addInput} className="btn-secondary">
              + Add Another {getSingularType(type)}
            </button>
            <button type="button" onClick={saveChanges} className="btn-primary">
              💾 Save Changes
            </button>
          </div>
        </div>

      </div>
    </>
  );
};

export default AssetLiabilityManager;