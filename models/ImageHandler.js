// yunzai-doro-plugin/models/ImageHandler.js
import fs from 'node:fs';
import path from 'node:path';
import { PLUGIN_ROOT, getConfig as cfg } from '../lib/config.js';


// Define plugin root and resources path

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
class ImageHandler {
    /**
     * Gets the absolute path for an image name.
     * @param {string} imageName The name of the image file.
     * @returns {string|null} Absolute path or null if not found.
     */
    getImagePath(imageName) {
        if (!imageName || typeof imageName !== 'string') {
            return null;
        }
        const fullPath = path.join(imageDir, imageName);
        if (fs.existsSync(fullPath)) {
            return fullPath;
        } else {
            logger.warn(`[Doro冒险] 图片未找到: ${fullPath}`);
            return null;
        }
    }

    /**
     * Creates a message segment for an image.
     * @param {string} imageName The name of the image file.
     * @returns {object|null} A message segment or null.
     */
    getImageSegment(imageName) {
        const imagePath = this.getImagePath(imageName);
        if (imagePath) {
            // Yunzai's segment.image usually prefers absolute paths
            // or paths relative to specific Yunzai directories.
            // Absolute path is generally safest for custom resource locations.
            return segment.image(imagePath);
        }
        return null;
    }

    /**
     * Creates message segments for a list of image names or a single image name.
     * @param {string|string[]} images Single image name or array of names.
     * @returns {Array<object>} An array of message segments.
     */
    getImageSegments(images) {
        const segments = [];
        if (!images) {
            return segments;
        }

        const imageList = Array.isArray(images) ? images : [images];

        for (const imgFile of imageList) {
            const imgSeg = this.getImageSegment(imgFile);
            if (imgSeg) {
                segments.push(imgSeg);
            }
            // No "image not found" text segment here, handled by GameManager response
        }
        return segments;
    }
}

// Export an instance or the class itself
export default new ImageHandler();
