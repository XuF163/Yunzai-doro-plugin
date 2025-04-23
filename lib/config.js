// yunzai-doro-plugin/lib/config.js
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';      // Make sure you have run: pnpm add js-yaml -w
import lodash from 'lodash';    // Make sure you have run: pnpm add lodash -w
import { fileURLToPath } from 'node:url';

// --- 配置常量 ---
const DEFAULT_CONFIG_FILE = 'defSet.yaml';
const USER_CONFIG_FILE = 'config.yaml';
const CONFIG_DIR = 'config';

// --- 动态获取插件根目录 (只计算一次) ---
let calculatedPluginRoot = null;
try {
    const __filename = fileURLToPath(import.meta.url); // /path/to/.../Yunzai-doro-plugin/lib/config.js
    const __dirname = path.dirname(__filename);        // /path/to/.../Yunzai-doro-plugin/lib
    // 使用 path.resolve 确保获取正确的绝对路径，'..' 表示上一级目录
    calculatedPluginRoot = path.resolve(__dirname, '..'); // /path/to/.../Yunzai-doro-plugin
    console.log('[Doro Config] Initializing Plugin Root:', calculatedPluginRoot); // 打印日志，确认路径只计算一次且正确
} catch (e) {
    console.error('[Doro Config] Critical error calculating plugin root path:', e);
    // 如果这里出错，插件基本无法运行，可以考虑抛出错误或设置一个无效值
    calculatedPluginRoot = null;
}

// --- 导出插件根目录常量 ---
// 其他模块应该导入并使用这个常量来构建路径
export const PLUGIN_ROOT = calculatedPluginRoot;

// --- 路径常量 (依赖 PLUGIN_ROOT) ---
const configPath = PLUGIN_ROOT ? path.join(PLUGIN_ROOT, CONFIG_DIR) : null; // 配置目录

// --- 内部变量 ---
let mergedConfig = {}; // 存储合并后的配置
let watcher = null; // 文件监视器
let debounceTimer = null; // 防抖定时器

// --- 核心函数：加载和合并配置 ---
function loadAndMergeConfigs() {
    // 如果路径计算失败，则无法加载
    if (!configPath) {
        console.error('[Doro Config] Cannot load configs because configPath is invalid.');
        mergedConfig = {}; // 重置配置为空
        return mergedConfig;
    }

    const defaultConfPath = path.join(configPath, DEFAULT_CONFIG_FILE);
    const userConfPath = path.join(configPath, USER_CONFIG_FILE);

    let defaultConfig = {};
    let userConfig = {};

    // 1. 加载默认配置
    try {
        if (fs.existsSync(defaultConfPath)) {
            const fileContents = fs.readFileSync(defaultConfPath, 'utf8');
            defaultConfig = yaml.load(fileContents) || {};
        } else {
            console.warn(`[Doro Config] 警告: 默认配置文件未找到: ${defaultConfPath}`);
        }
    } catch (error) {
        console.error(`[Doro Config] 错误: 加载或解析默认配置 ${defaultConfPath} 失败:`, error);
    }

    // 2. 加载用户配置
    try {
        if (fs.existsSync(userConfPath)) {
            const fileContents = fs.readFileSync(userConfPath, 'utf8');
            userConfig = yaml.load(fileContents) || {};
        }
    } catch (error) {
        console.error(`[Doro Config] 错误: 加载或解析用户配置 ${userConfPath} 失败:`, error);
    }

    // 3. 合并配置
    mergedConfig = lodash.merge({}, defaultConfig, userConfig);
    console.log('[Doro Config] 配置已加载并合并');

    return mergedConfig;
}

// --- 核心函数：设置文件监视 ---
function watchUserConfig() {
     // 如果路径计算失败，则无法监视
    if (!configPath || !PLUGIN_ROOT) {
        console.error('[Doro Config] Cannot watch config file because paths are invalid.');
        return;
    }
    const userConfPath = path.join(configPath, USER_CONFIG_FILE);

    if (watcher) {
        watcher.close();
        watcher = null;
    }

    // 只有当用户配置文件实际存在时才启动监视
    if (!fs.existsSync(userConfPath)) {
        console.log(`[Doro Config] 用户配置文件 ${userConfPath} 不存在，未启动监视。`);
        return;
    }

    try {
        watcher = fs.watch(userConfPath, (eventType, filename) => {
            if (eventType === 'change') {
                console.log(`[Doro Config] 检测到用户配置 ${filename || USER_CONFIG_FILE} 发生变化`);
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    console.log('[Doro Config] 重新加载配置...');
                    loadAndMergeConfigs();
                }, 500);
            } else if (eventType === 'rename') {
                 console.log(`[Doro Config] 用户配置文件 ${filename || USER_CONFIG_FILE} 可能已被重命名或删除，停止监视并尝试重新设置。`);
                 // 重新调用 watchUserConfig 会检查文件是否存在，如果确实删除了就不会再监视
                 watchUserConfig();
            }
        });
        console.log(`[Doro Config] 已启动对 ${userConfPath} 的监视`);

        watcher.on('error', (error) => {
            console.error(`[Doro Config] 配置文件监视器出错:`, error);
            // 发生错误后尝试重新启动监视，但可能需要更健壮的错误处理
            setTimeout(watchUserConfig, 5000); // 延迟一点再试
        });

    } catch (error) {
        console.error(`[Doro Config] 启动配置文件监视失败:`, error);
    }
}

// --- 初始化 ---
// 模块首次加载时执行
if (PLUGIN_ROOT) { // 确保根路径有效
    loadAndMergeConfigs();
    watchUserConfig();
} else {
    console.error("[Doro Config] Plugin root path calculation failed. Configuration system disabled.");
}


// --- 导出 ---
/**
 * 获取当前合并后的配置对象。
 * @returns {object} 合并后的配置对象
 */
export function getConfig() {
    return mergedConfig;
}

/**
 * 手动重新加载配置（通常不需要）
 */
export function reloadConfig() {
    console.log('[Doro Config] 手动触发重新加载配置...');
    loadAndMergeConfigs();
}
