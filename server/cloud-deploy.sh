#!/bin/bash

# Dawayir Live Agent - Cloud Run Deployment Script
# This script automates the deployment of the backend maestro to Google Cloud Run.

PROJECT_ID=$(gcloud config get-value project)
SERVICE_NAME="dawayir-live-backend"
REGION="us-central1"

echo "🚀 Starting deployment for $SERVICE_NAME in project $PROJECT_ID..."

# Build the container image using Cloud Build
echo "📦 Building container image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME .

# Deploy to Cloud Run
echo "🌍 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=YOUR_API_KEY_HERE

echo "✅ Deployment complete!"
gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)'
