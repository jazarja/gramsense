import 'dotenv/config'
import chalk from 'chalk';
import Bluebird from 'bluebird';
import moment from 'moment';
import _ from 'lodash';
import {Api, TelegramClient} from "telegram";
import {StringSession} from "telegram/sessions";
import { CronJob } from 'cron';

import OpenAI from 'openai';
import {getChannelMessage} from "./channel";
import bigInt from "big-integer";
import {hasKeywords, questionAsync, removeNullValues} from "./utils";
import {getChannels, insertRecord, updateChannel} from "./airtable";

const apiId = +process.env.TELEGRAM_API_ID!;
const apiHash = process.env.TELEGRAM_API_HASH!;
const stringSession = new StringSession(process.env.TELEGRAM_SESSION); // fill this later with the value from session.save()

let ourChannel: Api.ChannelFull;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function retrieveTradingPlans(
    client: TelegramClient,
    channelName: string,
    keywords: string[],
    allKeywords: boolean = false,
    lookBackHours: number = 1,
    lastMessageId: number = 1
): Promise<any> {
    let messages = await getChannelMessage(client, channelName, lookBackHours, lastMessageId);
    if (messages.length===0)
    {
        return null;
    }

    console.log(allKeywords);

    console.log("Retrieved message", _.map(messages, 'id'));

    let newestMessageId = _.first(messages).id;

    let plans: any[] = removeNullValues(await Bluebird.mapSeries(messages, async message => {
        if (message.content) {
            console.log(chalk.yellow('Processing '+message.id+' '+message.content));
            if (hasKeywords(message.content, keywords, !allKeywords)) {
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
                        await client.invoke(
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
                    }
                    let planRecord = {
                        ...plan,
                        source: message.channel.username,
                        content: message.content,
                        timestamp: moment.unix(message.timestamp).toDate(),
                    }

                    if (planRecord.symbol && planRecord.entryPrice) {
                        await insertRecord([planRecord]);
                        return planRecord
                    } else
                        return null;
                } catch (error: any) {
                    console.error(chalk.red("Error Parse JSON output " + error.message))
                }
            } else
                return null;
        } else
            return null;
    }));

    return {
        plans: plans,
        lastMessageId: newestMessageId
    }
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
    console.log(chalk.yellow("Connected to Telegram"));

    if (!process.env.TELEGRAM_SESSION || process.env.TELEGRAM_SESSION.length === 0)
        console.log("Session ID", client.session.save());

    const ourChannelDetails = await client.invoke(
        new Api.channels.GetFullChannel({
            channel: process.env.TELEGRAM_OUR_CHANNEL_NAME
        })
    );
    ourChannel = (ourChannelDetails.fullChat as Api.ChannelFull)

    const job = new CronJob(
        process.env.MESSAGE_POOLING_CRON || '0 */5 * * * *',
        async function () {
            console.log(chalk.yellow("Channel messages pooling started"));
            const channels = await getChannels();

            await Bluebird.mapSeries(channels, async channel => {
                console.log(chalk.white('Processing ' + channel.channelName));

                let result = await retrieveTradingPlans(
                    client,
                    channel.channelName,
                    channel.keywords,
                    channel.allKeywords,
                    channel.lookBack || 2,
                    channel.lastMessageId || 1);

                if (result!==null) {
                    return updateChannel(channel.id, {
                        "Last Run": moment().toDate(),
                        "Last Message ID": result.lastMessageId
                    })
                } else
                {
                    return updateChannel(channel.id, {
                        "Last Run": moment().toDate(),
                    })
                }
            })

            console.log(chalk.yellow("Channel messages pooling completed"));
        },
        null,
        true,
        'Asia/Jakarta'
    );
    job.start();



})();



