import { randomBytes, scrypt } from "node:crypto";

function hidden(question) {
  if (!process.stdin.isTTY) throw new Error("请在交互式终端中运行此脚本。");
  return new Promise((resolve, reject) => {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    let value = "";
    const onData = (key) => {
      if (key === "\u0003") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        reject(new Error("已取消。"));
      } else if (key === "\r" || key === "\n") {
        process.stdin.off("data", onData);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write("\n");
        resolve(value);
      } else if (key === "\u007f") {
        value = value.slice(0, -1);
      } else if (/^[\x20-\x7e]$/.test(key)) {
        value += key;
      }
    };
    process.stdin.on("data", onData);
  });
}

const first = await hidden("输入管理口令（不会显示）：");
const second = await hidden("再次输入：");
if (first !== second) throw new Error("两次输入不一致。");
if (first.length < 12) throw new Error("管理口令至少需要 12 个字符。");

const N = 32768,
  r = 8,
  p = 1,
  salt = randomBytes(20);
const derived = await new Promise((resolve, reject) =>
  scrypt(
    first,
    salt,
    64,
    { N, r, p, maxmem: 128 * N * r + 1024 * 1024 },
    (error, key) => (error ? reject(error) : resolve(key)),
  ),
);
console.log(
  `ADMIN_PASSWORD_HASH=scrypt:${N}:${r}:${p}:${salt.toString("base64url")}:${derived.toString("base64url")}`,
);
console.log("请把这一行保存到部署平台的私密环境变量，不要提交到 Git。 ");
