import { getChatModelId, getChatProvider } from '@/lib/chat-provider';
import { suggestionsSchema } from '@/lib/chat-types';
import { ChatbotError } from '@/lib/errors';
import { getBlogRetrieval, getBlogSuggestionKnowledge } from '@/lib/rag';
import { checkIpRateLimit } from '@/lib/ratelimit';
import { generateSuggestions } from '@leslie/search-core/rag';
import { generateText, Output } from 'ai';
import { z } from 'zod';

export const maxDuration = 15;
const requestSchema = z.object({
	question: z.string().trim().min(1).max(2000),
	reply: z.string().trim().min(1).max(8000),
	sourceSlugs: z.array(z.string().min(1).max(300)).max(4).optional()
});
const empty = () =>
	Response.json(
		{ questions: [] },
		{ headers: { 'Cache-Control': 'no-store' } }
	);

export async function POST(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: '请求格式不正确' }, { status: 400 });
	}
	const parsed = requestSchema.safeParse(body);
	if (!parsed.success)
		return Response.json({ error: '问题或回答格式不正确' }, { status: 400 });
	try {
		const ip =
			(
				request.headers.get('x-vercel-forwarded-for') ??
				request.headers.get('x-forwarded-for')
			)
				?.split(',')[0]
				?.trim() || request.headers.get('x-real-ip')?.trim();
		await checkIpRateLimit(ip, 'suggestions');
		request.signal.throwIfAborted();
		if (process.env.AI_SUGGESTIONS === 'false') return empty();
		const { question, reply } = parsed.data;
		// Resolve public evidence on the server; do not trust client-supplied documents.
		const retrieval = parsed.data.sourceSlugs
			? undefined
			: await getBlogRetrieval(
					[{ role: 'user', parts: [{ type: 'text', text: question }] }],
					{ signal: request.signal }
				);
		const knowledge = parsed.data.sourceSlugs
			? getBlogSuggestionKnowledge(question, parsed.data.sourceSlugs)
			: {
					context: retrieval!.context,
					hasEvidence: retrieval!.sources.length > 0
				};
		if (!knowledge.hasEvidence) return empty();
		const provider = getChatProvider();
		const suggestions = await generateSuggestions(
			{
				question,
				reply,
				knowledgeBase: knowledge.context,
				signal: request.signal
			},
			{
				generate: async ({ system, prompt, signal }) => {
					const result = await generateText({
						model: provider(
							process.env.AI_SUGGESTIONS_MODEL ?? getChatModelId()
						),
						system,
						prompt,
						abortSignal: signal,
						maxOutputTokens: 400,
						maxRetries: 0,
						output: Output.object({ schema: suggestionsSchema })
					});
					return result.output;
				}
			}
		);
		return Response.json(suggestions, {
			headers: { 'Cache-Control': 'no-store' }
		});
	} catch (error) {
		if (error instanceof ChatbotError) return error.toResponse();
		if (request.signal.aborted) return new Response(null, { status: 499 });
		// Suggestions are optional and never turn a successful answer into an error.
		return empty();
	}
}
