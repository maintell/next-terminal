#!/usr/bin/env node

import {spawnSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

// 官方依据：
// https://ant.design/llms.txt
// https://ant.design/docs/react/cli-cn.md
// https://ant.design/docs/react/migration-v6-cn.md
const ANTD_CLI_VERSION = '6.6.1';
const DEFAULT_RULES = new Set(['deprecated', 'usage']);
const RULE_LABELS = {
    deprecated: '废弃 API',
    usage: '不推荐用法',
    a11y: '无障碍',
    performance: '性能',
};

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDirectory, '..');

const printHelp = () => {
    console.log(`扫描前端中的 Ant Design 废弃 API 和不推荐用法。

用法：
  npm run scan:antd
  npm run scan:antd -- --summary
  npm run --silent scan:antd -- --json
  npm run scan:antd -- --target src/pages/tdp
  npm run scan:antd:ci

选项：
  --target <目录>       扫描目录，默认为 src
  --all                 同时输出无障碍和性能问题
  --deprecated-only     只输出废弃 API
  --summary             只输出汇总，不逐条输出问题
  --json                输出适合程序处理的 JSON
  --fail-on-findings    发现问题时以退出码 1 结束，适合 CI
  -h, --help            显示帮助
`);
};

const parseArguments = (argv) => {
    const options = {
        target: 'src',
        all: false,
        deprecatedOnly: false,
        summary: false,
        json: false,
        failOnFindings: false,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        switch (argument) {
            case '--target': {
                const target = argv[index + 1];
                if (!target || target.startsWith('--')) {
                    throw new Error('--target 后必须提供扫描目录');
                }
                options.target = target;
                index += 1;
                break;
            }
            case '--all':
                options.all = true;
                break;
            case '--deprecated-only':
                options.deprecatedOnly = true;
                break;
            case '--summary':
                options.summary = true;
                break;
            case '--json':
                options.json = true;
                break;
            case '--fail-on-findings':
                options.failOnFindings = true;
                break;
            case '-h':
            case '--help':
                printHelp();
                process.exit(0);
                break;
            default:
                throw new Error(`未知参数：${argument}`);
        }
    }

    if (options.all && options.deprecatedOnly) {
        throw new Error('--all 和 --deprecated-only 不能同时使用');
    }

    return options;
};

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

const detectAntdVersion = () => {
    const installedPackage = join(webRoot, 'node_modules', 'antd', 'package.json');
    if (existsSync(installedPackage)) {
        return readJson(installedPackage).version;
    }

    const packageJson = readJson(join(webRoot, 'package.json'));
    const versionRange = packageJson.dependencies?.antd || packageJson.devDependencies?.antd;
    const matchedVersion = versionRange?.match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/);
    if (!matchedVersion) {
        throw new Error('无法从 package.json 或 node_modules 中识别 antd 版本');
    }
    return matchedVersion[0];
};

const normalizePath = (file) => {
    if (!file) {
        return file;
    }
    const relativePath = isAbsolute(file) ? relative(webRoot, file) : file;
    return relativePath.split(sep).join('/');
};

const extractJson = (stdout) => {
    const firstBrace = stdout.indexOf('{');
    if (firstBrace < 0) {
        throw new Error('Ant Design CLI 没有返回 JSON');
    }
    return JSON.parse(stdout.slice(firstBrace));
};

