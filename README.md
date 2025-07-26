# Personal Finance Calculator Suite

A comprehensive web-based financial planning application that helps you calculate take-home pay, plan budgets, track account performance, analyze historical data, and visualize your financial progress.

## 🎯 Quick Start with Demo Data

**New to the app? Try our demo data first!** Experience all features instantly with realistic sample data:

### What's Included in Demo Data
- **Dual Income Household**: Jordan ($85k) & Alex ($72k) with realistic tax withholdings
- **Complete Budget**: 12 categories with 35+ budget items covering all aspects of life
- **10 Years of Financial History**: Historical data from 2015-2025 showing wealth progression
- **Net Worth Growth**: Journey from -$10k to $675k net worth over the decade
- **Interactive Charts**: Ready-to-explore visualizations and analytics

### How to Load Demo Data

#### Method 1: From Welcome Page
1. Visit the app homepage
2. Click the prominent "🚀 Load Demo Data & Explore" button
3. Confirm to load the data and refresh the page

#### Method 2: From Settings Menu
1. Click the "⚙️ Settings" button in the top navigation
2. Select "🎯 Load Demo Data"
3. Confirm to replace current data with demo data

### After Loading Demo Data
- Explore the **Paycheck Calculator** to see dual income setup
- Check the **Budget Planner** to see a comprehensive household budget
- Visit **Historical Data** to see 10 years of financial progression
- Use the **Net Worth Dashboard** to explore interactive charts
- Try editing values to see real-time updates across all tools

## Features

### 💼 Paycheck Calculator
- **2025 Tax Accuracy**: Uses current federal tax brackets and withholding tables
- **Dual Income Support**: Calculate for both spouses with combined household view
- **Comprehensive Deductions**: 401k (Traditional & Roth), HSA, medical insurance, ESPP
- **W-4 Configuration**: Supports both new (2020+) and old (2019-) W-4 forms
- **Bonus Planning**: Calculate expected bonuses with tax implications
- **Extra Paycheck Planning**: Automatic calculation of 3-paycheck months for bi-weekly schedules

### 💰 Budget Planner
- **Auto-Sync Income**: Automatically uses calculated take-home pay from paycheck calculator
- **Three Budget Modes**: Standard, Tight, and Emergency budget scenarios
- **Drag & Drop Interface**: Reorder budget categories with intuitive drag-and-drop
- **Auto-Managed Categories**: Budget-impacting contributions sync automatically
- **Extra Paycheck Integration**: Plan for months with additional paychecks

### 📈 Performance Tracker
- **Account Tracking**: Monitor individual 401k, IRA, HSA, and brokerage accounts
- **Performance Analytics**: Track balances, contributions, gains/losses, and ROI
- **Multiple Account Types**: Support for 12+ account types with proper categorization
- **CSV Import/Export**: Bulk import account data and export for analysis
- **Visual Summaries**: Portfolio overview with category breakdowns and performance metrics

### 📊 Historical Data Tracker
- **Year-over-Year Tracking**: Record and compare financial metrics across multiple years
- **Comprehensive Metrics**: Track 20+ financial indicators including income, taxes, and net worth
- **CSV Import/Export**: Bulk data import and export functionality
- **Employer Tracking**: Monitor career progression and employer changes
- **Data Validation**: Built-in validation for consistent data entry

### 📈 Net Worth Dashboard
- **Interactive Charts**: Visualize financial progress with bar charts, line charts, and pie charts
- **Multi-Year Comparison**: Compare selected years side-by-side
- **Growth Analytics**: Calculate CAGR and year-over-year growth rates
- **Asset Breakdown**: Pie chart visualization of asset allocation
- **Key Metrics**: Summary cards showing latest net worth, growth rates, and tracking duration

## Technology Stack

- **Frontend**: React 18, React Router DOM
- **Styling**: Custom CSS with responsive design
- **State Management**: React Context API
- **Data Persistence**: Browser localStorage
- **Charts**: Custom SVG-based chart components
- **Drag & Drop**: react-beautiful-dnd
- **File Handling**: CSV import/export functionality

## Getting Started

### Run Locally

