# AGENTS.md - Directives for AI Coding Agents

## Natural Language Web (NLWeb) Standard Compliance

This project is **Agent-Ready** and designed to be accessed by autonomous AI agents, coding assistants (like Cursor, Cline), and AI models (like Claude). This document provides explicit directives for AI systems accessing and contributing to this codebase.

---

## 🔴 CRITICAL: Read Next.js Documentation Before Writing Code

**IMPORTANT**: Before implementing any changes or writing new code, you MUST:

1. **Read the bundled Next.js documentation** at `node_modules/next/dist/docs/`
2. **Review the API routes** in `app/api/` directory
3. **Understand the App Router** structure and conventions
4. **Check existing patterns** in the codebase before implementing new features

Failure to read documentation may result in:
- Incorrect API patterns (breaking the production system)
- Security vulnerabilities
- Performance degradation
- Incompatibility with streaming and server components

---

## Project Architecture Overview

### Tech Stack
- **Framework**: Next.js 16.2+ (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with Prisma ORM
- **UI**: Shadcn/ui + Tailwind CSS
- **AI/ML**: Vercel AI SDK (OpenAI provider)
- **Monetization**: Lemon Squeezy subscriptions
- **Infrastructure**: Vercel Fluid Compute

### Core Endpoints

#### 1. MCP Server (`/api/mcp`)
- **Purpose**: Exposes issue tracking data to external AI agents
- **Authentication**: Bearer token (API key from ApiKey table)
- **Standard**: Model Context Protocol (MCP)
- **Available Tools**:
  - `get_project_issues` - Retrieve issues for a project
  - `analyze_code_cost` - Analyze code governance metrics

#### 2. Conversational Search (`/api/ask`)
- **Purpose**: NLWeb-compliant natural language query endpoint
- **Response**: Context-aware search results with streaming support

#### 3. Chat Endpoint (`/api/chat`)
- **Purpose**: Vercel AI SDK streaming endpoint for frontend chat
- **Features**: Generative UI with `useChat` hook

#### 4. Webhook Handler (`/api/webhooks/lemonsqueezy`)
- **Purpose**: Subscription lifecycle management
- **Events**: payment_success, subscription_updated, subscription_cancelled

---

## Database Schema Summary

### Key Models
- **User**: Authentication, subscriptions, billing
- **ApiKey**: External AI agent authentication (hashed keys)
- **Project**: Repository/codebase reference
- **Issue**: Tracked problems with AI analysis
- **CodeReview**: PR/MR governance and analysis
- **ProjectMetrics**: Time-series project health data

---

## Authentication & Security

### API Key Authentication

External agents authenticate via:
```
Authorization: Bearer <api_key>
```

API keys are:
- ✅ Hashed in database using bcryptjs
- ✅ Rate-limited per key
- ✅ Scoped to their owning user's data only
- ✅ Validated on every `/api/mcp` request

### Subscription Gating

- **FREE tier**: Limited API access, no MCP access
- **PRO tier**: Full MCP access, higher rate limits
- Enforcement: Check `User.subscriptionTier` in middleware

---

## Agent Integration Examples

### 1. Cursor / Cline Access
Add to `.cursor/tools.json` or Cline config:
```json
{
  "name": "Project MCP",
  "endpoint": "http://localhost:3000/api/mcp",
  "auth": {
    "type": "bearer",
    "token": "sk_live_xxx"
  }
}
```

### 2. Claude Desktop Integration
Add to Claude Desktop config:
```json
{
  "mcpServers": {
    "project-tracker": {
      "command": "node",
      "args": ["api/mcp"],
      "env": {
        "API_KEY": "sk_live_xxx"
      }
    }
  }
}
```

---

## Code Contribution Guidelines

### Rules for AI Agents
1. **Always use TypeScript strict mode** - no `any` types
2. **Prioritize Server Components** over Client Components
3. **Use semantic HTML5** for Generative Engine Optimization
4. **Implement error handling** with structured responses
5. **Add logging** for debugging and monitoring
6. **Rate-limit API routes** to prevent abuse
7. **Validate all inputs** with Zod schemas
8. **Cache responses** where appropriate (use Next.js cache utilities)

### File Structure Rules
```
app/api/
  ├── mcp/route.ts           # MCP server (no modifications to route name/location)
  ├── ask/route.ts           # Conversational search
  ├── chat/route.ts          # Streaming chat endpoint
  └── webhooks/
      └── lemonsqueezy/route.ts

lib/
  ├── mcp-server.ts          # MCP protocol implementation
  ├── db.ts                  # Prisma singleton
  ├── ai.ts                  # Vercel AI configuration
  └── auth.ts                # Authentication utilities

components/
  ├── ui/                    # Shadcn UI components (read-only)
  └── chat/                  # Generative UI components
```

### Before Creating New Files
- Check if the file already exists
- Verify the directory structure matches the approved layout
- Do NOT add files outside of the designated directories
- Request permission for new directories

---

## Robots.txt Configuration

This project explicitly allows AI crawlers:
```
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: *
Disallow: /admin
Disallow: /api
Disallow: /.well-known
```

---

## Prohibited Actions

⛔ **AI agents must NOT**:
- Modify existing API signatures
- Change database schema without explicit authorization
- Bypass authentication checks
- Log sensitive data (API keys, passwords, PII)
- Make external API calls without timeout handling
- Create infinite loops or recursive processes
- Store data outside the Prisma schema

---

## Environment Variables Required

```env
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
LEMON_SQUEEZY_API_KEY=xxx
LEMON_SQUEEZY_WEBHOOK_SECRET=xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Monitoring & Debugging

### Logging Strategy
- Use `console.log()` with structured data
- Log API key validation failures (without exposing keys)
- Log subscription tier enforcement decisions
- Log AI analysis results for quality tracking

### Performance Metrics
- MCP endpoint should respond in <500ms for cached queries
- Chat streaming should begin within 1 second
- Database queries should use indexes (see schema comments)

---

## Support & Documentation

- **Next.js Docs**: `node_modules/next/dist/docs/`
- **Prisma Docs**: https://www.prisma.io/docs/
- **MCP Spec**: https://modelcontextprotocol.io/
- **Vercel AI SDK**: https://sdk.vercel.ai/docs

---

**Last Updated**: 2026-04-19  
**Schema Version**: 1.0  
**MCP Version**: 1.0

