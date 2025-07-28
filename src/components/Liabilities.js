import React from 'react';
import AssetLiabilityManager from './AssetLiabilityManager';

const Liabilities = () => {
  const LIABILITY_TYPES = [
    'Mortgage',
    'Home Equity Loan',
    'Auto Loan',
    'Personal Loan',
    'Student Loan',
    'Credit Card',
    'Business Loan',
    'Medical Debt',
    'Tax Debt',
    'Line of Credit',
    'Other Debt',
    'Family Loan',
    'Other'
  ];

  return (
    <AssetLiabilityManager
      type="Liabilities"
      title="Liabilities Data Update"
      icon="💳"
      description="Input current outstanding balances for loans and other liabilities to update historical data"
      itemTypes={LIABILITY_TYPES}
      historicalField="othLia"
      itemTypeLabel="Liability Type"
      amountLabel="Outstanding Balance"
    />
  );
};

export default Liabilities;