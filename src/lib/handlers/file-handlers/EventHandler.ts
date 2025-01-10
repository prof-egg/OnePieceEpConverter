/******************************************************************************
 *  Dependencies: discord.js, Debug.ts, Util.ts
 *
 *  EventHandler - class to load and handle event listeners.
 *  EventFile - Represents an event file as an object.
 *  TEventFileData - Acts as typesafety when performing a `require()` on a file.
 *  IEventFunc - Acts as typesafety for event file functions.
 *  IEventBuildData - Acts as typesafety for event file `eventData` object.
 *
 ******************************************************************************/

import Discord, { Events, If } from "discord.js"
import path from "node:path"
import Debug from "../../util/Debug.ts"
import FileHandler, { GenericFile } from "./FileHandler.ts";

const loggerID = path.parse(import.meta.url).base

/**
 * The `EventHandler` class is a static class meant for handling discord client events.
 * While it is instantiable, only one instance is meant to be created, and that
 * instance can be referenced from the `HandlerHub` instance.
 * This allows the use if instance Generics, while still being globally accessible.
 * It uses a `Discord.Collection` as its backing data structure for storage and
 * retrieval of `EventFile` objects.
 * @see EventHandler.loadEventFolder
 * @see EventHandler.refreshEventRegistry
 * @see EventHandler.cacheData
 * @see EventFile
 */
export default class EventHandler<Client extends boolean = false> extends FileHandler<
    Events, 
    TEventFileData<keyof Discord.ClientEvents>, 
    EventFile<keyof Discord.ClientEvents>
>  {

    // Singleton
    private static instance = new EventHandler<any>();
    public constructor() { super(); return EventHandler.instance }
    public static get getInstance(): EventHandler { return EventHandler.instance; }

    // Dependency injection
    private client: If<Client, Discord.Client> = null as If<Client, Discord.Client>

    // <key: Discord.Events, value: EventFile> 
    // private eventsCollection: Discord.Collection<Events, EventFile<keyof Discord.ClientEvents>> = new Discord.Collection();

    /**
     * Recursively finds all .ts files in the specified 
     * folder and attempts to load them as events.
     * **DOES NOT** work when folder path or any recursive 
     * folder path contains a period.
     * @param {string} folderPath Path to the folder you of files you want to recursively load
     */
    public async loadEventFolder(folderPath: string): Promise<void> {
        await super.loadGenericFolder(folderPath)
    }

    /**
     * Attempts to laod and store file data as an `EventFile` object. 
     * @param {string} eventFilePath The path to the file you want to load
     * @returns `true` if loaded successfully; `false` otherwise
     */
    public async loadEventFile(eventFilePath: string): Promise<boolean> {
        const successful = await super.loadGenericFile(eventFilePath)
        return successful
    }

    protected override onSuccessfulFileObjectLoad(fileObject: EventFile<keyof Discord.ClientEvents>): void {
        // Casting to Discord.Client, verifyFileData() (which calls verifyClientCache())
        // will be called earlier in the fileLoad method, which means by this points
        // the client has already been chached and is not null
        fileObject.listen(this.client as Discord.Client)
    }

    protected override generateFileObject(fileName: string, fileData: TEventFileData<keyof Discord.ClientEvents>): EventFile<keyof Discord.ClientEvents> {
        return new EventFile(fileData, fileName)
    }

    protected override generateFileObjectKey(fileObject: EventFile<keyof Discord.ClientEvents>): Events {
        return fileObject.eventBuildData.event as Events
    }

    protected override verifyFileData(fileName: string, fileData: TEventFileData<keyof Discord.ClientEvents>): boolean {

        // Check for client cache in verification, this is important for this.onSuccessfulFileObjectLoad()
        if (!this.validateClientCache()) { Debug.logError(`Cannot load ${fileName} without first caching a discord client`, loggerID); return false }

        // If file has any obvious setup errors log it and return out of function
        if (fileData.eventFunction === undefined)   { Debug.logError(`${fileName} is missing eventFunction export`, loggerID); return false }
        if (fileData.eventData === undefined)       { Debug.logError(`${fileName} is missing eventData export`, loggerID); return false }
        if (fileData.eventData.event === undefined) { Debug.logError(`${fileName} is missing .event property in eventData`, loggerID); return false }
        if (fileData.eventData.once === undefined)  { Debug.logError(`${fileName} is missing .once property in eventData`, loggerID); return false }

        // If event has already been loaded log warning
        if (this.fileObjectCollection.has(fileData.eventData.event as Events)) {
            Debug.logWarning(`An event file with the event "${fileData.eventData.event}" has already been loaded`, loggerID)
            return false 
        }

        return true
    }

    /**
     * Attempts to retrieve an `EventFile` instance.
     * @param {Discord.ClientEvents} event the client event you want to search for
     * @returns `EventFile` if successful; `undefined` otherwise
     */
    public getEvent(event: Events): EventFile<keyof Discord.ClientEvents> | undefined {
        return this.fileObjectCollection.get(event)
    }

    /**
     * Caches client instance.
     * @param {Discord.Client} client your discord client instance
     */
    public cacheClient(client: Discord.Client): void { 
        this.client = client as If<Client, Discord.Client>
    }

    /**
     * Checks if a client instance has been cached.
     * @returns `true` if a client instance has been cached; `false` otherwise
     */
    public isClientCached(): this is EventHandler<true> {
        return this.client !== undefined
    }

    /***************************************************************************
    * Validators
    ***************************************************************************/
    private validateClientCache(): this is EventHandler<true> {
        if (!this.isClientCached()) {
            const errorMsg = "Tried to use function that requires cached discord client without first caching discord client"
            Debug.logError(errorMsg, loggerID)
            throw new TypeError(errorMsg)
        }
        return this.client !== null
    }
}

