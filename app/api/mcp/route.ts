import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { executeMCPTool, MCP_TOOLS } from '@/lib/mcp-server';
import crypto from 'crypto';

/**
 * MCP Server Endpoint
 * Exposes issue tracking data to external AI agents via the Model Context Protocol
 * 
 * Authentication: Bearer token (hashed API key)
 * Rate Limiting: Per-key quota enforcement
 * Subscription Gating: PRO tier users only
 */

interface MCPRequest {
  action: 'list_tools' | 'call_tool';
  tool?: string;
  input?: Record<string, unknown>;
}

interface MCPError {
  error?: string;
  code?: string;
  message?: string;
  status?: number;
}

/**
 * Hash API key for comparison
 */
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(authHeader: string): string {
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    throw new Error('Invalid authorization header format');
  }
  return parts[1];
}

/**
 * Validate API key and return user ID + subscription info
 */
async function validateApiKey(
  apiKey: string
): Promise<{ userId: string; subscriptionTier: string; rateLimitRemaining: number }> {
  const hashedKey = hashApiKey(apiKey);

  const dbKey = await db.apiKey.findUnique({
    where: { hashedKey },
    include: {
      user: {
        select: {
          id: true,
          subscriptionTier: true,
        },
      },
    },
  });

  if (!dbKey || !dbKey.isActive) {
    throw new Error('Invalid or deactivated API key');
  }

  // Check subscription tier - only PRO and ENTERPRISE can access MCP
  if (dbKey.user.subscriptionTier === 'FREE') {
    throw new Error('MCP access requires PRO subscription or higher');
  }

  // Check rate limit
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Count API calls in the last hour (simplified - in production use a real rate limiter)
  const recentCalls = await db.activity.count({
    where: {
      userId: dbKey.user.id,
      action: 'mcp_call',
      createdAt: { gte: oneHourAgo },
    },
  });

  const rateLimitRemaining = Math.max(0, dbKey.rateLimit - recentCalls);

  if (rateLimitRemaining <= 0) {
    throw new Error('Rate limit exceeded');
  }

  // Update last used timestamp
  await db.apiKey.update({
    where: { id: dbKey.id },
    data: { lastUsedAt: now },
  });

  return {
    userId: dbKey.user.id,
    subscriptionTier: dbKey.user.subscriptionTier,
    rateLimitRemaining,
  };
}

/**
 * Handle MCP requests
 */
async function handleMCPRequest(
  request: MCPRequest,
  userId: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  if (request.action === 'list_tools') {
    // Return available tools
    return {
      success: true,
      data: {
        tools: Object.values(MCP_TOOLS).map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      },
    };
  }

  if (request.action === 'call_tool') {
    if (!request.tool) {
      return {
        success: false,
        error: 'Tool name is required',
      };
    }

    if (!MCP_TOOLS[request.tool]) {
      return {
        success: false,
        error: `Unknown tool: ${request.tool}`,
      };
    }

    try {
      // Log the tool call
      await db.activity.create({
        data: {
          userId,
          action: 'mcp_call',
          resource: 'mcp_tool',
          resourceId: request.tool,
          details: JSON.stringify({
            tool: request.tool,
            inputKeys: Object.keys(request.input || {}),
          }),
        },
      });

      // Execute the tool
      const result = await executeMCPTool({
        tool: request.tool,
        input: request.input || {},
        userId,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  return {
    success: false,
    error: 'Unknown action',
  };
}

/**
 * POST /api/mcp
 * Main MCP endpoint for external AI agents
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' } as MCPError,
        { status: 401 }
      );
    }

    let apiKey: string;
    try {
      apiKey = extractBearerToken(authHeader);
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Invalid authorization header',
        } as MCPError,
        { status: 400 }
      );
    }

    // Validate API key
    let userInfo: { userId: string; subscriptionTier: string; rateLimitRemaining: number };
    try {
      userInfo = await validateApiKey(apiKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      return NextResponse.json(
        { error: message } as MCPError,
        { status: 403 }
      );
    }

    // Parse request body
    let mcpRequest: MCPRequest;
    try {
      mcpRequest = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' } as MCPError,
        { status: 400 }
      );
    }

    // Process MCP request
    const result = await handleMCPRequest(mcpRequest, userInfo.userId);

    const response = NextResponse.json(
      {
        ...result,
        _metadata: {
          subscription: userInfo.subscriptionTier,
          rateLimitRemaining: userInfo.rateLimitRemaining,
        },
      },
      {
        status: result.success ? 200 : 400,
      }
    );

    // Add rate limit headers
    response.headers.set('X-RateLimit-Remaining', String(userInfo.rateLimitRemaining));

    return response;
  } catch (error) {
    console.error('[MCP] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as MCPError,
      { status: 500 }
    );
  }
}

/**
 * GET /api/mcp
 * Health check and documentation endpoint
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      name: 'Issue Tracking & Code Governance Monitor',
      version: '1.0.0',
      protocol: 'Model Context Protocol (MCP)',
      status: 'operational',
      endpoints: {
        POST: {
          description: 'Execute MCP requests (requires Bearer token authentication)',
          requiresAuth: true,
          actions: ['list_tools', 'call_tool'],
        },
      },
      documentation: 'https://modelcontextprotocol.io/',
      authMethod: 'Bearer token (API key)',
    },
    { status: 200 }
  );
}

/**
 * OPTIONS /api/mcp
 * CORS preflight and API documentation
 */
export async function OPTIONS(): Promise<NextResponse> {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '3600');
  return response;
}
