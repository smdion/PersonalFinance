import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navigation = () => {
  const location = useLocation();
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [openFolders, setOpenFolders] = useState({});
  const settingsMenuRef = useRef(null);
  const hamburgerMenuRef = useRef(null);
  const desktopNavRef = useRef(null);

  const navFolders = [
    {
      label: 'Budget and Plan',
      icon: '💸',
      items: [
        { path: '/paycheck', label: 'Paycheck', icon: '💰' },
        { path: '/budget', label: 'Budget', icon: '💵' },
        { path: '/savings', label: 'Savings', icon: '🎯' },
        { path: '/retirement', label: 'Retirement', icon: '🏖️' }
      ]
    },
    {
      label: 'Update and Review',
      icon: '📊',
      subfolders: [
        {
          label: 'Data Input',
          icon: '💾',
          items: [
            { path: '/other-assets', label: 'Assets', icon: '🏠' },
            { path: '/liabilities', label: 'Liabilities', icon: '💳' },
            { path: '/primary-home', label: 'Primary Home', icon: '🏡' },
            { path: '/portfolio', label: 'Portfolio', icon: '📈' }
          ]
        },
        {
          label: 'Review',
          icon: '📈',
          items: [
            { path: '/raw-data', label: 'Raw Data', icon: '📊' }
          ]
        }
      ]
    },
    {
      label: 'Optimize and Visualize',
      icon: '🔍',
      subfolders: [
        {
          label: 'Optimize',
          icon: '⚡',
          items: [
            { path: '/contributions', label: 'Contributions', icon: '⚡' }
          ]
        },
        {
          label: 'Visualize',
          icon: '💎',
          items: [
            { path: '/networth', label: 'Net Worth', icon: '💎' },
            { path: '/performance', label: 'Performance', icon: '📈' }
          ]
        }
      ]
    }
  ];

  // Get all navigation items flattened for active state checking
  const getAllNavItems = () => {
    return navFolders.flatMap(folder => {
      if (folder.subfolders) {
        return folder.subfolders.flatMap(subfolder => subfolder.items);
      }
      return folder.items || [];
    });
  };

  // Toggle folder open/closed state - only allow one folder open at a time
  const toggleFolder = (folderLabel) => {
    setOpenFolders(prev => {
      const isCurrentlyOpen = prev[folderLabel];
      
      // If clicking on the currently open folder, close it
      if (isCurrentlyOpen) {
        return {};
      }
      
      // Otherwise, close all folders and open only the clicked one
      return { [folderLabel]: true };
    });
  };

  // Handle click outside to close menus
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close menus if clicking on navigation links - let them navigate first
      if (event.target.classList.contains('hamburger-menu-item') || 
          event.target.closest('.hamburger-menu-item')) {
        return;
      }
      
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target)) {
        setShowSettingsMenu(false);
      }
      if (hamburgerMenuRef.current && !hamburgerMenuRef.current.contains(event.target)) {
        setShowHamburgerMenu(false);
      }
      // Close desktop navigation folder dropdowns when clicking outside
      if (desktopNavRef.current && !desktopNavRef.current.contains(event.target)) {
        setOpenFolders({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close hamburger menu when navigation occurs
  useEffect(() => {
    setShowHamburgerMenu(false);
  }, [location.pathname]);

  // Settings menu functions

  const resetAllData = async () => {
    if (window.confirm('Are you sure you want to reset ALL data across the entire application? This will clear:\n\n• All paycheck calculator data\n• All budget categories and items\n• All historical financial data\n• All performance tracking data\n• All form settings\n\nThis action cannot be undone.')) {
      try {
        const { resetAllAppData } = await import('../utils/localStorage');
        const result = resetAllAppData();
        
        if (result.success) {
          alert('All data has been reset successfully! The page will refresh.');
          window.location.reload();
        } else {
          alert(`Failed to reset data: ${result.message}`);
        }
      } catch (error) {
        alert('Failed to reset data. Please try again.');
      }
    }
    setShowSettingsMenu(false);
  };

  const exportAllData = async () => {
    try {
      const { exportAllDataWithTimestamp } = await import('../utils/localStorage');
      const result = exportAllDataWithTimestamp();
      
      if (result.success) {
        alert('Data exported successfully as JSON!');
      } else {
        alert(`Export failed: ${result.message}`);
      }
    } catch (error) {
      alert('Failed to export data. Please try again.');
    }
    setShowSettingsMenu(false);
  };

  const exportAllCSV = async () => {
    try {
      const { downloadAllCSVExports } = await import('../utils/localStorage');
      const result = downloadAllCSVExports();
      
      if (result.success) {
        alert(`Successfully exported ${result.count} CSV files!`);
      } else {
        alert(`CSV export failed: ${result.message}`);
      }
    } catch (error) {
      alert('Failed to export CSV data. Please try again.');
    }
    setShowSettingsMenu(false);
  };

  const importData = async () => {
    try {
      const { triggerFileImport, importAllData } = await import('../utils/localStorage');
      const jsonData = await triggerFileImport();
      const result = importAllData(jsonData);
      
      if (result.success) {
        if (window.confirm('Data imported successfully! The page will refresh to show the imported data.')) {
          window.location.reload();
        }
      } else {
        alert(`Import failed: ${result.message}`);
      }
    } catch (error) {
      if (error.message !== 'Import cancelled') {
        alert('Failed to import data. Please try again.');
      }
    }
    setShowSettingsMenu(false);
  };

  const loadDemoDataWithExport = async () => {
    try {
      const { hasExistingData, exportAllDataWithTimestamp, importDemoData } = await import('../utils/localStorage');
      
      if (hasExistingData()) {
        const shouldExport = window.confirm(
          'You have existing data in your calculator. Would you like to export it before loading the demo data?\n\n' +
          'Click "OK" to export your data first, or "Cancel" to proceed without exporting.'
        );
        
        if (shouldExport) {
          const exportResult = exportAllDataWithTimestamp();
          if (exportResult.success) {
            alert('Your data has been exported successfully! Now loading demo data...');
          } else {
            alert('Export failed, but you can still proceed with loading demo data.');
          }
        }
      }
      
      const result = await importDemoData();
      
      if (result.success) {
        if (window.confirm('Demo data loaded successfully! The page will refresh to show the demo data. You can explore all features with realistic financial data.')) {
          window.location.reload();
        }
      } else {
        alert(`Failed to load demo data: ${result.message}`);
      }
    } catch (error) {
      alert('Failed to load demo data. Please try again.');
    }
    setShowSettingsMenu(false);
  };

  const cleanupObsoleteData = async () => {
    try {
      const { cleanupObsoleteFields } = await import('../utils/localStorage');
      const result = cleanupObsoleteFields();
      
      if (result.success) {
        alert(`Data cleanup completed: ${result.message}`);
      } else {
        alert(`Cleanup failed: ${result.message}`);
      }
    } catch (error) {
      alert('Failed to cleanup data. Please try again.');
    }
    setShowSettingsMenu(false);
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        {/* Logo/Brand */}
        <div className="nav-brand">
          <Link to="/" className="brand-link">
            💰 Personal Finance
          </Link>
        </div>

        {/* Desktop Navigation (hidden on mobile) */}
        <div className="nav-items-desktop" ref={desktopNavRef}>
          {navFolders.map((folder) => (
            <div key={folder.label} className="nav-folder">
              <button
                className="nav-folder-toggle"
                onClick={() => toggleFolder(folder.label)}
                aria-expanded={openFolders[folder.label]}
              >
                <span className="nav-folder-icon">{folder.icon}</span>
                <span className="nav-folder-label">{folder.label}</span>
                <span className={`nav-folder-arrow ${openFolders[folder.label] ? 'open' : ''}`}>▼</span>
              </button>
              {openFolders[folder.label] && (
                <div className="nav-folder-items">
                  {folder.subfolders ? (
                    folder.subfolders.map((subfolder) => (
                      <div key={subfolder.label} className="nav-subfolder">
                        <div className="nav-subfolder-header">
                          <span className="nav-subfolder-icon">{subfolder.icon}</span>
                          <span className="nav-subfolder-label">{subfolder.label}</span>
                        </div>
                        <div className="nav-subfolder-items">
                          {subfolder.items.map((item) => (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                              onClick={() => setOpenFolders({})}
                            >
                              <span className="nav-item-icon">{item.icon}</span>
                              <span className="nav-item-label">{item.label}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    folder.items?.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                        onClick={() => setOpenFolders({})}
                      >
                        <span className="nav-item-icon">{item.icon}</span>
                        <span className="nav-item-label">{item.label}</span>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mobile Menu Controls */}
        <div className="nav-controls">
          {/* Hamburger Menu Button */}
          <div className="hamburger-menu" ref={hamburgerMenuRef}>
            <button
              onClick={() => setShowHamburgerMenu(!showHamburgerMenu)}
              className="hamburger-button"
              aria-label="Toggle navigation menu"
              aria-expanded={showHamburgerMenu}
            >
              <span className={`hamburger-line ${showHamburgerMenu ? 'open' : ''}`}></span>
              <span className={`hamburger-line ${showHamburgerMenu ? 'open' : ''}`}></span>
              <span className={`hamburger-line ${showHamburgerMenu ? 'open' : ''}`}></span>
            </button>

            {/* Hamburger Dropdown Menu */}
            {showHamburgerMenu && (
              <div className="hamburger-dropdown">
                <div className="hamburger-menu-items">
                  {navFolders.map((folder) => (
                    <div key={folder.label} className="hamburger-folder">
                      <button
                        className="hamburger-folder-toggle"
                        onClick={() => toggleFolder(folder.label)}
                        aria-expanded={openFolders[folder.label]}
                      >
                        <span className="menu-folder-icon">{folder.icon}</span>
                        <span className="menu-folder-label">{folder.label}</span>
                        <span className={`menu-folder-arrow ${openFolders[folder.label] ? 'open' : ''}`}>▼</span>
                      </button>
                      {openFolders[folder.label] && (
                        <div className="hamburger-folder-items">
                          {folder.subfolders ? (
                            folder.subfolders.map((subfolder) => (
                              <div key={subfolder.label} className="hamburger-subfolder">
                                <div className="hamburger-subfolder-header">
                                  <span className="menu-subfolder-icon">{subfolder.icon}</span>
                                  <span className="menu-subfolder-label">{subfolder.label}</span>
                                </div>
                                <div className="hamburger-subfolder-items">
                                  {subfolder.items.map((item) => (
                                    <a
                                      key={item.path}
                                      href={item.path}
                                      className={`hamburger-menu-item ${location.pathname === item.path ? 'active' : ''}`}
                                      onClick={() => {
                                        setShowHamburgerMenu(false);
                                        setOpenFolders({});
                                      }}
                                    >
                                      <span className="menu-item-icon">{item.icon}</span>
                                      <span className="menu-item-label">{item.label}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            ))
                          ) : (
                            folder.items?.map((item) => (
                              <a
                                key={item.path}
                                href={item.path}
                                className={`hamburger-menu-item ${location.pathname === item.path ? 'active' : ''}`}
                                onClick={() => {
                                  setShowHamburgerMenu(false);
                                  setOpenFolders({});
                                }}
                              >
                                <span className="menu-item-icon">{item.icon}</span>
                                <span className="menu-item-label">{item.label}</span>
                              </a>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Settings Menu */}
          <div className="settings-menu" ref={settingsMenuRef}>
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className="settings-button"
              aria-label="Settings menu"
              aria-expanded={showSettingsMenu}
            >
              ⚙️
            </button>

            {showSettingsMenu && (
              <div className="settings-dropdown">
                <div className="settings-menu-header">
                  <h3>🛠️ Tools</h3>
                </div>
                <div className="settings-menu-items">
                  <button onClick={loadDemoDataWithExport} className="settings-menu-item">
                    🎯 Load Demo Data
                  </button>
                  <div className="settings-menu-divider"></div>
                  <button onClick={cleanupObsoleteData} className="settings-menu-item">
                    🧹 Cleanup Old Data Fields
                  </button>
                  <button onClick={exportAllData} className="settings-menu-item">
                    📤 Export All Data (JSON)
                  </button>
                  <button onClick={exportAllCSV} className="settings-menu-item">
                    📊 Export All Data (CSV)
                  </button>
                  <button onClick={importData} className="settings-menu-item">
                    📥 Import Data
                  </button>
                  <div className="settings-menu-divider"></div>
                  <button onClick={resetAllData} className="settings-menu-item danger">
                    🗑️ Reset All Data
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