#### Main Environment (Port 3000)
1. **Clone the repository**
   ```bash
   git clone --branch main https://github.com/smdion/PersonalFinance.git
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run start:main
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

#### Development Environment (Port 3001)
1. **Clone the repository**
   ```bash
   git clone --branch dev https://github.com/smdion/PersonalFinance.git
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run start:dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3001`

## Usage Guide

### Getting Started with Demo Data
1. **Load Demo Data**: Click the demo data button on the welcome page
2. **Explore Features**: Navigate through all sections to see how they work together
3. **Modify Data**: Try changing values to see real-time updates
4. **Export for Backup**: Use Settings → Export to save the demo data for reference
5. **Start Fresh**: Use Settings → Reset All Data when ready to input your own information

### Setting Up Your Own Data

#### Setting Up Your Paycheck Calculator
1. Enter your basic information (name, employer, birthday, salary)
2. Configure your tax settings (filing status, W-4 options)
3. Set up retirement contributions (401k percentages)
4. Add medical deductions (insurance, HSA contributions)
5. Include post-tax deductions (ESPP)
6. Configure budget-impacting contributions (IRA, brokerage accounts)
7. Set up bonus expectations

#### Creating Your Budget
1. The Budget Planner automatically syncs your calculated take-home pay
2. Add budget categories and items
3. Set amounts for Standard, Tight, and Emergency budget modes
4. Use drag & drop to reorder categories by priority
5. Monitor remaining income to ensure you're not over budget

#### Tracking Account Performance
1. Add your investment accounts (401k, IRA, HSA, brokerage)
2. Record periodic entries with balances, contributions, and gains/losses
3. Monitor ROI and total returns for each account
4. Use CSV import for bulk data entry
5. View portfolio summaries and category breakdowns

#### Recording Historical Data
1. Add yearly financial snapshots
2. Include income, taxes, assets, liabilities, and employer information
3. Use CSV templates for bulk import
4. Track progression over multiple years

#### Analyzing Your Progress
1. Use the Net Worth Dashboard to visualize trends
2. Compare multiple years to see growth patterns
3. Analyze asset allocation with pie charts
4. Calculate compound annual growth rates (CAGR)

## Data Management

### Import/Export Features
- **Full Data Export**: Export all app data as JSON for backup
- **Selective Import**: Import specific sections without affecting others
- **CSV Templates**: Download templates for bulk data entry
- **Demo Data**: Pre-loaded realistic sample data for exploration

### Privacy & Security
- **Local Storage Only**: All data stored locally in your browser
- **No Server Communication**: Your financial data never leaves your device
- **No Tracking**: No analytics or user tracking implemented
- **Full Control**: Export, import, or delete your data at any time

### Backup Recommendations
1. **Regular Exports**: Export your data monthly or after major updates
2. **Multiple Copies**: Keep backup files in different locations
3. **Before Updates**: Export data before making significant changes
4. **Demo Testing**: Use demo data to test features before applying to real data

## Advanced Features

### Household Financial Planning
- **Dual Income Calculation**: Separate calculators for each spouse
- **Combined Budgeting**: Unified budget planning with individual contributions
- **Joint Tax Planning**: Married filing jointly with proper withholding calculations
- **Coordinated Savings**: Track individual and joint savings goals

### Tax Optimization Features
- **2025 Tax Compliance**: Current year tax brackets and limits
- **Multiple Jobs Support**: Proper withholding for complex tax situations
- **HSA Optimization**: Family vs. individual coverage coordination
- **Retirement Contribution Optimization**: Maximize tax-advantaged savings

### Long-term Financial Tracking
- **Multi-Year Analysis**: Track financial progress over decades
- **Growth Rate Calculations**: CAGR and year-over-year growth metrics
- **Goal Tracking**: Monitor progress toward financial milestones
- **Trend Analysis**: Identify patterns in income, expenses, and net worth

## Demo Data Details

The demo data represents "Jordan and Alex", a married couple with:

### Income & Employment
- **Jordan**: $85k at TechCorp, 8% Roth 401k, monthly $500 Roth IRA
- **Alex**: $72k at FinanceInc, 12% Traditional 401k, 5% ESPP, monthly $500 Roth IRA
- **Combined Take-Home**: ~$8,004/month after all deductions and taxes

### Budget Breakdown
- **Fixed Expenses**: Housing ($2,150), Insurance ($340), Utilities ($435)
- **Variable Expenses**: Food ($725), Transportation ($220), Personal Care ($400)
- **Savings Goals**: Emergency Fund ($800), Car Replacement ($250), Vacation ($300)
- **Total Budget**: ~$7,500/month with $500+ remaining for flexibility

### Financial History (2015-2025)
- **Starting Point**: 2015 with $83k income, -$10k net worth (student loans)
- **Home Purchase**: 2018 with $275k house, $220k mortgage
- **Steady Growth**: Consistent 3-5% salary increases and debt reduction
- **Current Status**: 2025 with $157k income, $675k net worth
- **Asset Mix**: $495k retirement, $120k home equity, $60k cash/investments

### Key Metrics from Demo Data
- **10-Year CAGR**: 15.2% net worth growth
- **Savings Rate**: ~25% of gross income
- **Debt Reduction**: $220k to $120k mortgage (paid extra)
- **Retirement Progress**: On track for financial independence

## Troubleshooting

### Common Issues
- **Demo Data Not Loading**: Check browser console for errors, try refreshing
- **Calculations Not Updating**: Ensure all required fields are filled
- **Charts Not Displaying**: Verify historical data exists for selected years
- **Import Failing**: Check JSON file format matches export structure

### Data Recovery
- **Lost Data**: Check browser localStorage, export regularly for backup
- **Corrupted Data**: Use Settings → Reset All Data and reimport from backup
- **Version Issues**: Export data before app updates, reimport if needed

### Performance Tips
- **Large Datasets**: Historical data with 10+ years may slow chart rendering
- **Browser Storage**: Export and clear old data if approaching storage limits
- **Mobile Usage**: Landscape mode recommended for charts and detailed views

## Contributing

We welcome contributions! Please see our contributing guidelines for:
- Feature requests and bug reports
- Code contributions and pull requests
- Documentation improvements
- Demo data enhancements

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please:
1. Check this README for common solutions
2. Try the demo data to isolate issues
3. Export your data before troubleshooting
4. Submit issues with detailed reproduction steps
