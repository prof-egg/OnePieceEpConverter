import { ActivityType, Events } from "discord.js"
import { IEventFunc } from "../lib/handlers/file-handlers/EventHandler.ts"
import Debug from "../lib/util/Debug.ts"
import messageConfig from "../config/messages.json" with { type: "json" }
import clientconfig from "../config/client.json" with { type: "json" }
import CommandHandler from "../lib/handlers/file-handlers/CommandHandler.ts";

const eventType = Events.ClientReady
// const loggerID = "ReadyEvent"

const eventFunction: IEventFunc<typeof eventType> = async (client, loggerID, readyClient) => {

    // Do command handling
    let ch = CommandHandler.getInstance
    ch.cacheData(readyClient)
    await ch.loadSlashCommandFolder("src/commands")

    // Set presence
    readyClient.user.setActivity(messageConfig.clientPresence, { type: ActivityType.Playing });
    Debug.logImportant(`${clientconfig.name} is online!`, loggerID)
}

const eventData = {
    event: eventType,
    once: true
}

export { eventFunction, eventData }