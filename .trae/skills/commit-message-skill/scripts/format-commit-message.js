/**
 * 格式化提交消息
 * 格式：taskId+feature flag+message
 */

// 支持的 feature flag
const validFeatureFlags = [
	'feat',
	'fix',
	'chore',
	'docs',
	'style',
	'refactor',
	'test'
];
const DEFAULT_COMMIT_ID = '202401';
/**
 * 生成以 2 开头的六位数字 taskId
 * @returns {string} 生成的 taskId
 */
function generateDefaultTaskId() {
	// 以 2 开头，后面跟 5 位随机数字
	const randomPart = Math.floor(10000 + Math.random() * 90000);
	return DEFAULT_COMMIT_ID || randomPart;
}

/**
 * 验证 feature flag 是否有效
 * @param {string} flag - 要验证的 feature flag
 * @returns {boolean} 是否有效
 */
function isValidFeatureFlag(flag) {
	return validFeatureFlags.includes(flag);
}

/**
 * 格式化提交消息
 * @param {string} taskId - 任务 ID，或 "default"
 * @param {string} featureFlag - feature flag
 * @param {string} message - 提交消息
 * @returns {string} 格式化后的提交消息
 */
function formatCommitMessage(taskId, featureFlag, message) {
	// 处理默认 taskId
	let finalTaskId;
	if (taskId.toLowerCase() === 'default') {
		finalTaskId = generateDefaultTaskId();
	} else {
		finalTaskId = taskId;
	}

	// 验证 feature flag
	if (!isValidFeatureFlag(featureFlag)) {
		throw new Error(
			`无效的 feature flag: ${featureFlag}。支持的 flag: ${validFeatureFlags.join(', ')}`
		);
	}

	// 生成格式化的提交消息
	return `${finalTaskId} ${featureFlag}  ${message}`;
}

// 处理命令行参数
if (process.argv.length < 5) {
	console.error(
		'用法: node format-commit-message.js <taskId> <featureFlag> <message>'
	);
	process.exit(1);
}

const [, , taskId, featureFlag, ...messageParts] = process.argv;
const message = messageParts.join(' ');

try {
	const formattedMessage = formatCommitMessage(taskId, featureFlag, message);
	console.log(formattedMessage);
	process.exit(0);
} catch (error) {
	console.error('错误:', error.message);
	process.exit(1);
}
