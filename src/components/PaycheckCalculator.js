import React, { useState, useCallback, useContext, useEffect, useRef, useMemo } from 'react';
import { calculateTakeHomePay, getContributionLimits, getPayPeriods } from '../utils/paycheckCalculations';
import PaycheckInputFields from './PaycheckInputFields';
import { PaycheckBudgetContext } from '../context/PaycheckBudgetContext';
import { getPaycheckData, setPaycheckData, syncPaycheckToAnnual } from '../utils/localStorage';
import { useMultiUserCalculator } from '../hooks/useMultiUserCalculator';
import Navigation from './Navigation';

const PaycheckCalculator = () => {
  const { formData: contextFormData, updateFormData, updateBudgetImpacting, addBrokerageAccount, updateBrokerageAccount, removeBrokerageAccount } = useContext(PaycheckBudgetContext);

  // Get tax constants dynamically
  const CONTRIBUTION_LIMITS = getContributionLimits();
  const PAY_PERIODS = getPayPeriods();

  // Remove settings menu state and ref
  
  // Add global section control state
  const [globalSectionControl, setGlobalSectionControl] = useState(null);
  
  // Use multi-user calculator hook
  const { activeUsers } = useMultiUserCalculator();
  const isMultiUserMode = activeUsers.includes('user2');
  
  // Initialize with empty defaults
  const emptyDefaults = {
    user1: {
      name: '',
      employer: '',
      birthday: '',
      salary: '',
      payPeriod: 'biWeekly',
      filingStatus: 'single',
      w4Type: 'new',
      w4Options: {
        allowances: 1,
        qualifyingChildren: 0,
        otherDependents: 0,
        additionalIncome: 0,
        extraWithholding: 0,
        multipleJobs: false
      },
      retirementOptions: {
        traditional401kPercent: 0,
        roth401kPercent: 0,
        isOver50: false
      },
      medicalDeductions: {
        dental: 0,
        medical: 0,
        vision: 0,
        shortTermDisability: 0,
        longTermDisability: 0,
        hsa: 0,
        employerHsa: 0,
        additionalMedicalDeductions: [],
        additionalPostTaxDeductions: []
      },
      esppDeductionPercent: 0,
      budgetImpacting: {
        traditionalIraMonthly: 0,
        rothIraMonthly: 0,
        brokerageAccounts: [],
      },
      bonusMultiplier: 0,
      bonusTarget: 0,
    },
    user2: {
      name: '',
      employer: '',
      birthday: '',
      salary: '',
      payPeriod: 'biWeekly',
      filingStatus: 'single',
      w4Type: 'new',
      w4Options: {
        allowances: 1,
        qualifyingChildren: 0,
        otherDependents: 0,
        additionalIncome: 0,
        extraWithholding: 0,
        multipleJobs: false
      },
      retirementOptions: {
        traditional401kPercent: 0,
        roth401kPercent: 0,
        isOver50: false
      },
      medicalDeductions: {
        dental: 0,
        medical: 0,
        vision: 0,
        shortTermDisability: 0,
        longTermDisability: 0,
        hsa: 0,
        employerHsa: 0,
        additionalMedicalDeductions: [],
        additionalPostTaxDeductions: []
      },
      esppDeductionPercent: 0,
      budgetImpacting: {
        traditionalIraMonthly: 0,
        rothIraMonthly: 0,
        brokerageAccounts: [],
      },
      bonusMultiplier: 0,
      bonusTarget: 0,
    }
  };
  
  // User1 variables - start with empty defaults
  const [name, setName] = useState(emptyDefaults.user1.name);
  const [employer, setEmployer] = useState(emptyDefaults.user1.employer);
  const [birthday, setBirthday] = useState(emptyDefaults.user1.birthday);
  const [salary, setSalary] = useState(emptyDefaults.user1.salary);
  const [payPeriod, setPayPeriod] = useState(emptyDefaults.user1.payPeriod);
  const [filingStatus, setFilingStatus] = useState(emptyDefaults.user1.filingStatus);
  const [w4Type, setW4Type] = useState(emptyDefaults.user1.w4Type);
  const [w4Options, setW4Options] = useState(emptyDefaults.user1.w4Options);
  const [retirementOptions, setRetirementOptions] = useState(emptyDefaults.user1.retirementOptions);
  const [medicalDeductions, setMedicalDeductions] = useState(emptyDefaults.user1.medicalDeductions);
  const [esppDeductionPercent, setEsppDeductionPercent] = useState(emptyDefaults.user1.esppDeductionPercent);
  const [budgetImpacting, setBudgetImpacting] = useState(emptyDefaults.user1.budgetImpacting);
  const [bonusMultiplier, setBonusMultiplier] = useState(emptyDefaults.user1.bonusMultiplier);
  const [bonusTarget, setBonusTarget] = useState(emptyDefaults.user1.bonusTarget);
  const [overrideBonus, setOverrideBonus] = useState('');
  const [remove401kFromBonus, setRemove401kFromBonus] = useState(false);
  const [effectiveBonus, setEffectiveBonus] = useState(0);
  const [results, setResults] = useState(null);
  const [payWeekType, setPayWeekType] = useState('even');

  // User2 variables - start with empty defaults
  const [user2Name, setUser2Name] = useState(emptyDefaults.user2.name);
  const [spouseEmployer, setSpouseEmployer] = useState(emptyDefaults.user2.employer);
  const [spouseBirthday, setSpouseBirthday] = useState(emptyDefaults.user2.birthday);
  const [spouseSalary, setSpouseSalary] = useState(emptyDefaults.user2.salary);
  const [spousePayPeriod, setSpousePayPeriod] = useState(emptyDefaults.user2.payPeriod);
  const [spouseFilingStatus, setSpouseFilingStatus] = useState(emptyDefaults.user2.filingStatus);
  const [spouseW4Type, setSpouseW4Type] = useState(emptyDefaults.user2.w4Type);
  const [spouseW4Options, setSpouseW4Options] = useState(emptyDefaults.user2.w4Options);
  const [spouseRetirementOptions, setSpouseRetirementOptions] = useState(emptyDefaults.user2.retirementOptions);
  const [spouseMedicalDeductions, setSpouseMedicalDeductions] = useState(emptyDefaults.user2.medicalDeductions);
  const [spouseEsppDeductionPercent, setSpouseEsppDeductionPercent] = useState(emptyDefaults.user2.esppDeductionPercent);
  const [spouseBudgetImpacting, setSpouseBudgetImpacting] = useState(emptyDefaults.user2.budgetImpacting);
  const [spouseBonusMultiplier, setSpouseBonusMultiplier] = useState(emptyDefaults.user2.bonusMultiplier);
  const [spouseBonusTarget, setSpouseBonusTarget] = useState(emptyDefaults.user2.bonusTarget);
  const [spouseOverrideBonus, setSpouseOverrideBonus] = useState('');
  const [spouseRemove401kFromBonus, setSpouseRemove401kFromBonus] = useState(false);
  const [spouseEffectiveBonus, setSpouseEffectiveBonus] = useState(0);
  const [spouseResults, setSpouseResults] = useState(null);
  const [spousePayWeekType, setSpousePayWeekType] = useState('even');

  // Add HSA coverage state for both calculators
  const [hsaCoverageType, setHsaCoverageType] = useState('self');
  const [spouseHsaCoverageType, setSpouseHsaCoverageType] = useState('self');

  // Add ref to prevent saving during initial load
  const isInitialLoadRef = useRef(true);
  const hasLoadedDataRef = useRef(false); // Add flag to prevent repeated loads

  const [formData, setFormData] = useState({}); // Keep empty initially

  // YTD Income tracking state (contributions now come from Account data)
  const [incomePeriodsData, setIncomePeriodsData] = useState([]);
  const [spouseIncomePeriodsData, setSpouseIncomePeriodsData] = useState([]);

  // Handle HSA coverage changes with synchronization
  const handleHsaCoverageChange = (type, isSpouse = false) => {
    if (isSpouse) {
      setSpouseHsaCoverageType(type);
      if (type === 'family') {
        setHsaCoverageType('none');
        setMedicalDeductions(prev => ({
          ...prev,
          hsa: 0,
          employerHsa: 0
        }));
      }
    } else {
      setHsaCoverageType(type);
      if (type === 'family') {
        setSpouseHsaCoverageType('none');
        setSpouseMedicalDeductions(prev => ({
          ...prev,
          hsa: 0,
          employerHsa: 0
        }));
      }
    }
  };

  // Add global section control functions
  const expandAllSectionsGlobal = () => {
    setGlobalSectionControl('expand');
    setTimeout(() => setGlobalSectionControl(null), 100);
  };

  const collapseAllSectionsGlobal = () => {
    setGlobalSectionControl('collapse');
    setTimeout(() => setGlobalSectionControl(null), 100);
  };

  const handleCalculate = useCallback(() => {
    const annualSalary = parseFloat(salary);
    
    if (isNaN(annualSalary) || annualSalary <= 0) {
      return;
    }

    const grossPayPerPaycheck = annualSalary / PAY_PERIODS[payPeriod].periodsPerYear;

    const totalPercent = retirementOptions.traditional401kPercent + retirementOptions.roth401kPercent;
    
    if (totalPercent > 100) {
      return;
    }

    const traditional401kAmount = annualSalary * (retirementOptions.traditional401kPercent / 100);
    const roth401kAmount = annualSalary * (retirementOptions.roth401kPercent / 100);
    const maxContribution = retirementOptions.isOver50 
      ? CONTRIBUTION_LIMITS.k401_employee + CONTRIBUTION_LIMITS.k401_catchUp
      : CONTRIBUTION_LIMITS.k401_employee;
    
    if (traditional401kAmount + roth401kAmount > maxContribution) {
      // Optional: Could show a warning indicator in the UI instead of blocking calculation
    }

    const calculation = calculateTakeHomePay(
      grossPayPerPaycheck,
      payPeriod,
      filingStatus,
      w4Type,
      w4Options,
      retirementOptions,
      medicalDeductions,
      esppDeductionPercent,
      hsaCoverageType
    );
    setResults(calculation);

    updateBudgetImpacting('user1', budgetImpacting);

    // Calculate combined monthly as 2 paychecks instead of annual ÷ 12
    const combinedMonthlyTakeHome = isMultiUserMode && spouseResults
      ? ((calculation?.netTakeHomePaycheck || 0) + (spouseResults?.netTakeHomePaycheck || 0)) * 2
      : (calculation?.netTakeHomePaycheck || 0) * 2;
    const combinedTakeHomePerPayPeriod = isMultiUserMode && spouseResults
      ? (calculation?.netTakeHomePaycheck || 0) + (spouseResults?.netTakeHomePaycheck || 0)
      : calculation?.netTakeHomePaycheck || 0;
    
    updateFormData('combinedMonthlyTakeHome', combinedMonthlyTakeHome);
    updateFormData('combinedTakeHomePerPayPeriod', combinedTakeHomePerPayPeriod);
  }, [
    salary,
    payPeriod,
    filingStatus,
    w4Type,
    w4Options,
    retirementOptions,
    medicalDeductions,
    esppDeductionPercent,
    isMultiUserMode,
    spouseResults,
    updateFormData,
    updateBudgetImpacting,
    bonusMultiplier,
    budgetImpacting,
    spouseBudgetImpacting,
    hsaCoverageType
  ]);

  const handleSpouseCalculate = useCallback(() => {
    const annualSalary = parseFloat(spouseSalary);
    
    if (isNaN(annualSalary) || annualSalary <= 0) {
      return;
    }

    const grossPayPerPaycheck = annualSalary / PAY_PERIODS[spousePayPeriod].periodsPerYear;

    const totalPercent = spouseRetirementOptions.traditional401kPercent + spouseRetirementOptions.roth401kPercent;
    
    if (totalPercent > 100) {
      return;
    }

    const traditional401kAmount = annualSalary * (spouseRetirementOptions.traditional401kPercent / 100);
    const roth401kAmount = annualSalary * (spouseRetirementOptions.roth401kPercent / 100);
    const maxContribution = spouseRetirementOptions.isOver50 
      ? CONTRIBUTION_LIMITS.k401_employee + CONTRIBUTION_LIMITS.k401_catchUp
      : CONTRIBUTION_LIMITS.k401_employee;
    
    if (traditional401kAmount + roth401kAmount > maxContribution) {
      // Optional: Could show a warning indicator in the UI instead of blocking calculation
    }

    const calculation = calculateTakeHomePay(grossPayPerPaycheck, spousePayPeriod, spouseFilingStatus, spouseW4Type, spouseW4Options, spouseRetirementOptions, spouseMedicalDeductions, spouseEsppDeductionPercent, spouseHsaCoverageType);
    setSpouseResults(calculation);

    updateBudgetImpacting('user2', spouseBudgetImpacting);

    if (results) {
      // Calculate combined monthly as 2 paychecks instead of annual ÷ 12
      const combinedMonthlyTakeHome = ((results?.netTakeHomePaycheck || 0) + (calculation?.netTakeHomePaycheck || 0)) * 2;
      const combinedTakeHomePerPayPeriod = (results?.netTakeHomePaycheck || 0) + (calculation?.netTakeHomePaycheck || 0);
      
      updateFormData('combinedMonthlyTakeHome', combinedMonthlyTakeHome);
      updateFormData('combinedTakeHomePerPayPeriod', combinedTakeHomePerPayPeriod);
    }
  }, [spouseSalary, spousePayPeriod, spouseFilingStatus, spouseW4Type, spouseW4Options, spouseRetirementOptions, spouseMedicalDeductions, spouseEsppDeductionPercent, spouseBonusMultiplier, results, updateFormData, updateBudgetImpacting, budgetImpacting, spouseBudgetImpacting, spouseHsaCoverageType]);

  // Load saved paycheck data on mount and on import
  useEffect(() => {
    // Only load once unless there's a specific data update event
    if (hasLoadedDataRef.current) {
      return;
    }

    const loadPaycheckData = () => {
      const savedData = getPaycheckData();
      
      if (savedData && Object.keys(savedData).length > 0) {
        // Load user1 data
        if (savedData.user1) {
          setName(savedData.user1.name || '');
          setEmployer(savedData.user1.employer || '');
          setBirthday(savedData.user1.birthday || '');
          setSalary(savedData.user1.salary || '');
          setPayPeriod(savedData.user1.payPeriod || 'biWeekly');
          setFilingStatus(savedData.user1.filingStatus || 'single');
          setW4Type(savedData.user1.w4Type || 'new');
          setW4Options(savedData.user1.w4Options || emptyDefaults.user1.w4Options);
          setRetirementOptions(savedData.user1.retirementOptions || emptyDefaults.user1.retirementOptions);
          setMedicalDeductions(savedData.user1.medicalDeductions || emptyDefaults.user1.medicalDeductions);
          setEsppDeductionPercent(savedData.user1.esppDeductionPercent || 0);
          setBudgetImpacting(savedData.user1.budgetImpacting || emptyDefaults.user1.budgetImpacting);
          setBonusMultiplier(savedData.user1.bonusMultiplier || 0);
          setBonusTarget(savedData.user1.bonusTarget || 0);
          setOverrideBonus(savedData.user1.overrideBonus || '');
          setRemove401kFromBonus(savedData.user1.remove401kFromBonus || false);
          setEffectiveBonus(savedData.user1.effectiveBonus || 0);
          setHsaCoverageType(savedData.user1.hsaCoverageType || 'self');
          setPayWeekType(savedData.user1.payWeekType || 'even');
          setIncomePeriodsData(savedData.user1.incomePeriodsData || []);
        }
        
        // Load user2 data
        if (savedData.user2) {
          setUser2Name(savedData.user2.name || '');
          setSpouseEmployer(savedData.user2.employer || '');
          setSpouseBirthday(savedData.user2.birthday || '');
          setSpouseSalary(savedData.user2.salary || '');
          setSpousePayPeriod(savedData.user2.payPeriod || 'biWeekly');
          setSpouseFilingStatus(savedData.user2.filingStatus || 'single');
          setSpouseW4Type(savedData.user2.w4Type || 'new');
          setSpouseW4Options(savedData.user2.w4Options || emptyDefaults.user2.w4Options);
          setSpouseRetirementOptions(savedData.user2.retirementOptions || emptyDefaults.user2.retirementOptions);
          setSpouseMedicalDeductions(savedData.user2.medicalDeductions || emptyDefaults.user2.medicalDeductions);
          setSpouseEsppDeductionPercent(savedData.user2.esppDeductionPercent || 0);
          setSpouseBudgetImpacting(savedData.user2.budgetImpacting || emptyDefaults.user2.budgetImpacting);
          setSpouseBonusMultiplier(savedData.user2.bonusMultiplier || 0);
          setSpouseBonusTarget(savedData.user2.bonusTarget || 0);
          setSpouseOverrideBonus(savedData.user2.overrideBonus || '');
          setSpouseRemove401kFromBonus(savedData.user2.remove401kFromBonus || false);
          setSpouseEffectiveBonus(savedData.user2.effectiveBonus || 0);
          setSpouseHsaCoverageType(savedData.user2.hsaCoverageType || 'self');
          setSpousePayWeekType(savedData.user2.payWeekType || 'even');
          setSpouseIncomePeriodsData(savedData.user2.incomePeriodsData || []);
        }
        
        // Settings are now managed by the multi-user calculator hook
      }
      
      hasLoadedDataRef.current = true; // Mark as loaded
    };

    // Load initially
    loadPaycheckData();

    // Listen for paycheck data updates (for demo/imported data)
    const handlePaycheckDataUpdate = (event) => {
      hasLoadedDataRef.current = false; // Reset flag to allow reload
      setTimeout(() => {
        loadPaycheckData();
      }, 50);
    };

    window.addEventListener('paycheckDataUpdated', handlePaycheckDataUpdate);

    return () => {
      window.removeEventListener('paycheckDataUpdated', handlePaycheckDataUpdate);
    };
  }, []); // REMOVE ALL DEPENDENCIES to prevent re-running

  // Remove the auto-calculation useEffect that's causing the infinite loop
  // The calculations are already handled by explicit calls in the individual calculation functions

  // Save paycheck data whenever state changes - Enhanced name change handling
  useEffect(() => {
    // Don't save during initial load to prevent triggering events prematurely
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    // Name changes are no longer supported - data uses normalized user1/user2 keys

    const dataToSave = {
      user1: {
        name, employer, birthday, salary, payPeriod, filingStatus, w4Type, w4Options,
        retirementOptions, medicalDeductions, esppDeductionPercent, budgetImpacting,
        bonusMultiplier, bonusTarget, overrideBonus, remove401kFromBonus, effectiveBonus, hsaCoverageType, payWeekType,
        netTakeHomePaycheck: results?.netTakeHomePaycheck || 0,
        incomePeriodsData
      },
      user2: {
        name: user2Name, employer: spouseEmployer, birthday: spouseBirthday, 
        salary: spouseSalary, payPeriod: spousePayPeriod, filingStatus: spouseFilingStatus,
        w4Type: spouseW4Type, w4Options: spouseW4Options, retirementOptions: spouseRetirementOptions,
        medicalDeductions: spouseMedicalDeductions, esppDeductionPercent: spouseEsppDeductionPercent,
        budgetImpacting: spouseBudgetImpacting, bonusMultiplier: spouseBonusMultiplier,
        bonusTarget: spouseBonusTarget, overrideBonus: spouseOverrideBonus, remove401kFromBonus: spouseRemove401kFromBonus, effectiveBonus: spouseEffectiveBonus, hsaCoverageType: spouseHsaCoverageType, payWeekType: spousePayWeekType,
        netTakeHomePaycheck: spouseResults?.netTakeHomePaycheck || 0,
        incomePeriodsData: spouseIncomePeriodsData
      },
      settings: {
        isMultiUserMode
      }
    };
    
    setPaycheckData(dataToSave);
    
    // Auto-sync salary, employer, and bonus to historical data
    syncPaycheckToAnnual();
    
    // Dispatch event to notify other components with delay to ensure save is complete
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('paycheckDataUpdated', { detail: dataToSave }));
    }, 100);
  }, [
    name, employer, birthday, salary, payPeriod, filingStatus, w4Type, w4Options,
    retirementOptions, medicalDeductions, esppDeductionPercent, budgetImpacting,
    bonusMultiplier, bonusTarget, overrideBonus, remove401kFromBonus, effectiveBonus, hsaCoverageType, isMultiUserMode, payWeekType,
    user2Name, spouseEmployer, spouseBirthday, spouseSalary, spousePayPeriod,
    spouseFilingStatus, spouseW4Type, spouseW4Options, spouseRetirementOptions,
    spouseMedicalDeductions, spouseEsppDeductionPercent, spouseBudgetImpacting,
    spouseBonusMultiplier, spouseBonusTarget, spouseOverrideBonus, spouseRemove401kFromBonus, spouseEffectiveBonus, spouseHsaCoverageType, spousePayWeekType,
    incomePeriodsData, spouseIncomePeriodsData
    // REMOVED results and spouseResults from dependencies to prevent infinite loop
  ]);

  // ...existing code...

  // Add global event listeners
  useEffect(() => {

    const handleResetAll = () => {
      // Reset to empty defaults and clear localStorage
      try {
        // Clear paycheck data from localStorage
        setPaycheckData({});
        
        // Reset all state variables to empty defaults
        Object.entries(emptyDefaults.user1).forEach(([key, value]) => {
          switch(key) {
            case 'name': setName(value); break;
            case 'employer': setEmployer(value); break;
            case 'birthday': setBirthday(value); break;
            case 'salary': setSalary(value); break;
            case 'payPeriod': setPayPeriod(value); break;
            case 'filingStatus': setFilingStatus(value); break;
            case 'w4Type': setW4Type(value); break;
            case 'w4Options': setW4Options(value); break;
            case 'retirementOptions': setRetirementOptions(value); break;
            case 'medicalDeductions': setMedicalDeductions(value); break;
            case 'esppDeductionPercent': setEsppDeductionPercent(value); break;
            case 'budgetImpacting': setBudgetImpacting(value); break;
            case 'bonusMultiplier': setBonusMultiplier(value); break;
            case 'bonusTarget': setBonusTarget(value); break;
            case 'overrideBonus': setOverrideBonus(value); break;
            case 'remove401kFromBonus': setRemove401kFromBonus(value); break;
          }
        });
        
        Object.entries(emptyDefaults.user2).forEach(([key, value]) => {
          switch(key) {
            case 'name': setUser2Name(value); break;
            case 'employer': setSpouseEmployer(value); break;
            case 'birthday': setSpouseBirthday(value); break;
            case 'salary': setSpouseSalary(value); break;
            case 'payPeriod': setSpousePayPeriod(value); break;
            case 'filingStatus': setSpouseFilingStatus(value); break;
            case 'w4Type': setSpouseW4Type(value); break;
            case 'w4Options': setSpouseW4Options(value); break;
            case 'retirementOptions': setSpouseRetirementOptions(value); break;
            case 'medicalDeductions': setSpouseMedicalDeductions(value); break;
            case 'esppDeductionPercent': setSpouseEsppDeductionPercent(value); break;
            case 'budgetImpacting': setSpouseBudgetImpacting(value); break;
            case 'bonusMultiplier': setSpouseBonusMultiplier(value); break;
            case 'bonusTarget': setSpouseBonusTarget(value); break;
            case 'overrideBonus': setSpouseOverrideBonus(value); break;
            case 'remove401kFromBonus': setSpouseRemove401kFromBonus(value); break;
          }
        });
        
        setHsaCoverageType('self');
        setSpouseHsaCoverageType('self');
        setResults(null);
        setSpouseResults(null);
        // Multi-user mode is now managed by the hook
        
      } catch (error) {
        console.error('Error resetting paycheck calculator data:', error);
      }
    };

    window.addEventListener('resetAllData', handleResetAll);

    return () => {
      window.removeEventListener('resetAllData', handleResetAll);
    };
  }, [emptyDefaults, setPaycheckData]);

  // Remove click outside handler for settings menu

  // Add effect to update context when isMultiUserMode changes
  useEffect(() => {
    updateFormData('isMultiUserMode', isMultiUserMode);

    if (!isMultiUserMode && results) {
      // Calculate as 2 paychecks instead of annual ÷ 12
      const yourMonthlyTakeHome = (results?.netTakeHomePaycheck || 0) * 2;
      
      updateFormData('combinedMonthlyTakeHome', yourMonthlyTakeHome);
      updateFormData('combinedTakeHomePerPayPeriod', results?.netTakeHomePaycheck || 0);
    } else if (isMultiUserMode && results && spouseResults) {
      // Calculate as 2 paychecks instead of annual ÷ 12
      const yourMonthlyTakeHome = (results?.netTakeHomePaycheck || 0) * 2;
      const spouseMonthlyTakeHome = (spouseResults.netTakeHomePaycheck * 2);

      const combinedMonthlyTakeHome = yourMonthlyTakeHome + spouseMonthlyTakeHome;
      const combinedTakeHomePerPayPeriod = (results?.netTakeHomePaycheck || 0) + (spouseResults?.netTakeHomePaycheck || 0);
      
      updateFormData('combinedMonthlyTakeHome', combinedMonthlyTakeHome);
      updateFormData('combinedTakeHomePerPayPeriod', combinedTakeHomePerPayPeriod);
    }
  }, [isMultiUserMode, updateFormData]);

  // Simple one-way sync: update context when local state changes
  useEffect(() => {
    updateBudgetImpacting('user1', budgetImpacting);
  }, [budgetImpacting, updateBudgetImpacting]);

  useEffect(() => {
    updateBudgetImpacting('user2', spouseBudgetImpacting);
  }, [spouseBudgetImpacting, updateBudgetImpacting]);

  // Add reset function for settings menu
  const resetAllData = () => {
    if (window.confirm('Are you sure you want to reset all calculator data? This cannot be undone.')) {
      // Reset to empty defaults
      Object.entries(emptyDefaults.user1).forEach(([key, value]) => {
        switch(key) {
          case 'name': setName(value); break;
          case 'employer': setEmployer(value); break;
          case 'birthday': setBirthday(value); break;
          case 'salary': setSalary(value); break;
          case 'payPeriod': setPayPeriod(value); break;
          case 'filingStatus': setFilingStatus(value); break;
          case 'w4Type': setW4Type(value); break;
          case 'w4Options': setW4Options(value); break;
          case 'retirementOptions': setRetirementOptions(value); break;
          case 'medicalDeductions': setMedicalDeductions(value); break;
          case 'esppDeductionPercent': setEsppDeductionPercent(value); break;
          case 'budgetImpacting': setBudgetImpacting(value); break;
          case 'bonusMultiplier': setBonusMultiplier(value); break;
          case 'bonusTarget': setBonusTarget(value); break;
          case 'overrideBonus': setOverrideBonus(value); break;
          case 'remove401kFromBonus': setRemove401kFromBonus(value); break;
        }
      });
      
      Object.entries(emptyDefaults.spouse).forEach(([key, value]) => {
        switch(key) {
          case 'name': setUser2Name(value); break;
          case 'employer': setSpouseEmployer(value); break;
          case 'birthday': setSpouseBirthday(value); break;
          case 'salary': setSpouseSalary(value); break;
          case 'payPeriod': setSpousePayPeriod(value); break;
          case 'filingStatus': setSpouseFilingStatus(value); break;
          case 'w4Type': setSpouseW4Type(value); break;
          case 'w4Options': setSpouseW4Options(value); break;
          case 'retirementOptions': setSpouseRetirementOptions(value); break;
          case 'medicalDeductions': setSpouseMedicalDeductions(value); break;
          case 'esppDeductionPercent': setSpouseEsppDeductionPercent(value); break;
          case 'budgetImpacting': setSpouseBudgetImpacting(value); break;
          case 'bonusMultiplier': setSpouseBonusMultiplier(value); break;
          case 'bonusTarget': setSpouseBonusTarget(value); break;
          case 'overrideBonus': setSpouseOverrideBonus(value); break;
          case 'remove401kFromBonus': setSpouseRemove401kFromBonus(value); break;
        }
      });
      
      setHsaCoverageType('self');
      setSpouseHsaCoverageType('self');
      setResults(null);
      setSpouseResults(null);
    }
  };

  // Add enhanced demo data loading function for settings menu
  const loadDemoDataWithExport = async () => {
    try {
      const { importDemoData } = await import('../utils/localStorage');
      const result = await importDemoData();
      
      if (result.success) {
        if (window.confirm('Demo data loaded successfully! The page will refresh to show the demo data. You can explore all features with realistic financial data.')) {
          window.location.reload();
        }
      } else {
        alert(`Failed to load demo data: ${result.message}`);
      }
    } catch (error) {
      console.error('Error loading demo data:', error);
      alert('Failed to load demo data. Please try again.');
    }
  };

  // Event listeners for navigation controls
  useEffect(() => {
    const handleExpandAll = () => {
      expandAllSectionsGlobal();
      // Notify navigation of state change
      window.dispatchEvent(new CustomEvent('updateNavigationExpandState', { 
        detail: { page: 'paycheck', expanded: true } 
      }));
    };
    const handleCollapseAll = () => {
      collapseAllSectionsGlobal();
      // Notify navigation of state change
      window.dispatchEvent(new CustomEvent('updateNavigationExpandState', { 
        detail: { page: 'paycheck', expanded: false } 
      }));
    };
    // Toggle dual calculator is now handled by the multi-user calculator hook

    window.addEventListener('expandAllSections', handleExpandAll);
    window.addEventListener('collapseAllSections', handleCollapseAll);

    return () => {
      window.removeEventListener('expandAllSections', handleExpandAll);
      window.removeEventListener('collapseAllSections', handleCollapseAll);
    };
  }, []);

  return (
    <>
      <Navigation />
      <div className="app-container">
        <div className="header">
          <h1>💼 {isMultiUserMode ? 'Household Paycheck Calculator' : 'Paycheck Calculator'}</h1>
          <p>Calculate Your Net Pay With Precision And Plan Your Financial Future</p>
          
        </div>

        <div className="calculators-grid">
          <PaycheckInputFields 
            personName="Your"
            name={name}
            setName={setName}
            employer={employer}
            setEmployer={setEmployer}
            birthday={birthday}
            setBirthday={setBirthday}
            salary={salary}
            setSalary={setSalary}
            payPeriod={payPeriod}
            setPayPeriod={setPayPeriod}
            filingStatus={filingStatus}
            setFilingStatus={setFilingStatus}
            w4Type={w4Type}
            setW4Type={setW4Type}
            w4Options={w4Options}
            setW4Options={setW4Options}
            retirementOptions={retirementOptions}
            setRetirementOptions={setRetirementOptions}
            medicalDeductions={medicalDeductions}
            setMedicalDeductions={setMedicalDeductions}
            esppDeductionPercent={esppDeductionPercent}
            setEsppDeductionPercent={setEsppDeductionPercent}
            budgetImpacting={budgetImpacting}
            setBudgetImpacting={setBudgetImpacting}
            onAddBrokerageAccount={(person) => {
              addBrokerageAccount('your');
              // Update local state immediately
              setBudgetImpacting(prev => ({
                ...prev,
                brokerageAccounts: [
                  ...(prev.brokerageAccounts || []),
                  {
                    id: Date.now() + Math.random(),
                    name: 'New Brokerage Account',
                    monthlyAmount: 0
                  }
                ]
              }));
            }}
            onUpdateBrokerageAccount={(person, accountId, field, value) => {
              updateBrokerageAccount('your', accountId, field, value);
              // Update local state immediately
              setBudgetImpacting(prev => ({
                ...prev,
                brokerageAccounts: (prev.brokerageAccounts || []).map(account =>
                  account.id === accountId ? { ...account, [field]: value } : account
                )
              }));
            }}
            onRemoveBrokerageAccount={(person, accountId) => {
              removeBrokerageAccount('your', accountId);
              // Update local state immediately
              setBudgetImpacting(prev => ({
                ...prev,
                brokerageAccounts: (prev.brokerageAccounts || []).filter(account => account.id !== accountId)
              }));
            }}
            onAddMedicalDeduction={(person) => {
              // Update local state immediately
              setMedicalDeductions(prev => ({
                ...prev,
                additionalMedicalDeductions: [
                  ...(prev.additionalMedicalDeductions || []),
                  {
                    id: Date.now() + Math.random(),
                    name: 'New Medical Deduction',
                    amount: 0
                  }
                ]
              }));
            }}
            onUpdateMedicalDeduction={(person, deductionId, field, value) => {
              // Update local state immediately
              setMedicalDeductions(prev => ({
                ...prev,
                additionalMedicalDeductions: (prev.additionalMedicalDeductions || []).map(deduction =>
                  deduction.id === deductionId ? { ...deduction, [field]: value } : deduction
                )
              }));
            }}
            onRemoveMedicalDeduction={(person, deductionId) => {
              // Update local state immediately
              setMedicalDeductions(prev => ({
                ...prev,
                additionalMedicalDeductions: (prev.additionalMedicalDeductions || []).filter(deduction => deduction.id !== deductionId)
              }));
            }}
            onAddPostTaxDeduction={(person) => {
              // Update local state immediately
              setMedicalDeductions(prev => ({
                ...prev,
                additionalPostTaxDeductions: [
                  ...(prev.additionalPostTaxDeductions || []),
                  {
                    id: Date.now() + Math.random(),
                    name: 'New Post-Tax Deduction',
                    amount: 0
                  }
                ]
              }));
            }}
            onUpdatePostTaxDeduction={(person, deductionId, field, value) => {
              // Update local state immediately
              setMedicalDeductions(prev => ({
                ...prev,
                additionalPostTaxDeductions: (prev.additionalPostTaxDeductions || []).map(deduction =>
                  deduction.id === deductionId ? { ...deduction, [field]: value } : deduction
                )
              }));
            }}
            onRemovePostTaxDeduction={(person, deductionId) => {
              // Update local state immediately
              setMedicalDeductions(prev => ({
                ...prev,
                additionalPostTaxDeductions: (prev.additionalPostTaxDeductions || []).filter(deduction => deduction.id !== deductionId)
              }));
            }}
            bonusMultiplier={bonusMultiplier}
            setBonusMultiplier={setBonusMultiplier}
            bonusTarget={bonusTarget}
            setBonusTarget={setBonusTarget}
            effectiveBonus={effectiveBonus}
            overrideBonus={overrideBonus}
            setOverrideBonus={setOverrideBonus}
            remove401kFromBonus={remove401kFromBonus}
            setRemove401kFromBonus={setRemove401kFromBonus}
            setEffectiveBonus={setEffectiveBonus}
            payWeekType={payWeekType}
            setPayWeekType={setPayWeekType}
            hsaCoverageType={hsaCoverageType}
            setHsaCoverageType={(type) => handleHsaCoverageChange(type, false)}
            globalSectionControl={globalSectionControl}
            onCalculate={handleCalculate}
            results={results}
            incomePeriodsData={incomePeriodsData}
            onUpdateIncomePeriods={setIncomePeriodsData}
          />
          
          {isMultiUserMode && (
            <PaycheckInputFields 
              personName="Spouse"
              name={user2Name}
              setName={setUser2Name}
              employer={spouseEmployer}
              setEmployer={setSpouseEmployer}
              birthday={spouseBirthday}
              setBirthday={setSpouseBirthday}
              salary={spouseSalary}
              setSalary={setSpouseSalary}
              payPeriod={spousePayPeriod}
              setPayPeriod={setSpousePayPeriod}
              filingStatus={spouseFilingStatus}
              setFilingStatus={setSpouseFilingStatus}
              w4Type={spouseW4Type}
              setW4Type={setSpouseW4Type}
              w4Options={spouseW4Options}
              setW4Options={setSpouseW4Options}
              retirementOptions={spouseRetirementOptions}
              setRetirementOptions={setSpouseRetirementOptions}
              medicalDeductions={spouseMedicalDeductions}
              setMedicalDeductions={setSpouseMedicalDeductions}
              esppDeductionPercent={spouseEsppDeductionPercent}
              setEsppDeductionPercent={setSpouseEsppDeductionPercent}
              budgetImpacting={spouseBudgetImpacting}
              setBudgetImpacting={setSpouseBudgetImpacting}
              onAddBrokerageAccount={(person) => {
                addBrokerageAccount('spouse');
                // Update local state immediately
                setSpouseBudgetImpacting(prev => ({
                  ...prev,
                  brokerageAccounts: [
                    ...(prev.brokerageAccounts || []),
                    {
                      id: Date.now() + Math.random(),
                      name: 'New Brokerage Account',
                      monthlyAmount: 0
                    }
                  ]
                }));
              }}
              onUpdateBrokerageAccount={(person, accountId, field, value) => {
                updateBrokerageAccount('spouse', accountId, field, value);
                // Update local state immediately
                setSpouseBudgetImpacting(prev => ({
                  ...prev,
                  brokerageAccounts: (prev.brokerageAccounts || []).map(account =>
                    account.id === accountId ? { ...account, [field]: value } : account
                  )
                }));
              }}
              onRemoveBrokerageAccount={(person, accountId) => {
                removeBrokerageAccount('spouse', accountId);
                // Update local state immediately
                setSpouseBudgetImpacting(prev => ({
                  ...prev,
                  brokerageAccounts: (prev.brokerageAccounts || []).filter(account => account.id !== accountId)
                }));
              }}
              onAddMedicalDeduction={(person) => {
                // Update local state immediately
                setSpouseMedicalDeductions(prev => ({
                  ...prev,
                  additionalMedicalDeductions: [
                    ...(prev.additionalMedicalDeductions || []),
                    {
                      id: Date.now() + Math.random(),
                      name: 'New Medical Deduction',
                      amount: 0
                    }
                  ]
                }));
              }}
              onUpdateMedicalDeduction={(person, deductionId, field, value) => {
                // Update local state immediately
                setSpouseMedicalDeductions(prev => ({
                  ...prev,
                  additionalMedicalDeductions: (prev.additionalMedicalDeductions || []).map(deduction =>
                    deduction.id === deductionId ? { ...deduction, [field]: value } : deduction
                  )
                }));
              }}
              onRemoveMedicalDeduction={(person, deductionId) => {
                // Update local state immediately  
                setSpouseMedicalDeductions(prev => ({
                  ...prev,
                  additionalMedicalDeductions: (prev.additionalMedicalDeductions || []).filter(deduction => deduction.id !== deductionId)
                }));
              }}
              onAddPostTaxDeduction={(person) => {
                // Update local state immediately
                setSpouseMedicalDeductions(prev => ({
                  ...prev,
                  additionalPostTaxDeductions: [
                    ...(prev.additionalPostTaxDeductions || []),
                    {
                      id: Date.now() + Math.random(),
                      name: 'New Post-Tax Deduction',
                      amount: 0
                    }
                  ]
                }));
              }}
              onUpdatePostTaxDeduction={(person, deductionId, field, value) => {
                // Update local state immediately
                setSpouseMedicalDeductions(prev => ({
                  ...prev,
                  additionalPostTaxDeductions: (prev.additionalPostTaxDeductions || []).map(deduction =>
                    deduction.id === deductionId ? { ...deduction, [field]: value } : deduction
                  )
                }));
              }}
              onRemovePostTaxDeduction={(person, deductionId) => {
                // Update local state immediately
                setSpouseMedicalDeductions(prev => ({
                  ...prev,
                  additionalPostTaxDeductions: (prev.additionalPostTaxDeductions || []).filter(deduction => deduction.id !== deductionId)
                }));
              }}
              bonusMultiplier={spouseBonusMultiplier}
              setBonusMultiplier={setSpouseBonusMultiplier}
              bonusTarget={spouseBonusTarget}
              setBonusTarget={setSpouseBonusTarget}
              effectiveBonus={spouseEffectiveBonus}
              overrideBonus={spouseOverrideBonus}
              setOverrideBonus={setSpouseOverrideBonus}
              remove401kFromBonus={spouseRemove401kFromBonus}
              setRemove401kFromBonus={setSpouseRemove401kFromBonus}
              setEffectiveBonus={setSpouseEffectiveBonus}
              payWeekType={spousePayWeekType}
              setPayWeekType={setSpousePayWeekType}
              hsaCoverageType={spouseHsaCoverageType}
              setHsaCoverageType={(type) => handleHsaCoverageChange(type, true)}
              globalSectionControl={globalSectionControl}
              onCalculate={handleSpouseCalculate}
              results={spouseResults}
              incomePeriodsData={spouseIncomePeriodsData}
              onUpdateIncomePeriods={setSpouseIncomePeriodsData}
            />
          )}
        </div>

      </div>
    </>
  );
};

export default PaycheckCalculator;