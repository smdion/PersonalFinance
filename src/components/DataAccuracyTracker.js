import React, { useState, useEffect } from 'react';
import { 
  updatePerformanceDataAccuracy, 
  isPerformanceDataAccurate, 
  getSyncStatus 
} from '../utils/portfolioPerformanceSync';
import { getPaycheckData } from '../utils/localStorage';

const DataAccuracyTracker = ({ onAccuracyUpdate }) => {
  const [users, setUsers] = useState([]);
  const [accuracyData, setAccuracyData] = useState({});
  const [syncStatus, setSyncStatus] = useState({});
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAccountType, setSelectedAccountType] = useState('');
  const [notes, setNotes] = useState('');

  const ACCOUNT_TYPES = ['IRA', 'Brokerage', '401k', 'ESPP', 'HSA'];

  useEffect(() => {
    loadUserData();
    loadAccuracyData();
    loadSyncStatus();
  }, []);

  const loadUserData = () => {
    const paycheckData = getPaycheckData();
    const userList = [];
    
    if (paycheckData?.your?.name?.trim()) {
      userList.push(paycheckData.your.name.trim());
    }
    if (paycheckData?.spouse?.name?.trim() && (paycheckData?.settings?.showSpouseCalculator ?? true)) {
      userList.push(paycheckData.spouse.name.trim());
    }
    
    // Add Joint as an option
    if (!userList.includes('Joint')) {
      userList.push('Joint');
    }

    setUsers(userList);
    if (userList.length > 0 && !selectedUser) {
      setSelectedUser(userList[0]);
    }
  };

  const loadAccuracyData = () => {
    const accuracy = {};
    users.forEach(user => {
      ACCOUNT_TYPES.forEach(accountType => {
        const result = isPerformanceDataAccurate(user, accountType);
        accuracy[`${user}-${accountType}`] = result;
      });
    });
    setAccuracyData(accuracy);
  };

  const loadSyncStatus = () => {
    const status = getSyncStatus();
    setSyncStatus(status);
  };

  const handleMarkAccurate = () => {
    if (!selectedUser || !selectedAccountType) {
      alert('Please select both a user and account type');
      return;
    }

    const success = updatePerformanceDataAccuracy(selectedUser, selectedAccountType, {
      isAccurate: true,
      source: 'manual',
      notes: notes.trim()
    });

    if (success) {
      loadAccuracyData();
      setNotes('');
      if (onAccuracyUpdate) {
        onAccuracyUpdate({ user: selectedUser, accountType: selectedAccountType, isAccurate: true });
      }
    } else {
      alert('Failed to update accuracy data. Make sure there is performance data for this user/account type.');
    }
  };

  const handleMarkOutdated = () => {
    if (!selectedUser || !selectedAccountType) {
      alert('Please select both a user and account type');
      return;
    }

    const success = updatePerformanceDataAccuracy(selectedUser, selectedAccountType, {
      isAccurate: false,
      source: 'manual',
      notes: notes.trim() || 'Marked as outdated'
    });

    if (success) {
      loadAccuracyData();
      setNotes('');
      if (onAccuracyUpdate) {
        onAccuracyUpdate({ user: selectedUser, accountType: selectedAccountType, isAccurate: false });
      }
    }
  };

  const formatLastUpdated = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffHours < 24 * 7) return `${Math.floor(diffHours / 24)} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="data-accuracy-tracker">
      <div className="accuracy-header">
        <h3>📊 Data Accuracy Tracking</h3>
        <p className="accuracy-subtitle">
          Track when your non-balance performance data (contributions, gains, etc.) is up to date.
          Portfolio balances are automatically synced, but other fields need manual accuracy tracking.
        </p>
      </div>

      {/* Sync Status */}
      <div className="sync-status">
        <div className="sync-status-item">
          <span className="status-label">Portfolio Sync:</span>
          <span className="status-value">
            {syncStatus.lastSyncTime && !isNaN(syncStatus.lastSyncTime) ? 
              `Last synced ${formatLastUpdated(new Date(syncStatus.lastSyncTime).toISOString())}` : 
              'Not synced yet'}
          </span>
        </div>
        <div className="sync-status-item">
          <span className="status-label">Accounts (Latest Record):</span>
          <span className="status-value">
            {syncStatus.mostRecentPortfolioCount || 0} from portfolio 
            {syncStatus.mostRecentPortfolioDate && ` (${syncStatus.mostRecentPortfolioDate})`}
          </span>
        </div>
        <div className="sync-status-item">
          <span className="status-label">Performance Entries:</span>
          <span className="status-value">
            {syncStatus.performanceAccounts || 0} account types tracked
          </span>
        </div>
      </div>

      {/* Accuracy Controls */}
      <div className="accuracy-controls">
        <h4>Mark Data Accuracy</h4>
        <div className="accuracy-form">
          <div className="form-row">
            <div className="form-group">
              <label>User:</label>
              <select 
                value={selectedUser} 
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="">Select User</option>
                {users.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Account Type:</label>
              <select 
                value={selectedAccountType} 
                onChange={(e) => setSelectedAccountType(e.target.value)}
              >
                <option value="">Select Account Type</option>
                {ACCOUNT_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Notes (optional):</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Updated from Fidelity website"
            />
          </div>
          <div className="form-actions">
            <button 
              type="button" 
              onClick={handleMarkAccurate}
              className="btn-primary"
              disabled={!selectedUser || !selectedAccountType}
            >
              ✅ Mark as Accurate
            </button>
            <button 
              type="button" 
              onClick={handleMarkOutdated}
              className="btn-secondary"
              disabled={!selectedUser || !selectedAccountType}
            >
              ⏰ Mark as Outdated
            </button>
          </div>
        </div>
      </div>

      {/* Accuracy Status Table */}
      <div className="accuracy-status">
        <h4>Current Accuracy Status</h4>
        <div className="accuracy-table-wrapper">
          <table className="accuracy-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Account Type</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user =>
                ACCOUNT_TYPES.map(accountType => {
                  const key = `${user}-${accountType}`;
                  const accuracy = accuracyData[key];
                  
                  if (!accuracy) return null;
                  
                  return (
                    <tr key={key}>
                      <td>{user}</td>
                      <td>{accountType}</td>
                      <td>
                        <span className={`accuracy-status-badge ${accuracy.isAccurate ? 'accurate' : 'outdated'}`}>
                          {accuracy.isAccurate ? '✅ Accurate' : '⏰ Outdated'}
                        </span>
                      </td>
                      <td>{formatLastUpdated(accuracy.lastUpdated)}</td>
                      <td className="accuracy-notes">
                        {accuracy.notes || accuracy.reason || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .data-accuracy-tracker {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 1.5rem;
          margin: 1.5rem 0;
        }

        .accuracy-header h3 {
          margin: 0 0 0.5rem 0;
          color: #495057;
        }

        .accuracy-subtitle {
          color: #6c757d;
          font-size: 0.9rem;
          margin: 0 0 1rem 0;
        }

        .sync-status {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 1rem;
          margin: 1rem 0;
        }

        .sync-status-item {
          display: flex;
          justify-content: space-between;
          margin: 0.5rem 0;
        }

        .status-label {
          font-weight: 500;
        }

        .status-value {
          color: #6c757d;
        }

        .accuracy-controls {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 1rem;
          margin: 1rem 0;
        }

        .accuracy-controls h4 {
          margin: 0 0 1rem 0;
          color: #495057;
        }

        .form-row {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .form-group {
          flex: 1;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.25rem;
          font-weight: 500;
          color: #495057;
        }

        .form-group select,
        .form-group input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        .btn-primary,
        .btn-secondary {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .btn-primary {
          background: #28a745;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #218838;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #5a6268;
        }

        .btn-primary:disabled,
        .btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .accuracy-status {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 1rem;
        }

        .accuracy-status h4 {
          margin: 0 0 1rem 0;
          color: #495057;
        }

        .accuracy-table-wrapper {
          overflow-x: auto;
        }

        .accuracy-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }

        .accuracy-table th,
        .accuracy-table td {
          padding: 0.5rem;
          text-align: left;
          border-bottom: 1px solid #dee2e6;
        }

        .accuracy-table th {
          background: #f8f9fa;
          font-weight: 500;
        }

        .accuracy-status-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .accuracy-status-badge.accurate {
          background: #d4edda;
          color: #155724;
        }

        .accuracy-status-badge.outdated {
          background: #fff3cd;
          color: #856404;
        }

        .accuracy-notes {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
};

export default DataAccuracyTracker;