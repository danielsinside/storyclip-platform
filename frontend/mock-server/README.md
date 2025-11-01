# CreatorsFlow - StoryClips SSE Mock Bundle
Generated: 2025-10-16T09:28:16.742002

## What's inside
- `openapi.yaml` — API contract for StoryClips flow
- `mocks/` — JSON responses and SSE example streams
- `mock-server/` — Node Express server serving the mocks + SSE in real time

## Run locally
1. `cd mock-server`
2. `npm install`
3. `npm run dev`
4. Visit http://localhost:4000 and hit endpoints from the OpenAPI.
   Subscribe to SSE streams:
   - `/realtime/upload/upl_001`
   - `/realtime/jobs/job_process_001`
   - `/realtime/publish/pub_001`

You can edit files in `../mocks` and the server will serve updated data.
