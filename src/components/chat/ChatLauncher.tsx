'use client';

import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';
import { motion } from 'motion/react';
import { ChatAvatar } from './ChatAvatar';

export function ChatLauncher({
	className,
	...props
}: ComponentProps<typeof motion.button>) {
	return (
		<motion.button
			type="button"
			initial={{ opacity: 0, y: 8, scale: 0.9 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, y: 6, scale: 0.9 }}
			whileHover={{ y: -2 }}
			whileTap={{ scale: 0.94 }}
			className={cn(
				'size-14 rounded-[20px] bg-zinc-100 shadow-[0_12px_35px_-10px_rgba(0,0,0,0.65)] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 dark:bg-zinc-800',
				className
			)}
			aria-label="打开 AI 助手"
			aria-haspopup="dialog"
			{...props}
		>
			<ChatAvatar className="size-full rounded-[20px]" />
		</motion.button>
	);
}
