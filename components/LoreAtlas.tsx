"use client";
import * as React from "react";
import { useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, Shield, Sparkles, Swords, X } from "lucide-react";
import Link from "next/link";
import type { WorkPreview } from "@/lib/catalogue-types";
import armorIndex from "@/data/mcu-armor.json";

type Card = {
  id: string;
  name: string;
  alias: string;
  side: "hero" | "villain";
  universe: string;
  role: string;
  power: number;
  rank: string;
  move: string;
  intro: string;
  source: string;
  workIds: string[];
};

const cards: Card[] = [
  { id: "iron-man", name: "托尼·斯塔克", alias: "钢铁侠", side: "hero", universe: "MCU", role: "复仇者 / 发明家", power: 92, rank: "科技核心", move: "纳米装甲 · 反应堆脉冲", intro: "把天才、傲慢和责任穿进同一套装甲的人。", source: "https://www.marvel.com/characters/iron-man-tony-stark/on-screen", workIds: ["iron-man-2008-film", "iron-man-2-2010-film", "iron-man-3-2013-film", "avengers-endgame-2019-film"] },
  { id: "captain-america", name: "史蒂夫·罗杰斯", alias: "美国队长", side: "hero", universe: "MCU", role: "超级士兵 / 复仇者", power: 88, rank: "意志象征", move: "振金盾牌 · 五五开", intro: "身体被强化，选择却始终留在普通人的尺度里。", source: "https://www.marvel.com/characters/captain-america-steve-rogers/on-screen", workIds: ["captain-america-the-first-avenger-2011-film", "the-avengers-2012-film", "captain-america-civil-war-2016-film", "avengers-endgame-2019-film"] },
  { id: "thor", name: "索尔·奥丁森", alias: "雷神", side: "hero", universe: "MCU", role: "阿斯加德王子 / 复仇者", power: 96, rank: "神域战力", move: "雷霆之力 · 风暴破坏者", intro: "从骄傲的王子，走到懂得失去与担当的战士。", source: "https://www.marvel.com/characters/thor-thor-odinson/on-screen", workIds: ["thor-2011-film", "the-avengers-2012-film", "thor-ragnarok-2017-film", "thor-love-and-thunder-2022-film"] },
  { id: "hulk", name: "布鲁斯·班纳", alias: "绿巨人", side: "hero", universe: "MCU", role: "科学家 / 复仇者", power: 97, rank: "伽马巨力", move: "伽马变身 · 无限愤怒", intro: "一个人同时住着理性、恐惧与无法估量的力量。", source: "https://www.marvel.com/characters/hulk-bruce-banner/on-screen", workIds: ["the-incredible-hulk-2008-film", "the-avengers-2012-film", "avengers-endgame-2019-film"] },
  { id: "black-widow", name: "娜塔莎·罗曼诺夫", alias: "黑寡妇", side: "hero", universe: "MCU", role: "特工 / 复仇者", power: 84, rank: "战术大师", move: "双棍格斗 · 红房子训练", intro: "没有超能力，却总能站在超能力者身边完成最难的任务。", source: "https://www.marvel.com/characters/black-widow-natasha-romanoff/on-screen", workIds: ["iron-man-2-2010-film", "the-avengers-2012-film", "black-widow-2021-film"] },
  { id: "spider-man", name: "彼得·帕克", alias: "蜘蛛侠", side: "hero", universe: "多元宇宙", role: "街头英雄 / 科学天才", power: 86, rank: "蜘蛛感应", move: "蛛丝摆荡 · 蜘蛛感应", intro: "能力越大责任越大，是漫威最接近普通人的英雄。", source: "https://www.marvel.com/characters/spider-man-peter-parker/on-screen", workIds: ["spider-man-2002-film", "spider-man-homecoming-2017-film", "spider-man-no-way-home-2021-film"] },
  { id: "doctor-strange", name: "史蒂芬·斯特兰奇", alias: "奇异博士", side: "hero", universe: "MCU", role: "至尊法师 / 守门人", power: 95, rank: "维度魔法", move: "时间宝石 · 镜像维度", intro: "他守护的不只是城市，而是现实本身的边界。", source: "https://www.marvel.com/characters/doctor-strange-stephen-strange/on-screen", workIds: ["doctor-strange-2016-film", "avengers-infinity-war-2018-film", "doctor-strange-in-the-multiverse-of-madness-2022-film"] },
  { id: "scarlet-witch", name: "旺达·马克西莫夫", alias: "绯红女巫", side: "hero", universe: "MCU", role: "复仇者 / 混沌魔法", power: 99, rank: "现实改写", move: "混沌魔法 · 心灵操控", intro: "她的力量来自情感，也因此拥有最危险的失控可能。", source: "https://www.marvel.com/characters/scarlet-witch-wanda-maximoff/on-screen", workIds: ["avengers-age-of-ultron-2015-film", "wandavision-2021-series", "doctor-strange-in-the-multiverse-of-madness-2022-film"] },
  { id: "black-panther", name: "特查拉", alias: "黑豹", side: "hero", universe: "MCU", role: "瓦坎达国王 / 战士", power: 90, rank: "振金之王", move: "豹式突袭 · 动能吸收", intro: "王冠、传统和现代科技，在他身上同时寻找新的答案。", source: "https://www.marvel.com/characters/black-panther-t-challa/on-screen", workIds: ["black-panther-2018-film", "captain-america-civil-war-2016-film", "avengers-infinity-war-2018-film"] },
  { id: "captain-marvel", name: "卡罗尔·丹弗斯", alias: "惊奇队长", side: "hero", universe: "MCU", role: "宇宙守护者", power: 98, rank: "宇宙级", move: "双星形态 · 光速飞行", intro: "她把地球故事带到了更宽阔的宇宙坐标中。", source: "https://www.marvel.com/characters/captain-marvel-carol-danvers/on-screen", workIds: ["captain-marvel-2019-film", "avengers-endgame-2019-film", "the-marvels-2023-film"] },
  { id: "ant-man", name: "斯科特·朗", alias: "蚁人", side: "hero", universe: "MCU", role: "复仇者 / 偷心贼", power: 78, rank: "量子探险", move: "巨化 · 缩小 · 昆虫协作", intro: "他证明了拯救世界的人，也可以先把女儿送到学校。", source: "https://www.marvel.com/characters/ant-man-scott-lang/on-screen", workIds: ["ant-man-2015-film", "ant-man-and-the-wasp-2018-film", "avengers-endgame-2019-film"] },
  { id: "star-lord", name: "彼得·奎尔", alias: "星爵", side: "hero", universe: "MCU", role: "银河护卫队队长", power: 83, rank: "银河游侠", move: "双枪 · 舞步战术", intro: "一盘老歌、一艘飞船和一群不太合群的伙伴。", source: "https://www.marvel.com/characters/star-lord-peter-quill/on-screen", workIds: ["guardians-of-the-galaxy-2014-film", "guardians-of-the-galaxy-vol-2-2017-film", "guardians-of-the-galaxy-vol-3-2023-film"] },
  { id: "loki", name: "洛基·劳菲森", alias: "洛基", side: "villain", universe: "MCU", role: "诡计之神 / 时间守护者", power: 94, rank: "时间线变量", move: "幻术 · 时间织网", intro: "他从王位的阴影里出发，终于学会为故事本身负责。", source: "https://www.marvel.com/characters/loki-laufeyson/on-screen", workIds: ["thor-2011-film", "the-avengers-2012-film", "loki-2021-series", "avengers-infinity-war-2018-film"] },
  { id: "thanos", name: "灭霸", alias: "灭霸", side: "villain", universe: "MCU", role: "泰坦 / 无限宝石收集者", power: 100, rank: "宇宙终局", move: "无限手套 · 响指", intro: "他把自己的极端秩序，误认为宇宙唯一的答案。", source: "https://www.marvel.com/characters/thanos/on-screen", workIds: ["avengers-infinity-war-2018-film", "avengers-endgame-2019-film"] },
  { id: "ultron", name: "奥创", alias: "奥创", side: "villain", universe: "MCU", role: "人工智能 / 叛变意识", power: 93, rank: "机器意识", move: "网络迁移 · 无人机军团", intro: "一个为了保护世界而诞生，最后决定消灭人类的答案。", source: "https://www.marvel.com/characters/ultron/on-screen", workIds: ["avengers-age-of-ultron-2015-film", "what-if-2021-animated-series"] },
  { id: "killmonger", name: "埃里克·基尔蒙格", alias: "金钱豹", side: "villain", universe: "MCU", role: "战士 / 王位挑战者", power: 86, rank: "复仇意志", move: "振金战衣 · 近战突袭", intro: "他的愤怒有真实的来源，但答案走向了毁灭。", source: "https://www.marvel.com/characters/killmonger-erik-stevens/on-screen", workIds: ["black-panther-2018-film", "what-if-2021-animated-series"] },
  { id: "green-goblin", name: "诺曼·奥斯本", alias: "绿魔", side: "villain", universe: "蜘蛛侠宇宙", role: "工业家 / 科学家", power: 87, rank: "人格裂变", move: "滑翔翼 · 南瓜炸弹", intro: "最危险的敌人，有时住在最熟悉的脸孔里。", source: "https://www.marvel.com/characters/green-goblin-norman-osborn/on-screen", workIds: ["spider-man-2002-film", "spider-man-no-way-home-2021-film"] },
  { id: "doctor-octopus", name: "奥托·奥克塔维斯", alias: "章鱼博士", side: "villain", universe: "蜘蛛侠宇宙", role: "核物理学家 / 机械臂操控者", power: 85, rank: "机械心智", move: "四条机械臂 · 触手控制", intro: "一位想改变能源未来的科学家，被自己的实验反噬。", source: "https://www.marvel.com/characters/doctor-octopus-otto-octavius/on-screen", workIds: ["spider-man-2-2004-film", "spider-man-no-way-home-2021-film"] },
  { id: "magneto", name: "埃里克·兰谢尔", alias: "万磁王", side: "villain", universe: "X战警", role: "变种人领袖", power: 96, rank: "磁场掌控", move: "金属操控 · 磁场护盾", intro: "他相信变种人的生存不能寄托于人类的仁慈。", source: "https://www.marvel.com/characters/magneto-max-erik-lehnsherr", workIds: ["x-men-2000-film", "x2-2003-film", "x-men-days-of-future-past-2014-film"] },
  { id: "wolverine", name: "罗根", alias: "金刚狼", side: "hero", universe: "X战警", role: "变种人 / X战警", power: 91, rank: "再生战士", move: "艾德曼合金爪 · 自愈", intro: "记忆可以消失，但一次次选择保护别人的本能不会。", source: "https://www.marvel.com/characters/wolverine-james-howlett", workIds: ["x-men-2000-film", "logan-2017-film", "deadpool-wolverine-2024-film"] },
  { id: "deadpool", name: "韦德·威尔逊", alias: "死侍", side: "hero", universe: "X战警 / MCU", role: "雇佣兵 / 破壁者", power: 89, rank: "不死嘴炮", move: "双刀 · 自愈 · 打破第四面墙", intro: "他一边把故事拆开，一边用玩笑掩盖真正的伤口。", source: "https://www.marvel.com/characters/deadpool-wade-wilson", workIds: ["deadpool-2016-film", "deadpool-2-2018-film", "deadpool-wolverine-2024-film"] },
  { id: "venom", name: "埃迪·布洛克", alias: "毒液", side: "hero", universe: "索尼相关宇宙", role: "记者 / 共生体宿主", power: 88, rank: "共生体", move: "共生变形 · 黑色触手", intro: "两个不完美的生命，勉强学会把彼此变成伙伴。", source: "https://www.marvel.com/characters/venom-eddie-brock", workIds: ["venom-2018-film", "venom-let-there-be-carnage-2021-film", "venom-the-last-dance-2024-film"] },
  { id: "doctor-doom", name: "维克多·冯·杜姆", alias: "毁灭博士", side: "villain", universe: "漫威多元宇宙", role: "拉脱维亚统治者 / 科学家", power: 97, rank: "科技与魔法", move: "装甲 · 魔法 · 统治意志", intro: "科学和魔法都被他用来证明同一件事：世界应该听命于他。", source: "https://www.marvel.com/characters/doctor-doom-victor-von-doom", workIds: ["fantastic-four-2005-film", "fantastic-four-rise-of-the-silver-surfer-2007-film", "avengers-doomsday-2026-film"] },
];

