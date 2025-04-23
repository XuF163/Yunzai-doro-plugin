// yunzai-doro-plugin/models/GameManager.js
import fs from 'node:fs';
import path from 'node:path';
import lodash from 'lodash'; // Using lodash for _.sample (optional)
import { PLUGIN_ROOT, getConfig as cfg } from '../lib/config.js';
import ImageHandler from './ImageHandler.js';


const resourcesPath = path.join(PLUGIN_ROOT, 'resources');
logger.info(`[Doro Module] Using resourcesPath: ${resourcesPath}`);

// --- 使用 cfg() 获取配置 ---
// 调用 cfg() 函数来获取配置对象
const pluginConfig = cfg() || {}; // 获取整个插件配置，提供默认空对象
const doroConfig = pluginConfig.doroAdventure || {}; // 获取 doroAdventure 子对象，提供默认空对象

// 从 doroConfig 中获取具体配置项
const imageSubDir = doroConfig.imageSubDir || 'images/';
const storyDataFile = doroConfig.storyDataFile || 'story_data.json';

// --- 后续路径计算 ---
const imageDir = path.resolve(resourcesPath, imageSubDir);
const storyDataPath = path.resolve(resourcesPath, storyDataFile);

logger.info(`[Doro Module] Image directory: ${imageDir}`);
logger.info(`[Doro Module] Story data path: ${storyDataPath}`);
let STORY_DATA = {};
try {
    const rawData = fs.readFileSync(storyDataPath, 'utf-8');
    STORY_DATA = JSON.parse(rawData);
    logger.info(`[Doro冒险] 成功加载故事数据: ${storyDataPath}`);
} catch (error) {
    logger.error(`[Doro冒险] 加载故事数据失败: ${storyDataPath}`, error);
    // Consider stopping the plugin or handling this error gracefully
}

class GameManager {
    constructor() {
        // Use a Map for potentially better performance with many users, or just an object
        this.userGameState = new Map(); // Stores { userId: currentNodeId }
    }

    /**
     * Starts or restarts the game for a user.
     * @param {string|number} userId The user's ID.
     * @returns {{text: string, segments: Array<object>, error?: string}} Game response object
     */
    startGame(userId) {
        const startNodeId = "start";
        const startNodeData = this.getNodeData(startNodeId);

        if (!startNodeData) {
            logger.error(`[Doro冒险] 无法找到起始节点 'start'`);
            return { error: "游戏初始化失败，缺少起始节点，请联系管理员。" };
        }

        this.updateUserState(userId, startNodeId);
        return this.formatNodeResponse(startNodeData);
    }

    /**
     * Processes a user's choice.
     * @param {string|number} userId The user's ID.
     * @param {string} choice The user's input choice (e.g., "A", "B").
     * @returns {{text: string, segments: Array<object>, isEnd?: boolean, error?: string}} Game response object
     */
    processChoice(userId, choice) {
        const currentUserNodeId = this.getUserState(userId);

        if (!currentUserNodeId) {
            return { error: "你还没有开始游戏，请发送 /doro 开始。" };
        }

        if (!choice || typeof choice !== 'string') {
            return { error: "请输入有效的选项（如 A, B, C...）。" };
        }

        const cleanChoice = choice.trim().toUpperCase();
        const nextNodeId = this.getNextNodeId(currentUserNodeId, cleanChoice);

        if (!nextNodeId) {
            const currentNodeData = this.getNodeData(currentUserNodeId);
            const currentResponse = this.formatNodeResponse(currentNodeData);
            currentResponse.text += "\n\n无效的选择，请根据上面的选项重新输入。";
            // Keep the user at the current node
            return currentResponse;
        }

        const nextNodeData = this.getNodeData(nextNodeId);
        if (!nextNodeData) {
            logger.error(`[Doro冒险] 故事节点错误: 从 ${currentUserNodeId} 选择 ${cleanChoice} 指向了无效节点 ${nextNodeId}`);
            return { error: "故事节点错误，请联系管理员。" };
        }

        this.updateUserState(userId, nextNodeId);
        const response = this.formatNodeResponse(nextNodeData);
        response.isEnd = this.isEndNode(nextNodeData);

        if (response.isEnd) {
            response.text += "\n\n🎉 故事结束 🎉";
            this.clearUserState(userId);


        }

        return response;
    }

    /**
     * Retrieves data for a specific story node.
     * @param {string} nodeId The ID of the node.
     * @returns {object | null} Node data or null if not found.
     */
    getNodeData(nodeId) {
        return STORY_DATA[nodeId] || null;
    }

