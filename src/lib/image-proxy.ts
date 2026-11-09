// OSS handles image processing; no third-party proxy server is required.
const OSS_IMAGE_HOST = 'lesliecode-hk.oss-cn-hongkong.aliyuncs.com';

type ImageOptions = { width?: number; quality?: number };

export function getOriginalImage(source?: string): string {
	const url = source?.trim() ?? '';
	return url.startsWith('//') ? `https:${url}` : url;
}

export function getProxiedImage(
	source?: string,
	{ width = 800, quality = 80 }: ImageOptions = {}
): string {
	const original = getOriginalImage(source);
	let url: URL;
	try {
		url = new URL(original);
	} catch {
		return original;
	}

	if (
		!['https:', 'http:'].includes(url.protocol) ||
		url.hostname !== OSS_IMAGE_HOST ||
		!/\.(?:jpe?g|png|webp|bmp)$/i.test(url.pathname) ||
		!Number.isFinite(width) ||
		!Number.isFinite(quality)
	)
		return original;

	// Preserve signed URLs and existing processing rules (e.g. watermarks).
	if (
		Array.from(url.searchParams.keys()).some((key) =>
			/^(?:x-oss-|ossaccesskeyid$|signature$|expires$|security-token$)/i.test(
				key
			)
		)
	)
		return original;

	const imageWidth = Math.min(16384, Math.max(1, Math.round(width)));
	const imageQuality = Math.min(100, Math.max(1, Math.round(quality)));
	url.searchParams.set(
		'x-oss-process',
		`image/resize,w_${imageWidth},limit_1/quality,q_${imageQuality}`
	);
	return url.toString();
}

export function getArticleLazyImage(source?: string): string {
	return getProxiedImage(source, { width: 1200 });
}
