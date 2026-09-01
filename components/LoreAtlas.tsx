"use client";
import { useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, Shield, Sparkles, Swords, X } from "lucide-react";
import Link from "next/link";
import type { WorkPreview } from "@/lib/catalogue-types";

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

const armorNames = [
  "Mark I", "Mark II", "Mark III", "Mark IV", "Mark V", "Mark VI", "Mark VII", "Mark VIII", "Mark IX", "Mark X", "Mark XI", "Mark XII", "Mark XIII", "Mark XIV", "Mark XV · Sneaky", "Mark XVI · Nightclub", "Mark XVII · Heartbreaker", "Mark XVIII · Casanova", "Mark XIX · Tiger", "Mark XX · Python", "Mark XXI · Midas", "Mark XXII · Hot Rod", "Mark XXIII · Shades", "Mark XXIV · Tank", "Mark XXV · Striker", "Mark XXVI · Gamma", "Mark XXVII · Disco", "Mark XXVIII · Jack", "Mark XXIX · Fiddler", "Mark XXX · Blue Steel", "Mark XXXI · Piston", "Mark XXXII · Romeo", "Mark XXXIII · Silver Centurion", "Mark XXXIV · Southpaw", "Mark XXXV · Red Snapper", "Mark XXXVI · Peacemaker", "Mark XXXVII · Hammerhead", "Mark XXXVIII · Igor", "Mark XXXIX · Gemini", "Mark XL · Shotgun", "Mark XLI · Bones", "Mark XLII · 吸附式", "Hulkbuster · Veronica", "War Machine", "Iron Patriot", "Rescue · Mark XLIX", "Bleeding Edge", "Model-Prime", "Godkiller", "Thorbuster", "Silver Centurion", "Extremis", "Stealth Armor", "Hydro Armor", "Space Armor", "Deep-Space Armor", "Endo-Sym Armor", "Model 70", "Ironheart Armor" ];

const characterPortraits: Record<string, string> = {
  "iron-man": "/media/characters/tony-stark.svg",
  "captain-america": "/media/characters/steve-rogers.svg",
  thor: "/media/characters/thor.svg",
  "black-widow": "/media/characters/natasha-romanoff.svg",
  "spider-man": "/media/characters/peter-parker-mcu.svg",
  "doctor-strange": "/media/characters/stephen-strange.svg",
  "scarlet-witch": "/media/characters/wanda-maximoff.svg",
  wolverine: "/media/characters/logan-fox.svg",
};

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

function CardPortrait({ card, poster, large = false }: { card: Card; poster?: string | null; large?: boolean }) {
  const portrait = poster ?? characterPortraits[card.id];
  return (
    <div className={`character-card-art${large ? " large" : ""}${portrait ? "" : " fallback"}`}>
      {portrait ? <img src={portrait} alt={`${card.alias}人物视觉档案`} /> : <span className="character-avatar">{initials(card.alias)}</span>}
      <span className="character-art-shade" />
      <span className="character-art-label">{card.alias}</span>
      <span className="character-art-caption">VISUAL FILE / {card.universe}</span>
    </div>
  );
}

function ArmorFigure({ index, name }: { index: number; name: string }) {
  const tone = ["red", "gold", "silver", "blue", "dark"][index % 5];
  return (
    <div className={`armor-art tone-${tone}`}>
      <svg className="armor-illustration" viewBox="0 0 180 190" role="img" aria-label={`${name}装甲示意图`}>
        <title>{`${name}装甲示意图`}</title>
        <path className="armor-gridline" d="M18 25h144M11 51h158M8 77h164M8 103h164M11 129h158M18 155h144M28 12v166M58 8v174M90 6v178M122 8v174M152 12v166" />
        <path className="armor-glow" d="M90 10c-31 0-47 19-47 43v22c-16 8-28 27-31 55h156c-3-28-15-47-31-55V53C137 29 121 10 90 10Z" />
        <path className="armor-helmet" d="M62 61V39c0-14 10-25 28-25s28 11 28 25v22l-8 15H70l-8-15Z" />
        <path className="armor-visor" d="M67 42h46l-5 15H72l-5-15Z" />
        <path className="armor-neck" d="M75 72h30l6 14H69l6-14Z" />
        <path className="armor-body" d="M69 81h42l16 15 13 27H40l13-27 16-15Z" />
        <path className="armor-chest" d="M75 87h30l8 27H67l8-27Z" />
        <circle className="armor-reactor" cx="90" cy="100" r="9" />
        <path className="armor-arm" d="M53 97 33 111l-8 28h20l9-23 13-10Z" />
        <path className="armor-arm" d="m127 97 20 14 8 28h-20l-9-23-13-10Z" />
        <path className="armor-leg" d="M60 123h26l-4 32H56l-8-12Z" />
        <path className="armor-leg" d="M94 123h26l12 20-8 12H98l-4-32Z" />
        <circle className="armor-repulsor" cx="38" cy="137" r="4" />
        <circle className="armor-repulsor" cx="142" cy="137" r="4" />
      </svg>
      <span className="armor-art-index">ARMOR EVOLUTION / {String(index + 1).padStart(2, "0")}</span>
    </div>
  );
}

