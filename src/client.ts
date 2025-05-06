import { Client, GatewayIntentBits  } from "discord.js";
import "jsr:@std/dotenv/load";
import Debug from "./lib/util/Debug.ts";
import path from "node:path"
import EventHandler from "./lib/handlers/file-handlers/EventHandler.ts";
import EpisodeScraper from "./lib/scrapers/episodeScraper.ts";
import ChapterScraper from "./lib/scrapers/chapterScraper.ts";
import { CronJob } from 'cron';

export const client = new Client({ intents: [GatewayIntentBits.GuildExpressions], partials: [] });

// const client = new Client({ intents: [] });
const loggerID = path.parse(import.meta.url).base


async function start() {

    Debug.logStartup("Starting client...", loggerID)

    await EpisodeScraper.updateDataFile()
    await ChapterScraper.updateDataFile()
    
    CronJob.from({
        cronTime: "0 0 0 * * *", 
        onTick: async () => {
            try {
                await EpisodeScraper.updateDataFile();
                await ChapterScraper.updateDataFile();
            } catch (error) {
                Debug.logError(`Error during cron job execution: ${error}`, loggerID);
            }
        }, 
        start: true, 
        timeZone: "system"
    })

    let eh = EventHandler.getInstance
    eh.cacheClient(client)
    await eh.loadEventFolder("src/events")

    await client.login(Deno.env.get("CLIENT_LOGIN_TOKEN"));
}
start()

// TODO: Figure out how to pass an instance of the user to the economy commands