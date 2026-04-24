// src/components/ResumeDialog.tsx
'use client';

import { ResumeIcon } from '@/assets';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog';
import { useState } from 'react';
import PdfViewer from './pdf/PdfViewer';
// const PdfViewer = dynamic(() => import('./pdf/PdfViewer'), { ssr: false });

export function ResumeDialog() {
	const [open, setOpen] = useState(false);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<button className="flex flex-row gap-1 justify-center items-center rounded-xl bg-violet-500 text-white px-2 py-1.5 cursor-pointer">
					<ResumeIcon className="h-4 w-4" />
					我的简历
				</button>
			</DialogTrigger>
			<DialogContent className="max-w-4xl h-full">
				<DialogHeader>
					<DialogTitle>我的简历</DialogTitle>
				</DialogHeader>
				<div className="h-full overflow-auto">
					<PdfViewer url="/resume/leslie-frontend.pdf" />
				</div>
			</DialogContent>
		</Dialog>
	);
}
