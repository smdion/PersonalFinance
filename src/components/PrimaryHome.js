import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import { 
  getHistoricalData, 
  setHistoricalData,
  getFromStorage,
  setToStorage
} from '../utils/localStorage';
import '../styles/portfolio.css';

const PrimaryHome = () => {
  const [homeData, setHomeData] = useState({
    propertyName: '',
    currentValue: '',
    originalPurchasePrice: '',
    purchaseDate: '',
    propertyType: 'Primary Home'
  });

  const [mortgageData, setMortgageData] = useState({
    lenderName: '',
    originalLoanAmount: '',
    currentBalance: '',
    interestRate: '',
    loanTerm: '',
    monthlyPayment: '',
    principalAndInterest: '',
    pmi: '',
    escrow: '',
    startDate: ''
  });

  const [amortizationSchedules, setAmortizationSchedules] = useState([]);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadExistingData();
  }, []);

  const loadExistingData = () => {
    const currentYear = new Date().getFullYear();
    const historicalData = getHistoricalData();
    const savedHomeData = getFromStorage('primaryHomeData', {});

    // Load property data from Assets if available
    const houseDetails = historicalData[currentYear]?.houseDetails || [];
    const primaryHomeAsset = houseDetails.find(asset => asset.type === 'Primary Home');

    if (primaryHomeAsset) {
      setHomeData(prev => ({
        ...prev,
        propertyName: primaryHomeAsset.name || '',
        currentValue: primaryHomeAsset.amount?.toString() || ''
      }));
    }

    // Load mortgage data from Liabilities if available
    const mortgageDetails = historicalData[currentYear]?.mortgageDetails || [];
    const primaryMortgage = mortgageDetails.find(mortgage => mortgage.type === 'Mortgage');

    if (primaryMortgage) {
      setMortgageData(prev => ({
        ...prev,
        lenderName: primaryMortgage.name || '',
        currentBalance: primaryMortgage.amount?.toString() || ''
      }));
    }

    // Load additional data from localStorage
    if (savedHomeData.homeData) {
      setHomeData(prev => ({ ...prev, ...savedHomeData.homeData }));
    }
    if (savedHomeData.mortgageData) {
      setMortgageData(prev => ({ ...prev, ...savedHomeData.mortgageData }));
    }
    if (savedHomeData.amortizationSchedules) {
      setAmortizationSchedules(savedHomeData.amortizationSchedules);
    }
  };

  const handleHomeDataChange = (field, value) => {
    setHomeData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const handleMortgageDataChange = (field, value) => {
    setMortgageData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const addAmortizationSchedule = () => {
    const newSchedule = {
      id: Date.now().toString(),
      name: '',
      file: null,
      uploadDate: new Date().toISOString().split('T')[0],
      notes: ''
    };
    setAmortizationSchedules(prev => [...prev, newSchedule]);
  };

  const updateAmortizationSchedule = (id, field, value) => {
    setAmortizationSchedules(prev => 
      prev.map(schedule => 
        schedule.id === id 
          ? { ...schedule, [field]: value }
          : schedule
      )
    );
  };

  const removeAmortizationSchedule = (id) => {
    setAmortizationSchedules(prev => prev.filter(schedule => schedule.id !== id));
  };

  const validateData = () => {
    const newErrors = {};
    
    // Home data validation
    if (!homeData.propertyName.trim()) {
      newErrors.propertyName = 'Property name is required';
    }
    
    if (!homeData.currentValue || isNaN(parseFloat(homeData.currentValue))) {
      newErrors.currentValue = 'Valid current value is required';
    }

    // Mortgage data validation (optional but if provided, must be valid)
    if (mortgageData.currentBalance && isNaN(parseFloat(mortgageData.currentBalance))) {
      newErrors.currentBalance = 'Current balance must be a valid number';
    }

    if (mortgageData.interestRate && (isNaN(parseFloat(mortgageData.interestRate)) || parseFloat(mortgageData.interestRate) < 0 || parseFloat(mortgageData.interestRate) > 100)) {
      newErrors.interestRate = 'Interest rate must be between 0 and 100';
    }

    if (mortgageData.monthlyPayment && isNaN(parseFloat(mortgageData.monthlyPayment))) {
      newErrors.monthlyPayment = 'Monthly payment must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveData = () => {
    if (!validateData()) {
      return;
    }

    try {
      // Save to localStorage for Primary Home specific data
      const primaryHomeData = {
        homeData,
        mortgageData,
        amortizationSchedules,
        lastUpdated: new Date().toISOString()
      };
      setToStorage('primaryHomeData', primaryHomeData);

      // Update historical data for integration with other components
      const currentYear = new Date().getFullYear();
      const historicalData = getHistoricalData();

      if (!historicalData[currentYear]) {
        historicalData[currentYear] = { users: {} };
      }

      // Update house details if property data provided
      if (homeData.propertyName && homeData.currentValue) {
        const houseDetails = historicalData[currentYear].houseDetails || [];
        const existingIndex = houseDetails.findIndex(asset => asset.type === 'Primary Home');
        
        const updatedAsset = {
          name: homeData.propertyName,
          type: 'Primary Home',
          amount: Math.round(parseFloat(homeData.currentValue) || 0)
        };

        if (existingIndex >= 0) {
          houseDetails[existingIndex] = updatedAsset;
        } else {
          houseDetails.push(updatedAsset);
        }

        historicalData[currentYear].houseDetails = houseDetails;
        historicalData[currentYear].house = houseDetails.reduce((sum, asset) => sum + asset.amount, 0);
      }

      // Update mortgage details if mortgage data provided
      if (mortgageData.lenderName && mortgageData.currentBalance) {
        const mortgageDetails = historicalData[currentYear].mortgageDetails || [];
        const existingIndex = mortgageDetails.findIndex(mortgage => mortgage.type === 'Mortgage');
        
        const updatedMortgage = {
          name: mortgageData.lenderName,
          type: 'Mortgage',
          amount: Math.round(parseFloat(mortgageData.currentBalance) || 0)
        };

        if (existingIndex >= 0) {
          mortgageDetails[existingIndex] = updatedMortgage;
        } else {
          mortgageDetails.push(updatedMortgage);
        }

        historicalData[currentYear].mortgageDetails = mortgageDetails;
        historicalData[currentYear].mortgage = mortgageDetails.reduce((sum, mortgage) => sum + mortgage.amount, 0);
      }

      setHistoricalData(historicalData);

      // Dispatch event to notify other components
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('historicalDataUpdated', { detail: historicalData }));
      }, 50);

      setSuccessMessage('Primary home data saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (error) {
      console.error('Error saving primary home data:', error);
      alert('Error saving data. Please try again.');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  return (
    <>
      <Navigation />
      <div className="app-container">
        <div className="header">
          <h1>🏡 Primary Home Details</h1>
          <p>Track your primary residence details, mortgage information, and amortization schedules</p>
        </div>

        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}

        {/* Property Information Section */}
        <div className="portfolio-form-section">
          <h2>Property Information</h2>
          
          <div className="form-row">
            <div className="form-field">
              <label>Property Name</label>
              <input
                type="text"
                value={homeData.propertyName}
                onChange={(e) => handleHomeDataChange('propertyName', e.target.value)}
                placeholder="e.g., Main Residence, Family Home"
                className={errors.propertyName ? 'error' : ''}
              />
              {errors.propertyName && <span className="error-text">{errors.propertyName}</span>}
            </div>

            <div className="form-field">
              <label>Current Market Value</label>
              <input
                type="number"
                value={homeData.currentValue}
                onChange={(e) => handleHomeDataChange('currentValue', e.target.value)}
                placeholder="450000"
                step="1000"
                min="0"
                className={errors.currentValue ? 'error' : ''}
              />
              {errors.currentValue && <span className="error-text">{errors.currentValue}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Original Purchase Price</label>
              <input
                type="number"
                value={homeData.originalPurchasePrice}
                onChange={(e) => handleHomeDataChange('originalPurchasePrice', e.target.value)}
                placeholder="350000"
                step="1000"
                min="0"
              />
            </div>

            <div className="form-field">
              <label>Purchase Date</label>
              <input
                type="date"
                value={homeData.purchaseDate}
                onChange={(e) => handleHomeDataChange('purchaseDate', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Mortgage Information Section */}
        <div className="portfolio-form-section">
          <h2>Mortgage Information</h2>
          
          <div className="form-row">
            <div className="form-field">
              <label>Lender Name</label>
              <input
                type="text"
                value={mortgageData.lenderName}
                onChange={(e) => handleMortgageDataChange('lenderName', e.target.value)}
                placeholder="e.g., Wells Fargo, Chase Bank"
              />
            </div>

            <div className="form-field">
              <label>Original Loan Amount</label>
              <input
                type="number"
                value={mortgageData.originalLoanAmount}
                onChange={(e) => handleMortgageDataChange('originalLoanAmount', e.target.value)}
                placeholder="280000"
                step="1000"
                min="0"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Current Balance</label>
              <input
                type="number"
                value={mortgageData.currentBalance}
                onChange={(e) => handleMortgageDataChange('currentBalance', e.target.value)}
                placeholder="250000"
                step="1000"
                min="0"
                className={errors.currentBalance ? 'error' : ''}
              />
              {errors.currentBalance && <span className="error-text">{errors.currentBalance}</span>}
            </div>

            <div className="form-field">
              <label>Interest Rate (%)</label>
              <input
                type="number"
                value={mortgageData.interestRate}
                onChange={(e) => handleMortgageDataChange('interestRate', e.target.value)}
                placeholder="3.5"
                step="0.01"
                min="0"
                max="100"
                className={errors.interestRate ? 'error' : ''}
              />
              {errors.interestRate && <span className="error-text">{errors.interestRate}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Loan Term (years)</label>
              <input
                type="number"
                value={mortgageData.loanTerm}
                onChange={(e) => handleMortgageDataChange('loanTerm', e.target.value)}
                placeholder="30"
                min="1"
                max="50"
              />
            </div>

            <div className="form-field">
              <label>Loan Start Date</label>
              <input
                type="date"
                value={mortgageData.startDate}
                onChange={(e) => handleMortgageDataChange('startDate', e.target.value)}
              />
            </div>
          </div>

          <h3>Monthly Payment Breakdown</h3>
          <div className="form-row">
            <div className="form-field">
              <label>Total Monthly Payment</label>
              <input
                type="number"
                value={mortgageData.monthlyPayment}
                onChange={(e) => handleMortgageDataChange('monthlyPayment', e.target.value)}
                placeholder="1850"
                step="0.01"
                min="0"
                className={errors.monthlyPayment ? 'error' : ''}
              />
              {errors.monthlyPayment && <span className="error-text">{errors.monthlyPayment}</span>}
            </div>

            <div className="form-field">
              <label>Principal & Interest</label>
              <input
                type="number"
                value={mortgageData.principalAndInterest}
                onChange={(e) => handleMortgageDataChange('principalAndInterest', e.target.value)}
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
                value={mortgageData.pmi}
                onChange={(e) => handleMortgageDataChange('pmi', e.target.value)}
                placeholder="150"
                step="0.01"
                min="0"
              />
            </div>

            <div className="form-field">
              <label>Escrow (Taxes & Insurance)</label>
              <input
                type="number"
                value={mortgageData.escrow}
                onChange={(e) => handleMortgageDataChange('escrow', e.target.value)}
                placeholder="250"
                step="0.01"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Amortization Schedules Section */}
        <div className="portfolio-form-section">
          <h2>Amortization Schedules</h2>
          <p>Attach and manage multiple amortization schedules for tracking payment history and projections.</p>

          {amortizationSchedules.map((schedule) => (
            <div key={schedule.id} className="portfolio-input-row">
              <div className="input-header">
                <h4>Schedule {amortizationSchedules.indexOf(schedule) + 1}</h4>
                <div className="input-actions">
                  <button 
                    type="button" 
                    onClick={() => removeAmortizationSchedule(schedule.id)}
                    className="btn-remove"
                    title="Remove this schedule"
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Schedule Name</label>
                  <input
                    type="text"
                    value={schedule.name}
                    onChange={(e) => updateAmortizationSchedule(schedule.id, 'name', e.target.value)}
                    placeholder="e.g., Original Schedule, After Refinance"
                  />
                </div>

                <div className="form-field">
                  <label>Upload Date</label>
                  <input
                    type="date"
                    value={schedule.uploadDate}
                    onChange={(e) => updateAmortizationSchedule(schedule.id, 'uploadDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Notes</label>
                  <textarea
                    value={schedule.notes}
                    onChange={(e) => updateAmortizationSchedule(schedule.id, 'notes', e.target.value)}
                    placeholder="Additional notes about this schedule..."
                    rows="2"
                  />
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addAmortizationSchedule} className="btn-secondary">
            + Add Amortization Schedule
          </button>
        </div>

        {/* Summary Section */}
        {(homeData.currentValue || mortgageData.currentBalance) && (
          <div className="live-total-section">
            <div className="live-total-card">
              <h3>Primary Home Summary</h3>
              {homeData.currentValue && (
                <div className="summary-row">
                  <span>Current Home Value:</span>
                  <span className="live-total-amount">{formatCurrency(parseFloat(homeData.currentValue))}</span>
                </div>
              )}
              {mortgageData.currentBalance && (
                <div className="summary-row">
                  <span>Current Mortgage Balance:</span>
                  <span className="live-total-amount">{formatCurrency(parseFloat(mortgageData.currentBalance))}</span>
                </div>
              )}
              {homeData.currentValue && mortgageData.currentBalance && (
                <div className="summary-row equity">
                  <span><strong>Home Equity:</strong></span>
                  <span className="live-total-amount">
                    <strong>{formatCurrency(parseFloat(homeData.currentValue) - parseFloat(mortgageData.currentBalance))}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="form-actions">
          <button type="button" onClick={saveData} className="btn-primary">
            💾 Save Primary Home Data
          </button>
        </div>
      </div>
    </>
  );
};

export default PrimaryHome;