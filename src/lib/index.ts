import { toast } from 'sonner';
import { env } from '~/env.mjs';

/**
 * 构建基于当前环境的站点URL。
 * @param path - 要附加到站点URL的路径。
 * @returns 完整的站点URL。
 */
export function constructSiteUrl(path = '') {
	// 确保 baseUrl 是有效的 URL
	let baseUrl = 'http://localhost:3000';

	if (process.env.NODE_ENV === 'production') {
		if (env.NEXT_PUBLIC_SITE_URL) {
			baseUrl = env.NEXT_PUBLIC_SITE_URL;
		} else if (process.env.VERCEL_URL) {
			// VERCEL_URL 可能不包含协议，需要添加
			baseUrl = process.env.VERCEL_URL.startsWith('http')
				? process.env.VERCEL_URL
				: `https://${process.env.VERCEL_URL}`;
		}
	}

	try {
		return new URL(path, baseUrl);
	} catch (error) {
		console.error('Invalid URL construction:', error);
		//  fallback 到基本 URL
		return new URL(path, 'http://localhost:3000');
	}
}

/**
 * 复制文本到剪贴板。
 * @param text - 要复制到剪贴板的文本。
 */
export function copyTextToClipboard(text: string) {
	if (navigator.clipboard) {
		navigator.clipboard
			.writeText(text)
			.then(() => {
				// Optional: Show a success message
				console.log('Text copied to clipboard: ', text);
				toast.success('复制成功', {
					richColors: true,
					position: 'top-center'
				});
			})
			.catch((err) => {
				console.error('Failed to copy: ', err);
			});
	} else {
		// Fallback for older browsers
		const textArea = document.createElement('textarea');
		textArea.value = text;
		document.body.appendChild(textArea);
		textArea.select();
		document.execCommand('copy');
		document.body.removeChild(textArea);
	}
}
