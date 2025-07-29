import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from './Navigation';
import { getPaycheckData, getPerformanceData } from '../utils/localStorage';
import { CONTRIBUTION_LIMITS_2025 } from '../config/taxConstants';
import { 
  formatCurrency, 
  calculateAge, 
  calculateProjectedAnnualIncome, 
  calculateYTDContributionsFromPerformance, 
  calculateRemainingContributionRoom 
} from '../utils/calculationHelpers';
import '../styles/optimize.css';

const Optimize = () => {
  const navigate = useNavigate();
  const [paycheckData, setPaycheckData] = useState({});
  const [performanceData, setPerformanceData] = useState({});
  const [useProjectedAGI, setUseProjectedAGI] = useState(false);

  useEffect(() => {
    // Load paycheck and performance data
    const paycheckData = getPaycheckData();
    const performanceData = getPerformanceData();
    setPaycheckData(paycheckData);
    setPerformanceData(performanceData);

    // Listen for data updates
    const handlePaycheckUpdate = () => {
      const updatedData = getPaycheckData();
      setPaycheckData(updatedData);
    };

    const handlePerformanceUpdate = () => {
      const updatedData = getPerformanceData();
      setPerformanceData(updatedData);
    };

    window.addEventListener('paycheckDataUpdated', handlePaycheckUpdate);
    window.addEventListener('performanceDataUpdated', handlePerformanceUpdate);
    
    return () => {
      window.removeEventListener('paycheckDataUpdated', handlePaycheckUpdate);
      window.removeEventListener('performanceDataUpdated', handlePerformanceUpdate);
    };
  }, []);

  // Calculate contribution metrics
  const contributionMetrics = useMemo(() => {
    if (!paycheckData?.your) return { hasData: false };


    const yourData = paycheckData.your;
    const spouseData = paycheckData.spouse || {};
    const showSpouse = paycheckData?.settings?.showSpouseCalculator ?? true;

    // Helper function to calculate person's metrics
    const calculatePersonMetrics = (person, personName) => {
      
      const salary = parseFloat(person.salary) || 0;
      const birthday = person.birthday;
      const age = birthday ? calculateAge(birthday) : 0;
      const isOver50 = age >= 50;
      const isOver55 = age >= 55;

      // Calculate AGI based on toggle - use projected income from YTD data if available and toggle is on
      let effectiveAGI = salary;
      if (useProjectedAGI && person.incomePeriodsData && person.incomePeriodsData.length > 0) {
        effectiveAGI = calculateProjectedAnnualIncome(person.incomePeriodsData, salary);
      }

      // Get YTD contributions from Performance data
      const userNames = [person.name, spouseData.name].filter(n => n && n.trim());
      const ytdContributions = calculateYTDContributionsFromPerformance(performanceData, userNames);
      const remainingRoom = calculateRemainingContributionRoom(ytdContributions, age, person.hsaCoverageType);

      // 401k calculations - from retirementOptions
      const retirementOptions = person.retirementOptions || {};
      const traditional401k = parseFloat(retirementOptions.traditional401kPercent) || 0;
      const roth401k = parseFloat(retirementOptions.roth401kPercent) || 0;
      const total401kPercent = traditional401k + roth401k;
      const annual401k = effectiveAGI * (total401kPercent / 100);
      const max401k = isOver50 
        ? CONTRIBUTION_LIMITS_2025.k401_employee + CONTRIBUTION_LIMITS_2025.k401_catchUp
        : CONTRIBUTION_LIMITS_2025.k401_employee;
      
      // Employer match - need to check if this field exists in the data
      const employerMatch = parseFloat(retirementOptions.employerMatch) || 0;
      const annualEmployerMatch = effectiveAGI * (employerMatch / 100);

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
      const annualEspp = effectiveAGI * (esppPercent / 100);

      // Brokerage calculations - from budgetImpacting
      const brokerageMonthly = (budgetImpacting.brokerageAccounts || []).reduce((sum, account) => sum + (account.monthlyAmount || 0), 0);
      const annualBrokerage = brokerageMonthly * 12;


      return {
        name: personName,
        salary,
        effectiveAGI,
        age,
        ytdContributions,
        remainingRoom,
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
  }, [paycheckData, performanceData, useProjectedAGI]);

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
          {useProjectedAGI && person.effectiveAGI !== person.salary && (
            <div className="optimize-effective-agi">
              <strong>Effective AGI (YTD + Projected):</strong> {formatCurrency(person.effectiveAGI)}
            </div>
          )}
          <div className="optimize-age">
            <strong>Age:</strong> {person.age}
          </div>
        </div>

        {/* YTD Contributions Section */}
        {useProjectedAGI && person.ytdContributions && (
          <div className="optimize-ytd-section">
            <h4>Year-to-Date Contributions</h4>
            <div className="optimize-ytd-grid">
              <div className="optimize-ytd-item">
                <span className="label">401(k) YTD:</span>
                <span className="value">{formatCurrency(person.ytdContributions.total401k)}</span>
              </div>
              <div className="optimize-ytd-item">
                <span className="label">IRA YTD:</span>
                <span className="value">{formatCurrency(person.ytdContributions.totalIra)}</span>
              </div>
              <div className="optimize-ytd-item">
                <span className="label">HSA YTD:</span>
                <span className="value">{formatCurrency(person.ytdContributions.hsa)}</span>
              </div>
            </div>
            
            {/* Remaining Contribution Room */}
            <div className="optimize-remaining-room">
              <h5>Remaining Contribution Room</h5>
              <div className="optimize-remaining-grid">
                <div className="optimize-remaining-item">
                  <span className="label">401(k) Room:</span>
                  <span className={`value ${person.remainingRoom?.k401_remaining > 0 ? 'opportunity' : 'maxed'}`}>
                    {formatCurrency(person.remainingRoom?.k401_remaining || 0)}
                  </span>
                </div>
                <div className="optimize-remaining-item">
                  <span className="label">IRA Room:</span>
                  <span className={`value ${person.remainingRoom?.ira_remaining > 0 ? 'opportunity' : 'maxed'}`}>
                    {formatCurrency(person.remainingRoom?.ira_remaining || 0)}
                  </span>
                </div>
                <div className="optimize-remaining-item">
                  <span className="label">HSA Room:</span>
                  <span className={`value ${person.remainingRoom?.hsa_remaining > 0 ? 'opportunity' : 'maxed'}`}>
                    {formatCurrency(person.remainingRoom?.hsa_remaining || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

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
          
          {/* AGI Calculation Toggle */}
          <div className="agi-toggle-section">
            <label className="agi-toggle">
              <input
                type="checkbox"
                checked={useProjectedAGI}
                onChange={(e) => setUseProjectedAGI(e.target.checked)}
              />
              <span className="agi-toggle-text">
                Use YTD + Projected AGI 
                <span className="agi-toggle-description">
                  (Instead of annual paycheck calculator salary)
                </span>
              </span>
            </label>
          </div>
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