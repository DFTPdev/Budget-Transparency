import fs from "fs";
import path from "path";
import axios from "axios";
export async function getCached(year: number, url: string): Promise<string> {
  const dir = `cache/dpb/${year}`;
  const key = Buffer.from(url).toString("base64").replace(/=+$/,"");
  const p = path.join(dir, `${key}.html`);
  if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  const { data } = await axios.get(url, { responseType: "text", timeout: 30000 });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, data);
  return data;
}