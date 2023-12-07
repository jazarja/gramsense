GramSense
---------

Listener for Telegram channels and extractor for trading plans.

Convert telegram channel message into trading plan JSON, example:
```
🇺🇸 PAIR 🔘1000BONK/USDT
- Direction: Short
- Mode: Cross 20x

✔️ Entry Targets:
0.008355

☑️ Take Profits:
1)0.008271
2)0.008188
3)0.008104
4)0.008021
5)0.007937
6)0.007854
➖➖➖➖➖➖

✖️ Invalidation Price:
0.009190499999999999
```

Required .env file
```
OPENAI_API_KEY=<OpenAI API Key>
TELEGRAM_API_ID=<Telegram API ID>
TELEGRAM_API_HASH=<Telegram API Hash>
TELEGRAM_SESSION=<Session ID from first run>
TELEGRAM_OUR_CHANNEL_NAME=<Telegram Channel Name>
OPENAI_PROMPT_EXTRACT_TRADING_PLAN="Extract trading plan (entryPrice, targetPrice (array of number), stopLoss, and symbol, direction (LONG or SHORT), mode (CROSS or ISOLATED) if any, leverage ([number]x) if any. Return the result in json format (return all values in numeric except for symbol, direction and mode), do not return empty fields from the following text (thousands separator is ,):"
OPENAI_MODEL=gpt-3.5-turbo
```
