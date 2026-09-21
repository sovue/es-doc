#!/usr/bin/env bash
set -Eeuo pipefail

: "${GH_TOKEN:?GH_TOKEN is required}"
: "${GITHUB_REPOSITORY_OWNER:?GITHUB_REPOSITORY_OWNER is required}"
: "${PACKAGE_NAME:?PACKAGE_NAME is required}"
: "${RELEASE_TAG:?RELEASE_TAG is required}"

KEEP_RELEASES="${KEEP_RELEASES:-5}"
if [[ ! "${KEEP_RELEASES}" =~ ^[1-9][0-9]*$ ]]; then
    echo "KEEP_RELEASES must be a positive integer" >&2
    exit 2
fi

owner="${GITHUB_REPOSITORY_OWNER}"
if [[ "$(gh api "users/${owner}" --jq .type 2>/dev/null || true)" == "Organization" ]]; then
    versions_endpoint="orgs/${owner}/packages/container/${PACKAGE_NAME}/versions"
else
    versions_endpoint="users/${owner}/packages/container/${PACKAGE_NAME}/versions"
fi

versions_json="$(gh api --paginate --slurp "${versions_endpoint}?per_page=100" | jq -c 'add | sort_by(.created_at) | reverse')"
kept_releases=0

while IFS= read -r encoded_version; do
    version_json="$(printf '%s' "${encoded_version}" | base64 --decode)"
    version_id="$(jq -r '.id' <<<"${version_json}")"
    mapfile -t tags < <(jq -r '.metadata.container.tags[]? // empty' <<<"${version_json}")

    if ((${#tags[@]} == 0)); then
        echo "Deleting untagged GHCR version ${version_id}"
        gh api --method DELETE "${versions_endpoint}/${version_id}"
        continue
    fi

    preserve=false
    has_release_tag=false
    for tag in "${tags[@]}"; do
        if [[ "${tag}" == "${RELEASE_TAG}" || "${tag}" != sha-* ]]; then
            preserve=true
        fi
        if [[ "${tag}" == sha-* ]]; then
            has_release_tag=true
        fi
    done

    if [[ "${preserve}" == true ]]; then
        continue
    fi

    if [[ "${has_release_tag}" == true && "${kept_releases}" -lt "${KEEP_RELEASES}" ]]; then
        kept_releases=$((kept_releases + 1))
        continue
    fi

    echo "Deleting old GHCR version ${version_id}: ${tags[*]}"
    gh api --method DELETE "${versions_endpoint}/${version_id}"
done < <(jq -r '.[] | @base64' <<<"${versions_json}")

echo "GHCR cleanup completed; kept ${kept_releases} retained release versions."
