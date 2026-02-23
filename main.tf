provider "google" {
  project = var.project_id
  region  = "europe-west1"
}

variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

resource "google_cloud_run_service" "dawayir_service" {
  name     = "dawayir-live-agent"
  location = "europe-west1"

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/dawayir-live-agent"
        env {
          name  = "GOOGLE_PROJECT_ID"
          value = var.project_id
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
}

resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.dawayir_service.name
  location = google_cloud_run_service.dawayir_service.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
