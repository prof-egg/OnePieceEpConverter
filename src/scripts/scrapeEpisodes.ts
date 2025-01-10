import * as cheerio from 'cheerio';
import Debug from "../lib/util/Debug.ts";
import fs from "node:fs";
import { parseArgs } from "jsr:@std/cli/parse-args";
import Util from "../lib/util/Util.ts";

const URL_BASE = "https://onepiece.fandom.com/wiki/Episode_"
const MIN_EPISODE = 1
const MAX_EPISODE = 1122
const pageDetails: TEpisodeData[] = []
const scraperLogId = "EpisodeScraper"
const DEFAULT_IMG_URL = ""

const flags = parseArgs(Deno.args, {
    string: ["min", "max"],
    default: { min: MIN_EPISODE, max: MAX_EPISODE },
    boolean: ["r", "replace"],
});

for (let episode = parseInt(flags.min + ""); episode <= parseInt(flags.max + ""); episode++) {
    Debug.log(`Scraping episode ${episode}...`, scraperLogId)

    const details: TEpisodeData = { imageUrl: "", japaneseInfo: { airdate: "", kanj: "", romaji: "" }, englishInfo: [], statistics: { chapters: [], isFiller: false, noChapters: false, episode: 0, chapterTrouble: false }}
    let content = await fetch(URL_BASE + episode)
    let body = await content.text()
    const $ = cheerio.load(body)

    const link = $(".mw-parser-output .portable-infobox .pi-image-thumbnail").attr("src")
    if (!link?.includes("revision")) Debug.logWarning("Link does not contain \"revision\": " + link)
    details.imageUrl = link?.slice(0, link.indexOf("revision")) ?? DEFAULT_IMG_URL

    const japanInfo = clean($(".mw-parser-output .portable-infobox section.pi-item.pi-group.pi-border-color").filter((thing, element) => {
        return $(element).find("h2").text().trim() === "Japanese Information";
    }).text());
    loadJapaneseInfo(japanInfo.split("\n"), details)

    const englishInfo = clean($(".mw-parser-output .portable-infobox section.pi-item.pi-group.pi-border-color").filter((thing, element) => {
        return $(element).find("h2").text().trim() === "English Information";
    }).text());
    loadEnglishInfo(englishInfo.split("\n"), details)
    
    const statistics = clean($(".mw-parser-output .portable-infobox section.pi-item.pi-group.pi-border-color").filter((thing, element) => {
        return $(element).find("h2").text().trim() === "Statistics";
    }).text());
    loadStatistics(statistics, episode, details)
    // console.log(details)
    pageDetails.push(details)
}

Debug.log("Writing to file...", scraperLogId)
const path = (flags.r || flags.replace) ? "./src/config/episode_data.json" : "episode_data.json"
fs.writeFile(path, JSON.stringify(pageDetails), ((err) => (err) ? Debug.logError(err.message, scraperLogId) : null))

Debug.logImportant("Finished!", scraperLogId)

function loadJapaneseInfo(section: string[], stuff: TEpisodeData) {
    for (let i = 0; i < section.length; i++) {
        if (section[i].startsWith("Kanji"))
            stuff.japaneseInfo.kanj = section[i + 1]
        else if (section[i].startsWith("Romaji"))
            stuff.japaneseInfo.romaji = section[i + 1]
        else if (section[i].startsWith("Airdate"))
            stuff.japaneseInfo.airdate = section[i + 1]
        else if (section[i].startsWith("Remaster Airdate"))
            stuff.japaneseInfo.remasterAirdate = section[i + 1]
    }
}

function loadEnglishInfo(section: string[], stuff: TEpisodeData) {
    // let distributorCount = 0
    for (let i = 0; i < section.length; i++) {
        if (section[i].startsWith("Title")) {
            const distributor = section[i - 1]
            const epTitle = section[i + 1]
            const airdate = (i + 3 < section.length && section[i + 2] === "Airdate") ? section[i + 3] : undefined
            const englishInfo = { distributor, epTitle, airdate }
            stuff.englishInfo.push(englishInfo)
        }
    }
}

function loadStatistics(sectionString: string, episode: number, stuff: TEpisodeData) {
    stuff.statistics.isFiller = Util.isEpisodeFiller(episode)
    stuff.statistics.noChapters = !sectionString.includes("Chapters")
    stuff.statistics.episode = episode

    const section = sectionString.split("\n")
    for (let i = 0; i < section.length; i++) {
        if (section[i].startsWith("Chapters")) {
            let minChapterIndex = 0
            const chaptersString = section[i+1]
            if (chaptersString.toLowerCase().includes("filler")) {
                stuff.statistics.noChapters = true
                return stuff.statistics.chapters.push(chaptersString)
            }
                
    
            while (chaptersString.includes("Chapter", minChapterIndex)) {
                let chapterEndIndex = chaptersString.indexOf("Chapter", minChapterIndex + 1)
                if (chapterEndIndex == -1) 
                    chapterEndIndex = chaptersString.length
                stuff.statistics.chapters.push(chaptersString.slice(minChapterIndex, chapterEndIndex).trim())
                minChapterIndex = chapterEndIndex
            }

            if (stuff.statistics.chapters.length == 0) {
                stuff.statistics.chapters.push(section[i+1].replace(/\)(\d)/g, "), $1"))
                stuff.statistics.chapterTrouble = true
            }

            return
        }
    }
    if (stuff.statistics.chapters.length > 0) return
    if (stuff.statistics.isFiller)
        stuff.statistics.chapters.push("Assumed filler")
    else 
        stuff.statistics.chapters.push("No chapters listed")
    stuff.statistics.noChapters = true
    stuff.statistics.chapterTrouble = true
}

function clean(string: string) {
    return string.replace(/\n\s+/g, '\n') // Remove leading spaces on each line
    .replace(/\n{2,}/g, '\n\n') // Reduce multiple blank lines to one
    .replace("’", "'")
    .trim(); // Trim leading/trailing spaces
}
// deno --allow-all test.ts
export type TEpisodeData = { 
    imageUrl: string, 
    japaneseInfo: {
        kanj: string,
        romaji: string,
        airdate: string,
        remasterAirdate?: string
        // opening: string,
        // ending: string,
        // season: string,
        // piece: string | null,
    },
    englishInfo: {
        distributor: string,
        epTitle: string,
        airdate?: string,
        // epNumber?: string,
    }[],
    statistics: {
        chapters: string[],
        isFiller: boolean,
        noChapters: boolean,
        chapterTrouble: boolean,
        episode: number
    }
}