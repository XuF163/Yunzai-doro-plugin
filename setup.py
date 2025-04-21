from setuptools import setup, find_packages
from pathlib import Path

# 读取项目描述
current_dir = Path(__file__).parent
long_description = (current_dir / "README.md").read_text(encoding="utf-8")

setup(
    name="nonebot_plugin_dorodoro",
    version="1.3.6",  # 使用语义化版本控制 (semver)
    description="基于文字冒险的NoneBot游戏插件",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="ATTomatoo",
    author_email="attomato@qq.com",  # 请替换为真实邮箱
    url="https://github.com/ATTomatoo/dorodoro",
    license="AGPL-3.0",

    # 包配置
    packages=find_packages(include=["nonebot_plugin_dorodoro*"]),
    package_data={
        "nonebot_plugin_dorodoro": [
            "*.json",
            "resources/*",
            "images/*",
            "LICENSE"
        ],
    },
    include_package_data=True,

    # 依赖配置
    install_requires=[
        "nonebot2>=2.0.0",
        "nonebot-adapter-onebot>=2.0.0",
        "pillow>=8.3.0; python_version>='3.8'"
    ],

    # 已验证的标准分类器 (PyPI官方认可)
    classifiers=[
        # 开发状态
        "Development Status :: 4 - Beta",
        
        # 许可证
        "License :: OSI Approved :: GNU Affero General Public License v3",
        
        # Python版本 (必须使用具体版本号)
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        
        # 操作系统
        "Operating System :: OS Independent",
        
        # 最接近NoneBot的框架分类器
        "Framework :: AsyncIO",
        
        # 受众
        "Intended Audience :: Developers",
        "Intended Audience :: End Users/Desktop",
        
        # 主题分类
        "Topic :: Communications :: Chat",
        "Topic :: Games/Entertainment :: Role-Playing",
        "Topic :: Software Development :: Libraries :: Application Frameworks"
    ],

    # Python版本要求
    python_requires=">=3.8",

    # 项目关键词
    keywords=[
        "nonebot",
        "qqbot",
        "game",
        "text-adventure",
        "dorodoro",
        "chatbot"
    ],

    # 项目相关链接
    project_urls={
        "Homepage": "https://github.com/ATTomatoo/nonebot_plugin_dorodoro",
        "Bug Tracker": "https://github.com/ATTomatoo/nonebot_plugin_dorodoro/issues",
        "Source Code": "https://github.com/ATTomatoo/nonebot_plugin_dorodoro",
        "Original Project": "https://github.com/ttq7/doro_ending",
    },

    # NoneBot插件入口点
    entry_points={
        "nonebot.plugins": [
            "dorodoro = nonebot_plugin_dorodoro",
        ]
    },

    # 确保构建兼容性
    zip_safe=False,
)