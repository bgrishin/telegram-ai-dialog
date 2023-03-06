import fs from "fs";

export const log = (str) => {
  const date = new Date().toLocaleString("en-GB");
  console.log(`[${date}] ${str}`);
  fs.appendFileSync("LOG", `[${date}] ${str}`);
};
