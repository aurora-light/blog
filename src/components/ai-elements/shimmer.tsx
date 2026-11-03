'use client';

import { cn } from '@/lib/utils';
import { motion, type MotionProps } from 'motion/react';
import {
	memo,
	type ComponentType,
	type CSSProperties,
	type ElementType
} from 'react';

type MotionElementProps = MotionProps & Record<string, unknown>;

const motionComponentCache = new Map<
	ElementType,
	ComponentType<MotionElementProps>
>();

function getMotionComponent(element: ElementType) {
	const cachedComponent = motionComponentCache.get(element);
	if (cachedComponent) return cachedComponent;

	const component = motion.create(element) as ComponentType<MotionElementProps>;
	motionComponentCache.set(element, component);
	return component;
}

export type ShimmerProps = {
	children: string;
	as?: ElementType;
	className?: string;
	duration?: number;
	spread?: number;
};

function ShimmerComponent({
	children,
	as: Component = 'p',
	className,
	duration = 2,
	spread = 2
}: ShimmerProps) {
	const MotionComponent = getMotionComponent(Component);
	const dynamicSpread = children.length * spread;

	return (
		<MotionComponent
			animate={{ backgroundPosition: '0% center' }}
			initial={{ backgroundPosition: '100% center' }}
			transition={{
				duration,
				ease: 'linear',
				repeat: Number.POSITIVE_INFINITY
			}}
			className={cn(
				'relative inline-block bg-size-[250%_100%,auto] bg-clip-text text-transparent',
				className
			)}
			style={
				{
					'--spread': `${dynamicSpread}px`,
					backgroundImage:
						'linear-gradient(90deg, transparent calc(50% - var(--spread)), hsl(var(--background)), transparent calc(50% + var(--spread))), linear-gradient(hsl(var(--muted-foreground)), hsl(var(--muted-foreground)))',
					backgroundRepeat: 'no-repeat'
				} as CSSProperties
			}
		>
			{children}
		</MotionComponent>
	);
}

export const Shimmer = memo(ShimmerComponent);

Shimmer.displayName = 'Shimmer';
