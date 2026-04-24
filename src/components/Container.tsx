import { cn } from '@/lib/utils';
import React from 'react';

type ContainerProps = React.ComponentPropsWithoutRef<'div'>;

function getInnerClasses(
	className: { outer?: string; inner?: string } | string
): { outer?: string; inner?: string } {
	if (!className) return { outer: '', inner: '' };
	if (typeof className === 'string')
		return { outer: className, inner: className };
	return { outer: className.outer || '', inner: className.inner || '' };
}

type InnerContainerProps = Omit<ContainerProps, 'className'> & {
	className?: { outer?: string; inner?: string } | string;
};

const OuterContainer = React.forwardRef<HTMLDivElement, ContainerProps>(
	function OuterContainer({ className, children, ...props }, ref) {
		return (
			<div ref={ref} className={cn('sm:px-8', className)} {...props}>
				<div className="mx-auto max-w-7xl lg:px-8">{children}</div>
			</div>
		);
	}
);

const InnerContainer = React.forwardRef<HTMLDivElement, InnerContainerProps>(
	function InnerContainer({ className, children, ...props }, ref) {
		const classNames = getInnerClasses(
			className as string | { outer?: string; inner?: string }
		);

		return (
			<div
				ref={ref}
				className={cn('relative px-4 sm:px-8 lg:px-12', classNames.outer)}
				{...props}
			>
				<div className={cn('mx-auto max-w-2xl lg:max-w-5xl', classNames.inner)}>
					{children}
				</div>
			</div>
		);
	}
);

const ContainerComponent = React.forwardRef<HTMLDivElement, ContainerProps>(
	function Container({ children, ...props }: ContainerProps, ref) {
		return (
			<OuterContainer ref={ref} {...props}>
				<InnerContainer>{children}</InnerContainer>
			</OuterContainer>
		);
	}
);

export const Container = Object.assign(ContainerComponent, {
	Outer: OuterContainer,
	Inner: InnerContainer
});
