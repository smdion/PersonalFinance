import React, { useState, useCallback, useContext, useEffect, useRef, useMemo } from 'react';
import { calculateTakeHomePay, getContributionLimits, getPayPeriods } from '../utils/paycheckCalculations';
import PaycheckInputFields from './PaycheckInputFields';
import { PaycheckBudgetContext } from '../context/PaycheckBudgetContext';
import { getPaycheckData, setPaycheckData, getUsers, getAnnualData, syncPaycheckToAnnual, resolveUserDisplayName } from '../utils/localStorage';
import { useMultiUserCalculator } from '../hooks/useMultiUserCalculator';
import Navigation from './Navigation';

const PaycheckCalculator = () => {
  const { formData: contextFormData, updateFormData, updateBudgetImpacting, addBrokerageAccount, updateBrokerageAccount, removeBrokerageAccount, getUsers, isMultiUserMode } = useContext(PaycheckBudgetContext);

  // Get tax constants dynamically
  const CONTRIBUTION_LIMITS = getContributionLimits();
  const PAY_PERIODS = getPayPeriods();

  // Remove settings menu state and ref
  
  // Add global section control state
  const [globalSectionControl, setGlobalSectionControl] = useState(null);
  
  // Use multi-user calculator hook
  const { activeUsers, getUsers: hookGetUsers } = useMultiUserCalculator();
  const multiUserMode = typeof isMultiUserMode === 'function' ? isMultiUserMode() : activeUsers.includes('user2');
  
  // Get dynamic users list
  const availableUsers = useMemo(() => {
    const users = getUsers ? getUsers() : hookGetUsers();
    return users.length > 0 ? users : [{ id: 'user1', name: resolveUserDisplayName('user1') }, { id: 'user2', name: resolveUserDisplayName('user2') }];
  }, [getUsers, hookGetUsers]);
  
  // Create dynamic user defaults function
  const createUserDefaults = (userId) => ({
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
  });

  // Generate defaults for available users
  const generateEmptyDefaults = () => {
    const defaults = {};
    
    // Create defaults for all available users
    availableUsers.forEach(user => {
      defaults[user.id] = createUserDefaults(user.id);
    });
    
    // Ensure user1 and user2 always exist for compatibility
    if (!defaults.user1) defaults.user1 = createUserDefaults('user1');
    if (!defaults.user2) defaults.user2 = createUserDefaults('user2');
    
    return defaults;
  };

  // Initialize with dynamic defaults
  const emptyDefaults = useMemo(() => generateEmptyDefaults(), [availableUsers]);

  // Legacy structure still used internally for compatibility
  const legacyEmptyDefaults = {
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
  
  // Dynamic user state system - replaces individual user1/user2 state variables
  const [userDataState, setUserDataState] = useState(() => {
    const initialState = {};
    availableUsers.forEach(user => {
      const defaults = emptyDefaults[user.id] || createUserDefaults(user.id);
      initialState[user.id] = {
        name: defaults.name,
        employer: defaults.employer,
        birthday: defaults.birthday,
        salary: defaults.salary,
        payPeriod: defaults.payPeriod,
        filingStatus: defaults.filingStatus,
        w4Type: defaults.w4Type,
        w4Options: defaults.w4Options,
        retirementOptions: defaults.retirementOptions,
        medicalDeductions: defaults.medicalDeductions,
        esppDeductionPercent: defaults.esppDeductionPercent,
        budgetImpacting: defaults.budgetImpacting,
        bonusMultiplier: defaults.bonusMultiplier,
        bonusTarget: defaults.bonusTarget,
        overrideBonus: '',
        remove401kFromBonus: false,
        effectiveBonus: 0,
        results: null,
        payWeekType: 'even',
        hsaCoverageType: 'self',
        incomePeriodsData: []
      };
    });
    return initialState;
  });
  
  // Helper functions to update user data
  const updateUserData = useCallback((userId, field, value) => {
    setUserDataState(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value
      }
    }));
  }, []);
  
  const getUserData = useCallback((userId) => {
    return userDataState[userId] || emptyDefaults[userId] || createUserDefaults(userId);
  }, [userDataState, emptyDefaults]);
  
  // Legacy setter functions for user1
  const setName = useCallback((value) => updateUserData('user1', 'name', value), [updateUserData]);
  const setEmployer = useCallback((value) => updateUserData('user1', 'employer', value), [updateUserData]);
  const setBirthday = useCallback((value) => updateUserData('user1', 'birthday', value), [updateUserData]);
  const setSalary = useCallback((value) => updateUserData('user1', 'salary', value), [updateUserData]);
  const setPayPeriod = useCallback((value) => updateUserData('user1', 'payPeriod', value), [updateUserData]);
  const setFilingStatus = useCallback((value) => updateUserData('user1', 'filingStatus', value), [updateUserData]);
  const setW4Type = useCallback((value) => updateUserData('user1', 'w4Type', value), [updateUserData]);
  const setW4Options = useCallback((value) => updateUserData('user1', 'w4Options', value), [updateUserData]);
  const setRetirementOptions = useCallback((value) => updateUserData('user1', 'retirementOptions', value), [updateUserData]);
  const setMedicalDeductions = useCallback((value) => updateUserData('user1', 'medicalDeductions', value), [updateUserData]);
  const setEsppDeductionPercent = useCallback((value) => updateUserData('user1', 'esppDeductionPercent', value), [updateUserData]);
  const setBudgetImpacting = useCallback((value) => updateUserData('user1', 'budgetImpacting', value), [updateUserData]);
  const setBonusMultiplier = useCallback((value) => updateUserData('user1', 'bonusMultiplier', value), [updateUserData]);
  const setBonusTarget = useCallback((value) => updateUserData('user1', 'bonusTarget', value), [updateUserData]);
  const setOverrideBonus = useCallback((value) => updateUserData('user1', 'overrideBonus', value), [updateUserData]);
  const setRemove401kFromBonus = useCallback((value) => updateUserData('user1', 'remove401kFromBonus', value), [updateUserData]);
  const setEffectiveBonus = useCallback((value) => updateUserData('user1', 'effectiveBonus', value), [updateUserData]);
  const setResults = useCallback((value) => updateUserData('user1', 'results', value), [updateUserData]);
  const setPayWeekType = useCallback((value) => updateUserData('user1', 'payWeekType', value), [updateUserData]);
  const setHsaCoverageType = useCallback((value) => updateUserData('user1', 'hsaCoverageType', value), [updateUserData]);
  const setIncomePeriodsData = useCallback((value) => updateUserData('user1', 'incomePeriodsData', value), [updateUserData]);
  
  // Legacy setter functions for user2
  const setUser2Name = useCallback((value) => updateUserData('user2', 'name', value), [updateUserData]);
  const setSpouseEmployer = useCallback((value) => updateUserData('user2', 'employer', value), [updateUserData]);
  const setSpouseBirthday = useCallback((value) => updateUserData('user2', 'birthday', value), [updateUserData]);
  const setSpouseSalary = useCallback((value) => updateUserData('user2', 'salary', value), [updateUserData]);
  const setSpousePayPeriod = useCallback((value) => updateUserData('user2', 'payPeriod', value), [updateUserData]);
  const setSpouseFilingStatus = useCallback((value) => updateUserData('user2', 'filingStatus', value), [updateUserData]);
  const setSpouseW4Type = useCallback((value) => updateUserData('user2', 'w4Type', value), [updateUserData]);
  const setSpouseW4Options = useCallback((value) => updateUserData('user2', 'w4Options', value), [updateUserData]);
  const setSpouseRetirementOptions = useCallback((value) => updateUserData('user2', 'retirementOptions', value), [updateUserData]);
  const setSpouseMedicalDeductions = useCallback((value) => updateUserData('user2', 'medicalDeductions', value), [updateUserData]);
  const setSpouseEsppDeductionPercent = useCallback((value) => updateUserData('user2', 'esppDeductionPercent', value), [updateUserData]);
  const setSpouseBudgetImpacting = useCallback((value) => updateUserData('user2', 'budgetImpacting', value), [updateUserData]);
  const setSpouseBonusMultiplier = useCallback((value) => updateUserData('user2', 'bonusMultiplier', value), [updateUserData]);
  const setSpouseBonusTarget = useCallback((value) => updateUserData('user2', 'bonusTarget', value), [updateUserData]);
  const setSpouseOverrideBonus = useCallback((value) => updateUserData('user2', 'overrideBonus', value), [updateUserData]);
  const setSpouseRemove401kFromBonus = useCallback((value) => updateUserData('user2', 'remove401kFromBonus', value), [updateUserData]);
  const setSpouseEffectiveBonus = useCallback((value) => updateUserData('user2', 'effectiveBonus', value), [updateUserData]);
  const setSpouseResults = useCallback((value) => updateUserData('user2', 'results', value), [updateUserData]);
  const setSpousePayWeekType = useCallback((value) => updateUserData('user2', 'payWeekType', value), [updateUserData]);
  const setSpouseHsaCoverageType = useCallback((value) => updateUserData('user2', 'hsaCoverageType', value), [updateUserData]);
  const setSpouseIncomePeriodsData = useCallback((value) => updateUserData('user2', 'incomePeriodsData', value), [updateUserData]);
  
  // Legacy compatibility - maintain existing variable names for user1
  const name = getUserData('user1').name;
  const employer = getUserData('user1').employer;
  const birthday = getUserData('user1').birthday;
  const salary = getUserData('user1').salary;
  const payPeriod = getUserData('user1').payPeriod;
  const filingStatus = getUserData('user1').filingStatus;
  const w4Type = getUserData('user1').w4Type;
  const w4Options = getUserData('user1').w4Options;
  const retirementOptions = getUserData('user1').retirementOptions;
  
  const medicalDeductions = getUserData('user1').medicalDeductions;
  const esppDeductionPercent = getUserData('user1').esppDeductionPercent;
  const budgetImpacting = getUserData('user1').budgetImpacting;
  const bonusMultiplier = getUserData('user1').bonusMultiplier;
  const bonusTarget = getUserData('user1').bonusTarget;
  const overrideBonus = getUserData('user1').overrideBonus;
  const remove401kFromBonus = getUserData('user1').remove401kFromBonus;
  const effectiveBonus = getUserData('user1').effectiveBonus;
  const results = getUserData('user1').results;
  const payWeekType = getUserData('user1').payWeekType;

  // Legacy compatibility - maintain existing variable names for user2
  const user2Name = getUserData('user2').name;
  const spouseEmployer = getUserData('user2').employer;
  const spouseBirthday = getUserData('user2').birthday;
  const spouseSalary = getUserData('user2').salary;
  const spousePayPeriod = getUserData('user2').payPeriod;
  const spouseFilingStatus = getUserData('user2').filingStatus;
  const spouseW4Type = getUserData('user2').w4Type;
  const spouseW4Options = getUserData('user2').w4Options;
  const spouseRetirementOptions = getUserData('user2').retirementOptions;
  const spouseMedicalDeductions = getUserData('user2').medicalDeductions;
  const spouseEsppDeductionPercent = getUserData('user2').esppDeductionPercent;
  const spouseBudgetImpacting = getUserData('user2').budgetImpacting;
  const spouseBonusMultiplier = getUserData('user2').bonusMultiplier;
  const spouseBonusTarget = getUserData('user2').bonusTarget;
  const spouseOverrideBonus = getUserData('user2').overrideBonus;
  const spouseRemove401kFromBonus = getUserData('user2').remove401kFromBonus;
  const spouseEffectiveBonus = getUserData('user2').effectiveBonus;
  const spouseResults = getUserData('user2').results;
  const spousePayWeekType = getUserData('user2').payWeekType;

  // Legacy compatibility for HSA coverage
  const hsaCoverageType = getUserData('user1').hsaCoverageType;
  const spouseHsaCoverageType = getUserData('user2').hsaCoverageType;

  // Add ref to prevent saving during initial load
  const isInitialLoadRef = useRef(true);
  const hasLoadedDataRef = useRef(false); // Add flag to prevent repeated loads

  const [formData, setFormData] = useState({}); // Keep empty initially

  // YTD Income tracking state now comes from user data state
  const incomePeriodsData = getUserData('user1').incomePeriodsData || [];
  const spouseIncomePeriodsData = getUserData('user2').incomePeriodsData || [];

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
  }, [userDataState, results, updateFormData, updateBudgetImpacting]);

  // Load saved paycheck data on mount and on import
  useEffect(() => {
    // Only load once unless there's a specific data update event
    if (hasLoadedDataRef.current) {
      return;
    }

    const loadPaycheckData = () => {
      // Try to load from new users structure first, then fallback to legacy
      let savedData = null;
      
      // Debug localStorage contents directly
      console.log('🔍 localStorage contents check:');
      console.log('🔍 All localStorage keys:', Object.keys(localStorage));
      console.log('🔍 localStorage["users"] direct access:', localStorage.getItem('users'));
      console.log('🔍 localStorage["users"] length:', localStorage.getItem('users')?.length);
      
      const usersData = getUsers();
      console.log('🎯 PaycheckCalculator: getUsers() returned:', usersData);
      console.log('🎯 PaycheckCalculator: usersData length:', usersData?.length);
      
      if (usersData && usersData.length > 0) {
        console.log('🎯 PaycheckCalculator: Processing users data...');
        // Use the new normalized structure directly
        savedData = {};
        
        usersData.forEach(user => {
          console.log('🎯 PaycheckCalculator: Processing user:', {
            id: user.id,
            name: user.name,
            hasPaycheck: !!user.paycheck,
            paycheckData: user.paycheck
          });
          
          if (user.id === 'user1' || user.id === 'user2') {
            console.log('🎯 PaycheckCalculator: User matches target ID, adding to savedData');
            
            savedData[user.id] = {
              name: user.name || '',
              employer: user.employer || '',
              birthday: user.birthday || '',
              salary: user.paycheck?.salary || 0,
              payPeriod: user.paycheck?.payPeriod || 'biWeekly',
              filingStatus: user.paycheck?.filingStatus || 'single',
              w4Type: user.paycheck?.w4Type || 'new',
              w4Options: { ...(emptyDefaults[user.id]?.w4Options || {}), ...(user.paycheck?.w4Options || {}) },
              retirementOptions: { ...(emptyDefaults[user.id]?.retirementOptions || {}), ...(user.paycheck?.retirementOptions || {}) },
              medicalDeductions: { ...(emptyDefaults[user.id]?.medicalDeductions || {}), ...(user.paycheck?.medicalDeductions || {}) },
              esppDeductionPercent: user.paycheck?.esppDeductionPercent || 0,
              bonusTarget: user.paycheck?.bonusTarget || 0,
              bonusMultiplier: user.paycheck?.bonusMultiplier || 0,
              hsaCoverageType: user.paycheck?.hsaCoverageType || 'self',
              payWeekType: user.paycheck?.payWeekType || (user.id === 'user1' ? 'odd' : 'even'),
              budgetImpacting: { ...(emptyDefaults[user.id]?.budgetImpacting || {}), ...(user.budgetImpacting || {}) }
            };
          }
        });
        console.log('🎯 PaycheckCalculator: Final savedData from users:', savedData);
      } else {
        console.log('🎯 PaycheckCalculator: No users data found, falling back to legacy');
        // Fallback to legacy format
        savedData = getPaycheckData();
        console.log('🎯 PaycheckCalculator: Legacy savedData:', savedData);
      }
      
      if (savedData && Object.keys(savedData).length > 0) {
        // Load all user data dynamically
        const newUserDataState = { ...userDataState };
        
        availableUsers.forEach(user => {
          const userId = user.id;
          if (savedData[userId]) {
            const defaults = emptyDefaults[userId] || createUserDefaults(userId);
            newUserDataState[userId] = {
              name: savedData[userId].name || defaults.name,
              employer: savedData[userId].employer || defaults.employer,
              birthday: savedData[userId].birthday || defaults.birthday,
              salary: savedData[userId].salary || defaults.salary,
              payPeriod: savedData[userId].payPeriod || defaults.payPeriod,
              filingStatus: savedData[userId].filingStatus || defaults.filingStatus,
              w4Type: savedData[userId].w4Type || defaults.w4Type,
              w4Options: { ...defaults.w4Options, ...savedData[userId].w4Options },
              retirementOptions: { ...defaults.retirementOptions, ...savedData[userId].retirementOptions },
              medicalDeductions: { ...defaults.medicalDeductions, ...savedData[userId].medicalDeductions },
              esppDeductionPercent: savedData[userId].esppDeductionPercent || 0,
              budgetImpacting: { ...defaults.budgetImpacting, ...savedData[userId].budgetImpacting },
              bonusMultiplier: savedData[userId].bonusMultiplier || 0,
              bonusTarget: savedData[userId].bonusTarget || 0,
              overrideBonus: savedData[userId].overrideBonus || '',
              remove401kFromBonus: savedData[userId].remove401kFromBonus || false,
              effectiveBonus: savedData[userId].effectiveBonus || 0,
              results: null,
              payWeekType: savedData[userId].payWeekType || 'even',
              hsaCoverageType: savedData[userId].hsaCoverageType || 'self',
              incomePeriodsData: savedData[userId].incomePeriodsData || []
            };
          }
        });
        
        setUserDataState(newUserDataState);
        
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

    const handleDataImported = (event) => {
      // Reset the flag and reload data after import
      hasLoadedDataRef.current = false;
      setTimeout(() => {
        loadPaycheckData();
      }, 100);
    };

    window.addEventListener('paycheckDataUpdated', handlePaycheckDataUpdate);
    window.addEventListener('dataImported', handleDataImported);

    return () => {
      window.removeEventListener('paycheckDataUpdated', handlePaycheckDataUpdate);
      window.removeEventListener('dataImported', handleDataImported);
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

    // Dynamic data saving for all users
    const dataToSave = {};
    
    // Save data for all available users
    availableUsers.forEach(user => {
      const userId = user.id;
      const userData = getUserData(userId);
      dataToSave[userId] = {
        name: userData.name,
        employer: userData.employer,
        birthday: userData.birthday,
        salary: userData.salary,
        payPeriod: userData.payPeriod,
        filingStatus: userData.filingStatus,
        w4Type: userData.w4Type,
        w4Options: userData.w4Options,
        retirementOptions: userData.retirementOptions,
        medicalDeductions: userData.medicalDeductions,
        esppDeductionPercent: userData.esppDeductionPercent,
        budgetImpacting: userData.budgetImpacting,
        bonusMultiplier: userData.bonusMultiplier,
        bonusTarget: userData.bonusTarget,
        overrideBonus: userData.overrideBonus,
        remove401kFromBonus: userData.remove401kFromBonus,
        effectiveBonus: userData.effectiveBonus,
        hsaCoverageType: userData.hsaCoverageType,
        payWeekType: userData.payWeekType,
        netTakeHomePaycheck: userData.results?.netTakeHomePaycheck || 0,
        incomePeriodsData: userData.incomePeriodsData || []
      };
    });
    
    dataToSave.settings = {
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
    userDataState, isMultiUserMode
    // Now depends on the complete userDataState instead of individual variables
  ]);

  // ...existing code...

  // Add global event listeners
  useEffect(() => {

    const handleResetAll = () => {
      // Reset to empty defaults and clear localStorage
      try {
        // Clear paycheck data from localStorage
        setPaycheckData({});
        
        // Reset all users to defaults dynamically
        const resetUserDataState = {};
        availableUsers.forEach(user => {
          const userId = user.id;
          const defaults = emptyDefaults[userId] || createUserDefaults(userId);
          resetUserDataState[userId] = {
            ...defaults,
            results: null,
            overrideBonus: '',
            remove401kFromBonus: false,
            effectiveBonus: 0,
            payWeekType: 'even',
            hsaCoverageType: 'self',
            incomePeriodsData: []
          };
        });
        setUserDataState(resetUserDataState);
        
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
      // Reset all users to defaults dynamically
      const resetUserDataState = {};
      availableUsers.forEach(user => {
        const userId = user.id;
        const defaults = emptyDefaults[userId] || createUserDefaults(userId);
        resetUserDataState[userId] = {
          ...defaults,
          results: null,
          overrideBonus: '',
          remove401kFromBonus: false,
          effectiveBonus: 0,
          payWeekType: 'even',
          hsaCoverageType: 'self',
          incomePeriodsData: []
        };
      });
      setUserDataState(resetUserDataState);
      
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