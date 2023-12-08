import Airtable from 'airtable';
import Promise from 'bluebird';
import _ from 'lodash';

const TABLE_PLANS = 'Plans';
const TABLE_CHANNELS = 'Channels';

Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: process.env.AIRTABLE_API_KEY
});

const base = Airtable.base(process.env.AIRTABLE_BASE_ID);

const isValidDate = (dateString) => {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        return false;
    }

    return true;
}

const mapRecord = (record) => {
    const mapDate = (value) => {
        if (value && isValidDate(value)) {
            return value;
        } else
            return undefined;
    };

    return _.pickBy({
        "Source": record.source,
        "Symbol": record.symbol,
        "Direction" : record.direction,
        "Entry" : record.entryPrice,
        "Stop Loss" : record.stopLoss,
        "Target Price 1": record.targetPrice[0],
        "Target Price 2": record.targetPrice[1],
        "Target Price 3": record.targetPrice[2],
        "Target Price 4": record.targetPrice[3],
        "Original Content" : record.content,
        "Timestamp" : record.timestamp
    }, _.identity);
}


const createRecord = async (records) => {
    return new Promise((resolve, reject) => {
        if (records.length > 10)
            reject("Too many record in one batch, maximum 10 records");


        base(TABLE_PLANS).create(
            records.map((
                    record) => {
                    return {
                        fields: mapRecord((record))
                    }
                }
            )
            , function (err, records) {
                if (err) {
                    return reject(err);
                }
                return resolve(records);
            })
    });
}

export async function insertRecord(records)  {
    try {
        const chunks = _.chunk(records, 10);
        return await Promise.mapSeries(chunks, (chunk) => {
            return createRecord(chunk);
        })
    } catch (err) {
        console.error(err);
        return Promise.reject(err);
    }
}

// @ts-ignore
export async function getChannels(): Promise<any[]> {
    let list = [];
    return new Promise((resolve, reject) => {
        base(TABLE_CHANNELS)
            .select()
            .eachPage(
                function page(records, fetchNextPage) {
                    records.forEach(function (record) {
                        const keywords : string = record.get("Plan Keywords").toString();

                        list.push({
                            id: record.id,
                            channelName: record.get("Channel Name"),
                            keywords:keywords.split("\n"),
                            lookBack: record.get('Lookback'),
                            lastMessageId: record.get('Last Message ID'),
                            allKeywords: record.get('All Keywords'),
                        });
                    });

                    fetchNextPage();
                },
                function done(err) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(list);
                }
            );
    });
};

export async function updateChannel(id, newValues) {
    return await base(TABLE_CHANNELS).update(id, newValues);
}
