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

import Discord, { If, REST, Routes } from "discord.js"
import path from "node:path"
import Debug, { EColorEscape } from "../../util/Debug.ts"
import clientconfig from "../../../config/client.json" with { type: "json" }
import FileHandler, { GenericFile } from "./FileHandler.ts";
import Util from "../../util/Util.ts";

const loggerID = path.parse(import.meta.url).base

/**
 * The `CommandHandler` class is a class meant for handling slash commands.
 * While it is instantiable, only one instance is meant to be created, and that
 * instance can be referenced from the `HandlerHub` instance.
 * This allows the use if instance Generics, while still being globally accessible.
 * It uses a `Discord.Collection` as its backing data structure for storage and
 * retrieval of `SlashCommandFile` objects.
 * @see CommandHandler.loadSlashCommandFolder
 * @see CommandHandler.refreshSlashCommandRegistry
 * @see CommandHandler.cacheData
 * @see SlashCommandFile
 */
export default class CommandHandler<
    Client extends boolean = false, 
    Token extends boolean = false, 
    Rest extends boolean = false, 
> extends FileHandler<string, TSlashCommandFileData, SlashCommandFile> {

    // Singleton
    private static instance = new CommandHandler<any, any, any>();
    public constructor() { super(); return CommandHandler.instance }
    public static get getInstance(): CommandHandler { return CommandHandler.instance; }

    // Dependency injections
    private client: If<Client, Discord.Client> = null as If<Client, Discord.Client>
    private clientToken: If<Token, string> = null as If<Token, string>
    private rest: If<Rest, REST> = null as If<Rest, REST>

    // <key: commandName, value: SlashCommandFile> 
    // private static slashCommandsCollection: Discord.Collection<string, SlashCommandFile> = new Discord.Collection();

    /**
     * Recursively finds all .ts files in the specified 
     * folder and attempts to load them as slash commands.
     * **DOES NOT** work when folder path or any recursive 
     * folder path contains a period.
     * @param {string} folderPath Path to the folder you of files you want to recursively load
     */
    public async loadSlashCommandFolder(folderPath: string): Promise<void> {
        await super.loadGenericFolder(folderPath)
    }

    /**
     * Attempts to laod and store file data as a `SlashCommandFile` object. 
     * @param {string} slashCmdFilePath The path to the file you want to load
     * @returns `true` if loaded successfully; `false` otherwise
     */
    public async loadSlashCommandFile(slashCmdFilePath: string): Promise<boolean> {
        const successful = await super.loadGenericFile(slashCmdFilePath)
        return successful
    }

    protected override generateFileObject(fileName: string, fileData: TSlashCommandFileData): SlashCommandFile {
        // let isEconCommand = fileData.tags.some((tag) => tag == ECommandTags.Economy)
        return (fileData.autocomplete) 
            ? new SlashCommandFileWithAutocomplete(fileData, fileName) 
            : new SlashCommandFile(fileData, fileName)
    }

    protected override generateFileObjectKey(fileObject: SlashCommandFile): string {
        return fileObject.commandBuildData.name
    }

    protected override verifyFileData(fileName: string, fileData: TSlashCommandFileData): boolean {

        // If file has any obvious setup errors log it and return out of function
        if (fileData.commandFunction === undefined) { Debug.logError(`${fileName} is missing commandFunction export`, loggerID); return false }
        if (fileData.buildData === undefined) { Debug.logError(`${fileName} is missing buildData export`, loggerID); return false }
        if (fileData.buildData.name === undefined) { Debug.logError(`${fileName} is missing .name property in buildData`, loggerID); return false}
        if (fileData.buildData.description === undefined) { Debug.logError(`${fileName} is missing .description property in buildData`, loggerID); return false }
        if (fileData.tags === undefined || !Array.isArray(fileData.tags)) { Debug.logError(`${fileName} is missing tags export`, loggerID); return false }

        // If command has already been loaded log warning
        if (this.fileObjectCollection.has(fileData.buildData.name)) {
            Debug.logWarning(`A slash cmd function with the name "${fileData.buildData.name}" has already been loaded (${fileName})`, loggerID)
            return false
        }

        return true
    }
    /**
     * Uses the command data that has been loaded into the `CommandHandler`
     * to *refresh* guild slash commands. 
     * This involves **adding** new commands if needed, **deleting** old commands
     * if needed, and **overwriting** old commands if needed.
     * @param {string} clientToken the login token for your discord client
     * @throws `TypeError` if called with no `clientToken` passed and a client when `Discord.Client<true>` has not been cached
     * @throws `DiscordAPIError` if invalid login token is provided
     * @see CommandHandler.cacheData
     */
    public async refreshSlashCommandRegistry(clientToken?: string, application?: boolean) {

        if (clientToken) {
            var rest = new REST().setToken(clientToken) as REST
        } else {
            this.validateTokenCache()
            clientToken = this.clientToken ?? undefined
            this.validateRestCache()
            var rest = this.rest as REST
        }

        try {

            // Get an array of slash command build datas
            const slashCommands = this.fileObjectCollection.values()
            const commandBodies: Discord.RESTPostAPIChatInputApplicationCommandsJSONBody[] = []
            for (const command of slashCommands)
                {if (!command.hasTag(ECommandTags.DontRegister))
                    commandBodies.push(command.commandBuildData)}

            Debug.logStartup(`Refreshing ${commandBodies.length} application (/) commands to ${(application == true) ? "application" : "guild"}...`, loggerID)
            
            // The put method is used to fully refresh all commands in the guild with the current set
            // Route methods return API 
            const route = (application == true) ? 
                Routes.applicationCommands(clientconfig.id) : 
                Routes.applicationGuildCommands(clientconfig.id, clientconfig.homeGuild.id)
            await rest.put( route, { body: commandBodies });  
            
            Debug.log(`Successfully refreshed ${commandBodies.length} application (/) commands!`, loggerID, EColorEscape.CyanFG)

        } catch (error) {
            Debug.logError(error as string, loggerID)
            console.log(error)
        }
    }

    /**
     * Attempts to retrieve a `SlashCommandFile` instance and call the
     * `execute()` method. **WARNING:** If the command is an economy command
     * and a `user` is not passed, than a `null` value will be passed to the function.
     * @param {Discord.ChatInputCommandInteraction} interaction the interaction object generated by an end user
     * @returns `true` if executed successfully; `false` otherwise
     */
    public executeSlashCommand(interaction: Discord.ChatInputCommandInteraction): boolean {

        if (!this.validateClientCache())
            return false

        const command = this.getSlashCommand(interaction)
        if (!command) {
            Debug.logError(`Failed to execute command: ${interaction.commandName}`, loggerID)
            return false
        }

        command.execute(interaction, this.client)
        return true
    }

    /**
     * Caches `client` instance. Caches a `clientToken` string and 
     * `rest` object if `Discord.Client<true>` which is checked
     * with `client.isReady()`.
     * @param {Discord.Client} client your discord client instance
     */
    public cacheData(client: Discord.Client): void {
        this.client = client as If<Client, Discord.Client>
        if (client.isReady()) {
            this.clientToken = client.token as If<Token, string>
            this.rest = new REST().setToken(client.token) as If<Rest, REST>
        }
    }

    /**
     * Attempts to retrieve a `SlashCommandFile` instance.
     * @param {Discord.ChatInputCommandInteraction} interaction the interaction object generated by an end user
     * @returns `SlashCommandFile` if successful; `undefined` otherwise
     */
    public getSlashCommand(interaction: Discord.ChatInputCommandInteraction | Discord.AutocompleteInteraction): SlashCommandFile | undefined {
        return this.fileObjectCollection.get(interaction.commandName)
    }

    /**
     * Checks if a client instance has been cached.
     * @returns `true` if a client instance has been cached; `false` otherwise
     * @see CommandHandler.cacheData
     */
    public isClientCached(): this is CommandHandler<true, Token, Rest> {
        return this.client !== null
    }

    /**
     * Checks if a client token has been cached.
     * @returns `true` if a client token has been cached; `false` otherwise
     * @see CommandHandler.cacheData
     */
    public isTokenCached(): this is CommandHandler<Client, true, Rest> {
        return this.clientToken !== null
    }

    /**
     * Checks if a rest object has been cached.
     * @returns `true` if a rest object has been cached; `false` otherwise
     * @see CommandHandler.cacheData
     */
    public isRestCached(): this is CommandHandler<Client, Token, true> {
        return this.rest !== null
    }

    /***************************************************************************
    * Validators
    ***************************************************************************/
    private validateClientCache(): this is CommandHandler<true, Token, Rest> {
        if (!this.isClientCached()) {
            const errorMsg = "Tried to use function that requires cached discord client without first caching discord client"
            Debug.logError(errorMsg, loggerID)
            throw new TypeError(errorMsg)
        }
        return this.client !== null
    }

    private validateTokenCache(): this is CommandHandler<Client, true, Rest> {
        if (!this.isTokenCached()) {
            const errorMsg = "Tried to use function that requires cached client token without first caching client token"
            Debug.logError(errorMsg, loggerID)
            throw new TypeError(errorMsg)
        }
        return this.clientToken !== null
    }

    private validateRestCache(): this is CommandHandler<Client, Token, true> {
        if (!this.isRestCached()) {
            const errorMsg = "Tried to use function that requires cached rest object without first caching rest object"
            Debug.logError(errorMsg, loggerID)
            throw new TypeError(errorMsg)
        }
        return this.rest !== null
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
export class SlashCommandFile extends GenericFile {
    private helpEmbed: Discord.EmbedBuilder
    private function: ISlashCommandFunc;
    protected autocompleteFunc?: ISlashCommandAutocompleteFunc
    private buildData: Discord.RESTPostAPIChatInputApplicationCommandsJSONBody;
    private tags: ECommandTags[];


    /**
     * Creates a new `SlashCommandFile` instance.
     * @param {TSlashCommandFileData} fileData the file data returned from *requiring* a js slash command file
     * @param {string} fileName the Debug `loggerID` for the command
     */
    public constructor(fileData: TSlashCommandFileData, fileName: string) {
        super(fileName)
        this.function = fileData.commandFunction
        this.autocompleteFunc = fileData.autocomplete
        this.buildData = fileData.buildData
        this.helpEmbed = fileData.helpEmbed ?? Util.embedMessage("Apologies, no help embed found!")
        this.tags = fileData.tags
    }

    /**
     * Executes the command function specified in the command file.
     * @param {Discord.ChatInputCommandInteraction} interaction the interaction object generated by an end user
     * @param {Discord.Client} client your discord client instance
     */
    public execute(interaction: Discord.ChatInputCommandInteraction, client: Discord.Client): void {
        this.function(interaction, interaction.options as Discord.CommandInteractionOptionResolver, client, this.fileName)
    }

    /**
     * Returns `true` if the command has an automcomplete method; `false` otherwise.
     * @returns `true` if the command has an automcomplete method; `false` otherwise
     */
    public hasAutocomplete(): this is SlashCommandFileWithAutocomplete {
        return this.autocompleteFunc != undefined
    }

    /**
     * Checks if the command has been tagged with `tag`.
     * @param {ECommandTags} tag the tag you want to check for
     * @returns `true` if the `tag` exists on the command; `false` otherwise
     */
    public hasTag(tag: ECommandTags): boolean {

        for (let i = 0; i < this.tags.length; i++)
            if (this.tags[i] == tag) return true

        return false
    }

    /**
     * Checks if the command has been tagged with `tags`.
     * @param tags an array of tags you want to check for
     * @returns `true` if the `tags` exists on the command; `false` otherwise
     */
    public hasTags(tags: ECommandTags[]): boolean {

        // Rewrite so its not O(n^2)
        for (let i = 0; i < this.tags.length; i++)
            if (!this.hasTag(tags[i])) return false

        return true
    }

    public get commandBuildData() { return this.buildData }
    public get getHelpEmbed() { return new Discord.EmbedBuilder(this.helpEmbed.toJSON()) }
}

class SlashCommandFileWithAutocomplete extends SlashCommandFile {
    public async autocomplete(interaction: Discord.AutocompleteInteraction, client: Discord.Client): Promise<void> {
        if (!this.autocompleteFunc) return
        await this.autocompleteFunc(interaction, interaction.options as Discord.CommandInteractionOptionResolver, client, this.fileName)
    }
}
/**
 * A type that acts as typesafety when performing a `require()` on a slash command file.
 */
export type TSlashCommandFileData = {
    commandFunction: ISlashCommandFunc,
    autocomplete?: ISlashCommandAutocompleteFunc
    buildData: Discord.RESTPostAPIChatInputApplicationCommandsJSONBody,
    helpEmbed: Discord.EmbedBuilder,
    tags: ECommandTags[],
}

/**
 * An interface that acts as typesafety when building a `commandFunction()` method in a slash command file.
 */
export interface ISlashCommandFunc {
    (interaction: Discord.ChatInputCommandInteraction, options: Discord.CommandInteractionOptionResolver, client: Discord.Client, loggerID: string): void
}

/**
 * An interface that acts as typesafety when building a `commandFunction()` method in a slash command file.
 */
export interface ISlashCommandAutocompleteFunc { // There is a strong chance that this is not the right option resolver
    (interaction: Discord.AutocompleteInteraction, options: Discord.CommandInteractionOptionResolver, client: Discord.Client, loggerID: string): Promise<void>
}

/**
 * Identifiers used to tag and manage slash command files.
 * Commands tagged with `ECommandTags.Complete` will be treated as readily available,
 * whereas commands tagged with `ECommandTags.Incomplete` can only be used by those who
 * have the specified testing role.
 * `ECommandTags.Utility` is a tag that represents the style of command being implemented.
 * As of the time this being written, `ECommandTags.Utility` is the only tag of its kind.
 * Tags allows for the ability to sort and handle certain commands differently automatically 
 * based on the tags in the file.
 */
export enum ECommandTags {
    General,
    Economy,
    Utility,
    Useless,
    Complete,
    Incomplete,
    DontRegister
}