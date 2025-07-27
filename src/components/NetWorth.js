import React from 'react';
import Navigation from './Navigation';

const NetWorth = () => {
  return (
    <>
      <Navigation />
      <div className="app-container">
        <div className="header">
          <h1>📊 Net Worth Dashboard</h1>
          <p>Track your financial progress over time</p>
        </div>
        <div style={{
          margin: '60px auto',
          textAlign: 'center',
          fontSize: '2rem',
          color: '#64748b',
          fontWeight: 500
        }}>
          🚧 Coming Soon 🚧
        </div>
      </div>
    </>
  );
};

export default NetWorth;
