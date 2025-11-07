# StarknetCallDemo Component Specification

## Overview

A comprehensive Svelte component for documenting and demonstrating Starknet smart contract calls in the PonziLand documentation site. This component allows developers to view, understand, and execute Starknet contract interactions directly from the documentation.

## Architecture

### Component Structure

```
StarknetCallDemo.svelte (main component)
├── NetworkSelector.svelte (deployment picker)
├── WalletConnector.svelte (wallet connection UI)
├── CallDataDisplay.svelte (formatted call display)
├── CodeExample.svelte (starknet.js code with copy)
├── ExecuteButton.svelte (call execution)
└── ResultDisplay.svelte (decoded/highlighted results)
```

## Feature Requirements

### 1. Call Data Formatting

**Purpose**: Display formatted Starknet call data in a readable format.

**Input**:
- Contract name/address
- Function name
- Parameters

**Display Format**:
```typescript
{
  contractAddress: string,
  entrypoint: string,
  calldata: [...]
}
```

**Data Source**:
- Parse from `manifest_mainnet.json` to get contract addresses and ABIs
- Extract function signatures from contract ABIs

**UI Requirements**:
- Syntax-highlighted JSON or custom formatted view
- Expandable/collapsible sections for complex nested data
- Clear visual hierarchy for parameters
- Type annotations for each parameter

**Implementation Notes**:
- Use existing pattern from `client/src/lib/api/contracts/approve.ts`
- Support both simple and complex Cairo types (u256, felt252, arrays, structs)

---

### 2. Network Deployment Selector

**Purpose**: Allow users to switch between different Starknet deployments.

**Supported Networks**:
- Mainnet (from `manifest_mainnet.json`)
- Sepolia testnet (requires `manifest_sepolia.json`)
- Mainnet-test (optional)

**Implementation**:
```typescript
type Network = 'mainnet' | 'sepolia' | 'mainnet-test';

let selectedNetwork = $state<Network>('mainnet');

const manifests = {
  mainnet: manifest_mainnet,
  sepolia: manifest_sepolia,
  // ...
};
```

**Behavior**:
- Switching networks updates contract addresses dynamically
- Updates RPC provider endpoints
- Updates blockchain explorer links (Voyager/Starkscan)
- Persists selection across component instances (optional)

**UI Requirements**:
- Dropdown or tab-based selector
- Visual indicator of currently selected network
- Network-specific color coding (mainnet = green, testnet = orange)
- Display network status (block height, response time - optional)

---

### 3. Wallet Connection (Shared State)

**Purpose**: Connect user's Starknet wallet for executing transactions.

**State Management**:
- Create global store: `docs/src/lib/stores/starknet-wallet.svelte.ts`
- Use Svelte 5 runes for reactivity
- Share wallet state across all component instances

**Store Structure**:
```typescript
import { getStarknet } from '@starknet-io/get-starknet-core';

class StarknetWalletStore {
  account = $state<Account | null>(null);
  address = $derived(this.account?.address ?? null);
  isConnected = $derived(this.account !== null);
  
  async connect(): Promise<void> {
    const starknet = await getStarknet();
    const [address] = await starknet.enable();
    this.account = starknet.account;
  }
  
  disconnect(): void {
    this.account = null;
  }
}

export const starknetWallet = new StarknetWalletStore();
```

**UI Requirements**:
- "Connect Wallet" button when disconnected
- Display address when connected (truncated: `0x1234...5678`)
- Disconnect button
- Wallet icon/logo
- Connection status indicator
- Error messages for connection failures

**Integration Pattern**:
- Reuse patterns from `client/src/lib/stores/wallet.svelte.ts`
- Support multiple wallet providers (ArgentX, Braavos)
- Handle wallet switching events

---

### 4. Code Example Generation & Copy

**Purpose**: Generate and display executable starknet.js code examples.

**Code Generation**:
```typescript
function generateStarknetJsCode(
  network: Network,
  contract: string,
  entrypoint: string,
  calldata: any[]
): string {
  return `
import { Contract, RpcProvider } from 'starknet';

const provider = new RpcProvider({ 
  nodeUrl: '${getNodeUrl(network)}' 
});

const contract = new Contract(
  ${JSON.stringify(getContractAbi(contract))},
  '${getContractAddress(network, contract)}',
  provider
);

