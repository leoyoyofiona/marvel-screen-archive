import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { schema } from "../lib/community-schema.mjs";
test("isolated PostgreSQL schema: unique likes, moderation, consent withdrawal", async () => {
  const db = new PGlite();
  try {
    await db.exec(schema);
    await db.query("INSERT INTO marvel_visitors(id) VALUES($1)", [
      "unit-test-only",
    ]);
    for (let i = 0; i < 3; i++)
      await db.query(
        "INSERT INTO marvel_likes(visitor_id,work_id,liked) VALUES($1,$2,true) ON CONFLICT(visitor_id,work_id) DO UPDATE SET liked=true",
        ["unit-test-only", "iron-man-2008-film"],
      );
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::integer AS n FROM marvel_likes WHERE liked",
        )
      ).rows[0].n,
      1,
    );
    await db.query(
      "INSERT INTO marvel_comments(id,visitor_id,name,body) VALUES($1,$2,$3,$4)",
      [
        "test-comment",
        "unit-test-only",
        "测试影迷",
        "独立测试记录，不是真实用户评价。",
      ],
    );
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::integer AS n FROM marvel_comments WHERE status='approved'",
        )
      ).rows[0].n,
      0,
    );
    await db.query("UPDATE marvel_comments SET status='approved' WHERE id=$1", [
      "test-comment",
    ]);
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::integer AS n FROM marvel_comments WHERE status='approved'",
        )
      ).rows[0].n,
      1,
    );
    await db.query(
      "UPDATE marvel_visitors SET country='CN',gender='undisclosed',profile_consent=true",
    );
    await db.query(
      "UPDATE marvel_visitors SET country=NULL,gender=NULL,profile_consent=false",
    );
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::integer AS n FROM marvel_visitors WHERE profile_consent",
        )
      ).rows[0].n,
      0,
    );
  } finally {
    await db.close();
  }
});
