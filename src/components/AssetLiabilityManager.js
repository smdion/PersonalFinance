import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import { 
  getHistoricalData, 
  setHistoricalData,
  getPaycheckData
} from '../utils/localStorage';
import '../styles/portfolio.css';

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

  useEffect(() => {
    loadCurrentYearData();
  }, []);

  const loadCurrentYearData = () => {
    const currentYear = new Date().getFullYear();
    const historicalData = getHistoricalData();
    const paycheckData = getPaycheckData();
    
    // Get users from paycheck data
    const userList = [];
    if (paycheckData && paycheckData.your && paycheckData.your.name && paycheckData.your.name.trim()) {
      userList.push(paycheckData.your.name.trim());
    }
    if (paycheckData && paycheckData.spouse && paycheckData.spouse.name && paycheckData.spouse.name.trim() && 
        (paycheckData.settings ? paycheckData.settings.showSpouseCalculator !== false : true)) {
      userList.push(paycheckData.spouse.name.trim());
    }
    
    // If no users from paycheck, get from existing historical data or create default
    if (userList.length === 0) {
      const existingUsers = Object.keys((historicalData[currentYear] && historicalData[currentYear].users) ? historicalData[currentYear].users : {});
      if (existingUsers.length > 0) {
        userList.push(...existingUsers);
      } else {
        userList.push('User'); // Default user name
      }
    }
    
    setUsers(userList);
    setCurrentYearData(historicalData[currentYear] || { users: {} });
    
    // Initialize inputs if empty
    if (inputs.length === 0) {
      setInputs([{
        id: Date.now().toString(),
        name: '',
        type: '',
        amount: '',
        owner: userList[0] || 'User'
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
      owner: users[0] || 'User'
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

  const updateHistoricalData = () => {
    if (!validateInputs()) {
      return;
    }

    try {
      const currentYear = new Date().getFullYear();
      const historicalData = getHistoricalData();
      
      // Calculate total amount
      const totalAmount = inputs.reduce((acc, input) => {
        return acc + (parseFloat(input.amount) || 0);
      }, 0);

      // Update current year entry
      if (!historicalData[currentYear]) {
        historicalData[currentYear] = { users: {} };
      }

      // Update data for each user (distributed evenly if multiple users)
      const userCount = users.length;
      users.forEach(userName => {
        if (!historicalData[currentYear].users[userName]) {
          historicalData[currentYear].users[userName] = {};
        }
        
        const userData = historicalData[currentYear].users[userName];
        
        // Update the specific field with the total amount (divided by user count)
        userData[historicalField] = Math.round(totalAmount / userCount);
      });
      
      // Save updated historical data
      const saveResult = setHistoricalData(historicalData);
      if (saveResult) {
        setSuccessMessage(`Successfully updated ${currentYear} ${type.toLowerCase()} data!`);
        setCurrentYearData(historicalData[currentYear]);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
        
        console.log(`Updated ${currentYear} historical data - ${historicalField}:`, totalAmount);
      } else {
        alert('Failed to save historical data. Please try again.');
      }
      
    } catch (error) {
      console.error('Error updating historical data:', error);
      alert('Error updating historical data. Please try again.');
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

        {/* Current Historical Data Display */}
        {Object.keys(currentYearData.users || {}).length > 0 && (
          <div className="current-data-section">
            <h2>Current {currentYear} {type} Data</h2>
            <div className="current-data-cards">
              {Object.entries(currentYearData.users).map(([userName, userData]) => (
                <div key={userName} className="user-data-card">
                  <h3>{userName}</h3>
                  <div className="investment-fields">
                    <div>{type}: {formatCurrency(userData[historicalField])}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Section */}
        <div className="portfolio-form-section">
          <h2>{type} Values</h2>
          <p>Enter your current {type.toLowerCase()} values:</p>
          
          {inputs.map((input, index) => (
            <div key={input.id} className="portfolio-input-row">
              <div className="input-header">
                <h4>{type.slice(0, -1)} {index + 1}</h4>
                {inputs.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeInput(index)}
                    className="btn-remove"
                  >
                    ✕
                  </button>
                )}
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

                <div className="form-field">
                  <label>Owner</label>
                  <select
                    value={input.owner}
                    onChange={(e) => handleInputChange(index, 'owner', e.target.value)}
                    className={errors[index] && errors[index].owner ? 'error' : ''}
                  >
                    {users.map(user => (
                      <option key={user} value={user}>{user}</option>
                    ))}
                  </select>
                  {errors[index] && errors[index].owner && <span className="error-text">{errors[index].owner}</span>}
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
              + Add Another {type.slice(0, -1)}
            </button>
            <button type="button" onClick={updateHistoricalData} className="btn-primary">
              Update Historical Data
            </button>
          </div>
        </div>

        {/* Summary Preview */}
        <div className="summary-preview">
          <h2>Preview of Updates</h2>
          <div className="summary-cards">
            <div className="summary-card">
              <h3>Total {type}</h3>
              <p className="amount">{formatCurrency(currentTotal)}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AssetLiabilityManager;