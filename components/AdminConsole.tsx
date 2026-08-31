"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  LogOut,
  MessageSquareMore,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";

type ReviewStatus = "pending" | "approved" | "rejected" | "all";
type AdminComment = {
  id: string;
  work_id: string | null;
  workTitle: string;
  name: string;
  body: string;
  status: Exclude<ReviewStatus, "all">;
  created_at: string;
};

export default function AdminConsole() {
  const [configured, setConfigured] = useState(true),
    [authenticated, setAuthenticated] = useState(false),
    [checking, setChecking] = useState(true),
    [password, setPassword] = useState(""),
    [filter, setFilter] = useState<ReviewStatus>("pending"),
    [comments, setComments] = useState<AdminComment[]>([]),
    [pendingId, setPendingId] = useState(""),
    [error, setError] = useState("");

  const loadComments = useCallback(async (status: ReviewStatus) => {
    const response = await fetch("/api/admin/comments?status=" + status, {
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw Error(data.error);
    setComments(data.comments);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void fetch("/api/admin/session", { cache: "no-store" })
        .then((response) => response.json())
        .then(async (data) => {
          setConfigured(Boolean(data.configured));
          setAuthenticated(Boolean(data.authenticated));
          if (data.authenticated) await loadComments("pending");
        })
        .catch(() => setError("管理服务暂时无法连接。"))
        .finally(() => setChecking(false));
    });
    return () => cancelAnimationFrame(frame);
  }, [loadComments]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error);
    setPassword("");
    setAuthenticated(true);
    await loadComments(filter);
  }

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
    setComments([]);
  }

  async function changeFilter(status: ReviewStatus) {
    setFilter(status);
    setError("");
    try {
      await loadComments(status);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "读取失败。");
    }
  }

  async function review(
    id: string,
    status: "approved" | "rejected" | "pending",
  ) {
    setPendingId(id);
    setError("");
    try {
      const response = await fetch("/api/admin/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      await loadComments(filter);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "审核操作失败。");
    } finally {
      setPendingId("");
    }
  }

  if (checking)
    return (
      <main className="admin-shell">
        <p>正在检查管理状态…</p>
      </main>
    );

  return (
    <main className="admin-shell">
      <Link href="/" className="back-link">
        <ArrowLeft size={16} /> 返回影迷档案
      </Link>
      <section className="admin-card">
        <div className="admin-heading">
          <span>
            <ShieldCheck size={20} /> PRIVATE MODERATION
          </span>
          <h1>留言审核室</h1>
          <p>只有审核通过的留言才会在作品页与总站公开。</p>
        </div>
        {!configured ? (
          <div className="inline-error">
            服务器尚未设置管理口令哈希与会话密钥，审核入口保持关闭。
          </div>
        ) : !authenticated ? (
          <form className="admin-login" onSubmit={login}>
            <label>
              管理口令
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={10}
                required
              />
            </label>
            <button className="button primary" type="submit">
              进入审核室
            </button>
          </form>
        ) : (
          <>
            <div className="admin-toolbar">
              <div className="admin-tabs" role="tablist" aria-label="留言状态">
                {(["pending", "approved", "rejected", "all"] as const).map(
                  (status) => (
                    <button
                      key={status}
                      className={filter === status ? "selected" : ""}
                      onClick={() => void changeFilter(status)}
                    >
                      {status === "pending"
                        ? "待审核"
                        : status === "approved"
                          ? "已公开"
                          : status === "rejected"
                            ? "已拒绝"
                            : "全部"}
                    </button>
                  ),
                )}
              </div>
              <button
                className="icon-button"
                aria-label="刷新"
                onClick={() => void loadComments(filter)}
              >
                <RefreshCw size={16} />
              </button>
              <button className="button compact" onClick={() => void logout()}>
                <LogOut size={14} />
                退出
              </button>
            </div>
            <div className="admin-comments">
              {comments.length ? (
                comments.map((comment) => (
                  <article key={comment.id}>
                    <header>
                      <div>
                        <strong>{comment.name}</strong>
                        <span>{comment.workTitle}</span>
                      </div>
                      <time dateTime={comment.created_at}>
                        {new Date(comment.created_at).toLocaleString("zh-CN")}
                      </time>
                    </header>
                    <p>{comment.body}</p>
                    <footer>
                      <span className={"review-status " + comment.status}>
                        {comment.status}
                      </span>
                      <button
                        disabled={pendingId === comment.id}
                        onClick={() => void review(comment.id, "approved")}
                      >
                        <Check size={14} />
                        公开
                      </button>
                      <button
                        disabled={pendingId === comment.id}
                        onClick={() => void review(comment.id, "rejected")}
                      >
                        <X size={14} />
                        拒绝
                      </button>
                      {comment.status !== "pending" && (
                        <button
                          disabled={pendingId === comment.id}
                          onClick={() => void review(comment.id, "pending")}
                        >
                          <MessageSquareMore size={14} />
                          退回待审
                        </button>
                      )}
                    </footer>
                  </article>
                ))
              ) : (
                <div className="admin-empty">
                  <MessageSquareMore size={34} />
                  <p>这个分类里没有留言。</p>
                </div>
              )}
            </div>
          </>
        )}
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
