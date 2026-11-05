'use client';
import { ClientOnly } from '@/components/ClientOnly';
import Image from 'next/image';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';

interface ZoomAbleImageProps {
	src?: string;
	alt?: string;
	width?: number | string;
	height?: number | string;
}

const ZoomAbleImage = ({ src, alt, width, height }: ZoomAbleImageProps) => {
	if (!src) return null;
	return (
		// @ts-ignore
		<ClientOnly>
			<Zoom>
				<Image
					unoptimized
					src={src}
					alt={alt ?? ''}
					width={Number(width) || 800}
					height={Number(height) || 600}
					className="h-auto w-full"
				/>
			</Zoom>
		</ClientOnly>
	);
};

export default ZoomAbleImage;
