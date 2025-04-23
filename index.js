import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs'; // 确保导入 fs

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginName = path.basename(__dirname);

logger.info(`[${pluginName} Index] __dirname is: ${__dirname}`);

const appsPath = path.join(__dirname, 'apps');

logger.info(`[${pluginName} Index] Calculated appsPath is: ${appsPath}`); // 打印确认

logger.info(`---------`);
logger.info(`【${pluginName}】载入成功`);
logger.info(`   _____                       `);
logger.info(`  |  __ \\                      `);
logger.info(`  | |  | |_ __ __ _  __ _ ___ `);
logger.info(`  | |  | | '__/ _\` |/ _\` / __|`);
logger.info(`  | |__| | | | (_| | (_| \\__ \\`);
logger.info(`  |_____/|_|  \\__,_|\\__, |___/`);
logger.info(`                     __/ |    `);
logger.info(`                    |___/     `);
logger.info(`[作者] ATTomaatoo (移植: YourName)`);
logger.info(`[版本] 1.0.0 (Yunzai)`);
logger.info(`[用法] /doro 开始, /选择 A 进行选择`);
logger.info(`---------`);


// Dynamically load all apps from the apps directory
const appsPath = path.join(__dirname, 'apps');
const files = fs.readdirSync(appsPath).filter(file => file.endsWith('.js'));

let apps = {};
for (const file of files) {
    try {
        const filePath = path.join(appsPath, file);
        logger.info(`[Doro冒险] 正在尝试导入: file://${filePath}`); // <--- 添加日志
        // Use dynamic import for ES modules
        const imported = await import(`file://${filePath}`);
        // Assuming each app file exports a class named after the file (without .js)
        // Or adjust based on how you export from doro_game.js (e.g., using default export)
        // If doro_game.js uses `export class DoroAdventure...`, this works:
        // const appName = path.basename(file, '.js');
        // apps[appName] = imported[appName]; // This assumes class name matches file name

        // If doro_game.js uses `export class DoroAdventure...`:
        apps['DoroAdventure'] = imported.DoroAdventure;

        logger.info(`[${pluginName}] 已载入: ${file}`);
    } catch (err) {
        logger.error(`[${pluginName}] 载入失败: ${file}`);
        logger.error(err);
    }
}

export { apps }; // Export the loaded apps for Yunzai
