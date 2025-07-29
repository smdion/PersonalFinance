import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FormProvider } from './context/FormContext';
import Welcome from './components/Welcome';
import BudgetForm from './components/BudgetForm';
import TaxCalculator from './components/TaxCalculator';
import Historical from './components/Historical';
import Performance from './components/Performance';
import Portfolio from './components/Portfolio';
import NetWorth from './components/NetWorth';
import Savings from './components/Savings';
import Optimize from './components/Optimize';
import Retirement from './components/Retirement';
import Assets from './components/Assets';
import Liabilities from './components/Liabilities';

function App() {
  return (
    <Router>
      <FormProvider>
        <div className="App">
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/paycheck" element={<TaxCalculator />} />
            <Route path="/budget" element={<BudgetForm />} />
            <Route path="/savings" element={<Savings />} />
            <Route path="/optimize" element={<Optimize />} />
            <Route path="/historical" element={<Historical />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/networth" element={<NetWorth />} />
            <Route path="/retirement" element={<Retirement />} />
            <Route path="/other-assets" element={<Assets />} />
            <Route path="/liabilities" element={<Liabilities />} />
            <Route path="/portfolio" element={<Portfolio />} />
          </Routes>
        </div>
      </FormProvider>
    </Router>
  );
}

export default App;