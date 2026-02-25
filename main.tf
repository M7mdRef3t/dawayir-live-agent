provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
  default     = "europe-west1"
}

variable "gemini_api_key" {
  description = "The Gemini API Key"
  type        = string
  sensitive   = true
}

# ------------------------------------------------------------------------------
# ENABLE REQUIRED GOOGLE CLOUD APIS
# ------------------------------------------------------------------------------
resource "google_project_service" "cloudrun_api" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "storage_api" {
  service            = "storage.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "vertexai_api" {
  service            = "aiplatform.googleapis.com"
  disable_on_destroy = false
}

# ------------------------------------------------------------------------------
# CLOUD RUN SERVICE
# ------------------------------------------------------------------------------
resource "google_cloud_run_service" "dawayir_service" {
  name     = "dawayir-live-agent"
  location = var.region
  depends_on = [google_project_service.cloudrun_api]

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/dawayir-live-agent"
        
        env {
          name  = "GOOGLE_PROJECT_ID"
          value = var.project_id
        }
        env {
          name  = "GEMINI_API_KEY"
          value = var.gemini_api_key
        }
        env {
          name  = "GOOGLE_CLOUD_STORAGE_BUCKET"
          value = google_storage_bucket.memory_bank.name
        }
        env {
          name  = "LOG_LEVEL"
          value = "info"
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

resource "google_storage_bucket" "memory_bank" {
  name          = "${var.project_id}-dawayir-memory"
  location      = "EU"
  force_destroy = true

  uniform_bucket_level_access = true
  
  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.dawayir_service.name
  location = google_cloud_run_service.dawayir_service.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "service_url" {
  value = google_cloud_run_service.dawayir_service.status[0].url
}
