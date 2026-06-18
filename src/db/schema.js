const { pgTable, serial, varchar, decimal, integer, timestamp } = require('drizzle-orm/pg-core');
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

module.exports = { trades };
