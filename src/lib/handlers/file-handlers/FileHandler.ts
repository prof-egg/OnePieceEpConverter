/******************************************************************************
 *  Dependencies: discord.js, Debug.ts, Util.ts, clientconfig.json
 *
 *  CommandHandler - Static class to load and execute slash commands.
 *  SlashCommandFile - Represents a slash command file as an object with some qol attributes.
 *  TSlashCommandFileData - Acts as typesafety when performing a `require()` on a file.
 *  ISlashCommandFunc - Acts as typesafety for slash command file functions.
 *  ECommandTags - Identifiers used to tag and manage slash command files.
 * 
 ******************************************************************************/

import Discord from "discord.js"
import fs from "node:fs"
import path from "node:path"
import Debug, { EColorEscape } from "../../util/Debug.ts"
import Util from "../../util/Util.ts";

const loggerID = path.parse(import.meta.url).base

/**
 * The `CommandHandler` class is a static class meant for handling slash commands.
 * It uses a `Discord.Collection` as its backing data structure for storage and
 * retrieval of `SlashCommandFile` objects.
 * @see FileHandler.loadGenericFolder
 * @see FileHandler.refreshSlashCommandRegistry
 * @see FileHandler.cacheData
 * @see GenericFile
 */
export default abstract class FileHandler<Key, TFileData, FileObject extends GenericFile> {

    // <key: commandName, value: SlashCommandFile> 
    protected fileObjectCollection: Discord.Collection<Key, FileObject> = new Discord.Collection();

    /**
     * Recursively finds all .ts files in the specified 
     * folder and attempts to load them as slash commands.
     * **DOES NOT** work when folder path or any recursive 
     * folder path contains a period.
     * @param {string} folderPath Path to the folder you of files you want to recursively load
     */
    protected loadGenericFolder(folderPath: string): Promise<void> {
        return new Promise(async (resolve) => {
            
            // load js files from folder into an array
            try {
                const paths = fs.readdirSync(folderPath)
                var folders = paths.filter(f => { return !f.includes(".") });
                var jsfiles = paths.filter(f => { return f.split(".").pop() === "ts" });
            } catch (e) {
                Debug.logError(e as string, loggerID)
                console.log(e)
                return resolve()
            }

            // load files in jsfiles array if any
            if (jsfiles.length > 0) {
                const folderName = Util.extractFolderName(folderPath);
                let filesLoaded = 0;
                Debug.log(`Loading ${jsfiles.length} files from ${folderName}...`, loggerID, EColorEscape.YellowFG)
                for (let i = 0; i < jsfiles.length; i++) {
                    const file = jsfiles[i]
                    const sucessfulLoad = await this.loadGenericFile(`${folderPath}/${file}`)
                    if (sucessfulLoad) filesLoaded++
                }
                Debug.log(`Loaded ${filesLoaded} files!`, loggerID)
            }

            // TODO: Change this code to use Promise.all()
            // Recurse on any folders found
            for (let i = 0; i < folders.length; i++) {
                const path = `${folderPath}/${folders[i]}`
                await this.loadGenericFolder(path)
            }

            resolve()
        })
    }

    /**
     * Attempts to laod and store file data as a `SlashCommandFile` object. 
     * @param {string} localFilePath The path to the file you want to load
     * @returns `true` if loaded successfully; `false` otherwise
     */
    protected loadGenericFile(localFilePath: string): Promise<boolean> {
        return new Promise(async (resolve) => {
            
            try { // Import the file data and store it into the fileData variable
                const filePath = `file://${Deno.cwd()}/${localFilePath}`
                var fileData: TFileData = await import(filePath)
            } catch (e) {
                Debug.logError(e as string, loggerID)
                console.log(e)
                return resolve(false)
            }
            const fileName = path.parse(localFilePath).base

            // Verify file. Subclasses are responsible for logging
            // any errors are warnings to the terminal using this method
            let isVerified = this.verifyFileData(fileName, fileData)
            if (!isVerified) resolve(false)

            // Load command function and tags into their respective collections, using the command name as the key
            const fileObject = this.generateFileObject(fileName, fileData)
            const key = this.generateFileObjectKey(fileObject)
            this.fileObjectCollection.set(key, fileObject);
            this.onSuccessfulFileObjectLoad(fileObject)
    
            // Return true for sucessful loading
            resolve(true)
        })
    }

    protected abstract verifyFileData(fileName: string, fileData: TFileData): boolean

    protected abstract generateFileObject(fileName: string, fileData: TFileData): FileObject

    protected abstract generateFileObjectKey(fileObject: FileObject): Key

    protected onSuccessfulFileObjectLoad(fileObject: FileObject): void {}

    /**
     * 
     * @param {Key} key 
     * @returns 
     */
    protected getFileObject(key: Key): FileObject | undefined {
        return this.fileObjectCollection.get(key)
    }

    public get getFileObjectData() {
        return this.fileObjectCollection.clone()
    }
}

/**
 * The `SlashCommandFile` class represents an instance of the data found in 
 * a slash command file with a couple of quality of life additions.
 * The `exectue()` function will execute the main function specified in the 
 * command file.
 * The `hasTag()` and `hasTags()` methods check the command tag data for
 * one or more "tags" respectively.
 */
export abstract class GenericFile {

    // used as the Debug loggerID for the command
    protected fileName: string 

    /**
     * Creates a new `GenericFile` instance.
     * @param {string} fileName the Debug `loggerID` for the command
     */
    public constructor(fileName: string) {
        this.fileName = fileName
    }

    public get loggerID() { return this.fileName }
}