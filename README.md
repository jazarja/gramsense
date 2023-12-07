GramSense
---------

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
