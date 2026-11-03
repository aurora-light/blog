import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png'] as const;

const FileSchema = z.object({
	file: z
		.instanceof(File)
		.refine((file) => file.size <= MAX_IMAGE_SIZE, {
			message: '图片大小不能超过 5MB'
		})
		.refine((file) => ACCEPTED_IMAGE_TYPES.some((type) => type === file.type), {
			message: '只支持 JPEG 和 PNG 图片'
		})
});

export async function POST(request: Request) {
	if (request.body === null) {
		return NextResponse.json({ error: '请求内容为空' }, { status: 400 });
	}

	try {
		const formData = await request.formData();
		const validation = FileSchema.safeParse({ file: formData.get('file') });

		if (!validation.success) {
			return NextResponse.json(
				{
					error: validation.error.issues
						.map((issue) => issue.message)
						.join('，')
				},
				{ status: 400 }
			);
		}

		const { file } = validation.data;
		const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
		const blob = await put(`chat/${safeName}`, file, {
			access: 'public',
			addRandomSuffix: true
		});

		return NextResponse.json({
			contentType: file.type,
			filename: file.name,
			url: blob.url
		});
	} catch (error) {
		console.error('Failed to upload chat image:', error);
		return NextResponse.json({ error: '图片上传失败' }, { status: 500 });
	}
}
