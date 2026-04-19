import { db } from './db';

/**
 * Model Context Protocol (MCP) Server Implementation
 * Handles tool definitions and execution for external AI agents
 * 
 * Standard MCP Spec: https://modelcontextprotocol.io/
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface MCPResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: unknown;
    uri?: string;
  }>;
}

export interface MCPRequest {
  tool: string;
  input: Record<string, unknown>;
  userId: string;
}

/**
 * Define available tools for external agents
 */
export const MCP_TOOLS: Record<string, MCPTool> = {
  get_project_issues: {
    name: 'get_project_issues',
    description: 'Retrieve issues for a specific project with optional filtering and pagination',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The unique identifier of the project',
        },
        status: {
          type: 'string',
          description: 'Filter by issue status (OPEN, IN_PROGRESS, RESOLVED, CLOSED)',
          enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
        },
        severity: {
          type: 'string',
          description: 'Filter by severity level (LOW, MEDIUM, HIGH, CRITICAL)',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        },
        limit: {
          type: 'number',
          description: 'Maximum number of issues to return (default: 20, max: 100)',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset (default: 0)',
        },
      },
      required: ['projectId'],
    },
  },

  analyze_code_cost: {
    name: 'analyze_code_cost',
    description: 'Analyze code governance metrics and development cost implications for a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The unique identifier of the project',
        },
        timeframe: {
          type: 'string',
          description: 'Analysis timeframe (7days, 30days, 90days)',
          enum: ['7days', '30days', '90days'],
        },
      },
      required: ['projectId'],
    },
  },

  list_projects: {
    name: 'list_projects',
    description: 'List all projects accessible to the authenticated user',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of projects to return (default: 20, max: 100)',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset (default: 0)',
        },
      },
      required: [],
    },
  },

  create_issue: {
    name: 'create_issue',
    description: 'Create a new issue in a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The project ID where the issue will be created',
        },
        title: {
          type: 'string',
          description: 'Issue title',
        },
        description: {
          type: 'string',
          description: 'Detailed description of the issue',
        },
        severity: {
          type: 'string',
          description: 'Issue severity level',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        },
        category: {
          type: 'string',
          description: 'Issue category',
          enum: ['BUG', 'FEATURE', 'TECHNICAL_DEBT', 'SECURITY', 'PERFORMANCE', 'DOCUMENTATION'],
        },
      },
      required: ['projectId', 'title'],
    },
  },
};

/**
 * Execute MCP tool requests
 */
