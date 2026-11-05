import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default defineConfig([
	...nextVitals,
	...nextTypeScript,
	prettierRecommended,
	{
		rules: {
			'@typescript-eslint/ban-ts-comment': 'off',
			'no-case-declarations': 'off',
			'no-constant-condition': 'off',
			'prettier/prettier': 'error',
			'react-hooks/set-state-in-effect': 'off',
			'react-hooks/static-components': 'off'
		}
	},
	globalIgnores([
		'.contentlayer/**',
		'.next/**',
		'next-env.d.ts',
		'node_modules/**',
		'packages/*/dist/**',
		'public/**'
	])
]);
