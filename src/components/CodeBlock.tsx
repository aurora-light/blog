'use client';

import { Check, Copy } from 'lucide-react';
import {
	Children,
	isValidElement,
	useEffect,
	useRef,
	useState,
	type ComponentPropsWithoutRef
} from 'react';

export default function CodeBlock({
	children,
	className,
	...props
}: ComponentPropsWithoutRef<'pre'>) {
	const preRef = useRef<HTMLPreElement>(null);
	const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
	const code = Children.toArray(children).find(
		(child) => isValidElement(child) && child.type === 'code'
	);
	const codeClassName = isValidElement<{ className?: string }>(code)
		? code.props.className
		: '';
	const language = /(?:^|\s)language-([\w-]+)/.exec(
		`${className ?? ''} ${codeClassName ?? ''}`
	)?.[1];

	useEffect(
		() => () => {
			if (resetTimer.current !== null) clearTimeout(resetTimer.current);
		},
		[]
	);

	async function copyCode() {
		const pre = preRef.current;
		if (!pre) return;
		try {
			await navigator.clipboard.writeText(
				(pre.querySelector('code') ?? pre).textContent ?? ''
			);
			setStatus('copied');
		} catch {
			setStatus('error');
		}
		if (resetTimer.current !== null) clearTimeout(resetTimer.current);
		resetTimer.current = setTimeout(() => setStatus('idle'), 2000);
	}

	return (
		<div className="article-code-block">
			<div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-2 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400">
				<span>{language ?? '代码'}</span>
				<button
					type="button"
					onClick={copyCode}
					aria-label="复制代码"
					className="inline-flex shrink-0 items-center gap-1.5 rounded px-2 py-1 transition-colors hover:bg-zinc-200/60 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 dark:hover:bg-white/10 dark:hover:text-white"
				>
					{status === 'copied' ? (
						<Check className="size-3.5" aria-hidden="true" />
					) : (
						<Copy className="size-3.5" aria-hidden="true" />
					)}
					<span role="status">
						{status === 'copied'
							? '已复制'
							: status === 'error'
								? '复制失败，请重试'
								: '复制'}
					</span>
				</button>
			</div>
			<pre ref={preRef} className={className} {...props}>
				{children}
			</pre>
		</div>
	);
}
