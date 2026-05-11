/**
 * Chat Hooks for Storyteller Cinema Director Mode
 */
export function registerChatHooks(): void {
    Hooks.on('chatMessage', (_chatLog: any, message: string, _chatData: any) => {
        // Only GMs can use Director Mode
        if (!game.user?.isGM) return true;

        const tray = (window as any).StorytellerCinema.cinemaTray;
        
        console.log("Storyteller Cinema | chatMessage Hook Call", {
            message,
            isDirectorMode: tray?.isDirectorMode,
            speakingAs: tray?.speakingAs?.name
        });

        // Check if Director Mode is ACTIVE and an Actor is SELECTED
        if (tray?.isDirectorMode && tray.speakingAs) {
            // Ignore commands starting with / (ooc, roll, etc)
            if (message.startsWith('/')) {
                console.log("Storyteller Cinema | Ignoring command message");
                return true;
            }

            // Trigger Cinematic Subtitle
            console.log("Storyteller Cinema | Intercepting as Subtitle:", message);
            (window as any).StorytellerCinema.say(tray.speakingAs.name, message, {
                portrait: tray.speakingAs.img,
                side: 'left'
            });

            // Return false to prevent the message from being created in chat
            return false;
        }

        return true;
    });

    /**
     * Fallback for regular chat speaker synchronization 
     */
    Hooks.on('preCreateChatMessage', (document: any, data: any, _options: any, _userId: string) => {
        const tray = (window as any).StorytellerCinema.cinemaTray;
        
        if (tray?.speakingAs && !tray.isDirectorMode && !data.content.startsWith('/') && !data.rolls?.length) {
            const isNarrator = tray.speakingAs.id === 'narrator';
            
            const speaker = {
                alias: tray.speakingAs.name,
                scene: canvas.scene?.id,
                actor: isNarrator ? null : tray.speakingAs.id,
                token: null
            };
            
            const updates: any = { speaker };

            // If it's the narrator, force OOC style to bypass "In-Character" validation
            if (isNarrator) {
                updates.style = CONST.CHAT_MESSAGE_STYLES.OOC;
            }

            document.updateSource(updates);
        }
    });
}
