import * as cheerio from 'cheerio';
import Debug from "../lib/util/Debug.ts";
import { parseArgs } from "jsr:@std/cli/parse-args";
import Util from "../lib/util/Util.ts";

// const HIANIME_URL = "https://hianime.to/watch/one-piece-100?ep=2142"
// const MIN_EPISODE = 1
// const MAX_EPISODE = 1122
const scraperLogId = "HianimeScraper"
const episodeDetails: THianimeEpisodeData[] = []

const flags = parseArgs(Deno.args, {
//     string: ["max"],
//     default: { max: MAX_EPISODE },
    boolean: ["r", "replace"],
});

Debug.log("Scraping...", scraperLogId)
const $ = cheerio.load(Deno.readTextFileSync("./hianime.html"));
$('.detail-infor-content a.ssl-item').each((index, element) => {
    const englishTitle = $(element).find('.ep-name').text();
    let romanizedTitle = $(element).find('.ep-name').attr('data-jname') || 'No Japanese title';
    if (romanizedTitle == englishTitle) romanizedTitle = "No Japanese title"
    const number = parseInt($(element).attr('data-number') as string);
    const id = parseInt($(element).attr('data-id') as string);
    const link = "https://hianime.to" + $(element).attr('href') as string;
    episodeDetails.push({ englishTitle, romanizedTitle, episode: { number, id, link }})
});

Debug.log("Writing to file...", scraperLogId)
const path = (flags.r || flags.replace) ? "./src/config/hianime_id_data.json" : "hianime_id_data.json"
Deno.writeFileSync(path, new TextEncoder().encode(JSON.stringify(episodeDetails)))
Debug.logImportant("Finished!", scraperLogId)

export type THianimeEpisodeData = { 
    englishTitle: string,
    romanizedTitle: string,
    episode: {
        number: number,
        id: number,
        link: string
    }
}