const result = await contract.${entrypoint}(
  ${calldata.map(param => JSON.stringify(param)).join(',\n    ')}
);

console.log('Result:', result);
  `.trim();
}
```

**Features**:
- Generate code based on:
  - Selected network
  - Contract name
  - Function name
  - Current parameter values
- Update code dynamically as parameters change
- Include proper imports and setup

**Copy to Clipboard**:
- One-click copy functionality
- Visual feedback on successful copy (checkmark animation)
- Fallback for browsers without clipboard API
- "Copied!" toast message

**UI Requirements**:
- Syntax highlighting using `shiki` or `highlight.js`
- Dark/light theme support matching docs theme
- Line numbers (optional)
- Copy button positioned at top-right of code block
- Language indicator badge (TypeScript)

---

### 5. Execute Call

**Purpose**: Execute contract calls directly from the documentation.

**Call Types**:

#### View Calls (Read-Only)
- No wallet required
- Use RPC provider
- Free (no gas fees)

```typescript
const provider = new RpcProvider({ nodeUrl: getNodeUrl(selectedNetwork) });
const contract = new Contract(abi, address, provider);
const result = await contract.call(entrypoint, calldata);
```

#### External Calls (Write)
- Require connected wallet
- Show gas estimation
- Display transaction status

```typescript
const result = await starknetWallet.account.execute({
  contractAddress: address,
  entrypoint: entrypoint,
  calldata: CallData.compile(calldata)
});
```

**State Detection**:
- Parse ABI to determine if function is `view` or `external`
- Check `state_mutability` field in function ABI

**UI Requirements**:

**Before Execution**:
- Button label: "Call" for view, "Execute Transaction" for external
- Disabled state if:
  - Parameters are invalid
  - Wallet not connected (for external calls)
  - Network mismatch
- Gas estimation display (for external calls)

**During Execution**:
- Loading spinner
- "Executing..." status message
- Disable button to prevent double-submission

**After Execution**:
- Success state with checkmark
- Transaction hash (for external calls)
- Link to transaction on block explorer
- Estimated confirmation time (for external calls)

**Error Handling**:
- Display user-friendly error messages
- Parse common errors:
  - Insufficient balance
  - Rejected by user
  - Invalid calldata
  - Contract execution failed
- Retry button

---

### 6. Result Display (Two Modes)

**Purpose**: Display execution results in human-readable format.

#### Mode A: Fully Decoded

**Implementation**:
```typescript
function decodeResult(result: any[], abi: AbiFunction) {
  const outputs = abi.outputs;
  return outputs.map((output, i) => ({
    name: output.name || `output_${i}`,
    type: output.type,
    value: formatValue(result[i], output.type)
  }));
}

function formatValue(value: any, type: string): string {
  if (type === 'core::starknet::contract_address::ContractAddress') {
    return formatAddress(value);
  }
  if (type === 'core::integer::u256') {
    return formatU256(value);
  }
  // ... handle other types
}
```

**Display Format**:
```
Return Values:
├─ balance: 1,234.56 STRK (u256)
├─ timestamp: 2025-11-07 15:42:33 UTC (u64)
└─ owner: 0x1234...5678 (ContractAddress)
```

**UI Requirements**:
- Tree or table view for structured data
- Type annotations in muted color
- Formatted values:
  - Addresses: truncated with copy button
  - Large numbers: formatted with thousands separators
  - Timestamps: human-readable dates
  - Booleans: checkmark/X icons
- Collapsible nested structures

#### Mode B: Decoded with Highlights

**Purpose**: Show both raw and interpreted values for educational purposes.

**Layout**: Split view with arrows showing mapping

**Example**:
```
┌─────────────────────────┐     ┌──────────────────────┐
│ Raw Result:             │     │ Interpretation:      │
│                         │     │                      │
│ [                       │     │ u256 {               │
│   0x7b,          ───────┼─────┼──►  low: 123         │
│   0x0            ───────┼─────┼──►  high: 0          │
│ ]                       │     │ } = 123 STRK         │
└─────────────────────────┘     └──────────────────────┘
```

**UI Requirements**:
- Two-column layout
- Synchronized scrolling
- Color-coded highlighting:
  - Blue: felt252 values
  - Green: addresses
  - Orange: u256 components
  - Purple: arrays/structs
