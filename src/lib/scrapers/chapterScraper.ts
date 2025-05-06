import * as cheerio from 'cheerio';
import Debug from "../../lib/util/Debug.ts";
import { existsSync } from "https://deno.land/std@0.224.0/fs/mod.ts";

const scraperLogId = "ChapterScraper"

export default class ChapterScraper {

    public static readonly dataFileName = "chapter_data.json"
    public static readonly dataFileRelativePath = "./src/config/" + this.dataFileName
    private static readonly URL_BASE = "https://onepiece.fandom.com/wiki/Chapter_"
    private static readonly DEFAULT_IMG_URL = ""

    public static async scrapeChapter(chapter: number): Promise<[TChapterData, boolean]> {
        Debug.log(`Scraping chapter ${chapter}...`, scraperLogId)
        
            const details: TChapterData = { imageUrl: "", chapterInfo: { volume: "", chapter: 0, japaneseTitle: "", romanizedTitle: "", vizTitle: "", pages: "", releaseDate: "", wsjIssue: "", episodes: [] } }
            let content = await fetch(this.URL_BASE + chapter)
            let body = await content.text()
            const $ = cheerio.load(body)
        
            const link = $(".mw-parser-output .portable-infobox .pi-image-thumbnail").attr("src")
            if (!link?.includes("revision")) Debug.logWarning("Link does not contain \"revision\": " + link)
            details.imageUrl = link?.slice(0, link.indexOf("revision")) ?? this.DEFAULT_IMG_URL
        
            const chapterInfo = this.clean($(".mw-parser-output .portable-infobox section.pi-item.pi-group.pi-border-color").filter((thing, element) => {
                return $(element).find("h2").text().trim() === "Chapter Info";
            }).text());
            this.loadChapterInfo(chapterInfo.split("\n"), details)

        const dataNotAvailable = details.imageUrl === "" || details.imageUrl === "https://static.wikia.nocookie.net/onepiece/images/d/d5/NoPicAvailable.png/"
        if (dataNotAvailable) Debug.logWarning(`Data for chapter ${chapter} is not available!`, scraperLogId)

        return [details, !dataNotAvailable] // [data, isSuccesful]
    }

    public static async scrapeChapters(startChapter: number, endChapter?: number): Promise<TChapterData[]> {

        if (endChapter == undefined) endChapter = 999999
        let dataArray = []

        for (let chapter = startChapter; chapter <= endChapter; chapter++) {
            const [data, isSuccesful] = await this.scrapeChapter(chapter)
            if (isSuccesful) dataArray.push(data)
            else return dataArray
        }

        return dataArray
    }

    public static async updateDataFile(): Promise<void> {
        Debug.log("Updating chapter data file...", scraperLogId)

        if (!this.doesDataFileExist()) {
            Debug.log("Chapter data file does not exist, creating one...", scraperLogId)
            const data = await ChapterScraper.scrapeChapters(1)
            ChapterScraper.writeDataToFile(data)
            return
        }  

        const data = this.loadDataFromFile()
        const lastChapterRecorded = data[data.length - 1].chapterInfo.chapter
        Debug.log(`Last chapter recorded is ${lastChapterRecorded}`, scraperLogId)

        const newData = await this.scrapeChapters(lastChapterRecorded + 1)
        data.push(...newData)
        this.writeDataToFile(data)

        Debug.log("Chapter data is up to date!", scraperLogId)
    }

    public static doesDataFileExist(): boolean {
        return existsSync(this.dataFileRelativePath)
    }

    public static writeDataToFile(dataArray: TChapterData[]): void {
        Debug.log("Writing data to file...", scraperLogId)
        Deno.writeTextFileSync(this.dataFileRelativePath, JSON.stringify(dataArray))
    }

    public static loadDataFromFile(): TChapterData[] {
        Debug.log("Loading chapter data from file...", scraperLogId)
        if (!this.doesDataFileExist()) {
            Debug.logWarning("Data file not present", scraperLogId)
            return []
        }
        const data = JSON.parse(Deno.readTextFileSync(this.dataFileRelativePath))
        return data
    }



    private static loadChapterInfo(section: string[], stuff: TChapterData) {
        for (let i = 0; i < section.length; i++) {
            if (section[i].startsWith("Volume"))
                stuff.chapterInfo.volume = section[i + 1]
            else if (section[i].startsWith("Chapter"))
                stuff.chapterInfo.chapter = parseInt(section[i + 1])
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

    private static clean(string: string) {
        return string.replace(/\n\s+/g, '\n') // Remove leading spaces on each line
        .replace(/\n{2,}/g, '\n\n') // Reduce multiple blank lines to one
        .replace("’", "'")
        .trim(); // Trim leading/trailing spaces
    }
}

export type TChapterData = { 
    imageUrl: string, 
    chapterInfo: {
        volume: string,
        chapter: number,
        japaneseTitle: string,
        romanizedTitle: string,
        vizTitle: string,
        pages: string,
        releaseDate: string,
        wsjIssue: string,
        episodes: string[]
    }
}