import { XMLParser } from 'fast-xml-parser';

export interface GoldPrice {
    buy: string;
    sell: string;
}

export interface FinancialRates {
    usd: number;
    btc: number;
    eur: number;
    eth: number;
}

const COINMARKETCAP_API_KEY = process.env.EXPO_PUBLIC_COINMARKETCAP_API_KEY;
const DOJI_API_URL = 'https://giavang.doji.vn/api/giavang/?api_key=258fbd2a72ce8481089d88c678e9fe4f';
const VCB_API_URL = 'https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx';

// DOJI Cache (1 min)
let dojiCache: any = null;
let dojiCacheTimestamp = 0;
const DOJI_CACHE_DURATION = 60000;

// VCB Cache (5 mins)
let vcbCache: any = null;
let vcbCacheTimestamp = 0;
const VCB_CACHE_DURATION = 300000;

const fetchDojiData = async () => {
    const now = Date.now();
    if (dojiCache && (now - dojiCacheTimestamp < DOJI_CACHE_DURATION)) {
        return dojiCache;
    }

    try {
        const response = await fetch(DOJI_API_URL);
        const text = await response.text();
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: ""
        });
        const result = parser.parse(text);
        dojiCache = result;
        dojiCacheTimestamp = now;
        return result;
    } catch (error) {
        console.error("Error fetching DOJI data:", error);
        return null;
    }
};

const fetchVCBData = async () => {
    const now = Date.now();
    if (vcbCache && (now - vcbCacheTimestamp < VCB_CACHE_DURATION)) {
        return vcbCache;
    }

    try {
        const response = await fetch(VCB_API_URL);
        const text = await response.text();
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: ""
        });
        const result = parser.parse(text);

        // Only cache if we got valid data
        if (result?.ExrateList?.Exrate) {
            vcbCache = result;
            vcbCacheTimestamp = now;
        }
        return result;
    } catch (error) {
        console.error("Error fetching VCB data:", error);
        return null; // Return null to handle fallbacks
    }
};

export const getGoldPrice = async (): Promise<GoldPrice> => {
    try {
        const data = await fetchDojiData();
        if (data?.GoldList?.JewelryList?.Row) {
            const rows = Array.isArray(data.GoldList.JewelryList.Row)
                ? data.GoldList.JewelryList.Row
                : [data.GoldList.JewelryList.Row];

            let goldRow = rows.find((r: any) => r.Key === 'auvangphuclong');
            if (!goldRow) goldRow = rows.find((r: any) => r.Key === 'dojihanoile');

            if (goldRow) {
                return {
                    buy: goldRow.Buy,
                    sell: goldRow.Sell
                };
            }
        }
    } catch (e) {
        console.warn("DOJI Gold parse failed", e);
    }
    // Mock Fallback
    return { buy: '73.50', sell: '76.02' };
};

export const getFinancialRates = async (): Promise<FinancialRates> => {
    let btcPrice = 0;
    let ethPrice = 0;

    // Hierarchical Fetch: CMC -> FreeCryptoAPI -> CoinGecko
    try {
        // 1. Try CoinMarketCap (CMC)
        if (COINMARKETCAP_API_KEY) {
            try {
                const response = await fetch(
                    'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC,ETH&convert=USD',
                    {
                        method: 'GET',
                        headers: {
                            'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY,
                            'Accept': 'application/json'
                        }
                    }
                );
                if (response.ok) {
                    const data = await response.json();
                    btcPrice = data.data.BTC.quote.USD.price;
                    ethPrice = data.data.ETH.quote.USD.price;
                }
            } catch (cmcErr) {
                console.warn("CMC failed, falling back to FreeCryptoAPI", cmcErr);
            }
        }

        // 2. Try FreeCryptoAPI if CMC failed or skipped
        if (btcPrice === 0 || ethPrice === 0) {
            try {
                const response = await fetch(
                    'https://api.freecryptoapi.com/v1/getData?symbol=BTC,ETH',
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': 'Bearer eamh5gdlbl3vqnb3i9co',
                            'Accept': 'application/json'
                        }
                    }
                );
                if (response.ok) {
                    const data = await response.json();
                    if (data && Array.isArray(data)) {
                        const btc = data.find((item: any) => item.symbol === 'BTC');
                        const eth = data.find((item: any) => item.symbol === 'ETH');
                        if (btc) btcPrice = btc.price;
                        if (eth) ethPrice = eth.price;
                    } else if (data && data.BTC && data.ETH) {
                        btcPrice = data.BTC.price;
                        ethPrice = data.ETH.price;
                    }
                }
            } catch (freeErr) {
                console.warn("FreeCryptoAPI failed, falling back to CoinGecko", freeErr);
            }
        }

        // 3. Try CoinGecko as final fallback
        if (btcPrice === 0 || ethPrice === 0) {
            try {
                const response = await fetch(
                    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd',
                    {
                        headers: {
                            'x-cg-demo-api-key': 'CG-iz56gBVBv5hiPagihRYURzUu'
                        }
                    }
                );
                const data = await response.json();
                if (data.bitcoin?.usd) btcPrice = data.bitcoin.usd;
                if (data.ethereum?.usd) ethPrice = data.ethereum.usd;
            } catch (cgErr) {
                console.warn("CoinGecko failed, using hardcoded defaults", cgErr);
            }
        }
    } catch (globalErr) {
        console.error("Global crypto fetch failure:", globalErr);
    }

    // Final hardcoded fallback if all APIs fail
    if (btcPrice === 0) btcPrice = 95000;
    if (ethPrice === 0) ethPrice = 3300;

    // 2. USD & EUR from Vietcombank
    let usdVnd = 25450; // default
    let eurVnd = 26500; // default
    try {
        const data = await fetchVCBData();
        if (data?.ExrateList?.Exrate) {
            const rows = Array.isArray(data.ExrateList.Exrate)
                ? data.ExrateList.Exrate
                : [data.ExrateList.Exrate];

            const usdRow = rows.find((r: any) => r.CurrencyCode === 'USD');
            if (usdRow && usdRow.Sell) {
                const parsed = parseFloat(usdRow.Sell.replace(/,/g, ''));
                if (!isNaN(parsed)) usdVnd = parsed;
            }

            const eurRow = rows.find((r: any) => r.CurrencyCode === 'EUR');
            if (eurRow && eurRow.Sell) {
                const parsed = parseFloat(eurRow.Sell.replace(/,/g, ''));
                if (!isNaN(parsed)) eurVnd = parsed;
            }
        }
    } catch (e) {
        console.warn("VCB USD/EUR parse failed", e);
    }

    return {
        usd: usdVnd,
        btc: btcPrice,
        eur: eurVnd,
        eth: ethPrice
    };
};

