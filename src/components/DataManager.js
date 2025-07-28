import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { 
  getPaycheckData, 
  updateNameMapping, 
  migrateDataForNameChange,
  dispatchGlobalEvent,
  getCurrentUserName
} from '../utils/localStorage';
import { formatCurrency, generateDataFilename } from '../utils/calculationHelpers';
import Papa from 'papaparse';

// Resizable header component
const ResizableHeader = ({ columnKey, children, width, onResize, compactView, className = '', style = {} }) => {
  return (
    <th 
      className={`resizable-header ${className}`}
      style={{
        ...style,
        width: width || 'auto',
        minWidth: '80px',
        position: 'relative'
      }}
    >
      {children}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '8px',
          height: '100%',
          cursor: 'col-resize',
          backgroundColor: 'transparent',
          borderRight: '2px solid transparent',
          marginRight: '-4px'
        }}
        onMouseDown={(e) => onResize(columnKey, e)}
        onMouseEnter={(e) => {
          e.target.style.borderRightColor = '#3b82f6';
          e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.target.style.borderRightColor = 'transparent';
          e.target.style.backgroundColor = 'transparent';
        }}
        title="Drag to resize column"
      />
    </th>
  );
};

// Memoized table row component for performance
const DataTableRow = memo(({ 
  rowKey, 
  entry, 
  isNew,
  schema,
  usePaycheckUsers,
  userFilters,
  combinedSectionFilters,
  fieldCssClasses,
  allowEdit,
  allowDelete,
  editingCell,
  editingCellValue,
  setEditingCellValue,
  saveEditCell,
  cancelEditCell,
  handleCellInputKeyDown,
  startEditCell,
  deleteEntry,
  getAvailableFilterOptions,
  renderUserTableCell,
  renderTableCell,
  compactView,
  rowIndex,
  columnWidths
}) => {
  const isEvenRow = rowIndex % 2 === 0;
  
  return (
    <tr
      className={`data-row${isNew ? ' new-row-highlight' : ''}`}
      style={{
        ...(isNew ? { animation: 'new-row-flash 1.2s' } : {}),
        backgroundColor: isEvenRow ? '#f9fafb' : '#ffffff',
        fontSize: compactView ? '0.8rem' : '0.9rem',
        height: compactView ? '32px' : '40px'
      }}
      onMouseEnter={(e) => {
        if (!isNew) e.currentTarget.style.backgroundColor = '#e0f2fe';
      }}
      onMouseLeave={(e) => {
        if (!isNew) e.currentTarget.style.backgroundColor = isEvenRow ? '#f9fafb' : '#ffffff';
      }}
    >
      <td className={`${(fieldCssClasses && fieldCssClasses.year) || 'data-year-cell'} year-cell`} 
          style={{ 
            padding: compactView ? '4px 8px' : '8px 12px',
            borderBottom: '1px solid #e5e7eb',
            fontWeight: '500',
            position: 'sticky',
            left: 0,
            backgroundColor: 'inherit',
            zIndex: 1,
            width: (columnWidths && columnWidths.year) || 'auto',
            minWidth: '80px'
          }}>
        {entry && (entry.year || entry[schema.primaryKey])}
      </td>
      {/* Dynamic cell generation for user data */}
      {(() => {
        const userSection = schema.sections.find(s => s.name === 'users');
        if (!userSection || !usePaycheckUsers || Object.keys(userFilters).length === 0) {
          return null;
        }

        const availableUsers = getAvailableFilterOptions;
        const activeUsers = availableUsers.filter(name => 
          userFilters[name] === true && name !== 'Joint'
        );
        const showJoint = userFilters['Joint'] === true;
        
        const cells = [];
        
        activeUsers.forEach(name => {
          userSection.fields.forEach(field => {
            const columnKey = `${name}-${field.name}`;
            cells.push(
              <td key={columnKey} 
                  className={`${(fieldCssClasses && fieldCssClasses[columnKey]) || 'historical-text-cell'} user-data-cell`}
                  style={{ 
                    padding: compactView ? '4px 6px' : '8px 10px',
                    borderBottom: '1px solid #e5e7eb',
                    whiteSpace: compactView ? 'nowrap' : 'normal',
                    overflow: compactView ? 'hidden' : 'visible',
                    textOverflow: compactView ? 'ellipsis' : 'clip',
                    width: (columnWidths && columnWidths[columnKey]) || 'auto',
                    minWidth: '80px'
                  }}>
                {renderUserTableCell(entry, name, field.name, rowKey)}
              </td>
            );
          });
        });
        
        if (showJoint) {
          userSection.fields.forEach(field => {
            const columnKey = `joint-${field.name}`;
            cells.push(
              <td key={columnKey} 
                  className={`${(fieldCssClasses && fieldCssClasses[`Joint-${field.name}`]) || 'historical-text-cell'} user-data-cell joint-data-cell`}
                  style={{ 
                    padding: compactView ? '4px 6px' : '8px 10px',
                    borderBottom: '1px solid #e5e7eb',
                    whiteSpace: compactView ? 'nowrap' : 'normal',
                    overflow: compactView ? 'hidden' : 'visible',
                    textOverflow: compactView ? 'ellipsis' : 'clip',
                    width: (columnWidths && columnWidths[columnKey]) || 'auto',
                    minWidth: '80px'
                  }}>
                {renderUserTableCell(entry, 'Joint', field.name, rowKey)}
              </td>
            );
          });
        }
        
        return cells;
      })()}
      {/* Only show combined-section cells for enabled fields */}
      {schema.sections.filter(s => s.name !== 'users' && s.name !== 'basic').map(section =>
        section.fields.filter(f => f.name !== 'year' && combinedSectionFilters[f.name]).map(field => (
          <td key={field.name} 
              className={`${(fieldCssClasses && fieldCssClasses[field.name]) || (field.format === 'currency' ? 'data-currency-cell' : field.className === 'percentage' ? 'data-percentage-cell' : 'data-text-cell')} combined-data-cell`}
              style={{ 
                padding: compactView ? '4px 6px' : '8px 10px',
                borderBottom: '1px solid #e5e7eb',
                whiteSpace: compactView ? 'nowrap' : 'normal',
                overflow: compactView ? 'hidden' : 'visible',
                textOverflow: compactView ? 'ellipsis' : 'clip'
              }}>
            {renderTableCell(entry, field.name, rowKey)}
          </td>
        ))
      )}
      {(allowEdit || allowDelete) && (
        <td className="data-actions-cell actions-cell"
            style={{ 
              padding: compactView ? '4px 6px' : '8px 10px',
              borderBottom: '1px solid #e5e7eb',
              position: 'sticky',
              right: 0,
              backgroundColor: 'inherit',
              zIndex: 1
            }}>
          <div className="data-action-buttons">
            {allowDelete && (
              <button
                onClick={() => deleteEntry(rowKey)}
                className="data-btn-icon delete"
                title="Delete entry"
                style={{
                  fontSize: compactView ? '0.7rem' : '0.8rem',
                  padding: compactView ? '2px 4px' : '4px 6px'
                }}
              >
                🗑️
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    prevProps.rowKey === nextProps.rowKey &&
    prevProps.isNew === nextProps.isNew &&
    prevProps.compactView === nextProps.compactView &&
    JSON.stringify(prevProps.entry) === JSON.stringify(nextProps.entry) &&
    JSON.stringify(prevProps.userFilters) === JSON.stringify(nextProps.userFilters) &&
    JSON.stringify(prevProps.combinedSectionFilters) === JSON.stringify(nextProps.combinedSectionFilters) &&
    JSON.stringify(prevProps.fieldCssClasses) === JSON.stringify(nextProps.fieldCssClasses) &&
    prevProps.editingCell?.rowKey !== prevProps.rowKey && nextProps.editingCell?.rowKey !== nextProps.rowKey
  );
});

const DataManager = ({
  title,
  subtitle,
  dataKey,
  getData,
  setData,
  schema,
  userNames: initialUserNames = [],
  usePaycheckUsers = false, // New prop to enable paycheck user filtering
  primaryKey = 'entryId',
  sortField = 'year',
  sortOrder = 'desc',
  csvHeaders,
  allowAdd = true,
  allowEdit = true,
  allowDelete = true,
  fieldCssClasses = {},
  beforeCSVImport,
  customFormatCSVRow,
  customParseCSVRow
}) => {
  // Initialize all state variables first
  const [entryData, setEntryData] = useState({});
  const [paycheckData, setPaycheckDataState] = useState(null);
  const [userNames, setUserNames] = useState(initialUserNames);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [formData, setFormData] = useState({});
  const [currentSortField, setCurrentSortField] = useState(sortField);
  const [currentSortOrder, setCurrentSortOrder] = useState(sortOrder);
  const [userFilters, setUserFilters] = useState({});
  const [yearFilters, setYearFilters] = useState({});
  const [combinedSectionFilters, setCombinedSectionFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editingCellValue, setEditingCellValue] = useState('');
  const [newlyAddedKey, setNewlyAddedKey] = useState(null);
  // Remove forceReloadTrigger state completely

  // Initialize refs
  const lastUserNamesRef = useRef('');
  const hasLoadedInitialData = useRef(false);
  const lastPaycheckDataRef = useRef(null);

  // Load initial data on component mount
  useEffect(() => {
    const initialData = getData();
    setEntryData(initialData);
  }, [getData, title]);

  // Add account type filtering state
  const [accountTypeFilters, setAccountTypeFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [compactView, setCompactView] = useState(false);
  const [columnWidths, setColumnWidths] = useState({});
  const [resizing, setResizing] = useState(null);

  // Load paycheck data if usePaycheckUsers is enabled
  useEffect(() => {
    if (usePaycheckUsers) {
      const data = getPaycheckData();
      setPaycheckDataState(data);
      lastPaycheckDataRef.current = data;
    }
  }, [usePaycheckUsers]);

  // Listen for data update events
  useEffect(() => {
    const handlePaycheckDataUpdated = (event) => {
      if (!usePaycheckUsers) return;
      
      const newPaycheckData = event.detail || getPaycheckData();
      
      // Check for name changes and migrate data
      if (lastPaycheckDataRef.current && Object.keys(entryData).length > 0) {
        let hasNameChanges = false;
        let migratedData = { ...entryData };
        
        // Check your name change
        const oldYourName = lastPaycheckDataRef.current.your?.name;
        const newYourName = newPaycheckData.your?.name;
        if (oldYourName && newYourName && oldYourName !== newYourName) {
          updateNameMapping(oldYourName, newYourName);
          migratedData = migrateDataForNameChange(migratedData, oldYourName, newYourName);
          hasNameChanges = true;
        }
        
        // Check spouse name change
        const oldSpouseName = lastPaycheckDataRef.current.spouse?.name;
        const newSpouseName = newPaycheckData.spouse?.name;
        if (oldSpouseName && newSpouseName && oldSpouseName !== newSpouseName) {
          updateNameMapping(oldSpouseName, newSpouseName);
          migratedData = migrateDataForNameChange(migratedData, oldSpouseName, newSpouseName);
          hasNameChanges = true;
        }
        
        if (hasNameChanges) {
          setData(migratedData);
          setEntryData(migratedData); // Also update local state immediately
        }
      }
      
      // Update the paycheck data reference
      setPaycheckDataState(newPaycheckData);
      lastPaycheckDataRef.current = newPaycheckData;
    };

    const handleDataUpdated = () => {
      // Reload data when the component's specific data is updated
      const freshData = getData();
      setEntryData(freshData);
    };

    // Register the event listeners
    window.addEventListener('paycheckDataUpdated', handlePaycheckDataUpdated);
    
    // Listen for this component's specific data updates
    if (dataKey === 'historicalData') {
      window.addEventListener('historicalDataUpdated', handleDataUpdated);
    } else if (dataKey === 'performanceData') {
      window.addEventListener('performanceDataUpdated', handleDataUpdated);
    }
    
    return () => {
      window.removeEventListener('paycheckDataUpdated', handlePaycheckDataUpdated);
      if (dataKey === 'historicalData') {
        window.removeEventListener('historicalDataUpdated', handleDataUpdated);
      } else if (dataKey === 'performanceData') {
        window.removeEventListener('performanceDataUpdated', handleDataUpdated);
      }
    };
  }, [usePaycheckUsers, entryData, setData, dataKey, getData, title]);

  // Update user names based on paycheck data when usePaycheckUsers is enabled
  useEffect(() => {
    if (usePaycheckUsers && paycheckData) {
      const names = [];
      if (paycheckData.your?.name?.trim()) {
        names.push(paycheckData.your.name.trim());
      }
      // Only add spouse if dual calculator is enabled AND spouse name exists
      if ((paycheckData.settings?.showSpouseCalculator ?? true) && paycheckData.spouse?.name?.trim()) {
        names.push(paycheckData.spouse.name.trim());
      }
      
      // Only update if names actually changed
      const newNamesString = names.join(',');
      const currentNamesString = userNames.join(',');
      
      if (newNamesString !== currentNamesString) {
        if (names.length > 0) {
          setUserNames(names);
        } else {
          // Fallback to default if no names are available
          setUserNames(['User1']);
        }
      }
    } else if (!usePaycheckUsers) {
      // Only update if different from initialUserNames
      const currentNamesString = userNames.join(',');
      const initialNamesString = initialUserNames.join(',');
      
      if (currentNamesString !== initialNamesString) {
        setUserNames(initialUserNames);
      }
    }
  }, [usePaycheckUsers, paycheckData, initialUserNames]); // Remove userNames from dependencies

  // Initialize combined-section filters when schema changes
  useEffect(() => {
    // Get all combined-section fields (sections that are not 'users' or 'basic')
    const combinedSections = schema.sections.filter(
      s => s.name !== 'users' && s.name !== 'basic'
    );
    const initialFilters = {};
    combinedSections.forEach(section => {
      section.fields.forEach(field => {
        initialFilters[field.name] = true;
      });
    });
    setCombinedSectionFilters(initialFilters);
  }, [schema.sections]);

  // Toggle combined-section filter
  const toggleCombinedSectionFilter = (fieldName) => {
    setCombinedSectionFilters(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  // Select/deselect all combined-section fields
  const selectAllCombinedSectionFields = () => {
    const newFilters = { ...combinedSectionFilters };
    Object.keys(newFilters).forEach(key => { newFilters[key] = true; });
    setCombinedSectionFilters(newFilters);
  };
  const deselectAllCombinedSectionFields = () => {
    const newFilters = { ...combinedSectionFilters };
    Object.keys(newFilters).forEach(key => { newFilters[key] = false; });
    setCombinedSectionFilters(newFilters);
  };

  // Generate unique ID for entries
  const generateEntryId = () => {
    const prefix = title.toLowerCase().includes('performance') ? 'entry' : 'hist';
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Generic empty form data structure - built from schema
  const generateEmptyFormData = useCallback(() => {
    const currentYear = new Date().getFullYear();
    const baseData = {
      [primaryKey]: primaryKey === 'entryId' ? generateEntryId() : '',
      year: currentYear
    };

    // Add user fields if userNames provided
    if (userNames.length > 0) {
      // For accounts that can be owned by both users, we need special handling
      const userSection = schema.sections.find(s => s.name === 'users');
      if (userSection && userSection.fields.some(f => ['accountName', 'accountType'].includes(f.name))) {
        // This is likely a performance/account schema - use "Joint" option
        baseData.users = {
          'Joint': {}
        };
      } else {
        // Regular user-specific data
        baseData.users = userNames.reduce((acc, name) => ({
          ...acc,
          [name]: {}
        }), {});
      }
    }

    // Add fields from schema
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.name !== 'year' && field.name !== primaryKey) {
          if (section.name === 'users' && userNames.length > 0) {
            if (baseData.users['Joint']) {
              baseData.users['Joint'][field.name] = '';
            } else {
              userNames.forEach(userName => {
                if (!baseData.users[userName]) baseData.users[userName] = {};
                baseData.users[userName][field.name] = '';
              });
            }
          } else {
            baseData[field.name] = '';
          }
        }
      });
    });

    return baseData;
  }, [primaryKey, userNames, schema.sections, title]);

  // Enhanced CSV upload guard that handles paycheck validation
  const handleEnhancedBeforeCSVImport = () => {
    if (usePaycheckUsers && paycheckData) {
      const yourName = paycheckData?.your?.name?.trim();
      const dualMode = paycheckData?.settings?.showSpouseCalculator ?? true;
      const spouseName = paycheckData?.spouse?.name?.trim();

      if (!yourName) {
        alert(
          "Please fill out the Name field for 'Your' in the Paycheck Calculator before importing a CSV.\n\n" +
          "Go to the Paycheck Calculator and enter a name for yourself. This ensures your data is mapped correctly."
        );
        return false;
      }
      if (dualMode && !spouseName) {
        alert(
          "Please fill out the Name field for 'Spouse' in the Paycheck Calculator before importing a CSV.\n\n" +
          "Go to the Paycheck Calculator and enter a name for your spouse. This ensures your data is mapped correctly."
        );
        return false;
      }
    }
    
    // Call custom beforeCSVImport if provided
    if (typeof beforeCSVImport === 'function') {
      return beforeCSVImport();
    }
    
    return true;
  };

  // Enhanced CSV headers generation
  const getEffectiveCSVHeaders = (forceIncludeJoint = false) => {
    if (usePaycheckUsers && userNames.length > 0) {
      const headers = ['year'];
      const userSection = schema.sections.find(s => s.name === 'users');
      if (userSection) {
        // Determine if this schema supports joint accounts
        const supportsJoint = userSection.fields.some(f => ['accountName', 'accountType'].includes(f.name));
        // Always include all userNames and Joint (if supported) for both export and template
        let ownerOptions = [...userNames];
        if (supportsJoint) ownerOptions.push('Joint');
        ownerOptions.forEach(ownerName => {
          userSection.fields.forEach(field => {
            headers.push(`${ownerName}-${field.name}`);
          });
        });
      }
      // Add other fields (excluding year and users)
      schema.sections.forEach(section => {
        if (section.name !== 'users') {
          section.fields.forEach(field => {
            if (field.name !== 'year') {
              headers.push(field.name);
            }
          });
        }
      });
      return headers;
    }
    return csvHeaders || [];
  };

  // Enhanced field CSS classes generation - memoized for performance
  const getEffectiveFieldCssClasses = React.useMemo(() => {
    if (usePaycheckUsers && userNames.length > 0) {
      const classes = { ...fieldCssClasses };
      
      // Check if we have any "Joint" data
      const hasJointData = Object.values(entryData).some(entry => 
        entry.users && entry.users['Joint']
      );
      
      // Add user-specific field classes using actual user names plus "Joint" if needed
      const accountOwnerOptions = hasJointData 
        ? [...userNames, 'Joint']
        : userNames;
        
      accountOwnerOptions.forEach(ownerName => {
        const userSection = schema.sections.find(s => s.name === 'users');
        if (userSection) {
          userSection.fields.forEach(field => {
            classes[`${ownerName}-${field.name}`] = 'data-text-cell user-data-cell';
          });
        }
      });
      
      return classes;
    }
    
    return fieldCssClasses;
  }, [usePaycheckUsers, userNames, entryData, fieldCssClasses, schema.sections]);

  // Convert stored entry to form data - generic version
  const getFormDataFromEntry = (entry) => {
    const formData = {
      [primaryKey]: entry[primaryKey] || (primaryKey === 'entryId' ? generateEntryId() : ''),
      year: entry.year || ''
    };

    // Handle user fields - including "Joint" option
    if (userNames.length > 0) {
      // Check if this entry has "Joint" data
      if (entry.users && entry.users['Joint']) {
        formData.users = { 'Joint': entry.users['Joint'] };
      } else {
        formData.users = userNames.reduce((acc, name) => ({
          ...acc,
          [name]: entry.users?.[name] || {}
        }), {});
      }
    }

    // Handle other schema fields
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.name !== 'year' && field.name !== primaryKey) {
          if (section.name === 'users') {
            // Already handled above
          } else {
            formData[field.name] = entry[field.name] || '';
          }
        }
      });
    });

    return formData;
  };

  // Convert form data to stored entry - generic version
  const getEntryFromFormData = (formData) => {
    const entry = {
      [primaryKey]: formData[primaryKey],
      year: formData.year
    };

    // Handle user fields
    if (userNames.length > 0 && formData.users) {
      entry.users = formData.users;
    }

    // Handle other schema fields
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.name !== 'year' && field.name !== primaryKey && section.name !== 'users') {
          entry[field.name] = formData[field.name];
        }
      });
    });

    return entry;
  };

  // Generic CSV parsing with safe type conversion
  const parseCSVRow = (row) => {
    if (customParseCSVRow) {
      return customParseCSVRow(row, generateEntryId, userNames);
    }

    if (!row || typeof row !== 'object') {
      return null;
    }
    
    const safeParseFloat = (value) => {
      if (value === null || value === undefined || value === '') return '';
      const parsed = parseFloat(value);
      return isNaN(parsed) ? '' : parsed;
    };
    
    const safeGetString = (value) => {
      if (value === null || value === undefined) return '';
      return String(value).trim();
    };
    
    const safeParseInt = (value) => {
      if (value === null || value === undefined || value === '') return '';
      const parsed = parseInt(value);
      return isNaN(parsed) ? '' : parsed;
    };
    
    // Helper function to check if user data is empty/meaningless
    const isUserDataEmpty = (userData) => {
      if (!userData || typeof userData !== 'object') return true;
      
      // Check if all values are empty, null, undefined, or zero
      return Object.values(userData).every(value => {
        if (value === null || value === undefined || value === '') return true;
        if (typeof value === 'number' && value === 0) return true;
        if (typeof value === 'string' && value.trim() === '') return true;
        return false;
      });
    };
    
    try {
      const entry = {
        [primaryKey]: generateEntryId(),
        year: safeParseInt(row['year'] || row['Year'])
      };

      // Handle user fields - always parse all user columns (including Joint if schema supports it)
      const userSection = schema.sections.find(s => s.name === 'users');
      if (usePaycheckUsers && userSection && userNames.length > 0) {
        const supportsJoint = userSection.fields.some(f => ['accountName', 'accountType'].includes(f.name));
        let ownerOptions = [...userNames];
        if (supportsJoint) ownerOptions.push('Joint');
        entry.users = {};
        ownerOptions.forEach(ownerName => {
          const userData = {};
          userSection.fields.forEach(field => {
            // Accept both dash and underscore for compatibility
            const dashKey = `${ownerName}-${field.name}`;
            const underscoreKey = `${ownerName}_${field.name}`;
            const value = row[dashKey] ?? row[underscoreKey] ?? '';
            if (field.format === 'currency' || field.type === 'number') {
              userData[field.name] = safeParseFloat(value);
            } else {
              userData[field.name] = safeGetString(value);
            }
          });
          
          // Only add user data if it's not empty
          if (!isUserDataEmpty(userData)) {
            entry.users[ownerName] = userData;
          }
        });
      }

      // Handle other schema fields
      schema.sections.forEach(section => {
        if (section.name !== 'users') {
          section.fields.forEach(field => {
            if (field.name !== 'year') {
              const value = row[field.name] || row[field.label];
              if (field.format === 'currency' || field.type === 'number') {
                entry[field.name] = safeParseFloat(value);
              } else {
                entry[field.name] = safeGetString(value);
              }
            }
          });
        }
      });

      return entry;
    } catch (error) {
      return null;
    }
  };

  // Generic CSV formatting
  const formatCSVRow = (entry) => {
    // Always output all user columns (including Joint if schema supports it)
    const row = [entry.year || ''];
    const userSection = schema.sections.find(s => s.name === 'users');
    if (usePaycheckUsers && userSection && userNames.length > 0) {
      const supportsJoint = userSection.fields.some(f => ['accountName', 'accountType'].includes(f.name));
      let ownerOptions = [...userNames];
      if (supportsJoint) ownerOptions.push('Joint');
      ownerOptions.forEach(ownerName => {
        userSection.fields.forEach(field => {
          row.push(entry.users?.[ownerName]?.[field.name] ?? '');
        });
      });
    }
    // Add other fields (excluding year and users)
    schema.sections.forEach(section => {
      if (section.name !== 'users') {
        section.fields.forEach(field => {
          if (field.name !== 'year') {
            row.push(entry[field.name] || '');
          }
        });
      }
    });
    return row;
  };

  // Load data from localStorage - Enhanced for consistency
  useEffect(() => {
    const currentUserNamesString = userNames.join(',');
    
    // Only load data if:
    // 1. We haven't loaded initial data yet, OR
    // 2. The user names have actually changed
    if (!hasLoadedInitialData.current || currentUserNamesString !== lastUserNamesRef.current) {
      const loadData = () => {
        try {
          const savedData = getData();

          // Helper function to check if user data is empty/meaningless
          const isUserDataEmpty = (userData) => {
            if (!userData || typeof userData !== 'object') return true;
            
            // Check if all values are empty, null, undefined, or zero
            return Object.values(userData).every(value => {
              if (value === null || value === undefined || value === '') return true;
              if (typeof value === 'number' && value === 0) return true;
              if (typeof value === 'string' && value.trim() === '') return true;
              return false;
            });
          };

          let processedData = savedData;
          
          // Always apply name mapping if we're in usePaycheckUsers mode and have data
          if (usePaycheckUsers && Object.keys(savedData).length > 0) {
            processedData = {};
            
            Object.entries(savedData).forEach(([key, entry]) => {
              if (entry.users && typeof entry.users === 'object') {
                const mappedUsers = {};
                
                Object.entries(entry.users).forEach(([userName, userData]) => {
                  // Apply name mapping
                  const mappedName = getCurrentUserName(userName);
                  
                  // Only add user data if it's not empty
                  if (!isUserDataEmpty(userData)) {
                    // Ensure we preserve the full name including spaces
                    mappedUsers[mappedName] = {
                      ...userData,
                      // Update the name field in the user data if it exists
                      ...(userData.name !== undefined && { name: mappedName })
                    };
                  }
                });
                
                processedData[key] = { ...entry, users: mappedUsers };
              } else {
                // Keep non-user data as-is
                processedData[key] = entry;
              }
            });
          }

          setEntryData(processedData);
          hasLoadedInitialData.current = true;
          lastUserNamesRef.current = currentUserNamesString;
        } catch (error) {
          setEntryData({});
        }
      };

      loadData();
    }
  }, [usePaycheckUsers, userNames, getData, setData, dataKey]);

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
      setFormData({});
      setShowAddEntry(false);
      setEditingKey(null);
      // Reset tracking refs
      hasLoadedInitialData.current = false;
      lastUserNamesRef.current = '';
    };

    const handleExpandAll = () => {
      window.dispatchEvent(new CustomEvent('expandAllSections'));
    };

    const handleCollapseAll = () => {
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
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUserFieldChange = (userName, field, value) => {
    if (field === 'name') {
      // Handle name changes with data migration
      const oldName = userName;
      const newName = value.trim();
      
      if (oldName !== newName && newName) {
        // Update name mapping and migrate data
        const { updateNameMapping } = require('../utils/localStorage');
        updateNameMapping(oldName, newName);
        
        // Update the current form data to reflect the new name
        setFormData(prev => {
          const newFormData = { ...prev };
          
          // Update the user field with the new name
          Object.keys(newFormData).forEach(key => {
            if (newFormData[key] && typeof newFormData[key] === 'object' && newFormData[key][oldName]) {
              newFormData[key][newName] = { ...newFormData[key][oldName], name: newName };
              delete newFormData[key][oldName];
            }
          });
          
          return newFormData;
        });
        
        // Force a refresh of entry data to show updated names
        setTimeout(() => {
          const updatedData = getData();
          setEntryData(updatedData);
        }, 100);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [userName]: {
        ...prev[userName],
        [field]: value
      }
    }));
  };

  // Helper to start editing a cell
  const startEditCell = (rowKey, section, field, userName) => {
    if (!allowEdit) return;
    let value;
    if (section === 'users' && userName) {
      value = entryData[rowKey]?.users?.[userName]?.[field] ?? '';
    } else {
      value = entryData[rowKey]?.[field] ?? '';
    }
    setEditingCell({ rowKey, section, field, userName });
    setEditingCellValue(value);
  };

  // Helper to save cell edit
  const saveEditCell = () => {
    if (!editingCell) return;
    const { rowKey, section, field, userName } = editingCell;
    setEntryData(prev => {
      const updated = { ...prev };
      if (!updated[rowKey]) return prev;
      if (section === 'users' && userName) {
        updated[rowKey] = {
          ...updated[rowKey],
          users: {
            ...updated[rowKey].users,
            [userName]: {
              ...updated[rowKey].users?.[userName],
              [field]: editingCellValue
            }
          }
        };
      } else {
        updated[rowKey] = {
          ...updated[rowKey],
          [field]: editingCellValue
        };
      }
      return updated;
    });
    setEditingCell(null);
    setEditingCellValue('');
  };

  // Cancel cell edit
  const cancelEditCell = () => {
    setEditingCell(null);
    setEditingCellValue('');
  };

  // Handle Enter/Escape in cell input
  const handleCellInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveEditCell();
    } else if (e.key === 'Escape') {
      cancelEditCell();
    }
  };

  const addEntry = () => {
    if (!allowAdd) return;
    // Always generate a new unique key
    const newEntry = generateEmptyFormData();
    const key = newEntry[primaryKey] || `${primaryKey}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let uniqueKey = key;
    setEntryData(prev => {
      // If key already exists, generate a new one
      while (prev[uniqueKey]) {
        uniqueKey = `${primaryKey}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        newEntry[primaryKey] = uniqueKey;
      }
      return { [uniqueKey]: newEntry, ...prev };
    });

    setNewlyAddedKey(uniqueKey);

    // Start editing the primary key cell of the new entry
    setTimeout(() => {
      startEditCell(uniqueKey, 'combined', primaryKey);
    }, 100);
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

  // Add reset functionality
  const resetAllData = () => {
    if (window.confirm('Are you sure you want to reset all data in this section? This cannot be undone.')) {
      try {
        // Clear the data using the setData function
        setData({});
        
        // Reset local state
        setEntryData({});
        setShowAddEntry(false);
        setEditingKey(null);
        setFormData({});
        
        // Dispatch update event
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent(`${dataKey}Updated`, { detail: {} }));
        }, 50);
        
        alert('Data has been reset successfully.');
      } catch (error) {
        alert('Failed to reset data. Please try again.');
      }
    }
  };

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
    const sortedEntries = Object.values(entryData).sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    const csvContent = generateCSVContent(sortedEntries, getEffectiveCSVHeaders(), formatCSVRow);
  
    // Determine data type from title
    const dataType = title.toLowerCase().includes('historical') ? 'historical' : 
                    title.toLowerCase().includes('performance') ? 'performance' : 'data';
    
    // Get user names for filename
    const filenameUserNames = usePaycheckUsers && userNames.length > 0 ? userNames : [];
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = generateDataFilename(dataType, filenameUserNames, 'csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    // Always include Joint columns in template if schema supports it
    const templateEntries = [generateEmptyFormData()];
    const csvContent = generateCSVContent(
      templateEntries,
      getEffectiveCSVHeaders(true), // forceIncludeJoint = true
      formatCSVRow
    );

    // Determine data type from title
    const dataType = title.toLowerCase().includes('historical') ? 'historical' : 
                    title.toLowerCase().includes('performance') ? 'performance' : 'data';
    
    // Get user names for filename
    const filenameUserNames = usePaycheckUsers && userNames.length > 0 ? userNames : [];
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = generateDataFilename(`${dataType}_template`, filenameUserNames, 'csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseCSV = (csvText) => {
    if (typeof handleEnhancedBeforeCSVImport === 'function') {
      const proceed = handleEnhancedBeforeCSVImport();
      if (!proceed) {
        return [];
      }
    }
    try {
      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true
      });
      return result.data.map(row => parseCSVRow(row)).filter(Boolean);
    } catch (error) {
      return [];
    }
  };

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

  // Function to trigger CSV import for empty state button
  const handleCSVImport = () => {
    const fileInput = document.getElementById('csv-upload-input');
    if (fileInput) {
      fileInput.click();
    }
  };

  const getSortableFields = () => {
    const fields = [{ key: primaryKey, label: schema.primaryKeyLabel }];
    
    schema.sections.forEach(section => {
      if (section.name !== 'users') {
        section.fields.forEach(field => {
          if (field.name !== primaryKey) {
            fields.push({ key: field.name, label: field.label });
          }
        });
      }
    });
    
    return fields;
  };

  // Initialize user filters when userNames change
  useEffect(() => {
    if (usePaycheckUsers && userNames.length > 0) {
      // Get all users that actually exist in the data, applying name mapping
      const allUsersInData = new Set();
      Object.values(entryData).forEach(entry => {
        if (entry.users && typeof entry.users === 'object') {
          Object.keys(entry.users).forEach(user => {
            // Apply name mapping to get current name
            const mappedName = getCurrentUserName(user);
            allUsersInData.add(mappedName);
          });
        }
      });

      const hasJointData = allUsersInData.has('Joint');
      
      // Initialize filters to show only users that are currently enabled in paycheck calculator
      const initialFilters = {};
      
      // Check if dual calculator mode is enabled
      const isDualMode = paycheckData?.settings?.showSpouseCalculator ?? true;
      
      // Always include the first user if they exist in data
      if (userNames[0] && allUsersInData.has(userNames[0])) {
        initialFilters[userNames[0]] = true;
      }
      
      // Only include spouse and Joint if dual mode is enabled
      if (isDualMode) {
        if (userNames[1] && allUsersInData.has(userNames[1])) {
          initialFilters[userNames[1]] = true;
        }
        
        if (hasJointData) {
          initialFilters['Joint'] = true;
        }
      }
      
      // Include any other users found in data that aren't in userNames (legacy data)
      allUsersInData.forEach(user => {
        if (!userNames.includes(user) && user !== 'Joint') {
          // Only show legacy users if they're not spouse-related or if dual mode is enabled
          initialFilters[user] = true;
        }
      });
      
      setUserFilters(initialFilters);
    }
  }, [usePaycheckUsers, userNames, entryData, paycheckData]);

  // Get all years present in the data
  const getAvailableYears = () => {
    const years = Object.values(entryData)
      .map(entry => entry.year)
      .filter(year => year !== undefined && year !== null)
      .map(year => Number(year))
      .filter(year => !isNaN(year));
    // Unique and sorted descending
    return Array.from(new Set(years)).sort((a, b) => b - a);
  };

  // Get all account types present in the data
  const getAvailableAccountTypes = () => {
    const accountTypes = new Set();
    Object.values(entryData).forEach(entry => {
      if (entry.users && typeof entry.users === 'object') {
        Object.values(entry.users).forEach(userData => {
          if (userData.accountType && userData.accountType.trim()) {
            accountTypes.add(userData.accountType.trim());
          }
        });
      }
    });
    return Array.from(accountTypes).sort();
  };

  // Check if schema has accountType field
  const hasAccountTypeField = () => {
    return schema?.sections?.some(section => 
      section.fields?.some(field => field.name === 'accountType')
    );
  };

  // Initialize year filters when data changes
  useEffect(() => {
    const years = getAvailableYears();
    if (years.length > 0) {
      const initial = {};
      years.forEach(y => { initial[y] = true; });
      setYearFilters(initial);
    }
  }, [entryData]);

  // Initialize account type filters when data changes
  useEffect(() => {
    if (hasAccountTypeField()) {
      const accountTypes = getAvailableAccountTypes();
      if (accountTypes.length > 0) {
        const initial = {};
        accountTypes.forEach(type => { initial[type] = true; });
        setAccountTypeFilters(initial);
      }
    }
  }, [entryData]);

  // Toggle year filter
  const toggleYearFilter = (year) => {
    setYearFilters(prev => ({
      ...prev,
      [year]: !prev[year]
    }));
  };

  // Toggle account type filter
  const toggleAccountTypeFilter = (accountType) => {
    setAccountTypeFilters(prev => ({
      ...prev,
      [accountType]: !prev[accountType]
    }));
  };

  // Select all years
  const selectAllYears = () => {
    const years = getAvailableYears();
    const newFilters = {};
    years.forEach(y => { newFilters[y] = true; });
    setYearFilters(newFilters);
  };

  // Deselect all years
  const deselectAllYears = () => {
    const years = getAvailableYears();
    const newFilters = {};
    years.forEach(y => { newFilters[y] = false; });
    setYearFilters(newFilters);
  };

  // Select all account types
  const selectAllAccountTypes = () => {
    const accountTypes = getAvailableAccountTypes();
    const newFilters = {};
    accountTypes.forEach(type => { newFilters[type] = true; });
    setAccountTypeFilters(newFilters);
  };

  // Deselect all account types
  const deselectAllAccountTypes = () => {
    const accountTypes = getAvailableAccountTypes();
    const newFilters = {};
    accountTypes.forEach(type => { newFilters[type] = false; });
    setAccountTypeFilters(newFilters);
  };

  // Filter entries based on active user filters, year filters, and account type filters - ENHANCED
  const getFilteredEntryData = () => {
    let filtered = entryData;
    
    // User filter - only apply if we have user filters and usePaycheckUsers is enabled
    if (usePaycheckUsers && Object.keys(userFilters).length > 0) {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([key, entry]) => {
          if (entry.users && typeof entry.users === 'object') {
            return Object.keys(entry.users).some(userName => userFilters[userName]);
          }
          return true;
        })
      );
    }

    // Year filter
    if (Object.keys(yearFilters).length > 0) {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([key, entry]) => {
          const year = entry.year;
          if (year !== undefined && year !== null) {
            return yearFilters[year];
          }
          return true;
        })
      );
    }

    // Account type filter - only apply if we have account type field and filters
    if (hasAccountTypeField() && Object.keys(accountTypeFilters).length > 0) {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([key, entry]) => {
          if (entry.users && typeof entry.users === 'object') {
            return Object.values(entry.users).some(userData => {
              const accountType = userData.accountType;
              if (accountType && accountType.trim()) {
                return accountTypeFilters[accountType.trim()];
              }
              return true;
            });
          }
          return true;
        })
      );
    }

    return filtered;
  };

  // Get available filter options - memoized for performance
  const getAvailableFilterOptions = React.useMemo(() => {
    const allUsersInData = new Set();
    
    // Collect all users that actually exist in the data, applying name mapping
    Object.values(entryData).forEach(entry => {
      if (entry.users && typeof entry.users === 'object') {
        Object.keys(entry.users).forEach(user => {
          // Apply name mapping to get current name
          const mappedName = getCurrentUserName(user);
          allUsersInData.add(mappedName);
        });
      }
    });
    
    // Create options array based on current paycheck calculator settings
    const options = [];
    
    // Check if dual calculator mode is enabled
    const isDualMode = paycheckData?.settings?.showSpouseCalculator ?? true;
    
    // Always add first user if they exist in the data
    if (userNames[0] && allUsersInData.has(userNames[0])) {
      options.push(userNames[0]);
    }
    
    // Only add spouse-related options if dual mode is enabled
    if (isDualMode) {
      // Add second user (spouse) if they exist in the data
      if (userNames[1] && allUsersInData.has(userNames[1])) {
        options.push(userNames[1]);
      }
      
      // Add Joint if it exists in any entry
      if (allUsersInData.has('Joint')) {
        options.push('Joint');
      }
    }
    
    // Add any other users found in data that aren't already included (legacy data)
    allUsersInData.forEach(user => {
      if (!options.includes(user)) {
        options.push(user);
      }
    });
    
    return options;
  }, [entryData, userNames, paycheckData?.settings?.showSpouseCalculator]);

  // Toggle user filter
  const toggleUserFilter = (userName) => {
    setUserFilters(prev => ({
      ...prev,
      [userName]: !prev[userName]
    }));
  };

  // Select all users
  const selectAllUsers = () => {
    const newFilters = {};
    getAvailableFilterOptions.forEach(option => {
      newFilters[option] = true;
    });
    setUserFilters(newFilters);
  };

  // Deselect all users
  const deselectAllUsers = () => {
    const newFilters = {};
    Object.keys(userFilters).forEach(key => {
      newFilters[key] = false;
    });
    setUserFilters(newFilters);
  };

  // Use filtered data for sorting
  const filteredEntryData = getFilteredEntryData();
  // Always put the newly added key at the top if it exists
  const sortedKeys = React.useMemo(() => {
    const keys = Object.keys(filteredEntryData);
    if (newlyAddedKey && keys.includes(newlyAddedKey)) {
      return [newlyAddedKey, ...keys.filter(k => k !== newlyAddedKey)];
    }
    // Default sort
    return keys.sort((a, b) => {
      const aEntry = filteredEntryData[a];
      const bEntry = filteredEntryData[b];
      let aVal = aEntry[currentSortField];
      let bVal = bEntry[currentSortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
        if (currentSortOrder === 'asc') return aVal.localeCompare(bVal);
        return bVal.localeCompare(aVal);
      }
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        if (currentSortOrder === 'asc') return aNum - bNum;
        return bNum - aNum;
      }
      if (currentSortOrder === 'asc') return String(aVal).localeCompare(String(bVal));
      return String(bVal).localeCompare(String(aVal));
    });
  }, [filteredEntryData, currentSortField, currentSortOrder, newlyAddedKey]);

  // Pagination logic
  const totalItems = sortedKeys.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedKeys = sortedKeys.slice(startIndex, endIndex);

  // Reset to page 1 only when filters change (not when data changes)
  React.useEffect(() => {
    setCurrentPage(1);
  }, [userFilters, yearFilters, accountTypeFilters, combinedSectionFilters]);

  // Pagination controls
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  // Column resizing functionality
  const handleMouseDown = useCallback((columnKey, e) => {
    e.preventDefault();
    const startWidth = (columnWidths && columnWidths[columnKey]) || 150;
    const startX = e.clientX;
    
    setResizing({ columnKey, startX, startWidth });

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(80, startWidth + deltaX); // Min width of 80px
      setColumnWidths(prev => ({
        ...prev,
        [columnKey]: newWidth
      }));
    };

    const handleMouseUp = () => {
      setResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths]);


  // When editing is finished, remove highlight after a short delay
  useEffect(() => {
    if (editingCell === null && newlyAddedKey) {
      const timeout = setTimeout(() => setNewlyAddedKey(null), 1800);
      return () => clearTimeout(timeout);
    }
  }, [editingCell, newlyAddedKey]);

  const renderFormField = (field, section = null) => {
    const fieldConfig = schema.sections.find(s => s.fields.some(f => f.name === field))?.fields.find(f => f.name === field) ||
                      schema.sections.find(s => s.name === section)?.fields.find(f => f.name === field);
    
    if (!fieldConfig) return null;

    return (
      <div key={field} className="data-field-group">
        <label className="data-field-label">
          {fieldConfig.label}:
        </label>
        <input
          type={fieldConfig.type || 'text'}
          value={formData[field] || ''}
          onChange={(e) => handleInputChange(field, e.target.value)}
          className={`data-field-input ${fieldConfig.className || ''}`}
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
      <div key={field} className="data-field-group">
        <label className="data-field-label">
          {fieldConfig.label}:
        </label>
        <input
          type={fieldConfig.type || 'text'}
          value={formData.users?.[userName]?.[field] || ''}
          onChange={(e) => handleUserFieldChange(userName, field, e.target.value)}
          className={`data-field-input ${fieldConfig.className || ''}`}
          placeholder={fieldConfig.placeholder || `Enter ${fieldConfig.label.toLowerCase()}`}
        />
      </div>
    );
  };

  const renderTableCell = (entry, field, rowKey) => {
    const fieldConfig = schema.sections.flatMap(s => s.fields).find(f => f.name === field);
    const value = entry[field];

    if (
      allowEdit &&
      editingCell &&
      editingCell.rowKey === rowKey &&
      editingCell.section === 'combined' &&
      editingCell.field === field
    ) {
      return (
        <input
          type={fieldConfig?.type || 'text'}
          value={editingCellValue}
          autoFocus
          onChange={e => setEditingCellValue(e.target.value)}
          onBlur={saveEditCell}
          onKeyDown={handleCellInputKeyDown}
          className="data-table-inline-input"
        />
      );
    }

    let displayValue;
    if (!fieldConfig) displayValue = value || '';
    else if (fieldConfig.format === 'currency') {
      displayValue = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value || 0);
    } else if (fieldConfig.className === 'percentage' || field === 'effectiveTaxRate') {
      const percentValue = (value || 0) * 100;
      displayValue = `${percentValue.toFixed(1)}%`;
    } else {
      displayValue = value || '';
    }

    return (
      <span
        onClick={() => startEditCell(rowKey, 'combined', field)}
        style={allowEdit ? { cursor: 'pointer' } : undefined}
        title={allowEdit ? 'Click to edit' : undefined}
      >
        {displayValue}
      </span>
    );
  };

  // Spreadsheet-like cell rendering for user fields
  const renderUserTableCell = (entry, userName, field, rowKey) => {
    const userSection = schema.sections.find(s => s.name === 'users');
    const fieldConfig = userSection?.fields.find(f => f.name === field);
    // Fix: Only access entry.users[userName] if it exists
    const value = entry.users && entry.users[userName] ? entry.users[userName][field] : undefined;

    // Spreadsheet-like: if this cell is being edited, show input
    if (
      allowEdit &&
      editingCell &&
      editingCell.rowKey === rowKey &&
      editingCell.section === 'users' &&
      editingCell.field === field &&
      editingCell.userName === userName
    ) {
      return (
        <input
          type={fieldConfig?.type || 'text'}
          value={editingCellValue}
          autoFocus
          onChange={e => setEditingCellValue(e.target.value)}
          onBlur={saveEditCell}
          onKeyDown={handleCellInputKeyDown}
          className="data-table-inline-input"
        />
      );
    }

    // Otherwise, show value and make cell clickable
    let displayValue;
    if (!fieldConfig) displayValue = value || '-';
    else if (fieldConfig.format === 'currency') displayValue = formatCurrency(value || 0);
    else if (fieldConfig.format === 'percentage') displayValue = `${((value || 0) * 100).toFixed(2)}%`;
    else displayValue = value || '-';

    return (
      <span
        onClick={() => startEditCell(rowKey, 'users', field, userName)}
        style={allowEdit ? { cursor: 'pointer' } : undefined}
        title={allowEdit ? 'Click to edit' : undefined}
      >
        {displayValue}
      </span>
    );
  };

  // Helper to render the import/export section
  const renderImportExportSection = () => (
    <div
      className={
        "import-export-section" +
        (Object.keys(entryData).length > 0 ? " compact" : "")
      }
    >
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
        <button
          onClick={resetAllData}
          className="import-export-btn danger"
          style={{
            backgroundColor: '#dc2626',
            borderColor: '#dc2626',
            color: 'white'
          }}
        >
          🗑️ Reset Data
        </button>
      </div>
    </div>
  );

  // Update filter controls rendering
  const renderFilterControls = () => {
    const years = getAvailableYears();
    const accountTypes = getAvailableAccountTypes();
    const showAccountTypeFilter = hasAccountTypeField() && accountTypes.length > 0;
    
    if (years.length === 0 && !showAccountTypeFilter && (!usePaycheckUsers || Object.keys(userFilters).length === 0)) {
      return null;
    }

    return (
      <div className="filter-controls">
        {/* Year filters */}
        {years.length > 0 && (
          <div className="filter-group">
            <div className="filter-group-header">
              <h4>📅 Filter by Year</h4>
              <div className="filter-group-actions">
                <button onClick={selectAllYears} className="filter-action-btn">Select All</button>
                <button onClick={deselectAllYears} className="filter-action-btn">Deselect All</button>
              </div>
            </div>
            <div className="filter-chips">
              {years.map(year => (
                <label key={year} className="filter-chip">
                  <input
                    type="checkbox"
                    checked={yearFilters[year] || false}
                    onChange={() => toggleYearFilter(year)}
                  />
                  <span className="filter-chip-label">{year}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Account type filters */}
        {showAccountTypeFilter && (
          <div className="filter-group">
            <div className="filter-group-header">
              <h4>🏦 Filter by Account Type</h4>
              <div className="filter-group-actions">
                <button onClick={selectAllAccountTypes} className="filter-action-btn">Select All</button>
                <button onClick={deselectAllAccountTypes} className="filter-action-btn">Deselect All</button>
              </div>
            </div>
            <div className="filter-chips">
              {accountTypes.map(accountType => (
                <label key={accountType} className="filter-chip">
                  <input
                    type="checkbox"
                    checked={accountTypeFilters[accountType] || false}
                    onChange={() => toggleAccountTypeFilter(accountType)}
                  />
                  <span className="filter-chip-label">{accountType}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* User filters - existing code */}
        {usePaycheckUsers && Object.keys(userFilters).length > 0 && (
          <div className="filter-group">
            <div className="filter-group-header">
              <h4>👥 Filter by User</h4>
              <div className="filter-group-actions">
                <button onClick={selectAllUsers} className="filter-action-btn">Select All</button>
                <button onClick={deselectAllUsers} className="filter-action-btn">Deselect All</button>
              </div>
            </div>
            <div className="filter-chips">
              {Object.keys(userFilters).map(userName => (
                <label key={userName} className="filter-chip">
                  <input
                    type="checkbox"
                    checked={userFilters[userName]}
                    onChange={() => toggleUserFilter(userName)}
                  />
                  <span className="filter-chip-label">{userName}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Render import/export section at the top only if there is no data */}
      {Object.keys(entryData).length === 0 && (
        <div style={{ marginBottom: '32px' }}>
          {renderImportExportSection()}
        </div>
      )}

      {/* User & Year & Combined-section Filter Section */}
      {usePaycheckUsers && userNames.length > 0 && Object.keys(entryData).length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <button
              className="filter-toggle-btn"
              onClick={() => setShowFilters(v => !v)}
              style={{
                fontSize: '0.9rem',
                padding: '4px 12px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#0891b2',
                cursor: 'pointer'
              }}
              aria-expanded={showFilters}
              aria-controls="filter-section-compact"
            >
              {showFilters ? 'Hide Filters ▲' : 'Show Filters ▼'}
            </button>
            <span className="filter-section-summary">
              Showing {Object.keys(getFilteredEntryData()).length} of {Object.keys(entryData).length} entries
            </span>
          </div>
          {showFilters && (
            <div className="filter-section-compact" id="filter-section-compact">
              {/* Account Owner Filter */}
              <div className="user-filter-section compact filter-fixed-width">
                <div className="user-filter-header">
                  <h3 className="user-filter-title">
                    👥 Filter by Account Owner
                  </h3>
                  <div className="user-filter-actions">
                    <button onClick={selectAllUsers} className="user-filter-btn">
                      Select All
                    </button>
                    <button onClick={deselectAllUsers} className="user-filter-btn">
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="user-filter-buttons">
                  {getAvailableFilterOptions.map(option => (
                    <button
                      key={option}
                      onClick={() => toggleUserFilter(option)}
                      className={`user-filter-btn ${userFilters[option] ? 'active' : ''}`}
                    >
                      {option === 'Joint' ? '👫' : '👤'} {option}
                    </button>
                  ))}
                </div>
              </div>
              {/* Year Filter */}
              <div className="user-filter-section compact filter-fixed-width">
                <div className="user-filter-header">
                  <h3 className="user-filter-title">
                    📅 Filter by Year
                  </h3>
                  <div className="user-filter-actions">
                    <button onClick={selectAllYears} className="user-filter-btn">
                      Select All
                    </button>
                    <button onClick={deselectAllYears} className="user-filter-btn">
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="user-filter-buttons">
                  {getAvailableYears().map(year => (
                    <button
                      key={year}
                      onClick={() => toggleYearFilter(year)}
                      className={`user-filter-btn ${yearFilters[year] ? 'active' : ''}`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
              {/* Combined-section Filter */}
              <div className="user-filter-section compact filter-fixed-width">
                <div className="user-filter-header">
                  <h3 className="user-filter-title">
                    🧮 Filter by Data Fields
                  </h3>
                  <div className="user-filter-actions">
                    <button onClick={selectAllCombinedSectionFields} className="user-filter-btn">
                      Select All
                    </button>
                    <button onClick={deselectAllCombinedSectionFields} className="user-filter-btn">
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="user-filter-buttons" style={{ flexWrap: 'wrap', maxWidth: 400 }}>
                  {schema.sections.filter(s => s.name !== 'users' && s.name !== 'basic').map(section =>
                    section.fields.filter(f => f.name !== 'year').map(field => (
                      <button
                        key={field.name}
                        onClick={() => toggleCombinedSectionFilter(field.name)}
                        className={`user-filter-btn ${combinedSectionFilters[field.name] ? 'active' : ''}`}
                        title={section.title}
                      >
                        {field.label}
                      </button>
                    ))
                  )}
                </div>
              </div>
              {/* Account Type Filter */}
              {hasAccountTypeField() && (
                <div className="user-filter-section compact filter-fixed-width">
                  <div className="user-filter-header">
                    <h3 className="user-filter-title">
                      🏦 Filter by Account Type
                    </h3>
                    <div className="user-filter-actions">
                      <button onClick={selectAllAccountTypes} className="user-filter-btn">
                        Select All
                      </button>
                      <button onClick={deselectAllAccountTypes} className="user-filter-btn">
                        Clear All
                      </button>
                    </div>
                  </div>
                  <div className="user-filter-buttons">
                    {getAvailableAccountTypes().map(accountType => (
                      <button
                        key={accountType}
                        onClick={() => toggleAccountTypeFilter(accountType)}
                        className={`user-filter-btn ${accountTypeFilters[accountType] ? 'active' : ''}`}
                      >
                        {accountType}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {totalItems > 0 ? (
        <>
          <div className="data-table-container" style={{ marginBottom: '20px' }}>
            {/* Performance Warning for Large Datasets */}
            {totalItems > 100 && (
              <div style={{
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9rem'
              }}>
                <span>⚡</span>
                <span>
                  <strong>Large Dataset ({totalItems} entries)</strong> - 
                  For better performance, consider using the filters above to view specific data subsets.
                  {totalItems > 500 && ' Performance may be slower with this many entries.'}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h2>📊 {title} Overview</h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: '500', color: '#374151', whiteSpace: 'nowrap' }}>
                    Sort by:
                  </label>
                  <select
                    value={currentSortField}
                    onChange={(e) => setCurrentSortField(e.target.value)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '0.9rem',
                      minWidth: '120px'
                    }}
                  >
                    {getSortableFields().map(field => (
                      <option key={field.key} value={field.key}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={currentSortOrder}
                    onChange={(e) => setCurrentSortOrder(e.target.value)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '0.9rem',
                      minWidth: '100px'
                    }}
                  >
                    <option value="desc">High to Low</option>
                    <option value="asc">Low to High</option>
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginLeft: '12px' }}>
                    <input
                      type="checkbox"
                      checked={compactView}
                      onChange={(e) => setCompactView(e.target.checked)}
                      style={{ margin: 0 }}
                    />
                    <span style={{ fontSize: '0.9rem', color: '#374151' }}>Compact view</span>
                  </label>
                </div>
                
                {allowAdd && (
                  <button onClick={addEntry} className="btn-primary">
                    ➕ Add New Entry
                  </button>
                )}
              </div>
            </div>

            {/* Pagination Controls - Top */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: '#6b7280', flexWrap: 'wrap' }}>
                  <span>Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} entries</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: '4px 6px',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db',
                      fontSize: '0.8rem'
                    }}
                  >
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                    <option value={200}>200 per page</option>
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={compactView}
                      onChange={(e) => setCompactView(e.target.checked)}
                      style={{ margin: 0 }}
                    />
                    <span style={{ fontSize: '0.8rem' }}>Compact view</span>
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db',
                      background: currentPage === 1 ? '#f9fafb' : '#fff',
                      color: currentPage === 1 ? '#9ca3af' : '#374151',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    ← Previous
                  </button>
                  <span style={{ fontSize: '0.9rem', color: '#6b7280', padding: '0 8px' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db',
                      background: currentPage === totalPages ? '#f9fafb' : '#fff',
                      color: currentPage === totalPages ? '#9ca3af' : '#374151',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            <div className={`data-table ${compactView ? 'compact-view' : ''}`} style={{ 
              maxHeight: '70vh', 
              overflowY: 'auto',
              overflowX: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}>
              <table style={{ width: '100%', minWidth: 'max-content', borderCollapse: 'collapse' }}>
                <thead className="main-header">
                  <tr>
                    <ResizableHeader 
                      columnKey="year" 
                      width={(columnWidths && columnWidths.year)}
                      onResize={handleMouseDown}
                      compactView={compactView}
                      className="year-column"
                    >
                      Year
                    </ResizableHeader>
                    {/* Dynamic header generation for account owners */}
                    {(() => {
                      const userSection = schema.sections.find(s => s.name === 'users');
                      if (!userSection || !usePaycheckUsers || Object.keys(userFilters).length === 0) {
                        return null;
                      }

                      // Get all available filter options (users that actually exist in data)
                      const availableUsers = getAvailableFilterOptions;
                      
                      // Only show headers for users that are actively selected in the filter
                      const activeUsers = availableUsers.filter(name => 
                        userFilters[name] === true && name !== 'Joint'
                      );
                      const showJoint = userFilters['Joint'] === true;
                      
                      const headers = [];
                      
                      // Add headers for active individual users
                      activeUsers.forEach(name => {
                        headers.push(
                          <th key={name} className="user-section" colSpan={userSection.fields.length}>
                            {name}
                          </th>
                        );
                      });
                      
                      // Add Joint header if Joint is active
                      if (showJoint) {
                        headers.push(
                          <th key="joint" className="user-section" colSpan={userSection.fields.length}>
                            Joint
                          </th>
                        );
                      }
                      
                      return headers;
                    })()}
                    {/* Only show combined-section columns that are enabled in combinedSectionFilters */}
                    {schema.sections.filter(s => s.name !== 'users' && s.name !== 'basic').map(section => {
                      const visibleFields = section.fields.filter(f => f.name !== 'year' && combinedSectionFilters[f.name]);
                      if (visibleFields.length === 0) return null;
                      return (
                        <th key={section.name} className="combined-section" colSpan={visibleFields.length}>
                          {section.title}
                        </th>
                      );
                    })}
                    {(allowEdit || allowDelete) && <th className="actions-column">Actions</th>}
                  </tr>
                  <tr className="sub-header">
                    <th className="year-column-sub"></th>
                    {/* Dynamic sub-header generation */}
                    {(() => {
                      const userSection = schema.sections.find(s => s.name === 'users');
                      if (!userSection || !usePaycheckUsers || Object.keys(userFilters).length === 0) {
                        return null;
                      }

                      // Get all available filter options (users that actually exist in data)
                      const availableUsers = getAvailableFilterOptions;
                      
                      // Only show sub-headers for users that are actively selected in the filter
                      const activeUsers = availableUsers.filter(name => 
                        userFilters[name] === true && name !== 'Joint'
                      );
                      const showJoint = userFilters['Joint'] === true;
                      
                      const subHeaders = [];
                      
                      // Add sub-headers for active individual users
                      activeUsers.forEach(name => {
                        userSection.fields.forEach(field => {
                          const columnKey = `${name}-${field.name}`;
                          subHeaders.push(
                            <ResizableHeader 
                              key={columnKey} 
                              columnKey={columnKey}
                              width={(columnWidths && columnWidths[columnKey])}
                              onResize={handleMouseDown}
                              compactView={compactView}
                            >
                              {field.label}
                            </ResizableHeader>
                          );
                        });
                      });
                      
                      // Add Joint sub-headers if Joint is active
                      if (showJoint) {
                        userSection.fields.forEach(field => {
                          const columnKey = `joint-${field.name}`;
                          subHeaders.push(
                            <ResizableHeader 
                              key={columnKey} 
                              columnKey={columnKey}
                              width={(columnWidths && columnWidths[columnKey])}
                              onResize={handleMouseDown}
                              compactView={compactView}
                            >
                              {field.label}
                            </ResizableHeader>
                          );
                        });
                      }
                      
                      return subHeaders;
                    })()}
                    {/* Only show combined-section sub-headers for enabled fields */}
                    {schema.sections.filter(s => s.name !== 'users' && s.name !== 'basic').map(section =>
                      section.fields.filter(f => f.name !== 'year' && combinedSectionFilters[f.name]).map(field => (
                        <ResizableHeader 
                          key={field.name} 
                          columnKey={field.name}
                          width={(columnWidths && columnWidths[field.name])}
                          onResize={handleMouseDown}
                          compactView={compactView}
                        >
                          {field.label}
                        </ResizableHeader>
                      ))
                    )}
                    {(allowEdit || allowDelete) && <th className="actions-column-sub"></th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedKeys.map((key, index) => {
                    const entry = filteredEntryData[key];
                    const isNew = key === newlyAddedKey;
                    return (
                      <DataTableRow
                        key={key}
                        rowKey={key}
                        entry={entry}
                        isNew={isNew}
                        rowIndex={index}
                        schema={{ ...schema, primaryKey }}
                        usePaycheckUsers={usePaycheckUsers}
                        userFilters={userFilters}
                        combinedSectionFilters={combinedSectionFilters}
                        fieldCssClasses={getEffectiveFieldCssClasses || {}}
                        allowEdit={allowEdit}
                        allowDelete={allowDelete}
                        editingCell={editingCell}
                        editingCellValue={editingCellValue}
                        setEditingCellValue={setEditingCellValue}
                        saveEditCell={saveEditCell}
                        cancelEditCell={cancelEditCell}
                        handleCellInputKeyDown={handleCellInputKeyDown}
                        startEditCell={startEditCell}
                        deleteEntry={deleteEntry}
                        getAvailableFilterOptions={getAvailableFilterOptions}
                        renderUserTableCell={renderUserTableCell}
                        renderTableCell={renderTableCell}
                        compactView={compactView}
                        columnWidths={columnWidths || {}}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls - Bottom */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '16px', gap: '8px' }}>
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    background: currentPage === 1 ? '#f9fafb' : '#fff',
                    color: currentPage === 1 ? '#9ca3af' : '#374151',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  ← Previous
                </button>
                <span style={{ fontSize: '0.9rem', color: '#6b7280', padding: '0 12px' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    background: currentPage === totalPages ? '#f9fafb' : '#fff',
                    color: currentPage === totalPages ? '#9ca3af' : '#374151',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
          {/* Render import/export section below table if data exists */}
          <div style={{ marginBottom: '20px' }}>
            {renderImportExportSection()}
          </div>
        </>
      ) : (
        <div className="data-empty-state">
          <div className="data-empty-state-content">
            <div className="data-empty-state-icon">📈📊</div>
            <h2>Welcome to {title}!</h2>
            <p className="data-empty-state-description">{subtitle}</p>
            
            <div className="data-empty-state-features">
              <h3>What You Can Do Here:</h3>
              <div className="data-features-grid">
                <div className="data-feature">
                  <div className="data-feature-icon">📝</div>
                  <div className="data-feature-text">
                    <strong>Track Financial Data</strong>
                    <p>Record and manage your yearly financial information</p>
                  </div>
                </div>
                
                <div className="data-feature">
                  <div className="data-feature-icon">📊</div>
                  <div className="data-feature-text">
                    <strong>View Trends</strong>
                    <p>Analyze patterns and changes over time</p>
                  </div>
                </div>
                
                <div className="data-feature">
                  <div className="data-feature-icon">💾</div>
                  <div className="data-feature-text">
                    <strong>Import/Export</strong>
                    <p>Backup your data or import from spreadsheets</p>
                  </div>
                </div>
                
                <div className="data-feature">
                  <div className="data-feature-icon">🔍</div>
                  <div className="data-feature-text">
                    <strong>Filter & Search</strong>
                    <p>Find specific data points quickly and easily</p>
                  </div>
                </div>
              </div>
            </div>
            
            {allowAdd && (
              <div className="data-empty-state-cta">
                <p><strong>Ready to start?</strong></p>
                <div className="data-empty-state-buttons">
                  <button onClick={addEntry} className="btn-primary data-add-first-entry">
                    ➕ Add Your First Entry
                  </button>
                  <button onClick={handleCSVImport} className="btn-secondary data-upload-csv">
                    📁 Upload CSV
                  </button>
                  <input
                    id="csv-upload-input"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataManager;