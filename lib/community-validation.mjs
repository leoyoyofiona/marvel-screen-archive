export function validateComment(value) {
  if (!value || typeof value !== "object") return { error: "留言格式不正确。" };
  if (value.website) return { error: "未能提交，请稍后再试。" };
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const body = typeof value.body === "string" ? value.body.trim() : "";
  if (name.length < 1 || name.length > 24)
    return { error: "昵称请填写 1—24 个字符。" };
  if (body.length < 2 || body.length > 300)
    return { error: "留言请填写 2—300 个字符。" };
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(name + body))
    return { error: "留言包含不支持的控制字符。" };
  if (/https?:\/\/|www\.|<\/?(?:script|iframe)/i.test(name + body))
    return { error: "请勿在留言中发布外链或脚本内容。" };
  return { name, body };
}
export function qualifiedWatchLink(link, now = new Date()) {
  if (!link || !/^https:\/\//.test(link.url ?? "")) return false;
  const age = now.getTime() - Date.parse(link.lastVerifiedAt ?? "");
  return (
    ["720p", "1080p", "4K"].includes(link.resolution) &&
    link.free === true &&
    link.requiresLogin === false &&
    link.requiresSubscription === false &&
    link.hasForcedAds === false &&
    link.complete === true &&
    link.legalSource === true &&
    link.regionUnrestricted === true &&
    link.browserVerified === true &&
    Number.isFinite(age) &&
    age >= 0 &&
    age < 30 * 86400000
  );
}
