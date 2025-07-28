import React from 'react';
import Papa from 'papaparse';
import { generateDataFilename } from '../utils/calculationHelpers';

const CSVImportExport = ({
  title = "Data Management",
  subtitle = "Import and export your data using CSV files",
  data = [],
  headers = [],
  formatRowData,
  parseRowData,
  beforeImport,
  onImportSuccess,
  onImportError,
  generateTemplate,
  compact = false,
  disabled = false,
  dataType = 'data',
  userNames = [],
  showResetButton = false,
  onReset,
  className = ''
}) => {
  
  const generateCSVContent = (data, headers, rowFormatter) => {
    const rows = [headers];
    data.forEach(entry => {
      const row = rowFormatter(entry);
      const rowArray = Array.isArray(row) ? row : Object.values(row);
      rows.push(rowArray);
    });
    
    return rows.map(row =>
      row.map(value => {
        const stringValue = value == null ? '' : String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    ).join('\n');
  };

  const downloadCSV = () => {
    if (!formatRowData) {
      console.error('formatRowData function is required for CSV export');
      return;
    }

    const sortedData = Array.isArray(data) ? data : Object.values(data);
    const csvContent = generateCSVContent(sortedData, headers, formatRowData);
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = generateDataFilename(dataType, userNames, 'csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    let templateData;
    
    if (generateTemplate) {
      templateData = generateTemplate();
    } else {
      // Default template with empty row
      templateData = [{}];
    }
    
    if (!formatRowData) {
      console.error('formatRowData function is required for template generation');
      return;
    }

    const csvContent = generateCSVContent(templateData, headers, formatRowData);
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = generateDataFilename(`${dataType}_template`, userNames, 'csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseCSV = (csvText) => {
    if (beforeImport && typeof beforeImport === 'function') {
      const proceed = beforeImport();
      if (!proceed) {
        return [];
      }
    }
    
    try {
      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true
      });
      
      if (result.errors.length > 0) {
        throw new Error('CSV parsing errors found');
      }
      
      if (!parseRowData) {
        console.error('parseRowData function is required for CSV import');
        return [];
      }
      
      return result.data.map(row => parseRowData(row)).filter(Boolean);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      if (onImportError) {
        onImportError(error);
      }
      return [];
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
      const error = new Error('Please select a CSV file');
      if (onImportError) {
        onImportError(error);
      } else {
        alert('Please select a CSV file');
      }
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target.result;
        const parsed = parseCSV(csvText);
        
        if (parsed.length === 0) {
          throw new Error('No valid data found in CSV file');
        }
        
        if (onImportSuccess) {
          onImportSuccess(parsed);
        }
      } catch (error) {
        if (onImportError) {
          onImportError(error);
        } else {
          alert(`Error importing CSV: ${error.message}`);
        }
      }
    };
    
    reader.onerror = () => {
      const error = new Error('Error reading file');
      if (onImportError) {
        onImportError(error);
      } else {
        alert('Error reading file');
      }
    };
    
    reader.readAsText(file);
    
    // Clear the input so the same file can be selected again  
    event.target.value = '';
  };

  const handleCSVImport = () => {
    const fileInput = document.getElementById('csv-upload-input');
    if (fileInput) {
      fileInput.click();
    }
  };

  const dataLength = Array.isArray(data) ? data.length : Object.keys(data).length;

  return (
    <div className={`import-export-section${compact ? " compact" : ""}${className ? ` ${className}` : ""}`}>
      <div className="import-export-header">
        <h3 className="import-export-title">📊 {title}</h3>
        <p className="import-export-subtitle">
          {subtitle}
        </p>
      </div>
      <div className="import-export-actions">
        <button
          onClick={downloadCSV}
          className="import-export-btn export"
          disabled={disabled || dataLength === 0}
        >
          📥 Download CSV
        </button>
        <button
          onClick={downloadTemplate}
          className="import-export-btn export"
          disabled={disabled}
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
            disabled={disabled}
          />
        </label>
        {showResetButton && onReset && (
          <button
            onClick={onReset}
            className="import-export-btn danger"
            disabled={disabled}
            style={{
              backgroundColor: '#dc2626',
              borderColor: '#dc2626',
              color: 'white'
            }}
          >
            🗑️ Reset Data
          </button>
        )}
      </div>
      
      {/* Hidden file input for empty state button */}
      <input
        id="csv-upload-input"
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
        disabled={disabled}
      />
    </div>
  );
};

export default CSVImportExport;