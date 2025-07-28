import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import { 
  getHistoricalData, 
  setHistoricalData,
  getPaycheckData
} from '../utils/localStorage';
import '../styles/portfolio.css';

const Portfolio = () => {
  const [portfolioInputs, setPortfolioInputs] = useState([]);
  const [currentYearData, setCurrentYearData] = useState({});
  const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // Validation options
  const TAX_TYPES = ['Tax-Free', 'Tax-Deferred', 'After-Tax', 'Roth'];
  const ACCOUNT_TYPES = ['IRA', 'Brokerage', '401k', '401k-Rollover', '401k-EmployerMatch', 'ESPP', 'HSA'];

  useEffect(() => {
    loadCurrentYearData();
  }, []);

  const loadCurrentYearData = () => {
    const currentYear = new Date().getFullYear();
    const historicalData = getHistoricalData();
    const paycheckData = getPaycheckData();
    
    // Get users from paycheck data
    const userList = [];
    if (paycheckData?.your?.name?.trim()) {
      userList.push(paycheckData.your.name.trim());
    }
    if (paycheckData?.spouse?.name?.trim() && (paycheckData?.settings?.showSpouseCalculator ?? true)) {
      userList.push(paycheckData.spouse.name.trim());
    }
    
    // If no users from paycheck, get from existing historical data or create default
    if (userList.length === 0) {
      const existingUsers = Object.keys(historicalData[currentYear]?.users || {});
      if (existingUsers.length > 0) {
        userList.push(...existingUsers);
      } else {
        userList.push('User'); // Default user name
      }
    }
    
    setUsers(userList);
    setCurrentYearData(historicalData[currentYear] || { users: {} });
    
    // Initialize portfolio inputs if empty
    if (portfolioInputs.length === 0) {
      setPortfolioInputs([{
        id: Date.now().toString(),
        accountName: '',
        taxType: '',
        amount: '',
        accountType: '',
        owner: userList[0] || 'User'
      }]);
    }
  };

  const validateInputs = () => {
    const newErrors = {};
    let hasErrors = false;

    portfolioInputs.forEach((input, index) => {
      const inputErrors = {};
      
      if (!input.accountName.trim()) {
        inputErrors.accountName = 'Account name is required';
        hasErrors = true;
      }

      if (!input.taxType) {
        inputErrors.taxType = 'Tax type is required';
        hasErrors = true;
      } else if (!TAX_TYPES.includes(input.taxType)) {
        inputErrors.taxType = `Tax type must be one of: ${TAX_TYPES.join(', ')}`;
        hasErrors = true;
      }

      if (!input.amount || isNaN(parseFloat(input.amount))) {
        inputErrors.amount = 'Valid amount is required';
        hasErrors = true;
      } else if (parseFloat(input.amount) < 0) {
        inputErrors.amount = 'Amount must be positive';
        hasErrors = true;
      }

      if (!input.accountType) {
        inputErrors.accountType = 'Account type is required';
        hasErrors = true;
      } else if (!ACCOUNT_TYPES.includes(input.accountType)) {
        inputErrors.accountType = `Account type must be one of: ${ACCOUNT_TYPES.join(', ')}`;
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
    const updatedInputs = [...portfolioInputs];
    updatedInputs[index] = {
      ...updatedInputs[index],
      [field]: value
    };
    setPortfolioInputs(updatedInputs);
    
    // Clear error when user starts typing
    if (errors[index]?.[field]) {
      const newErrors = { ...errors };
      delete newErrors[index][field];
      if (Object.keys(newErrors[index]).length === 0) {
        delete newErrors[index];
      }
      setErrors(newErrors);
    }
  };

  const addPortfolioInput = () => {
    setPortfolioInputs([...portfolioInputs, {
      id: Date.now().toString(),
      accountName: '',
      taxType: '',
      amount: '',
      accountType: '',
      owner: users[0] || 'User'
    }]);
  };

  const removePortfolioInput = (index) => {
    if (portfolioInputs.length > 1) {
      const updatedInputs = portfolioInputs.filter((_, i) => i !== index);
      setPortfolioInputs(updatedInputs);
      
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
      
      // Calculate totals by tax type and account type
      const totals = portfolioInputs.reduce((acc, input) => {
        const amount = parseFloat(input.amount) || 0;
        
        // Map by tax type
        switch (input.taxType) {
          case 'Tax-Free':
            acc.taxFree += amount;
            break;
          case 'Tax-Deferred':
            acc.taxDeferred += amount;
            break;
          case 'After-Tax':
          case 'Roth':
            acc.brokerage += amount;
            break;
        }
        
        // Map by account type
        switch (input.accountType) {
          case 'ESPP':
            acc.espp += amount;
            break;
          case 'HSA':
            acc.hsa += amount;
            break;
        }
        
        return acc;
      }, {
        taxFree: 0,
        taxDeferred: 0,
        brokerage: 0,
        espp: 0,
        hsa: 0
      });

      // Update current year entry
      if (!historicalData[currentYear]) {
        historicalData[currentYear] = { users: {} };
      }

      // Update investment data for each user (distributed evenly if multiple users)
      const userCount = users.length;
      users.forEach(userName => {
        if (!historicalData[currentYear].users[userName]) {
          historicalData[currentYear].users[userName] = {};
        }
        
        const userData = historicalData[currentYear].users[userName];
        
        // Update investment fields with portfolio totals (divided by user count)
        userData.taxFree = Math.round(totals.taxFree / userCount);
        userData.taxDeferred = Math.round(totals.taxDeferred / userCount);
        userData.brokerage = Math.round(totals.brokerage / userCount);
        userData.espp = Math.round(totals.espp / userCount);
        userData.hsa = Math.round(totals.hsa / userCount);
        
        // Keep existing cash value or set to 0
        if (userData.cash === undefined) {
          userData.cash = 0;
        }
      });
      
      // Save updated historical data
      const saveResult = setHistoricalData(historicalData);
      if (saveResult) {
        setSuccessMessage(`Successfully updated ${currentYear} investment data!`);
        setCurrentYearData(historicalData[currentYear]);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
        
        console.log(`Updated ${currentYear} historical data:`, totals);
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

  const getCurrentTotals = () => {
    return portfolioInputs.reduce((acc, input) => {
      const amount = parseFloat(input.amount) || 0;
      
      switch (input.taxType) {
        case 'Tax-Free':
          acc.taxFree += amount;
          break;
        case 'Tax-Deferred':
          acc.taxDeferred += amount;
          break;
        case 'After-Tax':
        case 'Roth':
          acc.brokerage += amount;
          break;
      }
      
      return acc;
    }, {
      taxFree: 0,
      taxDeferred: 0,
      brokerage: 0
    });
  };

  const currentTotals = getCurrentTotals();
  const currentYear = new Date().getFullYear();

  return (
    <>
      <Navigation />
      <div className="app-container">
        <div className="header">
          <h1>📈 Portfolio Data Update</h1>
          <p>Input current portfolio values to update {currentYear} historical data</p>
        </div>

        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}

        {/* Current Historical Data Display */}
        {Object.keys(currentYearData.users || {}).length > 0 && (
          <div className="current-data-section">
            <h2>Current {currentYear} Investment Data</h2>
            <div className="current-data-cards">
              {Object.entries(currentYearData.users).map(([userName, userData]) => (
                <div key={userName} className="user-data-card">
                  <h3>{userName}</h3>
                  <div className="investment-fields">
                    <div>Tax-Free: {formatCurrency(userData.taxFree)}</div>
                    <div>Tax-Deferred: {formatCurrency(userData.taxDeferred)}</div>
                    <div>Brokerage: {formatCurrency(userData.brokerage)}</div>
                    <div>ESPP: {formatCurrency(userData.espp)}</div>
                    <div>HSA: {formatCurrency(userData.hsa)}</div>
                    <div>Cash: {formatCurrency(userData.cash)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio Input Section */}
        <div className="portfolio-form-section">
          <h2>Portfolio Account Values</h2>
          <p>Enter your current account values from investment websites:</p>
          
          {portfolioInputs.map((input, index) => (
            <div key={input.id} className="portfolio-input-row">
              <div className="input-header">
                <h4>Account {index + 1}</h4>
                {portfolioInputs.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removePortfolioInput(index)}
                    className="btn-remove"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              <div className="form-row">
                <div className="form-field">
                  <label>Account Name</label>
                  <input
                    type="text"
                    value={input.accountName}
                    onChange={(e) => handleInputChange(index, 'accountName', e.target.value)}
                    placeholder="e.g., Fidelity 401k"
                    className={errors[index]?.accountName ? 'error' : ''}
                  />
                  {errors[index]?.accountName && <span className="error-text">{errors[index].accountName}</span>}
                </div>

                <div className="form-field">
                  <label>Owner</label>
                  <select
                    value={input.owner}
                    onChange={(e) => handleInputChange(index, 'owner', e.target.value)}
                    className={errors[index]?.owner ? 'error' : ''}
                  >
                    {users.map(user => (
                      <option key={user} value={user}>{user}</option>
                    ))}
                  </select>
                  {errors[index]?.owner && <span className="error-text">{errors[index].owner}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Tax Type</label>
                  <select
                    value={input.taxType}
                    onChange={(e) => handleInputChange(index, 'taxType', e.target.value)}
                    className={errors[index]?.taxType ? 'error' : ''}
                  >
                    <option value="">Select Tax Type</option>
                    {TAX_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors[index]?.taxType && <span className="error-text">{errors[index].taxType}</span>}
                </div>

                <div className="form-field">
                  <label>Account Type</label>
                  <select
                    value={input.accountType}
                    onChange={(e) => handleInputChange(index, 'accountType', e.target.value)}
                    className={errors[index]?.accountType ? 'error' : ''}
                  >
                    <option value="">Select Account Type</option>
                    {ACCOUNT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors[index]?.accountType && <span className="error-text">{errors[index].accountType}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Current Amount</label>
                  <input
                    type="number"
                    value={input.amount}
                    onChange={(e) => handleInputChange(index, 'amount', e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className={errors[index]?.amount ? 'error' : ''}
                  />
                  {errors[index]?.amount && <span className="error-text">{errors[index].amount}</span>}
                </div>
              </div>
            </div>
          ))}

          <div className="form-actions">
            <button type="button" onClick={addPortfolioInput} className="btn-secondary">
              + Add Another Account
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
              <h3>Tax-Free</h3>
              <p className="amount">{formatCurrency(currentTotals.taxFree)}</p>
            </div>
            <div className="summary-card">
              <h3>Tax-Deferred</h3>
              <p className="amount">{formatCurrency(currentTotals.taxDeferred)}</p>
            </div>
            <div className="summary-card">
              <h3>Brokerage/After-Tax</h3>
              <p className="amount">{formatCurrency(currentTotals.brokerage)}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Portfolio;