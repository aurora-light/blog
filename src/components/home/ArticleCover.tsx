'use client';

import type { ArticleCategory } from '@/lib/article-categories';
import Image from 'next/image';
import { getProxiedImage } from '@/lib/image-proxy';
import { useState } from 'react';

const styles: Record<
	ArticleCategory,
	{ background: string; color: string; label: string; caption: string }
> = {
	ai: {
		background: '#153a35',
		color: '#a7e2cc',
		label: 'AI / AGENT',
		caption: 'Ideas into intelligence.'
	},
	backend: {
		background: '#edece5',
		color: '#334b3e',
		label: 'JAVA / BACKEND',
		caption: 'From logic to systems.'
	},
	web: {
		background: '#e5ecf2',
		color: '#385a79',
		label: 'WEB / INTERFACE',
		caption: 'Built for the browser.'
	},
	engineering: {
		background: '#252a32',
		color: '#d8c7a1',
		label: 'BUILD / ENGINEERING',
		caption: 'Make things work better.'
	},
	life: {
		background: '#f0e3d9',
		color: '#9b5d43',
		label: 'LIFE / JOURNAL',
		caption: 'Notes along the way.'
	},
	reading: {
		background: '#eae5ec',
		color: '#75617c',
		label: 'READ / THINK',
		caption: 'A little more perspective.'
	}
};

