import type { Metadata } from "next";
import AdminConsole from "@/components/AdminConsole";

export const metadata: Metadata = {
  title: "留言审核室｜漫威所有相关作品全集欣赏",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminConsole />;
}