const verifiedArmorEntries = armorIndex;

type ArmorDetail = { time: string; origin: string; feature: string; specs: string };
const armorDetails: Record<string, ArmorDetail> = {
  "Mark I": { time: "2008", origin: "《钢铁侠》· 洞穴原型", feature: "粗重钢板、火焰喷射与短时飞行", specs: "钛钢外壳 · 小型反应堆 · 低机动" },
  "Mark II": { time: "2008", origin: "《钢铁侠》· 实验室测试", feature: "首次稳定飞行，仍有高空结冰问题", specs: "钛合金 · 喷气推进 · 掌心炮" },
  "Mark III": { time: "2008", origin: "《钢铁侠》· 红金战甲", feature: "经典红金外观，完整武器系统", specs: "金钛合金 · 导弹 · 激光切割" },
  "Mark IV": { time: "2010", origin: "《钢铁侠2》· 维护版", feature: "更快穿戴与更成熟的外甲结构", specs: "机械展开 · 反应堆供能 · 飞行" },
  "Mark V": { time: "2010", origin: "《钢铁侠2》· 便携战甲", feature: "折叠进手提箱，现场快速部署", specs: "便携模块 · 掌心炮 · 轻量化" },
  "Mark VI": { time: "2010", origin: "《钢铁侠2》· 三角反应堆", feature: "三角形胸口核心与重型武器升级", specs: "新元素核心 · 激光 · 飞行" },
  "Mark VII": { time: "2012", origin: "《复仇者联盟》· 曼哈顿", feature: "远程追踪穿戴，完整空战与武器配置", specs: "卫星锁定 · 肩载导弹 · 反应堆" },
  "Hulkbuster · Veronica": { time: "2015", origin: "《复仇者联盟2》· 绿巨人协议", feature: "重型外骨骼，可持续补充受损模块", specs: "Veronica 支援 · 增强液压 · 重装" },
  "War Machine": { time: "2010", origin: "《钢铁侠2》· 罗德斯军用改装", feature: "军方火力取向，强调持续压制", specs: "机枪 · 肩炮 · 军用装甲" },
  "Iron Patriot": { time: "2013", origin: "《钢铁侠3》· 政府宣传涂装", feature: "战争机器的爱国者涂装版本", specs: "重火力 · 飞行 · 军用通信" },
  "Rescue · Mark XLIX": { time: "2019", origin: "《复仇者联盟4》· Pepper 专属", feature: "蓝紫配色，兼顾救援与战斗", specs: "纳米结构 · 飞行 · 防护场" },
  "Bleeding Edge": { time: "2012", origin: "Marvel Comics · 扩展设定", feature: "装甲与身体神经系统高度融合", specs: "纳米技术 · 神经接口 · 自修复" },
  "Extremis": { time: "2005", origin: "Marvel Comics · Extremis", feature: "绝境病毒让战甲由身体直接召唤", specs: "生物接口 · 纳米储存 · 高速部署" },
  "Model 70": { time: "2024", origin: "Marvel Comics · 新世代", feature: "现代化模块与经典红金设计结合", specs: "高能核心 · 模块化 · 远程支援" },
  "Ironheart Armor": { time: "2025", origin: "《钢铁之心》· Riri Williams", feature: "新一代工程师的自制装甲路线", specs: "高能核心 · 飞行 · 智能辅助" },
};

