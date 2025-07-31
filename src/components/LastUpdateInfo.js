import React from 'react';
import { getLastPortfolioUpdate } from '../utils/localStorage';

const LastUpdateInfo = ({ className = '', showDetails = true, compact = false }) => {
  const updateInfo = getLastPortfolioUpdate();

  if (!updateInfo.hasData) {
    return (
      <div className={`last-update-info no-data ${className}`}>
        <div className="last-update-icon">📊</div>
        <div className="last-update-content">
          <div className="last-update-title">Liquid Assets Data Status</div>
          <div className="last-update-message">No Liquid Assets data updates yet</div>
          <div className="last-update-action">
            Go to the <a href="/liquid-assets">Liquid Assets page</a> to add your first investment data update.
          </div>
        </div>
      </div>
    );
  }

  const formatDateTime = (dateString, syncTimestamp) => {
    if (!dateString) return 'Unknown';
    
    try {
      // Use sync timestamp if available for more precision, otherwise fall back to date
      const date = syncTimestamp ? new Date(syncTimestamp) : new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      // Format relative time
      let relativeTime;
      if (diffMinutes < 1) {
        relativeTime = 'Just now';
      } else if (diffMinutes < 60) {
        relativeTime = `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        relativeTime = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else if (diffDays === 1) {
        relativeTime = 'Yesterday';
      } else if (diffDays < 7) {
        relativeTime = `${diffDays} days ago`;
      } else {
        relativeTime = date.toLocaleDateString();
      }
      
      // Format absolute time
      const absoluteTime = date.toLocaleString();
      
      return { relativeTime, absoluteTime };
    } catch (error) {
      return { relativeTime: 'Unknown', absoluteTime: 'Unknown' };
    }
  };

  const { lastAnyUpdate, lastBalanceUpdate, lastDetailedUpdate } = updateInfo;
  const lastUpdateTime = formatDateTime(lastAnyUpdate.date, lastAnyUpdate.syncTimestamp);

  if (compact) {
    return (
      <div className={`last-update-info compact ${className}`}>
        <div className="last-update-compact-content">
          <span className="last-update-icon">📊</span>
          <span className="last-update-text">
            Liquid Assets last updated: <strong>{lastUpdateTime.relativeTime}</strong>
            {lastAnyUpdate.syncMode === 'detailed' ? ' (Detailed)' : ' (Balance Only)'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`last-update-info ${className}`}>
      <div className="last-update-header">
        <div className="last-update-icon">📊</div>
        <div className="last-update-title">Liquid Assets Data Status</div>
      </div>
      
      <div className="last-update-content">
        <div className="last-update-primary">
          <div className="last-update-label">Last Updated:</div>
          <div className="last-update-value">
            <span className="last-update-time" title={lastUpdateTime.absoluteTime}>
              {lastUpdateTime.relativeTime}
            </span>
            <span className={`last-update-mode ${lastAnyUpdate.syncMode}`}>
              {lastAnyUpdate.syncMode === 'detailed' ? '📊 Detailed Update' : '⚡ Balance Only Update'}
            </span>
          </div>
        </div>

        {showDetails && (
          <div className="last-update-details">
            <div className="last-update-detail-grid">
              {lastBalanceUpdate && (
                <div className="last-update-detail-item">
                  <div className="last-update-detail-label">⚡ Last Balance Update:</div>
                  <div className="last-update-detail-value">
                    {formatDateTime(lastBalanceUpdate.date, lastBalanceUpdate.syncTimestamp).relativeTime}
                    <span className="last-update-accounts">({lastBalanceUpdate.accountsCount} accounts)</span>
                  </div>
                </div>
              )}
              
              {lastDetailedUpdate && (
                <div className="last-update-detail-item">
                  <div className="last-update-detail-label">📊 Last Detailed Update:</div>
                  <div className="last-update-detail-value">
                    {formatDateTime(lastDetailedUpdate.date, lastDetailedUpdate.syncTimestamp).relativeTime}
                    <span className="last-update-accounts">({lastDetailedUpdate.accountsCount} accounts)</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="last-update-note">
              <strong>YTD data reflects information as of {lastAnyUpdate.date}</strong>
              {lastAnyUpdate.syncMode === 'balance-only' && (
                <span className="last-update-warning">
                  • Detailed metrics (contributions, gains, fees) may be from an earlier update
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LastUpdateInfo;