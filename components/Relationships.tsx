"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  Simulation,
  SimulationNodeDatum,
} from "d3-force";
import {
  Search,
  Plus,
  Minus,
  RotateCcw,
  ArrowUpRight,
  Maximize2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Work, Person, Character } from "@/lib/catalogue-types";
type RelationWork = Pick<Work, "id" | "title" | "year" | "people">;
type RelationshipPayload = {
  works: RelationWork[];
  people: Person[];
  characters: Character[];
};
type GraphNode = SimulationNodeDatum & {
  id: string;
  label: string;
  kind: "center" | "work" | "person" | "character";
  workId?: string;
  personId?: string;
  characterId?: string;
  portrait?: string | null;
  portraitKind?: string | null;
};

type ScreenCharacter = Character & {
  side: "hero" | "villain" | "support";
  role: string;
  intro: string;
  portraitKind?: "role-still";
};

const characterMeta: Record<string, Pick<ScreenCharacter, "side" | "role" | "intro">> = {
  "tony-stark": { side: "hero", role: "复仇者／发明家", intro: "从武器制造者走向愿意承担代价的钢铁侠。" },
  "steve-rogers": { side: "hero", role: "超级士兵／复仇者", intro: "在时代变化中仍坚持选择做一个好人。" },
  thor: { side: "hero", role: "阿斯加德王子／复仇者", intro: "从骄傲王子成长为愿意与众人并肩的战士。" },
  "natasha-romanoff": { side: "hero", role: "特工／复仇者", intro: "没有超能力，却总在最危险的位置完成任务。" },
  "peter-parker-mcu": { side: "hero", role: "学生／街头英雄", intro: "在日常生活与英雄责任之间寻找平衡。" },
  "stephen-strange": { side: "hero", role: "至尊法师", intro: "守护现实边界的外科医生与魔法师。" },
  "wanda-maximoff": { side: "hero", role: "复仇者／混沌魔法", intro: "力量与失去交织在一起的现实改写者。" },
  "logan-fox": { side: "hero", role: "变种人／X战警", intro: "记忆会消失，但保护他人的本能不会。" },
};

const rolePortraits: Record<string, string> = {
  "tony-stark": "/media/characters/tony-stark.svg",
  "steve-rogers": "/media/characters/steve-rogers.svg",
  thor: "/media/characters/thor.svg",
  "natasha-romanoff": "/media/characters/natasha-romanoff.svg",
  "peter-parker-mcu": "/media/characters/peter-parker-mcu.svg",
  "stephen-strange": "/media/characters/stephen-strange.svg",
  "wanda-maximoff": "/media/characters/wanda-maximoff.svg",
  "logan-fox": "/media/characters/logan-fox.svg",
  // These two are dedicated live-action role stills. Keep the catalogue IDs
  // and the curated role IDs aligned so neither villain falls back to a
  // Spider-Man-only work poster.
  "norman-osborn": "/media/character-stills/green-goblin-spider-man.jpg",
  "otto-octavius": "/media/character-stills/doctor-octopus-spider-man-2.jpg",
  "green-goblin": "/media/character-stills/green-goblin-spider-man.jpg",
  "doctor-octopus": "/media/character-stills/doctor-octopus-spider-man-2.jpg",
  "bruce-banner": "/media/characters/hulk.svg",
  "loki-character": "/media/characters/loki.svg",
  "thanos-character": "/media/characters/thanos.svg",
  "ultron-character": "/media/characters/ultron.svg",
  "tchalla": "/media/characters/black-panther.svg",
  "erik-killmonger": "/media/characters/killmonger.svg",
  "scott-lang": "/media/characters/ant-man.svg",
  "peter-quill": "/media/characters/star-lord.svg",
  "wade-wilson": "/media/characters/deadpool.svg",
  "eddie-brock": "/media/characters/venom.svg",
  "erik-lehnsherr": "/media/characters/magneto.svg",
  "carol-danvers": "/media/characters/captain-marvel.svg",
};

// A relationship node must never collapse to an empty circle when an image
// cannot be loaded. These local archive placeholders are clearly labelled and
// are only used as a visual fallback; they are not presented as real people.
const personPortraitFallback = "/media/people/fallback/relationship-person.svg";
const rolePortraitFallback = "/media/characters/role-pending.svg";

// Role portraits are intentionally separate from the person portrait ledger.
function rolePortraitFor(id: string, workIds: string[]) {
  // A work poster is not a character portrait. If a dedicated role image is
  // unavailable, use the labelled role placeholder instead of pairing the
  // wrong hero/villain with this node.
  void workIds;
  return rolePortraits[id] ?? rolePortraitFallback;
}

function departmentLabel(departments: string[]) {
  const labels = departments.map((department) =>
    department === "director"
      ? "导演"
      : department === "creator"
        ? "创作者"
        : department === "writer"
          ? "编剧"
          : department === "producer"
            ? "制片"
            : "演员／配音",
  );
  return labels.length ? labels.join("／") : "演职员";
}

