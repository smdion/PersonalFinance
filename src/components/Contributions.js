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
  calculateRemainingContributionRoom,
  calculateMaxOutPerPaycheckAmounts 
} from '../utils/calculationHelpers';
import '../styles/contributions.css';

const Contributions = () => {
  const navigate = useNavigate();
  const [paycheckData, setPaycheckData] = useState({});
  const [performanceData, setPerformanceData] = useState({});
  const [activeTab, setActiveTab] = useState('standard');
  const [activePersonTab, setActivePersonTab] = useState('standard');
  const [showSpouseCalculator, setShowSpouseCalculator] = useState(true);

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

  // Event listener for navigation dual calculator toggle
  useEffect(() => {
    const handleToggleDualCalculator = () => {
      setShowSpouseCalculator(prev => !prev);
    };

    window.addEventListener('toggleDualCalculator', handleToggleDualCalculator);

    return () => {
      window.removeEventListener('toggleDualCalculator', handleToggleDualCalculator);
    };
  }, []);

  // Calculate contribution metrics
  const contributionMetrics = useMemo(() => {
    if (!paycheckData?.your) return { hasData: false };

    const yourData = paycheckData.your;
    const spouseData = paycheckData.spouse || {};
    const showSpouse = showSpouseCalculator;

    // Helper function to calculate person's metrics
    const calculatePersonMetrics = (person, personName) => {
      
      const salary = parseFloat(person.salary) || 0;
      const birthday = person.birthday;
      const age = birthday ? calculateAge(birthday) : 0;
      const isOver50 = age >= 50;
      const isOver55 = age >= 55;

      // Calculate AGI - use projected income from YTD data if available for YTD calculations
      let effectiveAGI = salary;
      if (person.incomePeriodsData && person.incomePeriodsData.length > 0) {
        effectiveAGI = calculateProjectedAnnualIncome(person.incomePeriodsData, salary);
      }

      // Get YTD contributions from Performance data 
      const individualUserNames = [person.name].filter(n => n && n.trim());
      const allUserNames = [person.name, spouseData.name, 'Joint'].filter(n => n && n.trim());
      
      // Get individual contributions (401k, HSA, ESPP) - only this person's accounts
      const individualYtdContributions = calculateYTDContributionsFromPerformance(performanceData, individualUserNames);
      
      // Get all contributions (for joint accounts like IRA, Brokerage) - all users including Joint
      const allYtdContributions = calculateYTDContributionsFromPerformance(performanceData, allUserNames);
      
      // Determine which accounts are joint and divide contributions evenly
      const actualUsers = [person.name, spouseData.name].filter(n => n && n.trim());
      const numActualUsers = actualUsers.length;
      
      // Start with individual contributions, then override with joint contributions where appropriate
      const ytdContributions = { ...individualYtdContributions };
      
      // Check for joint accounts in performance data
      const jointAccounts = {
        brokerage: false,
        ira: true // IRA contributions are treated as joint in our math per requirements
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
              }
            });
          }
        });
      }
      
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
      
      const remainingRoom = calculateRemainingContributionRoom(ytdContributions, age, person.hsaCoverageType);

      // Calculate YTD and projected contributions using actual pay periods
      const payPeriod = person.payPeriod || 'biWeekly';

      // Calculate per-paycheck amounts needed to max out contributions for remaining year (for YTD mode)
      const maxOutAmounts = ytdContributions ? 
        calculateMaxOutPerPaycheckAmounts(
          remainingRoom,
          person.incomePeriodsData,
          salary,
          payPeriod,
          age,
          person.hsaCoverageType
        ) : null;
      const periodsPerYear = PAY_PERIODS[payPeriod].periodsPerYear;

      // 401k calculations - from retirementOptions
      const retirementOptions = person.retirementOptions || {};
      const traditional401k = parseFloat(retirementOptions.traditional401kPercent) || 0;
      const roth401k = parseFloat(retirementOptions.roth401kPercent) || 0;
      const total401kPercent = traditional401k + roth401k;
      
      // Standard calculation (always calculate)
      const annual401k = salary * (total401kPercent / 100);
      const employerMatch = parseFloat(retirementOptions.employerMatch) || 0;
      const annualEmployerMatch = salary * (employerMatch / 100);
      
      const max401k = isOver50 
        ? CONTRIBUTION_LIMITS_2025.k401_employee + CONTRIBUTION_LIMITS_2025.k401_catchUp
        : CONTRIBUTION_LIMITS_2025.k401_employee;

      // IRA calculations - from budgetImpacting
      const budgetImpacting = person.budgetImpacting || {};
      const traditionalIra = parseFloat(budgetImpacting.traditionalIraMonthly) || 0;
      const rothIra = parseFloat(budgetImpacting.rothIraMonthly) || 0;
      
      // Standard calculation
      let annualIra = (traditionalIra + rothIra) * 12;
      
      // For joint IRA accounts, divide by number of users to show individual allocation
      if (jointAccounts.ira && numActualUsers > 1) {
        annualIra = annualIra / numActualUsers;
      }
      
      const maxIra = isOver50 
        ? CONTRIBUTION_LIMITS_2025.ira_self + CONTRIBUTION_LIMITS_2025.ira_catchUp
        : CONTRIBUTION_LIMITS_2025.ira_self;

      // HSA calculations - from medicalDeductions
      const medicalDeductions = person.medicalDeductions || {};
      const hsaContributionPerPaycheck = parseFloat(medicalDeductions.hsa) || 0;
      const hsaEmployerAnnual = parseFloat(medicalDeductions.employerHsa) || 0;
      
      // Standard calculation
      const hsaContributionAnnual = hsaContributionPerPaycheck * periodsPerYear;
      const hsaEmployerContribution = hsaEmployerAnnual;
      
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
      let annualBrokerage = brokerageMonthly * 12;
      
      // For joint brokerage accounts, divide by number of users to show individual allocation
      if (jointAccounts.brokerage && numActualUsers > 1) {
        annualBrokerage = annualBrokerage / numActualUsers;
      }
      
      // Determine account types (joint vs individual) from performance data
      const accountTypes = {
        k401: 'Individual', // 401k are always individual accounts
        ira: 'Joint', // Our contribution math treats IRA as joint (per requirements)
        hsa: 'Individual', // HSA are always individual accounts  
        espp: 'Individual', // ESPP are always individual accounts
        brokerage: jointAccounts.brokerage ? 'Joint' : 'Individual' // Use the same detection logic
      };

      // Calculate both standard and YTD breakdown for side-by-side comparison
      let standardBreakdown = {};
      let ytdBreakdown = {};
      
      // Calculate standard breakdown with max out amounts
      const standardMaxOutAmounts = {
        k401_perPaycheck: {
          amount: periodsPerYear > 0 ? Math.max(0, (max401k - annual401k) / periodsPerYear) : 0,
          percent: salary > 0 ? Math.max(0, ((max401k - annual401k) / salary) * 100) : 0
        },
        ira_perMonth: Math.max(0, (maxIra - annualIra) / 12),
        hsa_perPaycheck: periodsPerYear > 0 ? Math.max(0, (maxHsa - hsaContributionAnnual) / periodsPerYear) : 0,
        remainingPaychecks: periodsPerYear,
        remainingMonths: 12
      };

      // Always calculate standard breakdown
      standardBreakdown = {
        k401: {
          ytdEmployee: 0, // No YTD data in standard mode
          ytdEmployer: 0,
          ytdTotal: 0,
          projectedEmployee: annual401k, // All contribution is "projected" 
          projectedEmployer: annualEmployerMatch,
          projectedTotal: annual401k + annualEmployerMatch,
          totalEmployee: annual401k,
          totalEmployer: annualEmployerMatch,
          totalCombined: annual401k + annualEmployerMatch,
          limit: max401k,
          remaining: max401k - annual401k
        },
        ira: {
          ytd: 0,
          projected: annualIra,
          total: annualIra,
          limit: maxIra,
          remaining: maxIra - annualIra
        },
        hsa: {
          ytdEmployee: 0,
          ytdEmployer: 0,
          ytdTotal: 0,
          projectedEmployee: hsaContributionAnnual,
          projectedEmployer: hsaEmployerContribution,
          projectedTotal: hsaContributionAnnual + hsaEmployerContribution,
          totalEmployee: hsaContributionAnnual,
          totalEmployer: hsaEmployerContribution,
          totalCombined: hsaContributionAnnual + hsaEmployerContribution,
          limit: maxHsa,
          remaining: maxHsa - hsaContributionAnnual
        },
        espp: {
          ytd: 0,
          projected: annualEspp,
          total: annualEspp,
          limit: null
        },
        brokerage: {
          ytd: 0,
          projected: annualBrokerage,
          total: annualBrokerage,
          limit: null
        }
      };
      
      // Calculate YTD breakdown if data is available
      if (ytdContributions) {
        // YTD mode - show the 4-part breakdown
        
        // 401k breakdown
        const ytd401k = ytdContributions.total401k || 0;
        const ytdEmployerMatch = ytdContributions.totalEmployerMatch || 0;
        
        // Calculate remaining pay periods starting from next month
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1); // Start of next month
        const endOfYear = new Date(today.getFullYear(), 11, 31);
        let remainingPaychecks;
        
        // Helper function to calculate pay periods between dates
        const calculatePayPeriodsBetweenDates = (startDate, endDate, payPeriod) => {
          const periodsPerYear = PAY_PERIODS[payPeriod].periodsPerYear;
          const millisecondsInYear = 365.25 * 24 * 60 * 60 * 1000; // Account for leap years
          const timeDifferenceMs = endDate - startDate;
          const yearsSpanned = timeDifferenceMs / millisecondsInYear;
          return yearsSpanned * periodsPerYear;
        };
        
        if (person.incomePeriodsData && person.incomePeriodsData.length > 0) {
          // Use income periods data to calculate precise remaining paychecks from next month
          const lastPeriod = person.incomePeriodsData.sort((a, b) => new Date(b.endDate) - new Date(a.endDate))[0];
          if (lastPeriod) {
            const lastEndDate = new Date(lastPeriod.endDate);
            if (lastEndDate < endOfYear) {
              // Calculate remaining pay periods starting from next month or after last period, whichever is later
              const startDate = lastEndDate > nextMonth ? new Date(lastEndDate.getTime() + 24*60*60*1000) : nextMonth;
              remainingPaychecks = calculatePayPeriodsBetweenDates(startDate, endOfYear, payPeriod);
            } else {
              remainingPaychecks = 0;
            }
          } else {
            // Calculate from next month to end of year
            remainingPaychecks = calculatePayPeriodsBetweenDates(nextMonth, endOfYear, payPeriod);
          }
        } else {
          // Use time-based calculation from next month to end of year
          remainingPaychecks = calculatePayPeriodsBetweenDates(nextMonth, endOfYear, payPeriod);
        }
        
        // Calculate projected contributions for remaining pay periods only
        const grossPayPerPaycheck = salary / periodsPerYear;
        const projected401k = grossPayPerPaycheck * remainingPaychecks * (total401kPercent / 100);
        const projectedEmployerMatch = grossPayPerPaycheck * remainingPaychecks * (employerMatch / 100);
        
        // IRA breakdown
        const ytdIra = ytdContributions.totalIra || 0;
        const monthsRemaining = Math.max(0, 12 - today.getMonth() - 1); // Start from next month
        const projectedIra = (traditionalIra + rothIra) * monthsRemaining;
        
        // HSA breakdown
        const ytdHsa = ytdContributions.hsa || 0;
        // Calculate projected HSA contributions for remaining pay periods only
        const projectedHsa = hsaContributionPerPaycheck * remainingPaychecks;
        
        // ESPP breakdown
        const ytdEspp = ytdContributions.espp || 0;
        // Calculate projected ESPP contributions for remaining pay periods only
        const projectedEspp = grossPayPerPaycheck * remainingPaychecks * (esppPercent / 100);
        
        // Brokerage breakdown
        const ytdBrokerage = ytdContributions.brokerage || 0;
        const projectedBrokerage = brokerageMonthly * monthsRemaining;
        
        ytdBreakdown = {
          k401: {
            ytdEmployee: ytd401k,
            ytdEmployer: ytdEmployerMatch,
            ytdTotal: ytd401k + ytdEmployerMatch,
            projectedEmployee: projected401k,
            projectedEmployer: projectedEmployerMatch,
            projectedTotal: projected401k + projectedEmployerMatch,
            totalEmployee: ytd401k + projected401k,
            totalEmployer: ytdEmployerMatch + projectedEmployerMatch,
            totalCombined: ytd401k + projected401k + ytdEmployerMatch + projectedEmployerMatch,
            limit: max401k,
            remaining: max401k - (ytd401k + projected401k)
          },
          ira: {
            ytd: ytdIra,
            projected: projectedIra,
            total: ytdIra + projectedIra,
            limit: maxIra,
            remaining: maxIra - (ytdIra + projectedIra)
          },
          hsa: {
            ytdEmployee: ytdHsa,
            ytdEmployer: 0, // YTD employer HSA is complex, keeping simple for now
            ytdTotal: ytdHsa,
            projectedEmployee: projectedHsa,
            projectedEmployer: 0, // Keeping simple for now
            projectedTotal: projectedHsa,
            totalEmployee: ytdHsa + projectedHsa,
            totalEmployer: hsaEmployerContribution, // Use annual employer amount
            totalCombined: ytdHsa + projectedHsa + hsaEmployerContribution,
            limit: maxHsa,
            remaining: maxHsa - (ytdHsa + projectedHsa)
          },
          espp: {
            ytd: ytdEspp,
            projected: projectedEspp,
            total: ytdEspp + projectedEspp,
            limit: null // No IRS limit for ESPP
          },
          brokerage: {
            ytd: ytdBrokerage,
            projected: projectedBrokerage,
            total: ytdBrokerage + projectedBrokerage,
            limit: null // No IRS limit for brokerage
          }
        };
      }

      return {
        name: personName,
        salary,
        effectiveAGI,
        age,
        ytdContributions,
        remainingRoom,
        maxOutAmounts,
        standardMaxOutAmounts,
        accountTypes,
        standardBreakdown,
        ytdBreakdown,
        contributions: {
          k401: {
            employee: annual401k,
            employer: annualEmployerMatch,
            total: annual401k + annualEmployerMatch,
            max: max401k,
            remaining: max401k - annual401k
          },
          ira: {
            amount: annualIra,
            max: maxIra,
            remaining: maxIra - annualIra
          },
          hsa: {
            employee: hsaContributionAnnual,
            employer: hsaEmployerContribution,
            total: hsaContributionAnnual + hsaEmployerContribution,
            max: maxHsa,
            remaining: maxHsa - hsaContributionAnnual
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
  }, [paycheckData, performanceData, showSpouseCalculator]);

  const handleNavigateToPaycheck = () => {
    navigate('/paycheck');
  };

  // Calculate household totals
  const householdTotals = useMemo(() => {
    if (!contributionMetrics?.hasData) return null;

    const people = [contributionMetrics.your, contributionMetrics.spouse].filter(Boolean);
    
    // Helper function to determine if we should sum or use original total for joint accounts
    const calculateJointTotal = (accountType, individualAmounts) => {
      // Check if this account type is joint for any person
      const isJoint = people.some(p => p.accountTypes && p.accountTypes[accountType] === 'Joint');
      
      if (isJoint && people.length > 1) {
        // For joint accounts, use the individual amount * number of people to get back to the original total
        // Since joint amounts are already divided by number of users in calculatePersonMetrics
        return individualAmounts[0] * people.length;
      } else {
        // For individual accounts or single person, sum normally
        return individualAmounts.reduce((sum, amount) => sum + amount, 0);
      }
    };
    
    const iraAmounts = people.map(p => p.contributions.ira.amount);
    const brokerageAmounts = people.map(p => p.contributions.brokerage.amount);
    
    const totalIra = calculateJointTotal('ira', iraAmounts);
    const totalBrokerage = calculateJointTotal('brokerage', brokerageAmounts);
    
    // Individual accounts always sum normally
    const total401k = people.reduce((sum, p) => sum + p.contributions.k401.total, 0);
    const totalHsa = people.reduce((sum, p) => sum + p.contributions.hsa.total, 0);
    const totalEspp = people.reduce((sum, p) => sum + p.contributions.espp.amount, 0);
    
    // For remaining room, joint accounts need special handling too
    const iraRemainingAmounts = people.map(p => p.contributions.ira.remaining);
    const remainingIra = calculateJointTotal('ira', iraRemainingAmounts);
    
    // Calculate breakdown totals for both modes
    let standardBreakdownTotals = {};
    let ytdBreakdownTotals = {};
    
    // Calculate separate annual totals for each calculation mode
    let standardAnnualTotals = {};
    let ytdAnnualTotals = {};
    
    if (people.length > 0 && people[0].standardBreakdown) {
      // Standard breakdown totals
      standardBreakdownTotals.ytd401kEmployee = people.reduce((sum, p) => sum + (p.standardBreakdown.k401?.ytdEmployee || 0), 0);
      standardBreakdownTotals.ytd401kEmployer = people.reduce((sum, p) => sum + (p.standardBreakdown.k401?.ytdEmployer || 0), 0);
      standardBreakdownTotals.ytd401kTotal = standardBreakdownTotals.ytd401kEmployee + standardBreakdownTotals.ytd401kEmployer;
      standardBreakdownTotals.projected401kEmployee = people.reduce((sum, p) => sum + (p.standardBreakdown.k401?.projectedEmployee || 0), 0);
      standardBreakdownTotals.projected401kEmployer = people.reduce((sum, p) => sum + (p.standardBreakdown.k401?.projectedEmployer || 0), 0);
      standardBreakdownTotals.projected401kTotal = standardBreakdownTotals.projected401kEmployee + standardBreakdownTotals.projected401kEmployer;
      
      // IRA breakdown - handle joint accounts
      const standardIraYtdAmounts = people.map(p => p.standardBreakdown.ira?.ytd || 0);
      const standardIraProjectedAmounts = people.map(p => p.standardBreakdown.ira?.projected || 0);
      standardBreakdownTotals.ytdIra = calculateJointTotal('ira', standardIraYtdAmounts);
      standardBreakdownTotals.projectedIra = calculateJointTotal('ira', standardIraProjectedAmounts);
      
      // HSA breakdown
      standardBreakdownTotals.ytdHsaEmployee = people.reduce((sum, p) => sum + (p.standardBreakdown.hsa?.ytdEmployee || 0), 0);
      standardBreakdownTotals.ytdHsaEmployer = people.reduce((sum, p) => sum + (p.standardBreakdown.hsa?.ytdEmployer || 0), 0);
      standardBreakdownTotals.projectedHsaEmployee = people.reduce((sum, p) => sum + (p.standardBreakdown.hsa?.projectedEmployee || 0), 0);
      standardBreakdownTotals.projectedHsaEmployer = people.reduce((sum, p) => sum + (p.standardBreakdown.hsa?.projectedEmployer || 0), 0);
      
      // ESPP breakdown
      standardBreakdownTotals.ytdEspp = people.reduce((sum, p) => sum + (p.standardBreakdown.espp?.ytd || 0), 0);
      standardBreakdownTotals.projectedEspp = people.reduce((sum, p) => sum + (p.standardBreakdown.espp?.projected || 0), 0);
      
      // Brokerage breakdown - handle joint accounts
      const standardBrokerageYtdAmounts = people.map(p => p.standardBreakdown.brokerage?.ytd || 0);
      const standardBrokerageProjectedAmounts = people.map(p => p.standardBreakdown.brokerage?.projected || 0);
      standardBreakdownTotals.ytdBrokerage = calculateJointTotal('brokerage', standardBrokerageYtdAmounts);
      standardBreakdownTotals.projectedBrokerage = calculateJointTotal('brokerage', standardBrokerageProjectedAmounts);
      
      // Calculate standard annual totals from breakdown data
      const standardIraAmounts = people.map(p => p.standardBreakdown.ira?.total || 0);
      const standardBrokerageAmounts = people.map(p => p.standardBreakdown.brokerage?.total || 0);
      
      standardAnnualTotals = {
        total401k: people.reduce((sum, p) => sum + (p.standardBreakdown.k401?.totalCombined || 0), 0),
        totalIra: calculateJointTotal('ira', standardIraAmounts),
        totalHsa: people.reduce((sum, p) => sum + (p.standardBreakdown.hsa?.totalCombined || 0), 0),
        totalEspp: people.reduce((sum, p) => sum + (p.standardBreakdown.espp?.total || 0), 0),
        totalBrokerage: calculateJointTotal('brokerage', standardBrokerageAmounts)
      };
      standardAnnualTotals.totalContributions = standardAnnualTotals.total401k + standardAnnualTotals.totalIra + standardAnnualTotals.totalHsa + standardAnnualTotals.totalEspp + standardAnnualTotals.totalBrokerage;
    }
    
    if (people.length > 0 && people[0].ytdBreakdown) {
      // YTD breakdown totals
      ytdBreakdownTotals.ytd401kEmployee = people.reduce((sum, p) => sum + (p.ytdBreakdown.k401?.ytdEmployee || 0), 0);
      ytdBreakdownTotals.ytd401kEmployer = people.reduce((sum, p) => sum + (p.ytdBreakdown.k401?.ytdEmployer || 0), 0);
      ytdBreakdownTotals.ytd401kTotal = ytdBreakdownTotals.ytd401kEmployee + ytdBreakdownTotals.ytd401kEmployer;
      ytdBreakdownTotals.projected401kEmployee = people.reduce((sum, p) => sum + (p.ytdBreakdown.k401?.projectedEmployee || 0), 0);
      ytdBreakdownTotals.projected401kEmployer = people.reduce((sum, p) => sum + (p.ytdBreakdown.k401?.projectedEmployer || 0), 0);
      ytdBreakdownTotals.projected401kTotal = ytdBreakdownTotals.projected401kEmployee + ytdBreakdownTotals.projected401kEmployer;
      
      // IRA breakdown - handle joint accounts
      const ytdIraYtdAmounts = people.map(p => p.ytdBreakdown.ira?.ytd || 0);
      const ytdIraProjectedAmounts = people.map(p => p.ytdBreakdown.ira?.projected || 0);
      ytdBreakdownTotals.ytdIra = calculateJointTotal('ira', ytdIraYtdAmounts);
      ytdBreakdownTotals.projectedIra = calculateJointTotal('ira', ytdIraProjectedAmounts);
      
      // HSA breakdown
      ytdBreakdownTotals.ytdHsaEmployee = people.reduce((sum, p) => sum + (p.ytdBreakdown.hsa?.ytdEmployee || 0), 0);
      ytdBreakdownTotals.ytdHsaEmployer = people.reduce((sum, p) => sum + (p.ytdBreakdown.hsa?.ytdEmployer || 0), 0);
      ytdBreakdownTotals.projectedHsaEmployee = people.reduce((sum, p) => sum + (p.ytdBreakdown.hsa?.projectedEmployee || 0), 0);
      ytdBreakdownTotals.projectedHsaEmployer = people.reduce((sum, p) => sum + (p.ytdBreakdown.hsa?.projectedEmployer || 0), 0);
      
      // ESPP breakdown
      ytdBreakdownTotals.ytdEspp = people.reduce((sum, p) => sum + (p.ytdBreakdown.espp?.ytd || 0), 0);
      ytdBreakdownTotals.projectedEspp = people.reduce((sum, p) => sum + (p.ytdBreakdown.espp?.projected || 0), 0);
      
      // Brokerage breakdown - handle joint accounts
      const ytdBrokerageYtdAmounts = people.map(p => p.ytdBreakdown.brokerage?.ytd || 0);
      const ytdBrokerageProjectedAmounts = people.map(p => p.ytdBreakdown.brokerage?.projected || 0);
      ytdBreakdownTotals.ytdBrokerage = calculateJointTotal('brokerage', ytdBrokerageYtdAmounts);
      ytdBreakdownTotals.projectedBrokerage = calculateJointTotal('brokerage', ytdBrokerageProjectedAmounts);
      
      // Calculate YTD annual totals from breakdown data
      const ytdIraAmounts = people.map(p => p.ytdBreakdown.ira?.total || 0);
      const ytdBrokerageAmounts = people.map(p => p.ytdBreakdown.brokerage?.total || 0);
      
      ytdAnnualTotals = {
        total401k: people.reduce((sum, p) => sum + (p.ytdBreakdown.k401?.totalCombined || 0), 0),
        totalIra: calculateJointTotal('ira', ytdIraAmounts),
        totalHsa: people.reduce((sum, p) => sum + (p.ytdBreakdown.hsa?.totalCombined || 0), 0),
        totalEspp: people.reduce((sum, p) => sum + (p.ytdBreakdown.espp?.total || 0), 0),
        totalBrokerage: calculateJointTotal('brokerage', ytdBrokerageAmounts)
      };
      ytdAnnualTotals.totalContributions = ytdAnnualTotals.total401k + ytdAnnualTotals.totalIra + ytdAnnualTotals.totalHsa + ytdAnnualTotals.totalEspp + ytdAnnualTotals.totalBrokerage;
    }
    
    return {
      total401k,
      totalIra,
      totalHsa,
      totalEspp,
      totalBrokerage,
      totalContributions: total401k + totalIra + totalHsa + totalEspp + totalBrokerage,
      remaining401k: people.reduce((sum, p) => sum + p.contributions.k401.remaining, 0),
      remainingIra,
      remainingHsa: people.reduce((sum, p) => sum + p.contributions.hsa.remaining, 0),
      standardBreakdown: standardBreakdownTotals,
      ytdBreakdown: ytdBreakdownTotals,
      standardAnnualTotals,
      ytdAnnualTotals
    };
  }, [contributionMetrics]);

  if (!contributionMetrics?.hasData) {
    return (
      <div className="contributions-container">
        <Navigation />
        <div className="app-container">
          <div className="header">
            <div className="contributions-header-icon">⚡</div>
            <h1>Analyze Your Contributions</h1>
            <p>Analyze your contribution strategy and find improvement opportunities</p>
          </div>
          <div className="contributions-no-data">
            <h3>No paycheck data found</h3>
            <p>Please set up your paycheck calculator first to see improvement recommendations.</p>
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

  const HouseholdBreakdownSection = ({ breakdownData, annualTotals }) => {
    if (!breakdownData) return null;
    
    // Use provided annual totals or fall back to legacy householdTotals
    const totals = annualTotals || householdTotals;

    // Calculate if household totals exceed IRS limits using contributionMetrics data
    const people = [contributionMetrics.your, contributionMetrics.spouse].filter(Boolean);
    const total401kLimit = people.reduce((sum, p) => {
      const age = p.age || 0;
      const isOver50 = age >= 50;
      return sum + (isOver50 
        ? CONTRIBUTION_LIMITS_2025.k401_employee + CONTRIBUTION_LIMITS_2025.k401_catchUp
        : CONTRIBUTION_LIMITS_2025.k401_employee);
    }, 0);
    
    const totalIraLimit = people.reduce((sum, p) => {
      const age = p.age || 0;
      const isOver50 = age >= 50;
      return sum + (isOver50 
        ? CONTRIBUTION_LIMITS_2025.ira_self + CONTRIBUTION_LIMITS_2025.ira_catchUp
        : CONTRIBUTION_LIMITS_2025.ira_self);
    }, 0);
    
    // For HSA, we need to be careful about how we calculate household limits
    // Each person has their own HSA limit based on their coverage type
    const totalHsaLimit = people.reduce((sum, p) => {
      const age = p.age || 0;
      const isOver55 = age >= 55;
      // Try to access hsaCoverageType from the person's data
      const hsaCoverage = paycheckData[p.name === contributionMetrics.your?.name ? 'your' : 'spouse']?.hsaCoverageType || 'none';
      if (hsaCoverage === 'self') {
        return sum + CONTRIBUTION_LIMITS_2025.hsa_self + (isOver55 ? CONTRIBUTION_LIMITS_2025.hsa_catchUp : 0);
      } else if (hsaCoverage === 'family') {
        return sum + CONTRIBUTION_LIMITS_2025.hsa_family + (isOver55 ? CONTRIBUTION_LIMITS_2025.hsa_catchUp : 0);
      }
      return sum;
    }, 0);

    const is401kOverLimit = totals.total401k > total401kLimit;
    const isIraOverLimit = totals.totalIra > totalIraLimit;
    const isHsaOverLimit = totals.totalHsa > totalHsaLimit;

    return (
      <div className="contributions-household-breakdown">
        {/* 401k */}
        <div className="contributions-household-section">
          <h4>
            401(k) Contributions
            {is401kOverLimit && <span className="contributions-warning-icon" title="Household total exceeds combined IRS limits">⚠️</span>}
          </h4>
          <div className="contributions-household-grid">
            <div className="contributions-household-item">
              <span className="label">YTD Employee:</span>
              <span className="value">{formatCurrency(breakdownData.ytd401kEmployee || 0)}</span>
            </div>
            <div className="contributions-household-item">
              <span className="label">YTD Employer:</span>
              <span className="value">{formatCurrency(breakdownData.ytd401kEmployer || 0)}</span>
            </div>
            <div className="contributions-household-item">
              <span className="label">YTD Total:</span>
              <span className="value">{formatCurrency(breakdownData.ytd401kTotal || 0)}</span>
            </div>
            <div className="contributions-household-item">
              <span className="label">Projected Employee:</span>
              <span className="value">{formatCurrency(breakdownData.projected401kEmployee || 0)}</span>
            </div>
            <div className="contributions-household-item">
              <span className="label">Projected Employer:</span>
              <span className="value">{formatCurrency(breakdownData.projected401kEmployer || 0)}</span>
            </div>
            <div className="contributions-household-item">
              <span className="label">Projected Total:</span>
              <span className="value">{formatCurrency(breakdownData.projected401kTotal || 0)}</span>
            </div>
            <div className="contributions-household-item total">
              <span className="label">Annual Total:</span>
              <span className={`value ${is401kOverLimit ? 'contributions-limit-exceeded' : ''}`}>
                {formatCurrency(totals.total401k)}
                {is401kOverLimit && <span className="contributions-warning-icon">⚠️</span>}
              </span>
            </div>
          </div>
        </div>

        {/* IRA */}
        <div className="contributions-household-section">
          <h4>
            IRA Contributions
            {isIraOverLimit && <span className="contributions-warning-icon" title="Household total exceeds combined IRS limits">⚠️</span>}
          </h4>
          <div className="contributions-household-grid">
            <div className="contributions-household-item">
              <span className="label">YTD Total:</span>
              <span className="value">{formatCurrency(breakdownData.ytdIra || 0)}</span>
            </div>
            <div className="contributions-household-item">
              <span className="label">Projected Total:</span>
              <span className="value">{formatCurrency(breakdownData.projectedIra || 0)}</span>
            </div>
            <div className="contributions-household-item total">
              <span className="label">Annual Total:</span>
              <span className={`value ${isIraOverLimit ? 'contributions-limit-exceeded' : ''}`}>
                {formatCurrency(totals.totalIra)}
                {isIraOverLimit && <span className="contributions-warning-icon">⚠️</span>}
              </span>
            </div>
          </div>
        </div>

        {/* HSA */}
        {totals.totalHsa > 0 && (
          <div className="contributions-household-section">
            <h4>
              HSA Contributions
              {isHsaOverLimit && <span className="contributions-warning-icon" title="Household total exceeds combined IRS limits">⚠️</span>}
            </h4>
            <div className="contributions-household-grid">
              <div className="contributions-household-item">
                <span className="label">YTD Employee:</span>
                <span className="value">{formatCurrency(breakdownData.ytdHsaEmployee || 0)}</span>
              </div>
              <div className="contributions-household-item">
                <span className="label">YTD Employer:</span>
                <span className="value">{formatCurrency(breakdownData.ytdHsaEmployer || 0)}</span>
              </div>
              <div className="contributions-household-item">
                <span className="label">Projected Employee:</span>
                <span className="value">{formatCurrency(breakdownData.projectedHsaEmployee || 0)}</span>
              </div>
              <div className="contributions-household-item">
                <span className="label">Projected Employer:</span>
                <span className="value">{formatCurrency(breakdownData.projectedHsaEmployer || 0)}</span>
              </div>
              <div className="contributions-household-item total">
                <span className="label">Annual Total:</span>
                <span className={`value ${isHsaOverLimit ? 'contributions-limit-exceeded' : ''}`}>
                  {formatCurrency(totals.totalHsa)}
                  {isHsaOverLimit && <span className="contributions-warning-icon">⚠️</span>}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ESPP */}
        {totals.totalEspp > 0 && (
          <div className="contributions-household-section">
            <h4>ESPP Contributions</h4>
            <div className="contributions-household-grid">
              <div className="contributions-household-item">
                <span className="label">YTD Total:</span>
                <span className="value">{formatCurrency(breakdownData.ytdEspp || 0)}</span>
              </div>
              <div className="contributions-household-item">
                <span className="label">Projected Total:</span>
                <span className="value">{formatCurrency(breakdownData.projectedEspp || 0)}</span>
              </div>
              <div className="contributions-household-item total">
                <span className="label">Annual Total:</span>
                <span className="value">{formatCurrency(totals.totalEspp)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Brokerage */}
        {totals.totalBrokerage > 0 && (
          <div className="contributions-household-section">
            <h4>Brokerage Contributions</h4>
            <div className="contributions-household-grid">
              <div className="contributions-household-item">
                <span className="label">YTD Total:</span>
                <span className="value">{formatCurrency(breakdownData.ytdBrokerage || 0)}</span>
              </div>
              <div className="contributions-household-item">
                <span className="label">Projected Total:</span>
                <span className="value">{formatCurrency(breakdownData.projectedBrokerage || 0)}</span>
              </div>
              <div className="contributions-household-item total">
                <span className="label">Annual Total:</span>
                <span className="value">{formatCurrency(totals.totalBrokerage)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Grand Total */}
        <div className="contributions-household-section">
          <h4>Total Annual Contributions</h4>
          <div className="contributions-household-grid">
            <div className="contributions-household-item grand-total">
              <span className="label">Combined Household Total:</span>
              <span className="value">{formatCurrency(totals.totalContributions)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PersonContributionCard = ({ person }) => {
    if (!person) return null;

    // Helper component for the 4-part breakdown display
    const ContributionBreakdown = ({ accountType, breakdown, accountTypeName, calculationMode = 'standard' }) => {
      if (!breakdown) return null;

      // Check if annual total exceeds IRS limit
      const isOverLimit = breakdown.limit && (breakdown.totalCombined || breakdown.total) > breakdown.limit;
      const warningIcon = isOverLimit ? ' ⚠️' : '';

      return (
        <div className="contributions-contribution-section">
          <h4>
            {accountTypeName} Contributions
            <span className="contribution-mode-indicator">
              {` (${person.accountTypes[accountType]})`}
            </span>
            {isOverLimit && <span className="contributions-warning-icon" title="Exceeds IRS annual limit">⚠️</span>}
          </h4>
          <div className="contributions-contribution-grid breakdown-mode">
            {/* YTD Contributions */}
            <div className="contributions-contribution-header">YTD Contributions Made</div>
            {breakdown.ytdEmployee !== undefined ? (
              <>
                <div className="contributions-contribution-item">
                  <span className="label">Employee:</span>
                  <span className="value">{formatCurrency(breakdown.ytdEmployee)}</span>
                </div>
                <div className="contributions-contribution-item">
                  <span className="label">Employer:</span>
                  <span className="value">{formatCurrency(breakdown.ytdEmployer)}</span>
                </div>
                <div className="contributions-contribution-item">
                  <span className="label">YTD Total:</span>
                  <span className="value total">{formatCurrency(breakdown.ytdTotal)}</span>
                </div>
              </>
            ) : (
              <div className="contributions-contribution-item">
                <span className="label">YTD Total:</span>
                <span className="value total">{formatCurrency(breakdown.ytd)}</span>
              </div>
            )}

            {/* Projected Remaining */}
            <div className="contributions-contribution-header">Projected Remaining</div>
            {breakdown.projectedEmployee !== undefined ? (
              <>
                <div className="contributions-contribution-item">
                  <span className="label">Employee:</span>
                  <span className="value">{formatCurrency(breakdown.projectedEmployee)}</span>
                </div>
                <div className="contributions-contribution-item">
                  <span className="label">Employer:</span>
                  <span className="value">{formatCurrency(breakdown.projectedEmployer)}</span>
                </div>
                <div className="contributions-contribution-item">
                  <span className="label">Projected Total:</span>
                  <span className="value total">{formatCurrency(breakdown.projectedTotal)}</span>
                </div>
              </>
            ) : (
              <div className="contributions-contribution-item">
                <span className="label">Projected Total:</span>
                <span className="value total">{formatCurrency(breakdown.projected)}</span>
              </div>
            )}

            {/* Annual Total */}
            <div className="contributions-contribution-header">Annual Total (YTD + Projected)</div>
            {breakdown.totalEmployee !== undefined ? (
              <>
                <div className="contributions-contribution-item">
                  <span className="label">Employee:</span>
                  <span className="value">{formatCurrency(breakdown.totalEmployee)}</span>
                </div>
                <div className="contributions-contribution-item">
                  <span className="label">Employer:</span>
                  <span className="value">{formatCurrency(breakdown.totalEmployer)}</span>
                </div>
                <div className="contributions-contribution-item">
                  <span className="label">Combined Total:</span>
                  <span className={`value total highlight ${isOverLimit ? 'contributions-limit-exceeded' : ''}`}>
                    {formatCurrency(breakdown.totalCombined)}
                    {isOverLimit && <span className="contributions-warning-icon">⚠️</span>}
                  </span>
                </div>
              </>
            ) : (
              <div className="contributions-contribution-item">
                <span className="label">Annual Total:</span>
                <span className={`value total highlight ${isOverLimit ? 'contributions-limit-exceeded' : ''}`}>
                  {formatCurrency(breakdown.total)}
                  {isOverLimit && <span className="contributions-warning-icon">⚠️</span>}
                </span>
              </div>
            )}

            {/* IRS Limit */}
            {breakdown.limit && (
              <>
                <div className="contributions-contribution-header">IRS Annual Limit</div>
                <div className="contributions-contribution-item">
                  <span className="label">Annual Limit:</span>
                  <span className="value">{formatCurrency(breakdown.limit)}</span>
                </div>
                <div className="contributions-contribution-item">
                  <span className="label">{breakdown.remaining < 0 ? 'Over Contributed:' : 'Remaining Room:'}</span>
                  <span className={`value ${breakdown.remaining > 0 ? 'opportunity' : breakdown.remaining < 0 ? 'contributions-limit-exceeded' : 'maxed'}`}>
                    {breakdown.remaining < 0 ? formatCurrency(Math.abs(breakdown.remaining)) : formatCurrency(breakdown.remaining)}
                    {breakdown.remaining < 0 && <span className="contributions-warning-icon">⚠️</span>}
                  </span>
                </div>
                
                {/* Required to Max Out */}
                {breakdown.remaining > 0 && (
                  <>
                    <div className="contributions-contribution-header">Required to Max Out</div>
                    {(() => {
                      // Use appropriate max out amounts based on calculation mode
                      const maxOutData = calculationMode === 'ytd' ? person.maxOutAmounts : person.standardMaxOutAmounts;
                      
                      if (!maxOutData) return null;
                      
                      return (
                        <>
                          {accountType === 'k401' && (
                            <>
                              <div className="contributions-contribution-item">
                                <span className="label">Per Paycheck (Dollar):</span>
                                <span className="value opportunity">{formatCurrency(Math.max(0, maxOutData.k401_perPaycheck.amount))}</span>
                              </div>
                              <div className="contributions-contribution-item">
                                <span className="label">Per Paycheck (Percent):</span>
                                <span className="value opportunity">{Math.max(0, maxOutData.k401_perPaycheck.percent).toFixed(1)}%</span>
                              </div>
                            </>
                          )}
                          {accountType === 'ira' && (
                            <div className="contributions-contribution-item">
                              <span className="label">Per Month:</span>
                              <span className="value opportunity">{formatCurrency(Math.max(0, maxOutData.ira_perMonth))}</span>
                            </div>
                          )}
                          {accountType === 'hsa' && (
                            <div className="contributions-contribution-item">
                              <span className="label">Per Paycheck:</span>
                              <span className="value opportunity">{formatCurrency(Math.max(0, maxOutData.hsa_perPaycheck))}</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="contributions-person-card">
        <h3>{person.name}</h3>
        <div className="contributions-person-details">
          <div className="contributions-salary">
            <strong>Annual Salary:</strong> {formatCurrency(person.salary)}
          </div>
          {person.effectiveAGI !== person.salary && (
            <div className="contributions-effective-agi">
              <strong>Effective AGI (YTD + Projected):</strong> {formatCurrency(person.effectiveAGI)}
            </div>
          )}
          <div className="contributions-age">
            <strong>Age:</strong> {person.age}
          </div>
        </div>

        <div className="contributions-contributions">
          <div className="contributions-person-comparison">
            <div className="contributions-person-tab-navigation">
              <button 
                className={`contributions-person-tab-button ${activePersonTab === 'standard' ? 'active' : ''}`}
                onClick={() => setActivePersonTab('standard')}
              >
                📊 Annual Settings View
              </button>
              <button 
                className={`contributions-person-tab-button ${activePersonTab === 'ytd' ? 'active' : ''}`}
                onClick={() => setActivePersonTab('ytd')}
              >
                📈 Progress + Forecast View
              </button>
            </div>
            
            <div className="contributions-person-tab-content">
              {activePersonTab === 'standard' && person.standardBreakdown && (
                <>
                  <ContributionBreakdown
                    accountType="k401"
                    breakdown={person.standardBreakdown.k401}
                    accountTypeName="401(k)"
                    calculationMode="standard"
                  />
                  <ContributionBreakdown
                    accountType="ira"
                    breakdown={person.standardBreakdown.ira}
                    accountTypeName="IRA"
                    calculationMode="standard"
                  />
                  {person.standardBreakdown.hsa.limit > 0 && (
                    <ContributionBreakdown
                      accountType="hsa"
                      breakdown={person.standardBreakdown.hsa}
                      accountTypeName="HSA"
                      calculationMode="standard"
                    />
                  )}
                  {person.standardBreakdown.espp.total > 0 && (
                    <ContributionBreakdown
                      accountType="espp"
                      breakdown={person.standardBreakdown.espp}
                      accountTypeName="ESPP"
                      calculationMode="standard"
                    />
                  )}
                  {person.standardBreakdown.brokerage.total > 0 && (
                    <ContributionBreakdown
                      accountType="brokerage"
                      breakdown={person.standardBreakdown.brokerage}
                      accountTypeName="Brokerage"
                      calculationMode="standard"
                    />
                  )}
                </>
              )}
              
              {activePersonTab === 'standard' && !person.standardBreakdown && (
                <div className="contributions-contribution-section">
                  <h4>📊 No annual settings data available</h4>
                </div>
              )}

              {activePersonTab === 'ytd' && (
                <div className="contributions-calculation-note">
                  <small>📈 Shows actual YTD contributions + projected remaining at current settings</small>
                </div>
              )}
              
              {activePersonTab === 'ytd' && person.ytdBreakdown && (
                <>
                  <ContributionBreakdown
                    accountType="k401"
                    breakdown={person.ytdBreakdown.k401}
                    accountTypeName="401(k)"
                    calculationMode="ytd"
                  />
                  <ContributionBreakdown
                    accountType="ira"
                    breakdown={person.ytdBreakdown.ira}
                    accountTypeName="IRA"
                    calculationMode="ytd"
                  />
                  {person.ytdBreakdown.hsa.limit > 0 && (
                    <ContributionBreakdown
                      accountType="hsa"
                      breakdown={person.ytdBreakdown.hsa}
                      accountTypeName="HSA"
                      calculationMode="ytd"
                    />
                  )}
                  {person.ytdBreakdown.espp.total > 0 && (
                    <ContributionBreakdown
                      accountType="espp"
                      breakdown={person.ytdBreakdown.espp}
                      accountTypeName="ESPP"
                      calculationMode="ytd"
                    />
                  )}
                  {person.ytdBreakdown.brokerage.total > 0 && (
                    <ContributionBreakdown
                      accountType="brokerage"
                      breakdown={person.ytdBreakdown.brokerage}
                      accountTypeName="Brokerage"
                      calculationMode="ytd"
                    />
                  )}
                </>
              )}
              
              {activePersonTab === 'ytd' && !person.ytdBreakdown && (
                <div className="contributions-contribution-section">
                  <h4>📈 No progress data available</h4>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="contributions-container">
      <Navigation />
      <div className="app-container">
        <div className="header">
          <div className="contributions-header-icon">⚡</div>
          <h1>Analyze Your Contributions</h1>
          <p>Analyze your current contribution strategy and identify improvement opportunities</p>
          
          <p>Compare your Annual Settings View (full-year projections) with Progress + Forecast View (actual contributions + remaining forecast)</p>
        </div>

        {/* Household Summary */}
        <div className="contributions-summary-card">
          <h2>Household Summary</h2>
          
          <div className="contributions-comparison-container">
            <div className="contributions-tab-navigation">
              <button 
                className={`contributions-tab-button ${activeTab === 'standard' ? 'active' : ''}`}
                onClick={() => setActiveTab('standard')}
              >
                📊 Annual Settings View
              </button>
              <button 
                className={`contributions-tab-button ${activeTab === 'ytd' ? 'active' : ''}`}
                onClick={() => setActiveTab('ytd')}
              >
                📈 Progress + Forecast View
              </button>
            </div>
            
            <div className="contributions-tab-content">
              {activeTab === 'standard' && (
                <div className="contributions-calculation-column">
                  <h3 className="calculation-header standard">Annual Settings View</h3>
                  <HouseholdBreakdownSection breakdownData={householdTotals.standardBreakdown} annualTotals={householdTotals.standardAnnualTotals} />
                </div>
              )}
              
              {activeTab === 'ytd' && (
                <div className="contributions-calculation-column">
                  <h3 className="calculation-header ytd">Progress + Forecast View</h3>
                  <div className="contributions-calculation-note">
                    <small>📈 Shows actual YTD contributions + projected remaining at current settings</small>
                  </div>
                  <HouseholdBreakdownSection breakdownData={householdTotals.ytdBreakdown} annualTotals={householdTotals.ytdAnnualTotals} />
                </div>
              )}
            </div>
          </div>

          {/* Contribution Analysis */}
          <div className="contributions-opportunities">
            <h3>🎯 Contribution Analysis</h3>
            <div className="contributions-opportunities-grid">
              {activeTab === 'standard' && (
                <>
                  {householdTotals.remaining401k !== 0 && (
                    <div className="contributions-opportunity">
                      <span className="label">
                        {householdTotals.remaining401k > 0 ? '💰 Additional 401(k) room:' : '⚠️ 401(k) Over Contributed:'}
                      </span>
                      <span className={`value ${householdTotals.remaining401k > 0 ? 'opportunity' : 'contributions-limit-exceeded'}`}>
                        {formatCurrency(Math.abs(householdTotals.remaining401k))}
                        {householdTotals.remaining401k < 0 && <span className="contributions-warning-icon">⚠️</span>}
                      </span>
                    </div>
                  )}
                  {householdTotals.remainingIra !== 0 && (
                    <div className="contributions-opportunity">
                      <span className="label">
                        {householdTotals.remainingIra > 0 ? '💰 Additional IRA room:' : '⚠️ IRA Over Contributed:'}
                      </span>
                      <span className={`value ${householdTotals.remainingIra > 0 ? 'opportunity' : 'contributions-limit-exceeded'}`}>
                        {formatCurrency(Math.abs(householdTotals.remainingIra))}
                        {householdTotals.remainingIra < 0 && <span className="contributions-warning-icon">⚠️</span>}
                      </span>
                    </div>
                  )}
                  {householdTotals.remainingHsa !== 0 && (
                    <div className="contributions-opportunity">
                      <span className="label">
                        {householdTotals.remainingHsa > 0 ? '💰 Additional HSA room:' : '⚠️ HSA Over Contributed:'}
                      </span>
                      <span className={`value ${householdTotals.remainingHsa > 0 ? 'opportunity' : 'contributions-limit-exceeded'}`}>
                        {formatCurrency(Math.abs(householdTotals.remainingHsa))}
                        {householdTotals.remainingHsa < 0 && <span className="contributions-warning-icon">⚠️</span>}
                      </span>
                    </div>
                  )}
                </>
              )}
              
              {activeTab === 'ytd' && householdTotals.ytdBreakdown && (
                <>
                  {(() => {
                    const people = [contributionMetrics.your, contributionMetrics.spouse].filter(Boolean);
                    const ytdRemaining401k = people.reduce((sum, p) => sum + (p.ytdBreakdown?.k401?.remaining || 0), 0);
                    const ytdRemainingIra = people.reduce((sum, p) => {
                      const isJoint = p.accountTypes && p.accountTypes.ira === 'Joint';
                      if (isJoint && people.length > 1) {
                        return (p.ytdBreakdown?.ira?.remaining || 0) * people.length;
                      }
                      return sum + (p.ytdBreakdown?.ira?.remaining || 0);
                    }, 0);
                    const ytdRemainingHsa = people.reduce((sum, p) => sum + (p.ytdBreakdown?.hsa?.remaining || 0), 0);
                    
                    return (
                      <>
                        {ytdRemaining401k !== 0 && (
                          <div className="contributions-opportunity">
                            <span className="label">
                              {ytdRemaining401k > 0 ? '💰 Additional 401(k) room:' : '⚠️ 401(k) Over Contributed:'}
                            </span>
                            <span className={`value ${ytdRemaining401k > 0 ? 'opportunity' : 'contributions-limit-exceeded'}`}>
                              {formatCurrency(Math.abs(ytdRemaining401k))}
                              {ytdRemaining401k < 0 && <span className="contributions-warning-icon">⚠️</span>}
                            </span>
                          </div>
                        )}
                        {ytdRemainingIra !== 0 && (
                          <div className="contributions-opportunity">
                            <span className="label">
                              {ytdRemainingIra > 0 ? '💰 Additional IRA room:' : '⚠️ IRA Over Contributed:'}
                            </span>
                            <span className={`value ${ytdRemainingIra > 0 ? 'opportunity' : 'contributions-limit-exceeded'}`}>
                              {formatCurrency(Math.abs(ytdRemainingIra))}
                              {ytdRemainingIra < 0 && <span className="contributions-warning-icon">⚠️</span>}
                            </span>
                          </div>
                        )}
                        {ytdRemainingHsa !== 0 && (
                          <div className="contributions-opportunity">
                            <span className="label">
                              {ytdRemainingHsa > 0 ? '💰 Additional HSA room:' : '⚠️ HSA Over Contributed:'}
                            </span>
                            <span className={`value ${ytdRemainingHsa > 0 ? 'opportunity' : 'contributions-limit-exceeded'}`}>
                              {formatCurrency(Math.abs(ytdRemainingHsa))}
                              {ytdRemainingHsa < 0 && <span className="contributions-warning-icon">⚠️</span>}
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
              
              {activeTab === 'ytd' && !householdTotals.ytdBreakdown && (
                <div className="contributions-opportunity">
                  <span className="label">📈 No progress data available</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Individual Breakdown */}
        <div className="contributions-individuals">
          <PersonContributionCard person={contributionMetrics.your} />
          {showSpouseCalculator && contributionMetrics.spouse && (
            <PersonContributionCard person={contributionMetrics.spouse} />
          )}
        </div>

        {/* Action Button */}
        <div className="contributions-actions">
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

export default Contributions;