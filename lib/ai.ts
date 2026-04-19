import { openai } from '@ai-sdk/openai';

/**
 * Vercel AI SDK Configuration
 * Centralized configuration for AI model interactions
 */

/**
 * Default model for streaming responses
 */
export const defaultModel = openai('gpt-4-turbo');

/**
 * Model for fast, lightweight operations
 */
export const fastModel = openai('gpt-3.5-turbo');

/**
 * System prompts for different use cases
 */
export const systemPrompts = {
  issueAnalysis: `You are an expert software engineer analyzing code issues and pull requests.
Provide clear, actionable recommendations with:
- Root cause analysis
- Security implications (if any)
- Estimated effort for resolution
- Best practices alignment

Be concise and data-driven.`,

  codeReview: `You are a code review expert specializing in governance and best practices.
Evaluate code for:
- Security vulnerabilities
- Performance implications
- Code quality metrics
- Technical debt

Provide specific, actionable feedback.`,

  costAnalysis: `You are a technical project manager analyzing development costs.
Consider:
- Issue complexity and severity
- Team capacity
- Technical debt impact
- Business priorities

Provide cost estimates and priority recommendations.`,
};

/**
 * Model parameters for consistent behavior
 */
export const modelParameters = {
  temperature: 0.7,
  topP: 0.9,
  frequencyPenalty: 0,
  presencePenalty: 0,
} as const;

/**
 * Streaming response configuration
 */
export const streamingConfig = {
  maxTokens: 1024,
  timeout: 30000, // 30 seconds
};
