
// Annual Federal Wage Withholding Tables (IRS Publication 15-T Percentage Method for Automated Payroll Systems)
// Standard Method (Single Jobs/Primary Job)
export const ANNUAL_WAGE_WITHHOLDING = {
  single: [
    { threshold: 0, baseWithholding: 0, rate: 0 },
    { threshold: 6400, baseWithholding: 0, rate: 0.10 },
    { threshold: 18325, baseWithholding: 1192.5, rate: 0.12 },
    { threshold: 54875, baseWithholding: 5578.5, rate: 0.22 },
    { threshold: 109750, baseWithholding: 17651, rate: 0.24 },
    { threshold: 203700, baseWithholding: 40199, rate: 0.32 },
    { threshold: 256925, baseWithholding: 57231, rate: 0.35 },
    { threshold: 632750, baseWithholding: 183647.25, rate: 0.37 }
  ],
  marriedJointly: [
    { threshold: 0, baseWithholding: 0, rate: 0 },
    { threshold: 17100, baseWithholding: 0, rate: 0.10 },
    { threshold: 40950, baseWithholding: 2385, rate: 0.12 },
    { threshold: 114050, baseWithholding: 115700, rate: 0.22 },
    { threshold: 223800, baseWithholding: 35302, rate: 0.24 },
    { threshold: 411700, baseWithholding: 80398, rate: 0.32 },
    { threshold: 518150, baseWithholding: 114462, rate: 0.35 },
    { threshold: 768700, baseWithholding: 202154.50, rate: 0.37 }
  ],
  marriedSeparately: [
    { threshold: 0, baseWithholding: 0, rate: 0 },
    { threshold: 6400, baseWithholding: 0, rate: 0.10 },
    { threshold: 18325, baseWithholding: 1192.5, rate: 0.12 },
    { threshold: 54875, baseWithholding: 5578.5, rate: 0.22 },
    { threshold: 109750, baseWithholding: 17651, rate: 0.24 },
    { threshold: 203700, baseWithholding: 40199, rate: 0.32 },
    { threshold: 256925, baseWithholding: 57231, rate: 0.35 },
    { threshold: 632750, baseWithholding: 183647.25, rate: 0.37 }
  ],
  headOfHousehold: [
    { threshold: 0, baseWithholding: 0, rate: 0 },
    { threshold: 13900, baseWithholding: 0, rate: 0.10 },
    { threshold: 30900, baseWithholding: 1700, rate: 0.12 },
    { threshold: 78750, baseWithholding: 7442, rate: 0.22 },
    { threshold: 117250, baseWithholding: 15912, rate: 0.24 },
    { threshold: 211200, baseWithholding: 38460, rate: 0.32 },
    { threshold: 264400, baseWithholding: 55484, rate: 0.35 },
    { threshold: 640250, baseWithholding: 187031.5, rate: 0.37 }
  ]
};

// Annual Multiple Jobs Withholding Tables (IRS Publication 15-T Step 2(c) Method)
// Higher withholding rates for multiple jobs or working spouse scenarios
export const ANNUAL_MULTIPLE_JOBS_WITHHOLDING = {
  single: [
    { threshold: 0, baseWithholding: 0, rate: 0 },
    { threshold: 7500, baseWithholding: 0, rate: 0.10 },
    { threshold: 13463, baseWithholding: 596.25, rate: 0.12 },
    { threshold: 31738, baseWithholding: 2789.25, rate: 0.22 },
    { threshold: 59175, baseWithholding: 8825.5, rate: 0.24 },
    { threshold: 106150, baseWithholding: 20099.5, rate: 0.32 },
    { threshold: 132763, baseWithholding: 28615.50, rate: 0.35 },
    { threshold: 320675, baseWithholding: 94354.88, rate: 0.37 }
  ],
  marriedJointly: [
    { threshold: 0, baseWithholding: 0, rate: 0 },
    { threshold: 15000, baseWithholding: 0, rate: 0.10 },
    { threshold: 26925, baseWithholding: 1182.5, rate: 0.12 },
    { threshold: 63475, baseWithholding: 5578.5, rate: 0.22 },
    { threshold: 118350, baseWithholding: 17651, rate: 0.24 },
    { threshold: 212300, baseWithholding: 40199, rate: 0.32 },
    { threshold: 265525, baseWithholding: 57231, rate: 0.35 },
    { threshold: 390800, baseWithholding: 101077.25, rate: 0.37 }
  ],
  marriedSeparately: [
    { threshold: 0, baseWithholding: 0, rate: 0 },
    { threshold: 7500, baseWithholding: 0, rate: 0.10 },
    { threshold: 13463, baseWithholding: 596.25, rate: 0.12 },
    { threshold: 31738, baseWithholding: 2789.25, rate: 0.22 },
    { threshold: 59175, baseWithholding: 8825.5, rate: 0.24 },
    { threshold: 106150, baseWithholding: 20099.5, rate: 0.32 },
    { threshold: 132763, baseWithholding: 28615.50, rate: 0.35 },
    { threshold: 320675, baseWithholding: 94354.88, rate: 0.37 }
  ],
  headOfHousehold: [
    { threshold: 0, baseWithholding: 0, rate: 0 },
    { threshold: 11250, baseWithholding: 0, rate: 0.10 },
    { threshold: 19750, baseWithholding: 850, rate: 0.12 },
    { threshold: 43675, baseWithholding: 3272, rate: 0.22 },
    { threshold: 62925, baseWithholding: 7956, rate: 0.24 },
    { threshold: 109000, baseWithholding: 19230, rate: 0.32 },
    { threshold: 136500, baseWithholding: 27742, rate: 0.35 },
    { threshold: 324425, baseWithholding: 93515.75, rate: 0.37 }
  ]
};

// Standard Deductions (IRS Publication 15-T)
export const STANDARD_DEDUCTIONS = {
  single: 15000,
  marriedJointly: 30000,
  marriedSeparately: 15000,
  headOfHousehold: 22500
};

// Social Security and Medicare rates
export const PAYROLL_TAX_RATES = {
  socialSecurity: 0.062, // 6.2%
  medicare: 0.0145 // 1.45%
};

// 401k contribution limits
export const CONTRIBUTION_LIMITS = {
  k401_employee: 23500,
  k401_catchUp: 7500, 
  k401_total: 70000, 
  hsa_self: 4300, 
  hsa_family: 8550, 
  hsa_catchUp: 1000, 
  ira_self: 7000, 
  ira_catchUp: 1000 
};

// W-4 Form configurations
export const W4_CONFIGS = {
  new: {
    name: "2020+ W-4 Form",
    allowances: false,
    extraWithholding: true,
    dependentCredits: true
  },
  old: {
    name: "2019 and Earlier W-4 Form", 
    allowances: true,
    extraWithholding: true,
    dependentCredits: false
  }
};

// Tax credits for new W-4 (2020+)
export const TAX_CREDITS = {
  childTaxCredit: 2000, 
  otherDependentCredit: 500 
};

// Allowance amount for old W-4 (2019 and earlier)
export const ALLOWANCE_AMOUNT = 4850;

// Pay period configurations
export const PAY_PERIODS = {
  weekly: {
    name: "Weekly",
    periodsPerYear: 52
  },
  biWeekly: {
    name: "Bi-Weekly",
    periodsPerYear: 26
  },
  semiMonthly: {
    name: "Semi-Monthly",
    periodsPerYear: 24
  },
  monthly: {
    name: "Monthly",
    periodsPerYear: 12
  }
};