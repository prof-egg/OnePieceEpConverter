## About
This is a hobby project intended for personal use. 
This is the source code for a discord bot that allows you to convert one piece chapters to one piece episodes and vice-versa.
If you want this for yourself follow the steps below listed in the **Setup** section.

## Why
Sometimes when following the one piece story, some people like switch between reading the manga and watching the anime, though it's not exactly 1 to 1.
For example, chapter 500 in the manga is actually episode 394 in the anime. You can look up the conversions on the [One Piece Wiki](https://onepiece.fandom.com/wiki/One_Piece_Wiki) or look up the conversions on a site like [this](https://onepiece.d1g1t.net/), but I also kind of wanted to just make the bot anyway because I thought it was interesting.

## How it Works:
Basically I just scraped the [One Piece Wiki](https://onepiece.fandom.com/wiki/One_Piece_Wiki) for the data on episodes and chapters and downloaded the data to some json files.
Then with that data I made a discord bot that can use that data to convert between chapters and episodes and vice-versa. 
I also made some commands for just getting some information about a desired episode or chapter if you didn't want to explicitly convert them.

# Setup
### Your Enviroment
- Install [VS Code](https://code.visualstudio.com/download).
- Install a **command-line package manager and installer** like [chocolatey](https://chocolatey.org/install#individual).
- Install [Deno](https://docs.deno.com/runtime/getting_started/installation/) using the command `choco install deno`.

### Your Discord Client 
- Head to the [Discord Dev Portal](https://discord.com/developers/) and login using *your discord account.*
- On the left go to `Applications` and then on the top right click `New Application` and name your bot.
- In the `Bot` tab on the left, click `reset token` and copy and paste the string of characters somewhere safe *(this is the password to your bot which will be used in the `Running the Code` section).*
  - ***Note:*** *In this tab you can also upload a profile picture and banner for your bot.*
- Now to invite the bot, in the `OAuth2` tab on the left, check the `application.commands` and `bot` box in the **OAuth2 URL Generator** section.
- The **Bot Permissions** section should now appear below, and you want to check `Administrator` box.
- Below make sure **Integration Type** is `Guild Install` and copy the generated URL below.
- Use that link to invite your bot to any server of yours.

### Running the Code
- Download and extract the **source code from this repo**, open the extracted folder in **VS Code**.
- Create a file named `.env` and put it next to your `deno.json` and `deno.lock` files. 
- Copy and paste this string into the `.env` file: `CLIENT_LOGIN_TOKEN=YOUR_TOKEN_HERE` *(replace `YOUR_TOKEN_HERE` with the "password" from earlier).*
- In the `client.json` file, loacted at **src > config > client.json**, replace the `id` string with the id of **your bot**.
  - ***Note:*** *`homeGuild.id` is for testing purposes, if you'd like you can replace that id with the id of your own test server. You can also run the command `deno task refresh` to upload the slash command data to just that test server.*
- In the **VS Code terminal** run the command `deno task refresh -g` *(this will upload the slash command data to discord).*
  - ***Note:*** *To pull up a new terminal, press `ctrl+shift+~`. To open an existing terminal, press `ctrl+~`.*
  - ***Note:*** *Any command that has `deno task` at the start is a command I've defined in the project. You can see them defined in the `deno.json` file.*
- To run the bot, enter the command `deno task start` in the **VS Code terminal**.
  - ***Note:*** *The first time you run the `deno task start` command, deno will install the [`discordjs`](https://discord.js.org/) and [`cheerio`](https://www.npmjs.com/package/cheerio) npm packages that are necessary for running the bot.*

There you go you set it up enjoy the bot, if you want it running 24/7 you should look up how to run the bot on a server like [railway](https://railway.com/).

## Scripts Folder
There are four script files in the `scripts` folder:
- **refreshCommands.ts**: Used for uploading the slash command data of the bot to discord.
  - *You can run this script with the command `deno task refresh -g`.*
- **scrapChapters.ts**: This scrapes the [One Piece Wiki](https://onepiece.fandom.com/wiki/One_Piece_Wiki) for information on one piece chapters and downloads it to a file.
  - *You can run this script with the command `deno task sc` (add `-r` at the end if you want the file to replace the one located in the config folder).*
- **scrapeEpisodes.ts**: This scrapes the [One Piece Wiki](https://onepiece.fandom.com/wiki/One_Piece_Wiki) for information on one piece episodes and downloads it to a file.
  - *You can run this script with the command `deno task se` (add `-r` at the end if you want the file to replace the one located in the config folder).*
- **scrapeHianime.ts**: This is misleading, technically it's not "web scraping" anything. I couldn't get the actual web scraping part to work with the [hianime.to](https://hianime.to/) website so I instead just went to the [one piece page](https://hianime.to/watch/one-piece-100?ep=2142), inspected element, and copy and pasted the html into a file called `hianime.html` and placed the file in the folder. This script just parses that html file and downloads data relevant to the hianime one piece episode ids.
  - *You can run this script with the command `deno task sh` (add `-r` at the end if you want the file to replace the one located in the config folder).*
  
If you wanted to update the one piece episode and chapter information, you can run the `scrapeEpisodes.ts` and `scrapeChapters.ts` files respectively. 
You can also manually go to the [one piece page](https://hianime.to/watch/one-piece-100?ep=2142), copy and paste the html from the page like mentioned above, and run the `scrapeHianime.ts` file to update the episode ids (in case hianime has listed more one piece episodes).
These scrapers aren't guaranteed to work forever, if the respective website structure changes for any of the three previously mentioned scripts, then those scripts won't work.
Though, the data in the config folder right now is good for up to episode 1122 and chapter 1135.