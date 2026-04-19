import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Conversational Search Endpoint (/ask)
 * NLWeb-compliant endpoint for natural language queries
 * Allows AI agents to search and query the platform semantically
 */

interface AskRequest {
  query: string;
  projectId?: string;
  context?: string;
  limit?: number;
}

interface SearchResult {
  type: 'issue' | 'review' | 'project' | 'metric';
  id: string;
  title: string;
  description: string;
  relevanceScore: number;
  metadata: Record<string, unknown>;
}

/**
 * Simple semantic search (in production, use vector embeddings)
 */
function calculateRelevance(text: string, query: string): number {
  if (!text) return 0;

  const queryWords = query.toLowerCase().split(/\s+/);
  const textLower = text.toLowerCase();

  // Exact match gets highest score
  if (textLower.includes(query.toLowerCase())) return 1;

  // Count matching words
  const matchCount = queryWords.filter((word) => textLower.includes(word)).length;
  return matchCount / queryWords.length;
}

/**
 * Main search logic
 */
async function performSearch(
  query: string,
  projectId?: string,
  limit: number = 10
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  try {
    // Search issues
    const issues = await db.issue.findMany({
      where: projectId ? { projectId } : undefined,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        severity: true,
        category: true,
        createdAt: true,
      },
      take: limit * 2,
    });

    issues.forEach((issue: typeof issues[number]) => {
      const relevance = Math.max(
        calculateRelevance(issue.title, query),
        calculateRelevance(issue.description || '', query)
      );

      if (relevance > 0) {
        results.push({
          type: 'issue',
          id: issue.id,
          title: issue.title,
          description: issue.description || '',
          relevanceScore: relevance,
          metadata: {
            status: issue.status,
            severity: issue.severity,
            category: issue.category,
            createdAt: issue.createdAt,
          },
        });
      }
    });

    // Search code reviews
    const reviews = await db.codeReview.findMany({
      where: projectId ? { projectId } : undefined,
      select: {
        id: true,
        prTitle: true,
        findings: true,
        status: true,
        riskScore: true,
        createdAt: true,
      },
      take: limit * 2,
    });

    reviews.forEach((review: typeof reviews[number]) => {
      const relevance = Math.max(
        calculateRelevance(review.prTitle, query),
        calculateRelevance(review.findings || '', query)
      );

      if (relevance > 0) {
        results.push({
          type: 'review',
          id: review.id,
          title: review.prTitle,
          description: review.findings || '',
          relevanceScore: relevance,
          metadata: {
            status: review.status,
            riskScore: review.riskScore,
            createdAt: review.createdAt,
          },
        });
      }
    });

    // Sort by relevance and limit
    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  } catch (error) {
    console.error('[Ask] Search error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: AskRequest = await request.json();

    if (!body.query || typeof body.query !== 'string') {
      return NextResponse.json(
        { error: 'Query string is required' },
        { status: 400 }
      );
    }

    if (body.query.length > 500) {
      return NextResponse.json(
        { error: 'Query too long (max 500 characters)' },
        { status: 400 }
      );
    }

    const limit = Math.min(body.limit || 10, 50);

    // Perform search
    const results = await performSearch(body.query, body.projectId, limit);

    if (results.length === 0) {
      return NextResponse.json(
        {
          query: body.query,
          results: [],
          message: 'No results found matching your query',
        },
        { status: 200 }
      );
    }

    // Format response
    return NextResponse.json(
      {
        query: body.query,
        results: results.map((result) => ({
          id: result.id,
          type: result.type,
          title: result.title,
          description: result.description.substring(0, 200), // Truncate for performance
          relevance: Math.round(result.relevanceScore * 100),
          metadata: result.metadata,
        })),
        summary: {
          totalResults: results.length,
          typeBreakdown: {
            issues: results.filter((r) => r.type === 'issue').length,
            reviews: results.filter((r) => r.type === 'review').length,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Ask] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ask
 * Documentation endpoint
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      name: 'Conversational Search API',
      description: 'Query issues and code reviews using natural language',
      method: 'POST',
      endpoint: '/api/ask',
      exampleRequest: {
        query: 'Show me critical security issues',
        projectId: 'optional-project-id',
        limit: 10,
      },
      exampleResponse: {
        query: 'Show me critical security issues',
        results: [
          {
            id: 'issue-123',
            type: 'issue',
            title: 'SQL Injection vulnerability in user input',
            relevance: 95,
            metadata: {
              severity: 'CRITICAL',
              status: 'OPEN',
            },
          },
        ],
      },
    },
    { status: 200 }
  );
}
