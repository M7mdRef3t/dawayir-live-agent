#!/usr/bin/env bash
set -euo pipefail

# Dawayir Live Agent - Cloud Run Deployment Script
# Usage:
#   GEMINI_API_KEY=xxx ./cloud-deploy.sh
# Optional overrides:
#   PROJECT_ID=my-gcp-project SERVICE_NAME=dawayir-live-agent REGION=europe-west1 GEMINI_API_VERSION=v1alpha ./cloud-deploy.sh

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
SERVICE_NAME="${SERVICE_NAME:-dawayir-live-agent}"
REGION="${REGION:-europe-west1}"
GEMINI_API_KEY="${GEMINI_API_KEY:-}"
GEMINI_LIVE_MODEL="${GEMINI_LIVE_MODEL:-models/gemini-2.5-flash-native-audio-latest}"
GEMINI_API_VERSION="${GEMINI_API_VERSION:-v1alpha}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "ERROR: PROJECT_ID is empty. Set it or run: gcloud config set project <PROJECT_ID>"
  exit 1
fi

if [[ -z "${GEMINI_API_KEY}" ]]; then
  echo "ERROR: GEMINI_API_KEY is required. Run with:"
  echo "   GEMINI_API_KEY=your_key_here ./cloud-deploy.sh"
  exit 1
fi

GOOGLE_PROJECT_ID="${GOOGLE_PROJECT_ID:-$PROJECT_ID}"
GOOGLE_CLOUD_STORAGE_BUCKET="${GOOGLE_CLOUD_STORAGE_BUCKET:-dawayir-memory-bank}"

IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "Deploying ${SERVICE_NAME} to Cloud Run (Memory Bank Enabled)"
echo "   PROJECT_ID=${PROJECT_ID}"
echo "   REGION=${REGION}"
echo "   BUCKET=${GOOGLE_CLOUD_STORAGE_BUCKET}"

echo "Building container image with Cloud Build..."
gcloud builds submit --tag "${IMAGE}" .

echo "Deploying service..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE}" \
  --platform managed \
  --region "${REGION}" \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=${GEMINI_API_KEY},GEMINI_LIVE_MODEL=${GEMINI_LIVE_MODEL},GEMINI_API_VERSION=${GEMINI_API_VERSION},GOOGLE_PROJECT_ID=${GOOGLE_PROJECT_ID},GOOGLE_CLOUD_STORAGE_BUCKET=${GOOGLE_CLOUD_STORAGE_BUCKET}"

SERVICE_URL="$(gcloud run services describe "${SERVICE_NAME}" --platform managed --region "${REGION}" --format 'value(status.url)')"

echo "Deployment complete"
echo "SERVICE_URL=${SERVICE_URL}"
echo "HEALTH_CHECK=${SERVICE_URL}/health"
