import type { UIMessage } from 'ai';
import { z } from 'zod';

export const retrievalSourceUrlSchema = z
	.string()
	.regex(
		/^(?:\/posts\/[^/?#]+|\/(?:resume|documents)\/[a-zA-Z0-9_-]+\.pdf#page=[1-9]\d*)$/
	);

export const articleRetrievalSchema = z.object({
	status: z.enum(['searching', 'complete', 'error']),
	trace: z
		.object({
			phase: z.enum(['planning', 'retrieving', 'fusing', 'complete']),
			standaloneQuery: z.string().max(1501).optional(),
			primaryTerms: z.array(z.string().max(80)).max(4).optional(),
			relatedTerms: z.array(z.string().max(80)).max(6).optional(),
			fallback: z
				.enum([
					'disabled',
					'planner-timeout',
					'planner-invalid',
					'planner-error'
				])
				.optional(),
			routes: z
				.array(
					z.object({
						id: z.string().max(40),
						query: z.string().max(1501),
						status: z.enum(['pending', 'running', 'complete', 'error']),
						hitCount: z.number().int().nonnegative().max(30).optional(),
						durationMs: z.number().nonnegative().optional()
					})
				)
				.max(3),
			fusion: z
				.object({
					candidateCount: z.number().int().nonnegative().max(90),
					uniqueCount: z.number().int().nonnegative().max(90),
					selectedCount: z.number().int().nonnegative().max(4)
				})
				.optional()
		})
		.optional(),
	durationMs: z.number().nonnegative().optional(),
	sources: z
		.array(
			z.object({
				slug: z.string().max(300),
				title: z.string().max(180),
				url: retrievalSourceUrlSchema,
				description: z.string().max(160)
			})
		)
		.max(4)
});

export type ArticleRetrievalData = z.infer<typeof articleRetrievalSchema>;

export const waitingStatusSchema = z.object({
	phase: z.enum(['waiting', 'still-waiting', 'health', 'thinking']),
	message: z.string(),
	modelId: z.string(),
	modelName: z.string()
});
export type WaitingStatusData = z.infer<typeof waitingStatusSchema>;

export const suggestionsSchema = z.object({
	questions: z.array(z.string().trim().min(1).max(60)).max(3)
});
export type CustomUIDataTypes = {
	'waiting-status': WaitingStatusData;
	'article-retrieval': ArticleRetrievalData;
};

export type CustomChatMessage = UIMessage<unknown, CustomUIDataTypes>;
