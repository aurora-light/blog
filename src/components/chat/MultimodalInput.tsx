'use client';

import { Textarea } from '@/components/ui/textarea';
import type { FileUIPart } from 'ai';
import { ImagePlus, LoaderCircle, Send, Square } from 'lucide-react';
import {
	type ClipboardEvent,
	type DragEvent,
	type FormEvent,
	type KeyboardEvent,
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState
} from 'react';
import { toast } from 'sonner';
import {
	ImageAttachmentPreview,
	type ImageAttachment
} from './ImageAttachmentPreview';

const MAX_IMAGE_COUNT = 4;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png']);

type PendingImage = ImageAttachment & {
	file: File;
	uploadedFile?: FileUIPart;
};

type MultimodalInputProps = {
	input: string;
	inputRef: RefObject<HTMLTextAreaElement | null>;
	isGenerating: boolean;
	onInputChange: (value: string) => void;
	onSubmit: (text: string, files: FileUIPart[]) => Promise<void> | void;
	onStop: () => void;
};

async function uploadImage(file: File): Promise<FileUIPart> {
	const formData = new FormData();
	formData.append('file', file);

	const response = await fetch('/api/files/upload', {
		body: formData,
		method: 'POST'
	});
	const result = (await response.json()) as { error?: string; url?: string };

	if (!response.ok || !result.url) {
		throw new Error(result.error ?? '图片上传失败');
	}

	return {
		filename: file.name,
		mediaType: file.type,
		type: 'file',
		url: result.url
	};
}

function validateImage(file: File) {
	if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
		return '只支持 JPEG 和 PNG 图片';
	}

	if (file.size > MAX_IMAGE_SIZE) {
		return '单张图片不能超过 5MB';
	}

	return null;
}