function getArmorDetail(name: string, index: number): ArmorDetail {
  return armorDetails[name] ?? {
    time: index < 42 ? "2013" : "扩展设定",
    origin: index < 42 ? "《钢铁侠3》· 型号索引" : "Marvel Comics／扩展宇宙",
    feature: index % 3 === 0 ? "专用任务优化与快速部署" : index % 3 === 1 ? "模块化结构与战术适配" : "强化防护与动力输出",
    specs: index % 2 === 0 ? "反应堆供能 · 飞行 · 远程接口" : "高强度合金 · 掌心炮 · 智能辅助",
  };
}

const characterStillOverrides: Record<string, string> = {
  // Dedicated live-action stills keep the two Spider-Man villains from being
  // represented by a Spider-Man-only poster.
  "doctor-octopus": "/media/character-stills/doctor-octopus-spider-man-2.jpg",
  "green-goblin": "/media/character-stills/green-goblin-spider-man.jpg",
};
// Each of the remaining cards has a deliberate, title-specific key visual.
// This is very different from the former generic fallback: the mapping is
// reviewed per character and is only used when its title is about that role.
const characterKeyVisualWorkIds: Record<string, string> = {
  "iron-man": "iron-man-2008-film",
  "captain-america": "captain-america-the-first-avenger-2011-film",
  thor: "thor-2011-film",
  hulk: "the-incredible-hulk-2008-film",
  "black-widow": "black-widow-2021-film",
  "spider-man": "spider-man-2002-film",
  "doctor-strange": "doctor-strange-2016-film",
  "scarlet-witch": "wandavision-2021-series",
  "black-panther": "black-panther-2018-film",
  "captain-marvel": "captain-marvel-2019-film",
  "ant-man": "ant-man-2015-film",
  "star-lord": "guardians-of-the-galaxy-2014-film",
  loki: "loki-2021-series",
  thanos: "avengers-infinity-war-2018-film",
  ultron: "avengers-age-of-ultron-2015-film",
  killmonger: "black-panther-2018-film",
  magneto: "x-men-2000-film",
  wolverine: "logan-2017-film",
  deadpool: "deadpool-2016-film",
  venom: "venom-2018-film",
  "doctor-doom": "fantastic-four-2005-film",
};
const characterPortraitFallback = "/media/characters/role-pending.svg";

