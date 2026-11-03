'use client';
import { ThemeProvider, type ThemeProviderProps } from 'next-themes';
import { memo, type FC } from 'react';

const ThemeProviders: FC<ThemeProviderProps> = ({ children, ...props }) => {
	return (
		<ThemeProvider
			{...props}
			attribute="class"
			defaultTheme="light"
			enableSystem
		>
			{children}
		</ThemeProvider>
	);
};

export default memo(ThemeProviders);
