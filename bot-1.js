import TelegramBot from "node-telegram-bot-api";
import "dotenv/config";
import { secondBot, triggerSecond } from "./bot-2.js";
import { sleep } from "./common/sleep.js";
import { log } from "./common/log.js";
import { Chat } from "./common/chat.js";
import { askAIRateLimited, INTERVAL } from "./common/rate-limit.js";

const BOT_TOKEN = process.env.TELEGRAM_TOKEN_1;

export const firstBot = new TelegramBot(BOT_TOKEN, { polling: true });

const CHATS = {};

export const triggerFirst = async (msg, robot) => {
  const isChat = msg.chat.id < 0;
  if (!msg.text || !msg.chat || !isChat) return;

  const { first_name, username, id } = await firstBot.getMe();
  const { first_name: first_name_second } = await secondBot.getMe();

  const chatId = msg?.chat?.id;

  let chat = CHATS[chatId];
  if (!chat) {
    CHATS[chatId] = chat = new Chat(msg.chat);
    log("new chat " + JSON.stringify(msg.chat));
  }

  chat.put(msg);

  if (msg?.text === "/clear") {
    chat.clear();
    await firstBot.sendMessage(chatId, "🗑️ Cleared.");
    return;
  }

  const options = {
    disable_web_page_preview: true,
  };

  let text = null,
    msgid;

  const put = async (add) => {
    if (text && msgid) {
      log(`[${chatId}] < ${add}`);
      text += "\n" + add;
      try {
        await firstBot.editMessageText(text, {
          disable_web_page_preview: true,
          chat_id: chatId,
          message_id: msgid,
          parse_mode: "Markdown",
        });
      } catch (e) {
        await firstBot.editMessageText(text, {
          disable_web_page_preview: true,
          chat_id: chatId,
          message_id: msgid,
        });
      }
    } else {
      log(`[${chatId}] < ${(text = add)}`);
      try {
        const msg = await firstBot.sendMessage(chatId, text, {
          ...options,
          parse_mode: "Markdown",
        });
        msgid = msg.message_id;
      } catch (e) {
        const msg = await firstBot.sendMessage(chatId, text, options);
        msgid = msg.message_id;
      }
    }
  };

  const ask = async (messages, i = 0) => {
    await firstBot.sendChatAction(chatId, "typing");

    let airesponse;
    try {
      airesponse = await askAIRateLimited(chatId, [
        ...chat.instruction(first_name, username, first_name_second),
        ...messages,
      ]);
    } catch (e) {
      console.log(e);
      if (i < 3) {
        log(`[${chatId}] retry again`);
        firstBot.sendChatAction(chatId, "typing");
        setTimeout(() => ask(messages, i + 1), INTERVAL * (1 + i));
      } else {
        await firstBot.sendMessage(chatId, "Oops, there was the error...");
      }
      return;
    }
    let { response, tokens } = airesponse;

    if (!response) {
      response = "Oops error.";
    }

    if (/^<.{0,100}>[^,]/g.test(response))
      response = response.substring(response.indexOf(">") + 1);
    response = response.replace(/<(.{0,100})>/g, "$1");

    response = response?.trim?.() || "";

    chat.put({
      from: { first_name, username },
      chat: msg.chat,
      text: response,
    });

    await put((i > 0 ? "\n" : "") + response);

    await sleep(5000);

    await triggerSecond(
      {
        text: response,
        chat: {
          id: chat.chat.id,
          title: chat.chat.title,
          type: chat.chat.type,
        },
        from: {
          id: id,
          is_bot: true,
          first_name: first_name,
          username: username,
          language_code: "ru",
        },
        message_id: Math.floor(Math.random() * 100000000),
      },
      true
    );
  };

  if (
    robot ||
    msg.text?.indexOf?.("@" + username) >= 0 ||
    msg?.text?.toLowerCase?.()?.startsWith?.(first_name.toLowerCase()) ||
    (msg?.reply_to_message?.from?.username === username &&
      !/^@[a-zA-Z0-9_]+$/g.test(msg.text || "")) ||
    (msg?.text?.endsWith?.("?") &&
      chat?.messages?.[chat?.messages?.length - 2]?.from?.username ===
        username &&
      chat?.messages?.[chat?.messages?.length - 2]?.reply_to_message?.from
        ?.username === username) ||
    Math.random() <= 0.002
  ) {
    log(
      `[${chatId}] {${msg?.from?.first_name} ${msg?.from?.last_name}${
        msg?.from?.username ? " @" + msg?.from?.username : ""
      }} > ${msg?.text}`
    );

    const messages = [
      ...chat.messages
        .map((msg) => {
          if (msg.from?.username === "system")
            return { role: "system", content: msg.text };
          if (msg.from?.username === username)
            return { role: "assistant", content: msg.text };
          return {
            role: "user",
            content: `<${msg.from?.first_name || ""} ${
              msg.from?.last_name || ""
            }> ${msg.text.substring(0, 1000)}`,
          };
        })
        .filter((msg) => !!msg.content),
    ];

    await ask(messages);
  }
};

(async function () {
  const { first_name, username } = await firstBot.getMe();

  log("bot @" + username + " inited " + first_name);

  firstBot.on("message", async (msg) => {
    await triggerFirst(msg);
  });
})();
