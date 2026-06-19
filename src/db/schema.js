const { pgTable, serial, varchar, decimal, integer, timestamp, text } = require('drizzle-orm/pg-core');

/**
 * The Trade Ledger — Every executed trade is permanently recorded here.
 * 
 * This is an APPEND-ONLY table. We never update or delete rows.
 * In finance, this is called an "immutable audit trail."
 * If Google asks why: "Because financial regulators require a complete,
 * unalterable history of every trade that ever occurred."
 */
const trades = pgTable('trades', {
  id: serial('id').primaryKey(),
  tradeId: varchar('trade_id', { length: 64 }).notNull().unique(),  // For idempotency
  buyOrderId: varchar('buy_order_id', { length: 64 }).notNull(),
  sellOrderId: varchar('sell_order_id', { length: 64 }).notNull(),
  buyerUserId: varchar('buyer_user_id', { length: 64 }),
  sellerUserId: varchar('seller_user_id', { length: 64 }),
  symbol: varchar('symbol', { length: 10 }).notNull(),              // e.g. "AAPL"
  price: decimal('price', { precision: 12, scale: 2 }).notNull(),   // Execution price
  quantity: integer('quantity').notNull(),                           // Shares traded
  executedAt: timestamp('executed_at').defaultNow().notNull(),
});

// User accounts — stored in Postgres for transactional consistency with trades
const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),   // hashed password
  salt: text('salt').notNull(),           // unique salt per user
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Session tracking — maps a session token to a user
const userSessionsTable = pgTable('user_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  sessionToken: text('session_token').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

module.exports = { trades, usersTable, userSessionsTable };