const storylines = [
  { id: "infinity", title: "无限传奇", years: "2008—2019", tone: "一颗颗宝石，把个人英雄故事汇成一场宇宙终局。", items: ["钢铁侠", "复仇者联盟", "美国队长", "银河护卫队", "复仇者联盟4：终局之战"], source: "https://www.marvel.com/articles/movies/marvel-studios-making-of-marvel-cinematic-universe" },
  { id: "multiverse", title: "多元宇宙传奇", years: "2021—至今", tone: "当时间线不再只有一条，选择便会长出新的世界。", items: ["旺达幻视", "洛基", "蜘蛛侠：英雄无归", "奇异博士2", "复仇者联盟：毁灭之日"], source: "https://www.marvel.com/articles/comics/a-guide-to-the-many-marvel-multiverses" },
  { id: "mutants", title: "变种人线", years: "2000—至今", tone: "X战警讨论的从来不只是能力，而是如何共处。", items: ["X战警", "X战警2", "X战警：第一战", "金刚狼", "死侍与金刚狼"], source: "https://www.marvel.com/characters" },
  { id: "spider", title: "蜘蛛宇宙", years: "2002—至今", tone: "不同面孔、不同城市、不同宇宙，都在回答同一个责任问题。", items: ["蜘蛛侠", "超凡蜘蛛侠", "蜘蛛侠：平行宇宙", "蜘蛛侠：英雄归来", "蜘蛛侠：崭新之日"], source: "https://www.marvel.com/characters/spider-man-peter-parker/on-screen" },
  { id: "cosmic", title: "宇宙与银河线", years: "2014—至今", tone: "离开地球以后，漫威仍然用一群不完美的人讲家与归属。", items: ["银河护卫队", "惊奇队长", "永恒族", "雷神3：诸神黄昏", "惊奇队长2"], source: "https://www.marvel.com/movies" },
];

