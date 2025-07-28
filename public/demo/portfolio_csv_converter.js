#!/usr/bin/env node

/**
 * Portfolio CSV Direct Importer
 * Converts legacy portfolio CSV format and directly imports into portfolio records
 * Groups all entries from the same date into a single portfolio record
 * 
 * Usage: node portfolio_csv_converter.js
 * - Reads from ./oldrecords.csv
 * - Groups data by date and imports directly into portfolio records
 */

const fs = require('fs');

// Import localStorage utilities to directly add portfolio records
const path = require('path');

// Simple localStorage simulator for Node.js environment
const localStorageData = {};
const localStorage = {
  setItem: (key, value) => {
    localStorageData[key] = value;
  },
  getItem: (key) => {
    return localStorageData[key] || null;
  }
};

// Mock global localStorage for the utility functions
global.localStorage = localStorage;

function parseLegacyPortfolioCSV(csvText) {
  const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
  const results = [];
  let currentDate = null;
  
  console.log(`Processing ${lines.length} lines...`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines and lines with only commas
    if (!line || line.match(/^,*$/)) {
      continue;
    }
    
    // Check if this line is a date header - handle two formats:
    // Format 1: MM/DD/YYYY,percentage,%,"$amount",,Ret Change
    // Format 2: Date:,percentage,% Change,MM/DD/YYYY,
    let dateMatch = line.match(/^(\d{1,2}\/\d{1,2}\/\d{4}),/);
    if (!dateMatch) {
      // Try the 2019 format: Date:,percentage,% Change,MM/DD/YYYY,
      dateMatch = line.match(/^Date:,.*?,.*?,(\d{1,2}\/\d{1,2}\/\d{4}),/);
    }
    
    if (dateMatch) {
      currentDate = dateMatch[1];
      console.log(`Found date: ${currentDate}`);
      continue;
    }
    
    // Check if this is the column header line
    if (line.toLowerCase().includes('investment company') || line.toLowerCase().includes('invesment company')) {
      console.log('Skipping header line');
      continue;
    }
    
    // Parse data rows - handle CSV with quoted values containing commas
    const columns = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        columns.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    columns.push(current.trim()); // Add the last column
    
    // Must have at least 5 columns: Investment Company, Owner, Type, Tax Type, Amount
    if (columns.length >= 5 && columns[0] && columns[1] && columns[2] && columns[3] && columns[4]) {
      const investmentCompany = columns[0];
      const owner = columns[1];
      const type = columns[2];
      const taxType = columns[3];
      let amount = columns[4].replace(/[$"]/g, '').replace(/\s/g, '').replace(/,/g, ''); // Remove currency symbols, quotes, spaces, and commas
      
      // Skip if amount is not a valid number
      if (!amount || isNaN(parseFloat(amount))) {
        console.log(`Skipping invalid amount: ${columns[4]}`);
        continue;
      }
      
      // Map the legacy tax types to current system
      let mappedTaxType = '';
      switch (taxType.toLowerCase()) {
        case 'roth':
          mappedTaxType = 'Tax-Free';
          break;
        case 'trad':
        case 'traditional':
          mappedTaxType = 'Tax-Deferred';
          break;
        case 'after-tax':
        case 'aftertax':
          mappedTaxType = 'After-Tax';
          break;
        case 'hsa':
        case 'not taxed':
          mappedTaxType = 'After-Tax'; // HSA accounts use After-Tax in the system
          break;
        default:
          console.warn(`Unknown tax type: ${taxType}, defaulting to After-Tax`);
          mappedTaxType = 'After-Tax';
      }
      
      // Map account types from the legacy 'Type' field
      let mappedAccountType = '';
      const lowerType = type.toLowerCase();
      if (lowerType.includes('401k') || lowerType.includes('401(k)')) {
        mappedAccountType = '401k';
      } else if (lowerType.includes('ira')) {
        mappedAccountType = 'IRA';
      } else if (lowerType.includes('brokerage')) {
        mappedAccountType = 'Brokerage';
      } else if (lowerType.includes('hsa')) {
        mappedAccountType = 'HSA';
      } else if (lowerType.includes('espp')) {
        mappedAccountType = 'ESPP';
      } else if (lowerType.includes('403b')) {
        mappedAccountType = '401k'; // Map 403b to 401k as they're similar
      } else if (lowerType.includes('profit sharing')) {
        mappedAccountType = '401k'; // Map profit sharing to 401k
      } else if (lowerType.includes('rollover')) {
        mappedAccountType = '401k-Rollover';
      } else if (lowerType.includes('employer') || lowerType.includes('match')) {
        mappedAccountType = '401k-EmployerMatch';
      } else {
        console.warn(`Unknown account type: ${type}, defaulting to Brokerage`);
        mappedAccountType = 'Brokerage';
      }
      
      // Convert date format from MM/DD/YYYY to YYYY-MM-DD
      let formattedDate = currentDate;
      if (currentDate) {
        const dateParts = currentDate.split('/');
        if (dateParts.length === 3) {
          const month = dateParts[0].padStart(2, '0');
          const day = dateParts[1].padStart(2, '0');
          const year = dateParts[2];
          formattedDate = `${year}-${month}-${day}`;
        }
      } else {
        console.warn(`No currentDate found for record: ${investmentCompany} - ${owner}`);
      }
      
      results.push({
        accountName: investmentCompany, // Map Investment Company to AccountName
        owner: owner,
        taxType: mappedTaxType,
        accountType: mappedAccountType,
        amount: amount,
        updateDate: formattedDate || new Date().toISOString().split('T')[0]
      });
      
      console.log(`Processed: ${investmentCompany} - ${owner} - ${mappedAccountType} - $${amount}`);
    }
  }
  
  return results;
}

// Utility functions to directly manipulate localStorage (adapted from localStorage.js)
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getPortfolioRecords() {
  const data = localStorage.getItem('portfolioRecords');
  return data ? JSON.parse(data) : [];
}

function addPortfolioRecord(accounts, recordDate = null) {
  const records = getPortfolioRecords();
  const updateDate = recordDate || new Date().toISOString();
  
  // Parse date correctly to avoid timezone issues
  const dateForTimestamp = updateDate.includes('T') ? new Date(updateDate) : new Date(updateDate + 'T12:00:00');
  
  const newRecord = {
    id: generateUniqueId(),
    updateDate: updateDate,
    timestamp: dateForTimestamp.getTime(), // For sorting
    year: dateForTimestamp.getFullYear(),
    month: dateForTimestamp.getMonth() + 1,
    accountsCount: accounts.length,
    accounts: accounts.map(acc => ({
      accountName: acc.accountName,
      owner: acc.owner,
      taxType: acc.taxType,
      accountType: acc.accountType,
      amount: parseFloat(acc.amount) || 0,
      updateDate: updateDate
    })),
    totals: {
      taxFree: 0,
      taxDeferred: 0,
      brokerage: 0,
      hsa: 0,
      espp: 0
    }
  };

  // Calculate totals using consistent logic
  newRecord.accounts.forEach(acc => {
    const amount = acc.amount || 0;
    
    // Use account type first for special accounts, then fall back to tax type
    if (acc.accountType === 'ESPP') {
      newRecord.totals.espp += amount;
    } else if (acc.accountType === 'HSA') {
      newRecord.totals.hsa += amount;
    } else {
      // Map by tax type for regular accounts
      switch (acc.taxType) {
        case 'Tax-Free':
          newRecord.totals.taxFree += amount;
          break;
        case 'Tax-Deferred':
          newRecord.totals.taxDeferred += amount;
          break;
        case 'After-Tax':
        case 'Roth':
          newRecord.totals.brokerage += amount;
          break;
      }
    }
  });

  // Calculate total amount
  newRecord.totalAmount = Object.values(newRecord.totals).reduce((sum, val) => sum + val, 0);
  
  records.push(newRecord);
  localStorage.setItem('portfolioRecords', JSON.stringify(records));
  
  console.log(`Added portfolio record for ${updateDate} with ${accounts.length} accounts, total: $${newRecord.totalAmount.toLocaleString()}`);
  return newRecord;
}

console.log('Portfolio CSV Direct Importer');
console.log('=============================');
console.log('This script will read oldrecords.csv and import portfolio records grouped by date.');
console.log('');

// Read the CSV file
const csvFilePath = './oldrecords.csv';

if (!fs.existsSync(csvFilePath)) {
  console.error(`Error: ${csvFilePath} not found.`);
  console.log('Please make sure the oldrecords.csv file is in the current directory.');
  process.exit(1);
}

console.log(`Reading CSV data from ${csvFilePath}...`);

try {
  const csvInput = fs.readFileSync(csvFilePath, 'utf8');
  
  if (!csvInput.trim()) {
    console.error('Error: CSV file is empty.');
    process.exit(1);
  }
  
  console.log('Processing CSV data...');
  
  const parsed = parseLegacyPortfolioCSV(csvInput);
  
  if (parsed.length === 0) {
    console.error('No valid portfolio data found in the CSV.');
    process.exit(1);
  }
  
  console.log(`\nSuccessfully parsed ${parsed.length} portfolio records.`);
  
  // Group by date
  const dateGroups = {};
  parsed.forEach(record => {
    const date = record.updateDate;
    if (!dateGroups[date]) {
      dateGroups[date] = [];
    }
    dateGroups[date].push(record);
  });
  
  console.log(`\nData spans ${Object.keys(dateGroups).length} different dates:`);
  Object.entries(dateGroups).forEach(([date, records]) => {
    const total = records.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    console.log(`  ${date}: ${records.length} accounts, total: $${total.toLocaleString()}`);
  });
  
  console.log('\nImporting portfolio records...');
  
  // Create portfolio records for each date group
  const sortedDates = Object.keys(dateGroups).sort((a, b) => {
    // Simple string comparison for YYYY-MM-DD format works correctly
    return a.localeCompare(b);
  });
  let importedRecords = 0;
  
  sortedDates.forEach(date => {
    const accounts = dateGroups[date];
    addPortfolioRecord(accounts, date);
    importedRecords++;
  });
  
  console.log(`\n✅ Successfully imported ${importedRecords} portfolio records!`);
  
  // Save the localStorage data to a JSON file for manual import
  const outputData = {
    portfolioRecords: JSON.parse(localStorage.getItem('portfolioRecords'))
  };
  
  const outputFilename = `portfolio_records_${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(outputFilename, JSON.stringify(outputData, null, 2));
  
  console.log(`\nPortfolio records saved to: ${outputFilename}`);
  console.log('\nTo import into your application:');
  console.log('1. Open your Personal Finance app');
  console.log('2. Open browser Developer Tools (F12)');
  console.log('3. Go to Application/Storage -> Local Storage');
  console.log(`4. Set the "portfolioRecords" key to the content from ${outputFilename}`);
  console.log('5. Refresh the Portfolio page to see your imported records');
  
  // Show summary of imported records
  console.log('\nImported records summary:');
  console.log('========================');
  sortedDates.forEach(date => {
    const accounts = dateGroups[date];
    const total = accounts.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    console.log(`${date}: ${accounts.length} accounts, total: $${total.toLocaleString()}`);
    
    // Show first few accounts for this date
    const sampleAccounts = accounts.slice(0, 3);
    sampleAccounts.forEach(account => {
      console.log(`  • ${account.accountName} (${account.owner}) - ${account.accountType} - $${parseFloat(account.amount).toLocaleString()}`);
    });
    if (accounts.length > 3) {
      console.log(`  ... and ${accounts.length - 3} more accounts`);
    }
    console.log('');
  });
  
} catch (error) {
  console.error('Error processing CSV:', error.message);
  process.exit(1);
}