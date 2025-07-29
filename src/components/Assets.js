import React from 'react';
import AssetLiabilityManager from './AssetLiabilityManager';

const Assets = () => {
  const ASSET_TYPES = [
    'Primary Home',
    'Investment Property',
    'Vacation Home',
    'Vehicle',
    'Boat',
    'RV/Motorhome',
    'Jewelry',
    'Art/Collectibles',
    'Electronics',
    'Furniture',
    'Other Real Estate',
    'Business Equipment',
    'Other'
  ];

  return (
    <AssetLiabilityManager
      type="Assets"
      title="Assets Data Update"
      icon="🏠"
      description="Input current values for homes, vehicles, and large purchases to update historical data"
      itemTypes={ASSET_TYPES}
      historicalField="othAsset"
      itemTypeLabel="Asset Type"
      amountLabel="Current Value"
    />
  );
};

export default Assets;