import {
  pgTable,
  text,
  integer,
  real,
  timestamp,
  boolean,
  uuid,
  index,
} from 'drizzle-orm/pg-core';

// Wallets Table
export const wallets = pgTable(
  'wallets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    address: text('address').notNull().unique(),
    gardBalance: real('gard_balance').notNull().default(0),
    lockedBalance: real('locked_balance').notNull().default(0),
    totalMinted: real('total_minted').notNull().default(0),
    totalBurned: real('total_burned').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('idx_wallets_address').on(table.address)],
);

// Factories Table
export const factories = pgTable(
  'factories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    landId: text('land_id').notNull(),
    ownerAddress: text('owner_address')
      .notNull()
      .references(() => wallets.address),

    // Static data (set at creation)
    createdAtBlock: integer('created_at_block').notNull(),
    createdAtTime: timestamp('created_at_time').notNull(),
    stakedGard: real('staked_gard').notNull(),
    score: integer('score').notNull(),

    // Aggregate challenge stats
    burnReductions: real('burn_reductions').notNull().default(0),
    inflationPaidOut: real('inflation_paid_out').notNull().default(0),
    challengeWins: integer('challenge_wins').notNull().default(0),
    challengeLosses: integer('challenge_losses').notNull().default(0),

    // Status
    status: text('status').notNull().default('active'),
    closedAtTime: timestamp('closed_at_time'),
    closeReason: text('close_reason'),

    // Closure settlement
    finalBurn: real('final_burn'),
    finalInflation: real('final_inflation'),
    refundAmount: real('refund_amount'),
  },
  (table) => [
    index('idx_factories_land').on(table.landId),
    index('idx_factories_owner').on(table.ownerAddress),
    index('idx_factories_status').on(table.status),
  ],
);

// Challenges Table
export const challenges = pgTable(
  'challenges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    factoryId: uuid('factory_id')
      .notNull()
      .references(() => factories.id),
    challengerAddress: text('challenger_address')
      .notNull()
      .references(() => wallets.address),

    // Status
    status: text('status').notNull().default('pending'),

    // Phase 1: Created
    createdAtBlock: integer('created_at_block').notNull(),
    createdAtTime: timestamp('created_at_time').notNull(),
    factoryAgeSeconds: integer('factory_age_seconds').notNull(),
    expiresAt: timestamp('expires_at'),

    // Economics snapshot
    ticketCost: real('ticket_cost').notNull(),
    potentialReward: real('potential_reward').notNull(),
    effectiveBurn: real('effective_burn').notNull(),
    availableInflation: real('available_inflation').notNull(),

    // Phase 2: Game result (NULL until played)
    completedAtTime: timestamp('completed_at_time'),
    playerScore: integer('player_score'),
    factoryScore: integer('factory_score'),
    won: boolean('won'),

    // Settlement
    gardChange: real('gard_change'),
    burnReduction: real('burn_reduction'),

    // Transaction references
    createTxHash: text('create_tx_hash'),
    completeTxHash: text('complete_tx_hash'),
  },
  (table) => [
    index('idx_challenges_factory').on(table.factoryId),
    index('idx_challenges_challenger').on(table.challengerAddress),
    index('idx_challenges_status').on(table.status),
  ],
);

// Factory Closures Table
export const factoryClosures = pgTable('factory_closures', {
  id: uuid('id').primaryKey().defaultRandom(),
  factoryId: uuid('factory_id')
    .notNull()
    .unique()
    .references(() => factories.id),

  closedAtTime: timestamp('closed_at_time').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  stakedGard: real('staked_gard').notNull(),
  finalBurn: real('final_burn').notNull(),
  finalInflation: real('final_inflation').notNull(),
  netResult: real('net_result').notNull(),

  totalChallenges: integer('total_challenges').notNull(),
  challengerWins: integer('challenger_wins').notNull(),
  challengerLosses: integer('challenger_losses').notNull(),

  burnAmount: real('burn_amount').notNull(),
  refundAmount: real('refund_amount').notNull(),
  profitAmount: real('profit_amount').notNull(),

  closeReason: text('close_reason').notNull(),
  txHash: text('tx_hash'),
});

// Token Events Table
export const tokenEvents = pgTable(
  'token_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventType: text('event_type').notNull(),
    walletAddress: text('wallet_address')
      .notNull()
      .references(() => wallets.address),
    amount: real('amount').notNull(),
    source: text('source').notNull(),
    referenceId: text('reference_id'),
    description: text('description'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    txHash: text('tx_hash'),
  },
  (table) => [
    index('idx_token_events_wallet').on(table.walletAddress),
    index('idx_token_events_type').on(table.eventType),
  ],
);

// Type exports for use in services
export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;

export type Factory = typeof factories.$inferSelect;
export type NewFactory = typeof factories.$inferInsert;

export type Challenge = typeof challenges.$inferSelect;
export type NewChallenge = typeof challenges.$inferInsert;

export type FactoryClosure = typeof factoryClosures.$inferSelect;
export type NewFactoryClosure = typeof factoryClosures.$inferInsert;

export type TokenEvent = typeof tokenEvents.$inferSelect;
export type NewTokenEvent = typeof tokenEvents.$inferInsert;
