---
name: neon-postgres
description: >-
  Best practices for Neon Serverless Postgres with Node.js, Prisma, and connection pooling.
  Use when configuring database connections, running migrations, and optimizing database access.
---

# Neon Serverless Postgres Guidelines

## Prisma Configuration

When connecting Prisma with Neon PostgreSQL:

1. **Datasource configuration in `schema.prisma`**:
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")
     directUrl = env("DIRECT_URL")
   }
   ```

2. **Connection string parameters**:
   - Always append `?sslmode=require` to enable TLS encryption.
   - For pooled connections, use the endpoint containing `-pooler`.

3. **Handling Compute Suspension (Scale to Zero)**:
   - Neon endpoints suspend when idle to save compute costs.
   - The first query after wake-up has a brief cold start (~500ms-1s).
   - Ensure Prisma reconnects and retry logic is available for background workers or socket handlers.