- Animated arrows on hover showing data flow
- Toggle button to switch between modes

**Type-Specific Formatters**:
- `felt252`: Hex + decimal
- `u256`: Component breakdown + total
- `ContractAddress`: Link to contract on explorer
- Arrays: Item count + expandable list
- Structs: Field-by-field breakdown
- Enums: Variant name + value

---

## Technical Implementation

### Package Dependencies

Add to `docs/package.json`:
```json
{
  "dependencies": {
    "starknet": "^6.x.x",
    "@starknet-io/get-starknet-core": "^4.x.x",
    "shiki": "^1.x.x"
  }
}
```

### Manifest Loading

**Static Import**:
```typescript
import manifest_mainnet from '../../../manifest_mainnet.json';
import manifest_sepolia from '../../../manifest_sepolia.json';
```

**Utility Functions**:
```typescript
interface Contract {
  tag: string;
  address: string;
  abi: any[];
  systems: string[];
}

function getContractByName(manifest: Manifest, name: string): Contract | null {
  return manifest.contracts.find(c => c.tag === name) ?? null;
}

function getSystemAbi(contract: Contract, systemName: string): AbiFunction | null {
  // Parse ABI to find function signature
  return contract.abi.find(item => 
    item.type === 'function' && item.name === systemName
  ) ?? null;
}

function getContractAddress(network: Network, contractName: string): string {
  const manifest = manifests[network];
  const contract = getContractByName(manifest, contractName);
  return contract?.address ?? '';
}

function getNodeUrl(network: Network): string {
  const urls = {
    mainnet: 'https://starknet-mainnet.public.blastapi.io',
    sepolia: 'https://starknet-sepolia.public.blastapi.io',
    'mainnet-test': 'https://starknet-mainnet.public.blastapi.io'
  };
  return urls[network];
}

function getExplorerUrl(network: Network, txHash: string): string {
  const base = network === 'mainnet' 
    ? 'https://voyager.online' 
    : 'https://sepolia.voyager.online';
  return `${base}/tx/${txHash}`;
}
```

### Component Props Interface

```typescript
interface StarknetCallDemoProps {
  contractName: string;            // e.g., "ponzi_land-actions"
  functionName: string;             // e.g., "buy"
  defaultParams?: Record<string, any>; // Default parameter values
  title?: string;                   // Optional section title
  description?: string;             // Optional description
  defaultNetwork?: Network;         // Default network selection
  readOnly?: boolean;               // Disable execution (demo only)
}
```

### State Management Pattern

```typescript
// Component state
let selectedNetwork = $state<Network>(defaultNetwork ?? 'mainnet');
let params = $state<Record<string, any>>(defaultParams ?? {});
let result = $state<any>(null);
let isExecuting = $state(false);
let error = $state<string | null>(null);
let showRawResult = $state(false); // Toggle between decode modes

// Derived state
const manifest = $derived(manifests[selectedNetwork]);
const contract = $derived(getContractByName(manifest, contractName));
const abi = $derived(getSystemAbi(contract, functionName));
const isViewFunction = $derived(abi?.state_mutability === 'view');
const canExecute = $derived(
  isViewFunction || starknetWallet.isConnected
);
const explorerLink = $derived(
  result?.transaction_hash 
    ? getExplorerUrl(selectedNetwork, result.transaction_hash)
    : null
);

// Generated code example
const codeExample = $derived(
  generateStarknetJsCode(
    selectedNetwork,
    contractName,
    functionName,
    Object.values(params)
  )
);
```

### Parameter Input Component

```typescript
// ParamInput.svelte
interface ParamInputProps {
  name: string;
  type: string;
  value: any;
  onChange: (value: any) => void;
}

// Support different input types based on Cairo type
function getInputType(cairoType: string): 'text' | 'number' | 'address' {
  if (cairoType.includes('u64') || cairoType.includes('u128')) {
    return 'number';
  }
  if (cairoType.includes('ContractAddress')) {
    return 'address';
  }
  return 'text';
}
```

---

## UI/UX Design

### Layout Structure

