import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from 'drizzle-orm/sqlite-core';

// Wallets Table
export const wallets = sqliteTable(
  'wallets',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    address: text('address').notNull().unique(),
    gardBalance: real('gard_balance').notNull().default(0),
    lockedBalance: real('locked_balance').notNull().default(0),
    totalMinted: real('total_minted').notNull().default(0),
    totalBurned: real('total_burned').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index('idx_wallets_address').on(table.address)],
);

// Factories Table
export const factories = sqliteTable(
  'factories',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    landId: text('land_id').notNull(),
    ownerAddress: text('owner_address')
      .notNull()
      .references(() => wallets.address),

    // Static data (set at creation)
    createdAtBlock: integer('created_at_block').notNull(),
    createdAtTime: integer('created_at_time', { mode: 'timestamp' }).notNull(),
    stakedGard: real('staked_gard').notNull(),
    score: integer('score').notNull(),

    // Aggregate challenge stats
    burnReductions: real('burn_reductions').notNull().default(0),
    inflationPaidOut: real('inflation_paid_out').notNull().default(0),
    challengeWins: integer('challenge_wins').notNull().default(0),
    challengeLosses: integer('challenge_losses').notNull().default(0),

    // Status
    status: text('status', { enum: ['active', 'closed'] })
      .notNull()
      .default('active'),
    closedAtTime: integer('closed_at_time', { mode: 'timestamp' }),
    closeReason: text('close_reason', {
      enum: ['burn_exceeded', 'stake_depleted', 'manual'],
    }),

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
export const challenges = sqliteTable(
  'challenges',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    factoryId: text('factory_id')
      .notNull()
      .references(() => factories.id),
    challengerAddress: text('challenger_address')
      .notNull()
      .references(() => wallets.address),

    // Status
    status: text('status', {
      enum: ['pending', 'completed', 'expired', 'cancelled'],
    })
      .notNull()
      .default('pending'),

    // Phase 1: Created
    createdAtBlock: integer('created_at_block').notNull(),
    createdAtTime: integer('created_at_time', { mode: 'timestamp' }).notNull(),
    factoryAgeSeconds: integer('factory_age_seconds').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }),

    // Economics snapshot
    ticketCost: real('ticket_cost').notNull(),
    potentialReward: real('potential_reward').notNull(),
    effectiveBurn: real('effective_burn').notNull(),
    availableInflation: real('available_inflation').notNull(),

    // Phase 2: Game result (NULL until played)
    completedAtTime: integer('completed_at_time', { mode: 'timestamp' }),
    playerScore: integer('player_score'),
    factoryScore: integer('factory_score'),
    won: integer('won', { mode: 'boolean' }),

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
export const factoryClosures = sqliteTable('factory_closures', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  factoryId: text('factory_id')
    .notNull()
    .unique()
    .references(() => factories.id),

  closedAtTime: integer('closed_at_time', { mode: 'timestamp' }).notNull(),
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
export const tokenEvents = sqliteTable(
  'token_events',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventType: text('event_type', {
      enum: ['LOCK', 'UNLOCK', 'MINT', 'BURN', 'TRANSFER'],
    }).notNull(),
    walletAddress: text('wallet_address')
      .notNull()
      .references(() => wallets.address),
    amount: real('amount').notNull(),
    source: text('source').notNull(),
    referenceId: text('reference_id'),
    description: text('description'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
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
