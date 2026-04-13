#!/bin/bash

# Taleemabad CMS Docker Deployment Script
# Usage: ./scripts/deploy.sh [staging|prod] [--push]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Config
REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE_NAME="${IMAGE_NAME:-taleemabad-cms}"
VERSION=$(git describe --tags --always 2>/dev/null || echo "dev")
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Parse arguments
ENVIRONMENT="${1:-staging}"
PUSH="${2:-}"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|prod|local)$ ]]; then
  echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
  echo "Usage: ./scripts/deploy.sh [staging|prod|local] [--push]"
  exit 1
fi

# Functions
log() {
  echo -e "${BLUE}→${NC} $1"
}

success() {
  echo -e "${GREEN}✓${NC} $1"
}

error() {
  echo -e "${RED}✗${NC} $1"
  exit 1
}

# Load environment variables
load_env() {
  local env_file=".env.$ENVIRONMENT"
  if [[ ! -f "$env_file" ]]; then
    log "Environment file not found: $env_file"
    log "Using .env.example as template"
    cp .env.example "$env_file"
  fi
  export $(cat "$env_file" | grep -v '^#' | xargs)
  success "Loaded environment: $ENVIRONMENT"
}

# Build Docker image
build_image() {
  local tag="$REGISTRY/$IMAGE_NAME:$ENVIRONMENT-$VERSION"
  local latest_tag="$REGISTRY/$IMAGE_NAME:$ENVIRONMENT-latest"

  log "Building Docker image: $tag"
  docker build \
    --tag "$tag" \
    --tag "$latest_tag" \
    --label "version=$VERSION" \
    --label "commit=$COMMIT_SHA" \
    --label "build_date=$BUILD_DATE" \
    --label "environment=$ENVIRONMENT" \
    .

  success "Image built: $tag"
  echo "$tag" > /tmp/cms_image_tag.txt
}

# Test image
test_image() {
  local tag=$(cat /tmp/cms_image_tag.txt)
  log "Testing image: $tag"

  # Run container and check health
  local container_id=$(docker run -d \
    -p 3000:3000 \
    --env-file ".env.$ENVIRONMENT" \
    "$tag")

  sleep 3

  if docker exec "$container_id" wget --quiet --spider http://localhost:3000 2>/dev/null; then
    success "Health check passed"
    docker stop "$container_id" 2>/dev/null || true
  else
    error "Health check failed"
    docker logs "$container_id"
    docker stop "$container_id" 2>/dev/null || true
    exit 1
  fi
}

# Push to registry
push_image() {
  local tag=$(cat /tmp/cms_image_tag.txt)
  local latest_tag="$REGISTRY/$IMAGE_NAME:$ENVIRONMENT-latest"

  if [[ "$PUSH" != "--push" ]]; then
    log "Skipping push (use --push flag to push to registry)"
    return
  fi

  log "Pushing to registry: $tag"
  docker push "$tag"
  docker push "$latest_tag"
  success "Image pushed to registry"
}

# Deploy to staging/prod
deploy() {
  local tag=$(cat /tmp/cms_image_tag.txt)

  case "$ENVIRONMENT" in
    staging)
      log "Deploying to staging..."
      # Add your staging deployment command here
      # Example: kubectl set image deployment/cms-staging cms=$tag
      success "Staging deployment started (manual deployment step required)"
      ;;
    prod)
      log "Deploying to production..."
      read -p "⚠️  Deploy to PRODUCTION? This cannot be undone. (yes/no): " confirm
      if [[ "$confirm" != "yes" ]]; then
        error "Deployment cancelled"
      fi
      # Add your production deployment command here
      # Example: kubectl set image deployment/cms-prod cms=$tag
      success "Production deployment started (manual deployment step required)"
      ;;
    local)
      log "Running container locally..."
      docker run -it \
        -p 3000:3000 \
        --env-file ".env.$ENVIRONMENT" \
        "$tag"
      ;;
  esac
}

# Main
main() {
  echo -e "${BLUE}═══════════════════════════════════════${NC}"
  echo -e "${BLUE}Taleemabad CMS Docker Deployment${NC}"
  echo -e "${BLUE}═══════════════════════════════════════${NC}"
  echo ""

  log "Environment: $ENVIRONMENT"
  log "Version: $VERSION"
  log "Commit: $COMMIT_SHA"
  log "Build Date: $BUILD_DATE"
  echo ""

  load_env
  build_image
  test_image
  push_image

  if [[ "$PUSH" == "--push" ]]; then
    log "Ready for deployment"
    success "All steps completed"
  else
    success "Build and test completed (use --push to push to registry)"
  fi
}

# Run main
main
