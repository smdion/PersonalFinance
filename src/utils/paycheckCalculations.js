import {
  calculateAnnualWageWithholding,
  calculatePayrollTaxes
} from './calculationHelpers';

import { getTaxConstants } from './localStorage';

// Get tax constants from localStorage
const getTaxConstantsData = () => {
  const constants = getTaxConstants();
  return {
    STANDARD_DEDUCTIONS: constants.STANDARD_DEDUCTIONS,
    CONTRIBUTION_LIMITS: constants.CONTRIBUTION_LIMITS,
    TAX_CREDITS: constants.TAX_CREDITS,
    ALLOWANCE_AMOUNT: constants.ALLOWANCE_AMOUNT,
    PAY_PERIODS: constants.PAY_PERIODS,
    W4_CONFIGS: constants.W4_CONFIGS
  };
};

// Re-Export Commonly Used Items For Backward Compatibility
export const getW4Configs = () => getTaxConstants().W4_CONFIGS;
export const getContributionLimits = () => getTaxConstants().CONTRIBUTION_LIMITS;
export const getPayPeriods = () => getTaxConstants().PAY_PERIODS;

export { calculatePercentageOfMax } from './calculationHelpers';

export function calculateFederalTax(taxableIncome, filingStatus, w4Type = 'new', w4Options = {}) {
  const { ALLOWANCE_AMOUNT, TAX_CREDITS } = getTaxConstantsData();
  
  if (w4Type === 'new' && w4Options.multipleJobs) {
    return 0; // Placeholder - Actual Calculation Done In CalculateTakeHomePay
  }

  let tax = calculateAnnualWageWithholding(taxableIncome, filingStatus, false);

  // Apply W-4 Adjustments For Old Form (2019 And Earlier)
  if (w4Type === 'old' && w4Options.allowances) {
    const allowanceReduction = w4Options.allowances * ALLOWANCE_AMOUNT;
    const reducedTaxableIncome = Math.max(0, taxableIncome - allowanceReduction);
    tax = calculateAnnualWageWithholding(reducedTaxableIncome, filingStatus, false);
  }

  // Apply Tax Credits For New W-4 (2020+)
  if (w4Type === 'new') {
    const childTaxCredit = (w4Options.qualifyingChildren || 0) * TAX_CREDITS.childTaxCredit;
    const otherDependentCredit = (w4Options.otherDependents || 0) * TAX_CREDITS.otherDependentCredit;
    tax = Math.max(0, tax - childTaxCredit - otherDependentCredit);
  }

  // Apply Extra Withholding
  if (w4Options.extraWithholding) {
    tax += w4Options.extraWithholding;
  }

  // Apply Additional Income (New W-4 Only)
  if (w4Type === 'new' && w4Options.additionalIncome) {
    const additionalTax = calculateAnnualWageWithholding(w4Options.additionalIncome, filingStatus, false);
    tax += additionalTax;
  }

  return tax;
}

