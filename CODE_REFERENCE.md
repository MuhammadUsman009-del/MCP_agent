# Code Reference - All Generated Files

## 📋 Overview
This document contains references to all critical files generated for the Agent-Ready Micro-SaaS application. Each section includes the file path and purpose.

---

## 🗂️ Critical Files Reference

### 1. **Database Schema** - `prisma/schema.prisma`
**Purpose:** Complete data model for the platform
**Models:** 10 tables with proper relationships
**Features:** 
- Hashed API keys
- Subscription management
- Issue tracking with AI analysis
- Code review governance
- Audit logging
- Webhook event tracking

### 2. **MCP Server Endpoint** - `app/api/mcp/route.ts`
**Purpose:** Model Context Protocol server for external AI agents
**Features:**
- Bearer token authentication
- 4 implemented tools (get_project_issues, analyze_code_cost, list_projects, create_issue)
- Subscription tier enforcement
- Rate limiting
- Activity logging
- CORS support
- Health check endpoint

### 3. **MCP Protocol Implementation** - `lib/mcp-server.ts`
**Purpose:** Core MCP logic and tool definitions
**Functions:**
- `executeMCPTool()` - Tool execution dispatcher
- `handleGetProjectIssues()` - Issue retrieval with filtering
- `handleAnalyzeCodeCost()` - Code governance analysis
- `handleListProjects()` - Project inventory
- `handleCreateIssue()` - Issue creation

### 4. **Chat Streaming Endpoint** - `app/api/chat/route.ts`
**Purpose:** Vercel AI SDK streaming responses
**Features:**
- Real-time streaming
- OpenAI GPT-4 Turbo integration
- Project context injection
- Message history support
- Error handling

### 5. **Conversational Search** - `app/api/ask/route.ts`
**Purpose:** NLWeb-compliant natural language search
**Features:**
- Multi-resource search (issues, reviews)
- Relevance scoring
- Pagination support
- Type breakdown in results

### 6. **Webhook Handler** - `app/api/webhooks/lemonsqueezy/route.ts`
**Purpose:** Subscription lifecycle management
**Events:**
- `payment_success` - Upgrade to PRO
- `subscription_updated` - Status sync
- `subscription_cancelled` - Downgrade to FREE

### 7. **Database Client** - `lib/db.ts`
**Purpose:** Prisma singleton for database access
**Features:**
- Connection pooling
- Development logging
- Singleton pattern for Next.js

### 8. **AI SDK Configuration** - `lib/ai.ts`
**Purpose:** Centralized Vercel AI SDK setup
**Features:**
- Model definitions (GPT-4 Turbo, GPT-3.5)
- System prompts for different use cases
- Model parameters
- Streaming config

### 9. **Documentation** - `AGENTS.md`
**Purpose:** AI agent directives and integration guide
**Contents:**
- NLWeb standard compliance
- Critical Next.js documentation notice
- Project architecture
- Endpoint descriptions
- Security guidelines
- Integration examples
- Code contribution rules

### 10. **Configuration** - `prisma.config.ts`
**Purpose:** Prisma configuration for Prisma 7.x
**Features:**
- Schema path configuration
- Migration path setup
- Datasource configuration

### 11. **Environment Template** - `.env.example`
**Purpose:** Environment variables reference
**Variables:**
- DATABASE_URL
- OPENAI_API_KEY
- LEMON_SQUEEZY_API_KEY
- LEMON_SQUEEZY_WEBHOOK_SECRET
- NEXT_PUBLIC_APP_URL
- NODE_ENV

### 12. **AI Crawler Configuration** - `public/robots.txt`
**Purpose:** Configure AI crawler access
**Agents Allowed:**
- GPTBot (ChatGPT)
- ChatGPT-User
- OAI-SearchBot (OpenAI)
- Claude-Web
- Bard (Google)

---

## 🔑 Key Features by File

### Authentication & Security
**Files:** `app/api/mcp/route.ts`, `lib/mcp-server.ts`
- Hashed API keys (SHA-256)
- Bearer token validation
- Subscription tier gating
- Rate limiting per key

### Data Access
**Files:** `lib/db.ts`, `lib/mcp-server.ts`
- Prisma ORM integration
- Type-safe queries
- Optimized indexes
- Pagination support

### AI Integration
**Files:** `app/api/chat/route.ts`, `lib/ai.ts`
- Vercel AI SDK
- OpenAI GPT-4 Turbo
- Streaming responses
- System prompts

### Monitoring & Logging
**Files:** `app/api/mcp/route.ts`, `lib/mcp-server.ts`
- Activity logging
- API key tracking
- Request metadata
- Error logging

---

## 📊 Lines of Code by Component

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| MCP Endpoint | `/api/mcp/route.ts` | 180+ | Server implementation |
| MCP Tools | `lib/mcp-server.ts` | 350+ | Tool definitions & execution |
| Chat Endpoint | `/api/chat/route.ts` | 50+ | Streaming setup |
| Search Endpoint | `/api/ask/route.ts` | 150+ | Search implementation |
| Webhooks | `/api/webhooks/lemonsqueezy/route.ts` | 150+ | Subscription handling |
| Database | `lib/db.ts` | 15+ | Prisma setup |
| AI Config | `lib/ai.ts` | 35+ | Model configuration |
| Schema | `prisma/schema.prisma` | 300+ | Database schema |
| AGENTS.md | `AGENTS.md` | 200+ | Agent directives |

