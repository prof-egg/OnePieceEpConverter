import Discord from "discord.js"
import Util from "../../lib/util/Util.ts";
import { ECommandTags, ISlashCommandFunc } from "../../lib/handlers/file-handlers/CommandHandler.ts";

const commandFunction: ISlashCommandFunc = async (interaction, options, client, loggerID) => {

    // Defer the reply to get more time to respond
    await interaction.deferReply()

    // Get the time difference between the reply
    // and the original slash command
    const reply = await interaction.fetchReply()
    const clientPing = reply.createdTimestamp - interaction.createdTimestamp

    const title = "Pong!"
    const msg = `**Client Ping:** ${clientPing}ms\n**Websocket Ping:** ${client.ws.ping}ms`
    const pingEmbed = Util.standardEmbedMessage(title, msg)
    interaction.editReply({ embeds: [pingEmbed] })
}

const buildData = new Discord.SlashCommandBuilder()
    .setName("ping")
    .setDescription("Get client and websocket ping")
    .toJSON()

const tags: ECommandTags[] = [ECommandTags.Complete, ECommandTags.Utility]

export { commandFunction, buildData, tags }
