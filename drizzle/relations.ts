import { relations } from "drizzle-orm/relations";
import { draftSessions, picks, players, sessionWrestlers, wrestlers, user, account, session, teamMembers } from "./schema";

export const picksRelations = relations(picks, ({one}) => ({
	draftSession: one(draftSessions, {
		fields: [picks.sessionId],
		references: [draftSessions.id]
	}),
	player: one(players, {
		fields: [picks.playerId],
		references: [players.id]
	}),
	sessionWrestler: one(sessionWrestlers, {
		fields: [picks.sessionWrestlerId],
		references: [sessionWrestlers.id]
	}),
}));

export const draftSessionsRelations = relations(draftSessions, ({many}) => ({
	picks: many(picks),
	players: many(players),
	sessionWrestlers: many(sessionWrestlers),
}));

export const playersRelations = relations(players, ({one, many}) => ({
	picks: many(picks),
	draftSession: one(draftSessions, {
		fields: [players.sessionId],
		references: [draftSessions.id]
	}),
	sessionWrestler: one(sessionWrestlers, {
		fields: [players.preSelectedWrestlerId],
		references: [sessionWrestlers.id]
	}),
	teamMembers: many(teamMembers),
}));

export const sessionWrestlersRelations = relations(sessionWrestlers, ({one, many}) => ({
	picks: many(picks),
	players: many(players),
	draftSession: one(draftSessions, {
		fields: [sessionWrestlers.sessionId],
		references: [draftSessions.id]
	}),
	wrestler: one(wrestlers, {
		fields: [sessionWrestlers.wrestlerId],
		references: [wrestlers.id]
	}),
}));

export const wrestlersRelations = relations(wrestlers, ({many}) => ({
	sessionWrestlers: many(sessionWrestlers),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	accounts: many(account),
	sessions: many(session),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const teamMembersRelations = relations(teamMembers, ({one}) => ({
	player: one(players, {
		fields: [teamMembers.playerId],
		references: [players.id]
	}),
}));