**Total:** 1,400+ lines of production-ready code

---

## 🔄 Data Flow

### 1. Issue Retrieval Flow
```
Client Request
    ↓
[/api/mcp/route.ts] - Validate Bearer token
    ↓
[lib/mcp-server.ts] - Execute get_project_issues()
    ↓
[lib/db.ts] - Query Prisma
    ↓
PostgreSQL Database
    ↓
Response with issue data
```

### 2. Chat Streaming Flow
```
Client Message
    ↓
[/api/chat/route.ts] - Receive message
    ↓
[lib/ai.ts] - Initialize OpenAI
    ↓
Vercel AI SDK
    ↓
OpenAI API
    ↓
Stream response back to client
```

### 3. Subscription Update Flow
```
Lemon Squeezy Event
    ↓
[/api/webhooks/lemonsqueezy/route.ts] - Verify signature
    ↓
[lib/db.ts] - Update User subscription
    ↓
PostgreSQL Database
    ↓
Return success response
```

---

## 🧪 Testing Endpoints

### Test MCP Server
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer sk_live_test_key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "list_tools"
  }'
```

### Test Chat
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "role": "user", "content": "Hello" }
    ]
  }'
```

### Test Search
```bash
curl -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -d '{
    "query": "show me critical issues"
  }'
```

---

## 📦 Dependencies & Versions

### Production Dependencies
- `next@16.2.4` - Web framework
- `react@19.x` - UI library
- `typescript@5.x` - Type system
- `tailwindcss@3.x` - Styling
- `@prisma/client@7.7.0` - ORM
- `@prisma/adapter-pg@7.7.0` - PostgreSQL adapter
- `pg@8.x` - Database driver
- `ai@latest` - Vercel AI SDK
- `@ai-sdk/openai@latest` - OpenAI provider
- `bcryptjs@2.x` - Hashing
- `zod@3.x` - Validation

### Development Dependencies
- `prisma@7.7.0` - Database toolkit
- `eslint@latest` - Linting
- `@types/node@latest` - TypeScript types

---

## 🚀 Deployment Files

### Build Configuration
- **`next.config.mjs`** - Next.js build settings
- **`tsconfig.json`** - TypeScript configuration
- **`prisma.config.ts`** - Prisma configuration
- **`package.json`** - Scripts and dependencies

### Environment
- **`.env.example`** - Template for environment variables
- **`robots.txt`** - Web crawler configuration

---

## 📖 Documentation Files

1. **README.md** - Project overview and setup guide
2. **AGENTS.md** - AI agent integration and directives
3. **IMPLEMENTATION.md** - Detailed implementation guide
4. **COMPLETION_SUMMARY.md** - Project completion status
5. **CODE_REFERENCE.md** - This file

---

## 🔗 File Dependencies

### Direct Imports
```
app/api/mcp/route.ts
  ├── imports: lib/db.ts
  ├── imports: lib/mcp-server.ts
  └── imports: crypto (built-in)

app/api/chat/route.ts
  ├── imports: ai
  ├── imports: @ai-sdk/openai
  └── imports: lib/db.ts

app/api/ask/route.ts
  └── imports: lib/db.ts

app/api/webhooks/lemonsqueezy/route.ts
  ├── imports: lib/db.ts
  └── imports: crypto (built-in)

lib/mcp-server.ts
  └── imports: lib/db.ts

lib/db.ts
  ├── imports: @prisma/client
  ├── imports: @prisma/adapter-pg
  └── imports: pg
```

---

## ✅ Code Quality Checklist

- ✅ Zero `any` types in TypeScript
- ✅ All functions have return types
- ✅ All parameters have types
- ✅ Error handling on all API routes
- ✅ Input validation with schemas
- ✅ Database queries optimized with indexes
- ✅ Async/await patterns used
- ✅ Proper error logging
- ✅ Environment variables externalized
- ✅ CORS headers configured
- ✅ Security best practices followed

---

## 📝 Future Enhancement Points

### Extensibility
- Add more MCP tools in `lib/mcp-server.ts`
- Extend database schema in `prisma/schema.prisma`
- Add more chat features in `app/api/chat/route.ts`
- Implement search filters in `app/api/ask/route.ts`

### Integration Points
- GitHub API integration (issue sync)
- GitLab API integration (issue sync)
- Slack notifications
- Email alerts
- Custom webhooks

### Optimization
- Implement caching layer (Redis)
- Add database query optimization
- Implement background job queue
- Add monitoring and alerting

---

## 🎓 Learning Path for Team

1. Start with `README.md` for overview
2. Review `AGENTS.md` for architecture
3. Study `prisma/schema.prisma` for data model
4. Examine `app/api/mcp/route.ts` for request handling
5. Review `lib/mcp-server.ts` for business logic
6. Understand `lib/db.ts` for database access
7. Review error handling in all routes

---

**Last Updated:** April 19, 2026  
**Code Status:** Production-Ready  
**Documentation:** Complete  
**Build Status:** ✅ Zero Errors