```
┌─────────────────────────────────────────────────┐
│  [Title]                                        │
│  [Description]                                  │
├─────────────────────────────────────────────────┤
│  Network: [Mainnet ▼]  Wallet: [Connect]       │
├─────────────────────────────────────────────────┤
│  Call Data                                      │
│  ┌───────────────────────────────────────────┐ │
│  │ Contract: ponzi_land-actions              │ │
│  │ Function: buy                              │ │
│  │                                            │ │
│  │ Parameters:                                │ │
│  │   landLocation: [____100____]             │ │
│  │   tokenForSale: [____0x...____]           │ │
│  │   sellPrice:    [____1.5 STRK____]        │ │
│  │   amountToStake:[____0.5 STRK____]        │ │
│  └───────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│  Code Example                     [Copy 📋]     │
│  ┌───────────────────────────────────────────┐ │
│  │ import { Contract, RpcProvider } ...      │ │
│  │ ...                                       │ │
│  └───────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│                [Execute Transaction]            │
├─────────────────────────────────────────────────┤
│  Result                        [Decoded ▼]      │
│  ┌───────────────────────────────────────────┐ │
│  │ ✓ Transaction successful                  │ │
│  │ TX: 0x1234...5678 [View on Explorer ↗]   │ │
│  │                                            │ │
│  │ Return Values:                             │ │
│  │   success: true                            │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Styling Guidelines

**Theme Integration**:
- Use Tailwind CSS (already in project)
- Match existing docs theme
- Support dark/light mode
- Consistent with Starlight theme

**Color Palette**:
- Primary: Blue (#3b82f6) - for actions
- Success: Green (#10b981) - for successful executions
- Error: Red (#ef4444) - for errors
- Warning: Orange (#f59e0b) - for testnet
- Neutral: Gray scale - for text/borders

**Typography**:
- Headers: Use docs font stack
- Code: Monospace (Fira Code, Monaco, Courier)
- Body: System fonts for readability

**Spacing**:
- Consistent padding: 16px (1rem)
- Section gaps: 24px (1.5rem)
- Card borders: 1px with border-radius: 8px

### Responsive Design

**Desktop (>768px)**:
- Full layout as shown above
- Side-by-side comparison in Mode B result display

**Tablet (768px - 1024px)**:
- Stack sections vertically
- Collapsible code example section

**Mobile (<768px)**:
- Single column layout
- Sticky network/wallet selector at top
- Simplified parameter inputs
- Truncated addresses
- Bottom sheet for results

---

## Usage Examples

### Basic Usage

```mdx
---
title: Buy Land
category: game-technical
---

# Buy Land Contract Call

The `buy` function allows you to purchase land from another player.

<StarknetCallDemo 
  contractName="ponzi_land-actions"
  functionName="buy"
  title="Example: Buy Land at Location 100"
  description="This example shows how to buy land using STRK tokens"
/>
```

### With Default Parameters

```mdx
<StarknetCallDemo 
  contractName="ponzi_land-actions"
  functionName="buy"
  defaultParams={{
    landLocation: 100,
    tokenForSale: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    sellPrice: "1000000000000000000",
    amountToStake: "500000000000000000"
  }}
/>
```

### View Function (No Wallet Required)

```mdx
<StarknetCallDemo 
  contractName="ponzi_land-actions"
  functionName="get_land_info"
  defaultParams={{
    landLocation: 100
  }}
  title="Query Land Information"
/>
```

### Read-Only Demo Mode

```mdx
<StarknetCallDemo 
  contractName="ponzi_land-actions"
  functionName="nuke"
  readOnly={true}
  description="This is a demonstration only. Execution is disabled."
