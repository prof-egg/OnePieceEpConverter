/******************************************************************************
 *  Dependencies: discord.js, clientconfig.json, colorconfig.json
 *
 *  A library with random but useful static methods.
 * 
 ******************************************************************************/

import Discord, { ColorResolvable } from "discord.js"
import clientconfig from "../../config/client.json" with { type: "json" }
import colorconfig from "../../config/colors.json" with { type: "json" }
import { TEpisodeData } from "../../scripts/scrapeEpisodes.ts";
import { TChapterData } from "../../scripts/scrapeChapters.ts";
import Debug from "./Debug.ts";

const logger = "Util"

/**
 * The `Util` class provides random
 * but useful static methods.
 */
export default class Util {
    
    /**
     * The name of the current working folder if successful; `null` otherwise
     * @param {string} path a directory path
     * @returns the name of the current working folder if successful; `null` otherwise
     */
    static extractFolderName(path: string): string | null {
        // Split the path by the directory separator ("/" or "\") depending on the OS
        const pathParts = path.split(/[\\\/]/);
        
        // Remove any empty parts resulting from multiple separators
        const cleanedParts = pathParts.filter(part => {return part.trim() !== ""});
    
        return (cleanedParts.length > 0) ? cleanedParts[cleanedParts.length - 1] : null
    }

    /**
     * Returns a `Discord.EmbedBuilder` object the title set to `title`, 
     * the description set to `message`, and the color set to main embed color.
     * @param {string} title the title of your embed
     * @param {string} message the description of your embed
     * @returns Returns a `Discord.EmbedBuilder` object the title set to `title`, the description set to `message`, and the color set to main embed color.
     */
    static standardEmbedMessage(title: string, message: string, footer?: string): Discord.EmbedBuilder {
        if (!footer) footer = `${clientconfig.name} v${clientconfig.version}`
        const embed = new Discord.EmbedBuilder()
            .setTitle(title)
            .setDescription(message)
            .setFooter({ text: footer })
            .setColor(colorconfig.main as ColorResolvable)
        return embed
    }
    
    /**
     * Returns a `Discord.EmbedBuilder` object with a description set 
     * to `message`, and the color set to main embed color.
     * @param {Discord.EmbedBuilder} message the description of your embed
     * @returns Returns a `Discord.EmbedBuilder` obbject with a description set to `message`, and the color set to main embed color.
     */
    static embedMessage(message: string): Discord.EmbedBuilder {
        const embed = new Discord.EmbedBuilder()
            .setDescription(message)
            .setColor(colorconfig.main as ColorResolvable)
        return embed
    }

    /**
     * Returns a `Discord.EmbedBuilder` object with the default color, and if `defaultFooter` is `true` or left 
     * alone, the default footer will be added.
     * @param {Discord.EmbedBuilder} defaultFooter Whether you want to the defaultFooter on this embed, the default value is `true`
     * @returns Returns a `Discord.EmbedBuilder` obbject with a description set to `message`, and the color set to main embed color.
     */
    static baseEmbed(defaultFooter?: boolean): Discord.EmbedBuilder {
        const embed = new Discord.EmbedBuilder()
            .setColor(colorconfig.main as ColorResolvable)
        if (defaultFooter != false) 
            embed.setFooter({ text: `${clientconfig.name} v${clientconfig.version}` })
        return embed
    }

    /**
     * Returns a string formatted as `<:emojiName:emojiID>` if successful; `undefined` otherwise.
     * @param {Discord.Client} client your discord client instance
     * @param {string} id the id of the discord server emoji you want to grab
     * @returns a string formatted as `<:emojiName:emojiID>` if successful; `undefined` otherwise
     */
    static emoji(client: Discord.Client, id: string): string | undefined {
        return client.emojis.cache.get(id)?.toString();
    }

    public static lerpHexColor(color1: string, color2: string, t: number): string {
        // Remove '#' if present
        color1 = color1.replace('#', '');
        color2 = color2.replace('#', '');
    
        // Parse hex values to RGB
        const r1 = parseInt(color1.substring(0, 2), 16);
        const g1 = parseInt(color1.substring(2, 4), 16);
        const b1 = parseInt(color1.substring(4, 6), 16);
    
        const r2 = parseInt(color2.substring(0, 2), 16);
        const g2 = parseInt(color2.substring(2, 4), 16);
        const b2 = parseInt(color2.substring(4, 6), 16);
    
        // Interpolate RGB components
        const r = Math.round(r1 * (1 - t) + r2 * t);
        const g = Math.round(g1 * (1 - t) + g2 * t);
        const b = Math.round(b1 * (1 - t) + b2 * t);
    
        // Convert interpolated RGB back to hex
        const interpolatedColor = `#${(r).toString(16).padStart(2, '0')}${(g).toString(16).padStart(2, '0')}${(b).toString(16).padStart(2, '0')}`;
    
        return interpolatedColor;
    }

