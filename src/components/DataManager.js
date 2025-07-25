import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/calculationHelpers';

const DataManager = ({
  title,
  subtitle,
  dataKey, // localStorage key
  getData, // function to get data from localStorage
  setData, // function to set data to localStorage
  schema, // data schema configuration
  userNames = [], // for user-specific fields
  emptyFormData, // initial form data structure
  getFormDataFromEntry, // function to convert stored entry to form data
  getEntryFromFormData, // function to convert form data to stored entry
  primaryKey = 'year', // primary key field name
  sortField = 'year', // field to sort by
  sortOrder = 'desc', // 'asc' or 'desc'
  csvTemplate, // CSV template data
  parseCSVRow, // function to parse CSV row
  formatCSVRow, // function to format entry for CSV
  csvHeaders, // CSV headers array
  allowAdd = true, // whether to show add button
  allowEdit = true, // whether to show edit button
  allowDelete = true, // whether to show delete button
}) => {
  const [entryData, setEntryData] = useState({});
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [formData, setFormData] = useState(emptyFormData);

  // Load data from localStorage
  useEffect(() => {
    const savedData = getData();
    setEntryData(savedData);
  }, [getData]);

  // Save data to localStorage
  useEffect(() => {
    if (Object.keys(entryData).length > 0) {
      setData(entryData);
    }
  }, [entryData, setData]);

  // Add global event listeners
  useEffect(() => {
    const handleResetAll = () => {
      setEntryData({});
      setFormData(emptyFormData);
      setShowAddEntry(false);
      setEditingKey(null);
    };

    const handleExpandAll = () => {
      // Trigger expand all sections if DataManager is used in components with sections
      window.dispatchEvent(new CustomEvent('expandAllSections'));
    };

    const handleCollapseAll = () => {
      // Trigger collapse all sections if DataManager is used in components with sections
      window.dispatchEvent(new CustomEvent('collapseAllSections'));
    };

    window.addEventListener('resetAllData', handleResetAll);
    window.addEventListener('expandAllSections', handleExpandAll);
    window.addEventListener('collapseAllSections', handleCollapseAll);

    return () => {
      window.removeEventListener('resetAllData', handleResetAll);
      window.removeEventListener('expandAllSections', handleExpandAll);
      window.removeEventListener('collapseAllSections', handleCollapseAll);
    };
  }, [emptyFormData]);

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

  const addEntry = () => {
    const key = formData[primaryKey];
    if (key && !entryData[key]) {
      const newEntry = getEntryFromFormData(formData);
      
      setEntryData(prev => ({
        ...prev,
        [key]: newEntry
      }));
      
      // Reset form
      setFormData(emptyFormData);
      setShowAddEntry(false);
    }
  };

  const editEntry = (key) => {
    const data = entryData[key];
    const formDataFromEntry = getFormDataFromEntry(data);
    setFormData(formDataFromEntry);
    setEditingKey(key);
    setShowAddEntry(true);
  };

  const saveEditedEntry = () => {
    if (editingKey) {
      const updatedEntry = getEntryFromFormData(formData);
      
      setEntryData(prev => ({
        ...prev,
        [editingKey]: updatedEntry
      }));
      
      setEditingKey(null);
      setShowAddEntry(false);
      setFormData(emptyFormData);
    }
  };

  const deleteEntry = (key) => {
    if (window.confirm(`Are you sure you want to delete this entry?`)) {
      setEntryData(prev => {
        const newData = { ...prev };
        delete newData[key];
        return newData;
      });
    }
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setShowAddEntry(false);
    setFormData(emptyFormData);
  };

  // Convert data to CSV format
  const convertToCSV = (data) => {
    const rows = [];
    rows.push(csvHeaders.join(','));
    
    const sortedEntries = Object.values(data).sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    sortedEntries.forEach(entry => {
      const row = formatCSVRow(entry);
      rows.push(row.join(','));
    });
    
    return rows.join('\n');
  };

  // Download CSV file
  const downloadCSV = () => {
    const csvContent = convertToCSV(entryData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${dataKey}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Download CSV template
  const downloadTemplate = () => {
    const csvContent = convertToCSV(csvTemplate);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${dataKey}_template.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Parse CSV content
  const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Validate headers
    const hasValidHeaders = csvHeaders.every(header => headers.includes(header));
    
    if (!hasValidHeaders) {
      throw new Error('Invalid CSV format. Please use the provided template.');
    }

    const data = {};
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const entry = parseCSVRow(headers, values);
      
      if (entry && entry[primaryKey]) {
        data[entry[primaryKey]] = entry;
      }
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

        const confirmMessage = `This will replace your current data with ${Object.keys(importedData).length} entries of imported data. Continue?`;
        
        if (window.confirm(confirmMessage)) {
          setEntryData(importedData);
          alert(`Successfully imported ${Object.keys(importedData).length} entries.`);
        }
      } catch (error) {
        alert(`Error importing CSV: ${error.message}`);
      }
    };
    
    reader.readAsText(file);
    event.target.value = '';
  };

  const sortedKeys = Object.keys(entryData).sort((a, b) => {
    const aVal = entryData[a][sortField];
    const bVal = entryData[b][sortField];
    return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const renderFormField = (field, section = null) => {
    const fieldConfig = schema.sections.find(s => s.fields.some(f => f.name === field))?.fields.find(f => f.name === field) ||
                      schema.sections.find(s => s.name === section)?.fields.find(f => f.name === field);
    
    if (!fieldConfig) return null;

    return (
      <div key={field} className="historical-field-group">
        <label className="historical-field-label">
          {fieldConfig.label}:
        </label>
        <input
          type={fieldConfig.type || 'text'}
          value={formData[field] || ''}
          onChange={(e) => handleInputChange(field, e.target.value)}
          className={`historical-field-input ${fieldConfig.className || ''}`}
          placeholder={fieldConfig.placeholder || `Enter ${fieldConfig.label.toLowerCase()}`}
        />
      </div>
    );
  };

  const renderUserFormField = (userName, field) => {
    const userSection = schema.sections.find(s => s.name === 'users');
    const fieldConfig = userSection?.fields.find(f => f.name === field);
    
    if (!fieldConfig) return null;

    return (
      <div key={field} className="historical-field-group">
        <label className="historical-field-label">
          {fieldConfig.label}:
        </label>
        <input
          type={fieldConfig.type || 'text'}
          value={formData.users?.[userName]?.[field] || ''}
          onChange={(e) => handleUserFieldChange(userName, field, e.target.value)}
          className={`historical-field-input ${fieldConfig.className || ''}`}
          placeholder={fieldConfig.placeholder || `Enter ${fieldConfig.label.toLowerCase()}`}
        />
      </div>
    );
  };

  const renderTableCell = (entry, field) => {
    const fieldConfig = schema.sections.flatMap(s => s.fields).find(f => f.name === field);
    const value = entry[field];
    
    if (!fieldConfig) return '-';
    
    if (fieldConfig.format === 'currency') {
      return formatCurrency(value || 0);
    } else if (fieldConfig.format === 'percentage') {
      return `${((value || 0) * 100).toFixed(2)}%`;
    } else {
      return value || '-';
    }
  };

  const renderUserTableCell = (entry, userName, field) => {
    const userSection = schema.sections.find(s => s.name === 'users');
    const fieldConfig = userSection?.fields.find(f => f.name === field);
    const value = entry.users?.[userName]?.[field];
    
    if (!fieldConfig) return '-';
    
    if (fieldConfig.format === 'currency') {
      return formatCurrency(value || 0);
    } else if (fieldConfig.format === 'percentage') {
      return `${((value || 0) * 100).toFixed(2)}%`;
    } else {
      return value || '-';
    }
  };

  return (
    <div>
      {/* Data Management Section */}
      <div className="import-export-section" style={{ marginBottom: '20px' }}>
        <div className="import-export-header">
          <h3 className="import-export-title">📊 Data Management</h3>
          <p className="import-export-subtitle">
            Import and export your {title.toLowerCase()} using CSV files
          </p>
        </div>
        
        <div className="import-export-actions">
          <button
            onClick={downloadCSV}
            className="import-export-btn export"
            disabled={Object.keys(entryData).length === 0}
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

      {/* Data Table */}
      {sortedKeys.length > 0 ? (
        <div className="historical-table-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>📊 {title} Overview</h2>
            {allowAdd && !showAddEntry ? (
              <button onClick={() => setShowAddEntry(true)} className="btn-primary">
                ➕ Add New Entry
              </button>
            ) : allowAdd && (
              <button onClick={cancelEdit} className="btn-secondary">
                Cancel
              </button>
            )}
          </div>

          {/* Add/Edit Entry Form */}
          {showAddEntry && (
            <div style={{ marginBottom: '20px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
              <h3 style={{ color: '#374151', marginBottom: '16px', textAlign: 'center' }}>
                {editingKey ? `Edit Entry` : 'Add New Entry'}
              </h3>
              
              <div className="add-year-form">
                {/* Primary key field */}
                <div className="form-group">
                  <label className="form-label">{schema.primaryKeyLabel}:</label>
                  <input
                    type={schema.primaryKeyType || 'text'}
                    value={formData[primaryKey]}
                    onChange={(e) => handleInputChange(primaryKey, schema.primaryKeyType === 'number' ? parseInt(e.target.value) : e.target.value)}
                    className="add-year-input"
                    placeholder={`Enter ${schema.primaryKeyLabel.toLowerCase()}`}
                  />
                </div>

                {/* Render form sections */}
                <div className="historical-sections">
                  {schema.sections.map(section => (
                    <div key={section.name}>
                      <h3 className="historical-section-title">{section.title}</h3>
                      
                      {section.name === 'users' && userNames.length > 0 ? (
                        userNames.map(userName => (
                          <div key={userName} className="historical-section">
                            <h4 className="historical-section-title">{userName}</h4>
                            <div className="historical-fields-grid">
                              {section.fields.map(field => renderUserFormField(userName, field.name))}
                            </div>
                          </div>
                        ))
                      ) : section.name !== 'users' ? (
                        <div className="historical-fields-grid">
                          {section.fields.map(field => renderFormField(field.name, section.name))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="form-actions">
                  <button 
                    onClick={editingKey ? saveEditedEntry : addEntry} 
                    className="btn-primary"
                  >
                    {editingKey ? 'Save Changes' : 'Add Entry'}
                  </button>
                  <button onClick={cancelEdit} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="historical-table">
            <table>
              <thead>
                <tr>
                  <th className="year-column">{schema.primaryKeyLabel}</th>
                  {userNames.length > 0 && schema.sections.find(s => s.name === 'users') && 
                    userNames.map(name => (
                      <th key={name} className="user-section" colSpan={schema.sections.find(s => s.name === 'users').fields.length}>
                        {name}
                      </th>
                    ))
                  }
                  {schema.sections.filter(s => s.name !== 'users').map(section => (
                    <th key={section.name} className="combined-section" colSpan={section.fields.length}>
                      {section.title}
                    </th>
                  ))}
                  {(allowEdit || allowDelete) && <th className="actions-column">Actions</th>}
                </tr>
                <tr className="sub-header">
                  <th></th>
                  {userNames.length > 0 && schema.sections.find(s => s.name === 'users') &&
                    userNames.map(name => (
                      schema.sections.find(s => s.name === 'users').fields.map(field => (
                        <th key={`${name}-${field.name}`}>{field.label}</th>
                      ))
                    ))
                  }
                  {schema.sections.filter(s => s.name !== 'users').map(section =>
                    section.fields.map(field => (
                      <th key={field.name}>{field.label}</th>
                    ))
                  )}
                  {(allowEdit || allowDelete) && <th></th>}
                </tr>
              </thead>
              <tbody>
                {sortedKeys.map(key => {
                  const entry = entryData[key];
                  return (
                    <tr key={key} className="historical-data-row">
                      <td className="historical-year-cell">{entry[primaryKey]}</td>
                      {userNames.length > 0 && schema.sections.find(s => s.name === 'users') &&
                        userNames.map(userName => (
                          schema.sections.find(s => s.name === 'users').fields.map(field => (
                            <td key={`${userName}-${field.name}`} className="historical-text-cell">
                              {renderUserTableCell(entry, userName, field.name)}
                            </td>
                          ))
                        ))
                      }
                      {schema.sections.filter(s => s.name !== 'users').map(section =>
                        section.fields.map(field => (
                          <td key={field.name} className="historical-currency-cell">
                            {renderTableCell(entry, field.name)}
                          </td>
                        ))
                      )}
                      {(allowEdit || allowDelete) && (
                        <td className="historical-actions-cell">
                          <div className="historical-action-buttons">
                            {allowEdit && (
                              <button
                                onClick={() => editEntry(key)}
                                className="historical-btn-icon edit"
                                title="Edit entry"
                              >
                                ✏️
                              </button>
                            )}
                            {allowDelete && (
                              <button
                                onClick={() => deleteEntry(key)}
                                className="historical-btn-icon delete"
                                title="Delete entry"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      )}
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
          <h2>No Data Yet</h2>
          <p>{subtitle}</p>
          
          {allowAdd && (
            <div style={{ marginTop: '30px' }}>
              {!showAddEntry ? (
                <button onClick={() => setShowAddEntry(true)} className="btn-primary">
                  ➕ Add New Entry
                </button>
              ) : (
                <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
                  <h3 style={{ color: '#374151', marginBottom: '16px', textAlign: 'center' }}>
                    Add New Entry
                  </h3>
                  
                  <div className="add-year-form">
                    {/* Primary key field */}
                    <div className="form-group">
                      <label className="form-label">{schema.primaryKeyLabel}:</label>
                      <input
                        type={schema.primaryKeyType || 'text'}
                        value={formData[primaryKey]}
                        onChange={(e) => handleInputChange(primaryKey, schema.primaryKeyType === 'number' ? parseInt(e.target.value) : e.target.value)}
                        className="add-year-input"
                        placeholder={`Enter ${schema.primaryKeyLabel.toLowerCase()}`}
                      />
                    </div>

                    {/* Render form sections */}
                    <div className="historical-sections">
                      {schema.sections.map(section => (
                        <div key={section.name}>
                          <h3 className="historical-section-title">{section.title}</h3>
                          
                          {section.name === 'users' && userNames.length > 0 ? (
                            userNames.map(userName => (
                              <div key={userName} className="historical-section">
                                <h4 className="historical-section-title">{userName}</h4>
                                <div className="historical-fields-grid">
                                  {section.fields.map(field => renderUserFormField(userName, field.name))}
                                </div>
                              </div>
                            ))
                          ) : section.name !== 'users' ? (
                            <div className="historical-fields-grid">
                              {section.fields.map(field => renderFormField(field.name, section.name))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    <div className="form-actions">
                      <button onClick={addEntry} className="btn-primary">
                        Add Entry
                      </button>
                      <button onClick={cancelEdit} className="btn-secondary">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataManager;