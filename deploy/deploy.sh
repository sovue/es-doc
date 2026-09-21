#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-${PROJECT_DIR}/compose.production.yaml}"
ENV_FILE="${ENV_FILE:-${PROJECT_DIR}/.env.production}"
STATE_FILE="${STATE_FILE:-${PROJECT_DIR}/.last-successful-release}"
PREVIOUS_STATE_FILE="${PREVIOUS_STATE_FILE:-${PROJECT_DIR}/.previous-successful-release}"
LOCK_DIR="${LOCK_DIR:-${PROJECT_DIR}/.deploy.lock}"

release_tag="${1:-}"

if [[ ! "${release_tag}" =~ ^sha-[0-9a-f]{40}$ ]]; then
    echo "Usage: $0 sha-<40 lowercase hexadecimal characters>" >&2
    exit 2
fi

if [[ ! -f "${ENV_FILE}" ]]; then
    echo "Missing deployment environment file: ${ENV_FILE}" >&2
    exit 2
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
    echo "Missing Compose file: ${COMPOSE_FILE}" >&2
    exit 2
fi

if ! mkdir -- "${LOCK_DIR}" 2>/dev/null; then
    echo "Another deployment is already running (${LOCK_DIR})" >&2
    exit 3
fi
cleanup() {
    rmdir -- "${LOCK_DIR}"
}
trap cleanup EXIT

compose() {
    local tag="$1"
    shift
    ES_DOC_TAG="${tag}" docker compose \
        --env-file "${ENV_FILE}" \
        --file "${COMPOSE_FILE}" \
        "$@"
}

previous_tag=""
if [[ -f "${STATE_FILE}" ]]; then
    previous_tag="$(<"${STATE_FILE}")"
    if [[ ! "${previous_tag}" =~ ^sha-[0-9a-f]{40}$ ]]; then
        echo "Ignoring invalid previous release in ${STATE_FILE}" >&2
        previous_tag=""
    fi
fi

echo "Validating Compose configuration for ${release_tag}..."
compose "${release_tag}" config --quiet

rollback() {
    if [[ -z "${previous_tag}" ]]; then
        echo "No previous successful release is recorded; manual recovery is required." >&2
        return 1
    fi

    echo "Rolling back to ${previous_tag}..." >&2
    if compose "${previous_tag}" pull && compose "${previous_tag}" up --wait --remove-orphans; then
        echo "Rollback completed: ${previous_tag}" >&2
        return 0
    fi

    echo "Rollback failed; inspect Docker Compose logs on the host." >&2
    return 1
}

echo "Pulling ${release_tag}..."
if ! compose "${release_tag}" pull; then
    echo "Could not pull ${release_tag}." >&2
    rollback || true
    exit 1
fi

echo "Starting ${release_tag} and waiting for healthy services..."
if compose "${release_tag}" up --wait --remove-orphans; then
    if [[ -n "${previous_tag}" && "${previous_tag}" != "${release_tag}" ]]; then
        printf '%s\n' "${previous_tag}" >"${PREVIOUS_STATE_FILE}"
    fi
    printf '%s\n' "${release_tag}" >"${STATE_FILE}"
    echo "Deployment completed: ${release_tag}"
    exit 0
fi

echo "Deployment failed for ${release_tag}." >&2
rollback || true
exit 1
