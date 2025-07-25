import React, { useState, useEffect } from 'react';
import { getHistoricalData, setHistoricalData, getPaycheckData } from '../utils/localStorage';
import { formatCurrency } from '../utils/calculationHelpers';

// Define per-user fields
const USER_FIELDS = ['employer', 'salary', 'bonus'];

// Define combined fields
const COMBINED_FIELDS = [
  'agi', 'ssaEarnings', 'effectiveTaxRate', 'taxPaid', 'netWorthPlus', 'netWorthMinus',
  'taxFree', 'taxDeferred', 'rBrokerage', 'ltBrokerage', 'espp', 'hsa', 'cash', 'house',
  'mortgage', 'othAsset', 'retirement', 'othLia', 'homeImprovements', 'liabilities'
];

const Historical = () => {
  const currentYear = new Date().getFullYear();
  const [yearData, setYearData] = useState({});
  const [showAddYear, setShowAddYear] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [paycheckData, setPaycheckDataState] = useState(null);

  // Get user names from paycheck data
  const [userNames, setUserNames] = useState(['User1', 'User2']);
  
  // Load paycheck data
  useEffect(() => {
    const loadedPaycheckData = getPaycheckData();
    setPaycheckDataState(loadedPaycheckData);
    
    const names = [];
    if (loadedPaycheckData?.your?.name) names.push(loadedPaycheckData.your.name);
    if (loadedPaycheckData?.spouse?.name) names.push(loadedPaycheckData.spouse.name);
    setUserNames(names.length ? names : ['User1', 'User2']);
  }, []);

  // Form state
  const [formData, setFormData] = useState(() => {
    const userFields = {};
    userNames.forEach(name => {
      userFields[name] = { employer: '', salary: '', bonus: '' };
    });
    const combinedFields = {};
    COMBINED_FIELDS.forEach(f => { combinedFields[f] = ''; });
    return {
      year: currentYear,
      users: userFields,
      ...combinedFields
    };
  });

  // Load data from localStorage
  useEffect(() => {
    const savedData = getHistoricalData();
    setYearData(savedData);
  }, []);

  // Save data to localStorage
  useEffect(() => {
    if (Object.keys(yearData).length > 0) {
      setHistoricalData(yearData);
    }
  }, [yearData]);

  // Update form data when user names change
  useEffect(() => {
    setFormData(prev => {
      const userFields = {};
      userNames.forEach(name => {
        userFields[name] = prev.users?.[name] || { employer: '', salary: '', bonus: '' };
      });
      return {
        ...prev,
        users: userFields
      };
    });
  }, [userNames]);

  // Add global event listeners
  useEffect(() => {
    const handleExpandAll = () => {
      // Expand all sections if needed
    };

    const handleCollapseAll = () => {
      // Collapse all sections if needed
    };

    const handleResetAll = () => {
      setYearData({});
      setFormData({
        year: currentYear,
        users: {},
        ...Object.fromEntries(COMBINED_FIELDS.map(f => [f, '']))
      });
      setShowAddYear(false);
      setEditingYear(null);
    };

    window.addEventListener('expandAllSections', handleExpandAll);
    window.addEventListener('collapseAllSections', handleCollapseAll);
    window.addEventListener('resetAllData', handleResetAll);

    return () => {
      window.removeEventListener('expandAllSections', handleExpandAll);
      window.removeEventListener('collapseAllSections', handleCollapseAll);
      window.removeEventListener('resetAllData', handleResetAll);
    };
  }, [currentYear]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUserFieldChange = (userName, field, value) => {
    setFormData(prev => ({
      ...prev,
      users: {
        ...prev.users,
        [userName]: {
          ...prev.users[userName],
          [field]: value
        }
      }
    }));
  };

  const addYear = () => {
    if (formData.year && !yearData[formData.year]) {
      const newYearData = {
        year: formData.year,
        users: { ...formData.users },
        ...Object.fromEntries(COMBINED_FIELDS.map(f => [f, parseFloat(formData[f]) || 0]))
      };
      
      setYearData(prev => ({
        ...prev,
        [formData.year]: newYearData
      }));
      
      // Reset form
      setFormData({
        year: currentYear + 1,
        users: Object.fromEntries(userNames.map(name => [name, { employer: '', salary: '', bonus: '' }])),
        ...Object.fromEntries(COMBINED_FIELDS.map(f => [f, '']))
      });
      setShowAddYear(false);
    }
  };

  const editYear = (year) => {
    const data = yearData[year];
    setFormData({
      year: parseInt(year),
      users: data.users || {},
      ...Object.fromEntries(COMBINED_FIELDS.map(f => [f, data[f] || '']))
    });
    setEditingYear(year);
    setShowAddYear(true);
  };

  const saveEditedYear = () => {
    if (editingYear) {
      const updatedData = {
        year: formData.year,
        users: { ...formData.users },
        ...Object.fromEntries(COMBINED_FIELDS.map(f => [f, parseFloat(formData[f]) || 0]))
      };
      
      setYearData(prev => ({
        ...prev,
        [editingYear]: updatedData
      }));
      
      setEditingYear(null);
      setShowAddYear(false);
      
      // Reset form
      setFormData({
        year: currentYear + 1,
        users: Object.fromEntries(userNames.map(name => [name, { employer: '', salary: '', bonus: '' }])),
        ...Object.fromEntries(COMBINED_FIELDS.map(f => [f, '']))
      });
    }
  };

  const deleteYear = (year) => {
    if (window.confirm(`Are you sure you want to delete data for ${year}?`)) {
      setYearData(prev => {
        const newData = { ...prev };
        delete newData[year];
        return newData;
      });
    }
  };

  const cancelEdit = () => {
    setEditingYear(null);
    setShowAddYear(false);
    setFormData({
      year: currentYear + 1,
      users: Object.fromEntries(userNames.map(name => [name, { employer: '', salary: '', bonus: '' }])),
      ...Object.fromEntries(COMBINED_FIELDS.map(f => [f, '']))
    });
  };

  const exportData = () => {
    const csvContent = convertToCSV(yearData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `historical_data_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target.result;
        const importedData = parseCSV(csvText);
        
        if (Object.keys(importedData).length === 0) {
          alert('No valid data found in the CSV file.');
          return;
        }

        const confirmMessage = `This will replace your current historical data with ${Object.keys(importedData).length} year(s) of imported data. Continue?`;
        
        if (window.confirm(confirmMessage)) {
          setYearData(importedData);
          alert(`Successfully imported data for ${Object.keys(importedData).length} year(s).`);
        }
      } catch (error) {
        alert(`Error importing CSV: ${error.message}`);
      }
    };
    
    reader.readAsText(file);
    // Clear the input so the same file can be uploaded again if needed
    event.target.value = '';
  };

  const sortedYears = Object.keys(yearData).sort((a, b) => b - a);

  // CSV template headers
  const csvHeaders = [
    'year',
    'user1_name', 'user1_employer', 'user1_salary', 'user1_bonus',
    'user2_name', 'user2_employer', 'user2_salary', 'user2_bonus',
    'agi', 'ssaEarnings', 'effectiveTaxRate', 'taxPaid',
    'netWorthPlus', 'netWorthMinus', 'taxFree', 'taxDeferred',
    'rBrokerage', 'ltBrokerage', 'espp', 'hsa', 'cash',
    'house', 'mortgage', 'othAsset', 'retirement', 'othLia',
    'homeImprovements', 'liabilities'
  ];

  // Convert data to CSV format
  const convertToCSV = (data) => {
    const rows = [];
    
    // Add header row
    rows.push(csvHeaders.join(','));
    
    // Add data rows
    Object.values(data).sort((a, b) => a.year - b.year).forEach(yearEntry => {
      const row = [
        yearEntry.year,
        yearEntry.users?.user1?.name || '',
        yearEntry.users?.user1?.employer || '',
        yearEntry.users?.user1?.salary || 0,
        yearEntry.users?.user1?.bonus || 0,
        yearEntry.users?.user2?.name || '',
        yearEntry.users?.user2?.employer || '',
        yearEntry.users?.user2?.salary || 0,
        yearEntry.users?.user2?.bonus || 0,
        yearEntry.agi || 0,
        yearEntry.ssaEarnings || 0,
        yearEntry.effectiveTaxRate || 0,
        yearEntry.taxPaid || 0,
        yearEntry.netWorthPlus || 0,
        yearEntry.netWorthMinus || 0,
        yearEntry.taxFree || 0,
        yearEntry.taxDeferred || 0,
        yearEntry.rBrokerage || 0,
        yearEntry.ltBrokerage || 0,
        yearEntry.espp || 0,
        yearEntry.hsa || 0,
        yearEntry.cash || 0,
        yearEntry.house || 0,
        yearEntry.mortgage || 0,
        yearEntry.othAsset || 0,
        yearEntry.retirement || 0,
        yearEntry.othLia || 0,
        yearEntry.homeImprovements || 0,
        yearEntry.liabilities || 0
      ];
      rows.push(row.join(','));
    });
    
    return rows.join('\n');
  };

  // Download CSV file
  const downloadCSV = () => {
    const csvContent = convertToCSV(yearData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `historical_data_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Download CSV template
  const downloadTemplate = () => {
    const templateData = {
      2024: {
        year: 2024,
        users: {
          user1: { name: 'Person 1', employer: 'Company A', salary: 75000, bonus: 5000 },
          user2: { name: 'Person 2', employer: 'Company B', salary: 65000, bonus: 3000 }
        },
        agi: 140000,
        ssaEarnings: 145000,
        effectiveTaxRate: 18.5,
        taxPaid: 25900,
        netWorthPlus: 500000,
        netWorthMinus: 150000,
        taxFree: 200000,
        taxDeferred: 150000,
        rBrokerage: 25000,
        ltBrokerage: 15000,
        espp: 5000,
        hsa: 25000,
        cash: 50000,
        house: 400000,
        mortgage: 150000,
        othAsset: 30000,
        retirement: 350000,
        othLia: 0,
        homeImprovements: 20000,
        liabilities: 150000
      }
    };

    const csvContent = convertToCSV(templateData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'historical_data_template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Parse CSV content
  const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Validate headers
    const expectedHeaders = csvHeaders;
    const hasValidHeaders = expectedHeaders.every(header => headers.includes(header));
    
    if (!hasValidHeaders) {
      throw new Error('Invalid CSV format. Please use the provided template.');
    }

    const data = {};
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const year = parseInt(values[0]);
      
      if (!year || year < 1900 || year > 2100) continue;
      
      data[year] = {
        year: year,
        users: {
          user1: {
            name: values[1] || '',
            employer: values[2] || '',
            salary: parseFloat(values[3]) || 0,
            bonus: parseFloat(values[4]) || 0
          },
          user2: {
            name: values[5] || '',
            employer: values[6] || '',
            salary: parseFloat(values[7]) || 0,
            bonus: parseFloat(values[8]) || 0
          }
        },
        agi: parseFloat(values[9]) || 0,
        ssaEarnings: parseFloat(values[10]) || 0,
        effectiveTaxRate: parseFloat(values[11]) || 0,
        taxPaid: parseFloat(values[12]) || 0,
        netWorthPlus: parseFloat(values[13]) || 0,
        netWorthMinus: parseFloat(values[14]) || 0,
        taxFree: parseFloat(values[15]) || 0,
        taxDeferred: parseFloat(values[16]) || 0,
        rBrokerage: parseFloat(values[17]) || 0,
        ltBrokerage: parseFloat(values[18]) || 0,
        espp: parseFloat(values[19]) || 0,
        hsa: parseFloat(values[20]) || 0,
        cash: parseFloat(values[21]) || 0,
        house: parseFloat(values[22]) || 0,
        mortgage: parseFloat(values[23]) || 0,
        othAsset: parseFloat(values[24]) || 0,
        retirement: parseFloat(values[25]) || 0,
        othLia: parseFloat(values[26]) || 0,
        homeImprovements: parseFloat(values[27]) || 0,
        liabilities: parseFloat(values[28]) || 0
      };
    }
    
    return data;
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target.result;
        const importedData = parseCSV(csvText);
        
        if (Object.keys(importedData).length === 0) {
          alert('No valid data found in the CSV file.');
          return;
        }

        const confirmMessage = `This will replace your current historical data with ${Object.keys(importedData).length} year(s) of imported data. Continue?`;
        
        if (window.confirm(confirmMessage)) {
          setYearData(importedData);
          alert(`Successfully imported data for ${Object.keys(importedData).length} year(s).`);
        }
      } catch (error) {
        alert(`Error importing CSV: ${error.message}`);
      }
    };
    
    reader.readAsText(file);
    // Clear the input so the same file can be uploaded again if needed
    event.target.value = '';
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>📈 Historical Data Tracker</h1>
        <p>Track Your Financial Progress Year Over Year</p>
      </div>

      {/* Historical Data Table */}
      {sortedYears.length > 0 ? (
        <div className="historical-table-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>📊 Historical Data Overview</h2>
            {!showAddYear ? (
              <button onClick={() => setShowAddYear(true)} className="btn-primary">
                ➕ Add New Year
              </button>
            ) : (
              <button onClick={cancelEdit} className="btn-secondary">
                Cancel
              </button>
            )}
          </div>

          {/* Data Management Section - moved here */}
          <div className="import-export-section" style={{ marginBottom: '20px' }}>
            <div className="import-export-header">
              <h3 className="import-export-title">📊 Data Management</h3>
              <p className="import-export-subtitle">
                Import and export your historical financial data using CSV files
              </p>
            </div>
            
            <div className="import-export-actions">
              <button
                onClick={downloadCSV}
                className="import-export-btn export"
                disabled={Object.keys(yearData).length === 0}
              >
                📥 Download CSV
              </button>
              
              <button
                onClick={downloadTemplate}
                className="import-export-btn export"
              >
                📋 Download Template
              </button>
              
              <label className="import-export-btn import">
                📤 Upload CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="file-input-hidden"
                />
              </label>
            </div>
          </div>

          {/* Add/Edit Year Form */}
          {showAddYear && (
            <div style={{ marginBottom: '20px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
              <h3 style={{ color: '#374151', marginBottom: '16px', textAlign: 'center' }}>
                {editingYear ? `Edit ${editingYear} Data` : 'Add New Year'}
              </h3>
              
              <div className="add-year-form">
                <div className="form-group">
                  <label className="form-label">Year:</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => handleInputChange('year', parseInt(e.target.value))}
                    className="add-year-input"
                    min="1900"
                    max="2100"
                  />
                </div>

                {/* User-specific fields */}
                <div className="historical-sections">
                  <h3 className="historical-section-title">👥 Individual Information</h3>
                  {userNames.map(userName => (
                    <div key={userName} className="historical-section">
                      <h4 className="historical-section-title">{userName}</h4>
                      <div className="historical-fields-grid">
                        {USER_FIELDS.map(field => (
                          <div key={field} className="historical-field-group">
                            <label className="historical-field-label">
                              {field.charAt(0).toUpperCase() + field.slice(1)}:
                            </label>
                            <input
                              type="text"
                              value={formData.users[userName]?.[field] || ''}
                              onChange={(e) => handleUserFieldChange(userName, field, e.target.value)}
                              className="historical-field-input"
                              placeholder={`Enter ${field}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Combined fields */}
                <div className="historical-sections">
                  <h3 className="historical-section-title">💰 Financial Metrics</h3>
                  <div className="historical-fields-grid">
                    {COMBINED_FIELDS.map(field => (
                      <div key={field} className="historical-field-group">
                        <label className="historical-field-label">
                          {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}:
                        </label>
                        <input
                          type="text"
                          value={formData[field]}
                          onChange={(e) => handleInputChange(field, e.target.value)}
                          className={`historical-field-input ${field.includes('Rate') || field.includes('Tax') ? 'percentage' : 'currency'}`}
                          placeholder={field.includes('Rate') ? 'Enter percentage' : 'Enter amount'}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-actions">
                  <button 
                    onClick={editingYear ? saveEditedYear : addYear} 
                    className="btn-primary"
                  >
                    {editingYear ? 'Save Changes' : 'Add Year'}
                  </button>
                  <button onClick={cancelEdit} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="historical-table">
            <table>
              <thead>
                <tr>
                  <th className="year-column">Year</th>
                  {userNames.map(name => (
                    <th key={name} className="user-section" colSpan="3">{name}</th>
                  ))}
                  <th className="combined-section" colSpan={COMBINED_FIELDS.length}>Financial Metrics</th>
                  <th className="actions-column">Actions</th>
                </tr>
                <tr className="sub-header">
                  <th></th>
                  {userNames.map(name => (
                    USER_FIELDS.map(field => (
                      <th key={`${name}-${field}`}>{field.charAt(0).toUpperCase() + field.slice(1)}</th>
                    ))
                  ))}
                  {COMBINED_FIELDS.map(field => (
                    <th key={field}>{field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}</th>
                  ))}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedYears.map(year => {
                  const data = yearData[year];
                  return (
                    <tr key={year} className="historical-data-row">
                      <td className="historical-year-cell">{year}</td>
                      {userNames.map(userName => (
                        USER_FIELDS.map(field => (
                          <td key={`${userName}-${field}`} className="historical-text-cell">
                            {field === 'salary' || field === 'bonus' 
                              ? formatCurrency(data.users?.[userName]?.[field] || 0)
                              : data.users?.[userName]?.[field] || '-'
                            }
                          </td>
                        ))
                      ))}
                      {COMBINED_FIELDS.map(field => (
                        <td key={field} className="historical-currency-cell">
                          {field.includes('Rate') 
                            ? `${((data[field] || 0) * 100).toFixed(2)}%`
                            : formatCurrency(data[field] || 0)
                          }
                        </td>
                      ))}
                      <td className="historical-actions-cell">
                        <div className="historical-action-buttons">
                          <button
                            onClick={() => editYear(year)}
                            className="historical-btn-icon edit"
                            title="Edit year"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteYear(year)}
                            className="historical-btn-icon delete"
                            title="Delete year"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="historical-empty-state">
          <div className="empty-state-icon">📊</div>
          <h2>No Historical Data Yet</h2>
          <p>Add your first year of financial data to start tracking your progress</p>
          
          {/* Data Management Section - also here for empty state */}
          <div className="import-export-section" style={{ marginTop: '30px', marginBottom: '20px' }}>
            <div className="import-export-header">
              <h3 className="import-export-title">📊 Data Management</h3>
              <p className="import-export-subtitle">
                Import your historical financial data using CSV files or download a template to get started
              </p>
            </div>
            
            <div className="import-export-actions">
              <button
                onClick={downloadTemplate}
                className="import-export-btn export"
              >
                📋 Download Template
              </button>
              
              <label className="import-export-btn import">
                📤 Upload CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="file-input-hidden"
                />
              </label>
            </div>
          </div>
          
          <div style={{ marginTop: '30px' }}>
            {!showAddYear ? (
              <button onClick={() => setShowAddYear(true)} className="btn-primary">
                ➕ Add New Year
              </button>
            ) : (
              <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
                <h3 style={{ color: '#374151', marginBottom: '16px', textAlign: 'center' }}>
                  Add New Year
                </h3>
                
                <div className="add-year-form">
                  <div className="form-group">
                    <label className="form-label">Year:</label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) => handleInputChange('year', parseInt(e.target.value))}
                      className="add-year-input"
                      min="1900"
                      max="2100"
                    />
                  </div>

                  {/* User-specific fields */}
                  <div className="historical-sections">
                    <h3 className="historical-section-title">👥 Individual Information</h3>
                    {userNames.map(userName => (
                      <div key={userName} className="historical-section">
                        <h4 className="historical-section-title">{userName}</h4>
                        <div className="historical-fields-grid">
                          {USER_FIELDS.map(field => (
                            <div key={field} className="historical-field-group">
                              <label className="historical-field-label">
                                {field.charAt(0).toUpperCase() + field.slice(1)}:
                              </label>
                              <input
                                type="text"
                                value={formData.users[userName]?.[field] || ''}
                                onChange={(e) => handleUserFieldChange(userName, field, e.target.value)}
                                className="historical-field-input"
                                placeholder={`Enter ${field}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Combined fields */}
                  <div className="historical-sections">
                    <h3 className="historical-section-title">💰 Financial Metrics</h3>
                    <div className="historical-fields-grid">
                      {COMBINED_FIELDS.map(field => (
                        <div key={field} className="historical-field-group">
                          <label className="historical-field-label">
                            {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}:
                          </label>
                          <input
                            type="text"
                            value={formData[field]}
                            onChange={(e) => handleInputChange(field, e.target.value)}
                            className={`historical-field-input ${field.includes('Rate') || field.includes('Tax') ? 'percentage' : 'currency'}`}
                            placeholder={field.includes('Rate') ? 'Enter percentage' : 'Enter amount'}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-actions">
                    <button onClick={addYear} className="btn-primary">
                      Add Year
                    </button>
                    <button onClick={cancelEdit} className="btn-secondary">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Historical;