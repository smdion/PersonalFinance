import React, { useEffect, useState, useCallback } from 'react';
import { W4_CONFIGS, CONTRIBUTION_LIMITS_2025, PAY_PERIODS } from '../config/taxConstants';
import { getAppSettings, setAppSettings } from '../utils/localStorage';
import { 
  calculatePercentageOfMax,
  formatCurrency,
  formatSalaryDisplay,
  formatDeductionDisplay,
  formatPercentageDisplay,
  calculateAge,
  calculateRequired401kPercentage,
  calculateRequiredIraContribution,
  calculateRequiredHsaContribution,
  calculateRequiredHsaPerPaycheckContribution
} from '../utils/calculationHelpers';

const PaycheckForm = ({ 
  personName,
  name, setName,
  employer, setEmployer,
  birthday, setBirthday,
  salary, setSalary,
  payPeriod, setPayPeriod,
  filingStatus, setFilingStatus,
  w4Type, setW4Type,
  w4Options, setW4Options,
  retirementOptions, setRetirementOptions,
  medicalDeductions, setMedicalDeductions,
  esppDeductionPercent, setEsppDeductionPercent,
  budgetImpacting, setBudgetImpacting,
  onAddBrokerageAccount,
  onUpdateBrokerageAccount,
  onRemoveBrokerageAccount,
  bonusMultiplier, setBonusMultiplier, 
  bonusTarget, setBonusTarget, 
  onCalculate,
  results,
  globalSectionControl,
  payWeekType, setPayWeekType,
  hsaCoverageType, setHsaCoverageType
}) => {

  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    retirement: false,
    medical: false,
    postTax: false,
    w4: false,
    budget: false,
    bonus: false
  });

  // Add effect to respond to global section control
  useEffect(() => {
    if (globalSectionControl === 'expand') {
      setExpandedSections({
        basic: true,
        retirement: true,
        medical: true,
        postTax: true,
        w4: true,
        budget: true,
        bonus: true
      });
    } else if (globalSectionControl === 'collapse') {
      setExpandedSections({
        basic: false,
        retirement: false,
        medical: false,
        postTax: false,
        w4: false,
        budget: false,
        bonus: false
      });
    }
  }, [globalSectionControl]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Auto-calculate whenever any input changes
  const handleAutoCalculate = useCallback(() => {
    const annualSalary = parseFloat(salary);

    // Only calculate if we have a valid salary
    if (!isNaN(annualSalary) && annualSalary > 0) {
      onCalculate();
    }
  }, [salary, payPeriod, filingStatus, w4Type, w4Options, retirementOptions, medicalDeductions, esppDeductionPercent]);

  useEffect(() => {
    handleAutoCalculate();
  }, [handleAutoCalculate]);

  const handleW4OptionChange = (field, value) => {
    if (field === 'multipleJobs') {
      setW4Options(prev => ({
        ...prev,
        [field]: value
      }));
    } else {
      // Remove currency formatting and non-numeric characters except decimal point
      const rawValue = typeof value === 'string' ? value.replace(/[$,]/g, '') : value;
      setW4Options(prev => ({
        ...prev,
        [field]: parseFloat(rawValue) || 0
      }));
    }
  };

  const handleRetirementOptionChange = (field, value) => {
    if (field === 'isOver50') {
      setRetirementOptions(prev => ({
        ...prev,
        [field]: value
      }));
    } else {
      // Remove percentage sign and convert to number
      const rawValue = typeof value === 'string' ? value.replace(/%/g, '') : value;
      setRetirementOptions(prev => ({
        ...prev,
        [field]: parseFloat(rawValue) || 0
      }));
    }
  };

  // Consolidated medical deduction handler
  const handleMedicalDeductionChange = (field, value) => {
    const rawValue = value.replace(/[$,]/g, '');
    setMedicalDeductions(prev => ({
      ...prev,
      [field]: parseFloat(rawValue) || 0
    }));
  };

  const handleEsppChange = (value) => {
    // Remove percentage sign and convert to number
    const rawValue = typeof value === 'string' ? value.replace(/%/g, '') : value;
    setEsppDeductionPercent(parseFloat(rawValue) || 0);
  };

  const handleBudgetImpactingChange = (field, value) => {
    const rawValue = value.replace(/[$,]/g, '');
    setBudgetImpacting(prev => ({
      ...prev,
      [field]: parseFloat(rawValue) || 0
    }));
  };

  const handleSalaryChange = (e) => {
    // Remove currency formatting and non-numeric characters except decimal point
    const rawValue = e.target.value.replace(/[$,]/g, '');
    setSalary(rawValue);
  };

  const SectionHeader = ({ title, section, subtitle, badge }) => {
    return (
      <div 
        className="section-header"
        onClick={(e) => {
          e.preventDefault();
          toggleSection(section);
        }}
      >
        <div className="section-title">
          <div>
            <h3>{title}</h3>
            {subtitle && (
              <div className="section-subtitle">{subtitle}</div>
            )}
          </div>
          {badge && (
            <span className="section-badge">{badge}</span>
          )}
        </div>
      </div>
    );
  };

  const [isHsaOver55, setIsHsaOver55] = useState(false); // Add state for HSA age 55+ checkbox
  const [isIraOver50, setIsIraOver50] = useState(false); // Add state for IRA age 50+ checkbox
  const [remove401kFromBonus, setRemove401kFromBonus] = useState(false); // Add state for the checkbox
  const [overrideBonus, setOverrideBonus] = useState(''); // Add state for overriding bonus
  const [noBonusExpected, setNoBonusExpected] = useState(false); // Add state for no bonus checkbox
  const [showBudgetExplanation, setShowBudgetExplanation] = useState(false); // Add state for budget explanation
  const [showMonthlyView, setShowMonthlyView] = useState(true); // Add state for monthly/pay period toggle

  const handleHsaCoverageToggle = (type) => {
    setHsaCoverageType(type);
    
    // Clear HSA contribution values when "No HSA Coverage" is selected
    if (type === 'none') {
      setMedicalDeductions(prev => ({
        ...prev,
        hsa: 0,
        employerHsa: 0
      }));
    }
  };

  const calculateBonus = () => {
    const annualSalary = parseFloat(salary) || 0;
    return (annualSalary * bonusMultiplier * bonusTarget) / 10000; // Update calculation to include bonusTarget
  };

  const getEffectiveBonus = () => {
    const overrideValue = parseFloat(overrideBonus);
    return !isNaN(overrideValue) && overrideValue > 0 ? overrideValue : calculateBonus();
  };

  const handleNoBonusToggle = (checked) => {
    setNoBonusExpected(checked);
    if (checked) {
      setBonusMultiplier(0);
      setBonusTarget(0);
      setOverrideBonus('');
      setRemove401kFromBonus(false);
    }
  };

  // Consolidated age-related effects
  useEffect(() => {
    const age = calculateAge(birthday);
    
    // Update retirement age flags
    const isOver50 = age >= 50;
    setRetirementOptions((prev) => ({ ...prev, isOver50 }));
    setIsIraOver50(isOver50);
    
    // Update HSA age flag
    setIsHsaOver55(age >= 55);
  }, [birthday, setRetirementOptions]);

  const calculateBonusAfterTax = () => {
    const bonus = getEffectiveBonus();
    const taxRate = results?.effectiveTaxRate || 0;
    return bonus - (bonus * (taxRate / 100));
  };

  const calculateBonusAfter401k = () => {
    const bonus = getEffectiveBonus();
    if (remove401kFromBonus) {
      const traditional401kPercent = retirementOptions.traditional401kPercent || 0;
      const roth401kPercent = retirementOptions.roth401kPercent || 0;
      const total401kPercent = traditional401kPercent + roth401kPercent;
      return bonus - (bonus * (total401kPercent / 100));
    }
    return bonus;
  };

  const calculateBonusAfterTaxAnd401k = () => {
    const bonusAfter401k = calculateBonusAfter401k();
    const taxRate = results?.effectiveTaxRate || 0;
    return bonusAfter401k - (bonusAfter401k * (taxRate / 100));
  };

  // Add the missing calculateTotalMonthlyBudget function
  const calculateTotalMonthlyBudget = () => {
    const iraTotal = (budgetImpacting.traditionalIraMonthly || 0) + (budgetImpacting.rothIraMonthly || 0);
    const brokerageTotal = (budgetImpacting.brokerageAccounts || []).reduce((sum, account) => sum + (account.monthlyAmount || 0), 0);
    return iraTotal + brokerageTotal;
  };

  return (
    <div className="calculator-card">
      <div className="calculator-header">
        <h2>💼 {name || personName} Paycheck Calculator</h2>
      </div>
      
      <div className="calculator-body">
        {/* Basic Information */}
        <div>
          <SectionHeader title="👤 Basic Information" section="basic" />
          
          {expandedSections.basic && (
            <div className="section-content">
              <div className="form-grid form-grid-3">
                <div className="form-group">
                  <label htmlFor={`name-${personName}`} className="form-label">Name:</label>
                  <input
                    type="text"
                    id={`name-${personName}`}
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`employer-${personName}`} className="form-label">Employer:</label>
                  <input
                    type="text"
                    id={`employer-${personName}`}
                    className="form-input"
                    value={employer}
                    onChange={(e) => setEmployer(e.target.value)}
                    placeholder="Enter employer name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`birthday-${personName}`} className="form-label">Birthday:</label>
                  <input
                    type="date"
                    id={`birthday-${personName}`}
                    className="form-input"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label htmlFor={`payPeriod-${personName}`} className="form-label">Pay Period:</label>
                  <select
                    id={`payPeriod-${personName}`}
                    className="form-select"
                    value={payPeriod}
                    onChange={(e) => setPayPeriod(e.target.value)}
                  >
                    {Object.entries(PAY_PERIODS).map(([key, period]) => (
                      <option key={key} value={key}>{period.name}</option>
                    ))}
                  </select>
                </div>

                {payPeriod === 'biWeekly' && (
                  <div className="form-group">
                    <label htmlFor={`payWeekType-${personName}`} className="form-label">Bi-Weekly Type:</label>
                    <select
                      id={`payWeekType-${personName}`}
                      className="form-select"
                      value={payWeekType}
                      onChange={(e) => setPayWeekType(e.target.value)}
                    >
                      <option value="even">Even Weeks</option>
                      <option value="odd">Odd Weeks</option>
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor={`filingStatus-${personName}`} className="form-label">Filing Status:</label>
                  <select
                    id={`filingStatus-${personName}`}
                    className="form-select"
                    value={filingStatus}
                    onChange={(e) => setFilingStatus(e.target.value)}
                  >
                    <option value="single">Single</option>
                    <option value="marriedJointly">Married Filing Jointly</option>
                    <option value="marriedSeparately">Married Filing Separately</option>
                    <option value="headOfHousehold">Head of Household</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor={`salary-${personName}`} className="form-label">Annual Salary:</label>
                <input
                  type="text"
                  id={`salary-${personName}`}
                  className="form-input"
                  value={salary ? formatSalaryDisplay(salary) : ''}
                  onChange={handleSalaryChange}
                  placeholder="Enter annual salary"
                />
                {/* Remove per pay period display but keep calculation in backend */}
              </div>
            </div>
          )}
        </div>

        {/* 401k Retirement Section */}
        <div>
          <SectionHeader 
            title="🏦 401k Retirement" 
            section="retirement"
            subtitle="Traditional & Roth Contributions"
            badge={(retirementOptions.traditional401kPercent + retirementOptions.roth401kPercent) > 0 ? 
              `${(retirementOptions.traditional401kPercent + retirementOptions.roth401kPercent).toFixed(1)}%` : null}
          />
          
          {expandedSections.retirement && (
            <div className="section-content">
              <div className="checkbox-wrapper" style={{ justifyContent: 'flex-start' }}>
                <input
                  type="checkbox"
                  className="modern-checkbox"
                  checked={retirementOptions.isOver50}
                  onChange={(e) => handleRetirementOptionChange('isOver50', e.target.checked)}
                />
                <span className="form-label">
                  Age 50+ Catch-up Contribution (+{formatCurrency(CONTRIBUTION_LIMITS_2025.k401_catchUp)})
                </span>
              </div>

              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label htmlFor={`traditional401kPercent-${personName}`} className="form-label">
                    Traditional 401k (Pre-tax) %:
                  </label>
                  <input
                    type="text"
                    id={`traditional401kPercent-${personName}`}
                    className="form-input"
                    value={formatPercentageDisplay(retirementOptions.traditional401kPercent)}
                    onChange={(e) => handleRetirementOptionChange('traditional401kPercent', e.target.value)}
                    placeholder="Percentage of pay"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`roth401kPercent-${personName}`} className="form-label">
                    Roth 401k (After-tax) %:
                  </label>
                  <input
                    type="text"
                    id={`roth401kPercent-${personName}`}
                    className="form-input"
                    value={formatPercentageDisplay(retirementOptions.roth401kPercent)}
                    onChange={(e) => handleRetirementOptionChange('roth401kPercent', e.target.value)}
                    placeholder="Percentage of pay"
                  />
                </div>
              </div>

              {((retirementOptions.traditional401kPercent + retirementOptions.roth401kPercent) > 0 && salary && !isNaN(parseFloat(salary))) && (
                <div className="calculation-hint">
                  <div><strong>401k Contribution Summary:</strong></div>
                  <div>Maximum Annual Contribution: {formatCurrency(
                    retirementOptions.isOver50
                      ? CONTRIBUTION_LIMITS_2025.k401_employee + CONTRIBUTION_LIMITS_2025.k401_catchUp
                      : CONTRIBUTION_LIMITS_2025.k401_employee
                  )}</div>
                  <div>Your Annual Contribution: {formatCurrency(
                    salary * ((retirementOptions.traditional401kPercent + retirementOptions.roth401kPercent) / 100)
                  )}</div>
                  <div>Percentage Of IRS Max (Traditional + Roth): {calculatePercentageOfMax(
                    salary * ((retirementOptions.traditional401kPercent + retirementOptions.roth401kPercent) / 100),
                    retirementOptions.isOver50
                      ? CONTRIBUTION_LIMITS_2025.k401_employee + CONTRIBUTION_LIMITS_2025.k401_catchUp
                      : CONTRIBUTION_LIMITS_2025.k401_employee
                  )}</div>
                  <div>Required Percentage to Max Out: {calculateRequired401kPercentage(parseFloat(salary) || 0, retirementOptions.isOver50)}%</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Medical Deductions Section */}
        <div>
          <SectionHeader 
            title="🏥 Medical Pre-Tax Deductions"
            section="medical"
            subtitle="Medical, Health Insurance & HSA"
            badge={(() => {
              const nonHsaDeductions = Object.entries(medicalDeductions)
                .filter(([key, value]) => key !== 'hsa' && key !== 'employerHsa' && value > 0)
                .reduce((sum, [, value]) => sum + value, 0);
              const hsaDeductions = hsaCoverageType !== 'none' ? (medicalDeductions.hsa || 0) : 0;
              const totalDeductions = nonHsaDeductions + hsaDeductions;
              return totalDeductions > 0 ? formatCurrency(totalDeductions) : null;
            })()}
          />
          
          {expandedSections.medical && (
            <div className="section-content">
              <div className="medical-deduction-grid">
                <div className="medical-deduction-item">
                  <label htmlFor={`medical-${personName}`}>Medical Insurance:</label>
                  <input
                    type="text"
                    id={`medical-${personName}`}
                    value={formatDeductionDisplay(medicalDeductions.medical)}
                    onChange={(e) => handleMedicalDeductionChange('medical', e.target.value)}
                    placeholder="$0.00"
                  />
                </div>

                <div className="medical-deduction-item">
                  <label htmlFor={`dental-${personName}`}>Dental Insurance:</label>
                  <input
                    type="text"
                    id={`dental-${personName}`}
                    value={formatDeductionDisplay(medicalDeductions.dental)}
                    onChange={(e) => handleMedicalDeductionChange('dental', e.target.value)}
                    placeholder="$0.00"
                  />
                </div>

                <div className="medical-deduction-item">
                  <label htmlFor={`vision-${personName}`}>Vision Insurance:</label>
                  <input
                    type="text"
                    id={`vision-${personName}`}
                    value={formatDeductionDisplay(medicalDeductions.vision)}
                    onChange={(e) => handleMedicalDeductionChange('vision', e.target.value)}
                    placeholder="$0.00"
                  />
                </div>

                <div className="medical-deduction-item">
                  <label htmlFor={`shortTermDisability-${personName}`}>Short Term Disability:</label>
                  <input
                    type="text"
                    id={`shortTermDisability-${personName}`}
                    value={formatDeductionDisplay(medicalDeductions.shortTermDisability)}
                    onChange={(e) => handleMedicalDeductionChange('shortTermDisability', e.target.value)}
                    placeholder="$0.00"
                  />
                </div>

                <div className="medical-deduction-item">
                  <label htmlFor={`longTermDisability-${personName}`}>Long Term Disability:</label>
                  <input
                    type="text"
                    id={`longTermDisability-${personName}`}
                    value={formatDeductionDisplay(medicalDeductions.longTermDisability)}
                    onChange={(e) => handleMedicalDeductionChange('longTermDisability', e.target.value)}
                    placeholder="$0.00"
                  />
                </div>
              </div>

              {/* HSA Section with better readability */}
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">HSA Coverage Type:</label>
                <div className="hsa-toggle-buttons">
                  <button
                    onClick={() => handleHsaCoverageToggle('none')}
                    className={`hsa-toggle-button ${hsaCoverageType === 'none' ? 'active' : ''}`}
                  >
                    No HSA Coverage
                  </button>
                  <button
                    onClick={() => handleHsaCoverageToggle('self')}
                    className={`hsa-toggle-button ${hsaCoverageType === 'self' ? 'active' : ''}`}
                  >
                    Self-Only Coverage
                    <div style={{ fontSize: '0.85rem', marginTop: '2px' }}>
                      (${CONTRIBUTION_LIMITS_2025.hsa_self.toLocaleString()} Annually)
                    </div>
                  </button>
                  <button
                    onClick={() => handleHsaCoverageToggle('family')}
                    className={`hsa-toggle-button ${hsaCoverageType === 'family' ? 'active' : ''}`}
                  >
                    Family Coverage
                    <div style={{ fontSize: '0.85rem', marginTop: '2px' }}>
                      (${CONTRIBUTION_LIMITS_2025.hsa_family.toLocaleString()} Annually)
                    </div>
                  </button>
                </div>
              </div>

              {hsaCoverageType !== 'none' && (
                <>
                  <div style={{ marginBottom: '20px' }}>
                    <div className="checkbox-wrapper" style={{ justifyContent: 'flex-start' }}>
                      <input
                        type="checkbox"
                        className="modern-checkbox"
                        checked={isHsaOver55}
                        onChange={(e) => setIsHsaOver55(e.target.checked)}
                      />
                      <span className="form-label">
                        Age 55+ Catch-up Contribution (+{formatCurrency(CONTRIBUTION_LIMITS_2025.hsa_catchUp)})
                      </span>
                    </div>
                  </div>

                  <div className="form-grid form-grid-2">
                    <div className="form-group">
                      <label htmlFor={`hsa-${personName}`} className="form-label">
                        Your HSA Contribution (Per Paycheck):
                      </label>
                      <input
                        type="text"
                        id={`hsa-${personName}`}
                        className="form-input"
                        value={formatDeductionDisplay(medicalDeductions.hsa)}
                        onChange={(e) => handleMedicalDeductionChange('hsa', e.target.value)}
                        placeholder="$0.00"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor={`employerHsa-${personName}`} className="form-label">
                        Employer HSA Contribution (Annual):
                      </label>
                      <input
                        type="text"
                        id={`employerHsa-${personName}`}
                        className="form-input"
                        value={formatDeductionDisplay(medicalDeductions.employerHsa || 0)}
                        onChange={(e) => handleMedicalDeductionChange('employerHsa', e.target.value)}
                        placeholder="$0.00"
                      />
                    </div>
                  </div>

                  {(medicalDeductions.hsa > 0 || medicalDeductions.employerHsa > 0) && (
                    <div className="calculation-hint">
                      <div><strong>HSA Contribution Summary:</strong></div>
                      <div>Maximum Annual Contribution: {formatCurrency(
                        hsaCoverageType === 'self'
                          ? CONTRIBUTION_LIMITS_2025.hsa_self + (isHsaOver55 ? CONTRIBUTION_LIMITS_2025.hsa_catchUp : 0)
                          : CONTRIBUTION_LIMITS_2025.hsa_family + (isHsaOver55 ? CONTRIBUTION_LIMITS_2025.hsa_catchUp : 0)
                      )}</div>
                      <div>Your Annual Contribution: {formatCurrency(
                        (medicalDeductions.hsa * PAY_PERIODS[payPeriod].periodsPerYear) + (medicalDeductions.employerHsa || 0)
                      )}</div>
                      <div>Percentage of Maximum: {(
                        ((medicalDeductions.hsa * PAY_PERIODS[payPeriod].periodsPerYear) + (medicalDeductions.employerHsa || 0)) /
                        (hsaCoverageType === 'self'
                          ? CONTRIBUTION_LIMITS_2025.hsa_self + (isHsaOver55 ? CONTRIBUTION_LIMITS_2025.hsa_catchUp : 0)
                          : CONTRIBUTION_LIMITS_2025.hsa_family + (isHsaOver55 ? CONTRIBUTION_LIMITS_2025.hsa_catchUp : 0)
                        ) * 100
                      ).toFixed(1)}%</div>
                      <div>Required Per Paycheck to Max Out: ${calculateRequiredHsaPerPaycheckContribution(hsaCoverageType, payPeriod, medicalDeductions.employerHsa || 0, isHsaOver55)}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Other Post-Tax Deductions Section */}
        <div>
          <SectionHeader 
            title="💳 Other Post-Tax Deductions" 
            section="postTax"
            subtitle="After-Tax Deductions (ESPP, etc.)"
            badge={
              esppDeductionPercent > 0 && salary && !isNaN(parseFloat(salary))
                ? `$${((parseFloat(salary) * (esppDeductionPercent / 100) / PAY_PERIODS[payPeriod].periodsPerYear).toFixed(2))}`
                : null
            }
          />
          
          {expandedSections.postTax && (
            <div className="section-content">
              <div className="form-group">
                <label htmlFor={`espp-${personName}`} className="form-label">
                  ESPP Contribution (% of Salary):
                </label>
                <input
                  type="text"
                  id={`espp-${personName}`}
                  className="form-input"
                  value={formatPercentageDisplay(esppDeductionPercent)}
                  onChange={(e) => handleEsppChange(e.target.value)}
                  placeholder="Enter ESPP percentage"
                />
              </div>

              {esppDeductionPercent > 0 && salary && !isNaN(parseFloat(salary)) && (
                <>
                  <div className="form-hint">
                    Annual ESPP Contribution: {formatCurrency(parseFloat(salary) * (esppDeductionPercent / 100))}
                  </div>
                  <div className="form-hint">
                    Per Pay Period ESPP Contribution: {formatCurrency(parseFloat(salary) * (esppDeductionPercent / 100) / PAY_PERIODS[payPeriod].periodsPerYear)}
                  </div>
                  <div className="calculation-hint">
                    <div><strong>ESPP Contribution Summary:</strong></div>
                    <div>Typical ESPP Limit: 15% Of Annual Salary (Most Plans)</div>
                    <div>Your Annual Contribution: {formatCurrency(parseFloat(salary) * (esppDeductionPercent / 100))}</div>
                    <div>Your Contribution Percentage: {esppDeductionPercent.toFixed(1)}%</div>
                    <div>Per Pay Period Contribution: {formatCurrency(parseFloat(salary) * (esppDeductionPercent / 100) / PAY_PERIODS[payPeriod].periodsPerYear)}</div>
                    <div>Annual Purchase Limit (IRS): {formatCurrency(25000)} Worth Of Stock</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Budget Section */}
        <div>
          <SectionHeader 
            title="💰 Budget Impacting Contributions" 
            section="budget"
            subtitle="IRA and Brokerage Contributions"
            badge={calculateTotalMonthlyBudget() > 0 ? formatCurrency(calculateTotalMonthlyBudget()) : null}
          />
          
          {expandedSections.budget && (
            <div className="section-content">
              <div style={{ marginBottom: '20px' }}>
                <div className="checkbox-wrapper" style={{ justifyContent: 'flex-start' }}>
                  <input
                    type="checkbox"
                    className="modern-checkbox"
                    checked={isIraOver50}
                    onChange={(e) => setIsIraOver50(e.target.checked)}
                  />
                  <span className="form-label">
                    Age 50+ Catch-up Contribution (+{formatCurrency(CONTRIBUTION_LIMITS_2025.ira_catchUp)})
                  </span>
                </div>
              </div>

              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label htmlFor={`traditionalIraMonthly-${personName}`} className="form-label">
                    Traditional IRA (Monthly):
                  </label>
                  <input
                    type="text"
                    id={`traditionalIraMonthly-${personName}`}
                    className="form-input"
                    value={formatCurrency(budgetImpacting.traditionalIraMonthly || 0)}
                    onChange={(e) => handleBudgetImpactingChange('traditionalIraMonthly', e.target.value)}
                    placeholder="$0.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`rothIraMonthly-${personName}`} className="form-label">
                    Roth IRA (Monthly):
                  </label>
                  <input
                    type="text"
                    id={`rothIraMonthly-${personName}`}
                    className="form-input"
                    value={formatCurrency(budgetImpacting.rothIraMonthly || 0)}
                    onChange={(e) => handleBudgetImpactingChange('rothIraMonthly', e.target.value)}
                    placeholder="$0.00"
                  />
                </div>

                {/* Dynamic Brokerage Accounts */}
                <div className="brokerage-accounts-section">
                  <div className="brokerage-accounts-header">
                    <label className="form-label">Brokerage Accounts (Monthly):</label>
                    <button 
                      type="button"
                      onClick={() => onAddBrokerageAccount(personName)}
                      className="btn-secondary btn-sm"
                    >
                      ➕ Add Brokerage Account
                    </button>
                  </div>
                  
                  {budgetImpacting.brokerageAccounts && budgetImpacting.brokerageAccounts.map((account, index) => (
                    <div key={account.id} className="brokerage-account-item">
                      <div className="form-group">
                        <input
                          type="text"
                          className="form-input"
                          value={account.name}
                          onChange={(e) => onUpdateBrokerageAccount(personName, account.id, 'name', e.target.value)}
                          placeholder="Account name"
                        />
                      </div>
                      <div className="form-group">
                        <input
                          type="text"
                          className="form-input"
                          value={formatCurrency(account.monthlyAmount)}
                          onChange={(e) => {
                            const rawValue = e.target.value.replace(/[$,]/g, '');
                            onUpdateBrokerageAccount(personName, account.id, 'monthlyAmount', parseFloat(rawValue) || 0);
                          }}
                          placeholder="$0.00"
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={() => onRemoveBrokerageAccount(personName, account.id)}
                        className="btn-danger btn-sm"
                        title="Remove this brokerage account"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                  
                  {(!budgetImpacting.brokerageAccounts || budgetImpacting.brokerageAccounts.length === 0) && (
                    <div className="no-brokerage-accounts">
                      <p>No brokerage accounts added. Click "Add Brokerage Account" to add your first one.</p>
                    </div>
                  )}
                </div>
              </div>

              {(budgetImpacting.traditionalIraMonthly > 0 || budgetImpacting.rothIraMonthly > 0) && (
                <div className="calculation-hint">
                  <div><strong>IRA Contribution Summary:</strong></div>
                  <div>Maximum Annual IRA Contribution: {formatCurrency(
                    isIraOver50
                      ? CONTRIBUTION_LIMITS_2025.ira_self + CONTRIBUTION_LIMITS_2025.ira_catchUp
                      : CONTRIBUTION_LIMITS_2025.ira_self
                  )}</div>
                  <div>Your Annual IRA Contribution: {formatCurrency(
                    (budgetImpacting.traditionalIraMonthly + budgetImpacting.rothIraMonthly) * 12
                  )}</div>
                  <div>Percentage of Maximum: {calculatePercentageOfMax(
                    (budgetImpacting.traditionalIraMonthly + budgetImpacting.rothIraMonthly) * 12,
                    isIraOver50
                      ? CONTRIBUTION_LIMITS_2025.ira_self + CONTRIBUTION_LIMITS_2025.ira_catchUp
                      : CONTRIBUTION_LIMITS_2025.ira_self
                  )}</div>
                  <div>Required Monthly to Max Out: ${calculateRequiredIraContribution(isIraOver50)}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bonus Section */}
        <div>
          <SectionHeader 
            title="🎁 Bonus Calculator" 
            section="bonus"
            subtitle="Expected Bonus Calculation"
            badge={!noBonusExpected && getEffectiveBonus() > 0 ? formatCurrency(getEffectiveBonus()) : null}
          />
          
          {expandedSections.bonus && (
            <div className="section-content">
              <div className="checkbox-wrapper" style={{ justifyContent: 'flex-start' }}>
                <input
                  type="checkbox"
                  className="modern-checkbox"
                  checked={noBonusExpected}
                  onChange={(e) => handleNoBonusToggle(e.target.checked)}
                />
                <span className="form-label">No Bonus Expected</span>
              </div>

              {!noBonusExpected && (
                <>
                  <div className="form-grid form-grid-2">
                    <div className="form-group">
                      <label htmlFor={`bonusMultiplier-${personName}`} className="form-label">
                        Bonus Multiplier:
                      </label>
                      <input
                        type="text"
                        id={`bonusMultiplier-${personName}`}
                        className="form-input"
                        value={bonusMultiplier}
                        onChange={(e) => setBonusMultiplier(parseFloat(e.target.value) || 0)}
                        placeholder="Enter bonus multiplier"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor={`bonusTarget-${personName}`} className="form-label">
                        Bonus Target:
                      </label>
                      <input
                        type="text"
                        id={`bonusTarget-${personName}`}
                        className="form-input"
                        value={bonusTarget}
                        onChange={(e) => setBonusTarget(parseFloat(e.target.value) || 0)}
                        placeholder="Enter bonus target"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor={`overrideBonus-${personName}`} className="form-label">
                      Override Bonus Amount:
                    </label>
                    <input
                      type="text"
                      id={`overrideBonus-${personName}`}
                      className="form-input"
                      value={overrideBonus}
                      onChange={(e) => setOverrideBonus(e.target.value)}
                      placeholder="Enter custom bonus amount"
                    />
                  </div>

                  <div className="checkbox-wrapper" style={{ justifyContent: 'flex-start' }}>
                    <input
                      type="checkbox"
                      className="modern-checkbox"
                      checked={remove401kFromBonus}
                      onChange={(e) => setRemove401kFromBonus(e.target.checked)}
                    />
                    <span className="form-label">Remove 401k Contributions from Bonus</span>
                  </div>

                  {getEffectiveBonus() > 0 && (
                    <div className="calculation-hint">
                      <div><strong>Bonus Calculation Summary:</strong></div>
                      <div>Expected Bonus: {formatCurrency(getEffectiveBonus())}</div>
                      <div>Bonus After 401k Contributions: {formatCurrency(calculateBonusAfter401k())}</div>
                      <div>Bonus After Taxes: {
                        results ? formatCurrency(calculateBonusAfterTax()) : 'N/A'
                      }</div>
                      <div>Bonus After Taxes and 401k: {
                        results ? formatCurrency(calculateBonusAfterTaxAnd401k()) : 'N/A'
                      }</div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* W-4 Tax Settings Section */}
        <div>
          <SectionHeader 
            title="📋 W-4 Tax Settings" 
            section="w4"
            subtitle={`${W4_CONFIGS[w4Type].name}${w4Type === 'new' && w4Options.multipleJobs ? ' • Multiple Jobs' : ''}`}
            badge={w4Options.extraWithholding > 0 ? 'Extra Tax' : null}
          />
          
          {expandedSections.w4 && (
            <div className="section-content">
              <div className="form-group">
                <label htmlFor={`w4Type-${personName}`} className="form-label">
                  W-4 Form Type:
                </label>
                <select
                  id={`w4Type-${personName}`}
                  className="form-select"
                  value={w4Type}
                  onChange={(e) => setW4Type(e.target.value)}
                >
                  <option value="new">{W4_CONFIGS.new.name}</option>
                  <option value="old">{W4_CONFIGS.old.name}</option>
                </select>
              </div>

              {w4Type === 'new' && (
                <>
                  <div className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      className="modern-checkbox"
                      checked={w4Options.multipleJobs}
                      onChange={(e) => handleW4OptionChange('multipleJobs', e.target.checked)}
                    />
                    <span className="form-label">Step 2: Multiple Jobs or Spouse Works</span>
                  </div>
                  <div className="form-hint">
                    Check this if you have multiple jobs or are married filing jointly and your spouse also works
                  </div>

                  <div className="form-grid form-grid-2">
                    <div className="form-group">
                      <label htmlFor={`qualifyingChildren-${personName}`} className="form-label">
                        Qualifying Children:
                      </label>
                      <input
                        type="number"
                        id={`qualifyingChildren-${personName}`}
                        className="form-input"
                        value={w4Options.qualifyingChildren}
                        onChange={(e) => handleW4OptionChange('qualifyingChildren', e.target.value)}
                        min="0"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor={`otherDependents-${personName}`} className="form-label">
                        Other Dependents:
                      </label>
                      <input
                        type="number"
                        id={`otherDependents-${personName}`}
                        className="form-input"
                        value={w4Options.otherDependents}
                        onChange={(e) => handleW4OptionChange('otherDependents', e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor={`additionalIncome-${personName}`} className="form-label">
                      Additional Annual Income:
                    </label>
                    <input
                      type="text"
                      id={`additionalIncome-${personName}`}
                      className="form-input"
                      value={formatDeductionDisplay(w4Options.additionalIncome)}
                      onChange={(e) => handleW4OptionChange('additionalIncome', e.target.value)}
                      placeholder="Interest, dividends, retirement income (annual)"
                    />
                  </div>
                </>
              )}

              {w4Type === 'old' && (
                <div className="form-group">
                  <label htmlFor={`allowances-${personName}`} className="form-label">
                    Number of Allowances:
                  </label>
                  <input
                    type="number"
                    id={`allowances-${personName}`}
                    className="form-input"
                    value={w4Options.allowances}
                    onChange={(e) => handleW4OptionChange('allowances', e.target.value)}
                    min="0"
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor={`extraWithholding-${personName}`} className="form-label">
                  Extra Withholding:
                </label>
                <input
                  type="text"
                  id={`extraWithholding-${personName}`}
                  className="form-input"
                  value={formatDeductionDisplay(w4Options.extraWithholding)}
                  onChange={(e) => handleW4OptionChange('extraWithholding', e.target.value)}
                  placeholder="Additional amount to withhold"
                />
              </div>
            </div>
          )}
        </div>

        {results && (
          <div className="results-card">
            <div className="results-header-simplified">
              <div className="results-amount-section-clean">
                <h3 className="results-amount">
                  {showMonthlyView 
                    ? formatCurrency(results.netTakeHomePaycheck * 2)
                    : formatCurrency(results.netTakeHomePaycheck)
                  }
                </h3>
                <div className="results-label">
                  {showMonthlyView ? 'Monthly Net Income' : 'Net Per Paycheck'}
                </div>
              </div>
            </div>

            {/* View Toggle */}
            <div className="results-toggle-container">
              <button
                onClick={() => setShowMonthlyView(!showMonthlyView)}
                className="results-toggle-button"
                title={showMonthlyView ? "Switch to per-paycheck view" : "Switch to monthly view"}
              >
                {showMonthlyView ? '📅 Switch to Per Paycheck' : '📊 Switch to Monthly'}
              </button>
            </div>

            {(results.esppPaycheck > 0 || results.traditional401kPaycheck > 0 || results.roth401kPaycheck > 0 || budgetImpacting.traditionalIraMonthly > 0 || budgetImpacting.rothIraMonthly > 0 || (budgetImpacting.brokerageAccounts && budgetImpacting.brokerageAccounts.some(account => account.monthlyAmount > 0))) && (
              <>
                <div className="results-divider"></div>
                
                {/* Deductions */}
                {(results.traditional401kPaycheck > 0 || results.roth401kPaycheck > 0 || results.esppPaycheck > 0) && (
                  <div className="results-section">
                    <h4 className="results-section-title">
                      💼 {showMonthlyView ? 'Monthly' : 'Per Paycheck'} Deductions
                    </h4>
                    <div className="results-section-grid">
                      {results.traditional401kPaycheck > 0 && (
                        <div className="results-item">
                          <span className="results-item-label">Traditional 401k</span>
                          <span className="results-item-value">
                            {showMonthlyView 
                              ? formatCurrency(results.traditional401kPaycheck * 2)
                              : formatCurrency(results.traditional401kPaycheck)
                            } ({results.traditional401kPercent}%)
                          </span>
                        </div>
                      )}
                      {results.roth401kPaycheck > 0 && (
                        <div className="results-item">
                          <span className="results-item-label">Roth 401k</span>
                          <span className="results-item-value">
                            {showMonthlyView 
                              ? formatCurrency(results.roth401kPaycheck * 2)
                              : formatCurrency(results.roth401kPaycheck)
                            } ({results.roth401kPercent}%)
                          </span>
                        </div>
                      )}
                      {results.esppPaycheck > 0 && (
                        <div className="results-item">
                          <span className="results-item-label">ESPP</span>
                          <span className="results-item-value">
                            {showMonthlyView 
                              ? formatCurrency(results.esppPaycheck * 2)
                              : formatCurrency(results.esppPaycheck)
                            } ({esppDeductionPercent}%)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Budget Contributions */}
                {(budgetImpacting.traditionalIraMonthly > 0 || budgetImpacting.rothIraMonthly > 0 || (budgetImpacting.brokerageAccounts && budgetImpacting.brokerageAccounts.some(account => account.monthlyAmount > 0))) && (
                  <div className="results-section">
                    <h4 className="results-section-title">
                      📊 {showMonthlyView ? 'Monthly' : 'Per Paycheck'} Contributions
                    </h4>
                    <div className="results-section-grid">
                      {budgetImpacting.traditionalIraMonthly > 0 && (
                        <div className="results-item">
                          <span className="results-item-label">Traditional IRA</span>
                          <span className="results-item-value">
                            {showMonthlyView 
                              ? formatCurrency(budgetImpacting.traditionalIraMonthly)
                              : formatCurrency(budgetImpacting.traditionalIraMonthly / 2)
                            }
                          </span>
                        </div>
                      )}
                      {budgetImpacting.rothIraMonthly > 0 && (
                        <div className="results-item">
                          <span className="results-item-label">Roth IRA</span>
                          <span className="results-item-value">
                            {showMonthlyView 
                              ? formatCurrency(budgetImpacting.rothIraMonthly)
                              : formatCurrency(budgetImpacting.rothIraMonthly / 2)
                            }
                          </span>
                        </div>
                      )}
                      {budgetImpacting.brokerageAccounts && budgetImpacting.brokerageAccounts.map(account => (
                        account.monthlyAmount > 0 && (
                          <div key={account.id} className="results-item">
                            <span className="results-item-label">{account.name}</span>
                            <span className="results-item-value">
                              {showMonthlyView 
                                ? formatCurrency(account.monthlyAmount)
                                : formatCurrency(account.monthlyAmount / 2)
                              }
                            </span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaycheckForm;