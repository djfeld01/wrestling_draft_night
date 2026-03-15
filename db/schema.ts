import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const sessionStatusEnum = pgEnum("session_status", [
  "setup",
  "active",
  "completed",
]);

export const draftSessions = pgTable("draft_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  status: sessionStatusEnum("status").default("setup").notNull(),
  playerCount: integer("player_count").notNull(),
  currentRound: integer("current_round").default(1).notNull(),
  currentPickNumber: integer("current_pick_number").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const players = pgTable("players", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .references(() => draftSessions.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  authCode: varchar("auth_code", { length: 10 }).unique().notNull(),
  draftOrder: integer("draft_order").notNull(),
  preSelectedWrestlerId: uuid("pre_selected_wrestler_id").references(
    () => sessionWrestlers.id,
  ),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wrestlers = pgTable("wrestlers", {
  id: uuid("id").defaultRandom().primaryKey(),
  seed: integer("seed").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  team: varchar("team", { length: 50 }).notNull(),
  record: varchar("record", { length: 20 }).notNull(),
  weightClass: integer("weight_class").notNull(),
  grade: varchar("grade", { length: 20 }),
  scoring: varchar("scoring", { length: 20 }),
});

export const sessionWrestlers = pgTable("session_wrestlers", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .references(() => draftSessions.id)
    .notNull(),
  wrestlerId: uuid("wrestler_id")
    .references(() => wrestlers.id)
    .notNull(),
  isAvailable: boolean("is_available").default(true).notNull(),
});

export const picks = pgTable("picks", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .references(() => draftSessions.id)
    .notNull(),
  playerId: uuid("player_id")
    .references(() => players.id)
    .notNull(),
  sessionWrestlerId: uuid("session_wrestler_id")
    .references(() => sessionWrestlers.id)
    .notNull(),
  round: integer("round").notNull(),
  pickNumber: integer("pick_number").notNull(),
  weightClass: integer("weight_class").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
