STACK v27.0 — Intelligence Foundation

Core: Data Core 2.0 compatibility layer, Process Intelligence, cross-domain STACK Score, STACK Insight, Weekly Review, 90-day focus onboarding, recovery guard and unified PWA build 27.0.0.

Data migration policy: non-destructive. Existing localStorage keys remain compatible; v27 reads them through a unified schema-2 layer.

Product position: personal management system — processes, tasks, finance, fitness and trajectory, not just a habit tracker.

Release note: v27 keeps the compatibility filename stack-v26-deals-intelligence.js as the existing index loader; it dynamically loads stack-v27-core.js.

PWA note: precache installation is resilient — one missing optional asset no longer aborts the entire service-worker install.

Status: RC.
