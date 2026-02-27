# ✅ Cloud Deployment Verification

This document provides proof and instructions for verifying that **Dawayir** is deployed on Google Cloud Platform (GCP), as required by the Gemini Live Agent Challenge.

## 1. 🏗️ Architecture on GCP

- **Compute:** Google Cloud Run (Serverless Container)
  - Service Name: `dawayir-live-agent`
  - Region: `europe-west1` (Belgium)
- **Storage:** Google Cloud Storage (GCS)
  - Bucket: `dawayir-memory-bank` (or configured bucket)
  - Purpose: Storing mental maps JSON and session reports MD.
- **AI:** Vertex AI / Google GenAI SDK
  - Model: `gemini-2.5-flash-native-audio-preview-12-2025`

## 2. 🚀 Automated Deployment (Infrastructure as Code)

We use **Terraform** and **Cloud Build** for reproducible infrastructure, satisfying the "Automated Cloud Deployment" bonus requirement.

### Files:
- `main.tf`: Defines Cloud Run service, IAM roles, and GCS bucket.
- `server/cloudbuild.yaml`: CI/CD pipeline definition.
- `server/cloud-deploy.sh`: One-click deployment script.

### How to Deploy:

**Option A: Terraform (Recommended)**
```bash
# 1. Initialize Terraform
terraform init

# 2. Apply Configuration (provisions Cloud Run + GCS)
terraform apply -var="project_id=YOUR_PROJECT_ID" -var="gemini_api_key=YOUR_KEY"
```

**Option B: Cloud Build**
```bash
cd server
gcloud builds submit --config=cloudbuild.yaml
```

## 3. 🖥️ Verification Steps for Judges

### A. Accessing the Live Agent
1. Visit the Cloud Run URL (provided in Devpost submission).
2. You will see the React Frontend served by the Express backend.
3. Check `/health` endpoint: returns `OK`.

### B. Checking Cloud Logs
1. Go to **Google Cloud Console > Cloud Run > dawayir-live-agent > Logs**.
2. Filter for `[dawayir-server]`.
3. You will see real-time logs of the WebSocket connection and Gemini Live API events proving backend execution.

### C. Checking Persistence (Memory)
1. Go to **Cloud Storage Console**.
2. Open the bucket.
3. You will see `session_report_*.md` files generated after valid sessions, proving the `generate_session_report` tool functionality.

---
*Generated for Gemini Live Agent Challenge Submission*