export function MultimodalInput({
	input,
	inputRef,
	isGenerating,
	onInputChange,
	onSubmit,
	onStop
}: MultimodalInputProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const imagesRef = useRef<PendingImage[]>([]);
	const dragDepthRef = useRef(0);
	const [images, setImages] = useState<PendingImage[]>([]);
	const [isDraggingImage, setIsDraggingImage] = useState(false);

	useEffect(() => {
		imagesRef.current = images;
	}, [images]);

	useEffect(
		() => () => {
			for (const image of imagesRef.current) {
				URL.revokeObjectURL(image.url);
			}
		},
		[]
	);

	const updateImage = useCallback(
		(id: string, update: Partial<PendingImage>) => {
			setImages((current) =>
				current.map((image) =>
					image.id === id ? { ...image, ...update } : image
				)
			);
		},
		[]
	);

	const addImages = useCallback(
		async (files: File[]) => {
			const remainingSlots = MAX_IMAGE_COUNT - images.length;
			if (remainingSlots <= 0) {
				toast.error(`最多上传 ${MAX_IMAGE_COUNT} 张图片`);
				return;
			}

			const validFiles: File[] = [];
			for (const file of files) {
				const error = validateImage(file);
				if (error) {
					toast.error(`${file.name}: ${error}`);
					continue;
				}
				validFiles.push(file);
			}

			const selectedFiles = validFiles.slice(0, remainingSlots);
			if (validFiles.length > remainingSlots) {
				toast.error(`最多上传 ${MAX_IMAGE_COUNT} 张图片`);
			}

			const pendingImages = selectedFiles.map((file) => ({
				file,
				id: crypto.randomUUID(),
				name: file.name,
				url: URL.createObjectURL(file),
				status: 'uploading' as const
			}));

			setImages((current) => [...current, ...pendingImages]);

			await Promise.all(
				pendingImages.map(async (image) => {
					try {
						const uploadedFile = await uploadImage(image.file);
						updateImage(image.id, { status: 'ready', uploadedFile });
					} catch (error) {
						console.error('Failed to upload chat image:', error);
						updateImage(image.id, { status: 'error' });
						toast.error(
							error instanceof Error ? error.message : '图片上传失败'
						);
					}
				})
			);
		},
		[images.length, updateImage]
	);

	const removeImage = useCallback((id: string) => {
		setImages((current) => {
			const image = current.find((item) => item.id === id);
			if (image) URL.revokeObjectURL(image.url);
			return current.filter((item) => item.id !== id);
		});
	}, []);

	function clearImages() {
		for (const image of images) {
			URL.revokeObjectURL(image.url);
		}
		setImages([]);
		if (fileInputRef.current) fileInputRef.current.value = '';
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (images.some((image) => image.status === 'uploading')) {
			toast.error('图片仍在上传，请稍候');
			return;
		}

		const uploadedFiles = images.flatMap((image) =>
			image.status === 'ready' && image.uploadedFile ? [image.uploadedFile] : []
		);

		if (!input.trim() && uploadedFiles.length === 0) return;

		await onSubmit(input, uploadedFiles);
		clearImages();
	}

	function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		if (
			event.key === 'Enter' &&
			!event.shiftKey &&
			!event.nativeEvent.isComposing
		) {
			event.preventDefault();
			event.currentTarget.form?.requestSubmit();
		}
	}

	const handlePaste = useCallback(
		async (event: ClipboardEvent<HTMLTextAreaElement>) => {
			const items = event.clipboardData?.items;
			if (!items) return;

			const imageItems = Array.from(items).filter((item) =>
				item.type.startsWith('image/')
			);

			if (imageItems.length === 0) return;

			const pastedImages = imageItems
				.map((item) => item.getAsFile())
				.filter((file): file is File => file !== null);

			if (pastedImages.length === 0) return;

			event.preventDefault();

			try {
				await addImages(pastedImages);
			} catch {
				toast.error('粘贴图片上传失败');
			}
		},
		[addImages]
	);

	const handleDragEnter = useCallback((event: DragEvent<HTMLFormElement>) => {
		if (!event.dataTransfer.types.includes('Files')) return;

		event.preventDefault();
		dragDepthRef.current += 1;
		setIsDraggingImage(true);
	}, []);

	const handleDragOver = useCallback((event: DragEvent<HTMLFormElement>) => {
		if (!event.dataTransfer.types.includes('Files')) return;

		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';
	}, []);

	const handleDragLeave = useCallback((event: DragEvent<HTMLFormElement>) => {
		if (!event.dataTransfer.types.includes('Files')) return;

		event.preventDefault();
		dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
		if (dragDepthRef.current === 0) setIsDraggingImage(false);
	}, []);

	const handleDrop = useCallback(
		(event: DragEvent<HTMLFormElement>) => {
			if (!event.dataTransfer.types.includes('Files')) return;

			event.preventDefault();
			dragDepthRef.current = 0;
			setIsDraggingImage(false);

			const droppedFiles = Array.from(event.dataTransfer.files);
			if (droppedFiles.length > 0) void addImages(droppedFiles);
		},
		[addImages]
	);

	const isUploading = images.some((image) => image.status === 'uploading');
	const hasReadyImage = images.some((image) => image.status === 'ready');
	const canSubmit = Boolean(input.trim() || hasReadyImage) && !isUploading;

	return (
		<form
			onSubmit={handleSubmit}
			onDragEnter={handleDragEnter}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			className="bg-zinc-50/70 p-3 dark:border-white/10 dark:bg-white/[0.025]"
		>
			<div
				className={`relative overflow-hidden rounded-[20px] bg-white shadow-xs ring-1 transition focus-within:ring-2 dark:bg-zinc-900 ${
					isDraggingImage
						? 'ring-2 ring-amber-400 dark:ring-amber-400'
						: 'ring-zinc-200/70 focus-within:ring-amber-400/70 dark:ring-white/10 dark:focus-within:ring-amber-400/50'
				}`}
			>
				{isDraggingImage ? (
					<div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-amber-50/95 text-amber-900 backdrop-blur-xs dark:bg-zinc-950/95 dark:text-amber-300">
						<div className="flex flex-col items-center gap-2 text-xs font-medium">
							<span className="grid h-10 w-10 place-items-center rounded-full bg-amber-400 text-zinc-950 shadow-xs">
								<ImagePlus className="h-5 w-5" aria-hidden="true" />
							</span>
							松开即可上传图片
						</div>
					</div>
				) : null}
				{images.length > 0 ? (
					<div className="flex gap-2 overflow-x-auto px-3 pt-3 [scrollbar-width:thin]">
						{images.map((image) => (
							<ImageAttachmentPreview
								key={image.id}
								attachment={image}
								onRemove={removeImage}
							/>
						))}
					</div>
				) : null}

				<div className="flex items-end gap-1.5 p-2 pl-2.5">
					<input
						ref={fileInputRef}
						type="file"
						accept="image/jpeg,image/png"
						multiple
						onChange={(event) => {
							void addImages(Array.from(event.target.files ?? []));
							event.target.value = '';
						}}
						className="sr-only"
						tabIndex={-1}
					/>
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						disabled={isGenerating || images.length >= MAX_IMAGE_COUNT}
						className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-amber-50 hover:text-amber-700 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-35 dark:hover:bg-amber-400/10 dark:hover:text-amber-300"
						aria-label="上传图片"
						title="上传或粘贴图片"
					>
						<ImagePlus className="h-[18px] w-[18px]" />
					</button>
					<Textarea
						ref={inputRef}
						value={input}
						onChange={(event) => onInputChange(event.target.value)}
						onKeyDown={handleInputKeyDown}
						onPaste={handlePaste}
						rows={1}
						maxLength={2000}
						placeholder="输入问题，或直接粘贴图片…"
						className="max-h-28 min-h-9 flex-1 resize-none border-0 bg-transparent py-1.5 text-sm leading-6 text-zinc-900 outline-hidden shadow-none placeholder:text-zinc-400 focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent dark:text-zinc-100"
					/>
					{isGenerating ? (
						<button
							type="button"
							onClick={onStop}
							className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-900 text-white transition hover:scale-105 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 dark:bg-zinc-100 dark:text-zinc-900"
							aria-label="停止生成"
						>
							<Square className="h-3.5 w-3.5 fill-current" />
						</button>
					) : (
						<button
							type="submit"
							disabled={!canSubmit}
							className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-400 text-zinc-950 transition hover:scale-105 hover:bg-amber-300 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
							aria-label={isUploading ? '图片上传中' : '发送消息'}
						>
							{isUploading ? (
								<LoaderCircle className="h-4 w-4 animate-spin" />
							) : (
								<Send className="h-4 w-4" />
							)}
						</button>
					)}
				</div>
			</div>
			<p className="mt-2 text-center text-[10px] text-zinc-400">
				支持选择、粘贴或拖拽 JPEG、PNG，最多 4 张，单张最大 5MB
			</p>
		</form>
	);
}
