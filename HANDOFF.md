# Project: FluentFlow AI

## Stack Summary
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS, deployed on Vercel
- **Backend**: FastAPI Python, deployed on Railway
- **Real-time Audio**: LiveKit
- **LLM + STT + TTS**: Grok API
- **Database**: PostgreSQL (deployed on Railway)

## Current status
- Switched to Groq (LLM/STT) + Deepgram (TTS) — Live API keys configured.
- Migrated `agent.py` to LiveKit Agents 1.x API (`AgentSession` + `Agent`).
- Fixed `AttributeError: 'ChatContext' object has no attribute 'append'` by switching to `add_message`.
- Verified backend and agent worker initialization; successfully connecting to LiveKit Cloud.
- Frontend UI is premium and correctly integrated with the token server.

## Next task
- End-to-end user testing with actual audio (requires stable connection/CPU).
- Final deployment to Railway (backend) and Vercel (frontend).
