
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, uuid, numeric, integer, pgEnum, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const genderEnum = pgEnum("gender", ["male", "female", "other", "prefer_not_to_say"]);
export const sessionTypeEnum = pgEnum("session_type", ["chat", "call"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "ai"]);
export const messageTagEnum = pgEnum("message_tag", ["general", "evaluation"]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  phoneNumber: text("phone_number"),
  name: text("name"),
  email: text("email").unique(),
  gender: genderEnum("gender"),
  premiumUser: boolean("premium_user").notNull().default(false),

  proactivityLevel: text("proactivity_level").default("medium"), // low, medium, high
  checkInEnabled: boolean("check_in_enabled").default(true),
  voiceProvider: text("voice_provider").default("sarvam"), // sarvam, elevenlabs
  voiceId: text("voice_id").default("meera"), // meera (sarvam) or voice_id (elevenlabs)
  elevenLabsApiKey: text("elevenlabs_api_key"),
  age: integer("age"),
  city: text("city"),
  occupation: text("occupation"),
  relationshipStatus: text("relationship_status"),
  registrationDate: timestamp("registration_date", { withTimezone: true }).notNull().defaultNow(),
  locale: text("locale").default("hi-IN"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  // activePersonaId: uuid("active_persona_id"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  registrationDate: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// OTP Logins table
export const otpLogins = pgTable("otp_logins", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  otp: text("otp").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOtpLoginSchema = createInsertSchema(otpLogins).omit({
  id: true,
  createdAt: true,
});

export type InsertOtpLogin = z.infer<typeof insertOtpLoginSchema>;
export type OtpLogin = typeof otpLogins.$inferSelect;

// User summary latest (cached)
export const userSummaryLatest = pgTable("user_summary_latest", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  partnerTypeOneLiner: text("partner_type_one_liner"),
  top3TraitsYouValue: text("top_3_traits_you_value").array(),
  whatYouMightWorkOn: text("what_you_might_work_on").array(),
  nextTimeFocus: text("next_time_focus").array(),
  loveLanguageGuess: text("love_language_guess"),
  communicationFit: text("communication_fit"),
  confidenceScore: numeric("confidence_score", { precision: 4, scale: 2 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSummaryLatestSchema = createInsertSchema(userSummaryLatest).omit({
  updatedAt: true,
});

export type InsertUserSummaryLatest = z.infer<typeof insertUserSummaryLatestSchema>;
export type UserSummaryLatest = typeof userSummaryLatest.$inferSelect;

// Sessions table
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: sessionTypeEnum("type").notNull().default("chat"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),

  // Summary captured at end of session
  partnerTypeOneLiner: text("partner_type_one_liner"),
  top3TraitsYouValue: text("top_3_traits_you_value").array(),
  whatYouMightWorkOn: text("what_you_might_work_on").array(),
  nextTimeFocus: text("next_time_focus").array(),
  loveLanguageGuess: text("love_language_guess"),
  communicationFit: text("communication_fit"),
  confidenceScore: numeric("confidence_score", { precision: 4, scale: 2 }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// Messages table (combines Message + Evaluation)
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  tag: messageTagEnum("tag").notNull().default("general"),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Calls table (voice metadata + transcript)
export const calls = pgTable("calls", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  transcript: text("transcript"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }).notNull(),
  durationSeconds: integer("duration_seconds"),
});

export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  durationSeconds: true,
});

export type InsertCall = z.infer<typeof insertCallSchema>;
export type Call = typeof calls.$inferSelect;

// Subscription plans enum
export const planTypeEnum = pgEnum("plan_type", ["daily", "weekly"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "success", "failed"]);

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planType: planTypeEnum("plan_type").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
});

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// Payments table
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "cascade" }),
  cashfreeOrderId: text("cashfree_order_id").notNull(),
  cashfreePaymentId: text("cashfree_payment_id"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: paymentStatusEnum("status").notNull().default("pending"),
  planType: planTypeEnum("plan_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// ---- Push Notifications ----

export const notificationTokens = pgTable("notification_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  deviceType: text("device_type").notNull(), // android, ios, web
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNotificationTokenSchema = createInsertSchema(notificationTokens).omit({
  id: true,
  createdAt: true,
});

export type InsertNotificationToken = z.infer<typeof insertNotificationTokenSchema>;
export type NotificationToken = typeof notificationTokens.$inferSelect;



export const avatarConfigurations = pgTable("avatar_configurations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  avatarStyle: text("avatar_style").default("anime").notNull(),
  skinTone: text("skin_tone"),
  hairColor: text("hair_color"),
  hairStyle: text("hair_style"),
  eyeColor: text("eye_color"),
  outfit: text("outfit"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAvatarConfigurationSchema = createInsertSchema(avatarConfigurations);
export type InsertAvatarConfiguration = z.infer<typeof insertAvatarConfigurationSchema>;
export type AvatarConfiguration = typeof avatarConfigurations.$inferSelect;

export const avatarInteractions = pgTable("avatar_interactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  interactionType: text("interaction_type").notNull(), // 'look_at', 'smile_trigger', 'gift_given', etc.
  sessionId: uuid("session_id").references(() => sessions.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAvatarInteractionSchema = createInsertSchema(avatarInteractions);
export type InsertAvatarInteraction = z.infer<typeof insertAvatarInteractionSchema>;
export type AvatarInteraction = typeof avatarInteractions.$inferSelect;

export const visualContentTypes = ["avatar_expression", "selfie", "video_message", "daily_greeting", "celebration", "outfit", "photo_set"] as const;
export type VisualContentType = (typeof visualContentTypes)[number];

export const visualContent = pgTable("visual_content", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id), // Can be null for global content
  contentType: text("content_type").$type<VisualContentType>().notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  caption: text("caption"),
  context: text("context"), // What triggered this
  emotionTag: text("emotion_tag"),
  isUnlockable: boolean("is_unlockable").default(false),
  unlockCondition: text("unlock_condition"),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVisualContentSchema = createInsertSchema(visualContent);
export type InsertVisualContent = z.infer<typeof insertVisualContentSchema>;
export type VisualContent = typeof visualContent.$inferSelect;

export const unlockedContent = pgTable("unlocked_content", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  contentId: uuid("content_id").notNull().references(() => visualContent.id),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  unlockMethod: text("unlock_method"), // 'streak', 'premium', 'achievement'
});

export const insertUnlockedContentSchema = createInsertSchema(unlockedContent);
export type InsertUnlockedContent = z.infer<typeof insertUnlockedContentSchema>;
export type UnlockedContent = typeof unlockedContent.$inferSelect;

// ---- Core Memory System ----

// Enums for Memory System
export const memoryTypeEnum = pgEnum("memory_type", [
  "exam", "interview", "date", "meeting",
  "birthday", "anniversary", "travel",
  "work_deadline", "health", "family_event",
  "personal_goal", "hobby", "stress_point", "relationship"
]);

export const triggerTypeEnum = pgEnum("trigger_type", [
  "followup", "check_in", "celebration",
  "support", "random_miss_you", "weekend_plan"
]);

export const moodEnum = pgEnum("mood", [
  "happy", "sad", "stressed", "excited",
  "anxious", "calm", "frustrated", "confident"
]);

// User Memories Table
export const userMemories = pgTable("user_memories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  memoryType: memoryTypeEnum("memory_type").notNull(),
  content: text("content").notNull(),
  context: text("context"),
  importanceScore: integer("importance_score").default(5),
  scheduledFollowupAt: timestamp("scheduled_followup_at", { withTimezone: true }),
  lastMentionedAt: timestamp("last_mentioned_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserMemorySchema = createInsertSchema(userMemories).omit({
  id: true,
  createdAt: true,
});

export type InsertUserMemory = z.infer<typeof insertUserMemorySchema>;
export type UserMemory = typeof userMemories.$inferSelect;

// Engagement Triggers Table
export const engagementTriggers = pgTable("engagement_triggers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  triggerType: triggerTypeEnum("trigger_type").notNull(),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  memoryId: uuid("memory_id").references(() => userMemories.id),
  messageTemplate: text("message_template").notNull(),
  sent: boolean("sent").default(false),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEngagementTriggerSchema = createInsertSchema(engagementTriggers).omit({
  id: true,
  createdAt: true,
});

export type InsertEngagementTrigger = z.infer<typeof insertEngagementTriggerSchema>;
export type EngagementTrigger = typeof engagementTriggers.$inferSelect;

// User Emotional States Table
export const userEmotionalStates = pgTable("user_emotional_states", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mood: moodEnum("mood").notNull(),
  energyLevel: integer("energy_level"), // 1-10
  stressLevel: integer("stress_level"), // 1-10
  detectedFrom: text("detected_from"),
  sessionId: uuid("session_id").references(() => sessions.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserEmotionalStateSchema = createInsertSchema(userEmotionalStates).omit({
  id: true,
  createdAt: true,
});

export type InsertUserEmotionalState = z.infer<typeof insertUserEmotionalStateSchema>;
export type UserEmotionalState = typeof userEmotionalStates.$inferSelect;

// Conversation Tags Table (TIER 1.3: Conversation Tagging)
export const conversationTags = pgTable("conversation_tags", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  tags: text("tags").array(), // Array of tags like ['relationship', 'advice', 'urgent']
  primaryEmotion: text("primary_emotion"), // happy, sad, stressed, etc.
  intensity: integer("intensity"), // 1-10: How intense/important this conversation
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertConversationTagSchema = createInsertSchema(conversationTags).omit({
  id: true,
  createdAt: true,
});

export type InsertConversationTag = z.infer<typeof insertConversationTagSchema>;
export type ConversationTag = typeof conversationTags.$inferSelect;

// Memory Timeline Table (TIER 2: Temporal Intelligence)
// Tracks how user's situation changes over time
export const memoryTimeline = pgTable("memory_timeline", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  memoryId: uuid("memory_id").references(() => userMemories.id, { onDelete: "cascade" }),
  metricName: text("metric_name").notNull(), // 'stress_level', 'relationship_status', 'confidence', etc.
  value: integer("value").notNull(), // 1-10 for most metrics
  context: text("context"), // Additional details
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMemoryTimelineSchema = createInsertSchema(memoryTimeline).omit({
  id: true,
  timestamp: true,
});

export type InsertMemoryTimeline = z.infer<typeof insertMemoryTimelineSchema>;
export type MemoryTimeline = typeof memoryTimeline.$inferSelect;

// Relationship Depth Table (TIER 4: Relationship Progression)
// Tracks relationship progression and intimacy levels
export const relationshipDepth = pgTable("relationship_depth", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  stage: text("stage").notNull().default("acquainted"), // 'acquainted', 'friendly', 'intimate', 'deep_trust'
  intimacyScore: integer("intimacy_score").default(0), // 0-100: How intimate the relationship is
  trustScore: integer("trust_score").default(0), // 0-100
  vulnerabilityLevel: integer("vulnerability_level").default(0), // 0-100: How much user shares vulnerable stuff
  insideJokesCount: integer("inside_jokes_count").default(0),
  anniversaryMilestones: text("anniversary_milestones"), // JSON string: {first_chat: date, 100_chats: date}
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRelationshipDepthSchema = createInsertSchema(relationshipDepth).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRelationshipDepth = z.infer<typeof insertRelationshipDepthSchema>;
export type RelationshipDepth = typeof relationshipDepth.$inferSelect;

// ---- Advanced Memory System (TIER 1) ----

export const advancedMemories = pgTable("advanced_memories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "cascade" }),

  // Layer 1: Surface Memory (What happened)
  surface: jsonb("surface").notNull(),
  // { event: string, date: string, people_involved: string[], location: string }

  // Layer 2: Emotional Memory (Why it matters)
  emotional: jsonb("emotional").notNull(),
  // { emotional_weight: number, emotions_involved: string[], emotional_trajectory: string, vulnerability_level: number, confidence_score: number }

  // Layer 3: Contextual Memory (Big picture)
  contextual: jsonb("contextual").notNull(),
  // { life_area: string, recurring_theme: boolean, related_memories: string[], pattern_type: string, significance: string }

  // Layer 4: Predictive Memory (Actionable)
  predictive: jsonb("predictive").notNull(),
  // { likely_followup_need: string, best_followup_timing: string, suggested_followup_angle: string, trigger_keywords: string[], prediction_confidence: number }

  // Meta information
  referenceCount: integer("reference_count").default(0),
  lastReferencedAt: timestamp("last_referenced_at", { withTimezone: true }),
  userConfirmation: boolean("user_confirmation").default(false),
  verificationStatus: text("verification_status").default("not_verified"), // not_verified, user_confirmed, disputed, inferred
  clarificationNotes: text("clarification_notes"),

  rawTranscript: text("raw_transcript"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAdvancedMemorySchema = createInsertSchema(advancedMemories).omit({
  id: true,
  createdAt: true,
});

export type InsertAdvancedMemory = z.infer<typeof insertAdvancedMemorySchema>;
export type AdvancedMemory = typeof advancedMemories.$inferSelect;

// ---- Memory Evolution (TIER 4) ----

export const memoryEvolutions = pgTable("memory_evolutions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  memoryId: uuid("memory_id").notNull().references(() => advancedMemories.id, { onDelete: "cascade" }),
  update: jsonb("update").notNull(),
  // { timestamp: Date, what_changed: string, previous_state: string, new_state: string, quote: string, growth_indicator: boolean }
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMemoryEvolutionSchema = createInsertSchema(memoryEvolutions).omit({
  id: true,
  createdAt: true,
});

export type InsertMemoryEvolution = z.infer<typeof insertMemoryEvolutionSchema>;
export type MemoryEvolution = typeof memoryEvolutions.$inferSelect;





// ---- Knowledge Graph (Tier 2 - Enhanced) ----

export const graphNodes = pgTable("graph_nodes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "Sarah", "Google", "Anxiety"
  type: text("type").notNull(), // e.g., "PERSON", "COMPANY", "EMOTION"
  metadata: jsonb("metadata"),  // Store flexible details here
  lastUpdated: timestamp("last_updated", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => ({
  // GENIUS FIX: A unique index on User + Name + Type ensures 
  // Riya never creates two "Sarah" nodes for the same user.
  unq: uniqueIndex('user_node_unique_idx').on(t.userId, t.name, t.type),
}));

export const graphEdges = pgTable("graph_edges", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceNodeId: uuid("source_node_id").notNull().references(() => graphNodes.id, { onDelete: "cascade" }),
  targetNodeId: uuid("target_node_id").notNull().references(() => graphNodes.id, { onDelete: "cascade" }),
  relationship: text("relationship").notNull(), // e.g., "LOVES", "WORKS_AT"
  strength: integer("strength").default(1),     // 1-10 scale
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => ({
  // GENIUS FIX: Prevents duplicate connections between the same two nodes.
  unq: uniqueIndex('edge_unique_idx').on(t.sourceNodeId, t.targetNodeId, t.relationship),
}));

export const insertGraphNodeSchema = createInsertSchema(graphNodes).omit({ id: true, createdAt: true, lastUpdated: true });
export const insertGraphEdgeSchema = createInsertSchema(graphEdges).omit({ id: true, createdAt: true });

export type InsertGraphNode = z.infer<typeof insertGraphNodeSchema>;
export type GraphNode = typeof graphNodes.$inferSelect;
export type InsertGraphEdge = z.infer<typeof insertGraphEdgeSchema>;
export type GraphEdge = typeof graphEdges.$inferSelect;

// Express Session table (managed by connect-pg-simple)
// Added here to prevent Drizzle from trying to delete it
export const expressSessions = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});
