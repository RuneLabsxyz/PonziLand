// Shared constants with the contracts
export const GAME_SPEED = $state(5);
export const GRID_SIZE = $state(64);
export const TAX_RATE = $state(2); // as a percentage
export const LEVEL_UP_TIME = $state(60 * 60 * 48);


export const config = {

    set_config: (config: any) => {
        console.log('Setting config', config);
        GAME_SPEED.set(config.gameSpeed);
        GRID_SIZE.set(config.gridSize);
        TAX_RATE.set(config.taxRate);
        LEVEL_UP_TIME.set(config.levelUpTime);
    },

    // Game constants
    gameSpeed: GAME_SPEED,
    gridSize: GRID_SIZE,
    taxRate: TAX_RATE,
    levelUpTime: LEVEL_UP_TIME,
}