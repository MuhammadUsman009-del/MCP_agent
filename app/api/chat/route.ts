import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '@/lib/db';

/**
 * Chat Streaming Endpoint
 * Vercel AI SDK integration for streaming AI responses
 * Used by the dashboard to provide generative UI for issue analysis
 */

interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  projectId?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract session/user info from cookies or headers
    // In production, implement proper session management
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: ChatRequest = await request.json();

    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Build system prompt with context
    const systemPrompt = `You are an AI assistant helping developers manage and analyze issues and code governance.
You have access to issue tracking data and can provide insights on:
- Issue prioritization and severity assessment
- Code quality analysis
- Security concerns and remediation
- Development cost estimation
- Technical debt assessment

Be concise, actionable, and data-driven in your responses.`;

    // For production: Implement proper authentication and project validation
    // If projectId is provided, fetch project context
    let projectContext = '';
    if (body.projectId) {
      try {
        const project = await db.project.findUnique({
          where: { id: body.projectId },
          include: {
            _count: {
              select: { issues: true, codeReviews: true },
            },
          },
        });

        if (project) {
          projectContext = `\n\nProject Context: "${project.name}" has ${project._count.issues} issues and ${project._count.codeReviews} code reviews.`;
        }
      } catch (error) {
        console.error('[Chat] Error fetching project context:', error);
      }
    }

    // Stream text response using Vercel AI SDK
    const result = await streamText({
      model: openai('gpt-4-turbo'),
      system: systemPrompt + projectContext,
      messages: body.messages,
      temperature: 0.7,
    });

    // Convert AI SDK stream to NextResponse
    const stream = result.toTextStreamResponse();
    return new NextResponse(stream.body, {
      headers: stream.headers,
    });
  } catch (error) {
    console.error('[Chat] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
