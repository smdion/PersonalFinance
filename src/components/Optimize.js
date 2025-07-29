import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from './Navigation';
import { getPaycheckData, getPerformanceData } from '../utils/localStorage';
import { CONTRIBUTION_LIMITS_2025, PAY_PERIODS } from '../config/taxConstants';
import { 
  formatCurrency, 
  calculateAge, 
  calculateProjectedAnnualIncome,
  calculateYTDIncome,
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
      // For individual accounts, only get this person's contributions
      // For joint accounts, get all contributions and divide later
      const individualUserNames = [person.name].filter(n => n && n.trim());
      const allUserNames = [person.name, spouseData.name, 'Joint'].filter(n => n && n.trim());
      
      // Get individual contributions (401k, HSA, ESPP) - only this person's accounts
      const individualYtdContributions = calculateYTDContributionsFromPerformance(performanceData, individualUserNames);
      
      // Get all contributions (for joint accounts like IRA, Brokerage) - all users including Joint
      const allYtdContributions = calculateYTDContributionsFromPerformance(performanceData, allUserNames);
      
      // Determine which accounts are joint and divide contributions evenly
      // Don't count "Joint" as a user for division purposes - it represents shared accounts
      const actualUsers = [person.name, spouseData.name].filter(n => n && n.trim());
      const numActualUsers = actualUsers.length;
      
      // Start with individual contributions, then override with joint contributions where appropriate
      const ytdContributions = { ...individualYtdContributions };
      
      // Check for joint accounts in performance data
      const jointAccounts = {
        brokerage: false,
        ira: false // IRA contributions are treated as joint in our math per requirements
      };
      
      // Check performance data for actual joint accounts
      if (performanceData && Object.keys(performanceData).length > 0) {
        Object.values(performanceData).forEach(yearData => {
          if (yearData && yearData.users) {
            Object.entries(yearData.users).forEach(([userName, account]) => {
              if (account.accountType) {
                const accountType = account.accountType.toLowerCase();
                const accountName = (account.accountName || '').toLowerCase();
                const userNameLower = userName.toLowerCase();
                
                // Detect joint brokerage accounts by user name "Joint" or account name containing "joint"
                if ((accountType.includes('brokerage') || accountType.includes('taxable')) && 
                    (userNameLower === 'joint' || accountName.includes('joint'))) {
                  jointAccounts.brokerage = true;
                }
                // Add other joint account detection logic as needed
              }
            });
          }
        });
      }
      
      // Always treat IRA as joint per current requirements
      // NOTE: IRA accounts are typically individual accounts in reality, but our current 
      // contribution math and data structure treats them as joint accounts (shared between users).
      // If we refactor in the future to make IRAs individual, this logic will need to be updated.
      jointAccounts.ira = true;
      
      // For joint accounts, use the total contributions and divide evenly between actual users
      if (numActualUsers > 1) {
        if (jointAccounts.brokerage) {
          ytdContributions.brokerage = allYtdContributions.brokerage / numActualUsers;
        }
        if (jointAccounts.ira) {
          ytdContributions.traditionalIra = allYtdContributions.traditionalIra / numActualUsers;
          ytdContributions.rothIra = allYtdContributions.rothIra / numActualUsers;
          ytdContributions.totalIra = allYtdContributions.totalIra / numActualUsers;
        }
      } else {
        // Single user - use all joint contributions without division
        if (jointAccounts.brokerage) {
          ytdContributions.brokerage = allYtdContributions.brokerage;
        }
        if (jointAccounts.ira) {
          ytdContributions.traditionalIra = allYtdContributions.traditionalIra;
          ytdContributions.rothIra = allYtdContributions.rothIra;
          ytdContributions.totalIra = allYtdContributions.totalIra;
        }
      }
      
      // Debug logging - basic info
      if (useProjectedAGI) {
        console.log(`${personName} - Joint Accounts:`, jointAccounts);
        console.log(`${personName} - Individual YTD:`, individualYtdContributions);
        console.log(`${personName} - All YTD:`, allYtdContributions);
        console.log(`${personName} - Final YTD:`, ytdContributions);
        
        // Check what accounts we're finding (only for first user to avoid duplication)
        if (personName === (yourData.name || 'You')) {
          Object.values(performanceData).forEach((yearData, index) => {
            if (yearData && yearData.users && index < 2) {
              console.log(`Entry ${index} users:`, Object.keys(yearData.users));
              Object.entries(yearData.users).forEach(([userName, account]) => {
                if (account.accountType) {
                  console.log(`  ${userName}: ${account.accountType} - ${account.accountName || 'no name'}`);
                }
              });
            }
          });
        }
      }
      
      const remainingRoom = calculateRemainingContributionRoom(ytdContributions, age, person.hsaCoverageType);

      // Calculate YTD and projected contributions using actual pay periods
      const payPeriod = person.payPeriod || 'biWeekly';
      const periodsPerYear = PAY_PERIODS[payPeriod].periodsPerYear;

      // 401k calculations - from retirementOptions
      const retirementOptions = person.retirementOptions || {};
      const traditional401k = parseFloat(retirementOptions.traditional401kPercent) || 0;
      const roth401k = parseFloat(retirementOptions.roth401kPercent) || 0;
      const total401kPercent = traditional401k + roth401k;
      
      let annual401k, annualEmployerMatch;
      if (useProjectedAGI && ytdContributions) {
        // YTD + Projected calculation 
        const ytd401k = ytdContributions.total401k || 0;
        
        // Calculate projected remaining 401k contributions
        let projectedRemaining401k, projectedRemainingEmployerMatch;
        
        if (person.incomePeriodsData && person.incomePeriodsData.length > 0) {
          // Use YTD income data if available
          const ytdIncome = calculateYTDIncome(person.incomePeriodsData, payPeriod, salary);
          const projectedRemainingIncome = effectiveAGI - ytdIncome;
          projectedRemaining401k = projectedRemainingIncome * (total401kPercent / 100);
          
          const employerMatch = parseFloat(retirementOptions.employerMatch) || 0;
          projectedRemainingEmployerMatch = projectedRemainingIncome * (employerMatch / 100);
        } else {
          // Use time-based calculation for remaining year
          const today = new Date();
          const endOfYear = new Date(today.getFullYear(), 11, 31);
          const remainingDays = Math.max(0, (endOfYear - today) / (1000 * 60 * 60 * 24));
          const remainingYearFactor = remainingDays / 365;
          
          const annualContribution = salary * (total401kPercent / 100);
          projectedRemaining401k = annualContribution * remainingYearFactor;
          
          const employerMatch = parseFloat(retirementOptions.employerMatch) || 0;
          const annualEmployerMatch = salary * (employerMatch / 100);
          projectedRemainingEmployerMatch = annualEmployerMatch * remainingYearFactor;
        }
        
        annual401k = ytd401k + projectedRemaining401k;
        
        const ytdEmployerMatch = ytdContributions.employerMatch || 0;
        annualEmployerMatch = ytdEmployerMatch + projectedRemainingEmployerMatch;
      } else {
        // Standard calculation - use original salary if no income periods data
        const calculationBase = (useProjectedAGI && (!person.incomePeriodsData || person.incomePeriodsData.length === 0)) 
          ? salary 
          : effectiveAGI;
        annual401k = calculationBase * (total401kPercent / 100);
        const employerMatch = parseFloat(retirementOptions.employerMatch) || 0;
        annualEmployerMatch = calculationBase * (employerMatch / 100);
      }
      
      const max401k = isOver50 
        ? CONTRIBUTION_LIMITS_2025.k401_employee + CONTRIBUTION_LIMITS_2025.k401_catchUp
        : CONTRIBUTION_LIMITS_2025.k401_employee;

      // IRA calculations - from budgetImpacting
      const budgetImpacting = person.budgetImpacting || {};
      const traditionalIra = parseFloat(budgetImpacting.traditionalIraMonthly) || 0;
      const rothIra = parseFloat(budgetImpacting.rothIraMonthly) || 0;
      
      let annualIra;
      if (useProjectedAGI && ytdContributions) {
        // YTD + Projected calculation: YTD contributions + projected remaining contributions
        const ytdIra = ytdContributions.totalIra || 0;
        
        let projectedRemainingIra;
        if (person.incomePeriodsData && person.incomePeriodsData.length > 0) {
          // Use YTD income data if available (though IRA is typically fixed monthly amounts)
          const today = new Date();
          const monthsRemaining = 12 - today.getMonth();
          projectedRemainingIra = (traditionalIra + rothIra) * monthsRemaining;
        } else {
          // Use time-based calculation for remaining year
          const today = new Date();
          const monthsRemaining = 12 - today.getMonth();
          projectedRemainingIra = (traditionalIra + rothIra) * monthsRemaining;
        }
        
        annualIra = ytdIra + projectedRemainingIra;
      } else {
        // Standard calculation
        annualIra = (traditionalIra + rothIra) * 12;
      }
      
      const maxIra = isOver50 
        ? CONTRIBUTION_LIMITS_2025.ira_self + CONTRIBUTION_LIMITS_2025.ira_catchUp
        : CONTRIBUTION_LIMITS_2025.ira_self;

      // HSA calculations - from medicalDeductions
      const medicalDeductions = person.medicalDeductions || {};
      const hsaContributionPerPaycheck = parseFloat(medicalDeductions.hsa) || 0;
      const hsaEmployerAnnual = parseFloat(medicalDeductions.employerHsa) || 0;
      
      let hsaContributionAnnual, hsaEmployerContribution;
      if (useProjectedAGI && ytdContributions) {
        // YTD + Projected calculation
        const ytdHsa = ytdContributions.hsa || 0;
        
        let projectedRemainingHsa;
        if (person.incomePeriodsData && person.incomePeriodsData.length > 0) {
          // Use YTD income data if available
          const ytdIncome = calculateYTDIncome(person.incomePeriodsData, payPeriod, salary);
          const projectedRemainingIncome = effectiveAGI - ytdIncome;
          const remainingPayPeriods = projectedRemainingIncome / (salary / periodsPerYear);
          projectedRemainingHsa = hsaContributionPerPaycheck * remainingPayPeriods;
        } else {
          // Use time-based calculation for remaining year
          const today = new Date();
          const endOfYear = new Date(today.getFullYear(), 11, 31);
          const remainingDays = Math.max(0, (endOfYear - today) / (1000 * 60 * 60 * 24));
          const remainingYearFactor = remainingDays / 365;
          
          const annualContribution = hsaContributionPerPaycheck * periodsPerYear;
          projectedRemainingHsa = annualContribution * remainingYearFactor;
        }
        
        hsaContributionAnnual = ytdHsa + projectedRemainingHsa;
        
        // Employer HSA - typically a fixed annual amount, so prorate based on time remaining
        const today = new Date();
        const yearProgress = (today.getMonth() + 1) / 12;
        const remainingYearFactor = 1 - yearProgress;
        hsaEmployerContribution = hsaEmployerAnnual * yearProgress + hsaEmployerAnnual * remainingYearFactor;
      } else {
        // Standard calculation
        hsaContributionAnnual = hsaContributionPerPaycheck * periodsPerYear;
        hsaEmployerContribution = hsaEmployerAnnual;
      }
      
      const hsaCoverage = person.hsaCoverageType || 'none';
      let maxHsa = 0;
      if (hsaCoverage === 'self') {
        maxHsa = CONTRIBUTION_LIMITS_2025.hsa_self + (isOver55 ? CONTRIBUTION_LIMITS_2025.hsa_catchUp : 0);
      } else if (hsaCoverage === 'family') {
        maxHsa = CONTRIBUTION_LIMITS_2025.hsa_family + (isOver55 ? CONTRIBUTION_LIMITS_2025.hsa_catchUp : 0);
      }

      // ESPP calculations
      const esppPercent = parseFloat(person.esppDeductionPercent) || 0;
      
      // Debug ESPP info
      if (useProjectedAGI) {
        console.log(`${personName} - ESPP%:`, esppPercent, 'Effective AGI:', effectiveAGI);
        console.log(`${personName} - Individual ESPP YTD:`, individualYtdContributions.espp);
        console.log(`${personName} - All ESPP YTD:`, allYtdContributions.espp);
        console.log(`${personName} - Final ESPP YTD:`, ytdContributions.espp);
      }
      
      let annualEspp;
      
      // Debug condition check
      if (useProjectedAGI) {
        console.log(`${personName} - ESPP Condition Check:`);
        console.log(`  useProjectedAGI: ${useProjectedAGI}`);
        console.log(`  ytdContributions exists: ${!!ytdContributions}`);
        console.log(`  incomePeriodsData exists: ${!!person.incomePeriodsData}`);
        console.log(`  incomePeriodsData length: ${person.incomePeriodsData?.length || 0}`);
      }
      
      if (useProjectedAGI && ytdContributions) {
        // YTD + Projected calculation
        // ESPP is individual account - use this person's individual YTD contributions
        const ytdEspp = ytdContributions.espp || 0;
        
        let projectedRemainingEspp;
        if (person.incomePeriodsData && person.incomePeriodsData.length > 0) {
          // Use YTD income data if available
          const ytdIncome = calculateYTDIncome(person.incomePeriodsData, payPeriod, salary);
          const projectedRemainingIncome = effectiveAGI - ytdIncome;
          projectedRemainingEspp = projectedRemainingIncome * (esppPercent / 100);
        } else {
          // Use time-based calculation for remaining year
          const today = new Date();
          const endOfYear = new Date(today.getFullYear(), 11, 31);
          const remainingDays = Math.max(0, (endOfYear - today) / (1000 * 60 * 60 * 24));
          const remainingYearFactor = remainingDays / 365;
          
          const annualContribution = salary * (esppPercent / 100);
          projectedRemainingEspp = annualContribution * remainingYearFactor;
        }
        
        annualEspp = ytdEspp + projectedRemainingEspp;
        
        // Debug ESPP calculation
        if (useProjectedAGI) {
          console.log(`${personName} - ESPP YTD Calculation:`);
          console.log(`  YTD ESPP: ${ytdEspp}`);
          console.log(`  Projected Remaining ESPP: ${projectedRemainingEspp}`);
          console.log(`  Total Annual ESPP (YTD method): ${annualEspp}`);
        }
      } else {
        // Standard calculation - use original salary if no income periods data
        const calculationBase = (useProjectedAGI && (!person.incomePeriodsData || person.incomePeriodsData.length === 0)) 
          ? salary 
          : effectiveAGI;
        annualEspp = calculationBase * (esppPercent / 100);
        
        // Debug standard calculation
        if (useProjectedAGI) {
          const reason = (!person.incomePeriodsData || person.incomePeriodsData.length === 0) 
            ? "(no income periods - using original salary)" 
            : "";
          console.log(`${personName} - ESPP Standard Calculation ${reason}: ${calculationBase} * ${esppPercent}% = ${annualEspp}`);
        }
      }

      // Brokerage calculations - from budgetImpacting
      const brokerageMonthly = (budgetImpacting.brokerageAccounts || []).reduce((sum, account) => sum + (account.monthlyAmount || 0), 0);
      
      let annualBrokerage;
      if (useProjectedAGI && ytdContributions) {
        // YTD + Projected calculation: YTD contributions + projected remaining contributions
        const ytdBrokerage = ytdContributions.brokerage || 0;
        
        let projectedRemainingBrokerage;
        if (person.incomePeriodsData && person.incomePeriodsData.length > 0) {
          // Use YTD income data if available (though brokerage is typically fixed monthly amounts)
          const today = new Date();
          const monthsRemaining = 12 - today.getMonth();
          projectedRemainingBrokerage = brokerageMonthly * monthsRemaining;
        } else {
          // Use time-based calculation for remaining year
          const today = new Date();
          const monthsRemaining = 12 - today.getMonth();
          projectedRemainingBrokerage = brokerageMonthly * monthsRemaining;
        }
        
        annualBrokerage = ytdBrokerage + projectedRemainingBrokerage;
      } else {
        // Standard calculation
        annualBrokerage = brokerageMonthly * 12;
      }
      
      // Determine account types (joint vs individual) from performance data
      const accountTypes = {
        k401: 'Individual', // 401k are always individual accounts
        ira: 'Joint', // Our contribution math treats IRA as joint (per requirements)
        hsa: 'Individual', // HSA are always individual accounts  
        espp: 'Individual', // ESPP are always individual accounts
        brokerage: jointAccounts.brokerage ? 'Joint' : 'Individual' // Use the same detection logic
      };


      return {
        name: personName,
        salary,
        effectiveAGI,
        age,
        ytdContributions,
        remainingRoom,
        accountTypes,
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
            employer: hsaEmployerContribution,
            total: hsaContributionAnnual + hsaEmployerContribution,
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


        <div className="optimize-contributions">
          {/* 401k Section */}
          <div className="optimize-contribution-section">
            <h4>
              401(k) Contributions
              {useProjectedAGI && (
                <span className="contribution-mode-indicator">
                  {` (Per Paycheck Basis - ${person.accountTypes.k401})`}
                </span>
              )}
            </h4>
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
            <h4>
              IRA Contributions
              {useProjectedAGI && (
                <span className="contribution-mode-indicator">
                  {` (Per Month Basis - ${person.accountTypes.ira})`}
                </span>
              )}
            </h4>
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
              <h4>
                HSA Contributions
                {useProjectedAGI && (
                  <span className="contribution-mode-indicator">
                    {` (Per Paycheck Basis - ${person.accountTypes.hsa})`}
                  </span>
                )}
              </h4>
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
              <h4>
                ESPP Contributions
                {useProjectedAGI && (
                  <span className="contribution-mode-indicator">
                    {` (Per Paycheck Basis - ${person.accountTypes.espp})`}
                  </span>
                )}
              </h4>
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
              <h4>
                Brokerage Contributions
                {useProjectedAGI && (
                  <span className="contribution-mode-indicator">
                    {` (Per Month Basis - ${person.accountTypes.brokerage})`}
                  </span>
                )}
              </h4>
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
          <h2>
            Household Summary
            {useProjectedAGI && (
              <span className="household-mode-indicator"> (YTD + Projected Calculations)</span>
            )}
          </h2>
          {/* Debug info when YTD mode is active */}
          {useProjectedAGI && (
            <div className="optimize-agi-debug">
              {contributionMetrics.your && (
                <div className="agi-debug-item">
                  <strong>{contributionMetrics.your.name}:</strong> 
                  Salary: {formatCurrency(contributionMetrics.your.salary)} → 
                  Effective AGI: {formatCurrency(contributionMetrics.your.effectiveAGI)}
                </div>
              )}
              {contributionMetrics.spouse && (
                <div className="agi-debug-item">
                  <strong>{contributionMetrics.spouse.name}:</strong> 
                  Salary: {formatCurrency(contributionMetrics.spouse.salary)} → 
                  Effective AGI: {formatCurrency(contributionMetrics.spouse.effectiveAGI)}
                </div>
              )}
              <div className="agi-debug-note">
                <strong>Note:</strong> All contribution types now use YTD + projected calculations when toggle is active.
                Percentage-based (401k, ESPP) scale with income changes. Fixed amounts (IRA, HSA, Brokerage) use YTD actual + remaining periods.
              </div>
            </div>
          )}
          
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