export function ArticleCover({
	category,
	slug,
	cover,
	variant = 'card'
}: {
	category: ArticleCategory;
	slug: string;
	cover?: string;
	variant?: 'card' | 'thumbnail';
}) {
	const [failed, setFailed] = useState(false);
	const thumbnail = variant === 'thumbnail';
	const style = styles[category];
	const seed =
		Array.from(slug).reduce(
			(sum, character) => sum + character.charCodeAt(0),
			0
		) % 3;
	return (
		<div
			aria-hidden={thumbnail || undefined}
			className={
				thumbnail
					? 'relative aspect-[16/10] w-16 shrink-0 overflow-hidden rounded-md sm:w-20'
					: 'relative aspect-[16/10] overflow-hidden rounded-xl transition-transform duration-500 group-hover:-translate-y-1 motion-reduce:transform-none'
			}
			style={{ backgroundColor: style.background, color: style.color }}
		>
			<div
				className="absolute inset-0 opacity-[0.06]"
				style={{
					backgroundImage:
						'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
					backgroundSize: '24px 24px'
				}}
			/>
			{!thumbnail && (
				<div className="absolute inset-x-5 top-4 flex items-center justify-between font-mono text-[9px] tracking-[0.16em] opacity-70">
					<span>{style.label}</span>
					<span>0{seed + 1} / NOTES</span>
				</div>
			)}
			<svg
				viewBox="0 0 320 200"
				className="absolute inset-0 size-full"
				fill="none"
				aria-hidden="true"
			>
				{category === 'ai' ? (
					<>
						<path
							d="M55 101H117M203 101H264M160 45V68M160 134V159"
							stroke="currentColor"
							strokeOpacity=".35"
						/>
						<path
							d="M69 53L128 82M192 120L249 150M70 149L128 119M193 82L248 53"
							stroke="currentColor"
							strokeOpacity=".25"
						/>
						{[
							{ x: 55, y: 101 },
							{ x: 265, y: 101 },
							{ x: 69, y: 53 },
							{ x: 249, y: 150 },
							{ x: 70, y: 149 },
							{ x: 248, y: 53 }
						].map(({ x, y }) => (
							<circle
								key={`${x}-${y}`}
								cx={x}
								cy={y}
								r="5"
								stroke="currentColor"
								fill={style.background}
							/>
						))}
						<rect
							x="122"
							y="65"
							width="76"
							height="76"
							rx="21"
							stroke="currentColor"
							strokeOpacity=".7"
						/>
						<rect
							x="131"
							y="74"
							width="58"
							height="58"
							rx="15"
							fill="currentColor"
							fillOpacity=".08"
						/>
						<path
							d="M148 94L160 88L172 94V109L160 116L148 109Z"
							stroke="currentColor"
							strokeWidth="1.5"
						/>
						<circle
							cx="160"
							cy="103"
							r="48"
							stroke="currentColor"
							strokeOpacity=".1"
						/>
					</>
				) : category === 'backend' ? (
					<>
						<rect
							x="85"
							y="56"
							width="150"
							height="98"
							rx="8"
							stroke="currentColor"
							strokeOpacity=".3"
						/>
						<path d="M85 78H235" stroke="currentColor" strokeOpacity=".2" />
						{[100, 108, 116].map((x) => (
							<circle
								key={x}
								cx={x}
								cy="67"
								r="2"
								fill="currentColor"
								fillOpacity=".35"
							/>
						))}
						<text
							x="160"
							y="126"
							textAnchor="middle"
							fill="currentColor"
							fontSize="41"
							fontFamily="monospace"
							letterSpacing="9"
						>
							{'{ }'}
						</text>
						<path
							d="M105 145H151M167 145H215M73 102H85M235 102H247"
							stroke="currentColor"
							strokeOpacity=".25"
						/>
					</>
				) : category === 'web' ? (
					<>
						<rect
							x="68"
							y="49"
							width="183"
							height="113"
							rx="6"
							stroke="currentColor"
							strokeOpacity=".5"
						/>
						<path
							d="M68 70H251M119 70V162"
							stroke="currentColor"
							strokeOpacity=".25"
						/>
						<rect
							x="80"
							y="83"
							width="27"
							height="6"
							rx="2"
							fill="currentColor"
							fillOpacity=".2"
						/>
						<path
							d="M80 102H105M80 113H99M80 124H103"
							stroke="currentColor"
							strokeOpacity=".3"
							strokeWidth="2"
							strokeLinecap="round"
						/>
						<rect
							x="132"
							y="84"
							width="105"
							height="27"
							rx="3"
							fill="currentColor"
							fillOpacity=".09"
						/>
						{[132, 169, 206].map((x) => (
							<rect
								key={x}
								x={x}
								y="120"
								width="31"
								height="28"
								rx="3"
								fill="currentColor"
								fillOpacity=".15"
							/>
						))}
						<path
							d="M222 136L248 148L237 152L232 164Z"
							fill={style.background}
							stroke="currentColor"
						/>
					</>
				) : category === 'engineering' ? (
					<>
						<path
							d="M85 65V143Q85 153 97 153H214M85 91H156Q170 91 170 105V118H227"
							stroke="currentColor"
							strokeOpacity=".5"
							strokeWidth="2"
						/>
						{[
							{ x: 85, y: 65 },
							{ x: 85, y: 91 },
							{ x: 170, y: 118 },
							{ x: 227, y: 118 },
							{ x: 214, y: 153 }
						].map(({ x, y }) => (
							<circle
								key={`${x}-${y}`}
								cx={x}
								cy={y}
								r="7"
								fill={style.background}
								stroke="currentColor"
							/>
						))}
						<path
							d="M114 64H209M114 73H171M114 82H189"
							stroke="currentColor"
							strokeOpacity=".18"
							strokeWidth="3"
							strokeLinecap="round"
						/>
					</>
				) : category === 'life' ? (
					<>
						<circle
							cx={188 + seed * 8}
							cy="84"
							r="26"
							fill="currentColor"
							fillOpacity=".2"
						/>
						<path
							d="M41 155L107 94L157 146L198 111L278 160"
							stroke="currentColor"
							strokeOpacity=".45"
						/>
						<path
							d="M41 167H278M61 176H257"
							stroke="currentColor"
							strokeOpacity=".15"
						/>
						<rect
							x="70"
							y="45"
							width="182"
							height="125"
							rx="58"
							stroke="currentColor"
							strokeOpacity=".25"
						/>
					</>
				) : (
					<>
						<path
							d="M160 74C133 57 101 58 75 68V146C104 136 133 137 160 153C187 137 216 136 245 146V68C217 58 187 57 160 74Z"
							stroke="currentColor"
							strokeOpacity=".5"
						/>
						<path
							d="M160 74V153M91 85C110 80 130 82 145 88M91 99C110 94 130 96 145 102M91 113C110 108 130 110 145 116M176 89C195 82 217 80 230 85M176 103C195 96 217 94 230 99M176 117C195 110 217 108 230 113"
							stroke="currentColor"
							strokeOpacity=".3"
						/>
					</>
				)}
			</svg>
			{!thumbnail && (
				<span className="absolute bottom-4 left-5 font-mono text-[9px] tracking-wide opacity-60">
					{style.caption}
				</span>
			)}
			{cover && !failed && (
				<Image
					src={getProxiedImage(cover, { width: thumbnail ? 160 : 800 })}
					alt=""
					fill
					sizes={
						thumbnail
							? '(max-width: 639px) 64px, 80px'
							: '(max-width: 639px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw'
					}
					unoptimized
					onError={() => setFailed(true)}
					className="object-cover transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transform-none"
				/>
			)}
		</div>
	);
}
