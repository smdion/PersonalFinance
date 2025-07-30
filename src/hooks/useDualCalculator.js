import { useState, useEffect } from 'react';
import { getPaycheckData, setPaycheckData } from '../utils/localStorage';

/**
 * Shared hook for managing dual calculator toggle state across all components
 */
export const useDualCalculator = () => {
  const [showSpouseCalculator, setShowSpouseCalculator] = useState(true);

  // Load initial state from localStorage
  useEffect(() => {
    const paycheckData = getPaycheckData();
    const initialState = paycheckData?.settings?.showSpouseCalculator ?? true;
    setShowSpouseCalculator(initialState);
  }, []);

  // Listen for dual calculator toggle events from navigation
  useEffect(() => {
    const handleToggleDualCalculator = () => {
      setShowSpouseCalculator(prev => {
        const newValue = !prev;
        
        // Update paycheck data with the new setting
        const currentData = getPaycheckData();
        const updatedData = {
          ...currentData,
          settings: {
            ...currentData.settings,
            showSpouseCalculator: newValue
          }
        };
        setPaycheckData(updatedData);
        
        // Dispatch event to notify other components about the change
        window.dispatchEvent(new CustomEvent('paycheckDataUpdated', { detail: updatedData }));
        
        return newValue;
      });
    };

    window.addEventListener('toggleDualCalculator', handleToggleDualCalculator);
    
    return () => {
      window.removeEventListener('toggleDualCalculator', handleToggleDualCalculator);
    };
  }, []);

  // Listen for paycheck data updates to sync state
  useEffect(() => {
    const handlePaycheckDataUpdate = (event) => {
      const updatedData = event.detail || getPaycheckData();
      if (updatedData?.settings?.showSpouseCalculator !== undefined) {
        setShowSpouseCalculator(updatedData.settings.showSpouseCalculator);
      }
    };

    window.addEventListener('paycheckDataUpdated', handlePaycheckDataUpdate);
    
    return () => {
      window.removeEventListener('paycheckDataUpdated', handlePaycheckDataUpdate);
    };
  }, []);

  return showSpouseCalculator;
};