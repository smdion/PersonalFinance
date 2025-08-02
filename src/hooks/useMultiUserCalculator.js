import { useState, useEffect } from 'react';
import { getPaycheckData, setPaycheckData, getUsers as getStorageUsers, resolveUserDisplayName } from '../utils/localStorage';

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

  // Enhanced utility functions that work with both normalized and legacy structures
  const isUserActive = (userId) => activeUsers.includes(userId) || userId === 'Joint' || userId === 'user0';
  
  const getActiveUserData = (paycheckData) => {
    // Check if data is in normalized structure first
    if (paycheckData?.users && Array.isArray(paycheckData.users)) {
      // Handle normalized structure
      return paycheckData.users
        .filter(user => activeUsers.includes(user.id))
        .map(user => ({
          id: user.id,
          data: user.paycheck || user, // paycheck data might be nested or at user level
          name: user.name || resolveUserDisplayName(user.id) || `User ${user.id.slice(-1)}`
        }));
    } else {
      // Handle legacy structure
      return activeUsers.map(userId => ({
        id: userId,
        data: paycheckData?.[userId] || {},
        name: paycheckData?.[userId]?.name || resolveUserDisplayName(userId) || `User ${userId.slice(-1)}`
      })).filter(user => user.data.salary || userId === 'user1'); // Always include user1, others only if they have data
    }
  };
  
  // Helper to get users from normalized structure
  const getUsers = () => {
    console.log('🎯 Hook getUsers() called - using localStorage getUsers()');
    
    // Use the fixed localStorage getUsers function directly
    const allUsers = getStorageUsers();
    console.log('🎯 Hook: Retrieved all users from storage:', allUsers);
    
    // Filter to only user1 and user2 for compatibility
    const filteredUsers = allUsers.filter(user => user.id === 'user1' || user.id === 'user2');
    console.log('🎯 Hook: Filtered users:', filteredUsers);
    
    return filteredUsers;
  };

  // Return activeUsers with Joint always included for data display purposes
  const displayUsers = [...activeUsers, 'Joint'];

  return {
    activeUsers: displayUsers,
    isUserActive,
    getActiveUserData,
    getUsers // Add the new helper function
  };
};