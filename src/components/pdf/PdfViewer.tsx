'use client';

import { useState } from 'react';

interface PdfViewerProps {
	url: string;
}

export default function PdfViewer({ url }: PdfViewerProps) {
	const [loading, setLoading] = useState(true);

	return (
		<div className="flex flex-col items-center w-full h-full relative">
			{loading && (
				<div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
					<div className="flex flex-col items-center gap-3">
						<div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
						<span className="text-sm text-muted-foreground">加载中...</span>
					</div>
				</div>
			)}
			<iframe
				src={url}
				className="w-full h-full border-0"
				title="PDF Viewer"
				onLoad={() => setLoading(false)}
			/>
		</div>
	);
}