export default function LoreAtlas({ works }: { works: WorkPreview[] }) {
  const [side, setSide] = useState<"all" | "hero" | "villain">("all");
  const [selected, setSelected] = useState<Card | null>(null);
  const [story, setStory] = useState("infinity");
  const visible = useMemo(() => cards.filter((card) => side === "all" || card.side === side), [side]);
  const activeStory = storylines.find((item) => item.id === story) ?? storylines[0];
  const workMap = new Map(works.map((work) => [work.id, work]));
  return (
    <section id="lore" className="section lore-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">04 / HEROES · VILLAINS · ARMOR</span>
          <h2>角色卡牌与故事线<span>把人物、装甲和宇宙放回同一张桌面</span></h2>
        </div>
        <Sparkles size={30} className="silver" />
      </div>
      <div className="lore-intro">
        <div><strong>主角与反派，全部用卡牌方式浏览</strong><p>战力、排行、绝招是影迷向档案指数，用于阅读和比较，不是漫威官方战斗力数值。</p></div>
        <div className="lore-actions" role="group" aria-label="角色阵营筛选">
          {([["all", "全部角色"], ["hero", "英雄阵营"], ["villain", "反派阵营"]] as const).map(([value, label]) => <button key={value} className={side === value ? "selected" : ""} onClick={() => setSide(value)}>{label}</button>)}
        </div>
      </div>
      <div className="character-card-grid">
        {visible.map((card) => <button className={`character-card ${card.side}`} key={card.id} onClick={() => setSelected(card)} aria-label={`查看${card.alias}角色卡`}>
          <span className="card-corner">MARVEL ARCHIVE</span><CardPortrait card={card} poster={workMap.get(card.workIds[0])?.poster} /><span className="character-card-copy"><small>{card.universe}</small><span className="character-card-title-line"><strong>{card.alias}</strong><span className="character-card-intro">{card.intro}</span></span><em>{card.name}</em><span className="character-card-rule" /><span className="character-card-meta"><i>档案指数</i><b>{card.power}</b><i>定位</i><b>{card.rank}</b></span><span className="character-card-move">{card.move}</span></span>
        </button>)}
      </div>
      <div className="armor-atlas">
        <div className="armor-heading"><div><span className="eyebrow">IRON MAN ARMOR INDEX / 装甲谱</span><h3>钢铁侠装甲：从 Mark I 到纳米时代</h3><p>影像与设定索引共 {armorNames.length} 套；每张卡片聚焦装甲战衣本身，按电影视觉与型号演变排列，名称中带“设定”的条目仍会继续逐条核验。</p></div><Shield size={29} /></div>
        <div className="armor-grid">{armorNames.map((name, index) => <article className="armor-card" key={`${name}-${index}`}><span className="card-corner">ARMOR FILE</span><ArmorFigure index={index} name={name} /><span className="armor-card-copy"><small>{index < 42 ? "MCU Mark" : "扩展设定"}</small><span className="armor-card-title-line"><strong>{name}</strong><small className="armor-card-note">{index % 3 === 0 ? "能量核心 · 飞行" : index % 3 === 1 ? "模块化 · 战术" : "防护层 · 动力"}</small></span></span></article>)}</div>
        <a className="text-link" href="https://www.marvel.com/watch/digital-series/earth-s-mightiest-show/all-of-the-armor-worn-by-tony-stark-in-the-mcu" target="_blank" rel="noopener noreferrer">查看 Marvel 官方装甲专题 <ArrowUpRight size={14} /></a>
      </div>
      <div className="storyline-atlas">
        <div className="storyline-heading"><div><span className="eyebrow">THE STORY MAP / 故事线总览</span><h3>从一条时间线，走进多个宇宙</h3></div><BookOpen size={28} /></div>
        <div className="storyline-tabs" role="tablist">{storylines.map((item) => <button key={item.id} className={story === item.id ? "active" : ""} onClick={() => setStory(item.id)}>{item.title}<small>{item.years}</small></button>)}</div>
        <div className="storyline-detail"><div><span className="storyline-number">{String(storylines.findIndex((item) => item.id === activeStory.id) + 1).padStart(2, "0")}</span><h4>{activeStory.title}</h4><p>{activeStory.tone}</p><a className="text-link" href={activeStory.source} target="_blank" rel="noopener noreferrer">资料来源 <ArrowUpRight size={14} /></a></div><ol>{activeStory.items.map((title) => { const work = works.find((item) => item.title === title) ?? [...workMap.values()].find((item) => item.title.includes(title) || title.includes(item.title)); return <li key={title}>{work ? <Link href={`/works/${work.id}`}>{title}<ArrowUpRight size={13} /></Link> : <span>{title}</span>}</li>; })}</ol></div>
      </div>
      {selected && <div className="lore-modal-backdrop" role="presentation" onClick={() => setSelected(null)}><aside className={`lore-modal ${selected.side}`} role="dialog" aria-modal="true" aria-label={`${selected.alias}角色档案`} onClick={(event) => event.stopPropagation()}><button className="icon-button lore-modal-close" onClick={() => setSelected(null)} aria-label="关闭角色档案"><X /></button><span className="card-corner">CHARACTER FILE / {selected.universe}</span><CardPortrait card={selected} poster={workMap.get(selected.workIds[0])?.poster} large /><small>{selected.side === "hero" ? "HERO FILE" : "VILLAIN FILE"}</small><h3>{selected.alias}</h3><p className="lore-modal-name">{selected.name} · {selected.role}</p><p>{selected.intro}</p><div className="lore-stat-grid"><span><b>{selected.power}</b><small>影迷向档案指数</small></span><span><b>{selected.rank}</b><small>核心定位</small></span></div><div className="lore-move"><Swords size={16} /> 代表绝招：{selected.move}</div><h4>已编目作品</h4><ul>{selected.workIds.map((id) => { const work = workMap.get(id); return work ? <li key={id}><Link href={`/works/${id}`} onClick={() => setSelected(null)}>{work.title} · {work.year ?? "待定"}<ArrowUpRight size={13} /></Link></li> : null; })}</ul><a className="text-link" href={selected.source} target="_blank" rel="noopener noreferrer">打开 Marvel 人物资料 <ArrowUpRight size={14} /></a></aside></div>}
    </section>
  );
}
