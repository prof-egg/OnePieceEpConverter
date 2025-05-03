import Discord from "discord.js"
import Util from "../../lib/util/Util.ts";
import { ECommandTags, ISlashCommandFunc, ISlashCommandAutocompleteFunc } from "../../lib/handlers/file-handlers/CommandHandler.ts";
import episodesJson from "../../config/episode_data.json" with { type: "json" }

const MAX_EPISODE = episodesJson.length
const queryOption = "episode"

const commandFunction: ISlashCommandFunc = async (interaction, options, client, loggerID) => {

    let episodeIndex = options.getInteger(queryOption) ?? 1
    episodeIndex--
    if (episodeIndex >= MAX_EPISODE) return interaction.reply({embeds: [Util.embedMessage("Sorry, I don't know that episode!")] })
    if (episodeIndex < 0) episodeIndex = 0

    const episodeData = episodesJson[episodeIndex]
    const englishInfo = episodeData.englishInfo[episodeData.englishInfo.length - 1]
    const episode = episodeData.statistics.episode 
    
    const fields: Discord.RestOrArray<Discord.APIEmbedField> = []
    const isRemastered = episodeData.japaneseInfo.remasterAirdate != undefined
    fields.push({ name: "Japanese Title", value: episodeData.japaneseInfo.kanj, inline: true })
    fields.push({ name: "Released", value: episodeData.japaneseInfo.airdate, inline: true })
    if (isRemastered) fields.push({ name: " ", value: " ", inline: true})
    fields.push({ name: "Related Chapters", value: episodeData.statistics.chapters.join(", "), inline: isRemastered })
    if (isRemastered) {
        fields.push({ name: "Remastered", value: episodeData.japaneseInfo.remasterAirdate as string, inline: true})
        fields.push({ name: " ", value: " ", inline: true})
    }
        
    const embed = Util.baseEmbed(false)
        .setTitle(englishInfo.epTitle + ((episodeData.statistics.isFiller) ? " (Filler)" : ""))
        .setThumbnail(episodeData.imageUrl)
        .setDescription(`**This Episode:** [${episode}](https://animekai.to/watch/one-piece-dk6r#ep=${episode})`)
        .setFields(fields)
        .setFooter({ text: (englishInfo.airdate) ? `${englishInfo.distributor} Airdate: ${englishInfo.airdate}` : englishInfo.distributor })

    
    interaction.reply({ embeds: [embed] })
}

const autocomplete: ISlashCommandAutocompleteFunc = async (interaction, options, client, loggerID) => {
    const numbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ]

    // Get the user input as they are typing
    const focusedValue = options.getFocused();
    if (isNaN(focusedValue as unknown as number) || focusedValue == "0" || focusedValue == "" || parseInt(focusedValue) < 0) 
        return interaction.respond(Array.from({ length: 25 }, (_, i) => ({ name: i + 1 + "", value: i + 1})))

    let responseNumbers = stuff(parseInt(focusedValue))
    if (responseNumbers[0] > MAX_EPISODE) responseNumbers = []
    if (responseNumbers.length > 25) responseNumbers = responseNumbers.slice(0, 25)
    await interaction.respond(
        responseNumbers.map((num) => ({ name: num + "", value: num + "" })),
    );

    function stuff(num: number): number[] {
        if (num < 0) return []
        let newNumbers: number[] = [num]
        for (const number of numbers) {
            let a = parseInt(num + number)
            if (a > MAX_EPISODE) continue
            newNumbers.push(...stuff(a))
        }
        return newNumbers
    }
}

const buildData = new Discord.SlashCommandBuilder()
    .setName("episode_info")
    .setDescription("Get some info on this episode")
    .addIntegerOption(option =>
        option.setName(queryOption)
            .setDescription("The episode you want info on")
            .setAutocomplete(true)
            .setRequired(true))
    .toJSON()

const tags: ECommandTags[] = [ECommandTags.Complete, ECommandTags.Main]

export { commandFunction, autocomplete, buildData, tags }
