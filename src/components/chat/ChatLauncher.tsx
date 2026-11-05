import { motion } from 'motion/react';
import Image from 'next/image';

export function ChatLauncher({ onOpen }: { onOpen: () => void }) {
	return (
		<motion.button
			type="button"
			onClick={onOpen}
			initial={{ opacity: 0, y: 8, scale: 0.9 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, y: 6, scale: 0.9 }}
			whileHover={{ y: -2 }}
			whileTap={{ scale: 0.94 }}
			className="relative size-14 overflow-hidden rounded-[20px] border border-zinc-800/10 bg-zinc-100 shadow-[0_12px_35px_-10px_rgba(0,0,0,0.65)] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 dark:border-white/10 dark:bg-zinc-800"
			aria-label="打开 AI 助手"
			aria-expanded="false"
		>
			<Image
				src="/logo.webp"
				alt=""
				fill
				unoptimized
				className="object-cover"
			/>
			<span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-zinc-950 dark:ring-zinc-100" />
		</motion.button>
	);
}
