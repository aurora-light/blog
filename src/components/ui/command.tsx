'use client';

import { cn } from '@/lib/utils';
import * as Dialog from '@radix-ui/react-dialog';
import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import * as React from 'react';

export function CommandDialog({
	open,
	onOpenChange,
	onCloseAutoFocus,
	children
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCloseAutoFocus?: React.ComponentProps<
		typeof Dialog.Content
	>['onCloseAutoFocus'];
	children: React.ReactNode;
}) {
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
				<Dialog.Content
					onCloseAutoFocus={onCloseAutoFocus}
					className="fixed left-1/2 top-[8dvh] z-50 w-[92vw] max-w-2xl -translate-x-1/2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
				>
					{children}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

export function Command({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive>) {
	return (
		<CommandPrimitive
			className={cn('flex h-full w-full flex-col overflow-hidden', className)}
			{...props}
		/>
	);
}

export function CommandInput({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
	return (
		<div className="flex shrink-0 items-center border-b border-zinc-200 px-3 dark:border-zinc-700">
			<Search className="mr-2 h-4 w-4 shrink-0 text-zinc-400" />
			<CommandPrimitive.Input
				className={cn(
					'h-12 w-full rounded-md bg-transparent text-sm outline-none! border-none! placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-50',
					className
				)}
				{...props}
			/>
		</div>
	);
}

export function CommandList({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
	return (
		<CommandPrimitive.List
			className={cn('max-h-90 overflow-y-auto overflow-x-hidden', className)}
			{...props}
		/>
	);
}

export function CommandEmpty(
	props: React.ComponentProps<typeof CommandPrimitive.Empty>
) {
	return (
		<CommandPrimitive.Empty
			className="py-10 text-center text-sm text-zinc-500"
			{...props}
		/>
	);
}

export function CommandGroup({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
	return (
		<CommandPrimitive.Group
			className={cn(
				'overflow-hidden p-2 text-zinc-600 **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdg-group-heading]]:text-zinc-400',
				className
			)}
			{...props}
		/>
	);
}

export function CommandItem({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
	return (
		<CommandPrimitive.Item
			className={cn(
				'relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 text-sm outline-none data-[selected=true]:bg-zinc-100 data-[selected=true]:text-zinc-900 dark:data-[selected=true]:bg-zinc-800 dark:data-[selected=true]:text-zinc-100',
				className
			)}
			{...props}
		/>
	);
}

export function CommandSeparator({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
	return (
		<CommandPrimitive.Separator
			className={cn('-mx-1 h-px bg-zinc-200 dark:bg-zinc-700', className)}
			{...props}
		/>
	);
}
