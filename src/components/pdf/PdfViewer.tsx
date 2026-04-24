'use client';

import { useEffect, useState } from 'react';

interface PdfViewerProps {
	url: string;
}

export default function PdfViewer({ url }: PdfViewerProps) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return <div className="p-4">加载中...</div>;
	}

	return (
		<div className="flex flex-col items-center w-full h-full">
			<iframe src={url} className="w-full h-full border-0" title="PDF Viewer" />
		</div>
	);
}
