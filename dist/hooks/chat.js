function registerChatHooks() {
  Hooks.on("chatMessage", (_chatLog, message, _chatData) => {
    var _a, _b;
    if (!((_a = game.user) == null ? void 0 : _a.isGM)) return true;
    const tray = window.StorytellerCinema.cinemaTray;
    console.log("Storyteller Cinema | chatMessage Hook Call", {
      message,
      isDirectorMode: tray == null ? void 0 : tray.isDirectorMode,
      speakingAs: (_b = tray == null ? void 0 : tray.speakingAs) == null ? void 0 : _b.name
    });
    if ((tray == null ? void 0 : tray.isDirectorMode) && tray.speakingAs) {
      if (message.startsWith("/")) {
        console.log("Storyteller Cinema | Ignoring command message");
        return true;
      }
      console.log("Storyteller Cinema | Intercepting as Subtitle:", message);
      window.StorytellerCinema.say(tray.speakingAs.name, message, {
        portrait: tray.speakingAs.img,
        side: "left"
      });
      return false;
    }
    return true;
  });
  Hooks.on("preCreateChatMessage", (document, data, _options, _userId) => {
    var _a, _b;
    const tray = window.StorytellerCinema.cinemaTray;
    if ((tray == null ? void 0 : tray.speakingAs) && !tray.isDirectorMode && !data.content.startsWith("/") && !((_a = data.rolls) == null ? void 0 : _a.length)) {
      const isNarrator = tray.speakingAs.id === "narrator";
      const speaker = {
        alias: tray.speakingAs.name,
        scene: (_b = canvas.scene) == null ? void 0 : _b.id,
        actor: isNarrator ? null : tray.speakingAs.id,
        token: null
      };
      const updates = { speaker };
      if (isNarrator) {
        updates.style = CONST.CHAT_MESSAGE_STYLES.OOC;
      }
      document.updateSource(updates);
    }
  });
}
export {
  registerChatHooks as r
};
//# sourceMappingURL=chat.js.map
