

import GameManager from '../models/GameManager.js';
import { getConfig as cfg } from '../lib/config.js';
export default class DoroAdventure extends plugin {
    constructor() {
        super({
            name: 'Doro大冒险',
            dsc: '一个基于文字冒险的游戏插件（带按钮）', // 更新描述
            event: 'message',
            priority: 500,
            rule: [
                {
                    reg: '^(#|\/)?(doro|多罗)$',
                    fnc: 'startGame'
                },
                {
                    // 正则保持不变，因为它捕获的是按钮点击后发送的 /选择 X 消息
                    reg: '^(#|\/)?(choose|选择)\\s*([A-Z])$',
                    fnc: 'makeChoice'
                }
            ],
            task: {
        cron: "0 0 0 * * *",
        name: "重置每日doro结局次数",
        fnc: () => redis.set("Yz:doroplugin:list", JSON.stringify({}))
      }
        });

       //logger.info('[Doro冒险 App] 插件已加载');
    }

    /**
     * Handles the command to start the game.
     * @param {object} e Event object from Yunzai
     */
    async startGame(e) {
        const userId = e.user_id;
        // --- 在函数内部读取配置 ---
        const doroConfig = cfg()?.doroAdventure || {}; // 获取配置子对象
        // 从配置中读取 dailyLimit，提供默认值以防配置缺失
        const dailyPlayLimit = doroConfig.dailyLimit ?? 2;

         const redisKey = "Yz:doroplugin:list"; // 统一 Key


        let list = {}; // 默认空对象
        try {
            const redisData = await redis.get(redisKey);
            if (redisData) {
                list = JSON.parse(redisData);
            }
        } catch (error) {
            logger.error(`[Doro冒险 startGame] 读取或解析次数列表失败: ${redisKey}`, error);
        }

        const currentCount = list?.[userId] || 0; // 获取当前计数

        if (currentCount >= dailyPlayLimit) {
            logger.info(`[Doro冒险 App] 用户 ${userId} 今日次数已达上限 (${currentCount}/${dailyPlayLimit})`);
            // 返回次数超限的提示和按钮
            return e.reply([
                `你今天已经冒险 ${currentCount} 次，达到上限啦，明天再来吧~`,
                segment.button([
                    // 确保按钮的 callback/input 有效
                    { text: "doro_today", callback: `#抽取doro结局` },
                ])
            ]);
        }


        logger.info(`[Doro冒险 App] 用户 ${userId} 开始游戏`);

        const response = GameManager.startGame(userId);

        if (response.error) {
            await e.reply(response.error, true);
            return true;
        }

        // 构建要发送的消息数组
        const messageToSend = [response.text];
        if (response.segments && response.segments.length > 0) {
            messageToSend.push(...response.segments);
        }
        // 添加按钮数据（如果存在）
        if (response.buttons && response.buttons.length > 0) {

            messageToSend.push(segment.button(...response.buttons));
            logger.debug(`[Doro冒险 App] 发送按钮: ${JSON.stringify(response.buttons)}`); // 调试日志
        }

        await e.reply(messageToSend, true); // true for @user
        return true;
    }

    /**
     * Handles the command to make a choice (triggered by button click or manual input).
     * @param {object} e Event object from Yunzai
     */
    async makeChoice(e) {
        const userId = e.user_id;
        const choice = e.msg.match(this.rule[1].reg)[3]; // 提取选项字母

        if (!choice) {
            await e.reply("无效的指令格式，请使用 /选择 [选项字母] 或点击按钮", true);
            return true;
        }

        logger.info(`[Doro冒险 App] 用户 ${userId} 选择: ${choice}`);

        const response = GameManager.processChoice(userId, choice);

        if (response.error) {
            await e.reply(response.error, true);
            return true;
        }

        // 构建要发送的消息数组
        const messageToSend = [response.text];
        if (response.segments && response.segments.length > 0) {
            messageToSend.push(...response.segments);

        }
        // 添加按钮数据（如果存在且不是结束节点）
        if (!response.isEnd && response.buttons && response.buttons.length > 0) {
             // 同上，直接传递按钮数据给 e.reply
            messageToSend.push(segment.button(...response.buttons));
             logger.debug(`[Doro冒险 App] 发送按钮: ${JSON.stringify(response.buttons)}`); // 调试日志
        } else if (response.isEnd) {
             // 游戏结束时，GameManager.formatNodeResponse 已添加结束文本，这里不再发送按钮
                 try {
                let list = {};
                const redisData = await redis.get(redisKey);
                if (redisData) list = JSON.parse(redisData);

                const currentCount = list?.[userId] || 0;
                list[userId] = currentCount + 1;

                await redis.set(redisKey, JSON.stringify(list)); // 保存回 Redis, 无需 EX
                logger.info(`[Doro冒险 App] 用户 ${userId} 完成次数增加为: ${list[userId]}`);
            } catch (error) {
                logger.error(`[Doro冒险 makeChoice] 更新 Redis 计数失败 `, error);
            }


             logger.info(`[Doro冒险 App] 用户 ${userId} 到达结局，不发送按钮`);
        }


        await e.reply(messageToSend, true); // true for @user

        return true;
    }
}
