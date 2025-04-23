// yunzai-doro-plugin/lib/config.js
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import lodash from 'lodash';
import { fileURLToPath } from 'node:url'; // 用于从 import.meta.url 获取路径

// --- 配置常量 ---
const DEFAULT_CONFIG_FILE = 'defSet.yaml';
const USER_CONFIG_FILE = 'config.yaml';
const CONFIG_DIR = 'config';

// --- 动态获取插件根目录 ---
// import.meta.url 是当前文件的 URL (file:///...)
// fileURLToPath 将 file:// URL 转换为平台特定的路径 (C:\... 或 /...)
// path.dirname 获取目录名
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // 当前文件所在目录: yunzai-doro-plugin/lib
const pluginRoot = path.resolve(__dirname, '..'); // 插件根目录: yunzai-doro-plugin/
const configPath = path.join(pluginRoot, CONFIG_DIR); // 配置目录: yunzai-doro-plugin/config/

// --- 内部变量 ---
let mergedConfig = {}; // 存储合并后的配置
let watcher = null; // 文件监视器
let debounceTimer = null; // 防抖定时器

// --- 核心函数：加载和合并配置 ---
function loadAndMergeConfigs() {
    const defaultConfPath = path.join(configPath, DEFAULT_CONFIG_FILE);
    const userConfPath = path.join(configPath, USER_CONFIG_FILE);

    let defaultConfig = {};
    let userConfig = {};

    // 1. 加载默认配置
    try {
        if (fs.existsSync(defaultConfPath)) {
            const fileContents = fs.readFileSync(defaultConfPath, 'utf8');
            defaultConfig = yaml.load(fileContents) || {};
            // console.log('[Doro Config] 默认配置已加载:', defaultConfig); // 调试日志
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
             // console.log('[Doro Config] 用户配置已加载:', userConfig); // 调试日志
        }
        // 用户配置文件不存在是正常的，无需警告
    } catch (error) {
        console.error(`[Doro Config] 错误: 加载或解析用户配置 ${userConfPath} 失败:`, error);
    }

    // 3. 合并配置 (用户配置覆盖默认配置)
    // 使用 lodash.merge 进行深合并
    // lodash.merge 会修改第一个参数，所以传入一个空对象作为目标
    mergedConfig = lodash.merge({}, defaultConfig, userConfig);
    console.log('[Doro Config] 配置已加载并合并');

    // 返回合并后的配置，虽然主要目的是更新内部的 mergedConfig
    return mergedConfig;
}

// --- 核心函数：设置文件监视 ---
function watchUserConfig() {
    const userConfPath = path.join(configPath, USER_CONFIG_FILE);

    // 如果之前有监视器，先关闭
    if (watcher) {
        watcher.close();
        watcher = null;
        console.log('[Doro Config] 旧的配置文件监视器已关闭');
    }

    // 检查用户配置文件是否存在，不存在则无法监视
    if (!fs.existsSync(userConfPath)) {
        console.log(`[Doro Config] 用户配置文件 ${userConfPath} 不存在，无法启动监视。`);
        return;
    }

    try {
        watcher = fs.watch(userConfPath, (eventType, filename) => {
            // filename 可能不准确或不存在，主要依赖 eventType
            if (eventType === 'change') {
                console.log(`[Doro Config] 检测到用户配置 ${filename || USER_CONFIG_FILE} 发生变化`);
                // 防抖处理：短时间内多次触发只执行一次加载
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    console.log('[Doro Config] 重新加载配置...');
                    loadAndMergeConfigs(); // 重新加载并更新内部的 mergedConfig
                }, 500); // 500毫秒延迟
            } else if (eventType === 'rename') {
                 // 文件被重命名或删除
                 console.log(`[Doro Config] 用户配置文件 ${filename || USER_CONFIG_FILE} 可能已被重命名或删除，停止监视并尝试重新设置。`);
                 watchUserConfig(); // 尝试重新启动监视（如果文件被重新创建）
            }
        });
        console.log(`[Doro Config] 已启动对 ${userConfPath} 的监视`);

        watcher.on('error', (error) => {
            console.error(`[Doro Config] 配置文件监视器出错:`, error);
            // 发生错误后尝试重新启动监视
            watchUserConfig();
        });

    } catch (error) {
        console.error(`[Doro Config] 启动配置文件监视失败:`, error);
    }
}

// --- 初始化 ---
// 模块加载时立即执行一次配置加载
loadAndMergeConfigs();
// 启动文件监视
watchUserConfig();

// --- 导出 ---
/**
 * 获取当前合并后的配置对象。
 * 注意：返回的是对象的引用，但不保证在文件修改后能立即获取到最新值，
 * 因为文件监视和重新加载是异步的。但通常够用。
 * @returns {object} 合并后的配置对象
 */
export function getConfig() {
    // 直接返回内部维护的最新配置对象
    return mergedConfig;
}

/**
 * 手动重新加载配置（通常不需要，监视器会自动处理）
 */
export function reloadConfig() {
    console.log('[Doro Config] 手动触发重新加载配置...');
    loadAndMergeConfigs();
}

// 你也可以直接导出配置对象本身，但不推荐，因为重新赋值无法通知到外部引用者
// export const config = mergedConfig; // 不推荐用于需要热更新的场景
