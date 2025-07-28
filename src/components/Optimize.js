import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from './Navigation';
import { getPaycheckData } from '../utils/localStorage';
import { CONTRIBUTION_LIMITS_2025 } from '../config/taxConstants';
import { formatCurrency, calculateAge } from '../utils/calculationHelpers';
import '../styles/optimize.css';

const Optimize = () => {
  const navigate = useNavigate();
  const [paycheckData, setPaycheckData] = useState({});

  useEffect(() => {
    // Load paycheck data
    const data = getPaycheckData();
    setPaycheckData(data);

    // Listen for paycheck data updates
    const handlePaycheckUpdate = () => {
      const updatedData = getPaycheckData();
      setPaycheckData(updatedData);
    };

    window.addEventListener('paycheckDataUpdated', handlePaycheckUpdate);
    return () => window.removeEventListener('paycheckDataUpdated', handlePaycheckUpdate);
  }, []);

  // Calculate contribution metrics
  const contributionMetrics = useMemo(() => {
    if (!paycheckData?.your) return { hasData: false };

    // Debug: log the paycheck data structure
    console.log('Paycheck Data Structure:', paycheckData);

    const yourData = paycheckData.your;
    const spouseData = paycheckData.spouse || {};
    const showSpouse = paycheckData?.settings?.showSpouseCalculator ?? true;

    // Helper function to calculate person's metrics
    const calculatePersonMetrics = (person, personName) => {
      console.log(`${personName} person data:`, person);
      
      const salary = parseFloat(person.salary) || 0;
      const birthday = person.birthday;
      const age = birthday ? calculateAge(birthday) : 0;
      const isOver50 = age >= 50;
      const isOver55 = age >= 55;

      // 401k calculations - from retirementOptions
      const retirementOptions = person.retirementOptions || {};
      const traditional401k = parseFloat(retirementOptions.traditional401kPercent) || 0;
      const roth401k = parseFloat(retirementOptions.roth401kPercent) || 0;
      const total401kPercent = traditional401k + roth401k;
      const annual401k = salary * (total401kPercent / 100);
      const max401k = isOver50 
        ? CONTRIBUTION_LIMITS_2025.k401_employee + CONTRIBUTION_LIMITS_2025.k401_catchUp
        : CONTRIBUTION_LIMITS_2025.k401_employee;
      
      // Employer match - need to check if this field exists in the data
      const employerMatch = parseFloat(retirementOptions.employerMatch) || 0;
      const annualEmployerMatch = salary * (employerMatch / 100);

      // IRA calculations - from budgetImpacting
      const budgetImpacting = person.budgetImpacting || {};
      const traditionalIra = parseFloat(budgetImpacting.traditionalIraMonthly) || 0;
      const rothIra = parseFloat(budgetImpacting.rothIraMonthly) || 0;
      const annualIra = (traditionalIra + rothIra) * 12;
      const maxIra = isOver50 
        ? CONTRIBUTION_LIMITS_2025.ira_self + CONTRIBUTION_LIMITS_2025.ira_catchUp
        : CONTRIBUTION_LIMITS_2025.ira_self;

      // HSA calculations - from medicalDeductions
      const medicalDeductions = person.medicalDeductions || {};
      const hsaContributionPerPaycheck = parseFloat(medicalDeductions.hsa) || 0;
      const hsaEmployerAnnual = parseFloat(medicalDeductions.employerHsa) || 0;
      
      // Get pay period from person object and convert employee HSA contribution to annual
      const payPeriod = person.payPeriod || 'biWeekly';
      const payPeriodsPerYear = payPeriod === 'weekly' ? 52 : payPeriod === 'biWeekly' ? 26 : payPeriod === 'semiMonthly' ? 24 : 12;
      const hsaContributionAnnual = hsaContributionPerPaycheck * payPeriodsPerYear;
      const hsaCoverage = person.hsaCoverageType || 'none';
      let maxHsa = 0;
      if (hsaCoverage === 'self') {
        maxHsa = CONTRIBUTION_LIMITS_2025.hsa_self + (isOver55 ? CONTRIBUTION_LIMITS_2025.hsa_catchUp : 0);
      } else if (hsaCoverage === 'family') {
        maxHsa = CONTRIBUTION_LIMITS_2025.hsa_family + (isOver55 ? CONTRIBUTION_LIMITS_2025.hsa_catchUp : 0);
      }

      // ESPP calculations
      const esppPercent = parseFloat(person.esppDeductionPercent) || 0;
      const annualEspp = salary * (esppPercent / 100);

      // Brokerage calculations - from budgetImpacting
      const brokerageMonthly = (budgetImpacting.brokerageAccounts || []).reduce((sum, account) => sum + (account.monthlyAmount || 0), 0);
      const annualBrokerage = brokerageMonthly * 12;

      console.log(`${personName} calculations:`, {
        '401k': { traditional401k, roth401k, total401kPercent, annual401k, max401k, employerMatch, annualEmployerMatch },
        'IRA': { traditionalIra, rothIra, annualIra, maxIra },
        'HSA': { hsaContributionPerPaycheck, hsaContributionAnnual, hsaEmployerAnnual, hsaCoverage, maxHsa },
        'ESPP': { esppPercent, annualEspp },
        'Brokerage': { brokerageMonthly, annualBrokerage }
      });

      return {
        name: personName,
        salary,
        age,
        contributions: {
          k401: {
            employee: annual401k,
            employer: annualEmployerMatch,
            total: annual401k + annualEmployerMatch,
            max: max401k,
            remaining: Math.max(0, max401k - annual401k)
          },
          ira: {
            amount: annualIra,
            max: maxIra,
            remaining: Math.max(0, maxIra - annualIra)
          },
          hsa: {
            employee: hsaContributionAnnual,
            employer: hsaEmployerAnnual,
            total: hsaContributionAnnual + hsaEmployerAnnual,
            max: maxHsa,
            remaining: Math.max(0, maxHsa - hsaContributionAnnual)
          },
          espp: {
            amount: annualEspp
          },
          brokerage: {
            amount: annualBrokerage
          }
        }
      };
    };

    const metrics = {
      hasData: true,
      your: calculatePersonMetrics(yourData, yourData.name || 'You')
    };

    if (showSpouse && spouseData.salary) {
      metrics.spouse = calculatePersonMetrics(spouseData, spouseData.name || 'Spouse');
    }

    return metrics;
  }, [paycheckData]);

  const handleNavigateToPaycheck = () => {
    navigate('/paycheck');
  };

  // Calculate household totals
  const householdTotals = useMemo(() => {
    if (!contributionMetrics?.hasData) return null;

    const people = [contributionMetrics.your, contributionMetrics.spouse].filter(Boolean);
    
    return {
      total401k: people.reduce((sum, p) => sum + p.contributions.k401.total, 0),
      totalIra: people.reduce((sum, p) => sum + p.contributions.ira.amount, 0),
      totalHsa: people.reduce((sum, p) => sum + p.contributions.hsa.total, 0),
      totalEspp: people.reduce((sum, p) => sum + p.contributions.espp.amount, 0),
      totalBrokerage: people.reduce((sum, p) => sum + p.contributions.brokerage.amount, 0),
      totalContributions: people.reduce((sum, p) => 
        sum + p.contributions.k401.total + p.contributions.ira.amount + 
        p.contributions.hsa.total + p.contributions.espp.amount + p.contributions.brokerage.amount, 0
      ),
      remaining401k: people.reduce((sum, p) => sum + p.contributions.k401.remaining, 0),
      remainingIra: people.reduce((sum, p) => sum + p.contributions.ira.remaining, 0),
      remainingHsa: people.reduce((sum, p) => sum + p.contributions.hsa.remaining, 0)
    };
  }, [contributionMetrics]);

  if (!contributionMetrics?.hasData) {
    return (
      <div className="optimize-container">
        <Navigation />
        <div className="app-container">
          <div className="header">
            <div className="optimize-header-icon">⚡</div>
            <h1>Optimize Your Contributions</h1>
            <p>Analyze your contribution strategy and find optimization opportunities</p>
          </div>
          <div className="optimize-no-data">
            <h3>No paycheck data found</h3>
            <p>Please set up your paycheck calculator first to see optimization recommendations.</p>
            <button 
              className="btn btn-primary"
              onClick={handleNavigateToPaycheck}
            >
              Go to Paycheck Calculator
            </button>
          </div>
        </div>
      </div>
    );
  }

  const PersonContributionCard = ({ person }) => {
    if (!person) return null;

    return (
      <div className="optimize-person-card">
        <h3>{person.name}</h3>
        <div className="optimize-person-details">
          <div className="optimize-salary">
            <strong>Annual Salary:</strong> {formatCurrency(person.salary)}
          </div>
          <div className="optimize-age">
            <strong>Age:</strong> {person.age}
          </div>
        </div>

        <div className="optimize-contributions">
          {/* 401k Section */}
          <div className="optimize-contribution-section">
            <h4>401(k) Contributions</h4>
            <div className="optimize-contribution-grid">
              <div className="optimize-contribution-item">
                <span className="label">Employee Contribution:</span>
                <span className="value">{formatCurrency(person.contributions.k401.employee)}</span>
              </div>
              <div className="optimize-contribution-item">
                <span className="label">Employer Match:</span>
                <span className="value">{formatCurrency(person.contributions.k401.employer)}</span>
              </div>
              <div className="optimize-contribution-item">
                <span className="label">Total 401(k):</span>
                <span className="value total">{formatCurrency(person.contributions.k401.total)}</span>
              </div>
              <div className="optimize-contribution-item">
                <span className="label">Annual Limit:</span>
                <span className="value">{formatCurrency(person.contributions.k401.max)}</span>
              </div>
              <div className="optimize-contribution-item">
                <span className="label">Remaining Room:</span>
                <span className={`value ${person.contributions.k401.remaining > 0 ? 'opportunity' : 'maxed'}`}>
                  {formatCurrency(person.contributions.k401.remaining)}
                </span>
              </div>
            </div>
          </div>

          {/* IRA Section */}
          <div className="optimize-contribution-section">
            <h4>IRA Contributions</h4>
            <div className="optimize-contribution-grid">
              <div className="optimize-contribution-item">
                <span className="label">Annual IRA:</span>
                <span className="value">{formatCurrency(person.contributions.ira.amount)}</span>
              </div>
              <div className="optimize-contribution-item">
                <span className="label">Annual Limit:</span>
                <span className="value">{formatCurrency(person.contributions.ira.max)}</span>
              </div>
              <div className="optimize-contribution-item">
                <span className="label">Remaining Room:</span>
                <span className={`value ${person.contributions.ira.remaining > 0 ? 'opportunity' : 'maxed'}`}>
                  {formatCurrency(person.contributions.ira.remaining)}
                </span>
              </div>
            </div>
          </div>

          {/* HSA Section */}
          {person.contributions.hsa.max > 0 && (
            <div className="optimize-contribution-section">
              <h4>HSA Contributions</h4>
              <div className="optimize-contribution-grid">
                <div className="optimize-contribution-item">
                  <span className="label">Employee Contribution:</span>
                  <span className="value">{formatCurrency(person.contributions.hsa.employee)}</span>
                </div>
                <div className="optimize-contribution-item">
                  <span className="label">Employer Contribution:</span>
                  <span className="value">{formatCurrency(person.contributions.hsa.employer)}</span>
                </div>
                <div className="optimize-contribution-item">
                  <span className="label">Total HSA:</span>
                  <span className="value total">{formatCurrency(person.contributions.hsa.total)}</span>
                </div>
                <div className="optimize-contribution-item">
                  <span className="label">Annual Limit:</span>
                  <span className="value">{formatCurrency(person.contributions.hsa.max)}</span>
                </div>
                <div className="optimize-contribution-item">
                  <span className="label">Remaining Room:</span>
                  <span className={`value ${person.contributions.hsa.remaining > 0 ? 'opportunity' : 'maxed'}`}>
                    {formatCurrency(person.contributions.hsa.remaining)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ESPP Section */}
          {person.contributions.espp.amount > 0 && (
            <div className="optimize-contribution-section">
              <h4>ESPP Contributions</h4>
              <div className="optimize-contribution-grid">
                <div className="optimize-contribution-item">
                  <span className="label">Annual ESPP:</span>
                  <span className="value">{formatCurrency(person.contributions.espp.amount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Brokerage Section */}
          {person.contributions.brokerage.amount > 0 && (
            <div className="optimize-contribution-section">
              <h4>Brokerage Contributions</h4>
              <div className="optimize-contribution-grid">
                <div className="optimize-contribution-item">
                  <span className="label">Annual Brokerage:</span>
                  <span className="value">{formatCurrency(person.contributions.brokerage.amount)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };


  return (
    <div className="optimize-container">
      <Navigation />
      <div className="app-container">
        <div className="header">
          <div className="optimize-header-icon">⚡</div>
          <h1>Optimize Your Contributions</h1>
          <p>Analyze your current contribution strategy and identify optimization opportunities</p>
        </div>

        {/* Household Summary */}
        <div className="optimize-summary-card">
          <h2>Household Summary</h2>
          <div className="optimize-summary-grid">
            <div className="optimize-summary-item">
              <span className="label">Total 401(k) (with match):</span>
              <span className="value">{formatCurrency(householdTotals.total401k)}</span>
            </div>
            <div className="optimize-summary-item">
              <span className="label">Total IRA:</span>
              <span className="value">{formatCurrency(householdTotals.totalIra)}</span>
            </div>
            <div className="optimize-summary-item">
              <span className="label">Total HSA:</span>
              <span className="value">{formatCurrency(householdTotals.totalHsa)}</span>
            </div>
            <div className="optimize-summary-item">
              <span className="label">Total ESPP:</span>
              <span className="value">{formatCurrency(householdTotals.totalEspp)}</span>
            </div>
            <div className="optimize-summary-item">
              <span className="label">Total Brokerage:</span>
              <span className="value">{formatCurrency(householdTotals.totalBrokerage)}</span>
            </div>
            <div className="optimize-summary-item total">
              <span className="label">Total Annual Contributions:</span>
              <span className="value">{formatCurrency(householdTotals.totalContributions)}</span>
            </div>
          </div>

          {/* Optimization Opportunities */}
          {(householdTotals.remaining401k > 0 || householdTotals.remainingIra > 0 || householdTotals.remainingHsa > 0) && (
            <div className="optimize-opportunities">
              <h3>Optimization Opportunities</h3>
              <div className="optimize-opportunities-grid">
                {householdTotals.remaining401k > 0 && (
                  <div className="optimize-opportunity">
                    <span className="label">Additional 401(k) room:</span>
                    <span className="value opportunity">{formatCurrency(householdTotals.remaining401k)}</span>
                  </div>
                )}
                {householdTotals.remainingIra > 0 && (
                  <div className="optimize-opportunity">
                    <span className="label">Additional IRA room:</span>
                    <span className="value opportunity">{formatCurrency(householdTotals.remainingIra)}</span>
                  </div>
                )}
                {householdTotals.remainingHsa > 0 && (
                  <div className="optimize-opportunity">
                    <span className="label">Additional HSA room:</span>
                    <span className="value opportunity">{formatCurrency(householdTotals.remainingHsa)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Individual Breakdown */}
        <div className="optimize-individuals">
          <PersonContributionCard person={contributionMetrics.your} />
          {contributionMetrics.spouse && (
            <PersonContributionCard person={contributionMetrics.spouse} />
          )}
        </div>

        {/* Action Button */}
        <div className="optimize-actions">
          <button 
            className="btn btn-primary"
            onClick={handleNavigateToPaycheck}
          >
            Update Contributions in Paycheck Calculator
          </button>
        </div>
      </div>
    </div>
  );
};

export default Optimize;