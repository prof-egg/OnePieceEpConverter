import * as cheerio from 'cheerio';
import Debug from "../lib/util/Debug.ts";
import fs from "node:fs";
import { parseArgs } from "jsr:@std/cli/parse-args";


const URL_BASE = "https://onepiece.fandom.com/wiki/Chapter_"
const MIN_CHAPTER = 1
const MAX_CHAPTER = 1135
const pageDetails: TChapterData[] = []
const scraperLogId = "ChapterScraper"
const DEFAULT_IMG_URL = ""

const flags = parseArgs(Deno.args, {
    string: ["min", "max"],
    default: { min: MIN_CHAPTER, max: MAX_CHAPTER },
    boolean: ["r", "replace"],
});

for (let chapter = parseInt(flags.min + ""); chapter <= parseInt(flags.max + ""); chapter++) {
    Debug.log(`Scraping chapter ${chapter}...`, scraperLogId)

    const details: TChapterData = { imageUrl: "", chapterInfo: { volume: "", chapter: "", japaneseTitle: "", romanizedTitle: "", vizTitle: "", pages: "", releaseDate: "", wsjIssue: "", episodes: [] } }
    let content = await fetch(URL_BASE + chapter)
    let body = await content.text()
    const $ = cheerio.load(body)

    const link = $(".mw-parser-output .portable-infobox .pi-image-thumbnail").attr("src")
    if (!link?.includes("revision")) Debug.logWarning("Link does not contain \"revision\": " + link)
    details.imageUrl = link?.slice(0, link.indexOf("revision")) ?? DEFAULT_IMG_URL

    const chapterInfo = clean($(".mw-parser-output .portable-infobox section.pi-item.pi-group.pi-border-color").filter((thing, element) => {
        return $(element).find("h2").text().trim() === "Chapter Info";
    }).text());
    loadChapterInfo(chapterInfo.split("\n"), details)
    
    pageDetails.push(details)
}

Debug.log("Writing to file...", scraperLogId)
const path = (flags.r || flags.replace) ? "./src/config/chapter_data.json" : "chapter_data.json"
fs.writeFile(path, JSON.stringify(pageDetails), ((err) => (err) ? Debug.logError(err.message, scraperLogId) : null))

Debug.logImportant("Finished!", scraperLogId)

function loadChapterInfo(section: string[], stuff: TChapterData) {
    for (let i = 0; i < section.length; i++) {
        if (section[i].startsWith("Volume"))
            stuff.chapterInfo.volume = section[i + 1]
        else if (section[i].startsWith("Chapter"))
            stuff.chapterInfo.chapter = section[i + 1]
        else if (section[i].startsWith("Japanese Title"))
            stuff.chapterInfo.japaneseTitle = section[i + 1]
        else if (section[i].startsWith("Romanized Title"))
            stuff.chapterInfo.romanizedTitle = section[i + 1]
        else if (section[i].startsWith("Viz Title"))
            stuff.chapterInfo.vizTitle = section[i + 1]
        else if (section[i].startsWith("Pages"))
            stuff.chapterInfo.pages = section[i + 1]
        else if (section[i].startsWith("Release Date"))
            stuff.chapterInfo.releaseDate = section[i + 1].replace("[ref]", "")
        else if (section[i].startsWith("WSJ Issue"))
            stuff.chapterInfo.wsjIssue = section[i + 1]
        else if (section[i].startsWith("Anime"))
            stuff.chapterInfo.episodes = section[i + 1].replace(/\)([a-zA-Z])/g, ')#%$1').split("#%")
    }
}

function clean(string: string) {
    return string.replace(/\n\s+/g, '\n') // Remove leading spaces on each line
    .replace(/\n{2,}/g, '\n\n') // Reduce multiple blank lines to one
    .replace("’", "'")
    .trim(); // Trim leading/trailing spaces
}
// deno --allow-all test.ts
export type TChapterData = { 
    imageUrl: string, 
    chapterInfo: {
        volume: string,
        chapter: string,
        japaneseTitle: string,
        romanizedTitle: string,
        vizTitle: string,
        pages: string,
        releaseDate: string,
        wsjIssue: string,
        episodes: string[]
    }
}