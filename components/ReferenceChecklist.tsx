import Link from "next/link";
import { ArrowUpRight, CheckCircle2, ListChecks } from "lucide-react";
import checklist from "@/data/reference-checklist.json";

export function ReferenceChecklist() {
  const total = checklist.groups.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );

  return (
    <details className="reference-checklist">
      <summary>
        <span>
          <ListChecks size={18} />
          参考图清单核对
        </span>
        <strong>
          {total} / {total} 已定位
        </strong>
      </summary>
      <div className="reference-checklist-intro">
        <p>{checklist.description}</p>
        <small>最后核对：{checklist.checkedAt}</small>
      </div>
      <div className="reference-groups">
        {checklist.groups.map((group) => (
          <section key={group.label}>
            <header>
              <h3>{group.label}</h3>
              <span>{group.range}</span>
            </header>
            <ol>
              {group.items.map((item) => (
                <li key={item.order}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  <span className="reference-order">
                    {String(item.order).padStart(2, "0")}
                  </span>
                  <div>
                    <Link href={`/works/${item.workId}`}>
                      {item.title}
                      <ArrowUpRight size={13} />
                    </Link>
                    <small>
                      {item.year}
                      {"note" in item && item.note ? ` · ${item.note}` : ""}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </details>
  );
}
