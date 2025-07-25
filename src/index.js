import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Welcome from './components/Welcome';
import TaxCalculator from './components/TaxCalculator';
import BudgetForm from './components/BudgetForm';
import Historical from './components/Historical';
import NetWorthDashboard from './components/NetWorthDashboard';
import Performance from './components/Performance';
import { FormProvider } from './context/FormContext';
import { exportAllData, downloadJsonFile, importAllData, triggerFileImport, clearAllAppData, dispatchGlobalEvent, importDemoData } from './utils/localStorage';
import './index.css';

// Navigation component with global settings
const Navigation = () => {
  const [settingsVisible, setSettingsVisible] = React.useState(false);
  const location = useLocation();
  const settingsRef = React.useRef(null);

  const toggleSettings = () => {
    setSettingsVisible(prev => !prev);
  };

  // Close settings when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setSettingsVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close settings when route changes
  React.useEffect(() => {
    setSettingsVisible(false);
  }, [location.pathname]);

  // Global settings functions
  const expandAllSections = () => {
    dispatchGlobalEvent('expandAllSections');
    setSettingsVisible(false);
  };

  const collapseAllSections = () => {
    dispatchGlobalEvent('collapseAllSections');
    setSettingsVisible(false);
  };

  const exportData = () => {
    const exportData = exportAllData();
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `personal-finance-export-${timestamp}.json`;
    
    const success = downloadJsonFile(exportData, filename);
    if (success) {
      alert('Data exported successfully!');
    } else {
      alert('Error exporting data. Please try again.');
    }
    setSettingsVisible(false);
  };

  const importData = async () => {
    try {
      const jsonData = await triggerFileImport();
      const result = importAllData(jsonData);
      
      if (result.success) {
        if (window.confirm('Data imported successfully! The page will refresh to load the imported data.')) {
          window.location.reload();
        }
      } else {
        alert(`Import failed: ${result.message}`);
      }
    } catch (error) {
      if (error.message !== 'Import cancelled') {
        alert(`Import failed: ${error.message}`);
      }
    }
    setSettingsVisible(false);
  };

  const loadDemoData = async () => {
    if (window.confirm('This will replace all current data with demo data. Are you sure you want to continue?')) {
      try {
        const result = await importDemoData();
        
        if (result.success) {
          if (window.confirm('Demo data loaded successfully! The page will refresh to show the demo data.')) {
            window.location.reload();
          }
        } else {
          alert(`Failed to load demo data: ${result.message}`);
        }
      } catch (error) {
        alert('Failed to load demo data. Please try again.');
      }
    }
    setSettingsVisible(false);
  };

  const resetAllData = () => {
    if (window.confirm('Are you sure you want to reset all application data? This will clear all calculators, budgets, and settings. This cannot be undone.')) {
      const success = clearAllAppData();
      if (success) {
        // Immediately reload to ensure all component state is cleared
        window.location.reload();
      } else {
        alert('Error resetting data. Please try again.');
      }
    }
    setSettingsVisible(false);
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="nav-brand">💰 Personal Finance</Link>
        <div className="nav-right" style={{ position: 'relative' }}>
          {/* Main Navigation Menu */}
          <ul className="nav-menu">
            <li>
              <Link 
                to="/paycheck" 
                className="nav-link"
                style={{ 
                  background: location.pathname === '/paycheck' ? 'rgba(255, 255, 255, 0.2)' : 'transparent' 
                }}
              >
                Paycheck Calculator
              </Link>
            </li>
            <li>
              <Link 
                to="/budget" 
                className="nav-link"
                style={{ 
                  background: location.pathname === '/budget' ? 'rgba(255, 255, 255, 0.2)' : 'transparent' 
                }}
              >
                Budget Planner
              </Link>
            </li>
            <li>
              <Link 
                to="/historical" 
                className="nav-link"
                style={{ 
                  background: location.pathname === '/historical' ? 'rgba(255, 255, 255, 0.2)' : 'transparent' 
                }}
              >
                Historical Data
              </Link>
            </li>
            <li>
              <Link 
                to="/performance" 
                className="nav-link"
                style={{ 
                  background: location.pathname === '/performance' ? 'rgba(255, 255, 255, 0.2)' : 'transparent' 
                }}
              >
                Performance
              </Link>
            </li>
            <li>
              <Link 
                to="/networth" 
                className="nav-link"
                style={{ 
                  background: location.pathname === '/networth' ? 'rgba(255, 255, 255, 0.2)' : 'transparent' 
                }}
              >
                Net Worth
              </Link>
            </li>
            <li>
              <button 
                onClick={toggleSettings} 
                className="nav-link" 
                style={{ 
                  background: settingsVisible ? 'rgba(255, 255, 255, 0.2)' : 'transparent', 
                  border: 'none', 
                  color: 'white' 
                }}
              >
                ⚙️ Settings
              </button>
            </li>
          </ul>

          {/* Settings Submenu */}
          <div ref={settingsRef} style={{ position: 'relative' }}>
            {settingsVisible && (
              <div className="settings-menu">
                <div className="settings-content">
                  <div className="settings-section">
                    <h4 className="settings-section-title">View Options</h4>
                    <button onClick={expandAllSections} className="settings-button-item">
                      📂 Expand All Sections
                    </button>
                    <button onClick={collapseAllSections} className="settings-button-item">
                      📁 Collapse All Sections
                    </button>
                  </div>
                  
                  <div className="settings-divider"></div>
                  
                  <div className="settings-section">
                    <h4 className="settings-section-title">Data Management</h4>
                    <button onClick={exportData} className="settings-button-item">
                      💾 Export All Data
                    </button>
                    <button onClick={importData} className="settings-button-item">
                      📂 Import Data
                    </button>
                    <button onClick={loadDemoData} className="settings-button-item">
                      🎯 Load Demo Data
                    </button>
                  </div>
                  
                  <div className="settings-divider"></div>
                  
                  <div className="settings-section">
                    <button onClick={resetAllData} className="settings-button-item danger">
                      🔄 Reset All Data
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

const App = () => (
  <FormProvider>
    <Router>
      <Navigation />
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/paycheck" element={<TaxCalculator />} />
        <Route path="/budget" element={<BudgetForm />} />
        <Route path="/historical" element={<Historical />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/networth" element={<NetWorthDashboard />} />
      </Routes>
    </Router>
  </FormProvider>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);