import json
import random
import os

# 获取当前脚本文件的目录
current_dir = os.path.dirname(os.path.abspath(__file__))

# 构造 story_data.json 的完整路径
story_data_path = os.path.join(current_dir, 'story_data.json')

# 使用完整路径打开文件
with open(story_data_path, 'r', encoding='utf-8') as f:
    STORY_DATA = json.load(f)

user_game_state = {}

# ... 其余代码保持不变 ...

user_game_state = {}

def get_next_node(current_node, choice):
    data = STORY_DATA.get(current_node, {})
    options = data.get("options", {})
    if choice not in options:
        return None

    next_node = options[choice]["next"]
    if isinstance(next_node, list):  # 随机选项
        rand = random.random()
        cumulative = 0.0
        for item in next_node:
            cumulative += item["probability"]
            if rand <= cumulative:
                return item["node"]
    return next_node

def update_user_state(user_id, next_node):
    user_game_state[user_id] = next_node

def get_node_data(node):
    return STORY_DATA.get(node)

def is_end_node(node_data):
    return node_data.get("is_end", False)