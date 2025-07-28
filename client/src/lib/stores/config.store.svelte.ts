// Shared constants with the contracts
export const GAME_SPEED= $state<number>(5);
export const GRID_SIZE = $state<number>(64);
export const TAX_RATE = $state<number>(2); // as a percentage
export const LEVEL_UP_TIME = $state<number>(60 * 60 * 48);


export const config = {

    set_config: (config: any) => {
        console.log('Setting config', config);
        GAME_SPEED.set(config.gameSpeed);
        GRID_SIZE.set(config.gridSize);
        TAX_RATE.set(config.taxRate);
        LEVEL_UP_TIME.set(config.levelUpTime);
    },

    // Game constants
    get GAME_SPEED(){
        return GAME_SPEED
    },
    get GRID_SIZE(){ 
        return GRID_SIZE
    },
    get TAX_RATE() {return TAX_RATE},
    get LEVEL_UP_TIME(){return  LEVEL_UP_TIME},
}