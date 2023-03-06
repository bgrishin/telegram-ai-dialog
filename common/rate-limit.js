import https from "https";
import "dotenv/config";

const TOKEN = process.env.OPEN_AI_TOKEN;

const askAI = (messages) =>
  new Promise((resolve, reject) =>
    https
      .request(
        {
          method: "POST",
          host: "api.openai.com",
          path: "/v1/chat/completions",
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            "Content-Type": "application/json",
          },
        },
        (res) => {
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("error", reject);
          res.on("end", () => {
            const json = JSON.parse(Buffer.concat(chunks).toString());
            if (json?.error?.type) reject();
            else
              resolve({
                response: json?.choices?.[0]?.message?.content,
                tokens: json?.usage?.total_tokens || 0,
              });
          });
        }
      )
      .on("error", reject)
      .end(
        JSON.stringify({
          model: "gpt-3.5-turbo",
          temperature: 0,
          presence_penalty: 1,
          frequency_penalty: 1.2,
          messages,
        })
      )
  );

export const askAIRateLimited = (chatId, messages) => {
  const alreadyAskIndex = asks.findIndex((ask) => ask.chatId === chatId);
  if (asks[alreadyAskIndex]?.waiting) {
    asks.splice(alreadyAskIndex, 1);
  }
  return new Promise((resolve, reject) =>
    asks.push({ chatId, messages, resolve, reject, waiting: true })
  );
};

const asks = [];

export const INTERVAL = (1000 * 60) / 20;

const processAsks = async () => {
  const lastAsk = asks.shift();
  if (!lastAsk) {
    setTimeout(processAsks, INTERVAL);
    return;
  }

  lastAsk.waiting = false;
  askAI(lastAsk.messages)
    .then((response) => lastAsk.resolve(response))
    .catch((error) => {
      console.log(error);
      return lastAsk.reject(error);
    })
    .finally(() => setTimeout(processAsks, INTERVAL));
};

setTimeout(processAsks, INTERVAL);
