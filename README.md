# CV AI Evaluation

An AI-powered evaluation service that intelligently analyzes CVs and project reports against job requirements. The service uses vector embeddings and semantic search to provide comprehensive candidate assessments.

## Features

- **Document Storage & Embedding**: Store and vectorize job descriptions, requirements, and internal documents for semantic search
- **CV & Project Report Analysis**: Upload and evaluate candidate documents against job criteria
- **AI-Powered Evaluation**: Leverage OpenAI and LangChain for intelligent document analysis
- **Asynchronous Processing**: Background job processing with BullMQ for handling large document evaluations
- **RESTful API**: Well-documented API endpoints with Swagger/OpenAPI documentation

## Tech Stack

- **[Nest.js](https://nestjs.com/)** - Progressive Node.js framework
- **[OpenAI](https://openai.com/)** - AI-powered text analysis
- **[LangChain](https://www.langchain.com/)** - AI application framework
- **[Qdrant](https://qdrant.tech/)** - Vector database for semantic search
- **[Supabase](https://supabase.com/)** - Backend services and storage
- **[BullMQ](https://docs.bullmq.io/)** - Redis-based queue for background jobs

## Prerequisites

- Node.js (v18 or higher)
- pnpm (v8 or higher)
- Redis (for BullMQ)
- Qdrant instance
- Supabase account
- OpenAI API key

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure the required environment variables:

```bash
cp .env.example .env
```

Make sure to fill in:

- OpenAI API credentials
- Supabase URL and keys
- Qdrant connection details
- Redis connection string
- Other service-specific configurations

### 3. Generate Supabase Types

```bash
pnpm run supabase:types
```

### 4. Run Development Server

```bash
pnpm run start:dev
```

The API will be available at `http://localhost:3000`
API documentation: `http://localhost:3000/docs`

## Build & Production

### Build for Production

```bash
pnpm run build
```

### Run Production Build

```bash
pnpm run start:prod
```

## Deployment

### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start dist/main.js --name cv-ai-evaluation

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

### Using Docker/Podman

First, ensure Docker or Podman is installed on your system. Then build and run:

```bash
# Build the image (use 'docker' or 'podman')
podman build -t cv-ai-evaluation .

# Run the container with environment file
podman run -p 3000:3000 --env-file .env cv-ai-evaluation

# Or run with environment variables directly
podman run -p 3000:3000 \
  -e OPENAI_API_KEY=your_key \
  -e SUPABASE_URL=your_url \
  cv-ai-evaluation
```

For production with docker-compose, create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    restart: unless-stopped
```

Then run: `docker-compose up -d`

## Scripts

- `pnpm run start:dev` - Start development server with hot reload
- `pnpm run build` - Build for production
- `pnpm run start:prod` - Run production build
- `pnpm run lint` - Lint and fix code
- `pnpm run format` - Format code with Prettier
- `pnpm run test` - Run tests
- `pnpm run supabase:types` - Generate TypeScript types from Supabase

## Design Choices

### Architecture

- **Modular Design**: Organized into feature modules (evaluations, common, config) for maintainability
- **Queue-Based Processing**: Background jobs handle time-intensive AI evaluations without blocking API responses
- **Vector Search**: Semantic search capabilities for intelligent document matching

### Storage Strategy

- **Supabase**: Primary data storage and file management
- **Qdrant**: Vector embeddings for semantic search and similarity matching
- **Redis**: Transient data and job queue management