/>
```

---

## Implementation Phases

### Phase 1: Core Structure (MVP)
- [ ] Create base component with props interface
- [ ] Implement manifest loading utilities
- [ ] Build CallDataDisplay component
- [ ] Add basic parameter inputs
- [ ] Simple result display (JSON)

### Phase 2: Network & Wallet
- [ ] Implement NetworkSelector component
- [ ] Create starknet-wallet store
- [ ] Build WalletConnector component
- [ ] Add network switching logic
- [ ] Test wallet connection flow

### Phase 3: Code Generation
- [ ] Build CodeExample component
- [ ] Implement code generation logic
- [ ] Add syntax highlighting
- [ ] Implement copy-to-clipboard
- [ ] Handle edge cases (complex types)

### Phase 4: Execution
- [ ] Implement view call execution
- [ ] Add external call execution
- [ ] Build ExecuteButton with states
- [ ] Add transaction status tracking
- [ ] Error handling and retry

### Phase 5: Advanced Result Display
- [ ] Build fully decoded result view (Mode A)
- [ ] Implement highlighted raw view (Mode B)
- [ ] Add mode toggle
- [ ] Create type-specific formatters
- [ ] Add explorer links

### Phase 6: Polish & Testing
- [ ] Responsive design refinements
- [ ] Accessibility improvements
- [ ] Performance optimization
- [ ] Write documentation
- [ ] Create example docs pages
- [ ] End-to-end testing

---

## Testing Strategy

### Unit Tests
- Manifest parsing utilities
- Code generation functions
- Type formatters
- Parameter validation

### Integration Tests
- Wallet connection flow
- Network switching
- Call execution (mocked)
- Result decoding

### E2E Tests
- Full user flow: connect → set params → execute → view results
- Test on real testnet
- Multiple wallet providers
- Error scenarios

### Browser Testing
- Chrome/Edge
- Firefox
- Safari
- Mobile browsers

---

## Accessibility Requirements

- **Keyboard Navigation**: All interactive elements accessible via keyboard
- **Screen Reader**: Proper ARIA labels and semantic HTML
- **Focus Management**: Clear focus indicators
- **Color Contrast**: WCAG AA compliance
- **Alternative Text**: For all icons and images
- **Error Messages**: Clear and descriptive
- **Loading States**: Announced to screen readers

---

## Performance Considerations

- **Lazy Loading**: Load wallet libraries only when needed
- **Code Splitting**: Separate bundle for heavy dependencies (shiki)
- **Memoization**: Cache manifest parsing results
- **Debouncing**: For parameter input updates
- **Virtual Scrolling**: For large result arrays (if needed)

---

## Security Considerations

- **Input Validation**: Sanitize all user inputs
- **Contract Address Verification**: Validate against manifest
- **RPC Endpoint Security**: Use trusted providers
- **Wallet Permissions**: Request minimal permissions
- **Error Information**: Don't expose sensitive data in errors
- **Transaction Preview**: Always show what will be executed

---

## Future Enhancements

- **Transaction History**: Track past executions in session
- **Gas Profiling**: Show detailed gas breakdown
- **Multi-call Support**: Execute multiple calls in one transaction
- **Contract Verification**: Show verified contract status
- **Simulation Mode**: Pre-simulate transactions before execution
- **Parameter Presets**: Save and load parameter combinations
- **Integration with Tutorial**: Guided walkthroughs
- **Real-time Updates**: Subscribe to result changes
- **Comparison Mode**: Compare results across networks
- **Export Results**: Download as JSON/CSV

---

## Open Questions

1. Should we support custom RPC endpoints?
2. How to handle contract upgrades (different ABIs over time)?
3. Should we cache execution results?
4. Do we need rate limiting for RPC calls?
5. Should users be able to save favorite calls?
6. How to handle multi-call transactions?
7. Should we support contract simulation before execution?
8. Do we need a transaction queue for multiple executions?

---

## Dependencies on Existing Code

### From Client App
- `client/src/lib/stores/wallet.svelte.ts` - Wallet connection pattern
- `client/src/lib/api/contracts/approve.ts` - Call structuring
- `client/src/lib/contexts/dojo.ts` - Dojo provider usage
- `client/src/lib/dojoConfig.ts` - Configuration patterns

### From Docs
- `docs/src/layouts/DocsLayout.astro` - Layout integration
- `docs/src/components/Sidebar.astro` - Navigation context
- `docs/manifest_mainnet.json` - Contract data source

### External Libraries
- `starknet` - Contract interaction
- `@starknet-io/get-starknet-core` - Wallet connection
- `@dojoengine/core` - Dojo-specific utilities
- `shiki` - Syntax highlighting
- `tailwindcss` - Styling

---

## Success Criteria

1. **Usability**: Non-technical users can understand and execute calls
2. **Reliability**: 99%+ success rate for valid calls
3. **Performance**: <500ms load time, <2s execution feedback
4. **Accessibility**: WCAG AA compliance
5. **Documentation**: Complete usage guide and examples
6. **Adoption**: Used in at least 80% of contract documentation pages
