import { catalogue } from "@/lib/catalogue";
import Archive from "@/components/Archive";
export default function Home() {
  return <Archive data={catalogue} />;
}
