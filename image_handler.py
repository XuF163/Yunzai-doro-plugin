import os
from nonebot.adapters.onebot.v11 import MessageSegment
from .config import IMAGE_DIR  # 使用相对导入

def get_image_segment(image_name):
    image_path = os.path.join(IMAGE_DIR, image_name)
    if os.path.exists(image_path):
        return MessageSegment.image(f"file://{image_path}")
    return None

async def send_images(bot, event, images):
    if isinstance(images, list):
        for img_file in images:
            img_seg = get_image_segment(img_file)
            if img_seg:
                await bot.send(event, img_seg)
            else:
                await bot.send(event, f"图片 {img_file} 不存在。")
    elif isinstance(images, str):
        img_seg = get_image_segment(images)
        if img_seg:
            await bot.send(event, img_seg)
        else:
            await bot.send(event, f"图片 {images} 不存在。")