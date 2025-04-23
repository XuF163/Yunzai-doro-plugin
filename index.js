// yunzai-doro-plugin/index.js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginName = path.basename(__dirname);

logger.info(`[${pluginName} Index] __dirname is: ${__dirname}`);

// 定义 appsPath (带 's')
const appsPath = path.join(__dirname, 'apps');

logger.info(`[${pluginName} Index] Calculated appsPath is: ${appsPath}`); // 打印确认

// ... (ASCII Art 和插件信息) ...

// 使用 appsPath (带 's') 读取目录
const files = fs.readdirSync(appsPath).filter(file => file.endsWith('.js'));

// --- 删除 ZZZ-Plugin 的导入逻辑 ---
// const ret = [];
// files.forEach(file => {
//   ret.push(import(`./apps/${file}`)); // 这种相对路径导入可能也有问题，建议用绝对路径
// });
// const retPromise = await Promise.allSettled(ret);
// --- 删除结束 ---

let apps = {};
// 保持你原来的 for...of 循环，更清晰
for (const file of files) {
    try {
        // 使用 appsPath (带 's') 拼接文件路径
        const filePath = path.join(appsPath, file);
        logger.info(`[Doro冒险] 正在尝试导入: file://${filePath}`);
        const imported = await import(`file://${filePath}`);

        // 检查 default 导出
        if (imported.default && imported.default.prototype instanceof plugin) {
            // 键名建议与类名一致或文件名（无后缀）一致
            // 如果 doro-game.js 导出的是 DoroAdventure 类
            apps['DoroAdventure'] = imported.default; // 使用 default
            logger.info(`[${pluginName}] 已载入 (default export): ${file}`);
        } else {
            logger.error(`[${pluginName}] 文件 ${file} 未导出有效的默认插件类`);
        }
    } catch (err) {
        logger.error(`[${pluginName}] 载入失败: ${file}`);
        logger.error(err);
    }
}

export { apps };
