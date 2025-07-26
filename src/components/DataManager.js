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
  primaryKey = 'id', // changed from 'year' to 'id'
  sortField = 'id',   // changed from 'year' to 'id'
  sortOrder = 'desc', // 'asc' or 'desc'
  csvTemplate, // CSV template data
  parseCSVRow, // function to parse CSV row
  formatCSVRow, // function to format entry for CSV
  csvHeaders, // CSV headers array
  allowAdd = true, // whether to show add button
  allowEdit = true, // whether to show edit button
  allowDelete = true, // whether to show delete button
  fieldCssClasses = {}, // optional object mapping field names to CSS classes
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
    
    // Primary key validation
    if (!key) {
      alert(`Please enter a valid ${schema.primaryKeyLabel.toLowerCase()}.`);
      return;
    }
    
    if (entryData[key]) {
      alert(`An entry with ${schema.primaryKeyLabel.toLowerCase()} "${key}" already exists.`);
      return;
    }

    // Validate required fields based on schema
    const validationErrors = [];
    
    // Check each section for required fields
    schema.sections.forEach(section => {
      if (section.name === 'users' && userNames.length > 0) {
        // Validate user-specific fields
        userNames.forEach(userName => {
          section.fields.forEach(field => {
            if (field.required) {
              const value = formData.users?.[userName]?.[field.name];
              if (!value || (typeof value === 'string' && value.trim() === '')) {
                validationErrors.push(`${userName} - ${field.label} is required`);
              }
            }
          });
        });
      } else {
        // Validate regular fields
        section.fields.forEach(field => {
          if (field.required) {
            const value = formData[field.name];
            if (!value || (typeof value === 'string' && value.trim() === '') || 
                (typeof value === 'number' && isNaN(value))) {
              validationErrors.push(`${field.label} is required`);
            }
          }
        });
      }
    });

    // Check for numeric field validation
    schema.sections.forEach(section => {
      if (section.name !== 'users') {
        section.fields.forEach(field => {
          if (field.format === 'currency' || field.type === 'number') {
            const value = formData[field.name];
            if (value && value !== '' && (isNaN(parseFloat(value)) || parseFloat(value) < 0)) {
              validationErrors.push(`${field.label} must be a valid positive number`);
            }
          }
        });
      } else if (userNames.length > 0) {
        userNames.forEach(userName => {
          section.fields.forEach(field => {
            if (field.format === 'currency' || field.type === 'number') {
              const value = formData.users?.[userName]?.[field.name];
              if (value && value !== '' && (isNaN(parseFloat(value)) || parseFloat(value) < 0)) {
                validationErrors.push(`${userName} - ${field.label} must be a valid positive number`);
              }
            }
          });
        });
      }
    });

    // Show validation errors if any
    if (validationErrors.length > 0) {
      alert(`Please fix the following errors:\n\n${validationErrors.join('\n')}`);
      return;
    }

    // All validation passed, proceed with adding the entry
    try {
      const newEntry = getEntryFromFormData(formData);
      
      setEntryData(prev => ({
        ...prev,
        [key]: newEntry
      }));
      
      // Reset form
      setFormData(emptyFormData);
      setShowAddEntry(false);
      
      // Optional success feedback
      console.log(`Successfully added entry: ${key}`);
    } catch (error) {
      console.error('Error adding entry:', error);
      alert('An error occurred while adding the entry. Please try again.');
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

  // Helper function to generate CSV content
  const generateCSVContent = (data, headers, rowFormatter) => {
    const rows = [headers];
    data.forEach(entry => {
      const row = rowFormatter(entry);
      // Convert object to array of values if needed
      const rowArray = Array.isArray(row) ? row : Object.values(row);
      rows.push(rowArray);
    });
    
    // Properly escape and quote CSV values
    return rows.map(row =>
      row.map(value => {
        // Convert to string and handle null/undefined
        const stringValue = value == null ? '' : String(value);
        
        // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
      }).join(',')
    ).join('\n');
  };

  // Download CSV file
  const downloadCSV = () => {
    const sortedEntries = Object.values(entryData).sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    const csvContent = generateCSVContent(sortedEntries, csvHeaders, formatCSVRow);
  
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_').toLowerCase()}_data.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download CSV template
  const downloadTemplate = () => {
    const templateEntries = Object.values(csvTemplate);
    const csvContent = generateCSVContent(templateEntries, csvHeaders, formatCSVRow);
  
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_').toLowerCase()}_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Parse CSV content
  const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const values = [];
      let inQuotes = false, value = '', i = 0;
      while (i < line.length) {
        const char = line[i];
        if (char === '"' && (i === 0 || line[i + 1] === '"')) {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(value.replace(/^"|"$/g, '').replace(/""/g, '"'));
          value = '';
        } else {
          value += char;
        }
        i++;
      }
      values.push(value.replace(/^"|"$/g, '').replace(/""/g, '"'));
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] ?? '';
      });
      return parseCSVRow(row);
    });
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target.result;
      const parsed = parseCSV(csvText);
      const newData = {};
      parsed.forEach(entry => {
        const key = entry[primaryKey];
        if (key) newData[key] = entry;
      });
      setEntryData(newData);
    };
    reader.readAsText(file);
  };

  // Use id as the key for sorting and accessing entryData
  const sortedKeys = Object.keys(entryData).sort((a, b) => {
    // Check if both keys can be converted to valid numbers
    const aNum = Number(a);
    const bNum = Number(b);
    
    // If both are valid numbers, perform numeric sort
    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (sortOrder === 'asc') return aNum - bNum;
      return bNum - aNum;
    }
    
    // Fall back to string comparison for non-numeric keys
    if (sortOrder === 'asc') return a.localeCompare(b);
    return b.localeCompare(a);
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

  // Extract form rendering logic into reusable function
  const renderEntryForm = (isEditMode = false) => (
    <div style={{ marginBottom: '20px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
      <h3 style={{ color: '#374151', marginBottom: '16px', textAlign: 'center' }}>
        {isEditMode ? `Edit Entry` : 'Add New Entry'}
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
            onClick={isEditMode ? saveEditedEntry : addEntry} 
            className="btn-primary"
          >
            {isEditMode ? 'Save Changes' : 'Add Entry'}
          </button>
          <button onClick={cancelEdit} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

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
          {showAddEntry && renderEntryForm(!!editingKey)}

          {/* Data Table */}
          <div className="historical-table">
            <table>
              <thead>
                <tr>
                  {/* Always show 'Year' if entry has a year field, otherwise fallback to primary key */}
                  <th className="year-column">
                    {Object.values(entryData).some(e => e && e.year !== undefined)
                      ? 'Year'
                      : schema.primaryKeyLabel}
                  </th>
                  {userNames.length > 0 && schema.sections.find(s => s.name === 'users') && 
                    userNames.map(name => (
                      <th key={name} className="user-section" colSpan={schema.sections.find(s => s.name === 'users').fields.length}>
                        {name}
                      </th>
                    ))
                  }
                  {schema.sections.filter(s => s.name !== 'users').map(section => (
                    <th key={section.name} className="combined-section" colSpan={
                      // Exclude 'year' field from colSpan if it's already rendered as the first column
                      section.fields.filter(f => f.name !== 'year').length
                    }>
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
                    section.fields
                      .filter(field => field.name !== 'year') // Exclude 'year' from sub-header
                      .map(field => (
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
                      {/* Always show year if present, otherwise fallback to primary key */}
                      {entry && entry.year !== undefined ? (
                        <td className="historical-year-cell">{entry.year}</td>
                      ) : (
                        <td className="historical-year-cell">{entry[primaryKey]}</td>
                      )}
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
                        section.fields
                          .filter(field => field.name !== 'year') // Exclude 'year' from section fields
                          .map(field => (
                            <td key={field.name} className={
                              [
                                'historical-currency-cell',
                                fieldCssClasses[field.name] || ''
                              ].filter(Boolean).join(' ')
                            }>
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
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                  {renderEntryForm(false)}
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