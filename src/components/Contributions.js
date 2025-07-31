import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from './Navigation';
import LastUpdateInfo from './LastUpdateInfo';
import { getPaycheckData, setPaycheckData, getAccountData, getAnnualData, getRetirementData } from '../utils/localStorage';
import { useMultiUserCalculator } from '../hooks/useMultiUserCalculator';
import { getContributionLimits, getPayPeriods } from '../utils/paycheckCalculations';
import { 
  formatCurrency, 
  calculateAge, 
  calculateProjectedAnnualIncome,
  calculateYTDIncome,
  calculateYTDContributionsFromAccount, 
  calculateRemainingContributionRoom,
  calculateMaxOutPerPaycheckAmounts 
} from '../utils/calculationHelpers';
import '../styles/contributions.css';
import '../styles/last-update-info.css';

const Contributions = () => {
  const navigate = useNavigate();
  
  // Get tax constants dynamically
  const CONTRIBUTION_LIMITS = getContributionLimits();
  const PAY_PERIODS = getPayPeriods();
  
  const [paycheckData, setPaycheckData] = useState({});
  const [accountData, setAccountData] = useState({});
  const [annualData, setAnnualData] = useState({});
  const [activeTab, setActiveTab] = useState('standard');
  const [activePersonTab, setActivePersonTab] = useState('standard');
  const { activeUsers } = useMultiUserCalculator(); // Use multi-user calculator hook
  const isMultiUserMode = activeUsers.includes('user2');
  const [showHelp, setShowHelp] = useState(false);
  
  // State for collapsible sections
  const [expandedHouseholdSections, setExpandedHouseholdSections] = useState({
    k401: false,
    ira: false,
    hsa: false,
    espp: false,
    brokerage: false,
    total: false
  });
  
  const [expandedPersonSections, setExpandedPersonSections] = useState({
    user1: {
      k401: false,
      ira: false,
      hsa: false,
      espp: false,
      brokerage: false,
      personalTotal: false
    },
    user2: {
      k401: false,
      ira: false,
      hsa: false,
      espp: false,
      brokerage: false,
      personalTotal: false
    }
  });

  // Toggle functions for expand/collapse
  const toggleHouseholdSection = (section) => {
    setExpandedHouseholdSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const togglePersonSection = (person, section) => {
    setExpandedPersonSections(prev => ({
      ...prev,
      [person]: {
        ...prev[person],
        [section]: !prev[person]?.[section]
      }
    }));
  };

  useEffect(() => {
    // Load paycheck, account, and annual data
    const paycheckData = getPaycheckData();
    const accountData = getAccountData();
    const annualData = getAnnualData();
    setPaycheckData(paycheckData);
    setAccountData(accountData);
    setAnnualData(annualData);
    
    // Listen for data updates
    const handlePaycheckUpdate = (event) => {
      const updatedData = event.detail || getPaycheckData();
      setPaycheckData(updatedData);
    };

    const handleAccountUpdate = () => {
      const updatedData = getAccountData();
      setAccountData(updatedData);
    };

    const handleAnnualUpdate = () => {
      const updatedData = getAnnualData();
      setAnnualData(updatedData);
    };

    window.addEventListener('paycheckDataUpdated', handlePaycheckUpdate);
    // Listen for both new and old event names for backward compatibility
    window.addEventListener('accountDataUpdated', handleAccountUpdate);
    window.addEventListener('annualDataUpdated', handleAnnualUpdate);
    
    return () => {
      window.removeEventListener('paycheckDataUpdated', handlePaycheckUpdate);
      window.removeEventListener('accountDataUpdated', handleAccountUpdate);
      window.removeEventListener('annualDataUpdated', handleAnnualUpdate);
    };
  }, []);

  // Let PaycheckCalculator handle the dual calculator toggle - just listen for updates
  // No need for toggle handler here, the paycheckDataUpdated listener above handles sync

  // Calculate contribution metrics
  const contributionMetrics = useMemo(() => {
    if (!paycheckData?.user1) return { hasData: false };

    const user1Data = paycheckData.user1;
    const user2Data = paycheckData.user2 || {};
    const showUser2 = isMultiUserMode;

    // Helper function to calculate user's metrics
    const calculateUserMetrics = (userData, userName) => {
      
      const salary = parseFloat(userData.salary) || 0;
      const birthday = userData.birthday;
      const age = birthday ? calculateAge(birthday) : 0;
      const isOver50 = age >= 50;
      const isOver55 = age >= 55;

      // Calculate AGI for Annual Settings View (basic salary) and Progress + Forecast View (prorated salary)
      let standardAGI = salary; // Annual Settings View uses input salary
      let progressAGI = salary; // Default to input salary
      
      // For Progress + Forecast View, use prorated salary if income periods are available
      if (userData.incomePeriodsData && userData.incomePeriodsData.length > 0) {
        progressAGI = calculateProjectedAnnualIncome(userData.incomePeriodsData, userData.payPeriod || 'biWeekly');
      }

      // Get YTD contributions from Account data 
      const individualUserNames = [userData.name].filter(n => n && n.trim());
      const otherUserData = userData === user1Data ? user2Data : user1Data;
      const allUserNames = [userData.name, otherUserData.name, 'Joint'].filter(n => n && n.trim());
      
      // Get individual contributions (401k, HSA, ESPP) - only this person's accounts
      const individualYtdContributions = calculateYTDContributionsFromAccount(accountData, individualUserNames, new Date().getFullYear(), annualData);
      
      // Get all contributions (for joint accounts like IRA, Brokerage) - all users including Joint
      const allYtdContributions = calculateYTDContributionsFromAccount(accountData, allUserNames, new Date().getFullYear(), annualData);
      
      // Determine which accounts are joint and divide contributions evenly
      const actualUsers = [userData.name, otherUserData.name].filter(n => n && n.trim());
      const numActualUsers = actualUsers.length;
      
      // Start with individual contributions, then override with joint contributions where appropriate
      const ytdContributions = { ...individualYtdContributions };
      
      // Check for joint accounts in account data
      const jointAccounts = {
        brokerage: false,
        ira: true // IRA contributions are treated as joint in our math per requirements
      };
      
      // Check account data for actual joint accounts
      if (accountData && Object.keys(accountData).length > 0) {
        Object.values(accountData).forEach(yearData => {
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
      
      const remainingRoom = calculateRemainingContributionRoom(ytdContributions, age, userData.hsaCoverageType);

      // Calculate YTD and projected contributions using actual pay periods
      const payPeriod = userData.payPeriod || 'biWeekly';
      const periodsPerYear = PAY_PERIODS[payPeriod].periodsPerYear;
      
      // Initialize maxOutAmounts at function scope
      let maxOutAmounts = null;

      // 401k calculations - from retirementOptions
      const retirementOptions = userData.retirementOptions || {};
      const traditional401k = parseFloat(retirementOptions.traditional401kPercent) || 0;
      const roth401k = parseFloat(retirementOptions.roth401kPercent) || 0;
      const total401kPercent = traditional401k + roth401k;
      
      // Standard calculation (always calculate)
      const annual401k = salary * (total401kPercent / 100);
      // Get employer match from retirement data (fallback to retirementOptions if available)
      const retirementData = getRetirementData();
      const userKey = userData === user1Data ? 'your' : 'spouse';
      const userRetirementData = retirementData?.[userKey] || {};
      const employerMatch = parseFloat(userRetirementData.employerMatch) || parseFloat(retirementOptions.employerMatch) || 0;
      const employeeContributionForMatchPercent = parseFloat(userRetirementData.employeeContributionForMatch) || 4;
      // Calculate annual employer match - only if employee meets contribution threshold
      let annualEmployerMatch = 0;
      if (total401kPercent >= employeeContributionForMatchPercent) {
        annualEmployerMatch = salary * (employerMatch / 100);
      }
      
      const max401k = isOver50 
        ? CONTRIBUTION_LIMITS.k401_employee + CONTRIBUTION_LIMITS.k401_catchUp
        : CONTRIBUTION_LIMITS.k401_employee;

      // IRA calculations - from budgetImpacting
      const budgetImpacting = userData.budgetImpacting || {};
      const traditionalIra = parseFloat(budgetImpacting.traditionalIraMonthly) || 0;
      const rothIra = parseFloat(budgetImpacting.rothIraMonthly) || 0;
      
      // Standard calculation
      let annualIra = (traditionalIra + rothIra) * 12;
      
      // For joint IRA accounts, divide by number of users to show individual allocation
      if (jointAccounts.ira && numActualUsers > 1) {
        annualIra = annualIra / numActualUsers;
      }
      
      const maxIra = isOver50 
        ? CONTRIBUTION_LIMITS.ira_self + CONTRIBUTION_LIMITS.ira_catchUp
        : CONTRIBUTION_LIMITS.ira_self;

      // HSA calculations - from medicalDeductions
      const medicalDeductions = userData.medicalDeductions || {};
      const hsaContributionPerPaycheck = parseFloat(medicalDeductions.hsa) || 0;
      const hsaEmployerAnnual = parseFloat(medicalDeductions.employerHsa) || 0;
      
      // Standard calculation
      const hsaContributionAnnual = hsaContributionPerPaycheck * periodsPerYear;
      const hsaEmployerContribution = hsaEmployerAnnual;
      
      const hsaCoverage = userData.hsaCoverageType || 'none';
      let maxHsa = 0;
      if (hsaCoverage === 'self') {
        maxHsa = CONTRIBUTION_LIMITS.hsa_self + (isOver55 ? CONTRIBUTION_LIMITS.hsa_catchUp : 0);
      } else if (hsaCoverage === 'family') {
        maxHsa = CONTRIBUTION_LIMITS.hsa_family + (isOver55 ? CONTRIBUTION_LIMITS.hsa_catchUp : 0);
      }
      

      // ESPP calculations
      const esppPercent = parseFloat(userData.esppDeductionPercent) || 0;
      const annualEspp = salary * (esppPercent / 100);

      // Brokerage calculations - from budgetImpacting
      const brokerageMonthly = (budgetImpacting.brokerageAccounts || []).reduce((sum, account) => sum + (account.monthlyAmount || 0), 0);
      let annualBrokerage = brokerageMonthly * 12;
      
      // For joint brokerage accounts, divide by number of users to show individual allocation
      if (jointAccounts.brokerage && numActualUsers > 1) {
        annualBrokerage = annualBrokerage / numActualUsers;
      }
      
      // Determine account types (joint vs individual) from account data
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
          percent: salary > 0 ? Math.max(0, ((max401k - annual401k) / salary) * 100) : 0,
          additionalPercent: salary > 0 ? Math.max(0, ((max401k - annual401k) / salary) * 100) : 0
        },
        ira_perMonth: Math.max(0, (maxIra - annualIra) / 12),
        ira_additionalPerMonth: Math.max(0, (maxIra - annualIra) / 12), // Same as ira_perMonth for standard mode
        hsa_perPaycheck: periodsPerYear > 0 ? Math.max(0, (maxHsa - (hsaContributionAnnual + hsaEmployerContribution)) / periodsPerYear) : 0,
        hsa_additionalPerPaycheck: periodsPerYear > 0 ? Math.max(0, (maxHsa - (hsaContributionAnnual + hsaEmployerContribution)) / periodsPerYear) : 0, // Same as hsa_perPaycheck for standard mode
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
          remaining: maxHsa - (hsaContributionAnnual + hsaEmployerContribution) // Both employee and employer count toward limit
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
        
        // Calculate remaining pay periods starting from now
        const today = new Date();
        const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59); // End of Dec 31st
        let remainingPaychecks;
        
        // Helper function to calculate pay periods between dates
        const calculatePayPeriodsBetweenDates = (startDate, endDate, payPeriod) => {
          const periodsPerYear = PAY_PERIODS[payPeriod].periodsPerYear;
          
          // Simple day-based calculation
          const millisecondsPerDay = 24 * 60 * 60 * 1000;
          const timeDifferenceMs = endDate - startDate;
          const daysDifference = timeDifferenceMs / millisecondsPerDay;
          const daysPerPeriod = 365.25 / periodsPerYear; // Days per pay period
          const result = daysDifference / daysPerPeriod;
          
          
          return Math.max(0, result); // Ensure we don't return negative values
        };
        
        // Always calculate from today to end of year - simplify the logic
        remainingPaychecks = calculatePayPeriodsBetweenDates(today, endOfYear, payPeriod);
        
        // Calculate projected contributions for remaining pay periods only
        // Use the same settings as Annual Settings View (paycheck calculator settings)
        const grossPayPerPaycheck = salary / periodsPerYear;
        const projected401k = grossPayPerPaycheck * remainingPaychecks * (total401kPercent / 100);
        // Calculate employer match - only if employee meets contribution threshold
        const employeeContributionForMatchPercent = parseFloat(userRetirementData.employeeContributionForMatch) || 4;
        let projectedEmployerMatch = 0;
        if (total401kPercent >= employeeContributionForMatchPercent) {
          projectedEmployerMatch = grossPayPerPaycheck * remainingPaychecks * (employerMatch / 100);
        }
        
        
        // IRA breakdown
        const ytdIra = ytdContributions.totalIra || 0;
        // Calculate remaining months starting from beginning of next month
        const monthsRemaining = Math.max(0, 12 - today.getMonth() - 1); // Remaining months starting next month
        const projectedIra = (traditionalIra + rothIra) * monthsRemaining;
        
        
        // HSA breakdown - HSA employer contributions count toward IRS limits
        const ytdHsaEmployee = ytdContributions.hsa || 0;
        
        // For HSA employer contributions, we need to handle this more carefully
        // If we have annual data for employer HSA, use it; otherwise calculate YTD based on paycheck settings
        let ytdHsaEmployer = ytdContributions.totalEmployerHsa || 0;
        
        // If no annual employer HSA data, calculate YTD based on current settings and elapsed time
        if (ytdHsaEmployer === 0 && hsaEmployerContribution > 0) {
          // Calculate how much of the year has elapsed based on pay periods
          const startOfYear = new Date(today.getFullYear(), 0, 1);
          const elapsedPayPeriods = calculatePayPeriodsBetweenDates(startOfYear, today, payPeriod);
          ytdHsaEmployer = (hsaEmployerContribution / periodsPerYear) * elapsedPayPeriods;
        }
        
        const ytdHsaTotal = ytdHsaEmployee + ytdHsaEmployer;
        
        // Calculate projected HSA contributions for remaining pay periods using settings
        // To ensure YTD + Projected = Annual exactly, calculate projected as (Annual - YTD)
        const expectedAnnualEmployee = hsaContributionPerPaycheck * periodsPerYear;
        const expectedAnnualEmployer = hsaEmployerContribution;
        
        const projectedHsaEmployee = Math.max(0, expectedAnnualEmployee - ytdHsaEmployee);
        const projectedHsaEmployer = Math.max(0, expectedAnnualEmployer - ytdHsaEmployer);
        const projectedHsaTotal = projectedHsaEmployee + projectedHsaEmployer;
        
        
        // ESPP breakdown
        const ytdEspp = ytdContributions.espp || 0;
        // Calculate projected ESPP contributions for remaining pay periods using settings
        const projectedEspp = grossPayPerPaycheck * remainingPaychecks * (esppPercent / 100);
        
        
        // Brokerage breakdown
        const ytdBrokerage = ytdContributions.brokerage || 0;
        const projectedBrokerage = brokerageMonthly * monthsRemaining;
        
        // Calculate per-paycheck amounts needed to max out contributions for remaining year (for YTD mode)
        // Use the same logic as standardMaxOutAmounts but with YTD data
        if (ytdContributions) {
          // Calculate projected totals (YTD + remaining at current settings)
          // For 401k, only count EMPLOYEE contributions towards IRS limit (not employer match)
          const totalProjected401kEmployee = ytd401k + projected401k; // Only employee contributions
          const totalProjectedIra = ytdIra + projectedIra;
          const totalProjectedHsa = ytdHsaTotal + projectedHsaTotal;
          
          maxOutAmounts = {
            k401_perPaycheck: {
              amount: remainingPaychecks > 0 ? Math.max(0, (max401k - totalProjected401kEmployee) / remainingPaychecks) : 0,
              percent: salary > 0 && remainingPaychecks > 0 ? Math.max(0, ((max401k - totalProjected401kEmployee) / remainingPaychecks) / (salary / periodsPerYear) * 100) : 0,
              additionalPercent: (() => {
                if (salary <= 0 || remainingPaychecks <= 0) return 0;
                // Calculate what's needed to max out from current point
                const remainingToMaxOut = max401k - ytd401k; // What's left to contribute to hit the limit
                const projectedRemainingContributions = projected401k; // What we'll contribute at current rate
                const additionalNeeded = Math.max(0, remainingToMaxOut - projectedRemainingContributions);
                const additionalPerPaycheck = additionalNeeded / remainingPaychecks;
                return (additionalPerPaycheck / (salary / periodsPerYear)) * 100;
              })()
            },
            ira_perMonth: monthsRemaining > 0 ? Math.max(0, (maxIra - totalProjectedIra) / monthsRemaining) : 0,
            ira_additionalPerMonth: (() => {
              if (monthsRemaining <= 0) return 0;
              const remainingToMaxOut = maxIra - ytdIra;
              const projectedRemainingContributions = projectedIra;
              return Math.max(0, remainingToMaxOut - projectedRemainingContributions) / monthsRemaining;
            })(),
            hsa_perPaycheck: remainingPaychecks > 0 ? Math.max(0, (maxHsa - totalProjectedHsa) / remainingPaychecks) : 0,
            hsa_additionalPerPaycheck: (() => {
              if (remainingPaychecks <= 0) return 0;
              // HSA: Both employee and employer contributions count toward IRS limit
              const remainingToMaxOut = maxHsa - ytdHsaTotal;
              const projectedRemainingContributions = projectedHsaTotal;
              const additionalNeeded = Math.max(0, remainingToMaxOut - projectedRemainingContributions);
              // Return only the additional EMPLOYEE contribution needed (since user can't control employer contribution)
              const additionalEmployeeNeeded = Math.max(0, additionalNeeded - projectedHsaEmployer);
              return additionalEmployeeNeeded / remainingPaychecks;
            })(),
            remainingPaychecks: remainingPaychecks,
            remainingMonths: monthsRemaining
          };
        }
        
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
            remaining: max401k - (ytd401k + projected401k) // Only employee contributions count towards IRS limit
          },
          ira: {
            ytd: ytdIra,
            projected: projectedIra,
            total: ytdIra + projectedIra,
            limit: maxIra,
            remaining: maxIra - (ytdIra + projectedIra)
          },
          hsa: {
            ytdEmployee: ytdHsaEmployee,
            ytdEmployer: ytdHsaEmployer,
            ytdTotal: ytdHsaTotal,
            projectedEmployee: projectedHsaEmployee,
            projectedEmployer: projectedHsaEmployer,
            projectedTotal: projectedHsaTotal,
            totalEmployee: ytdHsaEmployee + projectedHsaEmployee,
            totalEmployer: ytdHsaEmployer + projectedHsaEmployer,
            totalCombined: ytdHsaTotal + projectedHsaTotal,
            limit: maxHsa,
            remaining: maxHsa - (ytdHsaTotal + projectedHsaTotal) // Both employee and employer count toward limit
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
        name: userName,
        salary,
        standardAGI,
        progressAGI,
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
      your: calculateUserMetrics(user1Data, user1Data.name || 'You')
    };

    if (showUser2 && user2Data.salary) {
      metrics.spouse = calculateUserMetrics(user2Data, user2Data.name || 'Spouse');
    }

    return metrics;
  }, [paycheckData, accountData, annualData, isMultiUserMode]);

  // Event listeners for navigation controls
  useEffect(() => {
    const handleExpandAllSections = () => {
      setExpandedHouseholdSections({
        k401: true,
        ira: true,
        hsa: true,
        espp: true,
        brokerage: true,
        total: true
      });
      
      // Update person sections to expand all, using correct keys
      setExpandedPersonSections(prev => {
        const updated = { ...prev };
        
        // Always update 'your' and 'spouse' keys for ContributionBreakdown components
        updated.your = {
          ...(updated.your || {}),
          k401: true,
          ira: true,
          hsa: true,
          espp: true,
          brokerage: true
        };
        updated.spouse = {
          ...(updated.spouse || {}),
          k401: true,
          ira: true,
          hsa: true,
          espp: true,
          brokerage: true
        };
        
        // Get the actual user names that are displayed in the UI
        // These need to match exactly what userData.name contains in the PersonContributionCard
        const user1Name = contributionMetrics?.your?.name || 'User 1';
        const user2Name = contributionMetrics?.spouse?.name || 'User 2';
        
        updated[user1Name] = {
          ...(updated[user1Name] || {}),
          personalTotal: true
        };
        
        if (isMultiUserMode) {
          updated[user2Name] = {
            ...(updated[user2Name] || {}),
            personalTotal: true
          };
        }
        
        return updated;
      });
      // Notify navigation of state change
      window.dispatchEvent(new CustomEvent('updateNavigationExpandState', { 
        detail: { page: 'contributions', expanded: true } 
      }));
    };

    const handleCollapseAllSections = () => {
      setExpandedHouseholdSections({
        k401: false,
        ira: false,
        hsa: false,
        espp: false,
        brokerage: false,
        total: false
      });
      
      // Update person sections to collapse all, using correct keys
      setExpandedPersonSections(prev => {
        const updated = { ...prev };
        
        // Always update 'your' and 'spouse' keys for ContributionBreakdown components
        updated.your = {
          ...(updated.your || {}),
          k401: false,
          ira: false,
          hsa: false,
          espp: false,
          brokerage: false
        };
        updated.spouse = {
          ...(updated.spouse || {}),
          k401: false,
          ira: false,
          hsa: false,
          espp: false,
          brokerage: false
        };
        
        // Get the actual user names that are displayed in the UI
        // These need to match exactly what userData.name contains in the PersonContributionCard
        const user1Name = contributionMetrics?.your?.name || 'User 1';
        const user2Name = contributionMetrics?.spouse?.name || 'User 2';
        
        
        updated[user1Name] = {
          ...(updated[user1Name] || {}),
          personalTotal: false
        };
        
        if (isMultiUserMode) {
          updated[user2Name] = {
            ...(updated[user2Name] || {}),
            personalTotal: false
          };
        }
        
        return updated;
      });
      // Notify navigation of state change
      window.dispatchEvent(new CustomEvent('updateNavigationExpandState', { 
        detail: { page: 'contributions', expanded: false } 
      }));
    };

    window.addEventListener('expandAllSections', handleExpandAllSections);
    window.addEventListener('collapseAllSections', handleCollapseAllSections);

    return () => {
      window.removeEventListener('expandAllSections', handleExpandAllSections);
      window.removeEventListener('collapseAllSections', handleCollapseAllSections);
    };
  }, []);

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

  const HouseholdBreakdownSection = ({ breakdownData, annualTotals, mode = 'ytd' }) => {
    if (!breakdownData) return null;
    
    // Use provided annual totals or fall back to legacy householdTotals
    const totals = annualTotals || householdTotals;

    // Calculate if household totals exceed IRS limits using contributionMetrics data
    const people = [contributionMetrics.your, contributionMetrics.spouse].filter(Boolean);
    const total401kLimit = people.reduce((sum, p) => {
      const age = p.age || 0;
      const isOver50 = age >= 50;
      return sum + (isOver50 
        ? CONTRIBUTION_LIMITS.k401_employee + CONTRIBUTION_LIMITS.k401_catchUp
        : CONTRIBUTION_LIMITS.k401_employee);
    }, 0);
    
    const totalIraLimit = people.reduce((sum, p) => {
      const age = p.age || 0;
      const isOver50 = age >= 50;
      return sum + (isOver50 
        ? CONTRIBUTION_LIMITS.ira_self + CONTRIBUTION_LIMITS.ira_catchUp
        : CONTRIBUTION_LIMITS.ira_self);
    }, 0);
    
    // For HSA, we need to be careful about how we calculate household limits
    // Each person has their own HSA limit based on their coverage type
    const totalHsaLimit = people.reduce((sum, p) => {
      const age = p.age || 0;
      const isOver55 = age >= 55;
      // Try to access hsaCoverageType from the person's data
      const hsaCoverage = paycheckData[p.name === contributionMetrics.your?.name ? 'your' : 'spouse']?.hsaCoverageType || 'none';
      if (hsaCoverage === 'self') {
        return sum + CONTRIBUTION_LIMITS.hsa_self + (isOver55 ? CONTRIBUTION_LIMITS.hsa_catchUp : 0);
      } else if (hsaCoverage === 'family') {
        return sum + CONTRIBUTION_LIMITS.hsa_family + (isOver55 ? CONTRIBUTION_LIMITS.hsa_catchUp : 0);
      }
      return sum;
    }, 0);

    // For 401k warnings, only warn if EMPLOYEE contributions exceed employee limits
    // Don't warn if total (employee + employer) exceeds employee limits but employee portion is within limits
    const total401kEmployeeContributions = people.reduce((sum, p) => {
      if (mode === 'ytd') {
        return sum + (p.ytdBreakdown?.k401?.totalEmployee || 0);
      } else {
        return sum + (p.standardBreakdown?.k401?.totalEmployee || 0);
      }
    }, 0);
    const is401kOverLimit = total401kEmployeeContributions > total401kLimit;
    const isIraOverLimit = totals.totalIra > totalIraLimit;
    const isHsaOverLimit = totals.totalHsa > totalHsaLimit;

    return (
      <div className="contributions-household-breakdown">
        {/* 401k */}
        <div className="contributions-household-section">
          <h4 
            className="contributions-section-header-clickable"
            onClick={() => toggleHouseholdSection('k401')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span>
              401(k) Contributions
              {is401kOverLimit && <span className="contributions-warning-icon" title="Household total exceeds combined IRS limits">⚠️</span>}
            </span>
            <span className="contributions-toggle-icon">
              {expandedHouseholdSections.k401 ? '▼' : '▶'}
            </span>
          </h4>
          {expandedHouseholdSections.k401 && (
            <div className="contributions-household-grid">
            {mode === 'ytd' && (
              <>
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
              </>
            )}
            <div className="contributions-household-item">
              <span className="label">{mode === 'ytd' ? 'Remaining Employee:' : 'Employee:'}</span>
              <span className="value">{formatCurrency(breakdownData.projected401kEmployee || 0)}</span>
            </div>
            <div className="contributions-household-item">
              <span className="label">{mode === 'ytd' ? 'Remaining Employer:' : 'Employer:'}</span>
              <span className="value">{formatCurrency(breakdownData.projected401kEmployer || 0)}</span>
            </div>
            <div className="contributions-household-item">
              <span className="label">{mode === 'ytd' ? 'Remaining Total:' : 'Total:'}</span>
              <span className="value">{formatCurrency(breakdownData.projected401kTotal || 0)}</span>
            </div>
            <div className="contributions-household-item total">
              <span className="label">Annual Total:</span>
              <span className={`value ${getLimitStatusClass(totals.total401k, total401kLimit)}`}>
                {formatCurrency(totals.total401k)}
                {is401kOverLimit && <span className="contributions-warning-icon">⚠️</span>}
              </span>
            </div>
          </div>
          )}
        </div>

        {/* IRA */}
        <div className="contributions-household-section">
          <h4 
            className="contributions-section-header-clickable"
            onClick={() => toggleHouseholdSection('ira')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span>
              IRA Contributions
              {isIraOverLimit && <span className="contributions-warning-icon" title="Household total exceeds combined IRS limits">⚠️</span>}
            </span>
            <span className="contributions-toggle-icon">
              {expandedHouseholdSections.ira ? '▼' : '▶'}
            </span>
          </h4>
          {expandedHouseholdSections.ira && (
            <div className="contributions-household-grid">
            {mode === 'ytd' && (
              <div className="contributions-household-item">
                <span className="label">YTD:</span>
                <span className="value">{formatCurrency(breakdownData.ytdIra || 0)}</span>
              </div>
            )}
            <div className="contributions-household-item">
              <span className="label">{mode === 'ytd' ? 'Remaining:' : 'Total:'}</span>
              <span className="value">{formatCurrency(breakdownData.projectedIra || 0)}</span>
            </div>
            <div className="contributions-household-item total">
              <span className="label">Annual Total:</span>
              <span className={`value ${getLimitStatusClass(totals.totalIra, totalIraLimit)}`}>
                {formatCurrency(totals.totalIra)}
                {isIraOverLimit && <span className="contributions-warning-icon">⚠️</span>}
              </span>
            </div>
          </div>
          )}
        </div>

        {/* HSA */}
        {totals.totalHsa > 0 && (
          <div className="contributions-household-section">
            <h4 
              className="contributions-section-header-clickable"
              onClick={() => toggleHouseholdSection('hsa')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span>
                HSA Contributions
                {isHsaOverLimit && <span className="contributions-warning-icon" title="Household total exceeds combined IRS limits">⚠️</span>}
              </span>
              <span className="contributions-toggle-icon">
                {expandedHouseholdSections.hsa ? '▼' : '▶'}
              </span>
            </h4>
            {expandedHouseholdSections.hsa && (
              <div className="contributions-household-grid">
              {mode === 'ytd' && (
                <>
                  <div className="contributions-household-item">
                    <span className="label">YTD Employee:</span>
                    <span className="value">{formatCurrency(breakdownData.ytdHsaEmployee || 0)}</span>
                  </div>
                  <div className="contributions-household-item">
                    <span className="label">YTD Employer:</span>
                    <span className="value">{formatCurrency(breakdownData.ytdHsaEmployer || 0)}</span>
                  </div>
                </>
              )}
              <div className="contributions-household-item">
                <span className="label">{mode === 'ytd' ? 'Remaining Employee:' : 'Employee:'}</span>
                <span className="value">{formatCurrency(breakdownData.projectedHsaEmployee || 0)}</span>
              </div>
              <div className="contributions-household-item">
                <span className="label">{mode === 'ytd' ? 'Remaining Employer:' : 'Employer:'}</span>
                <span className="value">{formatCurrency(breakdownData.projectedHsaEmployer || 0)}</span>
              </div>
              <div className="contributions-household-item total">
                <span className="label">Annual Total:</span>
                <span className={`value ${getLimitStatusClass(totals.totalHsa, totalHsaLimit)}`}>
                  {formatCurrency(totals.totalHsa)}
                  {isHsaOverLimit && <span className="contributions-warning-icon">⚠️</span>}
                </span>
              </div>
            </div>
            )}
          </div>
        )}

        {/* ESPP */}
        {totals.totalEspp > 0 && (
          <div className="contributions-household-section">
            <h4 
              className="contributions-section-header-clickable"
              onClick={() => toggleHouseholdSection('espp')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span>ESPP Contributions</span>
              <span className="contributions-toggle-icon">
                {expandedHouseholdSections.espp ? '▼' : '▶'}
              </span>
            </h4>
            {expandedHouseholdSections.espp && (
              <div className="contributions-household-grid">
              {mode === 'ytd' && (
                <div className="contributions-household-item">
                  <span className="label">YTD:</span>
                  <span className="value">{formatCurrency(breakdownData.ytdEspp || 0)}</span>
                </div>
              )}
              <div className="contributions-household-item">
                <span className="label">{mode === 'ytd' ? 'Remaining:' : 'Total:'}</span>
                <span className="value">{formatCurrency(breakdownData.projectedEspp || 0)}</span>
              </div>
              <div className="contributions-household-item total">
                <span className="label">Annual Total:</span>
                <span className="value">{formatCurrency(totals.totalEspp)}</span>
              </div>
            </div>
            )}
          </div>
        )}

        {/* Brokerage */}
        {totals.totalBrokerage > 0 && (
          <div className="contributions-household-section">
            <h4 
              className="contributions-section-header-clickable"
              onClick={() => toggleHouseholdSection('brokerage')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span>Brokerage Contributions</span>
              <span className="contributions-toggle-icon">
                {expandedHouseholdSections.brokerage ? '▼' : '▶'}
              </span>
            </h4>
            {expandedHouseholdSections.brokerage && (
              <div className="contributions-household-grid">
              {mode === 'ytd' && (
                <div className="contributions-household-item">
                  <span className="label">YTD:</span>
                  <span className="value">{formatCurrency(breakdownData.ytdBrokerage || 0)}</span>
                </div>
              )}
              <div className="contributions-household-item">
                <span className="label">{mode === 'ytd' ? 'Remaining:' : 'Total:'}</span>
                <span className="value">{formatCurrency(breakdownData.projectedBrokerage || 0)}</span>
              </div>
              <div className="contributions-household-item total">
                <span className="label">Annual Total:</span>
                <span className="value">{formatCurrency(totals.totalBrokerage)}</span>
              </div>
            </div>
            )}
          </div>
        )}

        {/* Grand Total */}
        <div className="contributions-household-section">
          <h4 
            className="contributions-section-header-clickable"
            onClick={() => toggleHouseholdSection('total')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span>Total Annual Contributions</span>
            <span className="contributions-toggle-icon">
              {expandedHouseholdSections.total ? '▼' : '▶'}
            </span>
          </h4>
          {expandedHouseholdSections.total && (
            <div className="contributions-household-grid">
            <div className="contributions-household-item">
              <span className="label">
                <span className="label-full">Employee Only:</span>
                <span className="label-short">Employee Only:</span>
                <span className="label-mobile">Employee:</span>
              </span>
              <span className="value">{formatCurrency(
                (breakdownData.projected401kEmployee || 0) +
                (mode === 'ytd' ? (breakdownData.ytd401kEmployee || 0) : 0) +
                (breakdownData.projectedIra || 0) +
                (mode === 'ytd' ? (breakdownData.ytdIra || 0) : 0) +
                (breakdownData.projectedHsaEmployee || 0) +
                (mode === 'ytd' ? (breakdownData.ytdHsaEmployee || 0) : 0) +
                (breakdownData.projectedEspp || 0) +
                (mode === 'ytd' ? (breakdownData.ytdEspp || 0) : 0) +
                (breakdownData.projectedBrokerage || 0) +
                (mode === 'ytd' ? (breakdownData.ytdBrokerage || 0) : 0)
              )}</span>
            </div>
            <div className="contributions-household-item">
              <span className="label">
                <span className="label-full">Total (with Match):</span>
                <span className="label-short">Total (with Match):</span>
                <span className="label-mobile">Total:</span>
              </span>
              <span className="value">{formatCurrency(totals.totalContributions)}</span>
            </div>
          </div>
          )}
        </div>
      </div>
    );
  };

  // Helper function to get CSS class for limit status
  const getLimitStatusClass = (amount, limit) => {
    if (!limit || limit === 0) return '';
    return amount > limit ? 'contributions-limit-exceeded' : 'contributions-limit-within';
  };

  const PersonContributionCard = ({ person }) => {
    if (!person) return null;

    // Helper component for the 4-part breakdown display
    const ContributionBreakdown = ({ accountType, breakdown, accountTypeName, calculationMode = 'standard', expandedSections, onToggle }) => {
      if (!breakdown) return null;

      // Check if annual total exceeds IRS limit
      // For 401k, only warn about employee contributions exceeding employee limit
      // Employer match doesn't count against employee limit ($23.5k), only against total limit ($70k)
      let isOverLimit = false;
      if (breakdown.limit) {
        if (accountType === 'k401' && breakdown.totalEmployee !== undefined) {
          // For 401k, warn only if employee contribution exceeds employee limit
          // Don't warn about employer match pushing total over employee limit
          isOverLimit = breakdown.totalEmployee > breakdown.limit;
        } else {
          // For other account types (IRA, HSA), check total against limit
          const amountToCheck = breakdown.totalCombined || breakdown.total;
          isOverLimit = amountToCheck > breakdown.limit;
        }
      }
      const warningIcon = isOverLimit ? ' ⚠️' : '';

      // Helper function to determine CSS class for "Add" amounts based on proximity to max
      const getAddAmountClass = (addAmount, limit, isPercentage = false, salary = null, frequency = 'annual') => {
        if (!limit || addAmount <= 0) return 'maxed';
        
        let annualDollarAmount;
        if (isPercentage && salary) {
          // Convert percentage to dollar amount (annual)
          annualDollarAmount = (addAmount / 100) * salary;
        } else {
          // Convert periodic amount to annual
          const multiplier = frequency === 'monthly' ? 12 : frequency === 'paycheck' ? (PAY_PERIODS[person.payPeriod || 'biWeekly'].periodsPerYear) : 1;
          annualDollarAmount = addAmount * multiplier;
        }
        
        // Calculate what percentage of the limit this annual dollar amount represents
        const percentOfLimit = (annualDollarAmount / limit) * 100;
        
        // If the additional amount needed is <= 5% of the limit, show as "close to max" (green)
        return percentOfLimit <= 5 ? 'close-to-max' : 'opportunity';
      };

      // Determine person key (your vs spouse)
      const personKey = person.name === contributionMetrics?.your?.name ? 'your' : 'spouse';
      const isExpanded = expandedSections[personKey]?.[accountType] ?? false;
      

      return (
        <div className="contributions-contribution-section">
          <h4 
            className="contributions-section-header-clickable"
            onClick={() => onToggle(personKey, accountType)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span>
              {accountTypeName} Contributions
              <span className="contribution-mode-indicator">
                {` (${person.accountTypes[accountType]})`}
              </span>
              {isOverLimit && <span className="contributions-warning-icon" title="Exceeds IRS annual limit">⚠️</span>}
            </span>
            <span className="contributions-toggle-icon">
              {isExpanded ? '▼' : '▶'}
            </span>
          </h4>
          {isExpanded && (
            <div className="contributions-contribution-grid breakdown-mode">
            {/* YTD Contributions - only show in Progress + Forecast View */}
            {calculationMode === 'ytd' && (
              <>
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
              </>
            )}

            {/* Projected Remaining */}
            <div className="contributions-contribution-header">
              {calculationMode === 'ytd' ? 'Projected Remaining' : 'Annual Projection'}
            </div>
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

            {/* Annual Total - only show in Progress + Forecast View */}
            {calculationMode === 'ytd' && (
              <>
                <div className="contributions-contribution-header">Annual Total (Progress + Forecast)</div>
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
                      <span className={`value total highlight ${accountType === 'k401' 
                        ? getLimitStatusClass(breakdown.totalEmployee, breakdown.limit) 
                        : getLimitStatusClass(breakdown.totalCombined, breakdown.limit)}`}>
                        {formatCurrency(breakdown.totalCombined)}
                        {isOverLimit && <span className="contributions-warning-icon">⚠️</span>}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="contributions-contribution-item">
                    <span className="label">Annual Total:</span>
                    <span className={`value total highlight ${getLimitStatusClass(breakdown.total, breakdown.limit)}`}>
                      {formatCurrency(breakdown.total)}
                      {isOverLimit && <span className="contributions-warning-icon">⚠️</span>}
                    </span>
                  </div>
                )}
              </>
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
                  <span className={`value ${breakdown.remaining > 0 ? 'contributions-limit-within' : breakdown.remaining < 0 ? 'contributions-limit-exceeded' : 'maxed'}`}>
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
                                <span className="label">Add (Percent):</span>
                                <span className={`value ${(() => {
                                  const addPercent = Math.max(0, maxOutData.k401_perPaycheck.additionalPercent || maxOutData.k401_perPaycheck.percent);
                                  return getAddAmountClass(addPercent, breakdown.limit, true, person.salary);
                                })()}`}>
                                  {Math.max(0, maxOutData.k401_perPaycheck.additionalPercent || maxOutData.k401_perPaycheck.percent).toFixed(1)}%
                                  {(() => {
                                    const addPercent = Math.max(0, maxOutData.k401_perPaycheck.additionalPercent || maxOutData.k401_perPaycheck.percent);
                                    const cssClass = getAddAmountClass(addPercent, breakdown.limit, true, person.salary);
                                    return cssClass === 'close-to-max' ? ' (within 5% of max!)' : '';
                                  })()}
                                </span>
                              </div>
                              <div className="contributions-contribution-item">
                                <span className="label">Total Needed (Percent):</span>
                                <span className={`value ${(() => {
                                  const addPercent = Math.max(0, maxOutData.k401_perPaycheck.additionalPercent || maxOutData.k401_perPaycheck.percent);
                                  return getAddAmountClass(addPercent, breakdown.limit, true, person.salary);
                                })()}`}>{(() => {
                                  // Calculate the total percentage needed to max out
                                  if (person.salary <= 0) return '0.0';
                                  const periodsPerYear = PAY_PERIODS[person.payPeriod || 'biWeekly'].periodsPerYear;
                                  
                                  if (calculationMode === 'ytd') {
                                    // For YTD mode: (Total limit - YTD contributions) / remaining paychecks / salary per paycheck * 100
                                    const remainingPaychecks = maxOutData.remainingPaychecks || periodsPerYear;
                                    const totalNeededPerPaycheck = (breakdown.limit - (breakdown.ytdEmployee || 0)) / remainingPaychecks;
                                    const salaryPerPaycheck = person.salary / periodsPerYear;
                                    return Math.max(0, (totalNeededPerPaycheck / salaryPerPaycheck) * 100).toFixed(1);
                                  } else {
                                    // For standard mode: Total limit / salary * 100
                                    return Math.max(0, (breakdown.limit / person.salary) * 100).toFixed(1);
                                  }
                                })()}%
                                  {(() => {
                                    const addPercent = Math.max(0, maxOutData.k401_perPaycheck.additionalPercent || maxOutData.k401_perPaycheck.percent);
                                    const cssClass = getAddAmountClass(addPercent, breakdown.limit, true, person.salary);
                                    return cssClass === 'close-to-max' ? ' (within 5% of max!)' : '';
                                  })()}
                                </span>
                              </div>
                            </>
                          )}
                          {accountType === 'ira' && (
                            <>
                              <div className="contributions-contribution-item">
                                <span className="label">Add Per Month:</span>
                                <span className={`value ${(() => {
                                  const addAmount = Math.max(0, maxOutData.ira_additionalPerMonth || maxOutData.ira_perMonth);
                                  return getAddAmountClass(addAmount, breakdown.limit, false, null, 'monthly');
                                })()}`}>
                                  {formatCurrency(Math.max(0, maxOutData.ira_additionalPerMonth || maxOutData.ira_perMonth))}
                                  {(() => {
                                    const addAmount = Math.max(0, maxOutData.ira_additionalPerMonth || maxOutData.ira_perMonth);
                                    const cssClass = getAddAmountClass(addAmount, breakdown.limit, false, null, 'monthly');
                                    return cssClass === 'close-to-max' ? ' (within 5% of max!)' : '';
                                  })()}
                                </span>
                              </div>
                              <div className="contributions-contribution-item">
                                <span className="label">Total Needed Per Month:</span>
                                <span className={`value ${(() => {
                                  const addAmount = Math.max(0, maxOutData.ira_additionalPerMonth || maxOutData.ira_perMonth);
                                  return getAddAmountClass(addAmount, breakdown.limit, false, null, 'monthly');
                                })()}`}>{(() => {
                                  if (calculationMode === 'ytd') {
                                    // For YTD mode: (Total limit - YTD contributions) / remaining months
                                    const remainingMonths = maxOutData.remainingMonths || 12;
                                    return formatCurrency((breakdown.limit - (breakdown.ytd || 0)) / remainingMonths);
                                  } else {
                                    // For standard mode: Total limit / 12 months
                                    return formatCurrency(breakdown.limit / 12);
                                  }
                                })()}
                                  {(() => {
                                    const addAmount = Math.max(0, maxOutData.ira_additionalPerMonth || maxOutData.ira_perMonth);
                                    const cssClass = getAddAmountClass(addAmount, breakdown.limit, false, null, 'monthly');
                                    return cssClass === 'close-to-max' ? ' (within 5% of max!)' : '';
                                  })()}
                                </span>
                              </div>
                            </>
                          )}
                          {accountType === 'hsa' && (
                            <>
                              <div className="contributions-contribution-item">
                                <span className="label">Add Per Paycheck:</span>
                                <span className={`value ${(() => {
                                  const addAmount = Math.max(0, maxOutData.hsa_additionalPerPaycheck || maxOutData.hsa_perPaycheck);
                                  return getAddAmountClass(addAmount, breakdown.limit, false, null, 'paycheck');
                                })()}`}>
                                  {formatCurrency(Math.max(0, maxOutData.hsa_additionalPerPaycheck || maxOutData.hsa_perPaycheck))}
                                  {(() => {
                                    const addAmount = Math.max(0, maxOutData.hsa_additionalPerPaycheck || maxOutData.hsa_perPaycheck);
                                    const cssClass = getAddAmountClass(addAmount, breakdown.limit, false, null, 'paycheck');
                                    return cssClass === 'close-to-max' ? ' (within 5% of max!)' : '';
                                  })()}
                                </span>
                              </div>
                              <div className="contributions-contribution-item">
                                <span className="label">Total Needed Per Paycheck:</span>
                                <span className={`value ${(() => {
                                  const addAmount = Math.max(0, maxOutData.hsa_additionalPerPaycheck || maxOutData.hsa_perPaycheck);
                                  return getAddAmountClass(addAmount, breakdown.limit, false, null, 'paycheck');
                                })()}`}>{(() => {
                                  const periodsPerYear = PAY_PERIODS[person.payPeriod || 'biWeekly'].periodsPerYear;
                                  if (calculationMode === 'ytd') {
                                    // For YTD mode: (Total limit - YTD total contributions including employer) / remaining paychecks
                                    // But show only EMPLOYEE contribution needed (user can't control employer contribution)
                                    const remainingPaychecks = maxOutData.remainingPaychecks || periodsPerYear;
                                    const totalRemaining = breakdown.limit - (breakdown.ytdTotal || breakdown.ytd || 0);
                                    const employerRemaining = (breakdown.projectedEmployer || 0);
                                    const employeeNeeded = Math.max(0, totalRemaining - employerRemaining);
                                    return formatCurrency(employeeNeeded / remainingPaychecks);
                                  } else {
                                    // For standard mode: (Total limit - employer contribution) / periods per year
                                    const employeeNeeded = breakdown.limit - (breakdown.projectedEmployer || breakdown.totalEmployer || 0);
                                    return formatCurrency(Math.max(0, employeeNeeded) / periodsPerYear);
                                  }
                                })()}
                                  {(() => {
                                    const addAmount = Math.max(0, maxOutData.hsa_additionalPerPaycheck || maxOutData.hsa_perPaycheck);
                                    const cssClass = getAddAmountClass(addAmount, breakdown.limit, false, null, 'paycheck');
                                    return cssClass === 'close-to-max' ? ' (within 5% of max!)' : '';
                                  })()}
                                </span>
                              </div>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </>
            )}
          </div>
          )}
        </div>
      );
    };

    return (
      <div className="contributions-person-card">
        <h3>{person.name}</h3>
        <div className="contributions-person-details">
          <div className="contributions-salary">
            <strong>Annual Salary:</strong> {activePersonTab === 'ytd' ? formatCurrency(person.progressAGI) : formatCurrency(person.standardAGI)}
            {activePersonTab === 'ytd' && person.progressAGI !== person.salary && <span className="contributions-agi-note"> (Progress + Forecast)</span>}
          </div>
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
                    expandedSections={expandedPersonSections}
                    onToggle={togglePersonSection}
                  />
                  <ContributionBreakdown
                    accountType="ira"
                    breakdown={person.standardBreakdown.ira}
                    accountTypeName="IRA"
                    calculationMode="standard"
                    expandedSections={expandedPersonSections}
                    onToggle={togglePersonSection}
                  />
                  {person.standardBreakdown.hsa.limit > 0 && (
                    <ContributionBreakdown
                      accountType="hsa"
                      breakdown={person.standardBreakdown.hsa}
                      accountTypeName="HSA"
                      calculationMode="standard"
                      expandedSections={expandedPersonSections}
                      onToggle={togglePersonSection}
                    />
                  )}
                  {person.standardBreakdown.espp.total > 0 && (
                    <ContributionBreakdown
                      accountType="espp"
                      breakdown={person.standardBreakdown.espp}
                      accountTypeName="ESPP"
                      calculationMode="standard"
                      expandedSections={expandedPersonSections}
                      onToggle={togglePersonSection}
                    />
                  )}
                  {person.standardBreakdown.brokerage.total > 0 && (
                    <ContributionBreakdown
                      accountType="brokerage"
                      breakdown={person.standardBreakdown.brokerage}
                      accountTypeName="Brokerage"
                      calculationMode="standard"
                      expandedSections={expandedPersonSections}
                      onToggle={togglePersonSection}
                    />
                  )}
                  
                  {/* Personal Total Breakdown */}
                  <div className="contributions-contribution-section">
                    <h4 
                      className="contributions-section-header-clickable"
                      onClick={() => togglePersonSection(person.name, 'personalTotal')}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <span>Total Annual Contributions</span>
                      <span className="contributions-toggle-icon">
                        {expandedPersonSections[person.name]?.personalTotal ? '▼' : '▶'}
                      </span>
                    </h4>
                    {expandedPersonSections[person.name]?.personalTotal && (
                      <div className="contributions-contribution-grid">
                        <div className="contributions-contribution-item">
                          <span className="label">Employee Contributions Only:</span>
                          <span className="value">{formatCurrency(
                            (person.standardBreakdown.k401?.totalEmployee || 0) +
                            (person.standardBreakdown.hsa?.totalEmployee || 0) +
                            (person.standardBreakdown.ira?.total || 0) +
                            (person.standardBreakdown.espp?.total || 0) +
                            (person.standardBreakdown.brokerage?.total || 0)
                          )}</span>
                        </div>
                        <div className="contributions-contribution-item total">
                          <span className="label">Total (with Match):</span>
                          <span className="value">{formatCurrency(
                            (person.standardBreakdown.k401?.totalCombined || 0) +
                            (person.standardBreakdown.hsa?.totalCombined || 0) +
                            (person.standardBreakdown.ira?.total || 0) +
                            (person.standardBreakdown.espp?.total || 0) +
                            (person.standardBreakdown.brokerage?.total || 0)
                          )}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Individual Contribution Analysis for Standard */}
                  <div className="contributions-opportunities">
                    <h4>🎯 Individual Contribution Analysis</h4>
                    <div className="contributions-opportunities-grid">
                      {person.standardBreakdown.k401?.remaining !== 0 && (
                        <div className="contributions-opportunity">
                          <span className="label">
                            {person.standardBreakdown.k401.remaining > 0 ? '💰 Additional 401(k) room:' : '⚠️ 401(k) Over Contributed:'}
                          </span>
                          <span className={`value ${person.standardBreakdown.k401.remaining > 0 ? 'contributions-limit-within' : 'contributions-limit-exceeded'}`}>
                            {formatCurrency(Math.abs(person.standardBreakdown.k401.remaining))}
                            {person.standardBreakdown.k401.remaining < 0 && <span className="contributions-warning-icon">⚠️</span>}
                          </span>
                        </div>
                      )}
                      {person.standardBreakdown.ira?.remaining !== 0 && (
                        <div className="contributions-opportunity">
                          <span className="label">
                            {person.standardBreakdown.ira.remaining > 0 ? '💰 Additional IRA room:' : '⚠️ IRA Over Contributed:'}
                          </span>
                          <span className={`value ${person.standardBreakdown.ira.remaining > 0 ? 'contributions-limit-within' : 'contributions-limit-exceeded'}`}>
                            {formatCurrency(Math.abs(person.standardBreakdown.ira.remaining))}
                            {person.standardBreakdown.ira.remaining < 0 && <span className="contributions-warning-icon">⚠️</span>}
                          </span>
                        </div>
                      )}
                      {person.standardBreakdown.hsa?.remaining !== 0 && person.standardBreakdown.hsa.limit > 0 && (
                        <div className="contributions-opportunity">
                          <span className="label">
                            {person.standardBreakdown.hsa.remaining > 0 ? '💰 Additional HSA room:' : '⚠️ HSA Over Contributed:'}
                          </span>
                          <span className={`value ${person.standardBreakdown.hsa.remaining > 0 ? 'contributions-limit-within' : 'contributions-limit-exceeded'}`}>
                            {formatCurrency(Math.abs(person.standardBreakdown.hsa.remaining))}
                            {person.standardBreakdown.hsa.remaining < 0 && <span className="contributions-warning-icon">⚠️</span>}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
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
                    expandedSections={expandedPersonSections}
                    onToggle={togglePersonSection}
                  />
                  <ContributionBreakdown
                    accountType="ira"
                    breakdown={person.ytdBreakdown.ira}
                    accountTypeName="IRA"
                    calculationMode="ytd"
                    expandedSections={expandedPersonSections}
                    onToggle={togglePersonSection}
                  />
                  {person.ytdBreakdown.hsa.limit > 0 && (
                    <ContributionBreakdown
                      accountType="hsa"
                      breakdown={person.ytdBreakdown.hsa}
                      accountTypeName="HSA"
                      calculationMode="ytd"
                      expandedSections={expandedPersonSections}
                      onToggle={togglePersonSection}
                    />
                  )}
                  {person.ytdBreakdown.espp.total > 0 && (
                    <ContributionBreakdown
                      accountType="espp"
                      breakdown={person.ytdBreakdown.espp}
                      accountTypeName="ESPP"
                      calculationMode="ytd"
                      expandedSections={expandedPersonSections}
                      onToggle={togglePersonSection}
                    />
                  )}
                  {person.ytdBreakdown.brokerage.total > 0 && (
                    <ContributionBreakdown
                      accountType="brokerage"
                      breakdown={person.ytdBreakdown.brokerage}
                      accountTypeName="Brokerage"
                      calculationMode="ytd"
                      expandedSections={expandedPersonSections}
                      onToggle={togglePersonSection}
                    />
                  )}
                  
                  {/* Personal Total Breakdown */}
                  <div className="contributions-contribution-section">
                    <h4 
                      className="contributions-section-header-clickable"
                      onClick={() => togglePersonSection(person.name, 'personalTotal')}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <span>Personal Total Annual Contributions</span>
                      <span className="contributions-toggle-icon">
                        {expandedPersonSections[person.name]?.personalTotal ? '▼' : '▶'}
                      </span>
                    </h4>
                    {expandedPersonSections[person.name]?.personalTotal && (
                      <div className="contributions-contribution-grid">
                        <div className="contributions-contribution-item">
                          <span className="label">Employee Contributions Only:</span>
                          <span className="value">{formatCurrency(
                            (person.ytdBreakdown.k401?.totalEmployee || 0) +
                            (person.ytdBreakdown.hsa?.totalEmployee || 0) +
                            (person.ytdBreakdown.ira?.total || 0) +
                            (person.ytdBreakdown.espp?.total || 0) +
                            (person.ytdBreakdown.brokerage?.total || 0)
                          )}</span>
                        </div>
                        <div className="contributions-contribution-item total">
                          <span className="label">Total (with Match):</span>
                          <span className="value">{formatCurrency(
                            (person.ytdBreakdown.k401?.totalCombined || 0) +
                            (person.ytdBreakdown.hsa?.totalCombined || 0) +
                            (person.ytdBreakdown.ira?.total || 0) +
                            (person.ytdBreakdown.espp?.total || 0) +
                            (person.ytdBreakdown.brokerage?.total || 0)
                          )}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Individual Contribution Analysis for YTD */}
                  <div className="contributions-opportunities">
                    <h4>🎯 Individual Contribution Analysis</h4>
                    <div className="contributions-opportunities-grid">
                      {person.ytdBreakdown.k401?.remaining !== 0 && (
                        <div className="contributions-opportunity">
                          <span className="label">
                            {person.ytdBreakdown.k401.remaining > 0 ? '💰 Additional 401(k) room:' : '⚠️ 401(k) Over Contributed:'}
                          </span>
                          <span className={`value ${person.ytdBreakdown.k401.remaining > 0 ? 'contributions-limit-within' : 'contributions-limit-exceeded'}`}>
                            {formatCurrency(Math.abs(person.ytdBreakdown.k401.remaining))}
                            {person.ytdBreakdown.k401.remaining < 0 && <span className="contributions-warning-icon">⚠️</span>}
                          </span>
                        </div>
                      )}
                      {person.ytdBreakdown.ira?.remaining !== 0 && (
                        <div className="contributions-opportunity">
                          <span className="label">
                            {person.ytdBreakdown.ira.remaining > 0 ? '💰 Additional IRA room:' : '⚠️ IRA Over Contributed:'}
                          </span>
                          <span className={`value ${person.ytdBreakdown.ira.remaining > 0 ? 'contributions-limit-within' : 'contributions-limit-exceeded'}`}>
                            {formatCurrency(Math.abs(person.ytdBreakdown.ira.remaining))}
                            {person.ytdBreakdown.ira.remaining < 0 && <span className="contributions-warning-icon">⚠️</span>}
                          </span>
                        </div>
                      )}
                      {person.ytdBreakdown.hsa?.remaining !== 0 && person.ytdBreakdown.hsa.limit > 0 && (
                        <div className="contributions-opportunity">
                          <span className="label">
                            {person.ytdBreakdown.hsa.remaining > 0 ? '💰 Additional HSA room:' : '⚠️ HSA Over Contributed:'}
                          </span>
                          <span className={`value ${person.ytdBreakdown.hsa.remaining > 0 ? 'contributions-limit-within' : 'contributions-limit-exceeded'}`}>
                            {formatCurrency(Math.abs(person.ytdBreakdown.hsa.remaining))}
                            {person.ytdBreakdown.hsa.remaining < 0 && <span className="contributions-warning-icon">⚠️</span>}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
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

  // YTD Income Tracker Component
  const YTDIncomeTracker = () => {
    // State for YTD Income Tracker
    const [user1IncomePeriods, setUser1IncomePeriods] = useState([]);
    const [user2IncomePeriods, setUser2IncomePeriods] = useState([]);
    const [user1IncomePeriodsErrors, setUser1IncomePeriodsErrors] = useState([]);
    const [user2IncomePeriodsErrors, setUser2IncomePeriodsErrors] = useState([]);
    const [user1ExpandedIncomePeriods, setUser1ExpandedIncomePeriods] = useState({});
    const [user2ExpandedIncomePeriods, setUser2ExpandedIncomePeriods] = useState({});
    const [ytdIncomeExpanded, setYtdIncomeExpanded] = useState(false);

    // Initialize income periods from paycheck data
    useEffect(() => {
      const loadIncomePeriodsData = () => {
        const currentPaycheckData = getPaycheckData();
        const user1IncomePeriodsData = currentPaycheckData.user1?.incomePeriodsData || [];
        const user2IncomePeriodsData = currentPaycheckData.user2?.incomePeriodsData || [];
        
        setUser1IncomePeriods(user1IncomePeriodsData);
        setUser2IncomePeriods(user2IncomePeriodsData);
        setUser1IncomePeriodsErrors(validateIncomePeriods(user1IncomePeriodsData));
        setUser2IncomePeriodsErrors(validateIncomePeriods(user2IncomePeriodsData));
      };

      loadIncomePeriodsData();

      // Listen for paycheck data updates
      const handlePaycheckUpdate = () => {
        loadIncomePeriodsData();
      };

      window.addEventListener('paycheckDataUpdated', handlePaycheckUpdate);
      return () => {
        window.removeEventListener('paycheckDataUpdated', handlePaycheckUpdate);
      };
    }, []);

    // Calculate YTD Income (prorated up to today's date)
    const calculateActualYTDIncome = (periods, payPeriod, fallbackSalary) => {
      if (!periods || periods.length === 0) {
        // Fall back to basic salary prorated to today's date
        if (!fallbackSalary || fallbackSalary === 0) return 0;
        
        const today = new Date();
        const currentYear = today.getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);
        
        const periodsPerYear = PAY_PERIODS[payPeriod].periodsPerYear;
        const grossPayPerPaycheck = fallbackSalary / periodsPerYear;
        
        // Calculate pay periods from start of year to today
        const timeDifferenceMs = today - startOfYear + (24 * 60 * 60 * 1000);
        const daysInPeriod = timeDifferenceMs / (24 * 60 * 60 * 1000);
        
        let daysPerPayPeriod;
        switch (payPeriod) {
          case 'weekly': daysPerPayPeriod = 7; break;
          case 'biWeekly': daysPerPayPeriod = 14; break;
          case 'semiMonthly': daysPerPayPeriod = 365.25 / 24; break;
          case 'monthly': daysPerPayPeriod = 365.25 / 12; break;
          default: daysPerPayPeriod = 14;
        }
        
        const payPeriodsWorked = daysInPeriod / daysPerPayPeriod;
        return grossPayPerPaycheck * payPeriodsWorked;
      }
      
      const today = new Date();
      const currentYear = today.getFullYear();
      let ytdIncome = 0;
      
      periods.forEach(period => {
        if (!period.startDate || !period.endDate || !period.grossSalary) return;
        
        const startDateParts = period.startDate.split('-');
        const endDateParts = period.endDate.split('-');
        
        if (startDateParts.length !== 3 || endDateParts.length !== 3) return;
        
        const startDate = new Date(parseInt(startDateParts[0]), parseInt(startDateParts[1]) - 1, parseInt(startDateParts[2]));
        const endDate = new Date(parseInt(endDateParts[0]), parseInt(endDateParts[1]) - 1, parseInt(endDateParts[2]));
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return;
        if (startDate.getFullYear() !== currentYear || endDate.getFullYear() !== currentYear) return;
        
        // Calculate the effective end date (either the period end or today, whichever is earlier)
        const effectiveEndDate = endDate < today ? endDate : today;
        
        // Only calculate if the period has started
        if (startDate <= today) {
          const periodsPerYear = PAY_PERIODS[payPeriod].periodsPerYear;
          const grossPayPerPaycheck = period.grossSalary / periodsPerYear;
          
          // Calculate pay periods between start date and effective end date
          const timeDifferenceMs = effectiveEndDate - startDate + (24 * 60 * 60 * 1000);
          const daysInPeriod = timeDifferenceMs / (24 * 60 * 60 * 1000);
          
          let daysPerPayPeriod;
          switch (payPeriod) {
            case 'weekly': daysPerPayPeriod = 7; break;
            case 'biWeekly': daysPerPayPeriod = 14; break;
            case 'semiMonthly': daysPerPayPeriod = 365.25 / 24; break;
            case 'monthly': daysPerPayPeriod = 365.25 / 12; break;
            default: daysPerPayPeriod = 14;
          }
          
          const payPeriodsWorked = daysInPeriod / daysPerPayPeriod;
          ytdIncome += grossPayPerPaycheck * payPeriodsWorked;
        }
      });
      
      return ytdIncome;
    };
    
    // Calculate Projected Annual Income (sum of all prorated income period salaries)
    const calculateProjectedAnnualIncome = (periods, payPeriod, fallbackSalary) => {
      if (!periods || periods.length === 0) {
        // Fall back to basic annual salary
        return parseFloat(fallbackSalary) || 0;
      }
      
      const currentYear = new Date().getFullYear();
      let totalProjectedIncome = 0;
      
      periods.forEach(period => {
        if (!period.startDate || !period.endDate || !period.grossSalary) return;
        
        const startDateParts = period.startDate.split('-');
        const endDateParts = period.endDate.split('-');
        
        if (startDateParts.length !== 3 || endDateParts.length !== 3) return;
        
        const startDate = new Date(parseInt(startDateParts[0]), parseInt(startDateParts[1]) - 1, parseInt(startDateParts[2]));
        const endDate = new Date(parseInt(endDateParts[0]), parseInt(endDateParts[1]) - 1, parseInt(endDateParts[2]));
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return;
        if (startDate.getFullYear() !== currentYear || endDate.getFullYear() !== currentYear) return;
        
        // Check if this period covers the entire year
        const isFullYear = startDate.getMonth() === 0 && startDate.getDate() === 1 &&
                          endDate.getMonth() === 11 && endDate.getDate() === 31;
        
        if (isFullYear) {
          totalProjectedIncome += period.grossSalary;
        } else {
          const periodsPerYear = PAY_PERIODS[payPeriod].periodsPerYear;
          const grossPayPerPaycheck = period.grossSalary / periodsPerYear;
          
          // Calculate pay periods between start and end date
          const timeDifferenceMs = endDate - startDate + (24 * 60 * 60 * 1000);
          const daysInPeriod = timeDifferenceMs / (24 * 60 * 60 * 1000);
          
          let daysPerPayPeriod;
          switch (payPeriod) {
            case 'weekly': daysPerPayPeriod = 7; break;
            case 'biWeekly': daysPerPayPeriod = 14; break;
            case 'semiMonthly': daysPerPayPeriod = 365.25 / 24; break;
            case 'monthly': daysPerPayPeriod = 365.25 / 12; break;
            default: daysPerPayPeriod = 14;
          }
          
          const payPeriodsWorked = daysInPeriod / daysPerPayPeriod;
          totalProjectedIncome += grossPayPerPaycheck * payPeriodsWorked;
        }
      });
      
      return totalProjectedIncome;
    };

    // YTD Income validation
    const validateIncomePeriods = (periods) => {
      const errors = [];
      const currentYear = new Date().getFullYear();
      
      for (let i = 0; i < periods.length; i++) {
        const period1 = periods[i];
        if (!period1.startDate || !period1.endDate) continue;
        
        // Parse dates without timezone issues by extracting year directly
        const start1Year = parseInt(period1.startDate.split('-')[0]);
        const end1Year = parseInt(period1.endDate.split('-')[0]);
        const start1 = new Date(period1.startDate + 'T00:00:00'); // Force local timezone
        const end1 = new Date(period1.endDate + 'T00:00:00'); // Force local timezone
        
        // Check if dates are valid and in current year
        if (start1Year !== currentYear || end1Year !== currentYear) {
          errors.push({ id: period1.id, message: `Dates must be in ${currentYear}` });
          continue;
        }
        
        // Check if start date is before end date
        if (start1 >= end1) {
          errors.push({ id: period1.id, message: 'Start date must be before end date' });
        }
        
        // Check for overlaps with other periods
        for (let j = i + 1; j < periods.length; j++) {
          const period2 = periods[j];
          if (!period2.startDate || !period2.endDate) continue;
          
          const start2 = new Date(period2.startDate + 'T00:00:00'); // Force local timezone
          const end2 = new Date(period2.endDate + 'T00:00:00'); // Force local timezone
          
          // Check if periods overlap
          if ((start1 <= end2 && end1 >= start2)) {
            errors.push({ 
              id: period1.id, 
              message: `Overlaps with another income period` 
            });
            errors.push({ 
              id: period2.id, 
              message: `Overlaps with another income period` 
            });
          }
        }
      }
      
      return errors;
    };

    // YTD Income functions - user-specific versions
    const addIncomePeriod = (userType) => {
      const currentYear = new Date().getFullYear();
      const currentPaycheckData = getPaycheckData();
      const salary = currentPaycheckData[userType]?.salary || 0;
      
      const newPeriod = {
        id: Date.now(),
        startDate: `${currentYear}-01-01`,
        endDate: `${currentYear}-12-31`,
        grossSalary: parseFloat(salary) || 0,
        description: 'Salary Period'
      };
      
      const currentPeriods = userType === 'user1' ? user1IncomePeriods : user2IncomePeriods;
      const updatedPeriods = [...currentPeriods, newPeriod];
      
      if (userType === 'user1') {
        setUser1IncomePeriods(updatedPeriods);
        setUser1IncomePeriodsErrors(validateIncomePeriods(updatedPeriods));
      } else {
        setUser2IncomePeriods(updatedPeriods);
        setUser2IncomePeriodsErrors(validateIncomePeriods(updatedPeriods));
      }
      
      // Update paycheck data
      const updatedPaycheckData = {
        ...currentPaycheckData,
        [userType]: {
          ...currentPaycheckData[userType],
          incomePeriodsData: updatedPeriods
        }
      };
      setPaycheckData(updatedPaycheckData);
      
      // Dispatch update event
      window.dispatchEvent(new CustomEvent('paycheckDataUpdated', { detail: updatedPaycheckData }));
    };

    const updateIncomePeriod = (userType, id, field, value) => {
      const currentPeriods = userType === 'user1' ? user1IncomePeriods : user2IncomePeriods;
      const updatedPeriods = currentPeriods.map(period => 
        period.id === id ? { 
          ...period, 
          [field]: field === 'grossSalary' ? parseFloat(value) || 0 : value 
        } : period
      );
      
      if (userType === 'user1') {
        setUser1IncomePeriods(updatedPeriods);
        if (field !== 'startDate' && field !== 'endDate') {
          setUser1IncomePeriodsErrors(validateIncomePeriods(updatedPeriods));
        }
      } else {
        setUser2IncomePeriods(updatedPeriods);
        if (field !== 'startDate' && field !== 'endDate') {
          setUser2IncomePeriodsErrors(validateIncomePeriods(updatedPeriods));
        }
      }
      
      // Update paycheck data
      const currentPaycheckData = getPaycheckData();
      const updatedPaycheckData = {
        ...currentPaycheckData,
        [userType]: {
          ...currentPaycheckData[userType],
          incomePeriodsData: updatedPeriods
        }
      };
      setPaycheckData(updatedPaycheckData);
      
      // Dispatch update event
      window.dispatchEvent(new CustomEvent('paycheckDataUpdated', { detail: updatedPaycheckData }));
    };

    const validateIncomePeriodOnBlur = (userType, id) => {
      const currentPeriods = userType === 'user1' ? user1IncomePeriods : user2IncomePeriods;
      if (userType === 'user1') {
        setUser1IncomePeriodsErrors(validateIncomePeriods(currentPeriods));
      } else {
        setUser2IncomePeriodsErrors(validateIncomePeriods(currentPeriods));
      }
    };

    const removeIncomePeriod = (userType, id) => {
      const currentPeriods = userType === 'user1' ? user1IncomePeriods : user2IncomePeriods;
      const updatedPeriods = currentPeriods.filter(period => period.id !== id);
      
      if (userType === 'user1') {
        setUser1IncomePeriods(updatedPeriods);
        setUser1IncomePeriodsErrors(validateIncomePeriods(updatedPeriods));
      } else {
        setUser2IncomePeriods(updatedPeriods);
        setUser2IncomePeriodsErrors(validateIncomePeriods(updatedPeriods));
      }
      
      // Update paycheck data
      const currentPaycheckData = getPaycheckData();
      const updatedPaycheckData = {
        ...currentPaycheckData,
        [userType]: {
          ...currentPaycheckData[userType],
          incomePeriodsData: updatedPeriods
        }
      };
      setPaycheckData(updatedPaycheckData);
      
      // Dispatch update event
      window.dispatchEvent(new CustomEvent('paycheckDataUpdated', { detail: updatedPaycheckData }));
    };

    const toggleIncomePeriod = (userType, id) => {
      if (userType === 'user1') {
        setUser1ExpandedIncomePeriods(prev => ({
          ...prev,
          [id]: !prev[id]
        }));
      } else {
        setUser2ExpandedIncomePeriods(prev => ({
          ...prev,
          [id]: !prev[id]
        }));
      }
    };

    // Helper component for rendering user-specific YTD section
    const UserYTDSection = ({ userType, userName, incomePeriods, incomePeriodsErrors, expandedIncomePeriods }) => {
      const currentPaycheckData = getPaycheckData();
      const salary = currentPaycheckData[userType]?.salary || 0;
      const payPeriod = currentPaycheckData[userType]?.payPeriod || 'biWeekly';
      
      const ytdIncome = calculateActualYTDIncome(incomePeriods, payPeriod, salary);
      const projectedAnnualIncome = calculateProjectedAnnualIncome(incomePeriods, payPeriod, salary);

      return (
        <div className="ytd-user-section">
          <div className="ytd-user-header">
            <h3>{userName}</h3>
            {projectedAnnualIncome > 0 && (
              <span className="ytd-user-badge">
                {formatCurrency(projectedAnnualIncome)}
              </span>
            )}
          </div>
          
          <div className="ytd-section">
            <div className="ytd-section-header">
              <h4>Income Periods</h4>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => addIncomePeriod(userType)}
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
                {incomePeriods.map((period) => {
                  const periodErrors = incomePeriodsErrors.filter(error => error.id === period.id);
                  const hasErrors = periodErrors.length > 0;
                  const isExpanded = expandedIncomePeriods[period.id];
                    
                    // Calculate prorated salary for this period
                    let proratedSalary = 0;
                    if (period.startDate && period.endDate && period.grossSalary) {
                      const startDateParts = period.startDate.split('-');
                      const endDateParts = period.endDate.split('-');
                      
                      if (startDateParts.length === 3 && endDateParts.length === 3) {
                        const startDate = new Date(parseInt(startDateParts[0]), parseInt(startDateParts[1]) - 1, parseInt(startDateParts[2]));
                        const endDate = new Date(parseInt(endDateParts[0]), parseInt(endDateParts[1]) - 1, parseInt(endDateParts[2]));
                        
                        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                          const currentYear = new Date().getFullYear();
                          if (startDate.getFullYear() === currentYear && endDate.getFullYear() === currentYear) {
                            // Check if this period covers the entire year
                            const isFullYear = startDate.getMonth() === 0 && startDate.getDate() === 1 &&
                                              endDate.getMonth() === 11 && endDate.getDate() === 31;
                            
                            if (isFullYear) {
                              proratedSalary = period.grossSalary;
                            } else {
                              const periodsPerYear = PAY_PERIODS[payPeriod].periodsPerYear;
                              const grossPayPerPaycheck = period.grossSalary / periodsPerYear;
                              
                              // Calculate pay periods between dates using the same logic as YTD calculation
                              const timeDifferenceMs = endDate - startDate + (24 * 60 * 60 * 1000); // Add 1 day to make it inclusive
                              const daysInPeriod = timeDifferenceMs / (24 * 60 * 60 * 1000);
                              
                              let daysPerPayPeriod;
                              switch (payPeriod) {
                                case 'weekly':
                                  daysPerPayPeriod = 7;
                                  break;
                                case 'biWeekly':
                                  daysPerPayPeriod = 14;
                                  break;
                                case 'semiMonthly':
                                  daysPerPayPeriod = 365.25 / 24;
                                  break;
                                case 'monthly':
                                  daysPerPayPeriod = 365.25 / 12;
                                  break;
                                default:
                                  daysPerPayPeriod = 14;
                              }
                              
                              const payPeriodsWorked = daysInPeriod / daysPerPayPeriod;
                              proratedSalary = grossPayPerPaycheck * payPeriodsWorked;
                            }
                          }
                        }
                      }
                    }
                    
                    return (
                    <div key={period.id} className={`income-period-card ${hasErrors ? 'has-errors' : ''} ${isExpanded ? 'expanded' : 'collapsed'}`}>
                      {/* Compact Summary View */}
                      <div className="income-period-summary" onClick={() => toggleIncomePeriod(userType, period.id)}>
                        <div className="income-period-summary-content">
                          <div className="income-period-summary-main">
                            <span className="income-period-description">
                              {period.description || 'Untitled Period'}
                            </span>
                            <span className="income-period-dates">
                              {period.startDate && period.endDate 
                                ? `${period.startDate} to ${period.endDate}`
                                : 'Dates not set'
                              }
                            </span>
                            <span className="income-period-salary">
                              {proratedSalary > 0 ? `$${Math.round(proratedSalary).toLocaleString()}` : '$0'}
                            </span>
                          </div>
                          <div className="income-period-toggle">
                            <span className="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
                          </div>
                        </div>
                        {hasErrors && !isExpanded && (
                          <div className="income-period-summary-errors">
                            ⚠️ {periodErrors.length} error{periodErrors.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>

                      {/* Expanded Edit View */}
                      {isExpanded && (
                        <div className="income-period-expanded">
                          <div className="income-period-row">
                            <div className="income-period-field">
                              <label>Description</label>
                              <input
                                type="text"
                                value={period.description || ''}
                                onChange={(e) => updateIncomePeriod(userType, period.id, 'description', e.target.value)}
                                placeholder="e.g., Base Salary, Promotion, New Job"
                              />
                            </div>
                            <div className="income-period-field">
                              <label>Start Date</label>
                              <input
                                type="date"
                                value={period.startDate || ''}
                                onChange={(e) => updateIncomePeriod(userType, period.id, 'startDate', e.target.value)}
                                onBlur={() => validateIncomePeriodOnBlur(userType, period.id)}
                              />
                            </div>
                            <div className="income-period-field">
                              <label>End Date</label>
                              <input
                                type="date"
                                value={period.endDate || ''}
                                onChange={(e) => updateIncomePeriod(userType, period.id, 'endDate', e.target.value)}
                                onBlur={() => validateIncomePeriodOnBlur(userType, period.id)}
                              />
                            </div>
                            <div className="income-period-field">
                              <label>Income Period Salary</label>
                              <input
                                type="number"
                                value={period.grossSalary || ''}
                                onChange={(e) => updateIncomePeriod(userType, period.id, 'grossSalary', e.target.value)}
                                placeholder="0"
                              />
                            </div>
                            <div className="income-period-actions">
                              <button 
                                className="btn btn-danger btn-sm"
                                onClick={() => removeIncomePeriod(userType, period.id)}
                              >
                                🗑️ Remove
                              </button>
                            </div>
                          </div>
                          
                          {/* Error display */}
                          {hasErrors && (
                            <div className="income-period-errors">
                              {periodErrors.map((error, errorIndex) => (
                                <div key={errorIndex} className="income-period-error">
                                  {error.message}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Income Summary */}
            {(ytdIncome > 0 || projectedAnnualIncome > 0) && (
              <div className="calculation-hint">
                <div><strong>Income Summary:</strong></div>
                <div>YTD Income: {formatCurrency(ytdIncome)}</div>
                <div>Projected Annual Income: {formatCurrency(projectedAnnualIncome)}</div>
              </div>
            )}
          </div>
        </div>
      );
    };

    // Get user names from paycheck data
    const currentPaycheckData = getPaycheckData();
    const user1Name = currentPaycheckData.user1?.name || 'User 1';
    const user2Name = currentPaycheckData.user2?.name || 'User 2';

    // Calculate combined totals for badge
    const user1Salary = currentPaycheckData.user1?.salary || 0;  
    const user1PayPeriod = currentPaycheckData.user1?.payPeriod || 'biWeekly';
    const user2Salary = currentPaycheckData.user2?.salary || 0;
    const user2PayPeriod = currentPaycheckData.user2?.payPeriod || 'biWeekly';
    
    const user1ProjectedIncome = calculateProjectedAnnualIncome(user1IncomePeriods, user1PayPeriod, user1Salary);
    const user2ProjectedIncome = isMultiUserMode ? calculateProjectedAnnualIncome(user2IncomePeriods, user2PayPeriod, user2Salary) : 0;
    const combinedProjectedIncome = user1ProjectedIncome + user2ProjectedIncome;

    return (
      <div className="contributions-card">
        <div className="contributions-card-header">
          <div className="contributions-card-title">
            <h2>📈 YTD Income Tracker</h2>
            {combinedProjectedIncome > 0 && (
              <span className="contributions-card-badge">
                {formatCurrency(combinedProjectedIncome)}
              </span>
            )}
          </div>
          <button 
            className="contributions-card-toggle"
            onClick={() => setYtdIncomeExpanded(!ytdIncomeExpanded)}
          >
            {ytdIncomeExpanded ? '▼' : '▶'}
          </button>
        </div>
        
        {ytdIncomeExpanded && (
          <div className="contributions-card-content">
            <div className="ytd-users-container">
              <UserYTDSection 
                userType="user1"
                userName={user1Name}
                incomePeriods={user1IncomePeriods}
                incomePeriodsErrors={user1IncomePeriodsErrors}
                expandedIncomePeriods={user1ExpandedIncomePeriods}
              />
              
              {isMultiUserMode && (
                <UserYTDSection 
                  userType="user2"
                  userName={user2Name}
                  incomePeriods={user2IncomePeriods}
                  incomePeriodsErrors={user2IncomePeriodsErrors}
                  expandedIncomePeriods={user2ExpandedIncomePeriods}
                />
              )}
            </div>
          </div>
        )}
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

        {/* Last Update Information */}
        <LastUpdateInfo showDetails={false} compact={true} />

        <div className="header">{/* Continuation of header content */}
          
          <div className="contributions-help-toggle">
            <button 
              className="contributions-help-button"
              onClick={() => setShowHelp(!showHelp)}
            >
              {showHelp ? '🔼' : '🔽'} How Calculations Work & Data Sources
            </button>
          </div>
        </div>

        {/* Help Section */}
        {showHelp && (
          <div className="contributions-help-section">
            <div className="contributions-help-content">
              <h3>📊 How Contribution Calculations Work</h3>
              
              <div className="contributions-help-subsection">
                <h4>🎯 Two Calculation Modes</h4>
                <div className="contributions-help-modes">
                  <div className="contributions-help-mode">
                    <h5>📊 Annual Settings View</h5>
                    <p>Shows full-year projections based entirely on your current paycheck calculator settings:</p>
                    <ul>
                      <li><strong>401(k):</strong> Uses your current contribution percentages × annual salary</li>
                      <li><strong>IRA:</strong> Uses your current monthly contribution amounts × 12</li>
                      <li><strong>HSA:</strong> Uses your current per-paycheck + annual employer amounts</li>
                      <li><strong>ESPP:</strong> Uses your current percentage × annual salary</li>
                      <li><strong>Brokerage:</strong> Uses your current monthly amounts × 12</li>
                    </ul>
                  </div>
                  
                  <div className="contributions-help-mode">
                    <h5>📈 Progress + Forecast View</h5>
                    <p>Shows actual YTD progress + projected remaining contributions:</p>
                    <ul>
                      <li><strong>YTD Data:</strong> From Account Tracker and Annual Tracker entries</li>
                      <li><strong>Projected Remaining:</strong> Based on current settings for remaining time periods</li>
                      <li><strong>Time Calculations:</strong> Uses remaining pay periods and months in the year</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="contributions-help-subsection">
                <h4>🔍 Data Sources & Logic</h4>
                
                <div className="contributions-help-data-source">
                  <h5>401(k) Contributions</h5>
                  <ul>
                    <li><strong>Employee:</strong> Account Tracker entries (accountType: "401k")</li>
                    <li><strong>Employer Match:</strong> Account Tracker "employerMatch" field</li>
                    <li><strong>Limits:</strong> $23,000 + $7,500 catch-up (age 50+) for 2025</li>
                    <li><strong>Account Type:</strong> Always Individual (separate limits per person)</li>
                  </ul>
                </div>

                <div className="contributions-help-data-source">
                  <h5>IRA Contributions</h5>
                  <ul>
                    <li><strong>Source:</strong> Account Tracker entries (accountType: "IRA")</li>
                    <li><strong>Limits:</strong> $7,000 + $1,000 catch-up (age 50+) for 2025</li>
                    <li><strong>Account Type:</strong> Treated as Joint (combined limit for household)</li>
                    <li><strong>Division:</strong> Joint totals divided evenly between spouses</li>
                  </ul>
                </div>

                <div className="contributions-help-data-source">
                  <h5>HSA Contributions</h5>
                  <ul>
                    <li><strong>Employee:</strong> Account Tracker entries (accountType: "HSA")</li>
                    <li><strong>Employer:</strong> Annual Tracker "employerHsa" field OR estimated from paycheck settings</li>
                    <li><strong>Limits:</strong> $4,300 (self) / $8,550 (family) + $1,000 catch-up (age 55+) for 2025</li>
                    <li><strong>Important:</strong> Both employee AND employer contributions count toward IRS limit</li>
                    <li><strong>Account Type:</strong> Always Individual (separate limits per person)</li>
                  </ul>
                </div>

                <div className="contributions-help-data-source">
                  <h5>ESPP Contributions</h5>
                  <ul>
                    <li><strong>Source:</strong> Account Tracker entries (accountType: "ESPP")</li>
                    <li><strong>Limits:</strong> No IRS annual limit (company-specific limits may apply)</li>
                    <li><strong>Account Type:</strong> Always Individual</li>
                  </ul>
                </div>

                <div className="contributions-help-data-source">
                  <h5>Brokerage Contributions</h5>
                  <ul>
                    <li><strong>Source:</strong> Account Tracker entries (accountType: "Brokerage" or "Taxable")</li>
                    <li><strong>Limits:</strong> No IRS annual limit</li>
                    <li><strong>Account Type:</strong> Auto-detected (Joint if user name is "Joint" or account name contains "joint")</li>
                    <li><strong>Division:</strong> Joint totals divided evenly between spouses</li>
                  </ul>
                </div>
              </div>

              <div className="contributions-help-subsection">
                <h4>⚙️ Key Assumptions & Logic</h4>
                <div className="contributions-help-assumptions">
                  <div className="contributions-help-assumption">
                    <h5>🔄 Joint vs Individual Accounts</h5>
                    <ul>
                      <li><strong>Joint:</strong> IRA contributions, Brokerage accounts (if detected)</li>
                      <li><strong>Individual:</strong> 401(k), HSA, ESPP contributions</li>
                      <li><strong>Detection:</strong> Joint accounts identified by user name "Joint" or account name containing "joint"</li>
                    </ul>
                  </div>

                  <div className="contributions-help-assumption">
                    <h5>📅 Time Period Calculations</h5>
                    <ul>
                      <li><strong>Remaining Pay Periods:</strong> Calculated from today to end of year based on pay frequency</li>
                      <li><strong>Remaining Months:</strong> Complete months remaining in the year</li>
                      <li><strong>YTD Employer HSA:</strong> If no annual data, estimated as (annual amount × elapsed months ÷ 12)</li>
                    </ul>
                  </div>

                  <div className="contributions-help-assumption">
                    <h5>🎯 Contribution Room & Limits</h5>
                    <ul>
                      <li><strong>Age-Based Limits:</strong> Uses birthdates from paycheck calculator for catch-up eligibility</li>
                      <li><strong>HSA Coverage:</strong> Uses HSA coverage type from paycheck calculator (self/family)</li>
                      <li><strong>Over-Limit Warning:</strong> Red text + warning icon when contributions exceed IRS limits</li>
                      <li><strong>Within Limits:</strong> Green text when contributions are below IRS limits</li>
                    </ul>
                  </div>

                  <div className="contributions-help-assumption">
                    <h5>💡 "Max Out" Recommendations</h5>
                    <ul>
                      <li><strong>401(k) Percentage:</strong> Additional percentage needed per paycheck to reach limit</li>
                      <li><strong>IRA Monthly:</strong> Additional monthly amount needed to reach limit</li>
                      <li><strong>HSA Per Paycheck:</strong> Additional employee contribution needed (employer contribution accounted for)</li>
                      <li><strong>Close to Max:</strong> Green highlighting when additional amount needed is ≤ 5% of IRS limit</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="contributions-help-subsection">
                <h4>⚠️ Important Notes</h4>
                <div className="contributions-help-notes">
                  <ul>
                    <li><strong>Data Accuracy:</strong> Ensure your Account Tracker and Annual Tracker data is up-to-date</li>
                    <li><strong>Missing Data:</strong> If YTD data is missing, the tool estimates based on current settings</li>
                    <li><strong>Account Naming:</strong> Use consistent naming across Account Tracker for accurate categorization</li>
                    <li><strong>Joint Accounts:</strong> Mark accounts as "Joint" in the user name for proper household calculations</li>
                    <li><strong>Real-Time Updates:</strong> Changes in Paycheck Calculator automatically update these projections</li>
                    <li><strong>Tax Year:</strong> All calculations are based on the current calendar year</li>
                  </ul>
                </div>
              </div>

              <div className="contributions-help-subsection">
                <h4>🔧 Troubleshooting</h4>
                <div className="contributions-help-troubleshooting">
                  <ul>
                    <li><strong>Missing YTD Data:</strong> Add entries to Account Tracker with correct account types</li>
                    <li><strong>Wrong Limits:</strong> Check birthdate and HSA coverage type in Paycheck Calculator</li>
                    <li><strong>Employer HSA Not Showing:</strong> Add "employerHsa" field to Annual Tracker or verify paycheck settings</li>
                    <li><strong>Joint Account Issues:</strong> Ensure account user name is "Joint" or account name contains "joint"</li>
                    <li><strong>Calculation Discrepancies:</strong> Verify pay period settings match your actual pay schedule</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Tab Navigation */}
        <div className="contributions-floating-nav">
          <div className="contributions-floating-tab-navigation">
            <button 
              className={`contributions-floating-tab-button ${activeTab === 'standard' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('standard');
                setActivePersonTab('standard');
              }}
            >
              📊 Annual Settings View
            </button>
            <button 
              className={`contributions-floating-tab-button ${activeTab === 'ytd' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('ytd');
                setActivePersonTab('ytd');
              }}
            >
              📈 Progress + Forecast View
            </button>
          </div>
        </div>

        {/* YTD Income Tracker */}
        <div className="contributions-ytd-income-section">
          <YTDIncomeTracker />
        </div>

        {/* Household Summary */}
        <div className="contributions-summary-card">
          <h2>Household Summary</h2>
          
          <div className="contributions-comparison-container">
            <div className="contributions-tab-navigation">
              <button 
                className={`contributions-tab-button ${activeTab === 'standard' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('standard');
                  setActivePersonTab('standard');
                }}
              >
                📊 Annual Settings View
              </button>
              <button 
                className={`contributions-tab-button ${activeTab === 'ytd' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('ytd');
                  setActivePersonTab('ytd');
                }}
              >
                📈 Progress + Forecast View
              </button>
            </div>
            
            <div className="contributions-tab-content">
              {activeTab === 'standard' && (
                <div className="contributions-calculation-column">
                  <h3 className="calculation-header standard">Annual Settings View</h3>
                  <HouseholdBreakdownSection breakdownData={householdTotals.standardBreakdown} annualTotals={householdTotals.standardAnnualTotals} mode="standard" />
                </div>
              )}
              
              {activeTab === 'ytd' && (
                <div className="contributions-calculation-column">
                  <h3 className="calculation-header ytd">Progress + Forecast View</h3>
                  <div className="contributions-calculation-note">
                    <small>📈 Shows actual YTD contributions + projected remaining at current settings</small>
                  </div>
                  <HouseholdBreakdownSection breakdownData={householdTotals.ytdBreakdown} annualTotals={householdTotals.ytdAnnualTotals} mode="ytd" />
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
                      <span className={`value ${householdTotals.remaining401k > 0 ? 'contributions-limit-within' : 'contributions-limit-exceeded'}`}>
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
                      <span className={`value ${householdTotals.remainingIra > 0 ? 'contributions-limit-within' : 'contributions-limit-exceeded'}`}>
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
                      <span className={`value ${householdTotals.remainingHsa > 0 ? 'contributions-limit-within' : 'contributions-limit-exceeded'}`}>
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
                            <span className={`value ${ytdRemaining401k > 0 ? 'contributions-limit-within' : 'contributions-limit-exceeded'}`}>
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
                            <span className={`value ${ytdRemainingIra > 0 ? 'contributions-limit-within' : 'contributions-limit-exceeded'}`}>
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
                            <span className={`value ${ytdRemainingHsa > 0 ? 'contributions-limit-within' : 'contributions-limit-exceeded'}`}>
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
          {isMultiUserMode && contributionMetrics.spouse && (
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