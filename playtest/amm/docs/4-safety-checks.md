# Safety Checks

- Strategies should never revert inside `update_positions()` - they either succeed or pause the strategy and pass the context back to `MarketManager`
- When creating new markets, check for ERC20 implementation to determine if it implements non-standard functions that could be malicious to callers
- When creating new markets, check for strategy implementation and upgradeability to determine if it could be malicious to callers