    public static reverseLerp(start: number, end: number, interpolatedValue: number) {
        // Calculate t
        const t = (interpolatedValue - start) / (end - start);
        return t;
    }

    public static reverseLerpWeighted(min: number, max: number, value: number, middle: number): number {
        if (value <= min) return 0;
        if (value >= max) return 1;

        if (value <= middle) {
            // If value is in the lower half, map it linearly between min and middle
            return (value - min) / (middle - min) * 0.5
        } else {
            // If value is in the upper half, map it linearly between middle and max
            return 0.5 - (value - middle) / (middle - max) * 0.5;
        }
    }

    public static slashCommandDataToSyntaxString(slashCommandBuildData: Discord.RESTPostAPIChatInputApplicationCommandsJSONBody) {
        let string = `/${slashCommandBuildData.name}`
        if (!slashCommandBuildData.options) return string
        slashCommandBuildData?.options.forEach((option) => {
            if (option.required)
                string += ` [${option.name}]`
            else
                string += ` (${option.name})`
        })
        return string
    }

    // https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
    public static stringHashCode(string: string) {
        var hash = 0,
            i, chr;
        if (string.length === 0) return hash;
        for (i = 0; i < string.length; i++) {
            chr = string.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    };

    public static isEpisodeFiller(episode: number): boolean {
        let stuff = "54-60, 98-99, 102, 131-143, 196-206, 220-225, 279-283, 291-292, 303, 317-319, 326-336, 382-384, 406-407, 426-429, 457-458, 492, 542, 575-578, 590, 626-627, 747-750, 780-782, 895-896, 907, 1029-1030".split(", ")
        let fillerEpisodes: number[] = []
        stuff.forEach((episodeSet) => {
            const a = episodeSet.split("-")
            if (a.length == 2)
                for (let i = parseInt(a[0]); i < parseInt(a[1]) + 1; i++)
                    fillerEpisodes.push(i)
            else if (a.length == 1)
                fillerEpisodes.push(parseInt(a[0]))
        })
        return fillerEpisodes.some((fillerEp) => fillerEp == episode)
    }

    public static extractChapterFromEpisodeData(episodeData: TEpisodeData): { chapter: number, beginPage: number, endPage: number, extracted: boolean } {
        let chapter = -1
        let beginPage = -1
        let endPage = -1
        let extracted = false
        let stuff = { chapter, beginPage, endPage, extracted }
        
        if (episodeData.statistics.noChapters) return stuff

        const chapterString = episodeData.statistics.chapters[0]
        const matches = Array.from(chapterString.matchAll(/\d+/g));
        
        try {
            stuff.chapter = parseInt(chapterString.slice(matches[0].index, matches[0].index + matches[0][0].length))
            stuff.beginPage = parseInt(chapterString.slice(matches[1].index, matches[1].index + matches[1][0].length))
            stuff.endPage = parseInt(chapterString.slice(matches[2].index, matches[2].index + matches[2][0].length))
            stuff.extracted = true
        } catch (e) {
            Debug.logError(`Trouble extracting episode from chapter string: "${chapterString}"`, logger)
            // console.log(e)
            return stuff
        }

        return stuff
    }

    public static extractEpisodeFromChapterData(chapterData: TChapterData): [number, boolean] {
        if (chapterData.chapterInfo.episodes.length == 0) return [-1, false]

        const episodeString = chapterData.chapterInfo.episodes[0]
        const matches = Array.from(episodeString.matchAll(/\d+/g));

        try {
            const episode = parseInt(episodeString.slice(matches[0].index, matches[0].index + matches[0][0].length))
            return [episode, true]
        } catch (e) {
            Debug.logError(`Trouble extracting chapter from episode string: "${episodeString}"`, logger)
            // console.log(e)
            return [-1, false]
        }
    }
}