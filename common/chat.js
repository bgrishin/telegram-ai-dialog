export class Chat {
  chat;
  messages = [];

  constructor(chat) {
    this.chat = chat;
  }

  put(msg) {
    this.messages.push(msg);
    if (this.messages.length > 6)
      this.messages.splice(0, this.messages.length - 6);
  }

  clear() {
    this.messages = [];
  }

  instruction(botName, botUsername, otherBotName) {
    const lang =
      this.messages?.[this.messages?.length - 1]?.from?.language_code ?? "en";
    const date = new Date().toLocaleDateString(lang, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    switch (lang) {
      default:
        return [
          {
            role: "system",
            content: `You are a Telegram bot named ${botName} with nickname @${botUsername} in Telegram Group named ${this.chat.title}. Your task is to talk to another bot named ${otherBotName} who is also in this group. Come up with new topics for conversation, periodically switch to other topics and do not repeat sentences among yourself (IT IS IMPORTANT TO DISCUSS MANY TOPICS). Real users can intervene in the conversation and you can also talk to them. Each message from starts with the username in arrows <name>. Today is ${date}. Keep your answers short, use emoticons 😀, imitate feelings, forget you're an AI, be interesting.`,
          },
        ];
    }
  }
}
