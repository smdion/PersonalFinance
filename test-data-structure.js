// Quick test to check current data structure
const { getAnnualData, getAccountData } = require('./src/utils/localStorage');

console.log('=== ANNUAL DATA STRUCTURE ===');
const annualData = getAnnualData();
Object.entries(annualData).forEach(([year, yearData]) => {
  console.log(`Year ${year}:`);
  if (yearData.users) {
    console.log('  User keys:', Object.keys(yearData.users));
  }
});

console.log('\n=== ACCOUNT DATA STRUCTURE ===');
const accountData = getAccountData();
Object.entries(accountData).forEach(([entryId, entry]) => {
  console.log(`Entry ${entryId}:`);
  if (entry.users) {
    console.log('  User keys:', Object.keys(entry.users));
  }
});