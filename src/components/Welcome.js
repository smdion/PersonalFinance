import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Welcome = () => {
  const [showBetaWelcome, setShowBetaWelcome] = useState(false);

  // Check if user has seen the beta welcome popup
  useEffect(() => {
    const hasSeenBetaWelcome = localStorage.getItem('hasSeenBetaWelcome');
    if (!hasSeenBetaWelcome) {
      setShowBetaWelcome(true);
    }
  }, []);

  // Handle beta welcome popup dismissal
  const dismissBetaWelcome = () => {
    localStorage.setItem('hasSeenBetaWelcome', 'true');
    setShowBetaWelcome(false);
  };

  const loadDemoData = async () => {
    try {
      // Import the correct demo data loader
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
  };

  return (
    <div className="app-container">
      {/* Beta Welcome Popup */}
      {showBetaWelcome && (
        <div className="beta-welcome-overlay">
          <div className="beta-welcome-popup">
            <div className="beta-welcome-header">
              <h2>🚀 Welcome to Personal Finance Calculator Suite!</h2>
              <div className="beta-badge">BETA</div>
            </div>
            
            <div className="beta-welcome-content">
              <div className="beta-welcome-intro">
                <p>
                  Thank you for trying our comprehensive financial planning platform! 
                  This is a <strong>beta version</strong> that's actively being developed and improved.
                </p>
              </div>

              <div className="beta-current-features">
                <h3>✅ Current Features</h3>
                <ul>
                  <li>2025 Tax-Accurate Paycheck Calculator with dual income support</li>
                  <li>Complete Budget Planning with auto-sync and drag & drop categories</li>
                  <li>Historical Financial Data Tracking with 20+ metrics per year</li>
                  <li>Account Performance Tracker with detailed investment analytics</li>
                  <li>Net Worth Dashboard with interactive charts and analytics</li>
                  <li>Data Import/Export with CSV templates and JSON backup</li>
                  <li>Demo data to explore all features instantly</li>
                </ul>
              </div>

              <div className="beta-upcoming-features">
                <h3>🔮 Coming Soon</h3>
                <ul>
                  <li><strong>Retirement Planning:</strong> 401k optimization, IRA strategies, withdrawal planning</li>
                  <li><strong>Advanced Savings:</strong> Goal tracking, automated savings recommendations</li>
                  <li><strong>Mortgage Tools:</strong> Refinancing calculator, extra payment analysis</li>
                  <li><strong>Enhanced Visualizations:</strong> Interactive charts, trend analysis, forecasting</li>
                  <li><strong>Portfolio Analytics:</strong> Asset allocation, risk analysis, rebalancing recommendations</li>
                  <li><strong>API Integration:</strong> Bank connections, real-time data sync, automated updates</li>
                  <li><strong>Mobile App:</strong> iOS and Android applications with offline sync</li>
                </ul>
              </div>

              <div className="beta-privacy-note">
                <div className="privacy-highlight">
                  🔒 <strong>Your Privacy:</strong> All data is stored locally in your browser. 
                  Nothing is sent to external servers - your financial information stays completely private.
                </div>
              </div>

              <div className="beta-feedback-section">
                <p>
                  <strong>Help us improve!</strong> This product is constantly evolving based on user feedback. 
                  If you encounter issues or have feature requests, please let us know.
                </p>
              </div>
            </div>

            <div className="beta-welcome-actions">
              <button onClick={dismissBetaWelcome} className="beta-welcome-button primary">
                🎯 Get Started
              </button>
              <button 
                onClick={() => {
                  dismissBetaWelcome();
                  loadDemoData();
                }} 
                className="beta-welcome-button secondary"
              >
                🚀 Try Demo Data First
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="header">
        <h1>Personal Finance Calculator Suite</h1>
        <p>Comprehensive tools to plan, track, and visualize your financial future</p>
        <div style={{ marginTop: 10, textAlign: 'center' }}>
          <a
            href="https://github.com/smdion/PersonalFinance"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#24292f',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '1rem'
            }}
            title="GitHub - Support & Source Code"
          >
            <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor" style={{ verticalAlign: 'middle' }}>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
                0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52
                -.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2
                -3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.01.08-2.12 0 0 .67-.21 2.2.82.64
                -.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.11.16 1.92.08
                2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01
                1.93-.01 2.19 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <span>GitHub Support</span>
          </a>
        </div>
      </div>

      <div className="welcome-content">
        <div className="welcome-intro">
          <h2>Welcome to Your Complete Financial Planning Hub</h2>
          <p>
            This integrated suite of financial tools helps you make informed decisions about your income, 
            taxes, budget, and long-term wealth building. Each component works together to give you a 
            complete picture of your financial situation and help you plan for the future.
          </p>
        </div>

        {/* Demo Data Section - Prominently Featured */}
        <div className="demo-data-section">
          <div className="demo-data-card">
            <div className="demo-data-header">
              <h2>🎯 Try the Demo Data</h2>
              <p>Experience all features instantly with realistic sample data</p>
            </div>
            
            <div className="demo-data-content">
              <div className="demo-data-benefits">
                <div className="demo-benefit">
                  <div className="demo-benefit-icon">👥</div>
                  <div className="demo-benefit-text">
                    <strong>Dual Income Household</strong>
                    <div>Jordan & Alex with combined $157k income</div>
                  </div>
                </div>
                <div className="demo-benefit">
                  <div className="demo-benefit-icon">📊</div>
                  <div className="demo-benefit-text">
                    <strong>Complete Budget</strong>
                    <div>12 categories with 35+ budget items</div>
                  </div>
                </div>
                <div className="demo-benefit">
                  <div className="demo-benefit-icon">📈</div>
                  <div className="demo-benefit-text">
                    <strong>10 Years of Data</strong>
                    <div>Historical data from 2015-2025</div>
                  </div>
                </div>
                <div className="demo-benefit">
                  <div className="demo-benefit-icon">💰</div>
                  <div className="demo-benefit-text">
                    <strong>Wealth Growth</strong>
                    <div>Net worth progression to $675k</div>
                  </div>
                </div>
              </div>
              
              <div className="demo-data-actions">
                <button onClick={loadDemoData} className="demo-data-button">
                  🚀 Load Demo Data & Explore
                </button>
                <div className="demo-data-note">
                  <strong>Safe to try:</strong> Your existing data won't be lost - you can export it first or reset afterward
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="calculators-overview">
          <div className="calculator-card">
            <Link to="/paycheck" className="calculator-link">
              <div className="calculator-icon">💰</div>
              <h3>Paycheck Calculator</h3>
              <p>
                Calculate your take-home pay with precision using current 2025 tax brackets. 
                Supports dual income households, 401k planning, HSA contributions, and bonus calculations.
              </p>
              <div className="calculator-features">
                <span className="feature-tag">2025 Tax Tables</span>
                <span className="feature-tag">Dual Income</span>
                <span className="feature-tag">401k & HSA</span>
                <span className="feature-tag">Bonus Planning</span>
              </div>
            </Link>
          </div>

          <div className="calculator-card">
            <Link to="/budget" className="calculator-link">
              <div className="calculator-icon">📊</div>
              <h3>Budget Planner</h3>
              <p>
                Plan your monthly expenses with auto-synced income from your paycheck calculator. 
                Features three budget modes, drag-and-drop categories, and extra paycheck planning.
              </p>
              <div className="calculator-features">
                <span className="feature-tag">Auto-Sync Income</span>
                <span className="feature-tag">3 Budget Modes</span>
                <span className="feature-tag">Drag & Drop</span>
                <span className="feature-tag">Extra Paychecks</span>
              </div>
            </Link>
          </div>

          <div className="calculator-card">
            <Link to="/historical" className="calculator-link">
              <div className="calculator-icon">📈</div>
              <h3>Historical Data Tracker</h3>
              <p>
                Track your financial progress year-over-year with comprehensive data collection. 
                Includes CSV import/export, employer tracking, and 20+ financial metrics per year.
              </p>
              <div className="calculator-features">
                <span className="feature-tag">YoY Tracking</span>
                <span className="feature-tag">CSV Import</span>
                <span className="feature-tag">20+ Metrics</span>
                <span className="feature-tag">Data Export</span>
              </div>
            </Link>
          </div>

          <div className="calculator-card">
            <Link to="/performance" className="calculator-link">
              <div className="calculator-icon">📈</div>
              <h3>Performance Tracker</h3>
              <p>
                Track individual account balances, contributions, gains/losses, and returns. 
                Monitor 401k, IRA, HSA, and brokerage accounts with detailed performance analytics.
              </p>
              <div className="calculator-features">
                <span className="feature-tag">Account Tracking</span>
                <span className="feature-tag">Gain/Loss Analysis</span>
                <span className="feature-tag">Return Calculations</span>
                <span className="feature-tag">Portfolio Summary</span>
              </div>
            </Link>
          </div>

          <div className="calculator-card">
            <Link to="/networth" className="calculator-link">
              <div className="calculator-icon">📊</div>
              <h3>Net Worth Dashboard</h3>
              <p>
                Visualize your financial progress with interactive charts and analytics. 
                Compare multiple years, analyze growth trends, and view asset allocation breakdowns.
              </p>
              <div className="calculator-features">
                <span className="feature-tag">Interactive Charts</span>
                <span className="feature-tag">Year Comparison</span>
                <span className="feature-tag">Growth Analysis</span>
                <span className="feature-tag">Asset Breakdown</span>
              </div>
            </Link>
          </div>
        </div>

        <div className="getting-started">
          <h2>How to Get Started</h2>
          
          <div className="getting-started-options">
            <div className="start-option demo-option">
              <h3>🎯 Option 1: Try Demo Data (Recommended)</h3>
              <p>Experience all features immediately with realistic sample data including:</p>
              <ul>
                <li>Dual income household ($85k + $72k salaries)</li>
                <li>Complete budget with 12 categories and 35+ items</li>
                <li>10 years of historical financial data (2015-2025)</li>
                <li>Net worth progression from -$10k to $675k</li>
                <li>Interactive charts and analytics ready to explore</li>
              </ul>
              <button onClick={loadDemoData} className="demo-option-button">
                🚀 Load Demo Data & Start Exploring
              </button>
            </div>

            <div className="start-option manual-option">
              <h3>✋ Option 2: Start Fresh</h3>
              <p>Begin with your own data following these steps:</p>
              <div className="steps">
                <div className="step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h4>Calculate Your Paycheck</h4>
                    <p>Enter your salary, tax information, and deductions to calculate accurate take-home pay. Enable dual calculator mode for household planning.</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h4>Plan Your Budget</h4>
                    <p>Use the Budget Planner to allocate your income across expenses and savings goals. Your take-home pay syncs automatically.</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h4>Track Account Performance</h4>
                    <p>Add your investment accounts to the Performance Tracker to monitor balances, contributions, gains/losses, and returns over time.</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <h4>Record Historical Data</h4>
                    <p>Add your financial data year-over-year to build a comprehensive picture of your wealth growth and income progression.</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">5</div>
                  <div className="step-content">
                    <h4>Visualize Your Progress</h4>
                    <p>Use the Net Worth Dashboard to see trends, compare years, and analyze your financial growth with interactive charts.</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">6</div>
                  <div className="step-content">
                    <h4>Optimize and Adjust</h4>
                    <p>Return to any tool as your situation changes to maintain optimal financial planning and goal achievement.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="features-highlight">
          <h2>Key Features</h2>
          <div className="features-grid">
            <div className="feature">
              <div className="feature-icon">🔄</div>
              <h4>Integrated Workflow</h4>
              <p>Data flows seamlessly between all tools for consistent and comprehensive financial planning.</p>
            </div>
            <div className="feature">
              <div className="feature-icon">👥</div>
              <h4>Household Support</h4>
              <p>Full dual-income household support with separate calculations that combine for family planning.</p>
            </div>
            <div className="feature">
              <div className="feature-icon">📱</div>
              <h4>Responsive Design</h4>
              <p>Works perfectly on desktop, tablet, and mobile devices with touch-friendly interfaces.</p>
            </div>
            <div className="feature">
              <div className="feature-icon">🎯</div>
              <h4>2025 Tax Accuracy</h4>
              <p>Uses current tax brackets, withholding tables, and contribution limits for precise calculations.</p>
            </div>
            <div className="feature">
              <div className="feature-icon">💾</div>
              <h4>Data Management</h4>
              <p>Export/import functionality, CSV templates, and automatic local data persistence.</p>
            </div>
            <div className="feature">
              <div className="feature-icon">📊</div>
              <h4>Visual Analytics</h4>
              <p>Interactive charts, growth metrics, and comprehensive financial trend analysis.</p>
            </div>
            <div className="feature">
              <div className="feature-icon">🔒</div>
              <h4>Privacy First</h4>
              <p>All data stored locally in your browser - your financial information never leaves your device.</p>
            </div>
            <div className="feature">
              <div className="feature-icon">⚡</div>
              <h4>Real-time Updates</h4>
              <p>Instant calculations and automatic synchronization between all planning tools.</p>
            </div>
          </div>
        </div>

        <div className="quick-start">
          <h2>Quick Start Options</h2>
          <div className="quick-start-buttons">
            <button onClick={loadDemoData} className="quick-start-button demo">
              🎯 Try Demo Data First
            </button>
            <Link to="/paycheck" className="quick-start-button primary">
              Start with Paycheck Calculator
            </Link>
            <Link to="/budget" className="quick-start-button secondary">
              Go to Budget Planner
            </Link>
            <Link to="/performance" className="quick-start-button secondary">
              Track Account Performance
            </Link>
            <Link to="/historical" className="quick-start-button secondary">
              Track Historical Data
            </Link>
            <Link to="/networth" className="quick-start-button secondary">
              View Dashboard
            </Link>
          </div>
          <p style={{ textAlign: 'center', marginTop: '20px', color: '#64748b', fontSize: '0.9rem' }}>
            💡 <strong>New User Tip:</strong> Try the demo data first to see all features in action with realistic sample data. 
            You can always export your current data, load the demo, explore the features, then import your data back or start fresh.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Welcome;