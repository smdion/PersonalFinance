import React, { useState, useEffect } from 'react';
import { formatCurrency, calculateYTDIncome, calculateProjectedAnnualIncome, calculateYTDContributionsFromPerformance } from '../utils/calculationHelpers';
import { getPerformanceData } from '../utils/localStorage';
import '../styles/ytd-income.css';

const YTDIncomeTracker = ({ 
  personName, 
  incomePeriodsData = [], 
  onUpdateIncomePeriods, 
  currentSalary,
  userNames = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [incomePeriods, setIncomePeriods] = useState(incomePeriodsData);
  const [performanceData, setPerformanceData] = useState({});

  // Update local state when props change
  useEffect(() => {
    setIncomePeriods(incomePeriodsData);
  }, [incomePeriodsData]);

  // Load performance data to calculate YTD contributions
  useEffect(() => {
    const data = getPerformanceData();
    setPerformanceData(data);
    
    // Listen for performance data updates
    const handlePerformanceUpdate = () => {
      const updatedData = getPerformanceData();
      setPerformanceData(updatedData);
    };

    window.addEventListener('performanceDataUpdated', handlePerformanceUpdate);
    return () => window.removeEventListener('performanceDataUpdated', handlePerformanceUpdate);
  }, []);

  const addIncomePeriod = () => {
    const currentYear = new Date().getFullYear();
    const newPeriod = {
      id: Date.now(),
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear}-12-31`,
      grossSalary: currentSalary || 0,
      description: 'Salary Period'
    };
    
    const updatedPeriods = [...incomePeriods, newPeriod];
    setIncomePeriods(updatedPeriods);
    onUpdateIncomePeriods(updatedPeriods);
  };

  const updateIncomePeriod = (id, field, value) => {
    const updatedPeriods = incomePeriods.map(period => 
      period.id === id ? { ...period, [field]: value } : period
    );
    setIncomePeriods(updatedPeriods);
    onUpdateIncomePeriods(updatedPeriods);
  };

  const removeIncomePeriod = (id) => {
    const updatedPeriods = incomePeriods.filter(period => period.id !== id);
    setIncomePeriods(updatedPeriods);
    onUpdateIncomePeriods(updatedPeriods);
  };

  const ytdIncome = calculateYTDIncome(incomePeriods);
  const projectedAnnualIncome = calculateProjectedAnnualIncome(incomePeriods, currentSalary);
  
  // Calculate YTD contributions from Performance data
  const ytdContributions = calculateYTDContributionsFromPerformance(performanceData, userNames);

  return (
    <div className="ytd-income-tracker">
      <div className="ytd-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>
          <span className="ytd-icon">📈</span>
          YTD Income Tracker - {personName}
        </h3>
        <div className="ytd-summary">
          <span className="ytd-amount">YTD: {formatCurrency(ytdIncome)}</span>
          <span className="projected-amount">Projected: {formatCurrency(projectedAnnualIncome)}</span>
          <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
        </div>
      </div>

      {isExpanded && (
        <div className="ytd-content">
          {/* Income Periods Section */}
          <div className="ytd-section">
            <div className="ytd-section-header">
              <h4>Income Periods</h4>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={addIncomePeriod}
              >
                + Add Period
              </button>
            </div>

            {incomePeriods.length === 0 ? (
              <div className="ytd-empty-state">
                <p>No income periods defined. Add periods to track actual vs projected income.</p>
              </div>
            ) : (
              <div className="income-periods-list">
                {incomePeriods.map((period) => (
                  <div key={period.id} className="income-period-card">
                    <div className="income-period-row">
                      <div className="income-period-field">
                        <label>Description</label>
                        <input
                          type="text"
                          value={period.description || ''}
                          onChange={(e) => updateIncomePeriod(period.id, 'description', e.target.value)}
                          placeholder="e.g., Base Salary, Promotion, New Job"
                        />
                      </div>
                      <div className="income-period-field">
                        <label>Start Date</label>
                        <input
                          type="date"
                          value={period.startDate || ''}
                          onChange={(e) => updateIncomePeriod(period.id, 'startDate', e.target.value)}
                        />
                      </div>
                      <div className="income-period-field">
                        <label>End Date</label>
                        <input
                          type="date"
                          value={period.endDate || ''}
                          onChange={(e) => updateIncomePeriod(period.id, 'endDate', e.target.value)}
                        />
                      </div>
                      <div className="income-period-field">
                        <label>Annual Gross Salary</label>
                        <input
                          type="number"
                          value={period.grossSalary || ''}
                          onChange={(e) => updateIncomePeriod(period.id, 'grossSalary', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={() => removeIncomePeriod(period.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* YTD Contributions Section (from Performance data) */}
          <div className="ytd-section">
            <h4>YTD Contributions (from Performance Tracker)</h4>
            <div className="ytd-contributions-grid">
              <div className="ytd-contribution-display">
                <label>Traditional 401(k)</label>
                <span className="ytd-value">{formatCurrency(ytdContributions.traditional401k)}</span>
              </div>
              <div className="ytd-contribution-display">
                <label>Roth 401(k)</label>
                <span className="ytd-value">{formatCurrency(ytdContributions.roth401k)}</span>
              </div>
              <div className="ytd-contribution-display">
                <label>Traditional IRA</label>
                <span className="ytd-value">{formatCurrency(ytdContributions.traditionalIra)}</span>
              </div>
              <div className="ytd-contribution-display">
                <label>Roth IRA</label>
                <span className="ytd-value">{formatCurrency(ytdContributions.rothIra)}</span>
              </div>
              <div className="ytd-contribution-display">
                <label>HSA</label>
                <span className="ytd-value">{formatCurrency(ytdContributions.hsa)}</span>
              </div>
              <div className="ytd-contribution-display">
                <label>Total Employee Contributions</label>
                <span className="ytd-value total">{formatCurrency(ytdContributions.totalContributions)}</span>
              </div>
              <div className="ytd-contribution-display">
                <label>Total Employer Match</label>
                <span className="ytd-value total">{formatCurrency(ytdContributions.totalEmployerMatch)}</span>
              </div>
            </div>
            
            {ytdContributions.totalContributions === 0 && (
              <div className="ytd-no-data">
                <p>No YTD contribution data found. Add your account contributions in the Performance Tracker to see actual YTD amounts.</p>
              </div>
            )}
          </div>

          {/* Summary Section */}
          <div className="ytd-section ytd-summary-section">
            <h4>Income Summary</h4>
            <div className="ytd-summary-grid">
              <div className="ytd-summary-item">
                <span className="label">YTD Income:</span>
                <span className="value">{formatCurrency(ytdIncome)}</span>
              </div>
              <div className="ytd-summary-item">
                <span className="label">Projected Annual Income:</span>
                <span className="value">{formatCurrency(projectedAnnualIncome)}</span>
              </div>
              <div className="ytd-summary-item">
                <span className="label">Current Calculator Salary:</span>
                <span className="value">{formatCurrency(currentSalary || 0)}</span>
              </div>
              <div className="ytd-summary-item">
                <span className="label">Difference:</span>
                <span className={`value ${projectedAnnualIncome - (currentSalary || 0) >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(projectedAnnualIncome - (currentSalary || 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YTDIncomeTracker;