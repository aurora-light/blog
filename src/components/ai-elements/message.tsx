import { cn } from '@/lib/utils';
import { cjk } from '@streamdown/cjk';
import { code } from '@streamdown/code';
import { math } from '@streamdown/math';
import { mermaid } from '@streamdown/mermaid';
import { memo, type ComponentProps, type HTMLAttributes } from 'react';
import { Streamdown, type LinkSafetyConfig } from 'streamdown';

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;
export const MessageContent = ({
	children,
	className,
	...props
}: MessageContentProps) => (
	<div
		className={cn(
			'flex min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm text-foreground',
			className
		)}
		{...props}
	>
		{children}
	</div>
);
export type MessageResponseProps = ComponentProps<typeof Streamdown>;

const streamdownPlugins = { cjk, code, math, mermaid };
const markdownLinkSafety: LinkSafetyConfig = {
	enabled: true,
	onLinkCheck: (href) => {
		if (typeof window === 'undefined') return false;
		try {
			const url = new URL(href, window.location.origin);
			return (
				(url.protocol === 'http:' || url.protocol === 'https:') &&
				url.origin === window.location.origin
			);
		} catch {
			return false;
		}
	}
};

export const MessageResponse = memo(
	({
		className,
		linkSafety = markdownLinkSafety,
		...props
	}: MessageResponseProps) => (
		<Streamdown
			className={cn(
				'size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
				className
			)}
			plugins={streamdownPlugins}
			linkSafety={linkSafety}
			{...props}
		/>
	),
	(prevProps, nextProps) => prevProps.children === nextProps.children
);

MessageResponse.displayName = 'MessageResponse';
