import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Suspense } from 'react';

export default function RootLayout({
	children
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen bg-[#fafaf8] text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
			<Header />
			<main id="main-content" className="min-h-[65vh] pt-16">
				{children}
			</main>
			<Suspense>
				<Footer />
			</Suspense>
		</div>
	);
}
