import Discord from "discord.js"
import Util from "../../lib/util/Util.ts";
import { ECommandTags, ISlashCommandFunc, ISlashCommandAutocompleteFunc } from "../../lib/handlers/file-handlers/CommandHandler.ts";
import episodesJson from "../../config/episode_data.json" with { type: "json" }
import chaptersJson from "../../config/chapter_data.json" with { type: "json" }
import Debug from "../../lib/util/Debug.ts";

const MAX_EPISODE = episodesJson.length
const queryOption = "episode"

const commandFunction: ISlashCommandFunc = async (interaction, options, client, loggerID) => {

    let episodeIndex = options.getInteger(queryOption) ?? 1
    episodeIndex--
    if (episodeIndex >= MAX_EPISODE) episodeIndex = MAX_EPISODE - 1
    if (episodeIndex < 0) episodeIndex = 0

    const episodeData = episodesJson[episodeIndex]
    const chapSpec = Util.extractChapterFromEpisodeData(episodeData)
    const embed = Util.baseEmbed(false)

    if (episodeData.statistics.noChapters)
        return interaction.reply({ embeds: [embed.setDescription("This episode has no chapters associated with it")] })
    if (!chapSpec.extracted) {
        Debug.logWarning("Unable to find chapter equivalent of episode " + (episodeIndex + 1), loggerID)
        embed.setTitle(episodeData.statistics.chapters[0])
            .setDescription("Unable to find info on this chapter")
        return interaction.reply({ embeds: [embed] })
    }
        

    const chapterData = chaptersJson[chapSpec.chapter - 1]
    const fields: Discord.RestOrArray<Discord.APIEmbedField> = []
    fields.push({ name: "Japanese Title", value: chapterData.chapterInfo.japaneseTitle, inline: true })
    fields.push({ name: "Released", value: chapterData.chapterInfo.releaseDate, inline: true })
    // fields.push({ name: " ", value: " ", inline: true})
    fields.push({ name: "All Related Chapters", value: episodeData.statistics.chapters.join(", "), /**inline: true*/ })
    // fields.push({ name: "Is Filler", value: (episodeData.statistics.isFiller) ? "Yes" : "No", inline: true })
    // fields.push({ name: " ", value: " ", inline: true})

    embed.setTitle(chapterData.chapterInfo.vizTitle)
        .setThumbnail(chapterData.imageUrl)
        .setDescription(`**This Chapter:** [${chapSpec.chapter} (p. ${chapSpec.beginPage}-${chapSpec.endPage})](https://mangafire.to/read/one-piecee.dkw/en/chapter-${chapSpec.chapter})`)
        .setFields(fields)
        .setFooter({ text: `${chapterData.chapterInfo.wsjIssue}: Vol. ${chapterData.chapterInfo.volume} Ch. ${chapterData.chapterInfo.chapter}` + ((episodeData.statistics.isFiller) ? ` (Ep. ${episodeData.statistics.episode} is filler)` : "") })
    
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
    .setName("episode_to_chapter")
    .setDescription("Convert the episode to chapter")
    .addIntegerOption(option =>
        option.setName(queryOption)
            .setDescription("The episode you want to convert")
            .setAutocomplete(true)
            .setRequired(true))
    .toJSON()

const tags: ECommandTags[] = [ECommandTags.Complete, ECommandTags.Utility]

export { commandFunction, autocomplete, buildData, tags }
