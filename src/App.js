import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FormProvider } from './context/FormContext';
import Welcome from './components/Welcome';
import Budget from './components/Budget';
import TaxCalculator from './components/TaxCalculator';
import RawData from './components/RawData';
import LiquidAssets from './components/LiquidAssets';
import NetWorth from './components/NetWorth';
import Performance from './components/Performance';
import Savings from './components/Savings';
import Contributions from './components/Contributions';
import Retirement from './components/Retirement';
import Assets from './components/Assets';
import Liabilities from './components/Liabilities';
import PrimaryHome from './components/PrimaryHome';

function App() {
  return (
    <Router>
      <FormProvider>
        <div className="App">
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/paycheck" element={<TaxCalculator />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/savings" element={<Savings />} />
            <Route path="/contributions" element={<Contributions />} />
            <Route path="/raw-data" element={<RawData />} />
            <Route path="/networth" element={<NetWorth />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/retirement" element={<Retirement />} />
            <Route path="/other-assets" element={<Assets />} />
            <Route path="/liabilities" element={<Liabilities />} />
            <Route path="/primary-home" element={<PrimaryHome />} />
            <Route path="/liquid-assets" element={<LiquidAssets />} />
          </Routes>
        </div>
      </FormProvider>
    </Router>
  );
}

export default App;