const runOfficialScanner = ({target, antdVersion, json}) => {
    const localExecutable = process.platform === 'win32'
        ? join(webRoot, 'node_modules', '.bin', 'antd.cmd')
        : join(webRoot, 'node_modules', '.bin', 'antd');
    const useLocalCli = existsSync(localExecutable);
    const command = useLocalCli
        ? localExecutable
        : process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const cliArguments = useLocalCli
        ? ['lint', target]
        : ['--yes', `@ant-design/cli@${ANTD_CLI_VERSION}`, 'lint', target];

    cliArguments.push('--version', antdVersion, '--lang', 'zh', '--format', 'json');

    if (!json) {
        const source = useLocalCli
            ? '项目本地 @ant-design/cli'
            : `@ant-design/cli@${ANTD_CLI_VERSION}`;
        console.error(`使用 ${source} 扫描 ${target}（antd ${antdVersion}）...`);
    }

    const result = spawnSync(command, cliArguments, {
        cwd: webRoot,
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024,
        env: {
            ...process.env,
            ANTD_NO_AUTO_REPORT: '1',
            NO_UPDATE_CHECK: '1',
        },
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        const details = result.stderr?.trim() || result.stdout?.trim() || `退出码 ${result.status}`;
        throw new Error(`Ant Design CLI 执行失败：\n${details}`);
    }

    return extractJson(result.stdout);
};

const selectRules = (options) => {
    if (options.all) {
        return null;
    }
    if (options.deprecatedOnly) {
        return new Set(['deprecated']);
    }
    return DEFAULT_RULES;
};

const buildSummary = (issues) => {
    const summary = {
        total: issues.length,
        deprecated: 0,
        usage: 0,
        a11y: 0,
        performance: 0,
    };

    for (const issue of issues) {
        if (!(issue.rule in summary)) {
            summary[issue.rule] = 0;
        }
        summary[issue.rule] += 1;
    }

    return summary;
};

const printSummary = (summary, scanResult) => {
    console.log('\nAnt Design 扫描结果');
    console.log(`- 合计：${summary.total}`);
    for (const rule of ['deprecated', 'usage', 'a11y', 'performance']) {
        if (summary[rule] > 0) {
            console.log(`- ${RULE_LABELS[rule] || rule}：${summary[rule]}`);
        }
    }
    if (scanResult.partial) {
        console.log('- 警告：官方 CLI 返回了部分扫描结果');
    }
    if (scanResult.skippedFiles?.length) {
        console.log(`- 跳过文件：${scanResult.skippedFiles.length}`);
    }
};

const main = () => {
    let options;
    try {
        options = parseArguments(process.argv.slice(2));
    } catch (error) {
        console.error(error.message);
        console.error('使用 --help 查看可用参数。');
        process.exit(2);
    }

    const targetPath = resolve(webRoot, options.target);
    const targetFromWebRoot = relative(webRoot, targetPath);
    if (
        targetFromWebRoot === '..' ||
        targetFromWebRoot.startsWith(`..${sep}`) ||
        isAbsolute(targetFromWebRoot)
    ) {
        console.error('扫描目录必须位于 web 目录内');
        process.exit(2);
    }
    if (!existsSync(targetPath)) {
        console.error(`扫描目录不存在：${normalizePath(targetPath)}`);
        process.exit(2);
    }

    try {
        const antdVersion = detectAntdVersion();
        const scanResult = runOfficialScanner({
            target: options.target,
            antdVersion,
            json: options.json,
        });
        const selectedRules = selectRules(options);
        const issues = (scanResult.issues || [])
            .filter((issue) => selectedRules === null || selectedRules.has(issue.rule))
            .map((issue) => ({
                ...issue,
                file: normalizePath(issue.file),
            }))
            .sort((left, right) =>
                left.file.localeCompare(right.file) || left.line - right.line,
            );
        const summary = buildSummary(issues);

        if (options.json) {
            console.log(JSON.stringify({
                scanner: `@ant-design/cli@${ANTD_CLI_VERSION}`,
                antdVersion,
                target: normalizePath(targetPath),
                partial: Boolean(scanResult.partial),
                skippedFiles: (scanResult.skippedFiles || []).map(normalizePath),
                summary,
                issues,
            }, null, 2));
        } else {
            printSummary(summary, scanResult);
            if (!options.summary && issues.length > 0) {
                console.log('');
                for (const issue of issues) {
                    const label = RULE_LABELS[issue.rule] || issue.rule;
                    console.log(`${issue.file}:${issue.line} [${label}] ${issue.message}`);
                }
            }
        }

        if (scanResult.partial || scanResult.skippedFiles?.length) {
            process.exitCode = 2;
        } else if (options.failOnFindings && issues.length > 0) {
            process.exitCode = 1;
        }
    } catch (error) {
        console.error(`扫描失败：${error.message}`);
        console.error(
            `首次运行需要从 npm 下载 @ant-design/cli@${ANTD_CLI_VERSION}，请检查网络或将该版本安装为开发依赖。`,
        );
        process.exit(2);
    }
};

main();