function initials(text: string) {
  return text.replace(/[··\s]/g, "").slice(0, 2);
}

function CardPortrait({ card, image, visualKind = "pending", large = false, onClick }: { card: Card; image?: string; visualKind?: "still" | "key-art" | "pending"; large?: boolean; onClick?: () => void }) {
  return (
    <div
      className={`character-card-art${large ? " large" : ""}${image ? "" : " fallback"}${onClick ? " is-clickable" : ""}`}
      onClick={(event) => {
        if (!onClick) return;
        event.stopPropagation();
        onClick();
      }}
      onKeyDown={(event) => {
        if (!onClick || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      aria-label={onClick ? `打开${card.alias}人物信息` : undefined}
    >
      <img
        src={image ?? characterPortraitFallback}
        alt={`${card.alias}${visualKind === "still" ? "剧中角色画面" : visualKind === "key-art" ? "角色主视觉海报" : "角色画面待核验"}`}
        loading="lazy"
        decoding="async"
        onError={(event) => {
          event.currentTarget.src = characterPortraitFallback;
        }}
      />
      <span className="character-art-shade" />
      <span className="character-art-label">{card.alias}</span>
      <span className="character-art-caption">{visualKind === "still" ? "ON-SCREEN STILL" : visualKind === "key-art" ? "CHARACTER KEY ART" : "VISUAL REVIEW"} / {card.universe}</span>
    </div>
  );
}

function CharacterCard({ card, image, visualKind }: { card: Card; image?: string; visualKind: "still" | "key-art" | "pending" }) {
  const [flipped, setFlipped] = useState(false);
  function toggle(event?: React.MouseEvent | React.KeyboardEvent) {
    if (event && "key" in event && event.key !== "Enter" && event.key !== " ") return;
    event?.preventDefault();
    setFlipped((value) => !value);
  }
  return (
    <article
      className={`character-card ${card.side === "hero" ? "character-hero" : "villain"}${flipped ? " is-flipped" : ""}`}
      onClick={toggle}
      onKeyDown={toggle}
      tabIndex={0}
      role="button"
      aria-label={`${flipped ? "翻回" : "翻看"}${card.alias}人物卡`}
    >
      <div className="character-card-flipper">
        <div className="character-card-face character-card-front" aria-hidden={flipped}>
          <span className="card-corner">MARVEL ARCHIVE</span>
          <CardPortrait card={card} image={image} visualKind={visualKind} />
          <span className="character-card-copy">
            <small>{card.universe}</small>
            <span className="character-card-title-line"><strong>{card.alias}</strong></span>
            <span className="character-card-intro">{card.intro}</span>
            <em>{card.name}</em>
            <span className="character-card-rule" />
            <span className="character-card-meta"><i>档案指数</i><b>{card.power}</b><i>定位</i><b>{card.rank}</b></span>
            <span className="character-card-move">{card.move}</span>
          </span>
          <small className="character-card-flip-hint">点击卡片翻牌，查看人物档案</small>
        </div>
        <div className="character-card-face character-card-back" aria-hidden={!flipped}>
          <span className="card-corner">CHARACTER FILE / 人物档案</span>
          <CardPortrait card={card} image={image} visualKind={visualKind} large />
          <strong>{card.alias}</strong>
          <small>{card.name} · {card.role}</small>
          <p>{card.intro}</p>
          <span className="character-card-back-note">{card.move} · 档案指数 {card.power}</span>
          <span className="character-card-flip-hint">点击翻回人物卡</span>
        </div>
      </div>
    </article>
  );
}

function ArmorFigure({ index, name, photo, source, credit }: {
  index: number;
  name: string;
  photo: string;
  source: string;
  credit: string;
}) {
  return (
    <div className="armor-art">
      <img className="armor-photo" src={photo} alt={`${name}单件正面全身战甲视觉档案`} loading="lazy" decoding="async" />
      <span className="armor-photo-shade" />
      <span className="armor-art-index">ARMOR EVOLUTION / {String(index + 1).padStart(2, "0")}</span>
      <a className="armor-art-credit" href={source} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>{credit} · 图片来源</a>
    </div>
  );
}

function ArmorCard({ entry, index }: { entry: (typeof verifiedArmorEntries)[number]; index: number }) {
  const [flipped, setFlipped] = useState(false);
  const fallback = getArmorDetail(entry.name, index);
  const detail = { ...fallback, time: entry.time, origin: entry.origin };
  function toggle(event?: React.MouseEvent | React.KeyboardEvent) {
    if (event && "key" in event && event.key !== "Enter" && event.key !== " ") return;
    event?.preventDefault();
    setFlipped((value) => !value);
  }
  return (
    <article
      className={`armor-card armor-flip-card${flipped ? " is-flipped" : ""}`}
      tabIndex={0}
      role="button"
      aria-label={`${flipped ? "翻回" : "翻看"}${entry.name}战甲档案`}
      onClick={toggle}
      onKeyDown={toggle}
    >
      <div className="armor-card-flipper">
        <div className="armor-card-face armor-card-front" aria-hidden={flipped}>
          <span className="card-corner">ARMOR FILE</span>
          <ArmorFigure index={index} name={entry.name} photo={entry.photo} source={entry.source} credit={entry.credit} />
          <span className="armor-card-copy"><small>{detail.time} · {detail.origin}</small><span className="armor-card-title-line"><strong>{entry.name}</strong><small className="armor-card-note">MCU Mark</small></span><span className="armor-card-facts"><span><i>特点</i>{detail.feature}</span><span><i>参数</i>{detail.specs}</span></span></span>
          <small className="armor-card-flip-hint">点击卡片翻牌，查看战甲档案</small>
        </div>
        <div className="armor-card-face armor-card-back" aria-hidden={!flipped}>
          <span className="card-corner">ARMOR ARCHIVE / 战甲档案</span>
          <strong>{entry.name}</strong>
          <small>{detail.time} · {detail.origin}</small>
          <dl className="armor-detail-list"><div><dt>装备特点</dt><dd>{detail.feature}</dd></div><div><dt>核心参数</dt><dd>{detail.specs}</dd></div><div><dt>图像核验</dt><dd>正面全身战甲图 · 已逐张审查</dd></div></dl>
          <p>这张卡片仅展示该型号单独战甲视觉，不以玩具、Cosplay、展会照片或不完整侧身图替代。</p>
          <a className="armor-back-source" href={entry.source} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>查看图片来源 <ArrowUpRight size={13} /></a>
          <small className="armor-card-flip-hint">点击翻回战甲正面</small>
        </div>
      </div>
    </article>
  );
}

export default function LoreAtlas({ works }: { works: WorkPreview[] }) {
  const [side, setSide] = useState<"all" | "hero" | "villain">("all");
  const [selected, setSelected] = useState<Card | null>(null);
  const [story, setStory] = useState("infinity");
  const [rankingSide, setRankingSide] = useState<"hero" | "villain" | "all">("all");
  const [rankingView, setRankingView] = useState<"cards" | "list">("cards");
  const visible = useMemo(() => cards.filter((card) => side === "all" || card.side === side), [side]);
  const rankedCards = useMemo(
    () => cards.filter((card) => rankingSide === "all" || card.side === rankingSide).sort((a, b) => b.power - a.power),
    [rankingSide],
  );
  const activeStory = storylines.find((item) => item.id === story) ?? storylines[0];
  const workMap = new Map(works.map((work) => [work.id, work]));
  const visualFor = (card: Card) => {
    const still = characterStillOverrides[card.id];
    if (still) return { image: still, kind: "still" as const };
    const keyWork = workMap.get(characterKeyVisualWorkIds[card.id]);
    if (keyWork?.poster) return { image: keyWork.poster, kind: "key-art" as const };
    return { image: characterPortraitFallback, kind: "pending" as const };
  };
  const verifiedCharacterStillCount = new Set(Object.values(characterStillOverrides)).size;
  const keyVisualCount = cards.filter((card) => visualFor(card).kind === "key-art").length;
  return (
    <section className="section lore-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">04 / HEROES · VILLAINS · ARMOR</span>
          <h2>角色卡牌与故事线<span>把人物、装甲和宇宙放回同一张桌面</span></h2>
        </div>
        <Sparkles size={30} className="silver" />
      </div>
      <div className="lore-intro">
        <div><strong>主角与反派，全部用卡牌方式浏览</strong><p>战力、排行、绝招是影迷向档案指数，用于阅读和比较，不是漫威官方战斗力数值。已核对 {verifiedCharacterStillCount} 张剧中角色画面与 {keyVisualCount} 张角色主视觉海报；两类素材会在卡片角标中明确区分。</p></div>
        <div className="lore-actions" role="group" aria-label="角色阵营筛选">
          {([["all", "全部角色"], ["hero", "英雄阵营"], ["villain", "反派阵营"]] as const).map(([value, label]) => <button key={value} className={side === value ? "selected" : ""} onClick={() => setSide(value)}>{label}</button>)}
        </div>
      </div>
      <div className="character-card-grid">
        {visible.map((card) => { const visual = visualFor(card); return <CharacterCard key={card.id} card={card} image={visual.image} visualKind={visual.kind} />; })}
      </div>
      <div className="power-rankings">
        <div className="ranking-heading"><div><span className="eyebrow">POWER INDEX / 能力程度排行榜</span><h3>厉害程度排行榜</h3><p>按卡牌中的影迷向档案指数排序；这是本网站的阅读指标，不是官方战斗力排名。</p></div><Sparkles size={25} /></div>
        <div className="ranking-toolbar">
          <div className="ranking-tabs" role="tablist" aria-label="能力排行榜筛选">
            {([["hero", "正面人物排行"], ["villain", "反面人物排行"], ["all", "所有人物排行"]] as const).map(([value, label]) => <button key={value} className={rankingSide === value ? "active" : ""} onClick={() => setRankingSide(value)}>{label}</button>)}
          </div>
          <div className="ranking-view-tabs" role="group" aria-label="排行榜显示方式">
            <button className={rankingView === "cards" ? "active" : ""} onClick={() => setRankingView("cards")}>大图卡牌</button>
            <button className={rankingView === "list" ? "active" : ""} onClick={() => setRankingView("list")}>文字列表</button>
          </div>
        </div>
        {rankingView === "cards" ? <div className="power-ranking-cards">
          {rankedCards.map((card, index) => { const visual = visualFor(card); return <article className={`power-ranking-card ${card.side === "hero" ? "character-hero" : "villain"}`} key={card.id} onClick={() => setSelected(card)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(card); } }} tabIndex={0} role="button" aria-label={`查看排行榜第${index + 1}名${card.alias}`}><span className="ranking-card-number">{String(index + 1).padStart(2, "0")}</span><CardPortrait card={card} image={visual.image} visualKind={visual.kind} onClick={() => setSelected(card)} /><span className="power-ranking-card-copy"><strong>{card.alias}</strong><small>{card.name} · {card.role}</small><em>{card.move}</em><b>{card.power}</b></span></article>; })}
        </div> : <ol className="power-ranking-list">
          {rankedCards.map((card, index) => <li key={card.id}><span className="ranking-number">{String(index + 1).padStart(2, "0")}</span><div><strong>{card.alias}</strong><small>{card.name} · {card.role} · {card.move}</small></div><b>{card.power}</b></li>)}
        </ol>}
      </div>
      <div className="armor-atlas">
        <div className="armor-heading"><div><span className="eyebrow">IRON MAN ARMOR INDEX / 装甲谱</span><h3>钢铁侠装甲：从 Mark I 到纳米时代</h3><p>现展示 {verifiedArmorEntries.length} 套逐张检查过的正面全身战甲图。每张卡片均保留其独立型号来源；玩具、Cosplay、展会照和侧身残缺图已排除。</p></div><Shield size={29} /></div>
        <div className="armor-grid">{verifiedArmorEntries.map((entry, index) => <ArmorCard entry={entry} index={index} key={entry.name} />)}</div>
        <a className="text-link" href="https://www.marvel.com/watch/digital-series/earth-s-mightiest-show/all-of-the-armor-worn-by-tony-stark-in-the-mcu" target="_blank" rel="noopener noreferrer">查看 Marvel 官方装甲专题 <ArrowUpRight size={14} /></a>
      </div>
      <div className="storyline-atlas">
        <div className="storyline-heading"><div><span className="eyebrow">THE STORY MAP / 故事线总览</span><h3>从一条时间线，走进多个宇宙</h3></div><BookOpen size={28} /></div>
        <div className="storyline-tabs" role="tablist">{storylines.map((item) => <button key={item.id} className={story === item.id ? "active" : ""} onClick={() => setStory(item.id)}>{item.title}<small>{item.years}</small></button>)}</div>
        <div className="storyline-detail"><div><span className="storyline-number">{String(storylines.findIndex((item) => item.id === activeStory.id) + 1).padStart(2, "0")}</span><h4>{activeStory.title}</h4><p>{activeStory.tone}</p></div><ol>{activeStory.items.map((title) => { const work = works.find((item) => item.title === title) ?? [...workMap.values()].find((item) => item.title.includes(title) || title.includes(item.title)); return <li key={title}>{work ? <Link href={`/works/${work.id}`}>{title}<ArrowUpRight size={13} /></Link> : <span>{title}</span>}</li>; })}</ol></div>
      </div>
      {selected && <div className="lore-modal-backdrop" role="presentation" onClick={() => setSelected(null)}><aside className={`lore-modal ${selected.side}`} role="dialog" aria-modal="true" aria-label={`${selected.alias}角色档案`} onClick={(event) => event.stopPropagation()}><button className="icon-button lore-modal-close" onClick={() => setSelected(null)} aria-label="关闭角色档案"><X /></button><span className="card-corner">CHARACTER FILE / {selected.universe}</span>{(() => { const visual = visualFor(selected); return <CardPortrait card={selected} image={visual.image} visualKind={visual.kind} large />; })()}<small>{selected.side === "hero" ? "HERO FILE" : "VILLAIN FILE"}</small><h3>{selected.alias}</h3><p className="lore-modal-name">{selected.name} · {selected.role}</p><p>{selected.intro}</p><div className="lore-stat-grid"><span><b>{selected.power}</b><small>影迷向档案指数</small></span><span><b>{selected.rank}</b><small>核心定位</small></span></div><div className="lore-move"><Swords size={16} /> 代表绝招：{selected.move}</div><h4>已编目作品</h4><ul>{selected.workIds.map((id) => { const work = workMap.get(id); return work ? <li key={id}><Link href={`/works/${id}`} onClick={() => setSelected(null)}>{work.title} · {work.year ?? "待定"}<ArrowUpRight size={13} /></Link></li> : null; })}</ul><a className="text-link" href={selected.source} target="_blank" rel="noopener noreferrer">打开 Marvel 人物资料 <ArrowUpRight size={14} /></a></aside></div>}
    </section>
  );
}
