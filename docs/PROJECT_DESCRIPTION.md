# Jumpstride Career Aptitude Test Platform

## Project Overview
Jumpstride is a comprehensive psychometric web application designed to help students discover their career pathways. It administers a 500-question assessment across five key sections and maps the results to over 121 career recommendations using Holland Codes (RIASEC), Multiple Intelligences, and specific Aptitude scores.

## Architecture
- **Frontend**: React (Vite) with Tailwind CSS for a modern, responsive UI.
- **Backend**: Node.js with Express and MongoDB (via Mongoose) for data management and user progress tracking.
- **Data Source**: A master package (`comprehensive500Package.generated.js`) and seed files (`assessment-seed.json`) provide the question bank.
- **Media**: Question-specific assets (Spatial, Mechanical, Abstract) are served from `public/question-media/`.

## Key Features
- **Comprehensive 500-Question Assessment**:
  - Section 1: Leadership & Social Skills (100 Likert questions).
  - Section 2: Emotional & Multiple Intelligences (100 Likert questions).
  - Section 3: Interest Assessment (90 mixed questions).
  - Section 4: Aptitude Battery (140 objective questions: Verbal, Numerical, Abstract, Spatial, Mechanical, Clerical).
  - Section 5: Personality & Values (70 Likert questions).
- **Advanced Assessment Logic**:
  - Per-section timers with auto-save functionality.
  - Interactive question types including spatial reasoning figures and clerical pair-matching.
  - Progress synchronization with the backend via secure tokens.
- **Scoring & Mapping**:
  - Integrated Holland Code (RIASEC) scoring.
  - Emotional Intelligence (EQ) and Multiple Intelligence profiling.
  - Automated career pathway mapping (121 careers).

## Project Status
### Completed
- Core engine for administering the 500-question test.
- User authentication and session persistence.
- Section-based navigation and timer logic.
- RISEC scoring implementation.

### In Progress / Pending Fixes
- **Content Remediation**: Aligning question text and operators with the master source PDFs.
- **Asset Integration**: Mapping all spatial and mechanical reasoning images to their respective questions.
- **UI/UX Refinement**: Improving the display of complex question types like clerical pairs and time-based inputs.
- **Scoring Validation**: Ensuring the logic correctly handles all 500 questions across different scoring types.
