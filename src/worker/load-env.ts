import { config } from "dotenv";

/** Подхватываем те же файлы, что и при локальной разработке Next (без этого `tsx src/worker/index.ts` не видит секреты). */
config({ path: ".env.local" });
config({ path: ".env" });
