import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PaycheckBudgetProvider } from './context/PaycheckBudgetContext';
import Welcome from './components/Welcome';
import Budget from './components/Budget';
import PaycheckCalculator from './components/PaycheckCalculator';
import RawData from './components/RawData';
import LiquidAssets from './components/LiquidAssets';
import NetWorth from './components/NetWorth';
import Account from './components/Account';
import Savings from './components/Savings';
import Contributions from './components/Contributions';
import Retirement from './components/Retirement';
import Assets from './components/Assets';
import Liabilities from './components/Liabilities';
import PrimaryHome from './components/PrimaryHome';
import TaxConstantsEditor from './components/TaxConstantsEditor';

function App() {
  return (
    <Router>
      <PaycheckBudgetProvider>
        <div className="App">
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/paycheck" element={<PaycheckCalculator />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/savings" element={<Savings />} />
            <Route path="/contributions" element={<Contributions />} />
            <Route path="/raw-data" element={<RawData />} />
            <Route path="/networth" element={<NetWorth />} />
            <Route path="/performance" element={<Account />} />
            <Route path="/retirement" element={<Retirement />} />
            <Route path="/other-assets" element={<Assets />} />
            <Route path="/liabilities" element={<Liabilities />} />
            <Route path="/primary-home" element={<PrimaryHome />} />
            <Route path="/liquid-assets" element={<LiquidAssets />} />
            <Route path="/tax-constants" element={<TaxConstantsEditor />} />
          </Routes>
        </div>
      </PaycheckBudgetProvider>
    </Router>
  );
}

export default App;