// The catalogue only stores eight character anchors today. These curated role links
// add the main, opposing and supporting screen roles so the role graph behaves like
// the actor graph instead of pretending an actor list is a character list.
const roleCharacterCatalog: ScreenCharacter[] = [
  ["pepper-potts", "佩珀·波茨", "小辣椒", "Gwyneth Paltrow", "hero", "斯塔克工业掌舵者", ["iron-man-2008-film", "iron-man-2-2010-film", "iron-man-3-2013-film", "avengers-endgame-2019-film"], "从秘书到领导者，她是托尼最重要的现实支点。"],
  ["james-rhodes", "詹姆斯·罗德斯", "战争机器", "Don Cheadle", "hero", "空军军官／复仇者", ["iron-man-2008-film", "iron-man-2-2010-film", "iron-man-3-2013-film", "avengers-age-of-ultron-2015-film", "captain-america-civil-war-2016-film", "avengers-endgame-2019-film"], "把军人的纪律带进超级英雄世界。"],
  ["happy-hogan", "哈皮·霍根", "哈皮", "Jon Favreau", "support", "安保主管／朋友", ["iron-man-2008-film", "iron-man-2-2010-film", "iron-man-3-2013-film", "spider-man-homecoming-2017-film", "avengers-endgame-2019-film"], "总在混乱现场保护身边的人。"],
  ["obadiah-stane", "奥巴代亚·斯坦", "铁霸王", "Jeff Bridges", "villain", "工业家／反派", ["iron-man-2008-film"], "把技术和野心推向失控的一面。"],
  ["yinsen", "何·英森", "英森医生", "Shaun Toub", "support", "医生／导师", ["iron-man-2008-film"], "用一段相遇提醒托尼：不要浪费仅有的一次生命。"],
  ["whiplash", "伊凡·万科", "鞭笞", "Mickey Rourke", "villain", "工程师／复仇者", ["iron-man-2-2010-film"], "把家族旧怨变成高压电鞭。"],
  ["justin-hammer", "贾斯汀·汉默", "汉默", "Sam Rockwell", "villain", "军火商", ["iron-man-2-2010-film"], "永远想成为托尼，却只学会了炫耀。"],
  ["aldrich-killian", "奥德里奇·基里安", "满大人幕后", "Guy Pearce", "villain", "科学家／幕后操盘者", ["iron-man-3-2013-film"], "把绝境病毒与表演包装成权力。"],
  ["bruce-banner", "布鲁斯·班纳", "绿巨人", "Mark Ruffalo", "hero", "科学家／复仇者", ["the-avengers-2012-film", "avengers-age-of-ultron-2015-film", "avengers-infinity-war-2018-film", "avengers-endgame-2019-film"], "理性与伽马力量共住在同一个人身上。"],
  ["clint-barton", "克林特·巴顿", "鹰眼", "Jeremy Renner", "hero", "特工／复仇者", ["the-avengers-2012-film", "avengers-age-of-ultron-2015-film", "captain-america-civil-war-2016-film", "avengers-endgame-2019-film"], "没有超能力，仍然选择站在战场上。"],
  ["nick-fury", "尼克·弗瑞", "尼克·弗瑞", "Samuel L. Jackson", "support", "神盾局局长", ["iron-man-2-2010-film", "the-avengers-2012-film", "captain-america-the-winter-soldier-2014-film", "captain-america-civil-war-2016-film", "captain-marvel-2019-film"], "把一个个孤独英雄召集成团队的人。"],
  ["loki-character", "洛基", "诡计之神", "Tom Hiddleston", "villain", "阿斯加德王子／变量", ["thor-2011-film", "the-avengers-2012-film", "avengers-infinity-war-2018-film", "loki-2021-series", "avengers-endgame-2019-film"], "在背叛、牺牲和时间尽头之间重新定义自己。"],
  ["thanos-character", "灭霸", "灭霸", "Josh Brolin", "villain", "泰坦／宇宙征服者", ["avengers-infinity-war-2018-film", "avengers-endgame-2019-film"], "把极端秩序误认为宇宙唯一答案的反派。"],
  ["ultron-character", "奥创", "奥创", "James Spader", "villain", "人工智能／叛变意识", ["avengers-age-of-ultron-2015-film"], "为了保护世界而诞生，最后决定消灭人类。"],
  ["vision-character", "幻视", "幻视", "Paul Bettany", "hero", "合成生命／复仇者", ["avengers-age-of-ultron-2015-film", "captain-america-civil-war-2016-film", "avengers-infinity-war-2018-film", "avengers-endgame-2019-film", "wandavision-2021-series"], "一个由心灵宝石、程序与情感共同构成的生命。"],
  ["sam-wilson", "山姆·威尔逊", "猎鹰／美国队长", "Anthony Mackie", "hero", "空军／复仇者", ["captain-america-the-winter-soldier-2014-film", "avengers-age-of-ultron-2015-film", "captain-america-civil-war-2016-film", "avengers-endgame-2019-film", "captain-america-brave-new-world-2025-film"], "从并肩飞行到接过盾牌。"],
  ["bucky-barnes", "詹姆斯·巴恩斯", "冬日战士", "Sebastian Stan", "hero", "超级士兵／复仇者", ["captain-america-the-first-avenger-2011-film", "captain-america-the-winter-soldier-2014-film", "captain-america-civil-war-2016-film", "avengers-endgame-2019-film"], "被时代夺走人生后，重新找回自己的选择。"],
  ["baron-zemo", "赫尔穆特·泽莫", "泽莫男爵", "Daniel Brühl", "villain", "复仇者瓦解者", ["captain-america-civil-war-2016-film"], "没有超能力，却找到让英雄互相伤害的方法。"],
  ["tchalla", "特查拉", "黑豹", "Chadwick Boseman", "hero", "瓦坎达国王／复仇者", ["captain-america-civil-war-2016-film", "black-panther-2018-film", "avengers-infinity-war-2018-film", "avengers-endgame-2019-film"], "把传统、王权与世界责任放在同一副肩膀上。"],
  ["shuri", "舒莉", "舒莉公主", "Letitia Wright", "hero", "科学家／瓦坎达守护者", ["black-panther-2018-film", "avengers-infinity-war-2018-film", "avengers-endgame-2019-film", "black-panther-wakanda-forever-2022-film"], "用科技把守护家园变成新的可能。"],
  ["erik-killmonger", "埃里克·基尔蒙格", "金钱豹", "Michael B. Jordan", "villain", "战士／王位挑战者", ["black-panther-2018-film"], "愤怒有真实的来源，但答案走向了毁灭。"],
  ["scott-lang", "斯科特·朗", "蚁人", "Paul Rudd", "hero", "复仇者／量子探险者", ["ant-man-2015-film", "ant-man-and-the-wasp-2018-film", "avengers-endgame-2019-film", "ant-man-and-the-wasp-quantumania-2023-film"], "拯救世界之前，也要先把女儿送到学校。"],
  ["hope-van-dyne", "霍普·范·戴因", "黄蜂女", "Evangeline Lilly", "hero", "量子科学家／英雄", ["ant-man-2015-film", "ant-man-and-the-wasp-2018-film", "avengers-endgame-2019-film", "ant-man-and-the-wasp-quantumania-2023-film"], "把训练、科学与行动力合成一体。"],
  ["peter-quill", "彼得·奎尔", "星爵", "Chris Pratt", "hero", "银河护卫队队长", ["guardians-of-the-galaxy-2014-film", "guardians-of-the-galaxy-vol-2-2017-film", "avengers-infinity-war-2018-film", "avengers-endgame-2019-film", "guardians-of-the-galaxy-vol-3-2023-film"], "一盘老歌、一艘飞船和一群不太合群的伙伴。"],
  ["gamora", "卡魔拉", "卡魔拉", "Zoe Saldaña", "hero", "银河护卫队／刺客", ["guardians-of-the-galaxy-2014-film", "guardians-of-the-galaxy-vol-2-2017-film", "avengers-infinity-war-2018-film", "avengers-endgame-2019-film", "guardians-of-the-galaxy-vol-3-2023-film"], "从灭霸的女儿成为为自己选择道路的人。"],
  ["rocket", "火箭浣熊", "火箭", "Bradley Cooper", "hero", "赏金猎人／银河护卫队", ["guardians-of-the-galaxy-2014-film", "guardians-of-the-galaxy-vol-2-2017-film", "avengers-infinity-war-2018-film", "avengers-endgame-2019-film", "guardians-of-the-galaxy-vol-3-2023-film"], "用尖刻语言保护最柔软的伤口。"],
  ["drax", "德拉克斯", "毁灭者", "Dave Bautista", "hero", "银河护卫队／战士", ["guardians-of-the-galaxy-2014-film", "guardians-of-the-galaxy-vol-2-2017-film", "avengers-infinity-war-2018-film", "avengers-endgame-2019-film", "guardians-of-the-galaxy-vol-3-2023-film"], "把复仇一路走成了家人的陪伴。"],
  ["nebula", "涅布拉", "涅布拉", "Karen Gillan", "hero", "银河护卫队／幸存者", ["guardians-of-the-galaxy-2014-film", "guardians-of-the-galaxy-vol-2-2017-film", "avengers-endgame-2019-film", "guardians-of-the-galaxy-vol-3-2023-film"], "在姐妹、创伤与自我重建之间前进。"],
  ["carol-danvers", "卡罗尔·丹弗斯", "惊奇队长", "Brie Larson", "hero", "宇宙守护者／复仇者", ["captain-marvel-2019-film", "avengers-endgame-2019-film", "the-marvels-2023-film"], "把地球故事带到更宽阔的宇宙坐标中。"],
  ["hela", "海拉", "死亡女神", "Cate Blanchett", "villain", "阿斯加德／征服者", ["thor-ragnarok-2017-film"], "王位和旧秩序最锋利的幽灵。"],
  ["valkyrie", "瓦尔基里", "女武神", "Tessa Thompson", "hero", "阿斯加德／战士", ["thor-ragnarok-2017-film", "avengers-endgame-2019-film", "thor-love-and-thunder-2022-film"], "从创伤幸存者走向新的国王。"],
  ["wong", "王", "王法师", "Benedict Wong", "support", "法师／守门人", ["doctor-strange-2016-film", "avengers-infinity-war-2018-film", "avengers-endgame-2019-film", "doctor-strange-in-the-multiverse-of-madness-2022-film"], "在多元宇宙入口处守住秩序。"],
  ["norman-osborn", "诺曼·奥斯本", "绿魔", "Willem Dafoe", "villain", "科学家／人格裂变", ["spider-man-2002-film", "spider-man-no-way-home-2021-film"], "最危险的敌人，有时住在最熟悉的脸孔里。"],
  ["otto-octavius", "奥托·奥克塔维斯", "章鱼博士", "Alfred Molina", "villain", "核物理学家／机械臂操控者", ["spider-man-2-2004-film", "spider-man-no-way-home-2021-film"], "想改变能源未来，却被实验反噬的科学家。"],
  ["mj-watson", "米歇尔·琼斯", "MJ", "Zendaya", "hero", "学生／彼得的伙伴", ["spider-man-homecoming-2017-film", "spider-man-far-from-home-2019-film", "spider-man-no-way-home-2021-film"], "用清醒和勇气陪彼得面对代价。"],
  ["charles-xavier", "查尔斯·泽维尔", "X教授", "Patrick Stewart", "hero", "变种人导师／X战警", ["x-men-2000-film", "x2-2003-film", "x-men-the-last-stand-2006-film", "x-men-days-of-future-past-2014-film", "logan-2017-film"], "相信共处可能性的导师。"],
  ["erik-lehnsherr", "埃里克·兰谢尔", "万磁王", "Ian McKellen", "villain", "变种人领袖", ["x-men-2000-film", "x2-2003-film", "x-men-the-last-stand-2006-film", "x-men-days-of-future-past-2014-film"], "无法接受变种人的生存寄托于人类仁慈。"],
  ["jean-grey", "琴·葛蕾", "凤凰女", "Famke Janssen", "hero", "X战警／心灵能力者", ["x-men-2000-film", "x2-2003-film", "x-men-the-last-stand-2006-film"], "力量、爱与自我控制的悲剧交汇点。"],
  ["storm", "奥罗罗·门罗", "暴风女", "Halle Berry", "hero", "X战警／天气掌控者", ["x-men-2000-film", "x2-2003-film", "x-men-the-last-stand-2006-film"], "把风暴变成保护同伴的力量。"],
  ["mystique", "瑞雯·达克霍姆", "魔形女", "Jennifer Lawrence", "support", "变种人／伪装者", ["x-men-first-class-2011-film", "x-men-days-of-future-past-2014-film", "x-men-apocalypse-2016-film"], "身份、自由与归属感不断变化的变种人。"],
  ["wade-wilson", "韦德·威尔逊", "死侍", "Ryan Reynolds", "hero", "雇佣兵／破壁者", ["deadpool-2016-film", "deadpool-2-2018-film", "deadpool-wolverine-2024-film"], "用玩笑拆开故事，也用玩笑遮住伤口。"],
  ["eddie-brock", "埃迪·布洛克", "毒液", "Tom Hardy", "hero", "记者／共生体宿主", ["venom-2018-film", "venom-let-there-be-carnage-2021-film", "venom-the-last-dance-2024-film"], "两个不完美的生命勉强学会成为伙伴。"],
  ["reed-richards", "里德·理查兹", "神奇先生", "Ioan Gruffudd", "hero", "科学家／神奇四侠", ["fantastic-four-2005-film", "fantastic-four-rise-of-the-silver-surfer-2007-film"], "把探索未知的冲动带进家庭与责任。"],
  ["victor-von-doom", "维克多·冯·杜姆", "毁灭博士", "Julian McMahon", "villain", "科学家／统治者", ["fantastic-four-2005-film", "fantastic-four-rise-of-the-silver-surfer-2007-film"], "科学和魔法都被他用来证明统治欲。"],
].map(([id, name, alias, actor, side, role, works, intro]) => ({ id, name, alias, actor, side, role, works, intro, portrait: null })) as ScreenCharacter[];
type GraphState = {
  nodes: GraphNode[];
  edges: {
    source: string;
    target: string;
    kind: "anchor" | "collaboration";
  }[];
};
export default function Relationships() {
  const section = useRef<HTMLElement>(null);
  const [activated, setActivated] = useState(false);
  const [payload, setPayload] = useState<RelationshipPayload | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("person")) {
      const frame = requestAnimationFrame(() => setActivated(true));
      return () => cancelAnimationFrame(frame);
    }
    const node = section.current;
    if (!node || !("IntersectionObserver" in window)) {
      const frame = requestAnimationFrame(() => setActivated(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActivated(true);
          observer.disconnect();
        }
      },
      { rootMargin: "700px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!activated) return;
    const controller = new AbortController();
    fetch("/data/relationships.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("RELATIONSHIP_DATA_UNAVAILABLE");
        return response.json();
      })
      .then((data: RelationshipPayload) => {
        if (
          !Array.isArray(data.works) ||
          !Array.isArray(data.people) ||
          !Array.isArray(data.characters)
        )
          throw new Error("RELATIONSHIP_DATA_INVALID");
        setPayload(data);
      })
      .catch((reason) => {
        if (reason?.name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, [activated, attempt]);

  if (payload) return <RelationshipGraph {...payload} />;

  return (
    <section
      ref={section}
      id="relationships"
      className="section relationship-section relationship-loading"
      aria-busy={activated && !error}
    >
      <span className="eyebrow">03 / CONNECTED UNIVERSES</span>
      <h2>关系宇宙</h2>
      <p>
        {error
          ? "关系数据暂时没有载入，其他作品浏览功能不受影响。"
          : activated
            ? "正在按需打开 1,315 位演职员与作品关系…"
            : "继续向下浏览时，再载入完整人物关系数据。"}
      </p>
      {error && (
        <button
          className="button compact"
          onClick={() => {
            setError(false);
            setAttempt((n) => n + 1);
          }}
        >
          重新载入关系图
        </button>
      )}
    </section>
  );
}

function RelationshipGraph({
  works,
  people,
  characters,
}: {
  works: RelationWork[];
  people: Person[];
  characters: Character[];
}) {
  const router = useRouter();
  const roleCharacters = useMemo(
    () => [
      ...characters.map((character) => ({
        ...character,
        portrait: rolePortraitFor(character.id, character.works) ?? character.portrait,
        portraitKind: "role-still" as const,
        ...(characterMeta[character.id] ?? {
          side: "support" as const,
          role: "银幕角色",
          intro: "已在作品关系资料中编目的银幕角色。",
        }),
      })),
      ...roleCharacterCatalog.map((candidate) => ({
        ...candidate,
        portrait: rolePortraitFor(candidate.id, candidate.works),
        portraitKind: "role-still" as const,
      })).filter(
        (candidate) => !characters.some((character) => character.id === candidate.id),
      ),
    ],
    [characters],
  );
  const [mode, setMode] = useState<"people" | "characters">("people"),
    [search, setSearch] = useState(""),
    [department, setDepartment] = useState("all"),
    [decade, setDecade] = useState("all"),
    [selected, setSelected] = useState(
      people.find((p) => p.nameEn === "Robert Downey Jr.")?.id ??
        people[0]?.id ??
        "",
    ),
    [limit, setLimit] = useState(12),
    [collaboratorLimit, setCollaboratorLimit] = useState(24),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [layout, setLayout] = useState<GraphState>({ nodes: [], edges: [] });
  const simulation = useRef<Simulation<GraphNode, undefined> | null>(null),
    svg = useRef<SVGSVGElement>(null),
    drag = useRef<{
      id: string;
      startX: number;
      startY: number;
      originX: number;
      originY: number;
    } | null>(null);
  const items = useMemo(
    () =>
      mode === "people"
        ? people.filter(
            (p) =>
              (department === "all" || p.departments.includes(department)) &&
              [p.name, p.nameEn]
                .join(" ")
                .toLowerCase()
                .includes(search.toLowerCase()),
          )
        : roleCharacters.filter((c) =>
            [c.name, c.alias].join(" ").includes(search),
          ),
    [mode, people, roleCharacters, search, department],
  );
  const entity =
    mode === "people"
      ? people.find((p) => p.id === selected)
      : roleCharacters.find((c) => c.id === selected);
  const entityPortraitKind =
    entity && "portraitKind" in entity ? entity.portraitKind : null;
  const entityWorkIds = entity
    ? "workIds" in entity
      ? entity.workIds
      : entity.works
    : undefined;
  const allWorks = useMemo(
    () =>
      entityWorkIds
        ? works.filter((work) => entityWorkIds.includes(work.id))
        : [],
    [works, entityWorkIds],
  );
  const related = useMemo(
    () =>
      allWorks.filter(
        (w) =>
          decade === "all" ||
          (w.year && Math.floor(w.year / 10) * 10 === Number(decade)),
      ),
    [allWorks, decade],
  );
  const relatedIds = useMemo(() => new Set(related.map((work) => work.id)), [related]);
  const displayedWorkIds = useMemo(
    () => new Set(related.slice(0, limit).map((work) => work.id)),
    [related, limit],
  );
  const allCollaborators = useMemo(
    () =>
      mode === "people"
        ? people.filter(
            (person) =>
              person.id !== selected &&
              person.workIds.some((workId) => relatedIds.has(workId)),
          )
        : roleCharacters.filter(
            (character) =>
              character.id !== selected &&
              character.works.some((workId) => relatedIds.has(workId)),
          ),
    [mode, people, roleCharacters, relatedIds, selected],
  );
  const collaboratorWorkIds = (item: Person | ScreenCharacter) =>
    "workIds" in item ? item.workIds : item.works;
  const collaborators = useMemo(
    () =>
      allCollaborators
        .filter((person) =>
          collaboratorWorkIds(person).some((workId) => displayedWorkIds.has(workId)),
        )
        .slice(0, collaboratorLimit),
    [allCollaborators, displayedWorkIds, collaboratorLimit],
  );
  const signature = related
    .slice(0, limit)
    .map((w) => w.id)
    .join("|");
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const id = new URLSearchParams(window.location.search).get("person");
      if (id && people.some((p) => p.id === id)) {
        setSelected(id);
        setMode("people");
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [people]);
  useEffect(() => {
    const ids = signature.split("|").filter(Boolean);
    const nodes: GraphNode[] = [
      {
        id: selected,
        label: entity?.name ?? "选择人物",
        kind: "center",
        x: 390,
        y: 220,
        fx: 390,
        fy: 220,
        portrait:
          entity?.portrait ??
          (mode === "characters" ? rolePortraitFallback : personPortraitFallback),
        portraitKind: entityPortraitKind,
      },
    ];
    ids.forEach((id, i) => {
      const w = works.find((w) => w.id === id);
      if (w)
        nodes.push({
          id,
          label: w.title,
          workId: id,
          kind: "work",
          x: 390 + Math.cos((i / ids.length) * Math.PI * 2) * 230,
          y: 220 + Math.sin((i / ids.length) * Math.PI * 2) * 170,
        });
    });
    if (mode === "people" || mode === "characters") {
      collaborators.forEach((person, i) => {
        nodes.push({
          id: person.id,
          label: person.name,
          ...(mode === "people"
            ? { personId: person.id, kind: "person" as const }
            : { characterId: person.id, kind: "character" as const }),
          portrait:
            person.portrait ??
            (mode === "characters" ? rolePortraitFallback : personPortraitFallback),
          portraitKind:
            mode === "characters" ? "role-still" : "portraitKind" in person ? person.portraitKind : "actor-portrait",
          x: 70 + (i % 7) * 110,
          y: 55 + Math.floor(i / 7) * 92,
        });
      });
    }
    const edges: GraphState["edges"] = ids.map((id) => ({
      source: selected,
      target: id,
      kind: "anchor",
    }));
    if (mode === "people" || mode === "characters") {
      collaborators.forEach((person) => {
        collaboratorWorkIds(person)
          .filter((workId) => ids.includes(workId))
          .forEach((workId) =>
            edges.push({
              source: workId,
              target: person.id,
              kind: "collaboration",
            }),
          );
      });
    }
    const sim = forceSimulation(nodes)
      .force(
        "link",
        forceLink<GraphNode, { source: string; target: string }>(
          edges.map(({ source, target }) => ({ source, target })),
        )
          .id((n) => n.id)
          .distance(210),
      )
      .force("charge", forceManyBody().strength(-180))
      .force("center", forceCenter(390, 225))
      .force("collide", forceCollide(62))
      .on("tick", () =>
        setLayout({ nodes: nodes.map((n) => ({ ...n })), edges }),
      );
    simulation.current = sim;
    let settleFrame = 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sim.stop();
      sim.tick(150);
      settleFrame = requestAnimationFrame(() =>
        setLayout({ nodes: nodes.map((n) => ({ ...n })), edges }),
      );
    }
    return () => {
      cancelAnimationFrame(settleFrame);
      sim.stop();
      simulation.current = null;
    };
  }, [
    selected,
    signature,
    entity?.name,
    entity?.portrait,
    entityPortraitKind,
    works,
    mode,
    collaborators,
    roleCharacters,
  ]);
  const choose = (id: string) => {
    setSelected(id);
    setLimit(12);
    setCollaboratorLimit(24);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const switchMode = (value: "people" | "characters") => {
    setMode(value);
    setSearch("");
    setDepartment("all");
    choose(
      value === "people"
        ? (people.find((p) => p.nameEn === "Robert Downey Jr.")?.id ??
            people[0]?.id ??
            "")
        : (roleCharacters[0]?.id ?? ""),
    );
  };
  function position(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * 780) / rect.width,
      y: ((e.clientY - rect.top) * 450) / rect.height,
    };
  }
  return (
    <section id="relationships" className="section relationship-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">03 / CONNECTED UNIVERSES</span>
          <h2>
            关系宇宙<span>故事相连，人物相遇</span>
          </h2>
        </div>
        <div className="segmented">
          <button
            aria-pressed={mode === "people"}
            onClick={() => switchMode("people")}
          >
            演员关系图
          </button>
          <button
            aria-pressed={mode === "characters"}
            onClick={() => switchMode("characters")}
          >
            角色关系图
          </button>
        </div>
      </div>
      <p className="section-description">
        演员关系图显示演员、导演、配音与创作者；角色关系图显示主角、反派和重要配角。两种关系图都通过作品节点串联。人物节点默认只呈现头像，点击头像后在右侧显示姓名、身份与作品关系；作品票根可双击打开。
      </p>
      <div className="graph-filters">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="搜索关系图人物"
            placeholder={
              mode === "people"
                ? "搜索演员、导演的中英文姓名…"
                : "搜索角色或英雄名…"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {mode === "people" && (
          <select
            aria-label="人物身份筛选"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="all">全部身份</option>
            <option value="actor">演员／配音</option>
            <option value="director">导演</option>
            <option value="creator">创作者</option>
          </select>
        )}
        <select
          aria-label="关系作品年代"
          value={decade}
          onChange={(e) => setDecade(e.target.value)}
        >
          <option value="all">全部年代</option>
          {[1940, 1960, 1970, 1980, 1990, 2000, 2010, 2020].map((y) => (
            <option value={y} key={y}>
              {y} 年代
            </option>
          ))}
        </select>
      </div>
      <div className="person-strip" aria-label="选择关系人物">
        {items.slice(0, search ? 50 : 16).map((p) => (
          <button
            key={p.id}
            className={p.id === selected ? "active" : ""}
            onClick={() => choose(p.id)}
            aria-pressed={p.id === selected}
          >
            <img
              src={
                p.portrait ??
                (mode === "characters" ? rolePortraitFallback : personPortraitFallback)
              }
              alt={p.name + "头像"}
              onError={(event) => {
                event.currentTarget.src =
                  mode === "characters" ? rolePortraitFallback : personPortraitFallback;
              }}
            />
            <span>{p.name}</span>
          </button>
        ))}
        {items.length === 0 && (
          <span className="muted">未找到人物；可尝试英文姓氏。</span>
        )}
        {items.length > 16 && !search && (
          <span className="strip-hint">
            搜索可访问全部 {items.length} 位索引人物
          </span>
        )}
      </div>
      <div className="graph-layout">
        <div className="graph-stage">
          <div className="graph-caption">
            <span>
              <i className="node-key" />
              {mode === "people" ? "演员／导演／创作者" : "剧中角色（主角／反派／配角）"}
            </span>
            <span>
              <i className="node-key square" />
              作品
            </span>
            <small>{mode === "people" ? "人物 — 作品 — 人物，线条只表示共同参与" : "角色 — 作品 — 角色，线条表示同场作品关联"}</small>
          </div>
          <div className="graph-coverage" aria-live="polite">
            <span>头像画面 {layout.nodes.filter((node) => node.kind === "person" || node.kind === "character").length} / {layout.nodes.filter((node) => node.kind === "person" || node.kind === "character").length}</span>
            <span>点击后资料 {layout.nodes.filter((node) => (node.kind === "person" || node.kind === "character") && node.label.trim()).length} / {layout.nodes.filter((node) => node.kind === "person" || node.kind === "character").length}</span>
          </div>
          <svg
            ref={svg}
            viewBox="0 0 780 450"
            role="img"
            aria-label={"人物关系图：" + (entity?.name ?? "未选择")}
            onPointerDown={(e) => {
              if ((e.target as Element).closest("[data-node]")) return;
              const point = position(e);
              drag.current = {
                id: "pan",
                startX: point.x,
                startY: point.y,
                originX: pan.x,
                originY: pan.y,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              const point = position(e);
              if (drag.current.id === "pan")
                setPan({
                  x: drag.current.originX + point.x - drag.current.startX,
                  y: drag.current.originY + point.y - drag.current.startY,
                });
              else {
                const n = simulation.current
                  ?.nodes()
                  .find((n) => n.id === drag.current?.id);
                if (n) {
                  n.fx = (point.x - pan.x - 390) / zoom + 390;
                  n.fy = (point.y - pan.y - 225) / zoom + 225;
                  simulation.current?.alphaTarget(0.2).restart();
                }
              }
            }}
            onPointerUp={(e) => {
              const currentDrag = drag.current;
              if (!currentDrag) return;
              const moved = Math.hypot(
                e.clientX - currentDrag.startX,
                e.clientY - currentDrag.startY,
              );
              if (currentDrag.id !== "pan") {
                const n = simulation.current
                  ?.nodes()
                  .find((n) => n.id === currentDrag.id);
                if (n && n.kind !== "center") {
                  n.fx = null;
                  n.fy = null;
                }
                simulation.current?.alphaTarget(0);
                // Pointer capture can retarget pointerup to the SVG instead
                // of the child <g>. Keep the tap action here as a root-level
                // fallback so an avatar click always opens its detail panel.
                if (moved < 8 && n && (n.personId || n.characterId)) {
                  choose(n.personId ?? n.characterId ?? "");
                }
              }
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
              simulation.current?.alphaTarget(0);
            }}
          >
            <defs>
              <radialGradient id="graph-glow">
                <stop stopColor="#902032" stopOpacity=".25" />
                <stop offset="1" stopColor="#090d15" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="390" cy="225" r="220" fill="url(#graph-glow)" />
            <g
              transform={`translate(${pan.x + 390} ${pan.y + 225}) scale(${zoom}) translate(-390 -225)`}
            >
              {layout.edges.map((edge) => {
                const a = layout.nodes.find((n) => n.id === edge.source),
                  b = layout.nodes.find((n) => n.id === edge.target);
                return a && b ? (
                  <line
                    key={edge.source + "-" + edge.target}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={edge.kind === "anchor" ? "#a32a3d" : "#755361"}
                    strokeWidth={edge.kind === "anchor" ? "1.4" : ".8"}
                    strokeDasharray={
                      edge.kind === "collaboration" ? "3 4" : undefined
                    }
                  />
                ) : null;
              })}
              {layout.nodes.map((n) => (
                <g
                  key={n.id}
                  data-node={n.id}
                  transform={`translate(${n.x ?? 0} ${n.y ?? 0})`}
                  className={"graph-node " + n.kind}
                  tabIndex={n.kind === "work" || n.kind === "person" || n.kind === "character" ? 0 : -1}
                  role={
                    n.kind === "work"
                      ? "link"
                      : n.kind === "person" || n.kind === "character"
                        ? "button"
                        : undefined
                  }
                  aria-label={n.label}
                  onKeyDown={(e) => {
                    if (n.workId && e.key === "Enter")
                      router.push("/works/" + n.workId);
                    if ((n.personId || n.characterId) && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      choose(n.personId ?? n.characterId ?? "");
                    }
                  }}
                  onClick={() => {
                    if (n.personId || n.characterId) choose(n.personId ?? n.characterId ?? "");
                  }}
                  onDoubleClick={() => {
                    if (n.workId) router.push("/works/" + n.workId);
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    // Select on pointerdown as well as pointerup. The SVG
                    // captures the pointer for dragging, and some browsers
                    // retarget the later click to the root SVG. Selecting
                    // here keeps a normal mouse tap reliable without
                    // changing the drag gesture.
                    if (n.personId || n.characterId) {
                      choose(n.personId ?? n.characterId ?? "");
                    }
                    drag.current = {
                      id: n.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      originX: n.x ?? 0,
                      originY: n.y ?? 0,
                    };
                    svg.current?.setPointerCapture(e.pointerId);
                  }}
                  onMouseDown={(e) => {
                    // Some embedded browsers expose SVG taps through the
                    // mouse event path only. Keep this idempotent with the
                    // pointer handler so the selected detail is available
                    // even when pointer capture suppresses click.
                    e.stopPropagation();
                    if (n.personId || n.characterId) {
                      choose(n.personId ?? n.characterId ?? "");
                    }
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    const currentDrag = drag.current;
                    if (!currentDrag) return;
                    const moved = Math.hypot(
                      e.clientX - currentDrag.startX,
                      e.clientY - currentDrag.startY,
                    );
                    const node = simulation.current
                      ?.nodes()
                      .find((candidate) => candidate.id === n.id);
                    if (node && node.kind !== "center") {
                      node.fx = null;
                      node.fy = null;
                    }
                    simulation.current?.alphaTarget(0);
                    drag.current = null;
                    if (moved < 8 && (n.personId || n.characterId)) {
                      choose(n.personId ?? n.characterId ?? "");
                    }
                  }}
                >
                  {(n.kind === "work" || n.kind === "center" || n.id === selected) && (
                    <title>
                      {n.label} · {n.kind === "person" ? "演员／导演／创作者" : n.kind === "character" ? "剧中角色" : n.kind === "work" ? "作品" : "周星驰关系中心"}
                    </title>
                  )}
                  {n.kind === "center" ? (
                    <>
                      <circle
                        r="50"
                        fill="#171b27"
                        stroke="#ec2638"
                        strokeWidth="2"
                      />
                      <circle r="58" stroke="#ed26383d" fill="none" />
                      <image
                          href={n.portrait ?? (mode === "characters" ? rolePortraitFallback : personPortraitFallback)}
                          x="-48"
                          y="-48"
                          width="96"
                          height="96"
                          preserveAspectRatio="xMidYMid slice"
                          clipPath="circle(48px at 48px 48px)"
                          onError={(event) => {
                            event.currentTarget.setAttribute(
                              "href",
                              mode === "characters" ? rolePortraitFallback : personPortraitFallback,
                            );
                          }}
                        />
                      <text
                        textAnchor="middle"
                        y={n.portrait ? "67" : "-4"}
                        fill="#eee"
                        fontSize="12"
                      >
                        {n.label}
                      </text>
                      <text
                        textAnchor="middle"
                        y={n.portrait ? "80" : "17"}
                        fill="#929bab"
                        fontSize="9"
                      >
                        {n.portraitKind === "identity-fallback"
                          ? "姓名身份头像 · 非真人照片"
                          : n.portraitKind === "role-still"
                            ? "剧中角色视觉档案"
                          : n.portrait
                            ? "开放许可人物照片"
                            : "头像待核验"}
                      </text>
                    </>
                ) : n.kind === "person" ? (
                  <>
                    <circle
                      r="31"
                      fill="#171b27"
                      stroke={
                        people
                          .find((person) => person.id === n.personId)
                          ?.departments.includes("director")
                          ? "#d59b57"
                          : "#6e8498"
                      }
                      strokeWidth="1.5"
                    />
                    <image
                        href={n.portrait ?? personPortraitFallback}
                        x="-28"
                        y="-28"
                        width="56"
                        height="56"
                        preserveAspectRatio="xMidYMid slice"
                        clipPath="circle(28px at 28px 28px)"
                        onError={(event) => {
                          event.currentTarget.setAttribute("href", personPortraitFallback);
                        }}
                        />
                    {n.personId === selected && <>
                      <rect className="node-label-backdrop" x="-58" y="37" width="116" height="30" rx="4" />
                      <text textAnchor="middle" y="48" fill="#e5e9f0" fontSize="9">
                        {n.label.length > 12 ? n.label.slice(0, 11) + "…" : n.label}
                      </text>
                      <text textAnchor="middle" y="61" fill="#a4adba" fontSize="7.5">
                        {departmentLabel(people.find((person) => person.id === n.personId)?.departments ?? [])}
                      </text>
                    </>}
                  </>
                ) : n.kind === "character" ? (
                  <>
                    <circle
                      r="31"
                      fill="#162b35"
                      stroke={
                        roleCharacters.find((character) => character.id === n.characterId)?.side === "villain"
                          ? "#d36b7a"
                          : roleCharacters.find((character) => character.id === n.characterId)?.side === "support"
                            ? "#c89c61"
                            : "#55b6b1"
                      }
                      strokeWidth="1.5"
                    />
                    <image
                        href={n.portrait ?? rolePortraitFallback}
                        x="-28"
                        y="-28"
                        width="56"
                        height="56"
                        preserveAspectRatio="xMidYMid slice"
                        clipPath="circle(28px at 28px 28px)"
                        onError={(event) => {
                          event.currentTarget.setAttribute("href", rolePortraitFallback);
                        }}
                        />
                    {n.characterId === selected && <>
                      <rect className="node-label-backdrop" x="-58" y="37" width="116" height="30" rx="4" />
                      <text textAnchor="middle" y="48" fill="#e5e9f0" fontSize="9">
                        {n.label.length > 12 ? n.label.slice(0, 11) + "…" : n.label}
                      </text>
                      <text textAnchor="middle" y="61" fill="#a4adba" fontSize="7.5">
                        {(roleCharacters.find((character) => character.id === n.characterId)?.role ?? "银幕角色").slice(0, 14)}
                      </text>
                    </>}
                  </>
                ) : (
                    <>
                      <rect
                        x="-68"
                        y="-23"
                        width="136"
                        height="46"
                        rx="3"
                        fill="#151b26"
                        stroke="#47515e"
                      />
                      <path
                        d="M-60 -23V23 M60 -23V23"
                        stroke="#414854"
                        strokeDasharray="3 3"
                      />
                      <text
                        textAnchor="middle"
                        y="-1"
                        fill="#e5e9f0"
                        fontSize="10"
                      >
                        {n.label.length > 13
                          ? n.label.slice(0, 12) + "…"
                          : n.label}
                      </text>
                      <text
                        textAnchor="middle"
                        y="14"
                        fill="#a4adba"
                        fontSize="9"
                      >
                        {works.find((w) => w.id === n.id)?.year} · 双击打开
                      </text>
                    </>
                  )}
                </g>
              ))}
            </g>
          </svg>
          <div className="graph-hit-layer" aria-label="关系图头像点击区域">
            {layout.nodes
              .filter((node) => node.kind === "person" || node.kind === "character")
              .map((node) => {
                const x = pan.x + 390 + ((node.x ?? 390) - 390) * zoom;
                const y = pan.y + 225 + ((node.y ?? 225) - 225) * zoom;
                const entityId = node.personId ?? node.characterId ?? "";
                return (
                  <button
                    key={node.id}
                    type="button"
                    className="graph-hit-target"
                    data-graph-hit={entityId}
                    aria-label={`点选${node.label}`}
                    style={{
                      left: `${(x / 780) * 100}%`,
                      top: `${(y / 450) * 100}%`,
                    }}
                    onClick={() => choose(entityId)}
                  />
                );
              })}
          </div>
          <div className="graph-controls">
            <button
              className="icon-button"
              aria-label="放大关系图"
              onClick={() => setZoom((z) => Math.min(z + 0.2, 2.5))}
            >
              <Plus size={17} />
            </button>
            <button
              className="icon-button"
              aria-label="缩小关系图"
              onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}
            >
              <Minus size={17} />
            </button>
            <button
              className="icon-button"
              aria-label="重置关系图"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              <RotateCcw size={17} />
            </button>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <span className="graph-instruction">
            <Maximize2 size={12} />
            点击头像看姓名与简介 · 双击票根打开作品
          </span>
        </div>
        <aside className="relationship-detail">
          <span className="eyebrow">SELECTED CONNECTION</span>
          <div className="person-heading">
            <div className="avatar-fallback">
              <img
                src={
                  entity?.portrait ??
                  (mode === "characters" ? rolePortraitFallback : personPortraitFallback)
                }
                alt={(entity?.name ?? "所选人物") + "头像"}
                onError={(event) => {
                  event.currentTarget.src =
                    mode === "characters" ? rolePortraitFallback : personPortraitFallback;
                }}
              />
            </div>
            <div>
              <h3>{entity?.name ?? "请选择人物"}</h3>
              <p>
                {entity && "nameEn" in entity
                  ? entity.nameEn
                  : entity && "alias" in entity
                    ? `${entity.alias} · ${entity.actor}`
                    : ""}
              </p>
            </div>
          </div>
          <p className="relationship-note">
            {mode === "people"
              ? "人物与作品按影视条目的演职员资料连接；作品节点会继续串出共同演员、配音、导演和创作者。"
              : `角色关系图按银幕出场连接，当前含${roleCharacters.length}位已编目角色（主角、反派与重要配角）；同一作品中的角色会彼此串联。`}
          </p>
          {mode === "characters" && entity && "role" in entity && (
            <div className="network-summary character-summary">
              <strong>{entity.alias} · {entity.role}</strong>
              <span>{entity.intro}</span>
              <span>扮演者：{entity.actor}</span>
              <span>头像标注：剧中角色视觉档案，不使用演员真人头像。</span>
            </div>
          )}
          {entity && "portraitCredit" in entity && entity.portraitCredit && (
            <p className="portrait-credit">
              {entity.portraitCredit}
              {entity.portraitSource && (
                <a
                  href={entity.portraitSource}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  图片来源 <ArrowUpRight size={10} />
                </a>
              )}
              {entity.portraitLicenseUrl && (
                <a
                  href={entity.portraitLicenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  使用许可 <ArrowUpRight size={10} />
                </a>
              )}
            </p>
          )}
          <div className="relation-stats">
            <span>
              {allWorks.length}
              <small>已索引相关作品</small>
            </span>
            <span>
              {allWorks[0]?.year ?? "—"}
              <small>本索引最早年份</small>
            </span>
          </div>
          {mode === "people" && (
            <div className="network-summary">
              <strong>合作网络</strong>
              <span>
                当前图中串联 {collaborators.length} 位共同演职员；所选人物在已索引作品中共有 {allCollaborators.length} 位合作人物。
              </span>
              {allCollaborators.length > collaboratorLimit && (
                <button
                  className="button compact full-width"
                  onClick={() => setCollaboratorLimit(allCollaborators.length)}
                >
                  展开全部合作人物（还有 {allCollaborators.length - collaboratorLimit} 位）
                </button>
              )}
            </div>
          )}
          {mode === "characters" && (
            <div className="network-summary character-summary">
              <strong>角色关系网络</strong>
              <span>当前图中串联 {collaborators.length} 位同场角色；所选角色在已编目作品中与 {allCollaborators.length} 位角色发生作品关联。</span>
              {allCollaborators.length > collaboratorLimit && (
                <button
                  className="button compact full-width"
                  onClick={() => setCollaboratorLimit(allCollaborators.length)}
                >
                  展开全部同场角色（还有 {allCollaborators.length - collaboratorLimit} 位）
                </button>
              )}
            </div>
          )}
          <div className="relation-work-list">
            {related.slice(0, limit).map((w) => (
              <Link href={"/works/" + w.id} key={w.id}>
                <time>{w.year}</time>
                <span>{w.title}</span>
                <ArrowUpRight size={13} />
              </Link>
            ))}
            {!related.length && <p>所选年代暂无相关作品。</p>}
          </div>
          {related.length > limit && (
            <button
              className="button compact full-width"
              onClick={() => setLimit((n) => n + 12)}
            >
              展开更多（还有 {related.length - limit} 项）
            </button>
          )}
          <small>上方票根与此列表同步；列表支持键盘操作。</small>
        </aside>
      </div>
    </section>
  );
}
