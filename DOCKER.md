# Docker Setup & Deployment Guide

This guide covers containerizing the Taleemabad CMS for development and production deployment.

## Quick Start — Local Docker Build

### Prerequisites
- Docker installed ([download](https://www.docker.com/products/docker-desktop))
- Docker Compose (included with Docker Desktop)

### Run Locally (without Node.js installed)

```bash
# Build and run
docker-compose up

# App runs at http://localhost:3000
```

No Node.js needed—Docker handles all dependencies.

## Docker Image Details

### Multi-Stage Build
The `Dockerfile` uses a 2-stage build process:

1. **Stage 1 (builder)** — Node 20 Alpine, installs deps, builds the app
2. **Stage 2 (runtime)** — Minimal image, only includes built app + `serve`

**Result**: ~100MB production image (no build tools, no node_modules in final image)

### Environment Variables
Pass via `.env` file or `-e` flag:

```bash
docker run \
  -e VITE_API_BASE_URL=https://api.staging.taleemabad.com \
  -e VITE_API_KEY=your-key \
  -p 3000:3000 \
  ghcr.io/taleemabad/cms:latest
```

Available variables:
- `VITE_API_BASE_URL` — Backend API endpoint
- `VITE_API_KEY` — API key (client-side, not a secret)
- `VITE_FDE_STAGE_URL` — FDE staging URL
- `VITE_FDE_PROD_URL` — FDE production URL
- `VITE_RWL_STAGE_URL` — RWL staging URL
- `VITE_RWL_PROD_URL` — RWL production URL

## Local Development with Docker

### Option A: Docker Compose (Recommended)

```bash
# Start dev container
docker-compose up

# Rebuild after code changes
docker-compose up --build
```

Container watches for changes (if using volume mounts).

### Option B: Manual Docker Build

```bash
# Build image
docker build -t taleemabad-cms:dev .

# Run container
docker run -p 3000:3000 \
  --env-file .env \
  taleemabad-cms:dev
```

## Production Deployment

### 1. GitHub Container Registry (ghcr.io)

Push images automatically via GitHub Actions:

```bash
# Images are built on every push to main/staging/master
# Automatically pushed to ghcr.io/yourusername/taleemabad-cms:latest
```

Authenticate locally:

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

Pull and run:

```bash
docker pull ghcr.io/yourusername/taleemabad-cms:latest
docker run -p 3000:3000 \
  --env-file .env.production \
  ghcr.io/yourusername/taleemabad-cms:latest
```

### 2. AWS ECR (Elastic Container Registry)

```bash
# Create ECR repo
aws ecr create-repository --repository-name taleemabad-cms --region us-east-1

# Authenticate
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# Tag and push
docker tag taleemabad-cms:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/taleemabad-cms:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/taleemabad-cms:latest
```

### 3. Deploy to Kubernetes

Example deployment manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: taleemabad-cms
spec:
  replicas: 3
  selector:
    matchLabels:
      app: taleemabad-cms
  template:
    metadata:
      labels:
        app: taleemabad-cms
    spec:
      containers:
      - name: cms
        image: ghcr.io/yourusername/taleemabad-cms:latest
        ports:
        - containerPort: 3000
        env:
        - name: VITE_API_BASE_URL
          valueFrom:
            configMapKeyRef:
              name: cms-config
              key: api-base-url
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
```

### 4. Deploy to Docker Swarm

```bash
# Build image
docker build -t taleemabad-cms:1.0 .

# Create service
docker service create \
  --name taleemabad-cms \
  --publish 3000:3000 \
  --env VITE_API_BASE_URL=https://api.taleemabad.com \
  --replicas 3 \
  taleemabad-cms:1.0
```

## CI/CD Pipeline

### GitHub Actions Workflow (`.github/workflows/docker-build.yml`)

Automatically:
1. Runs on push to `main`, `staging`, `master` branches
2. Runs on pull requests (build only, no push)
3. Runs type-check + linting + build
4. Builds Docker image with BuildKit
5. Pushes to `ghcr.io` on successful build

**Tags generated:**
- `latest` (on main branch)
- `staging-<sha>` (on staging branch)
- `master-<sha>` (on master branch)
- `v1.0.0` (on tags)

### Manual Trigger

```bash
# Trigger workflow from command line
gh workflow run docker-build.yml
```

## Monitoring & Health Checks

### Container Health
The image includes a health check:

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' <container-id>
```

Logs:

```bash
docker logs <container-id>
```

### Port Mapping
- Container port: `3000`
- Map to host: `-p <host-port>:3000`

Example:

```bash
docker run -p 8080:3000 taleemabad-cms  # Access via localhost:8080
```

## Troubleshooting

### Image Won't Build
```bash
# Check Dockerfile syntax
docker build --check .

# Verbose output
docker build -v .
```

### Container Exits Immediately
```bash
# Check logs
docker logs <container-id>

# Run with interactive shell
docker run -it --entrypoint sh taleemabad-cms:dev
```

### Can't Access on http://localhost:3000
```bash
# Verify port mapping
docker ps  # Check PORT column

# Check if container is running
docker ps -a

# Verify port isn't already in use
netstat -tuln | grep 3000  # Linux/Mac
netstat -ano | findstr 3000  # Windows
```

### API Requests Fail
```bash
# Verify environment variables
docker inspect <container-id> | grep -A 20 Env

# Check VITE_API_BASE_URL is correct
```

## Image Size Optimization

Current image size: **~100MB** (minimal, production-ready)

To further optimize:

```dockerfile
# Use distroless base (ultra-minimal)
FROM gcr.io/distroless/nodejs20-debian11

WORKDIR /app
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

Result: **~50MB** image

## Security Considerations

1. **Run as non-root user** (recommended for Kubernetes):
   ```dockerfile
   RUN addgroup -g 1001 -S nodejs
   RUN adduser -S nodejs -u 1001
   USER nodejs
   ```

2. **Scan for vulnerabilities**:
   ```bash
   docker scan taleemabad-cms:latest
   trivy image taleemabad-cms:latest
   ```

3. **Use image signing** (for production):
   ```bash
   cosign sign ghcr.io/yourusername/taleemabad-cms:latest
   ```

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