    /**
     * Determines the next node ID based on the current node and choice.
     * Handles fixed and random choices.
     * @param {string} currentNodeId The ID of the current node.
     * @param {string} choice The user's choice (uppercase).
     * @returns {string | null} The next node ID or null if choice is invalid.
     */
    getNextNodeId(currentNodeId, choice) {
        const data = this.getNodeData(currentNodeId);
        if (!data || !data.options) {
            return null;
        }

        const option = data.options[choice];
        if (!option) {
            return null; // Invalid choice key
        }

        const nextNodeTarget = option.next;

        if (typeof nextNodeTarget === 'string') {
            // Simple transition
            return nextNodeTarget;
        } else if (Array.isArray(nextNodeTarget)) {
            // Random transition based on probability
            const rand = Math.random();
            let cumulative = 0.0;
            for (const item of nextNodeTarget) {
                cumulative += item.probability;
                if (rand <= cumulative) {
                    return item.node;
                }
            }
            // Fallback if probabilities don't sum to 1 or other issues
            logger.warn(`[Doro冒险] 随机节点概率计算错误或未命中: Node ${currentNodeId}, Choice ${choice}. Falling back to first option.`);
            return nextNodeTarget.length > 0 ? nextNodeTarget[0].node : null;
        } else {
            // Invalid 'next' format
            logger.error(`[Doro冒险] 节点 ${currentNodeId} 的选项 ${choice} 具有无效的 'next' 格式: ${JSON.stringify(nextNodeTarget)}`);
            return null;
        }
    }

    /**
     * Formats the node data into a response object for sending.
     * Includes text, image segments, and button data.
     * @param {object} nodeData The data for the current node.
     * @returns {{text: string, segments: Array<object>, buttons?: Array<Array<object>>, isEnd?: boolean}} Response object
     */
    formatNodeResponse(nodeData) {
        if (!nodeData) return { text: "发生未知错误。", segments: [] };

        let msgText = nodeData.text || "你来到了一个未知的地方...";
        const imageSegments = ImageHandler.getImageSegments(nodeData.image);
        const buttons = []; // 用于存储按钮布局数据
        const isEnd = this.isEndNode(nodeData); // 先判断是否结束

        // 只有在非结束节点且有选项时才生成按钮
        if (!isEnd && nodeData.options && Object.keys(nodeData.options).length > 0) {
            msgText += "\n--------------------\n请点击下方按钮进行选择："; // 修改提示文本

            const optionKeys = Object.keys(nodeData.options);
            const buttonRow = []; // 当前行的按钮

            for (const key of optionKeys) {
                const opt = nodeData.options[key];
                buttonRow.push({
                    text: `${key}. ${opt.text}`, // 按钮上显示的文本
                    // 重要：按钮点击后发送的文本，必须匹配 apps/doro_game.js 中的正则
                    callback: `/选择 ${key}`
                    // 如果需要 QQ 原生键盘，可能用 data 或 callback_data，但 input 通常用于触发命令
                });

                // 每行最多放 2 个按钮（可调整）
                if (buttonRow.length >= 2) {
                    buttons.push([...buttonRow]); // 将当前行加入总布局 (使用副本)
                    buttonRow.length = 0; // 清空当前行
                }
            }
            // 如果最后一行的按钮不满 2 个，也加入布局
            if (buttonRow.length > 0) {
                buttons.push([...buttonRow]);
            }

        } else if (!isEnd) {
            // 非结束节点但没有选项的情况
            msgText += "\n--------------------\n似乎没有明确的选项可供选择。";
        }
        // 对于结束节点，isEnd 标记会在 processChoice 中处理，这里无需特殊文本

        // 返回包含按钮数据的响应对象
        return { text: msgText, segments: imageSegments, buttons: buttons.length > 0 ? buttons : undefined };
    }

    /**
     * Checks if a node is marked as an end node.
     * @param {object} nodeData The data object for the node.
     * @returns {boolean} True if it's an end node, false otherwise.
     */
    isEndNode(nodeData) {
        return nodeData?.is_end === true;
    }

    /**
     * Updates the user's current position in the game.
     * @param {string|number} userId User ID.
     * @param {string} nodeId Current node ID.
     */
    updateUserState(userId, nodeId) {
        this.userGameState.set(String(userId), nodeId);
    }

    /**
     * Retrieves the user's current node ID.
     * @param {string|number} userId User ID.
     * @returns {string | undefined} Current node ID or undefined if not playing.
     */
    getUserState(userId) {
        return this.userGameState.get(String(userId));
    }

    /**
     * Removes a user's state (e.g., when the game ends).
     * @param {string|number} userId User ID.
     */
    clearUserState(userId) {
        this.userGameState.delete(String(userId));
    }

    /**
     * Formats the node data into a response object for sending.
     * @param {object} nodeData The data for the current node.
     * @returns {{text: string, segments: Array<object>}} Response object
     */
    // formatNodeResponse(nodeData) {
    //     if (!nodeData) return { text: "发生未知错误。", segments: [] };
    //
    //     let msgText = nodeData.text || "你来到了一个未知的地方...";
    //
    //     if (nodeData.options && Object.keys(nodeData.options).length > 0) {
    //         msgText += "\n--------------------\n你可以选择：";
    //         for (const key in nodeData.options) {
    //             const opt = nodeData.options[key];
    //             msgText += `\n${key}. ${opt.text}`;
    //         }
    //         msgText += "\n--------------------\n请发送 /选择 [选项字母] （例如 /选择 A）";
    //     }
    //
    //     const imageSegments = ImageHandler.getImageSegments(nodeData.image);
    //
    //     return { text: msgText, segments: imageSegments };
    // }
}

// Export a single instance (Singleton pattern)
export default new GameManager();
