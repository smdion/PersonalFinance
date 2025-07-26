# Personal Finance Calculator Suite

A comprehensive, privacy-first financial planning platform that helps you plan, track, and visualize your financial future. Built with React, this suite provides integrated tools for paycheck calculation, budget planning, investment tracking, and wealth visualization—all while keeping your data completely private in your browser.

## 🎯 Overview

The Personal Finance Calculator Suite is designed to be your complete financial command center. Whether you're calculating your take-home pay, planning your monthly budget, tracking investment performance, or visualizing your net worth growth, this platform provides the tools you need in one integrated experience.

### Key Principles
- **Privacy First**: All data is stored locally in your browser using localStorage
- **No Backend Required**: Fully client-side application with no server dependencies
- **Integrated Experience**: Data flows seamlessly between all tools
- **2025 Tax Accuracy**: Uses the latest tax brackets and withholding tables

## 🚀 Features

### 💰 Paycheck Calculator
- **2025 Tax Tables**: Federal and state tax calculations with current brackets
- **Dual Income Support**: Calculate for both spouses simultaneously
- **Comprehensive Deductions**: 401k (traditional/Roth), HSA, FSA, ESPP
- **Bonus Calculations**: Annual bonus projections with tax implications
- **Bi-weekly Pay Options**: Odd/even week scheduling for extra paycheck planning
- **Budget Auto-Sync**: Automatically updates budget planner with calculated income

### 📊 Budget Planner
- **Three Budget Modes**: Standard, Tight, and Emergency budgets
- **Drag & Drop Categories**: Organize and prioritize spending categories
- **Auto-Managed Items**: Syncs with paycheck calculator for IRA/investment contributions
- **Extra Paycheck Planning**: Automatically calculates extra income for bi-weekly earners
- **Visual Analytics**: See spending percentages and remaining income at a glance

### 📈 Historical Data Tracker
- **Multi-User Support**: Track data for multiple household members
- **20+ Financial Metrics**: AGI, effective tax rate, assets, liabilities, and more
- **Year-over-Year Tracking**: Build a comprehensive financial history
- **CSV Import/Export**: Bulk data management with template downloads
- **Employer History**: Track career progression and salary growth

### 💹 Performance Tracker
- **Account Types**: 401k, IRA, HSA, brokerage, ESPP, and more
- **Performance Metrics**: Balance, contributions, gains/losses, ROI calculations
- **Multi-Year Tracking**: See account growth over time
- **Employer Matching**: Track employer contributions separately
- **Fee Tracking**: Monitor investment fees and their impact

### 📊 Net Worth Dashboard
- **Interactive Charts**: Visualize wealth growth with multiple chart types
- **Asset Breakdown**: Pie charts showing asset allocation
- **Growth Analysis**: Calculate CAGR and year-over-year growth rates
- **Trend Comparison**: Compare selected years or view full timeline
- **Liability Tracking**: Monitor debt reduction progress

### 💾 Data Management
- **JSON Export/Import**: Full backup and restore capabilities
- **CSV Support**: Import/export individual tool data via CSV
- **Demo Data**: Instantly explore with realistic sample data
- **Local Storage**: All data persists locally between sessions
- **Reset Options**: Clear data for individual tools or everything

## 🏁 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/smdion/PersonalFinance.git
   cd PersonalFinance/dev
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Open in your browser:**  
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## 💡 Usage Guide

### First-Time Users
1. **Try Demo Data**: Click "Load Demo Data" on the welcome page to explore all features
2. **Export Demo**: Before starting with your own data, export the demo as a reference
3. **Start Fresh**: Use the settings menu to reset all data when ready

### Typical Workflow
1. **Paycheck Calculator**: Enter your income and deductions
2. **Budget Planner**: Your income auto-syncs; add expense categories
3. **Historical Tracker**: Add past years' financial data
4. **Performance Tracker**: Track investment account balances
5. **Net Worth Dashboard**: View your financial progress

### Data Privacy
- No data leaves your browser
- No analytics or tracking
- No user accounts required
- Export your data anytime

## 🛠️ Technical Details

### Built With
- **React** - UI framework
- **React Router** - Navigation
- **React Beautiful DnD** - Drag and drop functionality
- **PapaParse** - CSV parsing
- **Local Storage** - Data persistence

### Project Structure
```
src/
├── components/         # React components
├── context/           # React context providers
├── utils/             # Utility functions
├── config/            # Configuration files
└── index.css          # Global styles
```

### Key Components
- `TaxCalculator.js` - Main paycheck calculator
- `BudgetForm.js` - Budget planning interface
- `Historical.js` - Historical data tracker
- `Performance.js` - Investment performance tracker
- `NetWorthDashboard.js` - Visualization dashboard
- `DataManager.js` - Reusable data management component

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🛟 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/smdion/PersonalFinance/issues)
- **Discussions**: [Ask questions or share ideas](https://github.com/smdion/PersonalFinance/discussions)

## 🗺️ Roadmap

### In Development
- Enhanced data visualization options
- More investment account types
- Custom category templates
- Mobile app version

### Future Plans
- Retirement planning calculators
- Mortgage/loan calculators
- Tax optimization suggestions
- Investment rebalancing tools
- API integrations (optional)

---

**Note**: This is a beta version under active development. Features and interfaces may change. Always export your data regularly as a backup.
