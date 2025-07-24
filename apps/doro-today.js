
import fetch from "node-fetch"

/**
 * 运行模式
 * !: 每天抽一次
 * 2: 每天抽两次
 * 3: 每天抽三次
 * false: 一直抽！
 */
const num = 2

export default class doro extends plugin {
  constructor() {
    super({
      name: "每日doro结局",
      dsc: "抽取你的doro结局",
      event: "message",
      priority: 5000,
      rule: [
        {
          reg: "^#(抽取|随机)?(今日)?doro结局",
          fnc: "doro"
        }
      ],
      task: {
        cron: "0 0 0 * * *",
        name: "重置每日doro结局次数",
        fnc: () => redis.set("Yz:dorotoday:list", JSON.stringify({}))
      }
    })
  }

  async doro(e) {
    let list = JSON.parse(await redis.get("Yz:dorotoday:list")) || {}
    if (typeof num == "number" && list?.[e.user_id] >= num) {
      return e.reply(["你今天已经抽过了哦~",segment.button([{text:"我也要抽", callback: `#抽取doro结局`},{text:"大冒险", callback: `/doro`}])])
    }
    let res = await (await fetch("https://doro.genshin.icu/api/random-ending")).json()
    let msg = [
      `### 今日doro结局：\n\n${res.title}\n\n>${res.description}\n`,
      segment.image(res.imageUrl),
      segment.button([{text:"我也要抽", callback: `#抽取doro结局`}])
    ]
    list[e.user_id] = list?.[e.user_id] ? list[e.user_id] + 1 : 1
    redis.set("Yz:dorotoday:list", JSON.stringify(list), { EX: 86400 })
    return e.reply(msg)
  }
}

