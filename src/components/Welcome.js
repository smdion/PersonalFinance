import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navigation from './Navigation';

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
    <>
      <Navigation />
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
                    <li><strong>2025 Tax-Accurate Paycheck Calculator:</strong> Dual income support, 401k/HSA planning, bonus calculations</li>
                    <li><strong>Complete Budget Planning:</strong> Auto-sync, drag & drop categories, three budget modes, extra paycheck planning</li>
                    <li><strong>Savings Goal Tracker:</strong> Automatic goal creation, bulk editing, progress tracking, purchase management</li>
                    <li><strong>Historical Financial Data Tracking:</strong> 20+ metrics per year, year-over-year analysis, tax information</li>
                    <li><strong>Account Performance Tracker:</strong> Investment analytics, individual & joint accounts, return calculations</li>
                    <li><strong>Net Worth Dashboard:</strong> Interactive charts, growth analysis, asset allocation breakdowns</li>
                    <li><strong>Advanced Data Management:</strong> CSV import/export, demo data, backup/restore functionality</li>
                    <li><strong>Responsive Design:</strong> Works perfectly on desktop, tablet, and mobile devices</li>
                  </ul>
                </div>

                <div className="beta-upcoming-features">
                  <h3>🔮 Coming Soon</h3>
                  <ul>
                    <li><strong>Retirement Planning:</strong> 401k optimization, IRA strategies, withdrawal planning, catch-up calculations</li>
                    <li><strong>Mortgage & Loan Tools:</strong> Refinancing calculator, extra payment analysis, amortization schedules</li>
                    <li><strong>Enhanced Visualizations:</strong> Interactive charts, trend forecasting, scenario modeling</li>
                    <li><strong>Portfolio Analytics:</strong> Asset allocation analysis, risk assessment, rebalancing recommendations</li>
                    <li><strong>Savings Optimization:</strong> Automated recommendations, goal prioritization, cash flow analysis</li>
                    <li><strong>API Integration:</strong> Bank connections, real-time data sync, automated account updates</li>
                    <li><strong>Mobile Applications:</strong> iOS and Android apps with offline sync and push notifications</li>
                  </ul>
                </div>

                <div className="beta-privacy-note">
                  <div className="privacy-highlight">
                    🔒 <strong>Your Privacy:</strong> All data is stored locally in your browser. 
                    Nothing is sent to external servers - your financial information stays completely private and secure.
                  </div>
                </div>

                <div className="beta-feedback-section">
                  <p>
                    <strong>Help us improve!</strong> This product is constantly evolving based on user feedback. 
                    If you encounter issues or have feature requests, please let us know through GitHub.
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
          <p>Comprehensive tools to plan, track, and visualize your financial future with complete privacy</p>
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
              taxes, budget, investments, and long-term wealth building. Each component works together to give you a 
              complete picture of your financial situation and help you plan for the future - all while keeping 
              your data completely private in your browser.
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
                      <div>Alex ($97k) & Jamie ($69k) with combined $166k income</div>
                    </div>
                  </div>
                  <div className="demo-benefit">
                    <div className="demo-benefit-icon">📊</div>
                    <div className="demo-benefit-text">
                      <strong>Complete Budget & Savings</strong>
                      <div>12 categories with 35+ budget items plus automatic savings goals</div>
                    </div>
                  </div>
                  <div className="demo-benefit">
                    <div className="demo-benefit-icon">📈</div>
                    <div className="demo-benefit-text">
                      <strong>5 Years of Data</strong>
                      <div>Historical financial data from 2021-2025</div>
                    </div>
                  </div>
                  <div className="demo-benefit">
                    <div className="demo-benefit-icon">💰</div>
                    <div className="demo-benefit-text">
                      <strong>Investment Tracking</strong>
                      <div>401k, brokerage, and savings account performance</div>
                    </div>
                  </div>
                  <div className="demo-benefit">
                    <div className="demo-benefit-icon">💎</div>
                    <div className="demo-benefit-text">
                      <strong>Net Worth Growth</strong>
                      <div>Progression from $74k to $675k over 5 years</div>
                    </div>
                  </div>
                  <div className="demo-benefit">
                    <div className="demo-benefit-icon">🎯</div>
                    <div className="demo-benefit-text">
                      <strong>Real Scenarios</strong>
                      <div>Salary increases, bonuses, home purchases, debt payoff</div>
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
                  Calculate your take-home pay with precision using current 2025 tax brackets and withholding tables. 
                  Supports dual income households, comprehensive deductions, bonus planning, and automatic budget integration.
                </p>
                <div className="calculator-features">
                  <span className="feature-tag">2025 Tax Tables</span>
                  <span className="feature-tag">Dual Income</span>
                  <span className="feature-tag">401k & HSA</span>
                  <span className="feature-tag">Bonus Planning</span>
                  <span className="feature-tag">W-4 Support</span>
                  <span className="feature-tag">Auto Budget Sync</span>
                </div>
              </Link>
            </div>

            <div className="calculator-card">
              <Link to="/budget" className="calculator-link">
                <div className="calculator-icon">📊</div>
                <h3>Budget Planner</h3>
                <p>
                  Plan your monthly expenses with auto-synced income from your paycheck calculator. 
                  Features three budget scenarios, drag-and-drop categories, smart auto-managed categories, and extra paycheck planning.
                </p>
                <div className="calculator-features">
                  <span className="feature-tag">Auto-Sync Income</span>
                  <span className="feature-tag">3 Budget Modes</span>
                  <span className="feature-tag">Drag & Drop</span>
                  <span className="feature-tag">Extra Paychecks</span>
                  <span className="feature-tag">Smart Categories</span>
                  <span className="feature-tag">Real-time Updates</span>
                </div>
              </Link>
            </div>

            <div className="calculator-card">
              <Link to="/savings" className="calculator-link">
                <div className="calculator-icon">🎯</div>
                <h3>Savings Goal Tracker</h3>
                <p>
                  Track and manage your savings goals with automatic creation from budget items containing "saving". 
                  Features bulk editing, monthly contribution tracking, purchase management, and visual progress indicators.
                </p>
                <div className="calculator-features">
                  <span className="feature-tag">Auto Goal Creation</span>
                  <span className="feature-tag">Bulk Edit Mode</span>
                  <span className="feature-tag">Progress Tracking</span>
                  <span className="feature-tag">Purchase History</span>
                  <span className="feature-tag">Visual Indicators</span>
                  <span className="feature-tag">Budget Sync</span>
                </div>
              </Link>
            </div>

            <div className="calculator-card">
              <Link to="/historical" className="calculator-link">
                <div className="calculator-icon">📈</div>
                <h3>Historical Data Tracker</h3>
                <p>
                  Track your financial progress year-over-year with comprehensive data collection. 
                  Includes dual user support, tax information, investment tracking, assets & liabilities, and CSV import/export.
                </p>
                <div className="calculator-features">
                  <span className="feature-tag">YoY Tracking</span>
                  <span className="feature-tag">20+ Metrics</span>
                  <span className="feature-tag">Tax Data</span>
                  <span className="feature-tag">CSV Import</span>
                  <span className="feature-tag">Dual Users</span>
                  <span className="feature-tag">Data Export</span>
                </div>
              </Link>
            </div>

            <div className="calculator-card">
              <Link to="/performance" className="calculator-link">
                <div className="calculator-icon">📊</div>
                <h3>Performance Tracker</h3>
                <p>
                  Track individual account balances, contributions, gains/losses, and returns across all investment types. 
                  Monitor 401k, IRA, HSA, brokerage, and joint accounts with detailed performance analytics and historical trends.
                </p>
                <div className="calculator-features">
                  <span className="feature-tag">Account Tracking</span>
                  <span className="feature-tag">Performance Analytics</span>
                  <span className="feature-tag">Return Calculations</span>
                  <span className="feature-tag">Joint Accounts</span>
                  <span className="feature-tag">Multi-Year Data</span>
                  <span className="feature-tag">Gain/Loss Analysis</span>
                </div>
              </Link>
            </div>

            <div className="calculator-card">
              <Link to="/networth" className="calculator-link">
                <div className="calculator-icon">💎</div>
                <h3>Net Worth Dashboard</h3>
                <p>
                  Visualize your financial progress with interactive charts and comprehensive analytics. 
                  Compare multiple years, analyze growth trends, view asset allocation breakdowns, and track your wealth journey.
                </p>
                <div className="calculator-features">
                  <span className="feature-tag">Interactive Charts</span>
                  <span className="feature-tag">Year Comparison</span>
                  <span className="feature-tag">Growth Analysis</span>
                  <span className="feature-tag">Asset Breakdown</span>
                  <span className="feature-tag">Trend Visualization</span>
                  <span className="feature-tag">Wealth Tracking</span>
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
                  <li><strong>Dual Income Household:</strong> Alex ($97k) and Jamie ($69k) with realistic salary progression</li>
                  <li><strong>Complete Budget:</strong> 12 categories with 35+ items across Standard/Tight/Emergency scenarios</li>
                  <li><strong>5 Years of Historical Data:</strong> Financial progression from 2021-2025 with tax information</li>
                  <li><strong>Investment Performance:</strong> 401k accounts, joint brokerage, and high-yield savings tracking</li>
                  <li><strong>Net Worth Growth:</strong> Realistic wealth building from $74k to $675k over 5 years</li>
                  <li><strong>Real-Life Scenarios:</strong> Salary increases, bonuses, home improvements, debt payoff</li>
                </ul>
                <button onClick={loadDemoData} className="demo-option-button">
                  🚀 Load Demo Data & Start Exploring
                </button>
              </div>

              <div className="start-option manual-option">
                <h3>✋ Option 2: Start Fresh</h3>
                <p>Begin with your own data following these comprehensive steps:</p>
                <div className="steps">
                  <div className="step">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <h4>Calculate Your Paycheck</h4>
                      <p>Enter salary, tax information, 401k/HSA contributions, and deductions. Enable dual calculator mode for household planning with automatic tax optimization.</p>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <h4>Plan Your Budget</h4>
                      <p>Use the Budget Planner with auto-synced income. Create categories, set amounts for three budget scenarios, and plan for extra paycheck months.</p>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <h4>Track Savings Goals</h4>
                      <p>Budget items with "saving" automatically become trackable goals. Use bulk editing to plan monthly contributions and track progress toward your targets.</p>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-number">4</div>
                    <div className="step-content">
                      <h4>Track Investment Performance</h4>
                      <p>Add 401k, IRA, HSA, and brokerage accounts. Monitor balances, contributions, employer matches, gains/losses, and calculate returns over time.</p>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-number">5</div>
                    <div className="step-content">
                      <h4>Record Historical Data</h4>
                      <p>Build your financial timeline with annual data including AGI, tax rates, asset values, and net worth. Import CSV files for bulk data entry.</p>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-number">6</div>
                    <div className="step-content">
                      <h4>Visualize Your Progress</h4>
                      <p>Use the Net Worth Dashboard to see growth trends, compare years, analyze asset allocation, and track your wealth building journey.</p>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-number">7</div>
                    <div className="step-content">
                      <h4>Optimize and Plan</h4>
                      <p>Return to any tool as your situation changes. Export data for safekeeping, model scenarios, and maintain optimal financial planning.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="features-highlight">
            <h2>Why Choose Our Financial Suite?</h2>
            <div className="features-grid">
              <div className="feature">
                <div className="feature-icon">🔄</div>
                <h4>Integrated Workflow</h4>
                <p>Data flows seamlessly between all tools for consistent and comprehensive financial planning with automatic synchronization.</p>
              </div>
              <div className="feature">
                <div className="feature-icon">👥</div>
                <h4>Dual Income Support</h4>
                <p>Complete household financial planning with separate calculations for partners that combine intelligently for family budgeting.</p>
              </div>
              <div className="feature">
                <div className="feature-icon">📱</div>
                <h4>Responsive Design</h4>
                <p>Works perfectly on desktop, tablet, and mobile devices with touch-friendly interfaces and adaptive layouts.</p>
              </div>
              <div className="feature">
                <div className="feature-icon">🎯</div>
                <h4>2025 Tax Accuracy</h4>
                <p>Uses current federal tax brackets, IRS withholding tables, and contribution limits for precise paycheck calculations.</p>
              </div>
              <div className="feature">
                <div className="feature-icon">💾</div>
                <h4>Advanced Data Management</h4>
                <p>CSV import/export, downloadable templates, demo data, backup/restore, and automatic data migration capabilities.</p>
              </div>
              <div className="feature">
                <div className="feature-icon">📊</div>
                <h4>Comprehensive Analytics</h4>
                <p>Interactive charts, growth metrics, performance tracking, trend analysis, and detailed financial reporting.</p>
              </div>
              <div className="feature">
                <div className="feature-icon">🔒</div>
                <h4>Complete Privacy</h4>
                <p>All data stored locally in your browser - your financial information never leaves your device or touches external servers.</p>
              </div>
              <div className="feature">
                <div className="feature-icon">⚡</div>
                <h4>Real-time Intelligence</h4>
                <p>Instant calculations, automatic synchronization, smart category management, and live budget updates across all tools.</p>
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
              <Link to="/savings" className="quick-start-button secondary">
                Track Savings Goals
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
              The demo includes a complete dual-income household with 5 years of financial history, investment tracking, and comprehensive budgeting.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Welcome;