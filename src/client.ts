import { Client, GatewayIntentBits, Partials } from "discord.js";
import "jsr:@std/dotenv/load";
import Debug from "./lib/util/Debug.ts";
import path from "node:path"
import EventHandler from "./lib/handlers/file-handlers/EventHandler.ts";

export const client = new Client({ intents: [GatewayIntentBits.GuildExpressions], partials: [] });

// const client = new Client({ intents: [] });
const loggerID = path.parse(import.meta.url).base


async function start() {

    Debug.logStartup("Starting client...", loggerID)

    let eh = EventHandler.getInstance
    eh.cacheClient(client)
    await eh.loadEventFolder("src/events")

    await client.login(Deno.env.get("CLIENT_LOGIN_TOKEN"));

    client.emojis.cache.forEach((emoji) => console.log(emoji))
}
start()

// TODO: Figure out how to pass an instance of the user to the economy commands