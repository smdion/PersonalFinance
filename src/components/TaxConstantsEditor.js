import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import '../styles/base.css';
import '../styles/forms.css';
import '../styles/data-tables.css';
import '../styles/tax-constants.css';

const TaxConstantsEditor = () => {
  const [taxConstants, setTaxConstants] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState('wageTables');

  useEffect(() => {
    loadTaxConstants();
  }, []);

  const loadTaxConstants = async () => {
    try {
      const { getTaxConstants } = await import('../utils/localStorage');
      const constants = getTaxConstants();
      setTaxConstants(constants);
    } catch (error) {
      console.error('Failed to load tax constants:', error);
    }
  };

  const saveTaxConstants = async () => {
    try {
      const { setTaxConstants: saveTaxConstants } = await import('../utils/localStorage');
      saveTaxConstants(taxConstants);
      setHasChanges(false);
      alert('Tax constants saved successfully!');
    } catch (error) {
      console.error('Failed to save tax constants:', error);
      alert('Failed to save tax constants. Please try again.');
    }
  };

  const resetToDefaults = async () => {
    if (window.confirm('Are you sure you want to reset all tax constants to their default values? This will overwrite any custom changes you have made.')) {
      try {
        const defaultConstants = await import('../config/taxConstants');
        const resetConstants = {
          ANNUAL_WAGE_WITHHOLDING: defaultConstants.ANNUAL_WAGE_WITHHOLDING,
          ANNUAL_MULTIPLE_JOBS_WITHHOLDING: defaultConstants.ANNUAL_MULTIPLE_JOBS_WITHHOLDING,
          STANDARD_DEDUCTIONS: defaultConstants.STANDARD_DEDUCTIONS,
          PAYROLL_TAX_RATES: defaultConstants.PAYROLL_TAX_RATES,
          CONTRIBUTION_LIMITS: defaultConstants.CONTRIBUTION_LIMITS,
          W4_CONFIGS: defaultConstants.W4_CONFIGS,
          TAX_CREDITS: defaultConstants.TAX_CREDITS,
          ALLOWANCE_AMOUNT: defaultConstants.ALLOWANCE_AMOUNT,
          PAY_PERIODS: defaultConstants.PAY_PERIODS
        };
        setTaxConstants(resetConstants);
        setHasChanges(true);
      } catch (error) {
        console.error('Failed to reset tax constants:', error);
        alert('Failed to reset tax constants. Please try again.');
      }
    }
  };

  const updateWageTable = (tableType, filingStatus, bracketIndex, field, value) => {
    const numValue = field === 'rate' ? parseFloat(value) : parseFloat(value);
    if (isNaN(numValue)) return;

    setTaxConstants(prev => ({
      ...prev,
      [tableType]: {
        ...prev[tableType],
        [filingStatus]: prev[tableType][filingStatus].map((bracket, index) =>
          index === bracketIndex ? { ...bracket, [field]: numValue } : bracket
        )
      }
    }));
    setHasChanges(true);
  };

  const updateSimpleValue = (section, key, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    setTaxConstants(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: numValue
      }
    }));
    setHasChanges(true);
  };

  const updateSingleValue = (key, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    setTaxConstants(prev => ({
      ...prev,
      [key]: numValue
    }));
    setHasChanges(true);
  };

  const renderWageTable = (tableType, title) => {
    if (!taxConstants || !taxConstants[tableType]) return null;

    const filingStatuses = Object.keys(taxConstants[tableType]);

    return (
      <div className="tax-constants-section">
        <h3>{title}</h3>
        {filingStatuses.map(status => (
          <div key={status} className="filing-status-section">
            <h4>{status.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h4>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Threshold ($)</th>
                    <th>Base Withholding ($)</th>
                    <th>Rate (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {taxConstants[tableType][status].map((bracket, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="number"
                          value={bracket.threshold}
                          onChange={(e) => updateWageTable(tableType, status, index, 'threshold', e.target.value)}
                          className="form-input"
                          step="0.01"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={bracket.baseWithholding}
                          onChange={(e) => updateWageTable(tableType, status, index, 'baseWithholding', e.target.value)}
                          className="form-input"
                          step="0.01"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={bracket.rate * 100}
                          onChange={(e) => updateWageTable(tableType, status, index, 'rate', e.target.value / 100)}
                          className="form-input"
                          step="0.01"
                          min="0"
                          max="100"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSimpleSection = (sectionKey, title, isPercentage = false) => {
    if (!taxConstants || !taxConstants[sectionKey]) return null;

    return (
      <div className="tax-constants-section">
        <h3>{title}</h3>
        <div className="form-grid">
          {Object.entries(taxConstants[sectionKey]).map(([key, value]) => (
            <div key={key} className="form-group">
              <label className="form-label">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </label>
              <input
                type="number"
                value={isPercentage ? value * 100 : value}
                onChange={(e) => updateSimpleValue(sectionKey, key, isPercentage ? e.target.value / 100 : e.target.value)}
                className="form-input"
                step={isPercentage ? "0.01" : "1"}
                min="0"
                max={isPercentage ? "100" : undefined}
              />
              {isPercentage && <span className="input-suffix">%</span>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!taxConstants) {
    return (
      <>
        <Navigation />
        <div className="app-container">
          <div className="header">
            <h1>⚙️ Tax Constants Editor</h1>
            <p>Loading tax constants...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="app-container">
        <div className="header">
          <h1>⚙️ Tax Constants Editor</h1>
          <p>Edit annual tax constants and withholding tables. These values are typically updated each year by the IRS.</p>
        </div>

        {hasChanges && (
          <div className="alert alert-warning">
            <strong>Unsaved Changes:</strong> You have made changes that haven't been saved yet.
          </div>
        )}

        <div className="tax-constants-controls">
          <div className="section-tabs">
            <button
              className={`tab-button ${activeSection === 'wageTables' ? 'active' : ''}`}
              onClick={() => setActiveSection('wageTables')}
            >
              Wage Tables
            </button>
            <button
              className={`tab-button ${activeSection === 'deductions' ? 'active' : ''}`}
              onClick={() => setActiveSection('deductions')}
            >
              Deductions & Rates
            </button>
            <button
              className={`tab-button ${activeSection === 'limits' ? 'active' : ''}`}
              onClick={() => setActiveSection('limits')}
            >
              Contribution Limits
            </button>
            <button
              className={`tab-button ${activeSection === 'other' ? 'active' : ''}`}
              onClick={() => setActiveSection('other')}
            >
              Other Constants
            </button>
          </div>

          <div className="action-buttons">
            <button onClick={resetToDefaults} className="button button-secondary">
              Reset to Defaults
            </button>
            <button onClick={saveTaxConstants} className="button button-primary" disabled={!hasChanges}>
              Save Changes
            </button>
          </div>
        </div>

        <div className="tax-constants-content">
          {activeSection === 'wageTables' && (
            <>
              <div className="tax-constants-info">
                <h3>📋 How to Update Wage Withholding Tables</h3>
                <div className="info-card">
                  <p><strong>Source:</strong> Annual Federal Wage Withholding Tables from <strong>IRS Publication 15-T</strong> (Percentage Method for Automated Payroll Systems)</p>
                  <p><strong>Where to find it:</strong></p>
                  <ul>
                    <li>Download <a href="https://www.irs.gov/pub/irs-pdf/p15t.pdf" target="_blank" rel="noopener noreferrer">IRS.gov Publication 15-T (PDF)</a></li>
                  </ul>
                  <p><strong>What to look for:</strong></p>
                  <ul>
                    <li><strong>Method:</strong> "Percentage Method Tables for Automated Payroll Systems and Withholding on Periodic Payments of Pensions and Annuities"</li>
                    <li>Tables are organized by filing status (Single, Married Filing Jointly, Married Filing Separately, Head of Household)</li>
                    <li>Each table shows wage brackets with corresponding base withholding amounts and marginal rates</li>
                  </ul>
                  <p><strong>When to update:</strong> Annually, typically in December for the following tax year or when the new 15-T is available.</p>
                </div>
              </div>
              {renderWageTable('ANNUAL_WAGE_WITHHOLDING', 'Annual Wage Withholding Tables (Standard Method)')}
              {renderWageTable('ANNUAL_MULTIPLE_JOBS_WITHHOLDING', 'Annual Multiple Jobs Withholding Tables')}
            </>
          )}

          {activeSection === 'deductions' && (
            <>
              {renderSimpleSection('STANDARD_DEDUCTIONS', 'Standard Deductions')}
              {renderSimpleSection('PAYROLL_TAX_RATES', 'Payroll Tax Rates', true)}
              {renderSimpleSection('TAX_CREDITS', 'Tax Credits')}
              <div className="tax-constants-section">
                <h3>Allowance Amount</h3>
                <div className="form-group">
                  <label className="form-label">Allowance Amount (Pre-2020 W-4)</label>
                  <input
                    type="number"
                    value={taxConstants.ALLOWANCE_AMOUNT}
                    onChange={(e) => updateSingleValue('ALLOWANCE_AMOUNT', e.target.value)}
                    className="form-input"
                    step="1"
                    min="0"
                  />
                </div>
              </div>
            </>
          )}

          {activeSection === 'limits' && (
            <>
              {renderSimpleSection('CONTRIBUTION_LIMITS', 'Annual Contribution Limits')}
            </>
          )}

          {activeSection === 'other' && (
            <div className="tax-constants-section">
              <h3>W-4 Form Configurations</h3>
              <div className="w4-configs">
                {Object.entries(taxConstants.W4_CONFIGS).map(([key, config]) => (
                  <div key={key} className="w4-config-card">
                    <h4>{config.name}</h4>
                    <div className="config-details">
                      <p><strong>Allowances:</strong> {config.allowances ? 'Yes' : 'No'}</p>
                      <p><strong>Extra Withholding:</strong> {config.extraWithholding ? 'Yes' : 'No'}</p>
                      <p><strong>Dependent Credits:</strong> {config.dependentCredits ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                ))}
              </div>

              <h3>Pay Period Configurations</h3>
              <div className="pay-periods">
                {Object.entries(taxConstants.PAY_PERIODS).map(([key, period]) => (
                  <div key={key} className="pay-period-card">
                    <h4>{period.name}</h4>
                    <p><strong>Periods Per Year:</strong> {period.periodsPerYear}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TaxConstantsEditor;