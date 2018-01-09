const fetch = require('node-fetch');
const Logger = require('../logger');
const currency = 'EUR';
const binance = require('./binance.api');

module.exports = {
    registerEndpoints(app) {
        app.get('/api/assets',
            (req, res) =>
                getAssets()
                    .then(assets => res.send(assets))
                    .catch((err) => {
                        Logger.error(err);
                        res.status(500).send('Fetching assets failed!');
                    })
        );
    }
};

const getAssets = () => {
    return binance.getAccount().then(account => {
        const wallet = account.balances
            .filter(crypto => crypto.free > 0)
            .map(crypto => {
                return {
                    sign: crypto.asset,
                    amount: crypto.free
                }
            });
        const commaSeparatedSigns = wallet.map(crypto => crypto.sign).join(',');
        return fetch(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${commaSeparatedSigns}&tsyms=${currency}`)
            .then(res => res.json())
            .then(json => {
                wallet.map(crypto => {
                    const priceInfo = json.RAW[crypto.sign];
                    if (priceInfo) {
                        crypto.price = priceInfo[currency].PRICE;
                        crypto.change24 = Math.round(priceInfo[currency].CHANGEPCT24HOUR * 100) / 100;
                    } else {
                        console.error(`No price found for ${crypto.sign}`);
                        crypto.price = 0;
                    }
                    crypto.credit = Math.round(crypto.price * crypto.amount * 100) / 100;
                });
                wallet.sort((crypto1, crypto2) => crypto2.credit - crypto1.credit);
                return Promise.resolve(wallet);
            });
    });
};