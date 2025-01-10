import Discord , { Events } from "discord.js"
import { IEventFunc } from "../lib/handlers/file-handlers/EventHandler.ts"
import messageConfig from "../config/messages.json" with { type: "json" }
import Debug from "../lib/util/Debug.ts"
import CommandHandler, { ECommandTags } from "../lib/handlers/file-handlers/CommandHandler.ts";


const eventType = Events.InteractionCreate

const eventFunction: IEventFunc<typeof eventType> = async (client, loggerID, interaction) => {

    // Filter command interactions
    if (interaction.isCommand()) 
        processCommand(client, loggerID, interaction)

    // Filter autocomplete interactions
    if (interaction.isAutocomplete()) 
        processAutocomplete(client, loggerID, interaction)
}

const processCommand: IEventFunc<typeof eventType> = async (client, loggerID, interaction) => {

    // For typesafety
    interaction = interaction as Discord.ChatInputCommandInteraction
    
    // Get command
    let ch = CommandHandler.getInstance
    const slashCommand = ch.getSlashCommand(interaction)
    if (!slashCommand) {
        Debug.logError(messageConfig.error.command.processedNonExistentCommand, loggerID)
        console.log(interaction)
        return
    }

    // If command is marked incomplete then check for bot testing role to execute command
    // if (slashCommand.hasTag(ECommandTags.Incomplete) && interaction.member instanceof Discord.GuildMember){

    //     const isBotTester = interaction.member.roles.cache.has(clientconfig.homeGuild.roles.botTesterId)
        
    //     if (!isBotTester) {
    //         const errorMessage = messageConfig.error.userNoTestingRights + `\nOnly users with the <@&${clientconfig.homeGuild.roles.botTesterId}> role can test this command!`
    //         interaction.reply({ embeds: [Util.standardEmbedMessage(interaction.commandName, errorMessage)] })
    //         return 
    //     }  
    // } 

    Debug.log(`${interaction.user.globalName}: /${interaction.commandName} ${interaction.options.data.map((option) => `${option.name}:${option.value}`).join(" ")}`, loggerID)
    ch.executeSlashCommand(interaction)
}

const processAutocomplete: IEventFunc<typeof eventType> = async (client, loggerID, interaction) => {

    // For typesafety
    interaction = interaction as Discord.AutocompleteInteraction

    // Get command
    const slashCommand = CommandHandler.getInstance.getSlashCommand(interaction)
    if (!slashCommand) {
        Debug.logError(messageConfig.error.command.processedNonExistentCommand, loggerID)
        console.log(interaction)
        return
    }

    if(slashCommand.hasAutocomplete())  slashCommand.autocomplete(interaction, client) 
}

const eventData = {
    event: eventType,
    once: false
}

export { eventFunction, eventData }