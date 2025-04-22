from nonebot import on_command
from nonebot.adapters.onebot.v11 import Bot, Event, Message
from nonebot.params import CommandArg
from .game_logic import get_next_node, update_user_state, get_node_data, is_end_node, user_game_state
from .image_handler import send_images
from nonebot.plugin import PluginMetadata


__plugin_meta__ = PluginMetadata(
    name="doro大冒险",
    description="一个基于文字冒险的游戏插件",
    type="application",
    usage="""
    使用方法：
    doro ：开始游戏
    choose <选项> 或 选择 <选项>：在游戏中做出选择
    """,
    homepage="https://github.com/ATTomatoo/dorodoro",
    extra={
        "author": "ATTomatoo",
        "version": "1.5.1",
        "priority": 5,
        "plugin_type": "NORMAL"
    }
)

# 定义doro命令
doro = on_command("doro", aliases={"多罗"}, priority=5, block=True)

@doro.handle()
async def handle_doro(bot: Bot, event: Event):
    user_id = str(event.get_user_id())
    start_node = "start"
    update_user_state(user_id, start_node)
    start_data = get_node_data(start_node)
    
    if start_data:
        msg = start_data["text"] + "\n"
        for key, opt in start_data.get("options", {}).items():
            msg += f"{key}. {opt['text']}\n"
        
        await send_images(bot, event, start_data.get("image"))
        await doro.send(msg)
    else:
        await doro.send("游戏初始化失败，请联系管理员。")

# 定义choose命令
choose = on_command("choose", aliases={"选择"}, priority=5, block=True)

@choose.handle()
async def handle_choose(bot: Bot, event: Event, args: Message = CommandArg()):
    user_id = str(event.get_user_id())
    if user_id not in user_game_state:
        await choose.finish("你还没有开始游戏，请输入 /doro 开始。")
        return

    choice = args.extract_plain_text().strip().upper()
    current_node = user_game_state[user_id]

    next_node = get_next_node(current_node, choice)
    if not next_node:
        await choose.finish("无效选择，请重新输入。")
        return

    next_data = get_node_data(next_node)
    if not next_data:
        await choose.finish("故事节点错误，请联系管理员。")
        return
    
    update_user_state(user_id, next_node)

    msg = next_data["text"] + "\n"
    for key, opt in next_data.get("options", {}).items():
        msg += f"{key}. {opt['text']}\n"

    await send_images(bot, event, next_data.get("image"))
    
    if is_end_node(next_data):
        await choose.finish(msg + "\n故事结束。")
        user_game_state.pop(user_id, None)
    else:
        await choose.finish(msg)  # 使用 finish 来终止事件传播