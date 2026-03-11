MEANINGFUL ENGAGEMENT RULESET — PROPOSAL
=========================================

1. WHAT COUNTS AS MEANINGFUL ENGAGEMENT
-----------------------------------------

From the interactions collection, an interaction is "meaningful" if ANY of these are true:

Type-based:
- type = coach_reply or coach reply
- type = phone_call or phone call
- type = video_call or video call
- type = campus_visit or campus visit
- type = camp

Signal-based:
- coach_question_detected = true (coach actively asking athlete something)
- request_type is set / not null (coach requesting transcript, video, stats)
- invite_type is set / not null (coach inviting to visit, camp, call)
- offer_signal is set / not null (offer-related language detected)
- scholarship_signal is set / not null (scholarship mention detected)

Flag-based:
- is_meaningful = true (already tagged by system)

EXCLUDED (never counts):
- email_sent by athlete only (outbound with no coach response)
- initiated_by = system
- Internal notes, page views
- Generic blast or marketing emails
- System-only updates


2. HOW TO COMPUTE last_meaningful_engagement_at
-------------------------------------------------

During program_metrics recompute:
- Query all interactions for the program
- Filter to only those matching the meaningful rules above
- Take the most recent timestamp from that filtered set
- Store as last_meaningful_engagement_at in program_metrics
- Derive days_since_last_meaningful_engagement = today minus that date

This is SEPARATE from the existing days_since_last_engagement which counts ALL interactions.

Also: on every new interaction create/update, if it qualifies as meaningful,
update programs.last_meaningful_engagement_at in real time.


3. USER-FACING LABELS (engagement_freshness_label)
----------------------------------------------------

Days Since Last Meaningful    Label                      Color
0 to 7                        Active Recently            Green
8 to 21                       Needs Follow-Up            Amber
22 to 45                      Momentum Slowing           Orange
46+ or never                  No Recent Engagement       Red/Gray

Thresholds based on typical college recruiting contact cadence
(weekly coach cycles, 2-3 week response windows).


4. IMPLEMENTATION SCOPE
-------------------------

Backend only. No frontend changes.
- Update program_metrics service to add:
  - days_since_last_meaningful_engagement (new field)
  - engagement_freshness_label (new field)
- Wire meaningful check into interaction creation flows
- Update ProgramMetricsResponse model
