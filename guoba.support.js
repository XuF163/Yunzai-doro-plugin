// /plugins/yunzai-doro-plugin/guoba.js

import path from 'path';
import lodash from 'lodash';
import fs from 'fs';
import yaml from 'js-yaml';

// --- 从你的配置库导入 ---
// 假设 guoba.js 在插件根目录，lib/config.js 在下一级目录。
import { getConfig, reloadConfig, PLUGIN_ROOT } from './lib/config.js';

// --- 配置文件路径 (用户配置) ---
// 我们需要这个特定的路径用于写入，因为你的 lib/config.js 没有暴露写入函数。
const USER_CONFIG_FILE = 'config.yaml';
const CONFIG_DIR = 'config';
// 使用从 lib/config.js 导出的 PLUGIN_ROOT 来构建路径
const userConfigPath = path.join(PLUGIN_ROOT, CONFIG_DIR, USER_CONFIG_FILE);
const userConfigDir = path.dirname(userConfigPath);

// --- Guoba 适配器 ---

export function supportGuoba() {
  return {
    // 插件信息 (根据需要调整，可复用之前的建议)
    pluginInfo: {
      name: 'Doro-plugin', // 插件英文名，保持唯一
      title: 'Doro大冒险插件',    // 插件中文名
      description: 'Yunzai V3 版 Doro 大冒险文字游戏插件，提供后台配置。', // 插件描述
      author: ['429(Refactorer)&ATTomatoo (Original)  '], // 作者列表
      link: 'https://github.com/XuF163/Yunzai-doro-plugin', // 插件仓库或主页链接，建议填写
      isV3: true,  // 确认是 Yunzai V3 插件
      isV2: false, // 不是 V2 插件
      showInMenu: 'auto', // 根据配置项数量自动决定是否显示在菜单
      icon: 'ph:orange-fill', // 选一个合适的图标 (https://icon-sets.iconify.design/)
      iconColor: '#8B4513',   // 图标颜色
      // 可选：如果你的插件有图标图片，可以使用 PLUGIN_ROOT 保证路径一致性
      // iconPath: path.join(PLUGIN_ROOT, 'resources/icon.png'),
    },

    // 配置项信息
    configInfo: {
      // Schemas (定义 UI 结构 - 应与你的合并配置中的键匹配)
      schemas: [
        {
          label: 'Doro大冒险配置', // 分组标签
          component: 'Divider', // 分组开始
        },
        {
          // 对应 getConfig() 返回对象中的键路径
          field: 'doroAdventure.imageSubDir',
          label: '图片子目录', // 显示名称
          bottomHelpMessage: '存放冒险相关图片的子目录名 (相对于插件的 resources 目录)', // 底部帮助信息
          component: 'Input', // 使用输入框组件
          required: true, // 设为必填项
          componentProps: { // 组件属性
            placeholder: '例如: images/', // 输入框提示文字
          },
        },
        {
          field: 'doroAdventure.storyDataFile',
          label: '剧情数据文件名',
          bottomHelpMessage: '存放剧情数据的JSON文件名 (相对于插件的 resources 目录)',
          component: 'Input',
          required: true,
          componentProps: {
            placeholder: '例如: story_data.json',
          },
        },
        {
          field: 'doroAdventure.dailyLimit',
          label: '每日冒险次数限制',
          bottomHelpMessage: '每位用户每天可以进行冒险的次数 (设置为 0 表示不限制)',
          component: 'InputNumber', // 使用数字输入框组件
          required: true,
          componentProps: {
            min: 0, // 最小值
            placeholder: '请输入每日次数限制',
          },
        },
        // 如果未来有更多配置项，可以在这里继续添加
        // { component: 'SOFT_GROUP_END' } // 分组结束（可选）
      ],

      // --- 获取数据给前端 ---
      // 使用你库中现有的 getConfig 函数
      getConfigData() {
        // getConfig() 已经返回了合并后的（默认+用户）配置对象
        const currentConfig = getConfig();
        // Guoba 需要的数据结构应与 schemas 中的 'field' 路径匹配。
        // 你的 getConfig() 很可能返回 { doroAdventure: {...} }，这正好适用。
        console.log('[Doro Guoba] getConfigData 被调用, 返回:', currentConfig);
        return currentConfig;
      },

      // --- 保存来自前端的数据 ---
      // 我们需要将 *仅* 用户可配置的部分写回 config.yaml
      setConfigData(data, { Result }) {
        console.log('[Doro Guoba] setConfigData 被调用, 传入数据:', data);
        try {
          // 1. 从 Guoba 提供的扁平数据对象 (如 {'doroAdventure.dailyLimit': 10}) 重建 *用户* 配置结构
          // 基于你的配置结构，我们假设所有可编辑字段都在 'doroAdventure' 下
          const userConfigToSave = {};
          for (const [keyPath, value] of Object.entries(data)) {
             // 只处理以 'doroAdventure.' 开头的键，确保我们只保存相关的部分
            if (keyPath.startsWith('doroAdventure.')) {
                 // 使用 lodash.set 来正确构建嵌套结构
                 lodash.set(userConfigToSave, keyPath, value);
            } else {
                 // 打印日志，说明忽略了不在预期路径下的数据
                 console.warn(`[Doro Guoba] 保存时忽略了未知的键路径: ${keyPath}`);
            }

          }

          // 2. 确保配置目录存在
          if (!fs.existsSync(userConfigDir)) {
            fs.mkdirSync(userConfigDir, { recursive: true });
            console.log(`[Doro Guoba] 创建了配置目录: ${userConfigDir}`);
          }

          // 3. 将重建的用户配置对象写入 config.yaml
          // 我们只写入 doroAdventure 部分，因为 config.yaml 中只包含这部分用户配置
          // userConfigToSave 应该是类似 { doroAdventure: { ... } } 的结构
          const yamlString = yaml.dump(userConfigToSave);
          fs.writeFileSync(userConfigPath, yamlString, 'utf8');
          console.log(`[Doro Guoba] 成功写入到 ${userConfigPath}`);

          // 4. 使用你库中的函数触发重新加载
          // 这能确保监视器捕获到更改，并且内存中的配置得到更新
          // （虽然你的文件监视器 *应该* 能自动检测到文件变化，但显式调用 reloadConfig() 更为保险和即时）
          reloadConfig();
          console.log('[Doro Guoba] 触发了配置重新加载。');

          // 返回成功结果给前端
          return Result.ok({}, '配置保存成功！');

        } catch (error) {
          // 处理写入文件或其它可能的错误
          console.error(`[Doro Guoba] 保存配置到 ${userConfigPath} 失败:`, error);
          // 返回错误结果给前端
          return Result.e('保存配置失败，请查看后台日志。');
        }
      },
    },
  }
}
