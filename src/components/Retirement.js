import React, { useState, useCallback, useContext, useEffect, useMemo } from 'react';
import { FormContext } from '../context/FormContext';
import { getPaycheckData, getHistoricalData, getRetirementData, setRetirementData } from '../utils/localStorage';
import { formatCurrency, calculateAge } from '../utils/calculationHelpers';
import Navigation from './Navigation';

const Retirement = () => {
  const { formData: contextFormData } = useContext(FormContext);

  // Toggle for showing spouse calculator
  const [showSpouseCalculator, setShowSpouseCalculator] = useState(true);

  // Load existing retirement data
  const loadRetirementData = () => {
    return getRetirementData() || {
      your: {
        ageAtRetirement: 65,
        ageOfDeath: 90,
        annualSalaryIncrease: 3,
        raisesInRetirement: 0,
        employerMatch: 4,
        employeeContributionForMatch: 4
      },
      spouse: {
        ageAtRetirement: 65,
        ageOfDeath: 90,
        annualSalaryIncrease: 3,
        raisesInRetirement: 0,
        employerMatch: 4,
        employeeContributionForMatch: 4
      },
      sharedInputs: {
        annualInflation: 2.5,
        withdrawalRate: 4,
        retirementReturnRate: 6
      },
      settings: {
        showSpouseCalculator: true
      }
    };
  };

  const [retirementDataState, setRetirementDataState] = useState(loadRetirementData());

  // Save retirement data to localStorage
  const saveRetirementData = useCallback((data) => {
    setRetirementData(data);
    setRetirementDataState(data);
  }, []);

  // Update individual user data
  const updateUserData = useCallback((person, field, value) => {
    const newData = {
      ...retirementDataState,
      [person]: {
        ...(retirementDataState[person] || {}),
        [field]: parseFloat(value) || 0
      }
    };
    saveRetirementData(newData);
  }, [retirementDataState, saveRetirementData]);

  // Update shared inputs
  const updateSharedInputs = useCallback((field, value) => {
    const newData = {
      ...retirementDataState,
      sharedInputs: {
        ...(retirementDataState.sharedInputs || {}),
        [field]: parseFloat(value) || 0
      }
    };
    saveRetirementData(newData);
  }, [retirementDataState, saveRetirementData]);

  // Get current year and user data
  const currentYear = new Date().getFullYear();
  const paycheckData = getPaycheckData();
  const historicalData = getHistoricalData();

  // Calculate age-based return rate
  const calculateReturnRate = (currentAge, retirementAge, retirementRate) => {
    if (currentAge >= retirementAge) {
      return retirementRate / 100;
    }
    // Start at 10% and decrease by 0.1% each year until retirement
    const yearsToRetirement = retirementAge - currentAge;
    const currentRate = Math.max(10 - (0.1 * (retirementAge - yearsToRetirement - currentAge)), retirementRate);
    return currentRate / 100;
  };

  // Calculate retirement projections for a user
  const calculateRetirementProjections = useCallback((userKey) => {
    const user = retirementDataState[userKey];
    const paycheckUser = paycheckData[userKey];
    const sharedInputs = retirementDataState.sharedInputs;

    if (!user || !sharedInputs) {
      return [];
    }
    
    // If no paycheck data, create minimal projections with retirement data only
    if (!paycheckUser || !paycheckUser.birthday || !paycheckUser.salary) {
      const projections = [];
      const currentAge = 30; // Default age if no birthday
      const retirementAge = (parseFloat(user.ageAtRetirement) || 65);
      const deathAge = (parseFloat(user.ageOfDeath) || 90);
      
      for (let age = currentAge; age <= deathAge; age++) {
        const year = currentYear + (age - currentAge);
        const returnRate = calculateReturnRate(age, retirementAge, (parseFloat(sharedInputs.retirementReturnRate) || 6));
        const isRetired = age >= retirementAge;
        
        projections.push({
          year,
          age,
          salary: 0,
          balances: { taxFree: 0, taxDeferred: 0, afterTax: 0 },
          totalBalance: 0,
          isRetired,
          returnRate: returnRate * 100
        });
      }
      return projections;
    }

    const currentAge = calculateAge(paycheckUser.birthday);
    const currentSalary = parseFloat(paycheckUser.salary) || 0;
    
    // Get current balances from historical data (latest year)
    const latestHistoricalEntry = Object.values(historicalData)
      .sort((a, b) => b.year - a.year)[0];
    
    const currentBalances = {
      taxFree: 0,
      taxDeferred: 0,
      afterTax: 0
    };

    if (latestHistoricalEntry && latestHistoricalEntry.users && latestHistoricalEntry.users[paycheckUser.name]) {
      const userData = latestHistoricalEntry.users[paycheckUser.name];
      currentBalances.taxFree = (parseFloat(userData.roth401k) || 0) + (parseFloat(userData.rothira) || 0);
      currentBalances.taxDeferred = (parseFloat(userData.traditional401k) || 0) + (parseFloat(userData.traditionalira) || 0);
      currentBalances.afterTax = parseFloat(userData.brokerage) || 0;
    }

    // Calculate annual contributions
    const traditional401kAnnual = (parseFloat(paycheckUser.retirementOptions?.traditional401kPercent) || 0) * currentSalary / 100;
    const roth401kAnnual = (parseFloat(paycheckUser.retirementOptions?.roth401kPercent) || 0) * currentSalary / 100;
    const employerMatchRate = (parseFloat(user.employerMatch) || 0) / 100;
    const employerMatchAnnual = Math.min(
      employerMatchRate * currentSalary,
      ((traditional401kAnnual + roth401kAnnual) / currentSalary) * employerMatchRate * currentSalary
    );
    const traditionalIraAnnual = (parseFloat(paycheckUser.budgetImpacting?.traditionalIraMonthly) || 0) * 12;
    const rothIraAnnual = (parseFloat(paycheckUser.budgetImpacting?.rothIraMonthly) || 0) * 12;
    const brokerageAnnual = (paycheckUser.budgetImpacting?.brokerageAccounts || []).reduce((sum, account) => 
      sum + (parseFloat(account.monthlyAmount) || 0), 0) * 12;

    const projections = [];
    let salary = currentSalary;
    let balances = { ...currentBalances };

    // Calculate remaining contributions for current year
    const currentMonthsRemaining = 12 - (new Date().getMonth());
    const currentYearContributions = {
      taxFree: ((roth401kAnnual + rothIraAnnual) * currentMonthsRemaining / 12),
      taxDeferred: ((traditional401kAnnual + employerMatchAnnual + traditionalIraAnnual) * currentMonthsRemaining / 12),
      afterTax: (brokerageAnnual * currentMonthsRemaining / 12)
    };

    for (let age = currentAge; age <= (parseFloat(user.ageOfDeath) || 90); age++) {
      const year = currentYear + (age - currentAge);
      const returnRate = calculateReturnRate(age, (parseFloat(user.ageAtRetirement) || 65), (parseFloat(sharedInputs.retirementReturnRate) || 6));
      const isRetired = age >= (parseFloat(user.ageAtRetirement) || 65);

      // Apply returns to existing balances
      balances.taxFree *= (1 + returnRate);
      balances.taxDeferred *= (1 + returnRate);
      balances.afterTax *= (1 + returnRate);

      if (!isRetired) {
        // Add contributions (full year except current year)
        const contributionMultiplier = age === currentAge ? (currentMonthsRemaining / 12) : 1;
        
        // Update salary with annual increase
        if (age > currentAge) {
          salary *= (1 + (parseFloat(sharedInputs.annualInflation) || 0) / 100 + (parseFloat(user.annualSalaryIncrease) || 0) / 100);
        }

        // Recalculate contributions based on new salary
        const annualTraditional401k = (parseFloat(paycheckUser.retirementOptions?.traditional401kPercent) || 0) * salary / 100;
        const annualRoth401k = (parseFloat(paycheckUser.retirementOptions?.roth401kPercent) || 0) * salary / 100;
        const annualEmployerMatch = Math.min(
          ((parseFloat(user.employerMatch) || 0) / 100) * salary,
          ((annualTraditional401k + annualRoth401k) / salary) * ((parseFloat(user.employerMatch) || 0) / 100) * salary
        );

        balances.taxFree += (annualRoth401k + rothIraAnnual) * contributionMultiplier;
        balances.taxDeferred += (annualTraditional401k + annualEmployerMatch + traditionalIraAnnual) * contributionMultiplier;
        balances.afterTax += brokerageAnnual * contributionMultiplier;
      } else {
        // Apply retirement raises and withdrawals
        if ((parseFloat(user.raisesInRetirement) || 0) > 0) {
          salary *= (1 + (parseFloat(user.raisesInRetirement) || 0) / 100);
        }

        // Calculate withdrawal (simplified 4% rule or custom rate)
        const totalBalance = balances.taxFree + balances.taxDeferred + balances.afterTax;
        const withdrawal = totalBalance * ((parseFloat(sharedInputs.withdrawalRate) || 4) / 100);
        
        // Proportionally withdraw from each account type
        if (totalBalance > 0) {
          const taxFreeRatio = balances.taxFree / totalBalance;
          const taxDeferredRatio = balances.taxDeferred / totalBalance;
          const afterTaxRatio = balances.afterTax / totalBalance;

          balances.taxFree -= withdrawal * taxFreeRatio;
          balances.taxDeferred -= withdrawal * taxDeferredRatio;
          balances.afterTax -= withdrawal * afterTaxRatio;
        }
      }

      projections.push({
        year,
        age,
        salary,
        balances: { ...balances },
        totalBalance: balances.taxFree + balances.taxDeferred + balances.afterTax,
        isRetired,
        returnRate: returnRate * 100
      });
    }

    return projections;
  }, [retirementDataState, paycheckData, historicalData, currentYear]);

  // Calculate projections for both users
  const yourProjections = useMemo(() => calculateRetirementProjections('your'), [calculateRetirementProjections]);
  const spouseProjections = useMemo(() => 
    showSpouseCalculator ? calculateRetirementProjections('spouse') : [], 
    [calculateRetirementProjections, showSpouseCalculator]
  );

  // Toggle spouse calculator
  const toggleSpouseCalculator = () => {
    const newShowSpouse = !showSpouseCalculator;
    setShowSpouseCalculator(newShowSpouse);
    const newData = {
      ...retirementDataState,
      settings: {
        ...(retirementDataState.settings || {}),
        showSpouseCalculator: newShowSpouse
      }
    };
    saveRetirementData(newData);
  };

  // Load spouse calculator setting from localStorage
  useEffect(() => {
    const savedData = getRetirementData();
    if (savedData?.settings?.showSpouseCalculator !== undefined) {
      setShowSpouseCalculator(savedData.settings.showSpouseCalculator);
    }
  }, []);

  // Event listener for navigation dual calculator toggle
  useEffect(() => {
    const handleToggleDualCalculator = () => {
      setShowSpouseCalculator(prev => {
        const newValue = !prev;
        // Update the saved settings
        const newData = {
          ...retirementDataState,
          settings: {
            ...(retirementDataState.settings || {}),
            showSpouseCalculator: newValue
          }
        };
        saveRetirementData(newData);
        return newValue;
      });
    };

    window.addEventListener('toggleDualCalculator', handleToggleDualCalculator);

    return () => {
      window.removeEventListener('toggleDualCalculator', handleToggleDualCalculator);
    };
  }, [retirementDataState, saveRetirementData]);

  return (
    <div className="calculator-page">
      <Navigation />
      
      <div className="app-container">
        <div className="header">
          <div className="retirement-header-icon">🏖️</div>
          <h1>Retirement Planner</h1>
          <p>Project your retirement savings and plan for financial independence</p>
        </div>

        <div className="calculator-content">
          <div className={`calculator-grid ${showSpouseCalculator ? 'dual-view' : 'single-view'}`}>
            {/* Your Calculator */}
            <div className="calculator-section">
              <h2 className="calculator-section-title">
                {paycheckData?.your?.name || 'Your'} Retirement Plan
              </h2>
              
              <div className="form-section">
                <h3>Retirement Parameters</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Age at Retirement</label>
                    <input
                      type="number"
                      value={retirementDataState.your?.ageAtRetirement || 65}
                      onChange={(e) => updateUserData('your', 'ageAtRetirement', e.target.value)}
                      min="50"
                      max="80"
                    />
                  </div>
                  <div className="form-group">
                    <label>Age of Death</label>
                    <input
                      type="number"
                      value={retirementDataState.your?.ageOfDeath || 90}
                      onChange={(e) => updateUserData('your', 'ageOfDeath', e.target.value)}
                      min="65"
                      max="110"
                    />
                  </div>
                  <div className="form-group">
                    <label>Annual Salary Increase (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={retirementDataState.your?.annualSalaryIncrease || 3}
                      onChange={(e) => updateUserData('your', 'annualSalaryIncrease', e.target.value)}
                      min="0"
                      max="20"
                    />
                  </div>
                  <div className="form-group">
                    <label>Raises in Retirement (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={retirementDataState.your?.raisesInRetirement || 0}
                      onChange={(e) => updateUserData('your', 'raisesInRetirement', e.target.value)}
                      min="0"
                      max="10"
                    />
                  </div>
                  <div className="form-group">
                    <label>Employer 401k Match (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={retirementDataState.your?.employerMatch || 4}
                      onChange={(e) => updateUserData('your', 'employerMatch', e.target.value)}
                      min="0"
                      max="15"
                    />
                  </div>
                  <div className="form-group">
                    <label>Employee Contribution for Match (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={retirementDataState.your?.employeeContributionForMatch || 4}
                      onChange={(e) => updateUserData('your', 'employeeContributionForMatch', e.target.value)}
                      min="0"
                      max="15"
                    />
                  </div>
                </div>
              </div>

              {/* Projections Display */}
              {yourProjections.length > 0 && (
                <div className="form-section">
                  <h3>Retirement Projections</h3>
                  <div className="projections-summary">
                    <div className="projection-card">
                      <h4>At Retirement (Age {retirementDataState.your?.ageAtRetirement || 65})</h4>
                      {(() => {
                        const retirementProjection = yourProjections.find(p => p.age === (retirementDataState.your?.ageAtRetirement || 65));
                        return retirementProjection ? (
                          <div className="balance-breakdown">
                            <div className="balance-item">
                              <span>Tax-Free:</span>
                              <span>{formatCurrency(retirementProjection.balances.taxFree)}</span>
                            </div>
                            <div className="balance-item">
                              <span>Tax-Deferred:</span>
                              <span>{formatCurrency(retirementProjection.balances.taxDeferred)}</span>
                            </div>
                            <div className="balance-item">
                              <span>After-Tax:</span>
                              <span>{formatCurrency(retirementProjection.balances.afterTax)}</span>
                            </div>
                            <div className="balance-item total">
                              <span>Total:</span>
                              <span>{formatCurrency(retirementProjection.totalBalance)}</span>
                            </div>
                          </div>
                        ) : <span>No data available</span>;
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Spouse Calculator */}
            {showSpouseCalculator && (
              <div className="calculator-section">
                <h2 className="calculator-section-title">
                  {paycheckData?.spouse?.name || 'Spouse'} Retirement Plan
                </h2>
                
                <div className="form-section">
                  <h3>Retirement Parameters</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Age at Retirement</label>
                      <input
                        type="number"
                        value={retirementDataState.spouse?.ageAtRetirement || 65}
                        onChange={(e) => updateUserData('spouse', 'ageAtRetirement', e.target.value)}
                        min="50"
                        max="80"
                      />
                    </div>
                    <div className="form-group">
                      <label>Age of Death</label>
                      <input
                        type="number"
                        value={retirementDataState.spouse?.ageOfDeath || 90}
                        onChange={(e) => updateUserData('spouse', 'ageOfDeath', e.target.value)}
                        min="65"
                        max="110"
                      />
                    </div>
                    <div className="form-group">
                      <label>Annual Salary Increase (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={retirementDataState.spouse?.annualSalaryIncrease || 3}
                        onChange={(e) => updateUserData('spouse', 'annualSalaryIncrease', e.target.value)}
                        min="0"
                        max="20"
                      />
                    </div>
                    <div className="form-group">
                      <label>Raises in Retirement (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={retirementDataState.spouse?.raisesInRetirement || 0}
                        onChange={(e) => updateUserData('spouse', 'raisesInRetirement', e.target.value)}
                        min="0"
                        max="10"
                      />
                    </div>
                    <div className="form-group">
                      <label>Employer 401k Match (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={retirementDataState.spouse?.employerMatch || 4}
                        onChange={(e) => updateUserData('spouse', 'employerMatch', e.target.value)}
                        min="0"
                        max="15"
                      />
                    </div>
                    <div className="form-group">
                      <label>Employee Contribution for Match (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={retirementDataState.spouse?.employeeContributionForMatch || 4}
                        onChange={(e) => updateUserData('spouse', 'employeeContributionForMatch', e.target.value)}
                        min="0"
                        max="15"
                      />
                    </div>
                  </div>
                </div>

                {/* Spouse Projections Display */}
                {spouseProjections.length > 0 && (
                  <div className="form-section">
                    <h3>Retirement Projections</h3>
                    <div className="projections-summary">
                      <div className="projection-card">
                        <h4>At Retirement (Age {retirementDataState.spouse?.ageAtRetirement || 65})</h4>
                        {(() => {
                          const retirementProjection = spouseProjections.find(p => p.age === (retirementDataState.spouse?.ageAtRetirement || 65));
                          return retirementProjection ? (
                            <div className="balance-breakdown">
                              <div className="balance-item">
                                <span>Tax-Free:</span>
                                <span>{formatCurrency(retirementProjection.balances.taxFree)}</span>
                              </div>
                              <div className="balance-item">
                                <span>Tax-Deferred:</span>
                                <span>{formatCurrency(retirementProjection.balances.taxDeferred)}</span>
                              </div>
                              <div className="balance-item">
                                <span>After-Tax:</span>
                                <span>{formatCurrency(retirementProjection.balances.afterTax)}</span>
                              </div>
                              <div className="balance-item total">
                                <span>Total:</span>
                                <span>{formatCurrency(retirementProjection.totalBalance)}</span>
                              </div>
                            </div>
                          ) : <span>No data available</span>;
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Shared Inputs Section */}
          <div className="shared-inputs-section">
            <h3>Shared Assumptions</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Annual Inflation (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={retirementDataState.sharedInputs?.annualInflation || 2.5}
                  onChange={(e) => updateSharedInputs('annualInflation', e.target.value)}
                  min="0"
                  max="10"
                />
              </div>
              <div className="form-group">
                <label>Withdrawal Rate in Retirement (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={retirementDataState.sharedInputs?.withdrawalRate || 4}
                  onChange={(e) => updateSharedInputs('withdrawalRate', e.target.value)}
                  min="1"
                  max="10"
                />
              </div>
              <div className="form-group">
                <label>Return Rate in Retirement (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={retirementDataState.sharedInputs?.retirementReturnRate || 6}
                  onChange={(e) => updateSharedInputs('retirementReturnRate', e.target.value)}
                  min="1"
                  max="15"
                />
              </div>
            </div>
            <div className="assumption-note">
              <p><strong>Return Rate Logic:</strong> Returns start at 10% and decrease by 0.1% each year until retirement age, then use the retirement return rate above.</p>
            </div>
          </div>

          {/* Combined Projections Table */}
          <div className="projections-table-section">
            <h3>Year-by-Year Projections</h3>
            {(yourProjections.length > 0 || spouseProjections.length > 0) ? (
              <div className="table-responsive">
                <table className="projections-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      {yourProjections.length > 0 && (
                        <>
                          <th>{paycheckData?.your?.name || 'Your'} Age</th>
                          <th>Total Balance</th>
                          <th>Return Rate</th>
                        </>
                      )}
                      {spouseProjections.length > 0 && (
                        <>
                          <th>{paycheckData?.spouse?.name || 'Spouse'} Age</th>
                          <th>Total Balance</th>
                          <th>Return Rate</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.max(yourProjections.length, spouseProjections.length) }).map((_, index) => {
                      const yourProj = yourProjections[index];
                      const spouseProj = spouseProjections[index];
                      const year = yourProj?.year || spouseProj?.year;
                      
                      return (
                        <tr key={index} className={yourProj?.isRetired || spouseProj?.isRetired ? 'retirement-row' : ''}>
                          <td>{year}</td>
                          {yourProjections.length > 0 && (
                            <>
                              <td>{yourProj?.age || '-'}</td>
                              <td>{yourProj ? formatCurrency(yourProj.totalBalance) : '-'}</td>
                              <td>{yourProj ? `${yourProj.returnRate.toFixed(1)}%` : '-'}</td>
                            </>
                          )}
                          {spouseProjections.length > 0 && (
                            <>
                              <td>{spouseProj?.age || '-'}</td>
                              <td>{spouseProj ? formatCurrency(spouseProj.totalBalance) : '-'}</td>
                              <td>{spouseProj ? `${spouseProj.returnRate.toFixed(1)}%` : '-'}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-projections-message">
                <p>No projections available. Please ensure you have:</p>
                <ul>
                  <li>Set up your paycheck calculator with your name, birthday, and salary</li>
                  <li>Configured your retirement parameters above</li>
                  <li>Added some historical data (optional but recommended)</li>
                </ul>
                <p>Once you have this information, your retirement projections will appear here automatically.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Retirement;