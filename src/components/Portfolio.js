import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import { 
  getHistoricalData, 
  setHistoricalData,
  getPaycheckData,
  getPortfolioAccounts,
  addPortfolioAccount,
  addPortfolioUpdateRecord,
  getPortfolioUpdateHistory,
  getPortfolioRecords,
  addPortfolioRecord
} from '../utils/localStorage';
import { generateDataFilename } from '../utils/calculationHelpers';
import Papa from 'papaparse';
import '../styles/portfolio.css';

const Portfolio = () => {
  const [portfolioInputs, setPortfolioInputs] = useState([]);
  const [currentYearData, setCurrentYearData] = useState({});
  const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [updateHistory, setUpdateHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [portfolioRecords, setPortfolioRecords] = useState([]);
  const [showRecords, setShowRecords] = useState(false);

  // Validation options
  const TAX_TYPES = ['Tax-Free', 'Tax-Deferred', 'After-Tax'];
  const ACCOUNT_TYPES = ['IRA', 'Brokerage', '401k', '401k-Rollover', '401k-EmployerMatch', 'ESPP', 'HSA'];

  useEffect(() => {
    loadCurrentYearData();
    loadUpdateHistory();
    loadPortfolioRecords();

    // Listen for global reset event
    const handleResetAllData = () => {
      // Reset all portfolio component state
      setPortfolioInputs([{
        id: generateUniqueId(),
        accountName: '',
        owner: '',
        taxType: '',
        accountType: '',
        amount: ''
      }]);
      setCurrentYearData({});
      setUpdateHistory([]);
      setPortfolioRecords([]);
      setErrors({});
      setSuccessMessage('');
      setShowHistory(false);
      setShowRecords(false);
    };

    window.addEventListener('resetAllData', handleResetAllData);

    // Cleanup event listener
    return () => {
      window.removeEventListener('resetAllData', handleResetAllData);
    };
  }, []);


  const loadUpdateHistory = () => {
    const history = getPortfolioUpdateHistory();
    setUpdateHistory(history);
  };

  const loadPortfolioRecords = () => {
    const records = getPortfolioRecords();
    setPortfolioRecords(records);
  };

  const loadCurrentYearData = () => {
    const currentYear = new Date().getFullYear();
    const historicalData = getHistoricalData();
    const paycheckData = getPaycheckData();
    
    console.log('Portfolio DEBUG - loadCurrentYearData:');
    console.log('Current Year:', currentYear);
    console.log('Full Historical Data:', historicalData);
    console.log('Current Year Data:', historicalData[currentYear]);
    console.log('Paycheck Data:', paycheckData);
    
    // Get users from paycheck data
    const userList = [];
    if (paycheckData?.your?.name?.trim()) {
      userList.push(paycheckData.your.name.trim());
    }
    if (paycheckData?.spouse?.name?.trim() && (paycheckData?.settings?.showSpouseCalculator ?? true)) {
      userList.push(paycheckData.spouse.name.trim());
    }
    
    // Get all existing users from historical data for the current year
    const existingUsers = Object.keys(historicalData[currentYear]?.users || {});
    
    // Combine paycheck users with historical users and remove duplicates
    const allUsers = [...new Set([...userList, ...existingUsers])];
    
    // If still no users, create default
    if (allUsers.length === 0) {
      allUsers.push('User'); // Default user name
    }
    
    // Add "Joint" as an additional owner option if not already present
    const ownerOptions = [...allUsers];
    if (!ownerOptions.includes('Joint')) {
      ownerOptions.push('Joint');
    }
    
    console.log('Portfolio DEBUG - Final data:');
    console.log('Owner Options:', ownerOptions);
    console.log('Current Year Data being set:', historicalData[currentYear] || { users: {} });
    
    setUsers(ownerOptions);
    setCurrentYearData(historicalData[currentYear] || { users: {} });
    
    // Auto-populate portfolio inputs with stored accounts
    const storedAccounts = getPortfolioAccounts();
    if (storedAccounts.length > 0) {
      // Convert stored accounts to portfolio inputs
      const autoPopulatedInputs = storedAccounts.map(account => ({
        id: generateUniqueId(),
        accountName: account.accountName,
        taxType: account.taxType,
        accountType: account.accountType,
        owner: account.owner,
        amount: '' // Always start with empty amount for new updates
      }));
      setPortfolioInputs(autoPopulatedInputs);
    } else {
      // If no stored accounts, initialize with empty form
      setPortfolioInputs([{
        id: generateUniqueId(),
        accountName: '',
        taxType: '',
        amount: '',
        accountType: '',
        owner: ownerOptions[0] || 'User'
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
    
    // Auto-set tax type for special account types
    if (field === 'accountType') {
      if (value === 'HSA' || value === 'ESPP') {
        updatedInputs[index].taxType = 'After-Tax'; // Default for special accounts
      }
    }
    
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
      id: generateUniqueId(),
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
        
        // Use account type first for special accounts, then fall back to tax type
        if (input.accountType === 'ESPP') {
          acc.espp += amount;
        } else if (input.accountType === 'HSA') {
          acc.hsa += amount;
        } else {
          // Map by tax type for regular accounts
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

      console.log('Portfolio DEBUG - updateHistoricalData:');
      console.log('Portfolio inputs:', portfolioInputs);
      
      // Calculate totals by owner
      const totalsByOwner = portfolioInputs.reduce((acc, input) => {
        const amount = parseFloat(input.amount) || 0;
        const owner = input.owner;
        
        if (!acc[owner]) {
          acc[owner] = {
            taxFree: 0,
            taxDeferred: 0,
            brokerage: 0,
            espp: 0,
            hsa: 0
          };
        }
        
        // Use account type first for special accounts, then fall back to tax type
        if (input.accountType === 'ESPP') {
          acc[owner].espp += amount;
        } else if (input.accountType === 'HSA') {
          acc[owner].hsa += amount;
        } else {
          // Map by tax type for regular accounts
          switch (input.taxType) {
            case 'Tax-Free':
              acc[owner].taxFree += amount;
              break;
            case 'Tax-Deferred':
              acc[owner].taxDeferred += amount;
              break;
            case 'After-Tax':
            case 'Roth':
              acc[owner].brokerage += amount;
              break;
          }
        }
        
        return acc;
      }, {});
      
      console.log('Portfolio DEBUG - Totals by owner:', totalsByOwner);

      // Calculate combined totals for root level (matching historical data structure)
      const combinedTotals = Object.values(totalsByOwner).reduce((acc, ownerTotals) => {
        return {
          taxFree: acc.taxFree + ownerTotals.taxFree,
          taxDeferred: acc.taxDeferred + ownerTotals.taxDeferred,
          brokerage: acc.brokerage + ownerTotals.brokerage,
          espp: acc.espp + ownerTotals.espp,
          hsa: acc.hsa + ownerTotals.hsa
        };
      }, { taxFree: 0, taxDeferred: 0, brokerage: 0, espp: 0, hsa: 0 });
      
      console.log('Portfolio DEBUG - Combined totals for root level:', combinedTotals);

      // Get previous totals for change tracking BEFORE updating
      const previousTotals = {
        taxFree: historicalData[currentYear].taxFree || 0,
        taxDeferred: historicalData[currentYear].taxDeferred || 0,
        brokerage: historicalData[currentYear].brokerage || 0,
        espp: historicalData[currentYear].espp || 0,
        hsa: historicalData[currentYear].hsa || 0
      };

      // Update root-level investment data (this is how historical data is structured)
      historicalData[currentYear].taxFree = combinedTotals.taxFree;
      historicalData[currentYear].taxDeferred = combinedTotals.taxDeferred;
      historicalData[currentYear].brokerage = combinedTotals.brokerage;
      historicalData[currentYear].espp = combinedTotals.espp;
      historicalData[currentYear].hsa = combinedTotals.hsa;
      
      // Keep existing cash value or set to 0
      if (historicalData[currentYear].cash === undefined) {
        historicalData[currentYear].cash = 0;
      }

      // Also store individual owner data in users object for reference
      Object.entries(totalsByOwner).forEach(([ownerName, ownerTotals]) => {
        if (!historicalData[currentYear].users[ownerName]) {
          historicalData[currentYear].users[ownerName] = {};
        }
        
        const userData = historicalData[currentYear].users[ownerName];
        
        // Update investment fields with owner-specific totals for reference
        userData.taxFree = ownerTotals.taxFree;
        userData.taxDeferred = ownerTotals.taxDeferred;
        userData.brokerage = ownerTotals.brokerage;
        userData.espp = ownerTotals.espp;
        userData.hsa = ownerTotals.hsa;
        
        // Keep existing cash value or set to 0
        if (userData.cash === undefined) {
          userData.cash = 0;
        }
      });
      
      console.log('Portfolio DEBUG - Final historical data to save:', historicalData);
      console.log('Portfolio DEBUG - Current year data being saved:', historicalData[currentYear]);
      
      // Save updated historical data
      const saveResult = setHistoricalData(historicalData);
      if (saveResult) {
        setSuccessMessage(`Successfully updated ${currentYear} investment data!`);
        setCurrentYearData(historicalData[currentYear]);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
        
        // Save account names for future use
        portfolioInputs.forEach(input => {
          if (input.accountName.trim()) {
            addPortfolioAccount(input.accountName, input.taxType, input.accountType, input.owner);
          }
        });
        
        // Add update record to history with change tracking
        const updateRecord = addPortfolioUpdateRecord(portfolioInputs, combinedTotals, previousTotals);
        
        // Add portfolio record with current date
        const portfolioRecord = addPortfolioRecord(portfolioInputs);
        
        // Repopulate portfolio inputs with stored accounts after successful update
        const storedAccounts = getPortfolioAccounts();
        if (storedAccounts.length > 0) {
          const repopulatedInputs = storedAccounts.map(account => ({
            id: generateUniqueId(),
            accountName: account.accountName,
            taxType: account.taxType,
            accountType: account.accountType,
            owner: account.owner,
            amount: '' // Clear amounts for next update
          }));
          setPortfolioInputs(repopulatedInputs);
        } else {
          // If no stored accounts, show single empty row
          setPortfolioInputs([{
            id: generateUniqueId(),
            accountName: '',
            owner: users[0] || '',
            taxType: '',
            accountType: '',
            amount: ''
          }]);
        }
        
        // Clear any validation errors
        setErrors({});
        
        // Refresh history and records
        loadUpdateHistory();
        loadPortfolioRecords();
        
        console.log(`Updated ${currentYear} historical data:`, totals);
        console.log('Update record:', updateRecord);
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


  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatChange = (change) => {
    if (!change || change === 0) return null;
    const formatted = formatCurrency(Math.abs(change));
    const sign = change > 0 ? '+' : '-';
    const color = change > 0 ? '#10b981' : '#ef4444';
    return { formatted, sign, color, value: change };
  };

  // Helper function to generate unique IDs
  const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // CSV Helper Functions
  const getCSVHeaders = () => {
    return ['accountName', 'owner', 'taxType', 'accountType', 'amount', 'updateDate'];
  };

  const generateCSVContent = (data, headers) => {
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header] || '';
        // Escape commas and quotes in CSV values
        return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
      }).join(',')
    );
    return [csvHeaders, ...csvRows].join('\n');
  };

  const downloadCSVTemplate = () => {
    const headers = getCSVHeaders();
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const sampleData = [
      {
        accountName: 'Fidelity 401k',
        owner: users[0] || 'User',
        taxType: 'Tax-Deferred',
        accountType: '401k',
        amount: '50000.00',
        updateDate: currentDate
      },
      {
        accountName: 'Roth IRA',
        owner: users[0] || 'User', 
        taxType: 'Tax-Free',
        accountType: 'IRA',
        amount: '25000.00',
        updateDate: currentDate
      },
      {
        accountName: 'Joint Brokerage',
        owner: 'Joint',
        taxType: 'After-Tax',
        accountType: 'Brokerage',
        amount: '15000.00',
        updateDate: currentDate
      },
      {
        accountName: 'Health Savings Account',
        owner: users[0] || 'User',
        taxType: 'HSA',
        accountType: 'HSA',
        amount: '5000.00',
        updateDate: currentDate
      }
    ];

    const csvContent = generateCSVContent(sampleData, headers);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = generateDataFilename('portfolio_template', users.filter(u => u !== 'Joint'), 'csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadCurrentPortfolioCSV = () => {
    if (portfolioInputs.length === 0) {
      alert('No portfolio data to export. Please add some accounts first.');
      return;
    }

    const headers = getCSVHeaders();
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Add updateDate to current portfolio inputs
    const exportData = portfolioInputs.map(input => ({
      ...input,
      updateDate: currentDate
    }));
    
    const csvContent = generateCSVContent(exportData, headers);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = generateDataFilename('portfolio_current', users.filter(u => u !== 'Joint'), 'csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseCSVRow = (row) => {
    const [accountName, owner, taxType, accountType, amount, updateDate] = row;
    
    // Validate required fields
    if (!accountName || !owner || !taxType || !accountType) {
      return null; // Skip invalid rows
    }

    // Validate against allowed values
    if (!TAX_TYPES.includes(taxType)) {
      console.warn(`Invalid tax type: ${taxType}. Skipping row.`);
      return null;
    }

    if (!ACCOUNT_TYPES.includes(accountType)) {
      console.warn(`Invalid account type: ${accountType}. Skipping row.`);
      return null;
    }

    // Check if owner is valid (either in users list or empty for validation later)
    const validOwners = [...users];
    if (!validOwners.includes(owner)) {
      console.warn(`Invalid owner: ${owner}. Skipping row.`);
      return null;
    }

    return {
      id: generateUniqueId(),
      accountName: accountName.trim(),
      owner: owner.trim(),
      taxType: taxType.trim(),
      accountType: accountType.trim(),
      amount: amount ? amount.toString().trim() : '',
      updateDate: updateDate ? updateDate.trim() : new Date().toISOString().split('T')[0]
    };
  };

  const parseCSV = (csvText) => {
    try {
      const result = Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true
      });

      if (result.errors.length > 0) {
        console.error('CSV parsing errors:', result.errors);
        throw new Error('Invalid CSV format');
      }

      // Skip header row and parse data rows
      const dataRows = result.data.slice(1);
      const parsed = dataRows.map(row => parseCSVRow(row)).filter(Boolean);
      
      if (parsed.length === 0) {
        throw new Error('No valid data found in CSV file');
      }

      return parsed;
    } catch (error) {
      console.error('Error parsing CSV:', error);
      throw error;
    }
  };

  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target.result;
        const parsed = parseCSV(csvText);
        
        // Replace current portfolio inputs with CSV data
        setPortfolioInputs(parsed);
        
        // Add portfolio records for each unique update date in the CSV
        const dateGroups = {};
        parsed.forEach(account => {
          const date = account.updateDate;
          if (!dateGroups[date]) {
            dateGroups[date] = [];
          }
          dateGroups[date].push(account);
        });
        
        // Create records for each date group
        Object.entries(dateGroups).forEach(([date, accounts]) => {
          addPortfolioRecord(accounts, date);
        });
        
        // Refresh records display
        loadPortfolioRecords();
        
        // Clear any existing errors
        setErrors({});
        
        alert(`Successfully imported ${parsed.length} accounts from CSV`);
        if (Object.keys(dateGroups).length > 1) {
          alert(`Created ${Object.keys(dateGroups).length} portfolio records for different update dates.`);
        }
      } catch (error) {
        alert(`Error importing CSV: ${error.message}`);
      }
    };

    reader.onerror = () => {
      alert('Error reading file');
    };

    reader.readAsText(file);
    
    // Clear the input so the same file can be selected again
    event.target.value = '';
  };

  const downloadPortfolioRecordsCSV = () => {
    if (portfolioRecords.length === 0) {
      alert('No portfolio records to export.');
      return;
    }

    const headers = getCSVHeaders();
    const allAccounts = [];
    
    // Flatten all accounts from all records
    portfolioRecords.forEach(record => {
      record.accounts.forEach(account => {
        allAccounts.push({
          accountName: account.accountName,
          owner: account.owner,
          taxType: account.taxType,
          accountType: account.accountType,
          amount: account.amount.toString(),
          updateDate: account.updateDate
        });
      });
    });

    const csvContent = generateCSVContent(allAccounts, headers);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = generateDataFilename('portfolio_all_records', users.filter(u => u !== 'Joint'), 'csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getCurrentTotals = () => {
    return portfolioInputs.reduce((acc, input) => {
      const amount = parseFloat(input.amount) || 0;
      
      // Use account type first for special accounts, then fall back to tax type
      if (input.accountType === 'ESPP') {
        acc.espp += amount;
      } else if (input.accountType === 'HSA') {
        acc.hsa += amount;
      } else {
        // Map by tax type for regular accounts
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
      }
      
      return acc;
    }, {
      taxFree: 0,
      taxDeferred: 0,
      brokerage: 0,
      hsa: 0,
      espp: 0
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
        {currentYearData && Object.keys(currentYearData).length > 0 && (
          <div className="current-data-section">
            <h2>Current {currentYear} Investment Data</h2>
            {updateHistory.length > 0 && (
              <p className="last-update-info">
                Last updated: {formatDateTime(updateHistory[0].timestamp)}
                {updateHistory[0].changes && updateHistory[0].changes.total !== 0 && (
                  <span 
                    className="last-update-change"
                    style={{ color: formatChange(updateHistory[0].changes.total)?.color }}
                  >
                    {' '}({formatChange(updateHistory[0].changes.total)?.sign}{formatChange(updateHistory[0].changes.total)?.formatted} total change)
                  </span>
                )}
              </p>
            )}
            <div className="current-data-cards">
              <div className="user-data-card">
                <h3>Combined Portfolio Total</h3>
                <div className="investment-fields">
                  <div>Tax-Free: {formatCurrency(currentYearData.taxFree || 0)}</div>
                  <div>Tax-Deferred: {formatCurrency(currentYearData.taxDeferred || 0)}</div>
                  <div>Brokerage: {formatCurrency(currentYearData.brokerage || 0)}</div>
                  <div>ESPP: {formatCurrency(currentYearData.espp || 0)}</div>
                  <div>HSA: {formatCurrency(currentYearData.hsa || 0)}</div>
                  <div>Cash: {formatCurrency(currentYearData.cash || 0)}</div>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Portfolio Accounts Table */}
        <div className="portfolio-accounts">
          <h2>Portfolio Account Values</h2>
          <p>Enter your current account values from investment websites:</p>
          
          <div className="accounts-table">
            <table>
              <thead>
                <tr>
                  <th>Account Name</th>
                  <th>Owner</th>
                  <th>Tax Type</th>
                  <th>Account Type</th>
                  <th>Current Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {portfolioInputs.map((input, index) => (
                  <tr key={input.id}>
                    <td>
                      <input
                        type="text"
                        value={input.accountName}
                        onChange={(e) => handleInputChange(index, 'accountName', e.target.value)}
                        placeholder="e.g., Fidelity 401k"
                        className={errors[index]?.accountName ? 'error' : ''}
                        style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.5rem' }}
                      />
                      {errors[index]?.accountName && <div className="error-text" style={{ fontSize: '0.7rem' }}>{errors[index].accountName}</div>}
                    </td>
                    <td>
                      <select
                        value={input.owner}
                        onChange={(e) => handleInputChange(index, 'owner', e.target.value)}
                        className={errors[index]?.owner ? 'error' : ''}
                        style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.5rem' }}
                      >
                        {users.map(user => (
                          <option key={user} value={user}>{user}</option>
                        ))}
                      </select>
                      {errors[index]?.owner && <div className="error-text" style={{ fontSize: '0.7rem' }}>{errors[index].owner}</div>}
                    </td>
                    <td>
                      <select
                        value={input.taxType}
                        onChange={(e) => handleInputChange(index, 'taxType', e.target.value)}
                        className={errors[index]?.taxType ? 'error' : ''}
                        style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.5rem' }}
                      >
                        <option value="">Select</option>
                        {TAX_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      {errors[index]?.taxType && <div className="error-text" style={{ fontSize: '0.7rem' }}>{errors[index].taxType}</div>}
                    </td>
                    <td>
                      <select
                        value={input.accountType}
                        onChange={(e) => handleInputChange(index, 'accountType', e.target.value)}
                        className={errors[index]?.accountType ? 'error' : ''}
                        style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.5rem' }}
                      >
                        <option value="">Select</option>
                        {ACCOUNT_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      {errors[index]?.accountType && <div className="error-text" style={{ fontSize: '0.7rem' }}>{errors[index].accountType}</div>}
                    </td>
                    <td>
                      <input
                        type="number"
                        value={input.amount}
                        onChange={(e) => handleInputChange(index, 'amount', e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className={errors[index]?.amount ? 'error' : ''}
                        style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.5rem', textAlign: 'right' }}
                      />
                      {errors[index]?.amount && <div className="error-text" style={{ fontSize: '0.7rem' }}>{errors[index].amount}</div>}
                    </td>
                    <td className="actions">
                      <button 
                        type="button" 
                        onClick={() => removePortfolioInput(index)}
                        className="btn-delete"
                        disabled={portfolioInputs.length === 1}
                        title="Delete account"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="form-actions">
            <button type="button" onClick={addPortfolioInput} className="btn-secondary">
              + Add Another Account
            </button>
            <button type="button" onClick={updateHistoricalData} className="btn-primary">
              Update Historical Data
            </button>
          </div>

          {/* CSV Import/Export Section */}
          <div className="csv-section">
            <h3>📁 CSV Import/Export</h3>
            <p>Import account data from a CSV file or download the current data as CSV.</p>
            
            <div className="csv-actions">
              <div className="csv-download-group">
                <button 
                  type="button" 
                  onClick={downloadCSVTemplate}
                  className="btn-csv-template"
                  title="Download a sample CSV template with example data"
                >
                  📥 Download Template
                </button>
                
                {portfolioInputs.length > 0 && (
                  <button 
                    type="button" 
                    onClick={downloadCurrentPortfolioCSV}
                    className="btn-csv-export"
                    title="Export current portfolio data as CSV"
                  >
                    📤 Export Current
                  </button>
                )}
              </div>

              <div className="csv-upload-group">
                <label htmlFor="csv-upload-input" className="btn-csv-upload">
                  📁 Upload CSV
                </label>
                <input
                  id="csv-upload-input"
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  style={{ display: 'none' }}
                />
                <span className="csv-upload-hint">
                  CSV format: accountName, owner, taxType, accountType, amount, updateDate
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Preview */}
        <div className="summary-preview">
          <h2>Preview of Updates</h2>
          <div className="summary-cards">
            {(() => {
              // Get current balances from historical data for comparison
              const currentBalances = {
                taxFree: currentYearData?.taxFree || 0,
                taxDeferred: currentYearData?.taxDeferred || 0,
                brokerage: currentYearData?.brokerage || 0,
                hsa: currentYearData?.hsa || 0,
                espp: currentYearData?.espp || 0
              };

              const categories = [
                { key: 'taxFree', label: 'Tax-Free' },
                { key: 'taxDeferred', label: 'Tax-Deferred' },
                { key: 'brokerage', label: 'Brokerage/After-Tax' },
                { key: 'hsa', label: 'HSA' },
                { key: 'espp', label: 'ESPP' }
              ];

              // Calculate totals for current and new amounts
              const currentTotal = Object.values(currentBalances).reduce((sum, amount) => sum + amount, 0);
              const newTotal = Object.values(currentTotals).reduce((sum, amount) => sum + amount, 0);
              const totalChange = newTotal - currentTotal;
              const totalChangeInfo = formatChange(totalChange);

              const categoryCards = categories.map(({ key, label }) => {
                const newAmount = currentTotals[key] || 0;
                const currentAmount = currentBalances[key] || 0;
                const change = newAmount - currentAmount;
                const changeInfo = formatChange(change);

                return (
                  <div key={key} className="summary-card">
                    <h3>{label}</h3>
                    <div className="summary-amounts">
                      <div className="current-amount">
                        <span className="amount-label">Current:</span>
                        <span className="amount">{formatCurrency(currentAmount)}</span>
                      </div>
                      <div className="new-amount">
                        <span className="amount-label">New:</span>
                        <span className="amount">{formatCurrency(newAmount)}</span>
                      </div>
                      {changeInfo && (
                        <div className="amount-change">
                          <span className="amount-label">Change:</span>
                          <span 
                            className="change-value"
                            style={{ color: changeInfo.color }}
                          >
                            {changeInfo.sign}{changeInfo.formatted}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              });

              // Add total card
              const totalCard = (
                <div key="total" className="summary-card summary-card-total">
                  <h3>📊 Total Portfolio</h3>
                  <div className="summary-amounts">
                    <div className="current-amount">
                      <span className="amount-label">Current:</span>
                      <span className="amount">{formatCurrency(currentTotal)}</span>
                    </div>
                    <div className="new-amount">
                      <span className="amount-label">New:</span>
                      <span className="amount">{formatCurrency(newTotal)}</span>
                    </div>
                    {totalChangeInfo && (
                      <div className="amount-change">
                        <span className="amount-label">Change:</span>
                        <span 
                          className="change-value"
                          style={{ color: totalChangeInfo.color }}
                        >
                          {totalChangeInfo.sign}{totalChangeInfo.formatted}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );

              return [...categoryCards, totalCard];
            })()}
          </div>
        </div>

        {/* Update History */}
        {updateHistory.length > 0 && (
          <div className="update-history-section">
            <div className="update-history-header">
              <h2>Update History</h2>
              <button 
                type="button" 
                onClick={() => setShowHistory(!showHistory)}
                className="btn-secondary"
              >
                {showHistory ? 'Hide History' : `Show History (${updateHistory.length})`}
              </button>
            </div>
            
            {showHistory && (
              <div className="update-history-list">
                {updateHistory.map(record => (
                  <div key={record.id} className="update-record">
                    <div className="update-record-header">
                      <div className="update-timestamp">
                        <strong>{formatDateTime(record.timestamp)}</strong>
                        <span className="update-year">Year: {record.year}</span>
                      </div>
                      <div className="update-summary">
                        <span>{record.accountsUpdated} accounts • {formatCurrency(record.totalAmount)} total</span>
                      </div>
                    </div>
                    
                    <div className="update-totals">
                      <div className="update-totals-grid">
                        <div className="update-total-item">
                          <span className="total-label">Tax-Free:</span>
                          <span className="total-amount">{formatCurrency(record.totals.taxFree)}</span>
                          {record.changes && formatChange(record.changes.taxFree) && (
                            <span 
                              className="total-change" 
                              style={{ color: formatChange(record.changes.taxFree).color }}
                            >
                              ({formatChange(record.changes.taxFree).sign}{formatChange(record.changes.taxFree).formatted})
                            </span>
                          )}
                        </div>
                        
                        <div className="update-total-item">
                          <span className="total-label">Tax-Deferred:</span>
                          <span className="total-amount">{formatCurrency(record.totals.taxDeferred)}</span>
                          {record.changes && formatChange(record.changes.taxDeferred) && (
                            <span 
                              className="total-change" 
                              style={{ color: formatChange(record.changes.taxDeferred).color }}
                            >
                              ({formatChange(record.changes.taxDeferred).sign}{formatChange(record.changes.taxDeferred).formatted})
                            </span>
                          )}
                        </div>
                        
                        <div className="update-total-item">
                          <span className="total-label">Brokerage:</span>
                          <span className="total-amount">{formatCurrency(record.totals.brokerage)}</span>
                          {record.changes && formatChange(record.changes.brokerage) && (
                            <span 
                              className="total-change" 
                              style={{ color: formatChange(record.changes.brokerage).color }}
                            >
                              ({formatChange(record.changes.brokerage).sign}{formatChange(record.changes.brokerage).formatted})
                            </span>
                          )}
                        </div>
                        
                        <div className="update-total-item">
                          <span className="total-label">ESPP:</span>
                          <span className="total-amount">{formatCurrency(record.totals.espp)}</span>
                          {record.changes && formatChange(record.changes.espp) && (
                            <span 
                              className="total-change" 
                              style={{ color: formatChange(record.changes.espp).color }}
                            >
                              ({formatChange(record.changes.espp).sign}{formatChange(record.changes.espp).formatted})
                            </span>
                          )}
                        </div>
                        
                        <div className="update-total-item">
                          <span className="total-label">HSA:</span>
                          <span className="total-amount">{formatCurrency(record.totals.hsa)}</span>
                          {record.changes && formatChange(record.changes.hsa) && (
                            <span 
                              className="total-change" 
                              style={{ color: formatChange(record.changes.hsa).color }}
                            >
                              ({formatChange(record.changes.hsa).sign}{formatChange(record.changes.hsa).formatted})
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {record.changes && record.changes.total !== 0 && (
                        <div className="update-total-change-summary">
                          <strong>
                            Total Change: 
                            <span 
                              style={{ color: formatChange(record.changes.total).color, marginLeft: '0.5rem' }}
                            >
                              {formatChange(record.changes.total).sign}{formatChange(record.changes.total).formatted}
                            </span>
                          </strong>
                        </div>
                      )}
                    </div>
                    
                    <details className="update-accounts-details">
                      <summary>View Account Details ({record.accounts.length} accounts)</summary>
                      <div className="update-accounts-list">
                        {record.accounts.map((acc, idx) => (
                          <div key={idx} className="update-account">
                            <strong>{acc.accountName}</strong> ({acc.owner}) - {acc.taxType} - {formatCurrency(acc.amount)}
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Portfolio Records */}
        {portfolioRecords.length > 0 && (
          <div className="portfolio-records-section">
            <div className="portfolio-records-header">
              <h2>📋 Portfolio Records</h2>
              <button 
                type="button" 
                onClick={() => setShowRecords(!showRecords)}
                className="btn-secondary"
              >
                {showRecords ? 'Hide Records' : `Show All Records (${portfolioRecords.length})`}
              </button>
            </div>
            
            {showRecords && (
              <div className="portfolio-records-list">
                {portfolioRecords.map(record => (
                  <div key={record.id} className="portfolio-record">
                    <div className="record-header">
                      <div className="record-date">
                        <strong>{new Date(record.updateDate).toLocaleDateString()}</strong>
                        <span className="record-details">
                          {record.accountsCount} accounts • {formatCurrency(record.totalAmount)} total
                        </span>
                      </div>
                    </div>
                    
                    <div className="record-totals">
                      <div className="record-totals-grid">
                        <div>Tax-Free: {formatCurrency(record.totals.taxFree)}</div>
                        <div>Tax-Deferred: {formatCurrency(record.totals.taxDeferred)}</div>
                        <div>Brokerage: {formatCurrency(record.totals.brokerage)}</div>
                        <div>HSA: {formatCurrency(record.totals.hsa)}</div>
                        <div>ESPP: {formatCurrency(record.totals.espp)}</div>
                      </div>
                    </div>
                    
                    <details className="record-accounts-details">
                      <summary>View Account Details ({record.accounts.length} accounts)</summary>
                      <div className="record-accounts-list">
                        {record.accounts.map((acc, idx) => (
                          <div key={idx} className="record-account">
                            <strong>{acc.accountName}</strong> ({acc.owner}) - {acc.taxType} - {formatCurrency(acc.amount)}
                            <span className="account-update-date">Updated: {new Date(acc.updateDate).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                ))}
                
                <div className="records-export-section">
                  <button 
                    type="button" 
                    onClick={() => downloadPortfolioRecordsCSV()}
                    className="btn-csv-export"
                  >
                    📤 Export All Records as CSV
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Portfolio;