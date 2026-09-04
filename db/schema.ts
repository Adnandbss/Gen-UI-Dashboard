import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const monthlyPl = pgTable("monthly_pl", {
  month: text("month").primaryKey(),
  label: text("label").notNull(),
  revenue: doublePrecision("revenue").notNull(),
  expenses: doublePrecision("expenses").notNull(),
  cash: doublePrecision("cash").notNull(),
  netBurn: doublePrecision("net_burn").notNull(),
});

export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  description: text("description").notNull(),
  amount: doublePrecision("amount").notNull(),
  status: text("status").notNull(),
  segment: text("segment"),
});

export const kpis = pgTable("kpis", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  kpiSet: text("kpi_set").notNull(),
  sortOrder: integer("sort_order").notNull(),
  title: text("title").notNull(),
  value: text("value").notNull(),
  trend: text("trend").notNull(),
  isPositive: boolean("is_positive").notNull(),
});

export const chats = pgTable("chats", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  chatId: text("chat_id")
    .primaryKey()
    .references(() => chats.id, { onDelete: "cascade" }),
  messages: jsonb("messages").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const rateLimitEvents = pgTable(
  "rate_limit_events",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ipHash: text("ip_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("rate_limit_ip_created_idx").on(table.ipHash, table.createdAt)],
);
