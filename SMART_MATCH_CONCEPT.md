# Smart Match — Concept Note

## What It Does
AI-powered school-athlete pairing suggestions. Given an athlete's profile, event observations, and a school's program characteristics, Smart Match would score and rank potential fits.

## Required Data Inputs
- **Athlete profile:** position, grad year, GPA, test scores, physical metrics, playing style tags
- **Event observations:** interest levels, coach notes, follow-up flags from captured event notes
- **School profiles:** division, program style, roster needs, academic requirements, geographic preferences
- **Historical outcomes:** past recommendation success rates, response rates per school, placement data
- **Relationship signals:** existing warmth score with school, prior interactions, open recommendations

## Scoring Dimensions
1. **Athletic fit** — position need, playing style alignment, physical profile match
2. **Academic fit** — GPA/test score thresholds, program academic culture
3. **Interest signal strength** — event interaction history, mutual interest indicators
4. **Relationship warmth** — existing coach-to-school relationship, response history
5. **Timing alignment** — grad year vs. school recruiting cycle, roster gaps

## Explainability Requirements
- Every suggestion must show which dimensions contributed most to the score
- Users must be able to see raw data behind each dimension (not just a number)
- Suggestions should include a one-sentence plain-language rationale
- Users must be able to dismiss/override suggestions and the system should learn from that

## Trust / Safety Risks
- **False confidence:** a high match score on thin data could lead coaches to skip due diligence
- **Bias amplification:** if historical data skews toward certain school types or athlete profiles, suggestions will reflect that bias
- **Over-reliance:** coaches may defer judgment to the system instead of using it as input
- **Stale data:** match scores degrade quickly if roster needs, interest signals, or academic data aren't kept current
- **Privacy:** aggregating athlete data into scoring profiles raises sensitivity around who sees what

## Production Prerequisites
1. **Rich athlete profiles** — current data is sparse; need position, metrics, academic info populated
2. **Structured school data** — need roster needs, recruiting priorities, academic thresholds per school
3. **Outcome tracking** — need enough recommendation send/response/placement data to validate scoring
4. **User feedback loop** — dismiss/accept actions must feed back into scoring weights
5. **Confidence thresholds** — system should only surface suggestions above a minimum data quality bar
6. **Explainability UI** — match cards must show reasoning, not just scores
7. **AI V2 complete** — suggested actions and follow-up features should be stable first, since Smart Match builds on the same data foundation
