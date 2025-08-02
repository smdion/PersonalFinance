import React, { useState, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { PaycheckBudgetContext } from '../context/PaycheckBudgetContext';
import { getPaycheckData, setPaycheckData, getAnnualData, getRetirementData, setRetirementData, getPortfolioRecords, getAccountData } from '../utils/localStorage';
import { useMultiUserCalculator } from '../hooks/useMultiUserCalculator';
import { formatCurrency, calculateAge, calculateProjectedRemainingContributions } from '../utils/calculationHelpers';
import Navigation from './Navigation';
import LastUpdateInfo from './LastUpdateInfo';
import DataManager from './DataManager';
import '../styles/last-update-info.css';

// Tooltip component for contribution details
const ContributionTooltip = ({ contributions, type, children }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState('top');
  const tooltipRef = useRef(null);
  const wrapperRef = useRef(null);
  
  if (!contributions?.breakdown) {
    return children;
  }

  // Calculate optimal tooltip position to avoid cutoff
  const calculateTooltipPosition = useCallback(() => {
    if (!tooltipRef.current || !wrapperRef.current) return;
    
    const tooltip = tooltipRef.current;
    const wrapper = wrapperRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    
    // Get viewport dimensions and scroll position
    const viewportHeight = window.innerHeight;
    const scrollY = window.scrollY;
    
    // Calculate space above and below the wrapper element relative to viewport
    const spaceAbove = wrapperRect.top;
    const spaceBelow = viewportHeight - wrapperRect.bottom;
    
    // Get actual tooltip height, with fallback
    const tooltipHeight = tooltipRect.height > 0 ? tooltipRect.height : 120;
    
    // Conservative buffer for header and spacing
    const headerBuffer = 140; // Account for header, navigation, and padding
    const spacingBuffer = 16; // Margin between tooltip and trigger
    
    // Check if tooltip would be cut off at top (by header) or bottom (by viewport)
    const wouldCutOffTop = spaceAbove < (tooltipHeight + spacingBuffer + headerBuffer);
    const wouldCutOffBottom = spaceBelow < (tooltipHeight + spacingBuffer);
    
    // Decide position based on available space and cutoff risk
    if (wouldCutOffTop && !wouldCutOffBottom) {
      // Not enough space above, use bottom
      setTooltipPosition('bottom');
    } else if (!wouldCutOffTop && wouldCutOffBottom) {
      // Not enough space below, use top
      setTooltipPosition('top');
    } else if (!wouldCutOffTop && !wouldCutOffBottom) {
      // Both positions work, prefer top (default behavior)
      setTooltipPosition('top');
    } else {
      // Neither position ideal, choose the one with more available space
      setTooltipPosition(spaceAbove > spaceBelow ? 'top' : 'bottom');
    }
  }, []);

  const handleMouseEnter = () => {
    setShowTooltip(true);
    // Calculate position after tooltip is rendered
    setTimeout(calculateTooltipPosition, 0);
  };

  // Recalculate position on window resize or scroll
  useEffect(() => {
    if (!showTooltip) return;
    
    const handleResize = () => {
      calculateTooltipPosition();
    };
    
    const handleScroll = () => {
      calculateTooltipPosition();
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [showTooltip, calculateTooltipPosition]);

  const breakdown = contributions.breakdown;
  
  const renderEmployeeContributionTooltip = () => (
    <div className="retirement-tooltip-content">
      <div className="tooltip-header">Employee Contributions Breakdown</div>
      {breakdown.traditional401k > 0 && (
        <div className="tooltip-item">
          <span>Traditional 401k:</span>
          <span>{formatCurrency(breakdown.traditional401k)}</span>
        </div>
      )}
      {breakdown.roth401k > 0 && (
        <div className="tooltip-item">
          <span>Roth 401k:</span>
          <span>{formatCurrency(breakdown.roth401k)}</span>
        </div>
      )}
      {breakdown.traditionalIra > 0 && (
        <div className="tooltip-item">
          <span>Traditional IRA:</span>
          <span>{formatCurrency(breakdown.traditionalIra)}</span>
        </div>
      )}
      {breakdown.rothIra > 0 && (
        <div className="tooltip-item">
          <span>Roth IRA:</span>
          <span>{formatCurrency(breakdown.rothIra)}</span>
        </div>
      )}
      {breakdown.brokerage > 0 && (
        <div className="tooltip-item">
          <span>Brokerage:</span>
          <span>{formatCurrency(breakdown.brokerage)}</span>
        </div>
      )}
    </div>
  );

  const renderEmployerMatchTooltip = () => (
    <div className="retirement-tooltip-content">
      <div className="tooltip-header">Employer Match Details</div>
      <div className="tooltip-item">
        <span>Match Rate:</span>
        <span>{breakdown.employerMatchRate}%</span>
      </div>
      <div className="tooltip-item">
        <span>Base Salary:</span>
        <span>{formatCurrency(breakdown.salary)}</span>
      </div>
      <div className="tooltip-item">
        <span>Match Amount:</span>
        <span>{formatCurrency(breakdown.employerMatch)}</span>
      </div>
      <div className="tooltip-item">
        <span>Data Source:</span>
        <span className={breakdown.employerMatchSource === 'actual' ? 'actual-data' : 'projected-data'}>
          {breakdown.employerMatchSource === 'actual' ? 'Actual (Account Tracker)' : 'Projected (Calculated)'}
        </span>
      </div>
    </div>
  );

  return (
    <div 
      ref={wrapperRef}
      className="retirement-tooltip-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <div 
          ref={tooltipRef}
          className={`retirement-tooltip retirement-tooltip-${tooltipPosition}`}
        >
          {type === 'employee' ? renderEmployeeContributionTooltip() : renderEmployerMatchTooltip()}
        </div>
      )}
    </div>
  );
};

// Schema for retirement projections DataManager
const retirementProjectionsSchema = {
  primaryKeyLabel: 'Year',
  sections: [
    {
      name: 'basic',
      title: 'Basic Info',
      fields: [
        { name: 'year', label: 'Year', type: 'number', format: 'number' }
      ]
    },
    {
      name: 'users',
      title: 'User Data',
      fields: [
        { name: 'age', label: 'Age', type: 'number', format: 'number' },
        { name: 'salary', label: 'Salary', type: 'number', format: 'currency' },
        { name: 'employeeContributions', label: 'Employee Contributions', type: 'number', format: 'currency' },
        { name: 'employerMatch', label: 'Employer Match', type: 'number', format: 'currency' },
        { name: 'totalContributions', label: 'Total Contributions', type: 'number', format: 'currency' },
        { name: 'withdrawal', label: 'Withdrawal', type: 'number', format: 'currency' },
        { name: 'taxFree', label: 'Tax-Free', type: 'number', format: 'currency' },
        { name: 'taxDeferred', label: 'Tax-Deferred', type: 'number', format: 'currency' },
        { name: 'afterTax', label: 'After-Tax', type: 'number', format: 'currency' },
        { name: 'totalBalance', label: 'Total Balance', type: 'number', format: 'currency' },
        { name: 'returnRate', label: 'Return Rate', type: 'number', format: 'percentage' }
      ]
    }
  ]
};

// Transform retirement projections to DataManager format - now supports dynamic users
const transformProjectionsToDataManagerFormat = (userProjections, paycheckData, currentYear, getActualEmployerMatchForYear) => {
  const data = {};
  
  // userProjections is now an object with userId keys: { user1: [...], user2: [...] }
  const projectionArrays = Object.values(userProjections).filter(proj => Array.isArray(proj));
  if (projectionArrays.length === 0) return data;
  
  // Get the maximum length of projections
  const maxLength = Math.max(...projectionArrays.map(proj => proj.length));
  
  for (let i = 0; i < maxLength; i++) {
    // Get year from any available projection
    const year = projectionArrays.find(projArray => projArray[i])?.at(i)?.year;
    if (!year) continue;
    
    const entry = {
      year: year,
      users: {}
    };
    
    // Add data for all users dynamically
    Object.entries(userProjections).forEach(([userId, projections]) => {
      const userProj = projections[i];
      if (userProj) {
        entry.users[userId] = {
          age: userProj.age,
          salary: userProj.salary || 0,
          employeeContributions: userProj.contributions?.employee || 0,
          employerMatch: userProj.contributions?.employer || 0,
          totalContributions: userProj.contributions?.total || 0,
          withdrawal: userProj.withdrawal || 0,
          taxFree: userProj.balances?.taxFree || 0,
          taxDeferred: userProj.balances?.taxDeferred || 0,
          afterTax: userProj.balances?.afterTax || 0,
          totalBalance: userProj.totalBalance || 0,
          returnRate: (userProj.returnRate || 0) / 100,
          contributions: userProj.contributions // Include full contributions object with breakdown
        };
      }
    });
    
    data[`proj_${year}`] = entry;
  }
  
  return data;
};


const Retirement = () => {
  const { formData: contextFormData } = useContext(PaycheckBudgetContext);

  // Use multi-user calculator hook
  const { activeUsers } = useMultiUserCalculator();
  const isMultiUserMode = activeUsers.includes('user2');
  
  // Tab state for detailed breakdown
  const [activeTab, setActiveTab] = useState('summary');
  
  // Detailed mode for projections table
  const [showDetailedProjections, setShowDetailedProjections] = useState(false);
  
  // DataManager state for projections
  const [projectionsData, setProjectionsData] = useState({});

  // Load existing retirement data
  const loadRetirementData = () => {
    return getRetirementData() || {
      user1: {
        ageAtRetirement: 65,
        ageOfDeath: 90,
        annualSalaryIncrease: 3,
        raisesInRetirement: 0,
        employerMatch: 4,
        employeeContributionForMatch: 4
      },
      user2: {
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
  const paycheckData = useMemo(() => getPaycheckData(), []);
  const annualData = useMemo(() => getAnnualData(), []);
  const accountData = useMemo(() => getAccountData(), []);

  // Helper function to get actual employer match data from performance data (works with normalized keys)
  const getActualEmployerMatchForYear = useCallback((userKey, year) => {
    const paycheckUser = paycheckData[userKey];

    if (!paycheckUser || !accountData) {
      return null;
    }

    let totalEmployerMatch = 0;
    let foundData = false;

    // Find all performance data entries for this user and year using normalized keys
    for (const [entryId, entry] of Object.entries(accountData)) {
      if (entry.year === year && entry.users) {
        // Use normalized userKey directly to access user data
        const userData = entry.users[userKey];
        
        if (userData) {
          // Sum up employer match from all 401k accounts for this user
          if (userData.employerMatch !== undefined && userData.accountType === '401k') {
            const matchAmount = parseFloat(userData.employerMatch) || 0;
            totalEmployerMatch += matchAmount;
            foundData = true;
          }
        }
      }
    }
    
    return foundData ? totalEmployerMatch : null;
  }, [paycheckData, accountData]);

  // Calculate age-based return rate
  const calculateReturnRate = (currentAge, retirementAge, retirementRate) => {
    if (currentAge >= retirementAge) {
      return retirementRate / 100;
    }
    // Start at 10% at age 20, decrease by 0.1% each year after age 20
    const currentRate = Math.max(10 - (0.1 * (currentAge - 20)), retirementRate);
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
          contributions: { employee: 0, employer: 0, total: 0 },
          withdrawal: 0,
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
    
    // Get current balances from most recent portfolio data (allow any year for retirement planning)
    const portfolioRecords = getPortfolioRecords();
    let portfolioAccounts = [];
    
    if (portfolioRecords.length > 0) {
      // Sort by updateDate to get the most recent record (regardless of year)
      const sortedRecords = portfolioRecords.sort((a, b) => 
        new Date(b.updateDate) - new Date(a.updateDate)
      );
      const mostRecentRecord = sortedRecords[0];
      portfolioAccounts = mostRecentRecord.accounts || [];
    }
    
    const currentBalances = {
      taxFree: 0,
      taxDeferred: 0,
      afterTax: 0
    };

    // Filter accounts for this user using normalized keys
    portfolioAccounts
      .filter(account => account.owner === userKey)
      .forEach(account => {
        const amount = parseFloat(account.amount) || 0;
        
        switch (account.taxType) {
          case 'Tax-Free':
            currentBalances.taxFree += amount;
            break;
          case 'Tax-Deferred':
            currentBalances.taxDeferred += amount;
            break;
          case 'After-Tax':
            currentBalances.afterTax += amount;
            break;
          default:
            // If taxType is not specified, try to infer from accountType
            if (account.accountType === 'HSA') {
              currentBalances.taxDeferred += amount;
            } else if (account.accountType === 'IRA' && account.accountName?.toLowerCase().includes('roth')) {
              currentBalances.taxFree += amount;
            } else if (account.accountType === 'IRA') {
              currentBalances.taxDeferred += amount;
            } else if (account.accountType === '401k' && account.accountName?.toLowerCase().includes('roth')) {
              currentBalances.taxFree += amount;
            } else if (account.accountType === '401k') {
              currentBalances.taxDeferred += amount;
            } else {
              // Default to after-tax for brokerage, ESPP, etc.
              currentBalances.afterTax += amount;
            }
            break;
        }
      });

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


    for (let age = currentAge; age <= (parseFloat(user.ageOfDeath) || 90); age++) {
      const year = currentYear + (age - currentAge);
      const returnRate = calculateReturnRate(age, (parseFloat(user.ageAtRetirement) || 65), (parseFloat(sharedInputs.retirementReturnRate) || 6));
      const isRetired = age >= (parseFloat(user.ageAtRetirement) || 65);

      let contributions = { employee: 0, employer: 0, total: 0 };
      let withdrawal = 0;

      // For current year, calculate contributions first, then show entry
      let currentYearContributions = { employee: 0, employer: 0, total: 0 };
      if (age === currentAge && !isRetired) {
        // Calculate current year contributions for display
        const employerMatchPercent = (parseFloat(user.employerMatch) || 0);
        const employeeContributionForMatchPercent = (parseFloat(user.employeeContributionForMatch) || 0);
        const projectedRemaining = calculateProjectedRemainingContributions(paycheckUser, employerMatchPercent, employeeContributionForMatchPercent);
        
        const employeeContributions = projectedRemaining.traditional401k + projectedRemaining.roth401k + 
                                     projectedRemaining.traditionalIra + projectedRemaining.rothIra + 
                                     projectedRemaining.brokerage;
        const employerContributions = projectedRemaining.employerMatch;
        
        currentYearContributions = {
          employee: employeeContributions,
          employer: employerContributions,
          total: employeeContributions + employerContributions,
          breakdown: {
            traditional401k: projectedRemaining.traditional401k,
            roth401k: projectedRemaining.roth401k,
            traditionalIra: projectedRemaining.traditionalIra,
            rothIra: projectedRemaining.rothIra,
            brokerage: projectedRemaining.brokerage,
            employerMatch: projectedRemaining.employerMatch,
            employerMatchSource: 'projected',
            employerMatchRate: employerMatchPercent,
            salary: salary
          }
        };
      }

      if (age === currentAge) {
        // Show current portfolio balances as starting point
        projections.push({
          year,
          age,
          salary,
          contributions: currentYearContributions,
          withdrawal,
          balances: { ...currentBalances },
          totalBalance: currentBalances.taxFree + currentBalances.taxDeferred + currentBalances.afterTax,
          isRetired,
          returnRate: returnRate * 100
        });
      }

      // Apply returns to existing balances
      balances.taxFree *= (1 + returnRate);
      balances.taxDeferred *= (1 + returnRate);
      balances.afterTax *= (1 + returnRate);

      if (!isRetired) {
        // Update salary with annual increase
        if (age > currentAge) {
          salary *= (1 + (parseFloat(sharedInputs.annualInflation) || 0) / 100 + (parseFloat(user.annualSalaryIncrease) || 0) / 100);
        }

        // Calculate contributions based on updated salary for each year
        const annualTraditional401k = (parseFloat(paycheckUser.retirementOptions?.traditional401kPercent) || 0) * salary / 100;
        const annualRoth401k = (parseFloat(paycheckUser.retirementOptions?.roth401kPercent) || 0) * salary / 100;
        const total401kPercent = (parseFloat(paycheckUser.retirementOptions?.traditional401kPercent) || 0) + (parseFloat(paycheckUser.retirementOptions?.roth401kPercent) || 0);
        const employeeContributionForMatchPercent = (parseFloat(user.employeeContributionForMatch) || 0);
        // Employee must contribute at least the threshold to get any match
        let annualEmployerMatch = 0;
        if (total401kPercent >= employeeContributionForMatchPercent) {
          // Employee meets threshold, so employer provides full match
          annualEmployerMatch = salary * ((parseFloat(user.employerMatch) || 0) / 100);
        }

        // Calculate IRA and brokerage contributions (these don't scale with salary)
        const annualTraditionalIra = (parseFloat(paycheckUser.budgetImpacting?.traditionalIraMonthly) || 0) * 12;
        const annualRothIra = (parseFloat(paycheckUser.budgetImpacting?.rothIraMonthly) || 0) * 12;
        const annualBrokerage = (paycheckUser.budgetImpacting?.brokerageAccounts || []).reduce((sum, account) => 
          sum + (parseFloat(account.monthlyAmount) || 0), 0) * 12;

        // For current year, use projected remaining contributions; for future years, use full annual amounts
        let actualContributions;
        if (age === currentAge) {
          // Use projected remaining contributions for current year
          const employerMatchPercent = (parseFloat(user.employerMatch) || 0);
          const employeeContributionForMatchPercent = (parseFloat(user.employeeContributionForMatch) || 0);
          const projectedRemaining = calculateProjectedRemainingContributions(paycheckUser, employerMatchPercent, employeeContributionForMatchPercent);
          actualContributions = {
            traditional401k: projectedRemaining.traditional401k,
            roth401k: projectedRemaining.roth401k,
            employerMatch: projectedRemaining.employerMatch,
            traditionalIra: projectedRemaining.traditionalIra,
            rothIra: projectedRemaining.rothIra,
            brokerage: projectedRemaining.brokerage
          };
        } else {
          // Use full annual amounts for future years
          actualContributions = {
            traditional401k: annualTraditional401k,
            roth401k: annualRoth401k,
            employerMatch: annualEmployerMatch,
            traditionalIra: annualTraditionalIra,
            rothIra: annualRothIra,
            brokerage: annualBrokerage
          };
        }

        // Check if we have actual employer match data for this year
        const actualEmployerMatch = getActualEmployerMatchForYear(userKey, year);
        
        if (actualEmployerMatch !== null) {
          actualContributions.employerMatch = actualEmployerMatch;
        }

        // Calculate total contributions for this year
        const employeeContributions = actualContributions.traditional401k + actualContributions.roth401k + 
                                     actualContributions.traditionalIra + actualContributions.rothIra + 
                                     actualContributions.brokerage;
        const employerContributions = actualContributions.employerMatch;
        
        contributions = {
          employee: employeeContributions,
          employer: employerContributions,
          total: employeeContributions + employerContributions,
          breakdown: {
            traditional401k: actualContributions.traditional401k,
            roth401k: actualContributions.roth401k,
            traditionalIra: actualContributions.traditionalIra,
            rothIra: actualContributions.rothIra,
            brokerage: actualContributions.brokerage,
            employerMatch: actualContributions.employerMatch,
            employerMatchSource: actualEmployerMatch !== null ? 'actual' : 'calculated',
            employerMatchRate: (parseFloat(user.employerMatch) || 0),
            salary: salary
          }
        };

        balances.taxFree += actualContributions.roth401k + actualContributions.rothIra;
        balances.taxDeferred += actualContributions.traditional401k + actualContributions.employerMatch + actualContributions.traditionalIra;
        balances.afterTax += actualContributions.brokerage;
      } else {
        // Apply retirement raises and withdrawals
        if ((parseFloat(user.raisesInRetirement) || 0) > 0) {
          salary *= (1 + (parseFloat(user.raisesInRetirement) || 0) / 100);
        }

        // Calculate withdrawal (simplified 4% rule or custom rate)
        const totalBalance = balances.taxFree + balances.taxDeferred + balances.afterTax;
        withdrawal = totalBalance * ((parseFloat(sharedInputs.withdrawalRate) || 4) / 100);
        
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

      // For all years after current, add projection after applying changes
      if (age > currentAge) {
        projections.push({
          year,
          age,
          salary,
          contributions,
          withdrawal,
          balances: { ...balances },
          totalBalance: balances.taxFree + balances.taxDeferred + balances.afterTax,
          isRetired,
          returnRate: returnRate * 100
        });
      }
    }

    return projections;
  }, [retirementDataState, paycheckData, currentYear]);

  // Calculate projections for both users
  const user1Projections = useMemo(() => calculateRetirementProjections('user1'), [calculateRetirementProjections]);
  const user2Projections = useMemo(() => 
    isMultiUserMode ? calculateRetirementProjections('user2') : [], 
    [calculateRetirementProjections, isMultiUserMode]
  );

  // Transform projections data for DataManager
  useEffect(() => {
    if (user1Projections.length > 0 || user2Projections.length > 0) {
      // Create userProjections object with dynamic user support
      const userProjections = {
        user1: user1Projections,
        user2: user2Projections
      };
      
      const transformedData = transformProjectionsToDataManagerFormat(
        userProjections, 
        paycheckData, 
        currentYear, 
        getActualEmployerMatchForYear
      );
      setProjectionsData(transformedData);
    } else {
      setProjectionsData({});
    }
  }, [user1Projections, user2Projections, paycheckData, currentYear]);


  // Dual calculator toggle is now handled by the shared hook

  // Dual calculator state is managed by the shared hook

  return (
    <div className="calculator-page">
      <Navigation />
      
      <div className="app-container">
        <div className="header">
          <div className="retirement-header-icon">🏖️</div>
          <h1>Retirement Planner</h1>
          <p>Project your retirement savings and plan for financial independence</p>
        </div>

        {/* Last Update Information */}
        <LastUpdateInfo showDetails={false} compact={true} />

        <div className="calculator-content">
          <div className={`calculator-grid ${isMultiUserMode ? 'dual-view' : 'single-view'}`}>
            {/* Your Calculator */}
            <div className="calculator-section">
              <h2 className="calculator-section-title">
                {paycheckData?.user1?.name || 'user1'} Retirement Plan
              </h2>
              
              <div className="form-section">
                <h3>Retirement Parameters</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Age at Retirement</label>
                    <input
                      type="number"
                      value={retirementDataState.user1?.ageAtRetirement || 65}
                      onChange={(e) => updateUserData('user1', 'ageAtRetirement', e.target.value)}
                      min="50"
                      max="80"
                    />
                  </div>
                  <div className="form-group">
                    <label>Age of Death</label>
                    <input
                      type="number"
                      value={retirementDataState.user1?.ageOfDeath || 90}
                      onChange={(e) => updateUserData('user1', 'ageOfDeath', e.target.value)}
                      min="65"
                      max="110"
                    />
                  </div>
                  <div className="form-group">
                    <label>Annual Salary Increase (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={retirementDataState.user1?.annualSalaryIncrease || 3}
                      onChange={(e) => updateUserData('user1', 'annualSalaryIncrease', e.target.value)}
                      min="0"
                      max="20"
                    />
                  </div>
                  <div className="form-group">
                    <label>Raises in Retirement (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={retirementDataState.user1?.raisesInRetirement || 0}
                      onChange={(e) => updateUserData('user1', 'raisesInRetirement', e.target.value)}
                      min="0"
                      max="10"
                    />
                  </div>
                  <div className="form-group">
                    <label>Employer 401k Match (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={retirementDataState.user1?.employerMatch || 4}
                      onChange={(e) => updateUserData('user1', 'employerMatch', e.target.value)}
                      min="0"
                      max="15"
                    />
                  </div>
                  <div className="form-group">
                    <label>Employee Contribution for Match (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={retirementDataState.user1?.employeeContributionForMatch || 4}
                      onChange={(e) => updateUserData('user1', 'employeeContributionForMatch', e.target.value)}
                      min="0"
                      max="15"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Spouse Calculator */}
            {isMultiUserMode && (
              <div className="calculator-section">
                <h2 className="calculator-section-title">
                  {paycheckData?.user2?.name || 'user2'} Retirement Plan
                </h2>
                
                <div className="form-section">
                  <h3>Retirement Parameters</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Age at Retirement</label>
                      <input
                        type="number"
                        value={retirementDataState.user2?.ageAtRetirement || 65}
                        onChange={(e) => updateUserData('user2', 'ageAtRetirement', e.target.value)}
                        min="50"
                        max="80"
                      />
                    </div>
                    <div className="form-group">
                      <label>Age of Death</label>
                      <input
                        type="number"
                        value={retirementDataState.user2?.ageOfDeath || 90}
                        onChange={(e) => updateUserData('user2', 'ageOfDeath', e.target.value)}
                        min="65"
                        max="110"
                      />
                    </div>
                    <div className="form-group">
                      <label>Annual Salary Increase (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={retirementDataState.user2?.annualSalaryIncrease || 3}
                        onChange={(e) => updateUserData('user2', 'annualSalaryIncrease', e.target.value)}
                        min="0"
                        max="20"
                      />
                    </div>
                    <div className="form-group">
                      <label>Raises in Retirement (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={retirementDataState.user2?.raisesInRetirement || 0}
                        onChange={(e) => updateUserData('user2', 'raisesInRetirement', e.target.value)}
                        min="0"
                        max="10"
                      />
                    </div>
                    <div className="form-group">
                      <label>Employer 401k Match (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={retirementDataState.user2?.employerMatch || 4}
                        onChange={(e) => updateUserData('user2', 'employerMatch', e.target.value)}
                        min="0"
                        max="15"
                      />
                    </div>
                    <div className="form-group">
                      <label>Employee Contribution for Match (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={retirementDataState.user2?.employeeContributionForMatch || 4}
                        onChange={(e) => updateUserData('user2', 'employeeContributionForMatch', e.target.value)}
                        min="0"
                        max="15"
                      />
                    </div>
                  </div>
                </div>

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

          {/* Tab Navigation */}
          <div className="retirement-tabs">
            <div className="tab-buttons">
              <button 
                className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
                onClick={() => setActiveTab('summary')}
              >
                Summary
              </button>
              <button 
                className={`tab-button ${activeTab === 'projections' ? 'active' : ''}`}
                onClick={() => setActiveTab('projections')}
              >
                Year-by-Year Projections
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'summary' && (
            <div className="tab-content">
              <h3>Retirement Summary</h3>
              <div className="summary-cards">
                {user1Projections.length > 0 && (
                  <div className="summary-card">
                    <h4>{paycheckData?.user1?.name || 'user1'} Summary</h4>
                    {(() => {
                      const retirementProjection = user1Projections.find(p => p.age === (retirementDataState.user1?.ageAtRetirement || 65));
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
                )}
                
                {isMultiUserMode && user2Projections.length > 0 && (
                  <div className="summary-card">
                    <h4>{paycheckData?.user2?.name || 'user2'} Summary</h4>
                    {(() => {
                      const retirementProjection = user2Projections.find(p => p.age === (retirementDataState.user2?.ageAtRetirement || 65));
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
                )}
              </div>
            </div>
          )}


          {activeTab === 'projections' && (
            <div className="tab-content">
              {Object.keys(projectionsData).length > 0 ? (
                <>
                  <DataManager
                    title="Retirement Projections"
                    subtitle="Year-by-year retirement savings projections based on your current settings"
                    dataKey="retirementProjections"
                    getData={() => projectionsData}
                    setData={() => {}} // Read-only
                    schema={retirementProjectionsSchema}
                    usePaycheckUsers={true}
                    primaryKey="year"
                    sortField="year"
                    sortOrder="asc"
                    allowAdd={false}
                    allowEdit={false}
                    allowDelete={false}
                    fieldCssClasses={{
                      year: 'data-year-cell',
                      age: 'data-text-cell',
                      salary: 'data-currency-cell',
                      employeeContributions: 'data-currency-cell',
                      employerMatch: 'data-currency-cell',
                      totalContributions: 'data-currency-cell',
                      withdrawal: 'data-currency-cell',
                      taxFree: 'data-currency-cell',
                      taxDeferred: 'data-currency-cell',
                      afterTax: 'data-currency-cell',
                      totalBalance: 'data-currency-cell',
                      returnRate: 'data-percentage-cell'
                    }}
                    customParseCSVRow={() => null} // Disable CSV import
                    customFormatCSVRow={() => []} // Disable CSV export
                    beforeCSVImport={() => false} // Disable CSV import
                    itemsPerPage={10}
                    disableReadOnly={true}
                  />
                  
                  {/* Footnote for current year contributions */}
                  <div style={{marginTop: '16px', fontSize: '0.9em', color: '#666', fontStyle: 'italic'}}>
                    <span>* {currentYear} contributions represent remaining contributions for the year based on current paycheck settings. Past contributions are already reflected in current balances.</span>
                    <br />
                    <span>📊 Employer match data from actual performance tracking (when available)</span>
                  </div>
                </>
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
          )}
        </div>
      </div>
    </div>
  );
};

export default Retirement;