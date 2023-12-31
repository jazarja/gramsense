import {Api, TelegramClient} from "telegram";
import moment from 'moment';
import chalk from "chalk";

export async function getChannelMessage(
    client: TelegramClient,
    channelName: string,
    lookBackHours: number = 1,
    lastId: number = 1): Promise<any[]> {

    let messages = [];
    const channelDetails: Api.messages.ChatFull = await client.invoke(
        new Api.channels.GetFullChannel({
            channel: channelName,
        })
    );

    let messageId: number = (channelDetails.fullChat as Api.ChannelFull).readInboxMaxId;

    if (messageId > lastId) {
        let timestamp;
        do {
            const result2: Api.messages.TypeMessages = await client.invoke(
                new Api.channels.GetMessages({
                    channel: channelName,
                    id: [new Api.InputMessageID({id: messageId})],
                })
            );

            const theMessages = (result2 as Api.messages.ChannelMessages);
            const theMessage = theMessages.messages[0] as Api.Message;
            timestamp = theMessage.date;

            // if (!theMessage.message)
            //     console.log(theMessage);

            let message = {
                id: messageId,
                timestamp: timestamp,
                content: theMessage.message,
                sender: (theMessages.users[0] as Api.User),
                channel: (theMessages.chats[0] as Api.Channel),
            }
            messages.push(message);
            messageId--;
        } while (messageId > lastId && timestamp > moment().subtract(lookBackHours, 'hours').unix());
    } else
    {
        console.log(chalk.yellow("No new message detected"));
    }
    return messages;
}
