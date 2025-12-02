# Persona Evolution Algorithms (Riya AI Companion)

Persona evolution is the mechanism by which the user's AI companion learns, adjusts, and evolves its behavior over time based on conversations, preferences, and corrective feedback.

Persona evolution is what makes Riya feel alive, personal, and unique for each user.

We evolve persona in 3 layers:
1. **Base Persona Layer** (static preset like Sweet, Flirty, Confident, Mature)
2. **Session Summary Layer** (insights extracted after each session)
3. **Persona Modifier Layer** (dynamic JSON that continuously evolves)

Persona evolution creates a personalized, hybrid persona per user.

## 1. Persona Evolution Architecture

We use 3 datasets per user:

| Component | Stored In | Purpose |
|-----------|-----------|---------|
| Base Persona | users.persona | The fixed starting template selected by user |
| Session Summaries | sessions table | Raw signals from each session |
| Latest Merged Summary | user_summary_latest table | The current "profile" of user preferences |
| Persona Modifier | users.persona_prompt | Dynamic adjustments to how Riya behaves |

These datasets combine to shape the final system prompt for chat and voice.

## 2. Inputs Considered for Evolution

Persona evolves based on:

### A. Partner Type Signals
From `partner_type_one_liner`:
- calm
- supportive
- ambitious
- expressive
- humorous

### B. Top 3 Traits You Value Most
From summary:
- empathy
- humor
- shared ambition

### C. Growth Areas / Work On
E.g., if user struggles with:
- opening up
- expressing emotions
- communication

### D. Conversation Behavior Signals
We use conversation metadata:
- user message length
- user emotional tone
- topics they revisit
- types of questions they ask
- hesitation (1-word replies, pauses)
- user's language preference: Hindi heavy / Hinglish / English

This fine-tunes:
- pacing
- emotional warmth
- humor
- supportiveness
- probing depth

### E. Direct User Choices
If user selects "Add this behavior to my persona" on summary screen, we apply it directly to persona modifier.

## 3. Persona Evolution Algorithm (High-Level)

```
1. Retrieve:
   - user.basePersona
   - user.persona_prompt (current modifier)
   - latestSessionSummary
   - previousMergedSummary

2. Generate an updated mergedSummary:
   mergedSummary = AI_Merge(existingSummary, newSummary)

3. Create personaAdjustments:
   personaAdjustments = AI_Evaluate(mergedSummary)

4. Update persona_modifier (JSONB):
   newPersonaModifier = merge(user.persona_prompt, personaAdjustments)

5. Save:
   - sessions.persona_snapshot = newPersonaModifier
   - users.persona_prompt = newPersonaModifier
   - user_summary_latest = mergedSummary
```

## 4. Persona Evolution Algorithm (Detailed Logic)

### 4.1 Deriving Adjustments From Partner Type

| Summary | Persona Modifier |
|---------|------------------|
| "you like calm, emotionally warm partners" | `"tone": "softer, slower, emotionally warm"` |
| "you prefer confident, expressive partners" | `"tone": "more expressive, bold, direct"` |

### 4.2 Deriving Adjustments From Traits You Value

| Trait Valued | Adjustment to Persona |
|--------------|----------------------|
| Empathy | More emotional mirroring, gentle reflections |
| Humor | Light banter included more often |
| Ambition | More structured, growth-oriented advice |
| Stability | Calm, slow-paced replies |
| Expressiveness | More open sharing from Riya |

### 4.3 Deriving Adjustments From Growth Areas

| Growth Area | AI Companion Adjustment |
|-------------|------------------------|
| Opening Up | Riya creates emotional safety, asks deeper questions |
| Conflict Avoidance | Riya teaches gentle assertiveness |
| Communication | Riya models clear, warm communication |

### 4.4 Deriving Adjustments From Language Signals

- If user uses 80% Hindi → Riya increases Hindi vocabulary
- If user uses 80% English → Replies shift toward English but keep Hinglish warmth
- If user uses slang → Riya mirrors tone subtly

Stored as:
```json
"language_style": "hindi-heavy" | "balanced-hinglish" | "english-leaning"
```

## 5. Persona Modifier JSON (Final Structure)

```json
{
  "tone": "soft, caring, warm",
  "humor_level": "low | medium | high",
  "confidence_level": "low | medium | high",
  "pace": "slow | medium | fast",
  "reflection_depth": "shallow | normal | deep",
  "language_style": "hinglish-balanced",
  "probing_style": "gentle | moderate | direct",
  "preferred_topics": ["emotions", "ambition", "relationships"],
  "avoid_topics": [],
  "persona_strengths": ["empathetic", "playful"],
  "persona_added_by_user": ["more-humor", "more-supportiveness"]
}
```

## 6. Persona Evolution Examples

**User Summary Example:**
- Ideal Partner: calm, emotionally expressive
- Top Traits: empathy, humor, emotional availability
- Growth Areas: avoid expressing conflict
- Language: Hinglish leaning

**Generated Persona Modifier:**
```json
{
  "tone": "warm, emotionally expressive, supportive",
  "humor_level": "medium",
  "confidence_level": "medium",
  "pace": "slow",
  "reflection_depth": "deep",
  "probing_style": "gentle",
  "preferred_topics": ["emotional safety", "communication"],
  "persona_strengths": ["empathetic"],
  "language_style": "hinglish-balanced"
}
```

## 7. Persona Evolution Weighting Algorithm

| Input | Weight | Reason |
|-------|--------|--------|
| Last session | 0.6 | Recency is most accurate |
| Past sessions | 0.3 | Stabilizes personality |
| Base persona | 0.1 | Keeps identity intact |

**Final persona** = (0.6 × last summary insights) + (0.3 × historical summary) + (0.1 × base persona)

## 8. Updating Persona Each Session

1. New session summary generated
2. AI merges with old summary → updated user profile
3. Persona adjustments generated
4. persona_prompt updated in DB
5. session.persona_snapshot saved for that session
6. Confidence score increases 5–10%
7. Summary Tracker UI updates

## 9. How Persona Evolution Affects System Prompt

```
Final prompt =
  Base Persona Template
  + Persona Modifier JSON (converted into natural-language style)
  + Riya System Prompt
  + User's memory (merged summary)
```

This gives:
- Unique voice
- Unique emotional tone
- Unique pacing
- Continuous adaptation to user personality

## 10. Developer Tasks (Implementation Checklist)

### Backend
- [ ] Add persona evolution engine
- [ ] Run merging logic after every session
- [ ] Update persona_prompt JSON
- [ ] Store persona_snapshot in each session
- [ ] Use persona_prompt + merged summary in system prompt generation
- [ ] Weight recency more heavily

### Frontend
- [ ] Summary screen: allow "Apply this behavior" → store in persona_modifier
- [ ] Show persona evolution progress subtly (optional)

### AI Layer
- [ ] Prompt templates for persona evolution
- [ ] Prompt templates for persona conversion to natural language
- [ ] Ensure persona modifier is appended before Riya base prompt

## 11. Optional Enhancements

- Persona "archetype scores" (0–100 for each persona)
- Reinforcement from user reactions (thumbs up/down)
- Periodic "persona tune-up" every 5 sessions
- Visual evolution graph on Summary Page
