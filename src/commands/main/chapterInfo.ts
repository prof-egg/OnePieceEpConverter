import Discord from "discord.js"
import Util from "../../lib/util/Util.ts";
import { ECommandTags, ISlashCommandFunc, ISlashCommandAutocompleteFunc } from "../../lib/handlers/file-handlers/CommandHandler.ts";
import chaptersJson from "../../config/chapter_data.json" with { type: "json" }

const MAX_Chapter = chaptersJson.length
const queryOption = "chapter"

const commandFunction: ISlashCommandFunc = async (interaction, options, client, loggerID) => {

    let chapterIndex = options.getInteger(queryOption) ?? 1
    chapterIndex--
    if (chapterIndex >= MAX_Chapter) return interaction.reply({embeds: [Util.embedMessage("Sorry, I don't know that chapter!")] })
    if (chapterIndex < 0) chapterIndex = 0

    const chapterData = chaptersJson[chapterIndex]
    const embed = Util.baseEmbed(false)

    const fields: Discord.RestOrArray<Discord.APIEmbedField> = []
    fields.push({ name: "Japanese Title", value: chapterData.chapterInfo.japaneseTitle, inline: true })
    fields.push({ name: "Released", value: chapterData.chapterInfo.releaseDate, inline: true })
    // fields.push({ name: " ", value: " ", inline: true})

    const relatedEpsExist = chapterData.chapterInfo.episodes.length > 0
    fields.push({ name: "Related Episodes", value: (relatedEpsExist) ? chapterData.chapterInfo.episodes.join(", ") : "No episodes related yet", /**inline: true*/ })
    // fields.push({ name: "Is Filler", value: (episodeData.statistics.isFiller) ? "Yes" : "No", inline: true })
    // fields.push({ name: " ", value: " ", inline: true})

    embed.setTitle(chapterData.chapterInfo.vizTitle)
        .setThumbnail(chapterData.imageUrl)
        .setDescription(`**This Chapter:** [${chapterData.chapterInfo.chapter} (p. 1-${chapterData.chapterInfo.pages})](https://mangafire.to/read/one-piecee.dkw/en/chapter-${chapterData.chapterInfo.chapter})`)
        .setFields(fields)
        .setFooter({ text: `${chapterData.chapterInfo.wsjIssue}: Vol. ${chapterData.chapterInfo.volume} Ch. ${chapterData.chapterInfo.chapter}` })
    
    interaction.reply({ embeds: [embed] })
}

const autocomplete: ISlashCommandAutocompleteFunc = async (interaction, options, client, loggerID) => {
    const numbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ]

    // Get the user input as they are typing
    const focusedValue = options.getFocused();
    if (isNaN(focusedValue as unknown as number) || focusedValue == "0" || focusedValue == "" || parseInt(focusedValue) < 0) 
        return interaction.respond(Array.from({ length: 25 }, (_, i) => ({ name: i + 1 + "", value: i + 1})))

    let responseNumbers = stuff(parseInt(focusedValue))
    if (responseNumbers[0] > MAX_Chapter) responseNumbers = []
    if (responseNumbers.length > 25) responseNumbers = responseNumbers.slice(0, 25)
    await interaction.respond(
        responseNumbers.map((num) => ({ name: num + "", value: num + "" })),
    );

    function stuff(num: number): number[] {
        if (num < 0) return []
        let newNumbers: number[] = [num]
        for (const number of numbers) {
            let a = parseInt(num + number)
            if (a > MAX_Chapter) continue
            newNumbers.push(...stuff(a))
        }
        return newNumbers
    }
}

const buildData = new Discord.SlashCommandBuilder()
    .setName("chapter_info")
    .setDescription("Get some info on this chapter")
    .addIntegerOption(option =>
        option.setName(queryOption)
            .setDescription("The chapter you want info on")
            .setAutocomplete(true)
            .setRequired(true))
    .toJSON()

const tags: ECommandTags[] = [ECommandTags.Complete, ECommandTags.Main]

export { commandFunction, autocomplete, buildData, tags }
