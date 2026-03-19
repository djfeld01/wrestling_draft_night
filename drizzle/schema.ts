import { pgTable, index, text, timestamp, foreignKey, uuid, integer, unique, varchar, boolean, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const sessionStatus = pgEnum("session_status", ['setup', 'active', 'completed'])


export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("verification_identifier_idx").using("btree", table.identifier.asc().nullsLast().op("text_ops")),
]);

export const picks = pgTable("picks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: uuid("session_id").notNull(),
	playerId: uuid("player_id").notNull(),
	sessionWrestlerId: uuid("session_wrestler_id").notNull(),
	round: integer().notNull(),
	pickNumber: integer("pick_number").notNull(),
	weightClass: integer("weight_class").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [draftSessions.id],
			name: "picks_session_id_draft_sessions_id_fk"
		}),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [players.id],
			name: "picks_player_id_players_id_fk"
		}),
	foreignKey({
			columns: [table.sessionWrestlerId],
			foreignColumns: [sessionWrestlers.id],
			name: "picks_session_wrestler_id_session_wrestlers_id_fk"
		}),
]);

export const players = pgTable("players", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: uuid("session_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }),
	authCode: varchar("auth_code", { length: 10 }).notNull(),
	draftOrder: integer("draft_order").notNull(),
	preSelectedWrestlerId: uuid("pre_selected_wrestler_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [draftSessions.id],
			name: "players_session_id_draft_sessions_id_fk"
		}),
	foreignKey({
			columns: [table.preSelectedWrestlerId],
			foreignColumns: [sessionWrestlers.id],
			name: "players_pre_selected_wrestler_id_session_wrestlers_id_fk"
		}),
	unique("players_auth_code_unique").on(table.authCode),
]);

export const sessionWrestlers = pgTable("session_wrestlers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: uuid("session_id").notNull(),
	wrestlerId: uuid("wrestler_id").notNull(),
	isAvailable: boolean("is_available").default(true).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [draftSessions.id],
			name: "session_wrestlers_session_id_draft_sessions_id_fk"
		}),
	foreignKey({
			columns: [table.wrestlerId],
			foreignColumns: [wrestlers.id],
			name: "session_wrestlers_wrestler_id_wrestlers_id_fk"
		}),
]);

export const draftSessions = pgTable("draft_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	status: sessionStatus().default('setup').notNull(),
	playerCount: integer("player_count").notNull(),
	currentRound: integer("current_round").default(1).notNull(),
	currentPickNumber: integer("current_pick_number").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	organizerEmail: varchar("organizer_email", { length: 255 }),
});

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("user_email_unique").on(table.email),
]);

export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: 'string' }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
}, (table) => [
	index("account_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull(),
}, (table) => [
	index("session_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("session_token_unique").on(table.token),
]);

export const teamMembers = pgTable("team_members", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	playerId: uuid("player_id").notNull(),
	email: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [players.id],
			name: "team_members_player_id_players_id_fk"
		}),
]);

export const wrestlers = pgTable("wrestlers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	seed: integer().notNull(),
	name: varchar({ length: 255 }).notNull(),
	team: varchar({ length: 50 }).notNull(),
	record: varchar({ length: 20 }).notNull(),
	weightClass: integer("weight_class").notNull(),
	grade: varchar({ length: 20 }),
	scoring: varchar({ length: 20 }),
	tournamentPoints: integer("tournament_points").default(0).notNull(),
});

export const scoreUploads = pgTable("score_uploads", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow().notNull(),
	organizerEmail: varchar("organizer_email", { length: 255 }).notNull(),
	wrestlersUpdated: integer("wrestlers_updated").notNull(),
	summary: varchar({ length: 1000 }).notNull(),
});
