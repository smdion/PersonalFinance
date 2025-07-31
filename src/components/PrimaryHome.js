import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import { 
  getAssetLiabilityData, 
  setAssetLiabilityData,
  getFromStorage,
  setToStorage,
  STORAGE_KEYS
} from '../utils/localStorage';
import CSVImportExport from './CSVImportExport';
import '../styles/liquid-assets.css';

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
  const [homeImprovements, setHomeImprovements] = useState([]);
  const [expandedImprovements, setExpandedImprovements] = useState(new Set());
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [autoSaveMessage, setAutoSaveMessage] = useState('');

  useEffect(() => {
    loadExistingData();
  }, []);

  const loadExistingData = () => {
    const assetLiabilityData = getAssetLiabilityData();
    
    // Load saved Primary Home data using standard localStorage pattern
    const savedPrimaryHomeData = getFromStorage(STORAGE_KEYS.PRIMARY_HOME_DATA, {
      homeData: {},
      mortgageData: {},
      amortizationSchedules: [],
      homeImprovements: []
    });

    // Start with saved localStorage data as base
    let mergedHomeData = { ...homeData };
    let mergedMortgageData = { ...mortgageData };

    // First, load any saved Primary Home specific data
    if (savedPrimaryHomeData.homeData && Object.keys(savedPrimaryHomeData.homeData).length > 0) {
      mergedHomeData = { ...mergedHomeData, ...savedPrimaryHomeData.homeData };
    }
    if (savedPrimaryHomeData.mortgageData && Object.keys(savedPrimaryHomeData.mortgageData).length > 0) {
      mergedMortgageData = { ...mergedMortgageData, ...savedPrimaryHomeData.mortgageData };
    }
    if (savedPrimaryHomeData.amortizationSchedules && savedPrimaryHomeData.amortizationSchedules.length > 0) {
      setAmortizationSchedules(savedPrimaryHomeData.amortizationSchedules);
    }
    if (savedPrimaryHomeData.homeImprovements && savedPrimaryHomeData.homeImprovements.length > 0) {
      setHomeImprovements(savedPrimaryHomeData.homeImprovements);
    }

    // Then, overlay with current Assets/Liabilities data (this takes precedence for basic fields)
    const houseDetails = assetLiabilityData.houseDetails || [];
    const primaryHomeAsset = houseDetails.find(asset => asset.type === 'Primary Home');

    if (primaryHomeAsset) {
      mergedHomeData = {
        ...mergedHomeData,
        propertyName: primaryHomeAsset.name || mergedHomeData.propertyName,
        currentValue: primaryHomeAsset.amount?.toString() || mergedHomeData.currentValue,
        // Load additional home fields from the detailed data
        originalPurchasePrice: primaryHomeAsset.originalPurchasePrice || mergedHomeData.originalPurchasePrice,
        purchaseDate: primaryHomeAsset.purchaseDate || mergedHomeData.purchaseDate,
        propertyType: primaryHomeAsset.propertyType || mergedHomeData.propertyType
      };
    }

    // Load mortgage data from Liabilities if available
    const mortgageDetails = assetLiabilityData.mortgageDetails || [];
    const primaryMortgage = mortgageDetails.find(mortgage => mortgage.type === 'Mortgage');

    if (primaryMortgage) {
      mergedMortgageData = {
        ...mergedMortgageData,
        lenderName: primaryMortgage.lenderName || primaryMortgage.name || mergedMortgageData.lenderName,
        currentBalance: primaryMortgage.amount?.toString() || mergedMortgageData.currentBalance,
        // Load additional mortgage fields from the detailed data
        originalLoanAmount: primaryMortgage.originalLoanAmount || mergedMortgageData.originalLoanAmount,
        interestRate: primaryMortgage.interestRate || mergedMortgageData.interestRate,
        loanTerm: primaryMortgage.loanTerm || mergedMortgageData.loanTerm,
        monthlyPayment: primaryMortgage.monthlyPayment || mergedMortgageData.monthlyPayment,
        principalAndInterest: primaryMortgage.principalAndInterest || mergedMortgageData.principalAndInterest,
        pmi: primaryMortgage.pmi || mergedMortgageData.pmi,
        escrow: primaryMortgage.escrow || mergedMortgageData.escrow,
        startDate: primaryMortgage.startDate || mergedMortgageData.startDate
      };
    }

    // Apply the merged data
    setHomeData(mergedHomeData);
    setMortgageData(mergedMortgageData);
    
    // Set home improvements and schedules - prioritize house details, then localStorage fallback
    let finalHomeImprovements = [];
    let finalAmortizationSchedules = [];
    
    if (primaryHomeAsset?.homeImprovements && primaryHomeAsset.homeImprovements.length > 0) {
      finalHomeImprovements = primaryHomeAsset.homeImprovements;
    } else if (savedPrimaryHomeData.homeImprovements && savedPrimaryHomeData.homeImprovements.length > 0) {
      finalHomeImprovements = savedPrimaryHomeData.homeImprovements;
    }
    
    if (primaryHomeAsset?.amortizationSchedules && primaryHomeAsset.amortizationSchedules.length > 0) {
      finalAmortizationSchedules = primaryHomeAsset.amortizationSchedules;
    } else if (savedPrimaryHomeData.amortizationSchedules && savedPrimaryHomeData.amortizationSchedules.length > 0) {
      finalAmortizationSchedules = savedPrimaryHomeData.amortizationSchedules;
    }
    
    setHomeImprovements(finalHomeImprovements);
    setAmortizationSchedules(finalAmortizationSchedules);
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
    
    // Auto-save after a short delay
    setTimeout(() => {
      saveData(true);
    }, 1000);
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
    
    // Auto-save after a short delay
    setTimeout(() => {
      saveData(true);
    }, 1000);
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
    
    // Auto-save after adding
    setTimeout(() => {
      saveData(true);
    }, 100);
  };

  const updateAmortizationSchedule = (id, field, value) => {
    setAmortizationSchedules(prev => 
      prev.map(schedule => 
        schedule.id === id 
          ? { ...schedule, [field]: value }
          : schedule
      )
    );
    
    // Auto-save after a short delay
    setTimeout(() => {
      saveData(true);
    }, 1000);
  };

  const removeAmortizationSchedule = (id) => {
    setAmortizationSchedules(prev => prev.filter(schedule => schedule.id !== id));
    
    // Auto-save immediately when removing
    setTimeout(() => {
      saveData(true);
    }, 100);
  };

  const addHomeImprovement = () => {
    const newImprovement = {
      id: Date.now().toString(),
      year: new Date().getFullYear().toString(),
      description: '',
      valueAdded: '',
      notes: ''
    };
    setHomeImprovements(prev => [...prev, newImprovement]);
    // Auto-expand newly added improvements
    setExpandedImprovements(prev => new Set([...prev, newImprovement.id]));
    
    // Auto-save after adding
    setTimeout(() => {
      saveData(true);
    }, 100);
  };

  const updateHomeImprovement = (id, field, value) => {
    setHomeImprovements(prev => 
      prev.map(improvement => 
        improvement.id === id 
          ? { ...improvement, [field]: value }
          : improvement
      )
    );
    
    // Auto-save after a short delay
    setTimeout(() => {
      saveData(true);
    }, 1000);
  };

  const removeHomeImprovement = (id) => {
    setHomeImprovements(prev => prev.filter(improvement => improvement.id !== id));
    // Remove from expanded set when deleted
    setExpandedImprovements(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    
    // Auto-save immediately when removing
    setTimeout(() => {
      saveData(true);
    }, 100);
  };

  const toggleImprovementExpansion = (id) => {
    setExpandedImprovements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const expandAllImprovements = () => {
    setExpandedImprovements(new Set(homeImprovements.map(improvement => improvement.id)));
  };

  const collapseAllImprovements = () => {
    setExpandedImprovements(new Set());
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

  const saveData = (isAutoSave = false) => {
    
    // For auto-save, skip validation if there's no meaningful data to save
    if (isAutoSave && (!homeData.propertyName || !homeData.currentValue)) {
      return;
    }
    
    if (!isAutoSave && !validateData()) {
      return;
    }

    try {
      // Save to localStorage for Primary Home specific data using standard pattern
      const primaryHomeData = {
        homeData,
        mortgageData,
        amortizationSchedules,
        homeImprovements,
        lastUpdated: new Date().toISOString()
      };
      setToStorage(STORAGE_KEYS.PRIMARY_HOME_DATA, primaryHomeData);

      // Update asset liability data for integration with other components
      const assetLiabilityData = getAssetLiabilityData();

      // Update house details if property data provided
      if (homeData.propertyName && homeData.currentValue) {
        const houseDetails = assetLiabilityData.houseDetails || [];
        const existingIndex = houseDetails.findIndex(asset => asset.type === 'Primary Home');
        
        const updatedAsset = {
          name: homeData.propertyName,
          type: 'Primary Home',
          amount: Math.round(parseFloat(homeData.currentValue) || 0),
          // Include additional home details
          originalPurchasePrice: homeData.originalPurchasePrice || '',
          purchaseDate: homeData.purchaseDate || '',
          propertyType: homeData.propertyType || 'Primary Home',
          // Include home improvements and amortization schedules
          homeImprovements: homeImprovements.map(improvement => ({
            id: improvement.id,
            year: improvement.year,
            description: improvement.description,
            valueAdded: parseFloat(improvement.valueAdded) || 0,
            notes: improvement.notes || ''
          })),
          amortizationSchedules: amortizationSchedules.map(schedule => ({
            id: schedule.id,
            name: schedule.name,
            uploadDate: schedule.uploadDate,
            notes: schedule.notes || ''
          }))
        };

        if (existingIndex >= 0) {
          houseDetails[existingIndex] = updatedAsset;
        } else {
          houseDetails.push(updatedAsset);
        }

        assetLiabilityData.houseDetails = houseDetails;
        assetLiabilityData.house = houseDetails.reduce((sum, asset) => sum + asset.amount, 0);
      }

      // Update mortgage details if mortgage data provided
      if (mortgageData.lenderName && mortgageData.currentBalance) {
        const mortgageDetails = assetLiabilityData.mortgageDetails || [];
        const existingIndex = mortgageDetails.findIndex(mortgage => mortgage.type === 'Mortgage');
        
        const updatedMortgage = {
          name: 'Primary Home Mortgage', // Standard liability name
          type: 'Mortgage',
          amount: Math.round(parseFloat(mortgageData.currentBalance) || 0),
          // Include additional mortgage details
          lenderName: mortgageData.lenderName || '',
          originalLoanAmount: mortgageData.originalLoanAmount || '',
          interestRate: mortgageData.interestRate || '',
          loanTerm: mortgageData.loanTerm || '',
          monthlyPayment: mortgageData.monthlyPayment || '',
          principalAndInterest: mortgageData.principalAndInterest || '',
          pmi: mortgageData.pmi || '',
          escrow: mortgageData.escrow || '',
          startDate: mortgageData.startDate || ''
        };

        if (existingIndex >= 0) {
          mortgageDetails[existingIndex] = updatedMortgage;
        } else {
          mortgageDetails.push(updatedMortgage);
        }

        assetLiabilityData.mortgageDetails = mortgageDetails;
        assetLiabilityData.mortgage = mortgageDetails.reduce((sum, mortgage) => sum + mortgage.amount, 0);
      }

      // Home improvements and amortization schedules are now stored within the house details above
      // Remove any legacy root-level storage
      if (assetLiabilityData.homeImprovements !== undefined) {
        delete assetLiabilityData.homeImprovements;
      }
      if (assetLiabilityData.homeImprovementsDetails !== undefined) {
        delete assetLiabilityData.homeImprovementsDetails;
      }
      if (assetLiabilityData.amortizationSchedules !== undefined) {
        delete assetLiabilityData.amortizationSchedules;
      }

      const saveResult = setAssetLiabilityData(assetLiabilityData);

      // Dispatch event to notify other components
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('assetLiabilityDataUpdated', { detail: assetLiabilityData }));
      }, 50);

      if (isAutoSave) {
        setAutoSaveMessage('✅ Auto-saved');
        setTimeout(() => setAutoSaveMessage(''), 2000);
      } else {
        setSuccessMessage('Primary home data saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }

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

  // CSV Import/Export functions for Home Improvements
  const formatImprovementRowData = (improvement) => {
    return [
      improvement.year || '',
      improvement.description || '',
      improvement.valueAdded || '',
      improvement.notes || ''
    ];
  };

  const parseImprovementRowData = (row) => {
    if (!row.description?.trim()) {
      return null;
    }

    return {
      id: Date.now().toString() + Math.random(),
      year: row.year?.toString() || new Date().getFullYear().toString(),
      description: row.description?.trim() || '',
      valueAdded: row.valueAdded?.toString() || '',
      notes: row.notes?.toString() || ''
    };
  };

  const generateImprovementTemplate = () => {
    return [{
      year: new Date().getFullYear().toString(),
      description: 'Kitchen Renovation',
      valueAdded: '25000',
      notes: 'Complete kitchen remodel with new appliances and cabinets'
    }];
  };

  const getImprovementCSVHeaders = () => {
    return ['Year', 'Description', 'Value Added', 'Notes'];
  };

  const handleImprovementCSVImportSuccess = (parsedData) => {
    setHomeImprovements(parsedData);
    // Auto-expand all imported improvements
    setExpandedImprovements(new Set(parsedData.map(improvement => improvement.id)));
    
    // Automatically save to assetLiabilityData - update the house details entry
    const assetLiabilityData = getAssetLiabilityData();
    const houseDetails = assetLiabilityData.houseDetails || [];
    const existingIndex = houseDetails.findIndex(asset => asset.type === 'Primary Home');
    
    if (existingIndex >= 0) {
      // Update existing house entry with improvements
      houseDetails[existingIndex] = {
        ...houseDetails[existingIndex],
        homeImprovements: parsedData.map(improvement => ({
          id: improvement.id,
          year: improvement.year,
          description: improvement.description,
          valueAdded: parseFloat(improvement.valueAdded) || 0,
          notes: improvement.notes || ''
        }))
      };
      
      assetLiabilityData.houseDetails = houseDetails;
      setAssetLiabilityData(assetLiabilityData);
      
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('assetLiabilityDataUpdated', { detail: assetLiabilityData }));
      }, 50);
    }
    
    setSuccessMessage(`Successfully imported ${parsedData.length} home improvement entries from CSV!`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleImprovementCSVImportError = (error) => {
    alert(`Error importing CSV: ${error.message}`);
  };

  const handleResetImprovementData = () => {
    if (window.confirm('Are you sure you want to reset all home improvement data? This will permanently delete all entries and cannot be undone.')) {
      setHomeImprovements([]);
      setExpandedImprovements(new Set());
      
      // Clear from assetLiabilityData - update the house details entry
      const assetLiabilityData = getAssetLiabilityData();
      const houseDetails = assetLiabilityData.houseDetails || [];
      const existingIndex = houseDetails.findIndex(asset => asset.type === 'Primary Home');
      
      if (existingIndex >= 0) {
        // Remove improvements from house entry
        houseDetails[existingIndex] = {
          ...houseDetails[existingIndex],
          homeImprovements: []
        };
        
        assetLiabilityData.houseDetails = houseDetails;
        setAssetLiabilityData(assetLiabilityData);
        
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('assetLiabilityDataUpdated', { detail: assetLiabilityData }));
        }, 50);
      }
      
      setSuccessMessage('All home improvement data has been reset!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // CSV Import/Export functions for Amortization Schedules
  const formatScheduleRowData = (schedule) => {
    return [
      schedule.name || '',
      schedule.uploadDate || '',
      schedule.notes || ''
    ];
  };

  const parseScheduleRowData = (row) => {
    if (!row.name?.trim()) {
      return null;
    }

    return {
      id: Date.now().toString() + Math.random(),
      name: row.name?.trim() || '',
      file: null,
      uploadDate: row.uploadDate?.toString() || new Date().toISOString().split('T')[0],
      notes: row.notes?.toString() || ''
    };
  };

  const generateScheduleTemplate = () => {
    return [{
      name: 'Original Schedule',
      uploadDate: new Date().toISOString().split('T')[0],
      notes: 'Initial amortization schedule from loan origination'
    }];
  };

  const getScheduleCSVHeaders = () => {
    return ['Schedule Name', 'Upload Date', 'Notes'];
  };

  const handleScheduleCSVImportSuccess = (parsedData) => {
    setAmortizationSchedules(parsedData);
    
    // Automatically save to assetLiabilityData - update the house details entry
    const assetLiabilityData = getAssetLiabilityData();
    const houseDetails = assetLiabilityData.houseDetails || [];
    const existingIndex = houseDetails.findIndex(asset => asset.type === 'Primary Home');
    
    if (existingIndex >= 0) {
      // Update existing house entry with schedules
      houseDetails[existingIndex] = {
        ...houseDetails[existingIndex],
        amortizationSchedules: parsedData.map(schedule => ({
          id: schedule.id,
          name: schedule.name,
          uploadDate: schedule.uploadDate,
          notes: schedule.notes || ''
        }))
      };
      
      assetLiabilityData.houseDetails = houseDetails;
      setAssetLiabilityData(assetLiabilityData);
      
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('assetLiabilityDataUpdated', { detail: assetLiabilityData }));
      }, 50);
    }
    
    setSuccessMessage(`Successfully imported ${parsedData.length} amortization schedule entries from CSV!`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleScheduleCSVImportError = (error) => {
    alert(`Error importing CSV: ${error.message}`);
  };

  const handleResetScheduleData = () => {
    if (window.confirm('Are you sure you want to reset all amortization schedule data? This will permanently delete all entries and cannot be undone.')) {
      setAmortizationSchedules([]);
      
      // Clear from assetLiabilityData - update the house details entry
      const assetLiabilityData = getAssetLiabilityData();
      const houseDetails = assetLiabilityData.houseDetails || [];
      const existingIndex = houseDetails.findIndex(asset => asset.type === 'Primary Home');
      
      if (existingIndex >= 0) {
        // Remove schedules from house entry
        houseDetails[existingIndex] = {
          ...houseDetails[existingIndex],
          amortizationSchedules: []
        };
        
        assetLiabilityData.houseDetails = houseDetails;
        setAssetLiabilityData(assetLiabilityData);
        
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('assetLiabilityDataUpdated', { detail: assetLiabilityData }));
        }, 50);
      }
      
      setSuccessMessage('All amortization schedule data has been reset!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
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

        {autoSaveMessage && (
          <div className="auto-save-message" style={{
            backgroundColor: '#d4edda',
            color: '#155724',
            padding: '8px 12px',
            borderRadius: '4px',
            margin: '10px 0',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {autoSaveMessage}
          </div>
        )}

        {/* Property Information Section */}
        <div className="portfolio-form-section">
          <h2>Property Information</h2>
          <div className="import-notice">
            <p><strong>📥 Data Import:</strong> Property name and current value are automatically imported from your <strong>Assets</strong> page. Any changes here will update your Assets data.</p>
          </div>
          
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
          <div className="import-notice">
            <p><strong>📥 Data Import:</strong> Lender name and current balance are automatically imported from your <strong>Liabilities</strong> page. Any changes here will update your Liabilities data.</p>
          </div>
          
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

          {/* CSV Import/Export for Amortization Schedules */}
          <CSVImportExport
            title="Amortization Schedules Data Management"
            subtitle="Import and export your amortization schedule data using CSV files"
            data={amortizationSchedules}
            headers={getScheduleCSVHeaders()}
            formatRowData={formatScheduleRowData}
            parseRowData={parseScheduleRowData}
            generateTemplate={generateScheduleTemplate}
            onImportSuccess={handleScheduleCSVImportSuccess}
            onImportError={handleScheduleCSVImportError}
            dataType="amortization_schedules"
            userNames={['Joint']}
            showResetButton={true}
            onReset={handleResetScheduleData}
            className="primary-home-csv"
            compact={true}
          />
        </div>

        {/* Home Improvements Section */}
        <div className="portfolio-form-section">
          <div className="section-header-with-controls">
            <div>
              <h2>Home Improvements</h2>
              <p>Track improvements and renovations that add value to your home. This helps with cost basis calculations for tax purposes.</p>
            </div>
            {homeImprovements.length > 1 && (
              <div className="section-controls">
                <button 
                  type="button" 
                  onClick={expandAllImprovements}
                  className="btn-secondary-small"
                  title="Expand all improvements"
                >
                  📂 Expand All
                </button>
                <button 
                  type="button" 
                  onClick={collapseAllImprovements}
                  className="btn-secondary-small"
                  title="Collapse all improvements"
                >
                  📁 Collapse All
                </button>
              </div>
            )}
          </div>

          {homeImprovements.map((improvement) => {
            const isExpanded = expandedImprovements.has(improvement.id);
            const improvementNumber = homeImprovements.indexOf(improvement) + 1;
            
            return (
              <div key={improvement.id} className="portfolio-input-row">
                <div className="input-header">
                  <div className="improvement-summary" onClick={() => toggleImprovementExpansion(improvement.id)}>
                    <h4>
                      {isExpanded ? '📂' : '📁'} Improvement {improvementNumber}
                      {improvement.description && ` - ${improvement.description}`}
                      {improvement.valueAdded && (
                        <span className="improvement-value"> ({formatCurrency(parseFloat(improvement.valueAdded))})</span>
                      )}
                    </h4>
                  </div>
                  <div className="input-actions">
                    <button 
                      type="button" 
                      onClick={() => toggleImprovementExpansion(improvement.id)}
                      className="btn-toggle"
                      title={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? '🔼' : '🔽'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => removeHomeImprovement(improvement.id)}
                      className="btn-remove"
                      title="Remove this improvement"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <>
                    <div className="form-row">
                      <div className="form-field">
                        <label>Year</label>
                        <input
                          type="number"
                          value={improvement.year}
                          onChange={(e) => updateHomeImprovement(improvement.id, 'year', e.target.value)}
                          placeholder="2024"
                          min="1900"
                          max="2100"
                        />
                      </div>

                      <div className="form-field">
                        <label>Value Added</label>
                        <input
                          type="number"
                          value={improvement.valueAdded}
                          onChange={(e) => updateHomeImprovement(improvement.id, 'valueAdded', e.target.value)}
                          placeholder="15000"
                          step="100"
                          min="0"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-field">
                        <label>Description</label>
                        <input
                          type="text"
                          value={improvement.description}
                          onChange={(e) => updateHomeImprovement(improvement.id, 'description', e.target.value)}
                          placeholder="e.g., Kitchen Renovation, New Roof, Bathroom Remodel"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-field">
                        <label>Notes</label>
                        <textarea
                          value={improvement.notes}
                          onChange={(e) => updateHomeImprovement(improvement.id, 'notes', e.target.value)}
                          placeholder="Additional details about the improvement, contractor information, permits, etc."
                          rows="2"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          <button type="button" onClick={addHomeImprovement} className="btn-secondary">
            + Add Home Improvement
          </button>

          {/* CSV Import/Export for Home Improvements */}
          <CSVImportExport
            title="Home Improvements Data Management"
            subtitle="Import and export your home improvement data using CSV files"
            data={homeImprovements}
            headers={getImprovementCSVHeaders()}
            formatRowData={formatImprovementRowData}
            parseRowData={parseImprovementRowData}
            generateTemplate={generateImprovementTemplate}
            onImportSuccess={handleImprovementCSVImportSuccess}
            onImportError={handleImprovementCSVImportError}
            dataType="home_improvements"
            userNames={['Joint']}
            showResetButton={true}
            onReset={handleResetImprovementData}
            className="primary-home-csv"
            compact={true}
          />
        </div>

        {/* Summary Section */}
        {(homeData.currentValue || mortgageData.currentBalance || homeImprovements.length > 0) && (
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
              {homeImprovements.length > 0 && (
                <div className="summary-row">
                  <span>Total Improvements Value:</span>
                  <span className="live-total-amount">
                    {formatCurrency(homeImprovements.reduce((sum, improvement) => 
                      sum + (parseFloat(improvement.valueAdded) || 0), 0))}
                  </span>
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

      </div>
    </>
  );
};

export default PrimaryHome;