export function calculateTakeHomePay(
  grossPay, payPeriod, filingStatus, w4Type = 'new', w4Options = {}, 
  retirementOptions = {}, medicalDeductions = {}, esppDeductionPercent = 0, 
  hsaCoverageType = 'self' // Remove bonusMultiplier parameter
) {
  const { PAY_PERIODS, STANDARD_DEDUCTIONS, CONTRIBUTION_LIMITS, TAX_CREDITS, ALLOWANCE_AMOUNT } = getTaxConstantsData();
  
  const periodsPerYear = PAY_PERIODS[payPeriod].periodsPerYear;
  const annualGrossIncome = grossPay * periodsPerYear;
  const standardDeduction = STANDARD_DEDUCTIONS[filingStatus];
  
  // Calculate 401k Contributions From Percentages
  // ...existing code...
  const traditional401kPercent = retirementOptions.traditional401kPercent || 0;
  const roth401kPercent = retirementOptions.roth401kPercent || 0;
  
  const traditional401kPaycheck = grossPay * (traditional401kPercent / 100);
  const roth401kPaycheck = grossPay * (roth401kPercent / 100);
  const traditional401kAnnual = traditional401kPaycheck * periodsPerYear;
  const roth401kAnnual = roth401kPaycheck * periodsPerYear;
  
  // Validate Contribution Limits
  const maxContribution = retirementOptions.isOver50 
    ? CONTRIBUTION_LIMITS.k401_employee + CONTRIBUTION_LIMITS.k401_catchUp
    : CONTRIBUTION_LIMITS.k401_employee;
  
  const actualTraditional401kAnnual = Math.min(traditional401kAnnual, maxContribution);
  const actualRoth401kAnnual = Math.min(roth401kAnnual, maxContribution - actualTraditional401kAnnual);
  
  const actualTraditional401kPaycheck = actualTraditional401kAnnual / periodsPerYear;
  const actualRoth401kPaycheck = actualRoth401kAnnual / periodsPerYear;
  
  // Calculate Total Medical Deductions (Pre-Tax) Per Paycheck, Excluding Employer HSA Contribution
  const coreMedicalDeductionsPaycheck = Object.entries(medicalDeductions || {})
    .filter(([key]) => !['employerHsa', 'additionalMedicalDeductions', 'additionalPostTaxDeductions'].includes(key))
    .reduce((sum, [, value]) => sum + (value || 0), 0);
  
  const additionalMedicalDeductionsPaycheck = (medicalDeductions.additionalMedicalDeductions || [])
    .reduce((sum, deduction) => sum + (deduction.amount || 0), 0);
  
  const totalMedicalDeductionsPaycheck = coreMedicalDeductionsPaycheck + additionalMedicalDeductionsPaycheck;

  const totalMedicalDeductionsAnnual = totalMedicalDeductionsPaycheck * periodsPerYear;

  const maxHsaContribution = hsaCoverageType === 'self'
    ? CONTRIBUTION_LIMITS.hsa_self
    : CONTRIBUTION_LIMITS.hsa_family;

  const totalHsaContributionAnnual = Math.min(
    (medicalDeductions.hsa || 0) * periodsPerYear,
    maxHsaContribution
  );

  const requiredHsaContributionPerPayPeriod = Math.max(
    0,
    (maxHsaContribution - (medicalDeductions.employerHsa || 0)) / periodsPerYear
  );

  // Calculate ESPP Deduction (Percentage Of Salary)
  const esppPaycheck = grossPay * (esppDeductionPercent / 100);
  const esppAnnual = esppPaycheck * periodsPerYear;
  
  // Calculate Additional Post-Tax Deductions Per Paycheck
  const additionalPostTaxDeductionsPaycheck = (medicalDeductions.additionalPostTaxDeductions || [])
    .reduce((sum, deduction) => sum + (deduction.amount || 0), 0);
  const additionalPostTaxDeductionsAnnual = additionalPostTaxDeductionsPaycheck * periodsPerYear;
  
  const totalPostTaxDeductionsPaycheck = esppPaycheck + additionalPostTaxDeductionsPaycheck;
  const totalPostTaxDeductionsAnnual = esppAnnual + additionalPostTaxDeductionsAnnual;
  
  // Apply Traditional 401k And Medical Deductions (Pre-Tax)
  const adjustedGrossPay = grossPay - actualTraditional401kPaycheck - totalMedicalDeductionsPaycheck;
  const adjustedGrossIncome = adjustedGrossPay * periodsPerYear;
  
  // Calculate Federal Tax Based On W-4 Type And Multiple Jobs Setting
  let federalTaxAnnual;
  
  if (w4Type === 'new' && w4Options.multipleJobs) {
    federalTaxAnnual = calculateAnnualWageWithholding(adjustedGrossIncome, filingStatus, true);
    
    const childTaxCredit = (w4Options.qualifyingChildren || 0) * TAX_CREDITS.childTaxCredit;
    const otherDependentCredit = (w4Options.otherDependents || 0) * TAX_CREDITS.otherDependentCredit;
    federalTaxAnnual = Math.max(0, federalTaxAnnual - childTaxCredit - otherDependentCredit);
    
    if (w4Options.additionalIncome) {
      const additionalTax = calculateAnnualWageWithholding(w4Options.additionalIncome, filingStatus, false);
      federalTaxAnnual += additionalTax;
    }
    
    if (w4Options.extraWithholding) {
      federalTaxAnnual += w4Options.extraWithholding * periodsPerYear;
    }
  } else {
    federalTaxAnnual = calculateAnnualWageWithholding(adjustedGrossIncome, filingStatus, false);
    
    if (w4Type === 'old' && w4Options.allowances) {
      const allowanceReduction = w4Options.allowances * ALLOWANCE_AMOUNT;
      const reducedAdjustedGrossIncome = Math.max(0, adjustedGrossIncome - allowanceReduction);
      federalTaxAnnual = calculateAnnualWageWithholding(reducedAdjustedGrossIncome, filingStatus, false);
    }
    
    if (w4Type === 'new') {
      const childTaxCredit = (w4Options.qualifyingChildren || 0) * TAX_CREDITS.childTaxCredit;
      const otherDependentCredit = (w4Options.otherDependents || 0) * TAX_CREDITS.otherDependentCredit;
      federalTaxAnnual = Math.max(0, federalTaxAnnual - childTaxCredit - otherDependentCredit);
      
      if (w4Options.additionalIncome) {
        const additionalTax = calculateAnnualWageWithholding(w4Options.additionalIncome, filingStatus, false);
        federalTaxAnnual += additionalTax;
      }
    }
    
    if (w4Options.extraWithholding) {
      federalTaxAnnual += w4Options.extraWithholding * periodsPerYear;
    }
  }
  
  const federalTaxPaycheck = federalTaxAnnual / periodsPerYear;
  const payrollTaxes = calculatePayrollTaxes(annualGrossIncome);
  
  const socialSecurityTaxPaycheck = payrollTaxes.socialSecurity / periodsPerYear;
  const medicareTaxPaycheck = payrollTaxes.medicare / periodsPerYear;
  const totalTaxesPaycheck = federalTaxPaycheck + socialSecurityTaxPaycheck + medicareTaxPaycheck;
  const totalTaxesAnnual = federalTaxAnnual + payrollTaxes.total;
  
  const netTakeHomePaycheck = grossPay - totalTaxesPaycheck - actualTraditional401kPaycheck - actualRoth401kPaycheck - totalMedicalDeductionsPaycheck - totalPostTaxDeductionsPaycheck;
  const netTakeHomeAnnual = netTakeHomePaycheck * periodsPerYear;
  
  const taxableIncome = Math.max(0, adjustedGrossIncome - standardDeduction);

  return {
    payPeriod,
    periodsPerYear,
    grossPay,
    annualGrossIncome,
    traditional401kPaycheck: actualTraditional401kPaycheck,
    traditional401kAnnual: actualTraditional401kAnnual,
    roth401kPaycheck: actualRoth401kPaycheck,
    roth401kAnnual: actualRoth401kAnnual,
    traditional401kPercent,
    roth401kPercent,
    totalMedicalDeductionsPaycheck,
    totalMedicalDeductionsAnnual,
    medicalDeductions,
    esppPaycheck,
    esppAnnual,
    additionalPostTaxDeductionsPaycheck,
    additionalPostTaxDeductionsAnnual,
    totalPostTaxDeductionsPaycheck,
    totalPostTaxDeductionsAnnual,
    adjustedGrossPay,
    adjustedGrossIncome,
    standardDeduction,
    taxableIncome,
    federalTaxPaycheck,
    federalTaxAnnual,
    socialSecurityTaxPaycheck,
    socialSecurityTaxAnnual: payrollTaxes.socialSecurity,
    medicareTaxPaycheck,
    medicareTaxAnnual: payrollTaxes.medicare,
    totalTaxesPaycheck,
    totalTaxesAnnual,
    netTakeHomePaycheck,
    netTakeHomeAnnual,
    effectiveTaxRate: (totalTaxesAnnual / annualGrossIncome) * 100,
    w4Type,
    w4Options,
    retirementOptions,
    contributionLimitReached: (actualTraditional401kAnnual + actualRoth401kAnnual) >= maxContribution,
    usingMultipleJobsMethod: w4Type === 'new' && w4Options.multipleJobs,
    esppDeductionPercent,
    totalHsaContributionAnnual,
    requiredHsaContributionPerPayPeriod
  };
}