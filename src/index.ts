import 'dotenv/config'
import chalk from 'chalk';
import Bluebird from 'bluebird';
import {Api, TelegramClient} from "telegram";
import {StringSession} from "telegram/sessions";

import OpenAI from 'openai';
import {getChannelMessage} from "./channel";
import bigInt from "big-integer";
import {hasAllKeywords, questionAsync, removeNullValues} from "./utils";

const apiId = +process.env.TELEGRAM_API_ID!;
const apiHash = process.env.TELEGRAM_API_HASH!;
const stringSession = new StringSession(process.env.TELEGRAM_SESSION); // fill this later with the value from session.save()

let ourChannel:Api.ChannelFull;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function retrieveTradingPlans(client: TelegramClient, channelName: string, keywords: string[], lookBackHours: number = 1): Promise<any[]> {
    let messages = await getChannelMessage(client, channelName, lookBackHours);

    console.log("Retrieved message", messages.length);

    return removeNullValues(await Bluebird.mapSeries(messages, async message => {
        if (hasAllKeywords(message.content, keywords)) {
            console.log(chalk.white("Parsing trading plan :" + message.id))
            const chatCompletion = await openai.chat.completions.create({
                messages: [{
                    role: 'user',
                    content: process.env.OPENAI_PROMPT_EXTRACT_TRADING_PLAN + message.content

                }],
                model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
            });

            try {
                let plan = JSON.parse(chatCompletion.choices[0].message.content!);

                if (ourChannel) {
                    console.log(chalk.yellow('Forwarding message'));
                    const result = await client.invoke(
                        new Api.messages.ForwardMessages({
                            fromPeer: message.channel,
                            id: [message.id],
                            randomId: [bigInt(Math.floor(Math.random() * (1000000000 - 1)) + 1)],
                            toPeer: ourChannel,

                            withMyScore: false,
                            dropAuthor: false,
                            dropMediaCaptions: false,
                            noforwards: false,
                        })
                    );

                    // console.log(result); // prints the result

                    // await client.sendMessage(ourChannel, { message: JSON.stringify(plan) });

                }

                return {
                    ...plan,
                    timestamp: message.timestamp,
                }
            } catch (error: any) {
                console.error(chalk.red("Error Parse JSON output " + error.message))
            }
        } else
            return null;
    }));
}


(async () => {
    console.log("Loading interactive example...");
    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });
    await client.start({
        phoneNumber: async () => await questionAsync("Please enter your number: "),
        password: async () => await questionAsync("Please enter your password: "),
        phoneCode: async () =>
            await questionAsync("Please enter the code you received: "),
        onError: (err) => console.log(err),
    });
    console.log("You should now be connected.");

    if (!process.env.TELEGRAM_SESSION || process.env.TELEGRAM_SESSION.length === 0)
        console.log("Session ID", client.session.save());

    const ourChannelDetails = await client.invoke(
        new Api.channels.GetFullChannel({
            channel: process.env.TELEGRAM_OUR_CHANNEL_NAME
        })
    );
    ourChannel = (ourChannelDetails.fullChat as Api.ChannelFull)

    // console.log(await retrieveTradingPlans(
    //     client,
    //     "AmericanCryptoTrading",
    //     ["Invalidation Price"],
    //     2))

    console.log(await retrieveTradingPlans(
        client,
        "CryptoRROFFICAIL",
        ["Risk Reward levels"],
        2))

})();