export async function executeMCPTool(request: MCPRequest): Promise<MCPResponse> {
  const { tool, input, userId } = request;

  // Verify tool exists
  if (!MCP_TOOLS[tool]) {
    throw new Error(`Unknown tool: ${tool}`);
  }

  try {
    switch (tool) {
      case 'get_project_issues':
        return await handleGetProjectIssues(input, userId);
      case 'analyze_code_cost':
        return await handleAnalyzeCodeCost(input, userId);
      case 'list_projects':
        return await handleListProjects(userId, input);
      case 'create_issue':
        return await handleCreateIssue(input, userId);
      default:
        throw new Error(`Tool ${tool} not implemented`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${tool}: ${errorMessage}`,
        },
      ],
    };
  }
}

/**
 * Tool: Get Project Issues
 */
async function handleGetProjectIssues(
  input: Record<string, unknown>,
  userId: string
): Promise<MCPResponse> {
  const projectId = input.projectId as string;
  const status = input.status as string | undefined;
  const severity = input.severity as string | undefined;
  const limit = Math.min((input.limit as number) || 20, 100);
  const offset = (input.offset as number) || 0;

  // Verify user owns this project
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
  });

  if (!project) {
    throw new Error('Project not found or access denied');
  }

  // Build query filters
  const where: Record<string, unknown> = { projectId };
  if (status) where.status = status;
  if (severity) where.severity = severity;

  const [issues, total] = await Promise.all([
    db.issue.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        codeReviews: {
          select: { id: true, status: true },
          take: 3,
        },
      },
    }),
    db.issue.count({ where }),
  ]);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            issues: issues.map((issue) => ({
              id: issue.id,
              title: issue.title,
              description: issue.description,
              status: issue.status,
              severity: issue.severity,
              category: issue.category,
              aiAnalysis: issue.aiAnalysis,
              createdAt: issue.createdAt.toISOString(),
              updatedAt: issue.updatedAt.toISOString(),
              codeReviewCount: issue.codeReviews.length,
            })),
            pagination: {
              total,
              limit,
              offset,
              hasMore: offset + limit < total,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Tool: Analyze Code Cost
 */
async function handleAnalyzeCodeCost(
  input: Record<string, unknown>,
  userId: string
): Promise<MCPResponse> {
  const projectId = input.projectId as string;
  const timeframe = (input.timeframe as string) || '30days';

  // Verify project access
  const project = await db.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) {
    throw new Error('Project not found or access denied');
  }

  // Calculate date range
  const now = new Date();
  const daysBack = timeframe === '7days' ? 7 : timeframe === '90days' ? 90 : 30;
  const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  // Fetch metrics and issues
  const [metrics, issues, codeReviews] = await Promise.all([
    db.projectMetrics.findMany({
      where: {
        projectId,
        date: { gte: startDate },
      },
      orderBy: { date: 'desc' },
    }),
    db.issue.findMany({
      where: {
        projectId,
        createdAt: { gte: startDate },
      },
    }),
    db.codeReview.findMany({
      where: {
        projectId,
        createdAt: { gte: startDate },
      },
    }),
  ]);

  // Calculate analytics
  const criticalIssueCount = issues.filter((i) => i.severity === 'CRITICAL').length;
  const avgResolutionTime =
    metrics.reduce((sum, m) => sum + (m.averageResolutionTime || 0), 0) / metrics.length || 0;
  const avgCodeQuality =
    metrics.reduce((sum, m) => sum + (m.codeQualityScore || 0), 0) / metrics.length || 0;

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            projectId,
            timeframe,
            analysis: {
              period: {
                start: startDate.toISOString(),
                end: now.toISOString(),
                days: daysBack,
              },
              issues: {
                total: issues.length,
                critical: criticalIssueCount,
                highSeverity: issues.filter((i) => i.severity === 'HIGH').length,
                unresolved: issues.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED')
                  .length,
              },
              codeReviews: {
                total: codeReviews.length,
                approved: codeReviews.filter((cr) => cr.status === 'APPROVED').length,
                pending: codeReviews.filter((cr) => cr.status === 'PENDING').length,
                changesRequested: codeReviews.filter((cr) => cr.status === 'CHANGES_REQUESTED')
                  .length,
              },
              metrics: {
                averageResolutionTimeHours: Math.round(avgResolutionTime),
                averageCodeQualityScore: Math.round(avgCodeQuality),
                securityConcernsCount: issues.filter((i) => i.hasSecurityConcern).length,
              },
              estimatedCost: {
                developmentHours: Math.round((criticalIssueCount * 8 + issues.length * 2) / 2),
                recommendation:
                  criticalIssueCount > 5
                    ? 'URGENT: Prioritize critical issues'
                    : 'Maintain current pace',
              },
            },
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Tool: List Projects
 */
async function handleListProjects(
  userId: string,
  input: Record<string, unknown>
): Promise<MCPResponse> {
  const limit = Math.min((input.limit as number) || 20, 100);
  const offset = (input.offset as number) || 0;

  const [projects, total] = await Promise.all([
    db.project.findMany({
      where: { userId },
      skip: offset,
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        createdAt: true,
        _count: {
          select: { issues: true, codeReviews: true },
        },
      },
    }),
    db.project.count({ where: { userId } }),
  ]);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            projects: projects.map((p) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              description: p.description,
              issueCount: p._count.issues,
              reviewCount: p._count.codeReviews,
              createdAt: p.createdAt.toISOString(),
            })),
            pagination: {
              total,
              limit,
              offset,
              hasMore: offset + limit < total,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Tool: Create Issue
 */
async function handleCreateIssue(
  input: Record<string, unknown>,
  userId: string
): Promise<MCPResponse> {
  const projectId = input.projectId as string;
  const title = input.title as string;
  const description = input.description as string;
  const severity = (input.severity as string) || 'MEDIUM';
  const category = (input.category as string) || 'BUG';

  // Verify project ownership
  const project = await db.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) {
    throw new Error('Project not found or access denied');
  }

  // Create issue
  const issue = await db.issue.create({
    data: {
      projectId,
      title,
      description,
      severity: severity as any,
      category: category as any,
      status: 'OPEN',
    },
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: true,
            issue: {
              id: issue.id,
              title: issue.title,
              status: issue.status,
              createdAt: issue.createdAt.toISOString(),
            },
          },
          null,
          2
        ),
      },
    ],
  };
}
