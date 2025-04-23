// // yunzai-doro-plugin/apps/doro_game.js
// import GameManager from '../models/GameManager.js'; // Import the game logic
//
// export class DoroAdventure extends plugin {
//     constructor() {
//         super({
//             name: 'Doro大冒险',
//             dsc: '一个基于文字冒险的游戏插件',
//             event: 'message', // Listens for messages
//             priority: 500, // Adjust priority as needed
//             rule: [
//                 {
//                     reg: '^(#|\/)?(doro|多罗)$', // Matches /doro, #doro, doro, 多罗
//                     fnc: 'startGame'
//                 },
//                 {
//                     // Matches /choose A, #选择 B, 选择C etc. (allows optional space after command)
//                     reg: '^(#|\/)?(choose|选择)\\s*([A-Z])$', // Only match single uppercase letters for choice
//                     fnc: 'makeChoice'
//                 }
//             ]
//         });
//     }
//
//     /**
//      * Handles the command to start the game.
//      * @param {object} e Event object from Yunzai
//      */
//     async startGame(e) {
//         const userId = e.user_id;
//         logger.info(`[Doro冒险] 用户 ${userId} 开始游戏`);
//
//         const response = GameManager.startGame(userId);
//
//         if (response.error) {
//             await e.reply(response.error, true); // true for @user
//             return true; // Indicate handled
//         }
//
//         // Send response: Text first, then images
//         const messageToSend = [response.text];
//         if (response.segments && response.segments.length > 0) {
//             messageToSend.push(...response.segments);
//         }
//
//         await e.reply(messageToSend, true);
//         return true; // Indicate the command was handled
//     }
//
//     /**
//      * Handles the command to make a choice.
//      * @param {object} e Event object from Yunzai
//      */
//     async makeChoice(e) {
//         const userId = e.user_id;
//         // Extract the choice (the third captured group, uppercase)
//         const choice = e.msg.match(this.rule[1].reg)[3]; // [3] corresponds to ([A-Z])
//
//         if (!choice) {
//              // Should not happen due to regex, but good practice
//             await e.reply("无效的指令格式，请使用 /选择 [选项字母]", true);
//             return true;
//         }
//
//         logger.info(`[Doro冒险] 用户 ${userId} 选择: ${choice}`);
//
//         const response = GameManager.processChoice(userId, choice);
//
//         if (response.error) {
//             await e.reply(response.error, true);
//             return true;
//         }
//
//         // Send response: Text first, then images
//         const messageToSend = [response.text];
//         if (response.segments && response.segments.length > 0) {
//             messageToSend.push(...response.segments);
//         }
//
//         await e.reply(messageToSend, true);
//
//         // If it's an end node, GameManager already cleared the state.
//         // No need to explicitly "finish" the interaction like in NoneBot's handler.
//         // Yunzai handlers typically run to completion unless told otherwise.
//
//         return true; // Indicate the command was handled
//     }
// }

import GameManager from '../models/GameManager.js';

export class DoroAdventure extends plugin {
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
            ]
        });

        logger.info('[Doro冒险 App] 插件已加载');
    }

    /**
     * Handles the command to start the game.
     * @param {object} e Event object from Yunzai
     */
    async startGame(e) {
        const userId = e.user_id;
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
             // Yunzai 的 e.reply 通常能直接处理这种嵌套数组结构来生成按钮
             // 如果不行，可能需要查阅你使用的 Yunzai 版本或适配器 (oicq/icqq) 的文档
             // 看是否需要用 segment.keyboard(response.buttons) 或类似方式包装
            messageToSend.push(response.buttons);
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
            messageToSend.push(response.buttons);
             logger.debug(`[Doro冒险 App] 发送按钮: ${JSON.stringify(response.buttons)}`); // 调试日志
        } else if (response.isEnd) {
             // 游戏结束时，GameManager.formatNodeResponse 已添加结束文本，这里不再发送按钮
             logger.info(`[Doro冒险 App] 用户 ${userId} 到达结局，不发送按钮`);
        }


        await e.reply(messageToSend, true); // true for @user

        return true;
    }
}
