import React, { useState, useEffect } from 'react';

const Performance = () => {
  const [accounts, setAccounts] = useState([]);
  const [newAccountYear, setNewAccountYear] = useState(new Date().getFullYear());
  const [editingAccount, setEditingAccount] = useState(null);

  // Account performance fields
  const accountFields = [
    { key: 'year', label: 'Year', type: 'number', required: true },
    { key: 'accountName', label: 'Account Name', type: 'text', required: true },
    { key: 'accountType', label: 'Account Type', type: 'select', required: true, 
      options: ['401k', 'IRA', 'Roth IRA', 'HSA', 'Brokerage', 'Checking', 'Savings', 'Other'] },
    { key: 'owner', label: 'Owner', type: 'text', required: true },
    { key: 'firm', label: 'Firm', type: 'text', required: false },
    { key: 'beginningBal', label: 'Beginning Balance', type: 'currency', required: true },
    { key: 'totalContributions', label: 'Total Contributions', type: 'currency', required: true },
    { key: 'employerContrib', label: 'Employer Contribution', type: 'currency', required: false },
    { key: 'gainLoss', label: 'Gain/Loss', type: 'currency', required: true },
    { key: 'fees', label: 'Fees', type: 'currency', required: false },
    { key: 'distributions', label: 'Distributions', type: 'currency', required: false },
    { key: 'endingBal', label: 'Ending Balance', type: 'currency', required: true },
    { key: 'annualReturn', label: 'Annual Return (%)', type: 'percentage', required: false }
  ];

  // Load data on component mount
  useEffect(() => {
    const savedAccounts = localStorage.getItem('accountPerformance');
    if (savedAccounts) {
      try {
        setAccounts(JSON.parse(savedAccounts));
      } catch (error) {
        console.error('Error loading account performance data:', error);
      }
    }
  }, []);

  // Save data whenever accounts change
  useEffect(() => {
    if (accounts.length > 0) {
      localStorage.setItem('accountPerformance', JSON.stringify(accounts));
    }
  }, [accounts]);

  // Add new account entry
  const addAccount = () => {
    if (!newAccountYear || newAccountYear < 1950 || newAccountYear > 2100) {
      alert('Please enter a valid year');
      return;
    }

    const newAccount = {
      id: Date.now(),
      year: parseInt(newAccountYear),
      accountName: '',
      accountType: '401k',
      owner: '',
      firm: '',
      beginningBal: 0,
      totalContributions: 0,
      employerContrib: 0,
      gainLoss: 0,
      fees: 0,
      distributions: 0,
      endingBal: 0,
      annualReturn: 0
    };

    setAccounts(prev => [...prev, newAccount].sort((a, b) => b.year - a.year || a.accountName.localeCompare(b.accountName)));
    setNewAccountYear(new Date().getFullYear());
  };

  // Update account field
  const updateAccount = (id, field, value) => {
    setAccounts(prev => prev.map(account => 
      account.id === id 
        ? { ...account, [field]: field === 'year' ? parseInt(value) || 0 : value }
        : account
    ));
  };

  // Delete account
  const deleteAccount = (id) => {
    if (window.confirm('Are you sure you want to delete this account entry?')) {
      setAccounts(prev => prev.filter(account => account.id !== id));
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    const num = parseFloat(value) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  // Format percentage
  const formatPercentage = (value) => {
    const num = parseFloat(value) || 0;
    return `${num.toFixed(2)}%`;
  };

  // Download CSV data
  const downloadCSV = () => {
    if (accounts.length === 0) {
      alert('No data to export. Please add some account entries first.');
      return;
    }

    try {
      // Create CSV headers
      const headers = accountFields.map(field => field.label);
      
      // Create CSV rows
      const rows = accounts.map(account => 
        accountFields.map(field => {
          const value = account[field.key] || '';
          // Wrap in quotes if contains comma
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        })
      );

      // Combine headers and rows
      const csvContent = [headers, ...rows]
        .map(row => row.join(','))
        .join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `account-performance-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to export CSV. Please try again.');
    }
  };

  // Download CSV template
  const downloadTemplate = () => {
    try {
      // Create template with headers and one example row
      const headers = accountFields.map(field => field.label);
      const exampleRow = [
        '2024',
        'Example 401k',
        '401k',
        'John Doe',
        'Vanguard',
        '50000',
        '6000',
        '3000',
        '5000',
        '100',
        '0',
        '64000',
        '8.5'
      ];

      const csvContent = [headers, exampleRow]
        .map(row => row.join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'account-performance-template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to download template. Please try again.');
    }
  };

  // Upload CSV data
  const uploadCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          alert('CSV file appears to be empty or invalid.');
          return;
        }

        // Parse headers and validate
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const expectedHeaders = accountFields.map(field => field.label);
        
        // Check if headers match (allow partial matches)
        const headerMap = {};
        headers.forEach((header, index) => {
          const matchingField = accountFields.find(field => 
            field.label.toLowerCase() === header.toLowerCase()
          );
          if (matchingField) {
            headerMap[matchingField.key] = index;
          }
        });

        if (Object.keys(headerMap).length === 0) {
          alert('No matching columns found. Please check the CSV format.');
          return;
        }

        // Parse data rows
        const importedAccounts = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          
          if (values.length < 2) continue; // Skip empty rows
          
          const account = {
            id: Date.now() + i,
            year: 2024,
            accountName: '',
            accountType: '401k',
            owner: '',
            firm: '',
            beginningBal: 0,
            totalContributions: 0,
            employerContrib: 0,
            gainLoss: 0,
            fees: 0,
            distributions: 0,
            endingBal: 0,
            annualReturn: 0
          };

          // Map CSV values to account fields
          Object.keys(headerMap).forEach(fieldKey => {
            const csvIndex = headerMap[fieldKey];
            if (csvIndex < values.length && values[csvIndex]) {
              const value = values[csvIndex];
              
              if (fieldKey === 'year') {
                account[fieldKey] = parseInt(value) || 2024;
              } else if (accountFields.find(f => f.key === fieldKey)?.type === 'currency' || 
                         accountFields.find(f => f.key === fieldKey)?.type === 'percentage') {
                account[fieldKey] = parseFloat(value.replace(/[$,%]/g, '')) || 0;
              } else {
                account[fieldKey] = value;
              }
            }
          });

          // Only add if we have required fields
          if (account.accountName && account.year) {
            importedAccounts.push(account);
          }
        }

        if (importedAccounts.length > 0) {
          const shouldReplace = window.confirm(
            `Import ${importedAccounts.length} account entries? This will replace all existing data.`
          );
          
          if (shouldReplace) {
            setAccounts(importedAccounts.sort((a, b) => b.year - a.year || a.accountName.localeCompare(b.accountName)));
            alert(`Successfully imported ${importedAccounts.length} account entries!`);
          }
        } else {
          alert('No valid account data found in the CSV file.');
        }

      } catch (error) {
        alert('Failed to parse CSV file. Please check the format and try again.');
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  // Group accounts by year
  const accountsByYear = accounts.reduce((acc, account) => {
    const year = account.year;
    if (!acc[year]) acc[year] = [];
    acc[year].push(account);
    return acc;
  }, {});

  const years = Object.keys(accountsByYear).sort((a, b) => b - a);

  return (
    <div className="app-container">
      <div className="header">
        <h1>📈 Performance Tracker</h1>
        <p>Track individual account balances, contributions, gains/losses, and ROI over time</p>
      </div>

      {/* Account Performance Data - Combined Section */}
      {accounts.length === 0 ? (
        <div className="historical-empty-state">
          <div className="no-data-icon">📊</div>
          <h2 className="no-data-title">No Account Performance Data</h2>
          <p className="no-data-description">
            Start by adding your first account entry. Track investment accounts, savings, and other financial accounts
            to monitor your portfolio performance over time.
          </p>
        </div>
      ) : (
        <div>
          {/* Data Table with Data Management and Add Button */}
          <div className="historical-table-container">
            {/* Header with Add Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>📊 Account Performance Data</h2>
              <button 
                onClick={addAccount} 
                className="btn-primary"
              >
                ➕ Add Account Entry
              </button>
            </div>

            {/* Data Management Section - Inside Table Container */}
            <div className="import-export-section">
              <div className="import-export-header">
                <h2 className="import-export-title">📊 Data Management</h2>
                <p className="import-export-subtitle">Import and export your historical financial data using CSV files</p>
              </div>
              <div className="import-export-actions">
                <button onClick={downloadCSV} className="import-export-btn export">
                  📥 Download CSV
                </button>
                <button onClick={downloadTemplate} className="import-export-btn export">
                  📄 Download Template
                </button>
                <label className="import-export-btn import">
                  📤 Upload CSV
                  <input
                    type="file"
                    accept=".csv"
                    onChange={uploadCSV}
                    className="file-input-hidden"
                  />
                </label>
              </div>
            </div>

            <div className="historical-table">
              <table>
                <thead>
                  <tr>
                    {accountFields.map(field => (
                      <th key={field.key} className={
                        field.key === 'year' ? 'year-column' :
                        field.key === 'accountName' || field.key === 'accountType' || field.key === 'owner' || field.key === 'firm' ? 'user-section' :
                        'combined-section'
                      }>
                        {field.label}
                      </th>
                    ))}
                    <th className="actions-column">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id} className="historical-data-row">
                      {accountFields.map(field => (
                        <td key={field.key} className={
                          field.key === 'year' ? 'historical-year-cell' :
                          field.type === 'currency' ? 'historical-currency-cell' :
                          'historical-text-cell'
                        }>
                          {editingAccount === account.id ? (
                            field.type === 'select' ? (
                              <select
                                value={account[field.key] || ''}
                                onChange={(e) => updateAccount(account.id, field.key, e.target.value)}
                                className="historical-field-input"
                              >
                                {field.options?.map(option => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={field.type === 'currency' || field.type === 'percentage' ? 'number' : field.type}
                                value={account[field.key] || ''}
                                onChange={(e) => updateAccount(account.id, field.key, e.target.value)}
                                className={`historical-field-input ${field.type}`}
                                step={field.type === 'currency' ? '0.01' : field.type === 'percentage' ? '0.01' : '1'}
                              />
                            )
                          ) : (
                            <span>
                              {field.type === 'currency' ? formatCurrency(account[field.key]) :
                               field.type === 'percentage' ? formatPercentage(account[field.key]) :
                               account[field.key] || '—'}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="historical-actions-cell">
                        <div className="historical-action-buttons">
                          <button
                            onClick={() => setEditingAccount(editingAccount === account.id ? null : account.id)}
                            className="historical-btn-icon edit"
                            title={editingAccount === account.id ? "Save" : "Edit"}
                          >
                            {editingAccount === account.id ? '💾' : '✏️'}
                          </button>
                          <button
                            onClick={() => deleteAccount(account.id)}
                            className="historical-btn-icon delete"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Performance;
