import { withContentlayer } from 'next-contentlayer2';
/** @type {import('next').NextConfig} */

const nextConfig = {
	reactStrictMode: true,
	serverExternalPackages: ['@vercel/blob'],
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'blog-1304565468.cos.ap-shanghai.myqcloud.com'
			},
			{
				protocol: 'https',
				hostname: 'github.com'
			}
		]
	}
};

export default withContentlayer(nextConfig);
