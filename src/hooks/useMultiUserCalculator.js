import { useState, useEffect } from 'react';
import { getPaycheckData, setPaycheckData } from '../utils/localStorage';

/**
 * Hook for managing multi-user calculator state across all components
 * Returns active users and utilities for managing user visibility
 */
export const useMultiUserCalculator = () => {
  const [activeUsers, setActiveUsers] = useState(['user1', 'user2']);

  // Load initial state from localStorage
  useEffect(() => {
    const paycheckData = getPaycheckData();
    const savedActiveUsers = paycheckData?.settings?.activeUsers ?? ['user1', 'user2'];
    setActiveUsers(savedActiveUsers);
  }, []);

  // Listen for user toggle events from navigation
  useEffect(() => {
    const handleToggleMultiUserCalculator = () => {
      setActiveUsers(prev => {
        // Toggle user2 - if active, remove it; if not, add it
        const newActiveUsers = prev.includes('user2') ? ['user1'] : ['user1', 'user2'];
        
        // Update paycheck data with the new setting
        const currentData = getPaycheckData();
        const updatedData = {
          ...currentData,
          settings: {
            ...currentData.settings,
            activeUsers: newActiveUsers
          }
        };
        setPaycheckData(updatedData);
        
        // Dispatch event to notify other components about the change
        window.dispatchEvent(new CustomEvent('paycheckDataUpdated', { detail: updatedData }));
        
        return newActiveUsers;
      });
    };

    window.addEventListener('toggleMultiUserCalculator', handleToggleMultiUserCalculator);
    
    return () => {
      window.removeEventListener('toggleMultiUserCalculator', handleToggleMultiUserCalculator);
    };
  }, []);

  // Listen for paycheck data updates to sync state
  useEffect(() => {
    const handlePaycheckDataUpdate = (event) => {
      const updatedData = event.detail || getPaycheckData();
      if (updatedData?.settings?.activeUsers) {
        setActiveUsers(updatedData.settings.activeUsers);
      }
    };

    window.addEventListener('paycheckDataUpdated', handlePaycheckDataUpdate);
    
    return () => {
      window.removeEventListener('paycheckDataUpdated', handlePaycheckDataUpdate);
    };
  }, []);

  // Utility functions
  const isUserActive = (userId) => activeUsers.includes(userId) || userId === 'Joint';
  const getActiveUserData = (paycheckData) => {
    return activeUsers.map(userId => ({
      id: userId,
      data: paycheckData?.[userId] || {},
      name: paycheckData?.[userId]?.name || `User ${userId.slice(-1)}`
    })).filter(user => user.data.salary || userId === 'user1'); // Always include user1, others only if they have data
  };

  // Return activeUsers with Joint always included for data display purposes
  const displayUsers = [...activeUsers, 'Joint'];

  return {
    activeUsers: displayUsers,
    isUserActive,
    getActiveUserData
  };
};