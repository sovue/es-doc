# Semi-Automatic Docker Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a reproducible, manually approved deployment path for ES Doc that builds an immutable Docker image in GitHub Actions, deploys it to a Docker Compose host, waits for a health check, and supports a one-command rollback.

**Architecture:** GitHub Actions builds and publishes an image tagged with the application commit SHA and pins the content repository to an exact commit. A protected `production` environment gates the deployment job. The server receives the production Compose files and runs a strict deployment script that validates the release tag, pulls the image, waits for healthy services, and restores the previous tag if the update fails.

**Tech Stack:** Docker, Docker Compose, FastAPI, GitHub Actions, GHCR, SSH, Python `unittest`.

---

### Task 1: Add an application health contract

**Files:** `tests/test_health.py`, `app/routes/health.py`

1. Write an async test for `GET /healthz` that expects HTTP 200, `text/plain`, and body `ok`.
2. Run the focused test and verify it fails because the endpoint does not exist yet.
3. Add the route without starting background workers or reading content.
4. Run the focused test and the existing test suite.

### Task 2: Make the image reproducible and ready for health checks

**Files:** `Dockerfile`

1. Use the stable Python slim image and explicit build arguments for the app revision and content revision.
2. Fetch content by the exact revision supplied by CI and expose revision labels for inspection.
3. Add a container health check that calls `/healthz`.
4. Run a local Docker build and inspect the resulting image metadata.

### Task 3: Add a production Compose stack and deployment environment template

**Files:** `compose.production.yaml`, `.env.production.example`

1. Reference an immutable image tag supplied by the deployment environment.
2. Remove development bind mounts, use a named cache volume, and wait for the web health check before starting nginx.
3. Keep deployment-specific values in a server-side `.env.production` file.
4. Validate the rendered Compose configuration with `docker compose config`.

### Task 4: Add a guarded deployment and rollback script

**Files:** `deploy/deploy.sh`

1. Enable strict shell mode and a lock directory to prevent concurrent deploys.
2. Validate that the requested release is a SHA tag, render the Compose configuration, pull the image, and run `up --wait --remove-orphans`.
3. Persist the successful tag and automatically restore the previous tag if the update fails.
4. Run shell syntax checks and exercise the non-destructive validation path locally.

### Task 5: Add CI and manually approved GitHub Actions deployment

**Files:** `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`

1. Run tests and Compose validation on pull requests and pushes to `main`.
2. Add a `workflow_dispatch` deployment with explicit app and content refs.
3. Build and publish a GHCR image tagged by the app commit SHA, with pinned action commits, BuildKit cache, SBOM, and provenance.
4. Gate the deployment job behind the protected `production` environment and serialize production runs.
5. Transfer only deployment files over SSH using a supplied known-hosts file, then invoke the server-side script.

### Task 6: Document operator setup and rollback

**Files:** `README.md`, `.env.production.example`

1. Document the one-time server layout, GitHub environment secrets, and manual workflow inputs.
2. Explain the normal release path, health-gated behavior, and rollback command.
3. Keep the production deployment separate from the existing local development workflow.

### Task 7: Verify and commit the implementation

1. Run the full Python test suite, Compose config validation, workflow YAML parsing, Docker build, and shell syntax checks.
2. Review the diff for secrets, mutable deployment tags, and accidental development mounts.
3. Commit logical groups with the configured Git identity and no AI co-authors.
