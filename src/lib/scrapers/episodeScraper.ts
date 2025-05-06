import * as cheerio from 'cheerio';
import Debug from "../../lib/util/Debug.ts";
import Util from "../../lib/util/Util.ts";
import { existsSync } from "https://deno.land/std@0.224.0/fs/mod.ts";

const scraperLogId = "EpisodeScraper"

export default class EpisodeScraper {

    public static readonly dataFileName = "episode_data.json"
    public static readonly dataFileRelativePath = "./src/config/" + this.dataFileName
    private static readonly URL_BASE = "https://onepiece.fandom.com/wiki/Episode_"
    private static readonly DEFAULT_IMG_URL = ""



    public static async scrapeEpisode(episode: number): Promise<[TEpisodeData, boolean]> {
        Debug.log(`Scraping episode ${episode}...`, scraperLogId)

        const details: TEpisodeData = { imageUrl: "", japaneseInfo: { airdate: "", kanj: "", romaji: "" }, englishInfo: [], statistics: { chapters: [], isFiller: false, noChapters: false, episode: 0, chapterTrouble: false } }
        let content = await fetch(this.URL_BASE + episode)
        let body = await content.text()
        const $ = cheerio.load(body)

        const link = $(".mw-parser-output .portable-infobox .pi-image-thumbnail").attr("src")
        if (!link?.includes("revision")) Debug.logWarning("Link does not contain \"revision\": " + link, scraperLogId)
        details.imageUrl = link?.slice(0, link.indexOf("revision")) ?? this.DEFAULT_IMG_URL

        const japanInfo = this.clean($(".mw-parser-output .portable-infobox section.pi-item.pi-group.pi-border-color").filter((thing, element) => {
            return $(element).find("h2").text().trim() === "Japanese Information";
        }).text());
        this.loadJapaneseInfo(japanInfo.split("\n"), details)

        const englishInfo = this.clean($(".mw-parser-output .portable-infobox section.pi-item.pi-group.pi-border-color").filter((thing, element) => {
            return $(element).find("h2").text().trim() === "English Information";
        }).text());
        this.loadEnglishInfo(englishInfo.split("\n"), details)

        const statistics = this.clean($(".mw-parser-output .portable-infobox section.pi-item.pi-group.pi-border-color").filter((thing, element) => {
            return $(element).find("h2").text().trim() === "Statistics";
        }).text());
        this.loadStatistics(statistics, episode, details)

        const dataNotAvailable = details.imageUrl === "" || details.imageUrl === "https://static.wikia.nocookie.net/onepiece/images/d/d5/NoPicAvailable.png/"
        if (dataNotAvailable) Debug.logWarning(`Data for episode ${episode} is not available!`, scraperLogId)

        return [details, !dataNotAvailable] // [data, isSuccesful]
    }

    public static async scrapeEpisodes(startEpisode: number, endEpisode?: number): Promise<TEpisodeData[]> {

        if (endEpisode == undefined) endEpisode = 999999
        let dataArray = []

        for (let episode = startEpisode; episode <= endEpisode; episode++) {
            const [data, isSuccesful] = await this.scrapeEpisode(episode)
            if (isSuccesful) dataArray.push(data)
            else return dataArray
        }

        return dataArray
    }

    public static async updateDataFile(): Promise<void> {
        Debug.log("Updating episode data file...", scraperLogId)

        if (!this.doesDataFileExist()) {
            Debug.log("Episode data file does not exist, creating one...", scraperLogId)
            const data = await EpisodeScraper.scrapeEpisodes(1)
            EpisodeScraper.writeDataToFile(data)
            return
        }  

        const data = this.loadDataFromFile()
        const lastEpisodeRecorded = data[data.length - 1].statistics.episode
        Debug.log(`Last episode recorded is ${lastEpisodeRecorded}`, scraperLogId)

        const newData = await this.scrapeEpisodes(lastEpisodeRecorded + 1)
        data.push(...newData)
        this.writeDataToFile(data)

        Debug.log("Episode data is up to date!", scraperLogId)
    }

    public static doesDataFileExist(): boolean {
        return existsSync(this.dataFileRelativePath)
    }

    public static writeDataToFile(dataArray: TEpisodeData[]): void {
        Debug.log("Writing data to file...", scraperLogId)
        Deno.writeTextFileSync(this.dataFileRelativePath, JSON.stringify(dataArray))
    }

    public static loadDataFromFile(): TEpisodeData[] {
        Debug.log("Loading episode data from file...", scraperLogId)
        if (!this.doesDataFileExist()) {
            Debug.logWarning("Data file not present", scraperLogId)
            return []
        }
        const data = JSON.parse(Deno.readTextFileSync(this.dataFileRelativePath))
        return data
    }

    private static loadJapaneseInfo(section: string[], stuff: TEpisodeData) {
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

    private static loadEnglishInfo(section: string[], stuff: TEpisodeData) {
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

    private static loadStatistics(sectionString: string, episode: number, stuff: TEpisodeData) {
        stuff.statistics.isFiller = Util.isEpisodeFiller(episode)
        stuff.statistics.noChapters = !sectionString.includes("Chapters")
        stuff.statistics.episode = episode

        const section = sectionString.split("\n")
        for (let i = 0; i < section.length; i++) {
            if (section[i].startsWith("Chapters")) {
                let minChapterIndex = 0
                const chaptersString = section[i + 1]
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
                    stuff.statistics.chapters.push(section[i + 1].replace(/\)(\d)/g, "), $1"))
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

    private static clean(string: string) {
        return string.replace(/\n\s+/g, '\n') // Remove leading spaces on each line
            .replace(/\n{2,}/g, '\n\n') // Reduce multiple blank lines to one
            .replace("’", "'")
            .trim(); // Trim leading/trailing spaces
    }
}

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