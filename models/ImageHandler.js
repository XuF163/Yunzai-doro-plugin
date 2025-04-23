// yunzai-doro-plugin/models/ImageHandler.js
import fs from 'node:fs';
import path from 'node:path';
import { getConfig as cfg } from '../lib/config.js';


// Define plugin root and resources path
const __dirname = path.dirname(import.meta.url.replace(/^file:\/\/\/?/, ''));
const pluginRoot = path.join(__dirname, '..');
const resourcesPath = path.join(pluginRoot, 'resources');

// Load configuration
const config = cfg().doroAdventure || {};  // Get config specific to this plugin
const imageSubDir = config.imageSubDir || 'images/'; // Default from defSet if not in user config
const imageDir = path.resolve(resourcesPath, imageSubDir); // Use resolve for absolute path

logger.info(`[Doro冒险] 图片目录: ${imageDir}`);

// Ensure image directory exists (optional, good practice)
if (!fs.existsSync(imageDir)) {
    logger.warn(`[Doro冒险] 图片目录不存在: ${imageDir}`);
    // You might want to create it: fs.mkdirSync(imageDir, { recursive: true });
}

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
