import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { FormProvider } from './context/FormContext';
import Welcome from './components/Welcome';
import BudgetForm from './components/BudgetForm';
import TaxCalculator from './components/TaxCalculator';
import Historical from './components/Historical';
import Performance from './components/Performance';
import NetWorth from './components/NetWorth';
import Savings from './components/Savings';
import Optimize from './components/Optimize';

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
          </Routes>
        </div>
      </FormProvider>
    </Router>
  );
}

export default App;