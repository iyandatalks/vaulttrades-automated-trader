export const config = {
  automationEnabled: process.env.AUTOMATION_ENABLED === 'true',
  symbol: process.env.MARKET_SYMBOL || 'XAU/USD',
  dxySymbol: process.env.DXY_SYMBOL || 'DXY',
  timeframes: (process.env.SIGNAL_TIMEFRAMES || 'M5,M15').split(',') as ('M5'|'M15')[],
  twelveDataBaseUrl: process.env.TWELVE_DATA_BASE_URL || 'https://api.twelvedata.com',
  twelveDataKey: process.env.TWELVE_DATA_API_KEY || '',
  metaKitBaseUrl: process.env.META_KIT_BASE_URL || '',
  metaKitKey: process.env.META_KIT_API_KEY || '',
  mt5BaseUrl: process.env.MT5_BASE_URL || '',
  mt5Key: process.env.MT5_API_KEY || '',
  cronSecret: process.env.CRON_SECRET || '',
};
