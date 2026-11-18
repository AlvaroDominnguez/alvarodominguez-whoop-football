# WHOOP Football Analytics

Private read API for the WHOOP sync data stored in Railway object storage.

## Security
- WHOOP credentials, object-storage credentials, API bearer token and personal metrics must never be committed to this repository.
- The repository is public; all runtime secrets belong in Railway service variables.
- Data endpoints require `Authorization: Bearer <API_BEARER_TOKEN>`.
- `/health` is a non-sensitive liveness endpoint.

## Runtime
The deployed Railway Function runs on Bun and reads the same S3-compatible bucket as the scheduled WHOOP sync service.

## Endpoints
- `GET /health` — liveness check.
- `GET /v1/latest` — latest daily report JSON.
- `GET /v1/daily.csv` — historical daily export.
- `GET /v1/workouts.csv` — workout export.

All data endpoints are read-only and return `Cache-Control: no-store`.

## Deployment
The live HTTP function is managed in Railway as `whoop-private-api`. Its source is mirrored in `src/index.ts`. Configure the S3 variables using Railway service references to `whoop-sync-cron`, and set a strong `API_BEARER_TOKEN` only in Railway.

## ChatGPT connection
Use the OpenAPI contract in `openapi.yaml` for a compatible authenticated API connector/action. The bearer token must be configured as a secret in that integration, never pasted into a prompt or committed here.
