'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import React, { useState } from 'react';

export function Photos({
	photos,
	expandRatio = 1.25
}: {
	photos: string[];
	expandRatio?: number;
}) {
	const [width, setWidth] = useState(0);
	const [isCompact, setIsCompact] = useState(false);
	const expandedWidth = React.useMemo(
		() => width * expandRatio,
		[width, expandRatio]
	);
	React.useEffect(() => {
		const handleResize = () => {
			if (window.innerWidth < 640) {
				setIsCompact(true);
				return setWidth(window.innerWidth / photos.length - 64);
			}
			setWidth(window.innerWidth / photos.length - 4 * photos.length);
		};
		window.addEventListener('resize', handleResize);
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, [photos.length]);
	return (
		<motion.div
			className="mt-16 sm:mt-20"
			initial={{
				y: 16,
				opacity: 0,
				scale: 0.95
			}}
			animate={{
				y: 0,
				opacity: 1,
				scale: 1
			}}
			transition={{
				delay: 0.3,
				type: 'spring',
				damping: 25,
				stiffness: 100,
				duration: 0.3
			}}
		>
			<div
				className="-my-4 flex gap-4 snap-x snap-proximity scroll-pl-4 flex-wrap justify-start overflow-x-auto p-4 sm:gap-6 md:overflow-x-hidden 
      md:px-0 md:justify-center"
			>
				{photos.map((image, index) => {
					return (
						<motion.div
							key={image}
							className="relative h-40 flex-none shrink-0 snap-start overflow-hidden
            rounded-xl bg-zinc-100 ring-2 ring-lime-800/20 dark:bg-zinc-800 dark:ring-lime-300/10 md:h-72 md:rounded-3xl
            "
							animate={{
								width,
								opacity: isCompact ? 1 : 0.85,
								filter: isCompact ? 'grayscale(0)' : 'grayscale(0.5)',
								rotate: index % 2 === 0 ? 2 : -1
							}}
							whileHover={
								isCompact
									? {}
									: {
											width: expandedWidth,
											opacity: 1,
											filter: 'grayscale(0)'
										}
							}
						>
							<Image
								src={image}
								alt=""
								width={500}
								height={500}
								sizes="(min-width: 640px) 8rem , 11rem "
								className="w-full h-full object-cover pointer-events-none absolute inset-0 select-none"
								unoptimized
							/>
						</motion.div>
					);
				})}
			</div>
		</motion.div>
	);
}