// To anyone reading im sorry for the spaghetti mess of generics
// It was discord's fault not mine :(

/**
 * The `EventFile` class represents an instance of the data found in 
 * an event file.
 * The `listen()` function will either call `client.on()` or `client.once()`
 * which will then *execute* the event function upon trigger.
 */
export class EventFile<Event extends keyof Discord.ClientEvents> extends GenericFile {
    
    private function: IEventFunc<keyof Discord.ClientEvents>
    private eventData: IEventBuildData<Event>

    /**
     * Creates a new `EventFile` instance.
     * @param {TEventFileData<Event>} fileData the file data returned from *requiring* a js event file
     * @param {string} fileName the Debug `loggerID` for the event
     */
    constructor(fileData: TEventFileData<Event>, fileName: string) {
        super(fileName)
        this.function = fileData.eventFunction
        this.eventData = fileData.eventData
    }

    /**
     * Calls either `client.on()` or `client.once()` based on the 
     * `once` and `event` properties in the stored `eventData`
     * @param {Discord.Client} client - your discord client instace
     */
    public listen(client: Discord.Client): void {
        if (this.eventData.once) 
            client.once(this.eventData.event, (...args: Discord.ClientEvents[Event]) => {return this.execute(client, ...args)})
         else 
            client.on(this.eventData.event, (...args: Discord.ClientEvents[Event]) => {return this.execute(client, ...args)})
        
    }

    /**
     * Manually call the event function instead of relying on the `listen()` method.
     * @param {Discord.Client} client - your discord client instace
     * @param args {Discord.ClientEvents[Event]} the callback args from the client event
     */
    public execute(client: Discord.Client, ...args: Discord.ClientEvents[Event]): void {
        this.function(client, this.fileName, ...args)
    }

    public get eventBuildData() { return this.eventData }
}

/**
 * A type that acts as typesafety when performing a `require()` on an event file.
 */
export type TEventFileData<Event extends keyof Discord.ClientEvents> = {
    eventFunction: IEventFunc<keyof Discord.ClientEvents>,
    eventData: IEventBuildData<Event>
}

/**
 * An interface that acts as typesafety when building an `eventFunction()` method in an event file.
 */
export interface IEventFunc<Event extends keyof Discord.ClientEvents> {
    (client:Discord.Client, loggerID: string, ...args: Discord.ClientEvents[Event]): Discord.Awaitable<void>
}

/**
 * An interface that acts as typesafety when building the `eventData` object in an event file.
 */
export interface IEventBuildData<Event extends keyof Discord.ClientEvents> {
    event: Event
    once: boolean
}