import type { ParsedEntity } from '@dojoengine/sdk';
import type { SchemaType } from '$lib/models.gen';
import type { Location } from '$lib/api/land/location';
import { locationIntToString, locationToCoordinates } from '$lib/utils';

/**
 * Enhanced console logging utility for entity updates with structured display
 */
export function logEntityUpdate(
  entity: ParsedEntity<SchemaType>,
  location: Location | undefined,
  context: string = 'Entity Update',
): void {
  const models = entity.models.ponzi_land || {};
  const availableModels = (
    Object.keys(models) as Array<keyof typeof models>
  ).filter((key) => models[key] !== undefined);

  console.group(`🏞️ ${context} at 📍(${location?.x}, ${location?.y})`);

  if (availableModels.length > 0) {
    // Create table data for each model
    const tableData: Record<string, any> = {};

    availableModels.forEach((modelName) => {
      const model = (models as any)[modelName];
      switch (modelName) {
        case 'Land':
          tableData[`🏡 ${modelName}`] = {
            '📍 Location': `${locationIntToString(model?.location)} #${model?.location}`,
            '👤 Owner': model?.owner,
            '💰 Price': model?.sell_price,
            '🪙 Token': model?.token_used,
          };
          break;
        case 'Auction':
          tableData[`🔨 ${modelName}`] = {
            '📍 Location': `${locationIntToString(model?.land_location)} #${model?.land_location}`,
            '🎯 Status': model?.is_finished ? '✅ Finished' : '⏳ Active',
            '⏰ Start Time': model?.start_time,
          };
          break;
        case 'LandStake':
          tableData[`🔒 ${modelName}`] = {
            '📍 Location': `${locationIntToString(model?.location)} #${model?.location}`,
            '💎 Amount': model?.amount,
          };
          break;
        default:
          tableData[`📦 ${modelName}`] = model;
          break;
      }
    });

    console.table(tableData);

    // Also show the raw entity for debugging if needed
    console.log('🔍 Raw Entity:', entity);
  } else {
    console.log('⚠️ No models found in entity');
    console.log('🔍 Raw Entity:', entity);
  }

  console.groupEnd();
}
