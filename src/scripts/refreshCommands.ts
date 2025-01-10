import "jsr:@std/dotenv/load";

import { parseArgs } from "jsr:@std/cli/parse-args";
import CommandHandler from "../lib/handlers/file-handlers/CommandHandler.ts";

const flags = parseArgs(Deno.args, {
    boolean: ["g", "global"],
});

function refreshCommands(): Promise<void> {
    return new Promise(async (resolve) => {
        let ch = CommandHandler.getInstance
        await ch.loadSlashCommandFolder("src/commands")
        await ch.refreshSlashCommandRegistry(Deno.env.get("CLIENT_LOGIN_TOKEN"), flags.g || flags.global)
        resolve()
    })
}

refreshCommands()