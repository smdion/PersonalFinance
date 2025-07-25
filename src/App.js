import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { FormProvider } from './context/FormContext';
import Welcome from './components/Welcome';
import BudgetForm from './components/BudgetForm';
import PaycheckForm from './components/PaycheckForm';
import Historical from './components/Historical';
import Performance from './components/Performance';
import NetWorth from './components/NetWorth';

function App() {
  return (
    <Router>
      <FormProvider>
        <div className="App">
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/paycheck" element={<PaycheckForm />} />
            <Route path="/budget" element={<BudgetForm />} />
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