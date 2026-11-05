import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, extname, join, resolve } from 'node:path';
import sharp from 'sharp';

const bucket = 'lesliecode-hk';
const prefix = 'posts/blog';
const region = 'cn-hongkong';
const endpoint = `oss-${region}.aliyuncs.com`;
const maxBytes = 1_000_000;

async function compressImage(input) {
	for (const [width, quality] of [
		[1600, 82],
		[1200, 75],
		[800, 65]
	]) {
		const image = await sharp(input)
			.autoOrient()
			.resize({ width, height: width, withoutEnlargement: true })
			.webp({ quality })
			.toBuffer();
		if (image.length < maxBytes) return image;
	}
	throw new Error('无法将图片压缩到 1 MB 以内。');
}

async function uploadImage(input) {
	if (!(await stat(input)).isFile()) throw new Error('请选择一张图片文件。');
	const stem = basename(input, extname(input))
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 64);
	const name = `${stem || 'image'}-${randomUUID()}.webp`;
	const key = `${prefix}/${name}`;
	const url = `https://${bucket}.${endpoint}/${key}`;
	const image = await compressImage(input);
	const temporaryDir = await mkdtemp(join(tmpdir(), 'blog-image-'));

	try {
		const output = join(temporaryDir, name);
		await writeFile(output, image);
		execFileSync(
			'ossutil',
			[
				'cp',
				output,
				`oss://${bucket}/${key}`,
				'--region',
				region,
				'--endpoint',
				endpoint,
				'--acl',
				'public-read',
				'--content-type',
				'image/webp'
			],
			{ stdio: ['ignore', 2, 2] }
		);
	} finally {
		await rm(temporaryDir, { recursive: true, force: true });
	}

	try {
		const response = await fetch(url, {
			method: 'HEAD',
			signal: AbortSignal.timeout(15_000)
		});
		if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
		if (response.headers.get('content-type') !== 'image/webp') {
			throw new Error('响应类型不是 image/webp');
		}
	} catch (error) {
		throw new Error(`已上传 ${key}，但匿名访问验证失败（${error.message}）。`);
	}
	console.log(url);
}

const args = process.argv.slice(2);
const usage = '用法：pnpm upload:image <图片文件路径>';

if (args.includes('--help') || args.includes('-h')) {
	console.log(usage);
} else if (args.length !== 1) {
	console.error(usage);
	process.exitCode = 1;
} else {
	try {
		await uploadImage(resolve(args[0]));
	} catch (error) {
		if (error.syscall === 'spawnSync ossutil' && error.code === 'ENOENT') {
			console.error('找不到 ossutil。请安装 ossutil 2.x 并将它加入 PATH。');
		} else {
			console.error(
				error.status ? '上传失败，请检查上方 ossutil 输出。' : error.message
			);
		}
		process.exitCode = 1;
	}
}
