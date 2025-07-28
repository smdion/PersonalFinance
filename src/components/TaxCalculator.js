import React, { useState, useCallback, useContext, useEffect, useRef } from 'react';
import { calculateTakeHomePay } from '../utils/taxCalculator';
import { CONTRIBUTION_LIMITS_2025, PAY_PERIODS } from '../config/taxConstants';
import PaycheckForm from './PaycheckForm';
import { FormContext } from '../context/FormContext';
import { getPaycheckData, setPaycheckData, updateNameMapping } from '../utils/localStorage';
import Navigation from './Navigation';

const TaxCalculator = () => {
  const { updateFormData, updateBudgetImpacting, addBrokerageAccount, updateBrokerageAccount, removeBrokerageAccount } = useContext(FormContext);

  // Remove settings menu state and ref
  
  // Add global section control state
  const [globalSectionControl, setGlobalSectionControl] = useState(null);
  
  // Toggle for showing spouse calculator
  const [showSpouseCalculator, setShowSpouseCalculator] = useState(true);
  
  // Initialize with empty defaults
  const emptyDefaults = {
    your: {
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
        employerHsa: 0
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
    spouse: {
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
        employerHsa: 0
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
  
  // Your variables - start with empty defaults
  const [name, setName] = useState(emptyDefaults.your.name);
  const [employer, setEmployer] = useState(emptyDefaults.your.employer);
  const [birthday, setBirthday] = useState(emptyDefaults.your.birthday);
  const [salary, setSalary] = useState(emptyDefaults.your.salary);
  const [payPeriod, setPayPeriod] = useState(emptyDefaults.your.payPeriod);
  const [filingStatus, setFilingStatus] = useState(emptyDefaults.your.filingStatus);
  const [w4Type, setW4Type] = useState(emptyDefaults.your.w4Type);
  const [w4Options, setW4Options] = useState(emptyDefaults.your.w4Options);
  const [retirementOptions, setRetirementOptions] = useState(emptyDefaults.your.retirementOptions);
  const [medicalDeductions, setMedicalDeductions] = useState(emptyDefaults.your.medicalDeductions);
  const [esppDeductionPercent, setEsppDeductionPercent] = useState(emptyDefaults.your.esppDeductionPercent);
  const [budgetImpacting, setBudgetImpacting] = useState(emptyDefaults.your.budgetImpacting);
  const [bonusMultiplier, setBonusMultiplier] = useState(emptyDefaults.your.bonusMultiplier);
  const [bonusTarget, setBonusTarget] = useState(emptyDefaults.your.bonusTarget);
  const [results, setResults] = useState(null);
  const [payWeekType, setPayWeekType] = useState('even');

  // Spouse variables - start with empty defaults
  const [spouseName, setSpouseName] = useState(emptyDefaults.spouse.name);
  const [spouseEmployer, setSpouseEmployer] = useState(emptyDefaults.spouse.employer);
  const [spouseBirthday, setSpouseBirthday] = useState(emptyDefaults.spouse.birthday);
  const [spouseSalary, setSpouseSalary] = useState(emptyDefaults.spouse.salary);
  const [spousePayPeriod, setSpousePayPeriod] = useState(emptyDefaults.spouse.payPeriod);
  const [spouseFilingStatus, setSpouseFilingStatus] = useState(emptyDefaults.spouse.filingStatus);
  const [spouseW4Type, setSpouseW4Type] = useState(emptyDefaults.spouse.w4Type);
  const [spouseW4Options, setSpouseW4Options] = useState(emptyDefaults.spouse.w4Options);
  const [spouseRetirementOptions, setSpouseRetirementOptions] = useState(emptyDefaults.spouse.retirementOptions);
  const [spouseMedicalDeductions, setSpouseMedicalDeductions] = useState(emptyDefaults.spouse.medicalDeductions);
  const [spouseEsppDeductionPercent, setSpouseEsppDeductionPercent] = useState(emptyDefaults.spouse.esppDeductionPercent);
  const [spouseBudgetImpacting, setSpouseBudgetImpacting] = useState(emptyDefaults.spouse.budgetImpacting);
  const [spouseBonusMultiplier, setSpouseBonusMultiplier] = useState(emptyDefaults.spouse.bonusMultiplier);
  const [spouseBonusTarget, setSpouseBonusTarget] = useState(emptyDefaults.spouse.bonusTarget);
  const [spouseResults, setSpouseResults] = useState(null);
  const [spousePayWeekType, setSpousePayWeekType] = useState('even');

  // Add HSA coverage state for both calculators
  const [hsaCoverageType, setHsaCoverageType] = useState('self');
  const [spouseHsaCoverageType, setSpouseHsaCoverageType] = useState('self');

  // Add ref to prevent saving during initial load
  const isInitialLoadRef = useRef(true);
  const hasLoadedDataRef = useRef(false); // Add flag to prevent repeated loads

  const [formData, setFormData] = useState({}); // Keep empty initially

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
      ? CONTRIBUTION_LIMITS_2025.k401_employee + CONTRIBUTION_LIMITS_2025.k401_catchUp
      : CONTRIBUTION_LIMITS_2025.k401_employee;
    
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

    updateBudgetImpacting('your', budgetImpacting);

    // Calculate combined monthly as 2 paychecks instead of annual ÷ 12
    const combinedMonthlyTakeHome = showSpouseCalculator && spouseResults
      ? ((calculation?.netTakeHomePaycheck || 0) + (spouseResults?.netTakeHomePaycheck || 0)) * 2
      : (calculation?.netTakeHomePaycheck || 0) * 2;
    const combinedTakeHomePerPayPeriod = showSpouseCalculator && spouseResults
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
    showSpouseCalculator,
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
      ? CONTRIBUTION_LIMITS_2025.k401_employee + CONTRIBUTION_LIMITS_2025.k401_catchUp
      : CONTRIBUTION_LIMITS_2025.k401_employee;
    
    if (traditional401kAmount + roth401kAmount > maxContribution) {
      // Optional: Could show a warning indicator in the UI instead of blocking calculation
    }

    const calculation = calculateTakeHomePay(grossPayPerPaycheck, spousePayPeriod, spouseFilingStatus, spouseW4Type, spouseW4Options, spouseRetirementOptions, spouseMedicalDeductions, spouseEsppDeductionPercent, spouseHsaCoverageType);
    setSpouseResults(calculation);

    updateBudgetImpacting('spouse', spouseBudgetImpacting);

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
        // Load your data
        if (savedData.your) {
          setName(savedData.your.name || '');
          setEmployer(savedData.your.employer || '');
          setBirthday(savedData.your.birthday || '');
          setSalary(savedData.your.salary || '');
          setPayPeriod(savedData.your.payPeriod || 'biWeekly');
          setFilingStatus(savedData.your.filingStatus || 'single');
          setW4Type(savedData.your.w4Type || 'new');
          setW4Options(savedData.your.w4Options || emptyDefaults.your.w4Options);
          setRetirementOptions(savedData.your.retirementOptions || emptyDefaults.your.retirementOptions);
          setMedicalDeductions(savedData.your.medicalDeductions || emptyDefaults.your.medicalDeductions);
          setEsppDeductionPercent(savedData.your.esppDeductionPercent || 0);
          setBudgetImpacting(savedData.your.budgetImpacting || emptyDefaults.your.budgetImpacting);
          setBonusMultiplier(savedData.your.bonusMultiplier || 0);
          setBonusTarget(savedData.your.bonusTarget || 0);
          setHsaCoverageType(savedData.your.hsaCoverageType || 'self');
          setPayWeekType(savedData.your.payWeekType || 'even');
        }
        
        // Load spouse data
        if (savedData.spouse) {
          setSpouseName(savedData.spouse.name || '');
          setSpouseEmployer(savedData.spouse.employer || '');
          setSpouseBirthday(savedData.spouse.birthday || '');
          setSpouseSalary(savedData.spouse.salary || '');
          setSpousePayPeriod(savedData.spouse.payPeriod || 'biWeekly');
          setSpouseFilingStatus(savedData.spouse.filingStatus || 'single');
          setSpouseW4Type(savedData.spouse.w4Type || 'new');
          setSpouseW4Options(savedData.spouse.w4Options || emptyDefaults.spouse.w4Options);
          setSpouseRetirementOptions(savedData.spouse.retirementOptions || emptyDefaults.spouse.retirementOptions);
          setSpouseMedicalDeductions(savedData.spouse.medicalDeductions || emptyDefaults.spouse.medicalDeductions);
          setSpouseEsppDeductionPercent(savedData.spouse.esppDeductionPercent || 0);
          setSpouseBudgetImpacting(savedData.spouse.budgetImpacting || emptyDefaults.spouse.budgetImpacting);
          setSpouseBonusMultiplier(savedData.spouse.bonusMultiplier || 0);
          setSpouseBonusTarget(savedData.spouse.bonusTarget || 0);
          setSpouseHsaCoverageType(savedData.spouse.hsaCoverageType || 'self');
          setSpousePayWeekType(savedData.spouse.payWeekType || 'even');
        }
        
        // Load settings
        if (savedData.settings) {
          setShowSpouseCalculator(savedData.settings.showSpouseCalculator ?? true);
        }
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

    // Check for name changes and handle mapping with better logging
    const savedData = getPaycheckData();
    const { updateNameMapping } = require('../utils/localStorage');
    
    // Check if "your" name changed
    const oldYourName = savedData?.your?.name?.trim();
    const newYourName = name.trim();
    if (oldYourName && newYourName && oldYourName !== newYourName) {
      updateNameMapping(oldYourName, newYourName);
    }
    
    // Check if spouse name changed
    const oldSpouseName = savedData?.spouse?.name?.trim();
    const newSpouseName = spouseName.trim();
    if (oldSpouseName && newSpouseName && oldSpouseName !== newSpouseName) {
      updateNameMapping(oldSpouseName, newSpouseName);
    }

    const dataToSave = {
      your: {
        name, employer, birthday, salary, payPeriod, filingStatus, w4Type, w4Options,
        retirementOptions, medicalDeductions, esppDeductionPercent, budgetImpacting,
        bonusMultiplier, bonusTarget, hsaCoverageType, payWeekType,
        netTakeHomePaycheck: results?.netTakeHomePaycheck || 0
      },
      spouse: {
        name: spouseName, employer: spouseEmployer, birthday: spouseBirthday, 
        salary: spouseSalary, payPeriod: spousePayPeriod, filingStatus: spouseFilingStatus,
        w4Type: spouseW4Type, w4Options: spouseW4Options, retirementOptions: spouseRetirementOptions,
        medicalDeductions: spouseMedicalDeductions, esppDeductionPercent: spouseEsppDeductionPercent,
        budgetImpacting: spouseBudgetImpacting, bonusMultiplier: spouseBonusMultiplier,
        bonusTarget: spouseBonusTarget, hsaCoverageType: spouseHsaCoverageType, payWeekType: spousePayWeekType,
        netTakeHomePaycheck: spouseResults?.netTakeHomePaycheck || 0
      },
      settings: {
        showSpouseCalculator
      }
    };
    
    setPaycheckData(dataToSave);
    
    // Dispatch event to notify other components with delay to ensure save is complete
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('paycheckDataUpdated', { detail: dataToSave }));
    }, 100);
  }, [
    name, employer, birthday, salary, payPeriod, filingStatus, w4Type, w4Options,
    retirementOptions, medicalDeductions, esppDeductionPercent, budgetImpacting,
    bonusMultiplier, bonusTarget, hsaCoverageType, showSpouseCalculator, payWeekType,
    spouseName, spouseEmployer, spouseBirthday, spouseSalary, spousePayPeriod,
    spouseFilingStatus, spouseW4Type, spouseW4Options, spouseRetirementOptions,
    spouseMedicalDeductions, spouseEsppDeductionPercent, spouseBudgetImpacting,
    spouseBonusMultiplier, spouseBonusTarget, spouseHsaCoverageType, spousePayWeekType
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
        Object.entries(emptyDefaults.your).forEach(([key, value]) => {
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
          }
        });
        
        Object.entries(emptyDefaults.spouse).forEach(([key, value]) => {
          switch(key) {
            case 'name': setSpouseName(value); break;
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
          }
        });
        
        setHsaCoverageType('self');
        setSpouseHsaCoverageType('self');
        setResults(null);
        setSpouseResults(null);
        setShowSpouseCalculator(true);
        
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

  // Add effect to update context when showSpouseCalculator changes
  useEffect(() => {
    updateFormData('showSpouseCalculator', showSpouseCalculator);

    if (!showSpouseCalculator && results) {
      // Calculate as 2 paychecks instead of annual ÷ 12
      const yourMonthlyTakeHome = (results?.netTakeHomePaycheck || 0) * 2;
      
      updateFormData('combinedMonthlyTakeHome', yourMonthlyTakeHome);
      updateFormData('combinedTakeHomePerPayPeriod', results?.netTakeHomePaycheck || 0);
    } else if (showSpouseCalculator && results && spouseResults) {
      // Calculate as 2 paychecks instead of annual ÷ 12
      const yourMonthlyTakeHome = (results?.netTakeHomePaycheck || 0) * 2;
      const spouseMonthlyTakeHome = (spouseResults.netTakeHomePaycheck * 2);

      const combinedMonthlyTakeHome = yourMonthlyTakeHome + spouseMonthlyTakeHome;
      const combinedTakeHomePerPayPeriod = (results?.netTakeHomePaycheck || 0) + (spouseResults?.netTakeHomePaycheck || 0);
      
      updateFormData('combinedMonthlyTakeHome', combinedMonthlyTakeHome);
      updateFormData('combinedTakeHomePerPayPeriod', combinedTakeHomePerPayPeriod);
    }
  }, [showSpouseCalculator, updateFormData]);

  // Add effect to update context when budgetImpacting changes
  useEffect(() => {
    updateBudgetImpacting('your', budgetImpacting);
  }, [budgetImpacting, updateBudgetImpacting]);

  // Add effect to update context when spouseBudgetImpacting changes
  useEffect(() => {
    updateBudgetImpacting('spouse', spouseBudgetImpacting);
  }, [spouseBudgetImpacting, updateBudgetImpacting]);

  // Add reset function for settings menu
  const resetAllData = () => {
    if (window.confirm('Are you sure you want to reset all calculator data? This cannot be undone.')) {
      // Reset to empty defaults
      Object.entries(emptyDefaults.your).forEach(([key, value]) => {
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
        }
      });
      
      Object.entries(emptyDefaults.spouse).forEach(([key, value]) => {
        switch(key) {
          case 'name': setSpouseName(value); break;
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

  return (
    <>
      <Navigation />
      <div className="app-container">
        <div className="header">
          <h1>💼 {showSpouseCalculator ? 'Household Paycheck Calculator' : 'Paycheck Calculator'}</h1>
          <p>Calculate Your Net Pay With Precision And Plan Your Financial Future</p>
          
          {/* Add toggle for spouse calculator directly in header */}
          <div className="header-controls">
            <div className="paycheck-control-buttons">
              <button
                onClick={expandAllSectionsGlobal}
                className="paycheck-control-button expand"
                title="Expand all paycheck sections"
              >
                📖 Expand All
              </button>
              <button
                onClick={collapseAllSectionsGlobal}
                className="paycheck-control-button collapse"
                title="Collapse all paycheck sections"
              >
                📕 Collapse All
              </button>
            </div>
            <label className="header-toggle">
              <input
                type="checkbox"
                className="modern-checkbox"
                checked={showSpouseCalculator}
                onChange={(e) => setShowSpouseCalculator(e.target.checked)}
              />
              <span>Dual Calculator Mode</span>
            </label>
          </div>
        </div>

        <div className="calculators-grid">
          <PaycheckForm 
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
            onAddBrokerageAccount={(person) => addBrokerageAccount('your')}
            onUpdateBrokerageAccount={(person, accountId, field, value) => updateBrokerageAccount('your', accountId, field, value)}
            onRemoveBrokerageAccount={(person, accountId) => removeBrokerageAccount('your', accountId)}
            bonusMultiplier={bonusMultiplier}
            setBonusMultiplier={setBonusMultiplier}
            bonusTarget={bonusTarget}
            setBonusTarget={setBonusTarget}
            payWeekType={payWeekType}
            setPayWeekType={setPayWeekType}
            hsaCoverageType={hsaCoverageType}
            setHsaCoverageType={(type) => handleHsaCoverageChange(type, false)}
            globalSectionControl={globalSectionControl}
            onCalculate={handleCalculate}
            results={results}
          />
          
          {showSpouseCalculator && (
            <PaycheckForm 
              personName="Spouse"
              name={spouseName}
              setName={setSpouseName}
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
              onAddBrokerageAccount={(person) => addBrokerageAccount('spouse')}
              onUpdateBrokerageAccount={(person, accountId, field, value) => updateBrokerageAccount('spouse', accountId, field, value)}
              onRemoveBrokerageAccount={(person, accountId) => removeBrokerageAccount('spouse', accountId)}
              bonusMultiplier={spouseBonusMultiplier}
              setBonusMultiplier={setSpouseBonusMultiplier}
              bonusTarget={spouseBonusTarget}
              setBonusTarget={setSpouseBonusTarget}
              payWeekType={spousePayWeekType}
              setPayWeekType={setSpousePayWeekType}
              hsaCoverageType={spouseHsaCoverageType}
              setHsaCoverageType={(type) => handleHsaCoverageChange(type, true)}
              globalSectionControl={globalSectionControl}
              onCalculate={handleSpouseCalculate}
              results={spouseResults}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default TaxCalculator;