import { cn } from '@/lib/utils';
import { LoaderCircle, X } from 'lucide-react';
import Image, { type ImageLoader } from 'next/image';
import { memo } from 'react';

export type ImageAttachmentStatus = 'uploading' | 'ready' | 'error';

export type ImageAttachment = {
	id: string;
	name: string;
	url: string;
	status: ImageAttachmentStatus;
};

type ImageAttachmentPreviewProps = {
	attachment: ImageAttachment;
	onRemove?: (id: string) => void;
	variant?: 'input' | 'message';
};

const passthroughImageLoader: ImageLoader = ({ src }) => src;

function PureImageAttachmentPreview({
	attachment,
	onRemove,
	variant = 'input'
}: ImageAttachmentPreviewProps) {
	const { id, name, url, status } = attachment;
	const isMessage = variant === 'message';

	const preview = (
		<div
			className={cn(
				'group/image relative shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-white/10 dark:bg-white/5',
				isMessage ? 'h-48 w-64 max-w-full' : 'h-16 w-16'
			)}
			data-testid="input-image-preview"
			aria-busy={status === 'uploading'}
		>
			<Image
				src={url}
				alt={name}
				fill
				sizes={isMessage ? '(max-width: 640px) 70vw, 256px' : '64px'}
				loader={passthroughImageLoader}
				unoptimized
				className="object-cover"
			/>

			{status === 'uploading' ? (
				<div
					className="absolute inset-0 grid place-items-center bg-zinc-950/45 text-white backdrop-blur-[1px]"
					data-testid="input-image-loader"
				>
					<LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
					<span className="sr-only">正在上传 {name}</span>
				</div>
			) : null}

			{status === 'error' ? (
				<div className="absolute inset-x-0 bottom-0 bg-red-600/90 py-1 text-center text-[9px] font-medium text-white">
					上传失败
				</div>
			) : null}

			{onRemove ? (
				<button
					type="button"
					onClick={() => onRemove(id)}
					className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-zinc-950/70 text-white opacity-0 transition hover:bg-zinc-950 focus:opacity-100 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 group-hover/image:opacity-100"
					aria-label={`移除 ${name}`}
					title={`移除 ${name}`}
				>
					<X className="h-3 w-3" aria-hidden="true" />
				</button>
			) : null}
		</div>
	);

	if (!isMessage) return preview;

	return (
		<a
			href={url}
			target="_blank"
			rel="noreferrer"
			className="block max-w-full transition hover:opacity-90"
		>
			{preview}
		</a>
	);
}

export const ImageAttachmentPreview = memo(PureImageAttachmentPreview);
