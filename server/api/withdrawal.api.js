const Logger = require('../logger');
const binance = require('./external/binance/binance.api');
const pricing = require('./external/cryptocompare/pricing.api');

const currency = 'EUR';
const sum = (a, b) => a + b;

const getWithdrawals = () => {
    return binance.getAllWithdrawals().then(result => {
        const withdrawals = result.withdrawList;
        const priceInfoPromises = withdrawals.map(withdrawal => {
            const withdrawalTimeInSeconds = Math.round(withdrawal.applyTime / 1000);
            const cachedPrice = pricing.getCachedPrice(withdrawal.asset, currency, withdrawalTimeInSeconds);
            if(cachedPrice) {
                return Promise.resolve(cachedPrice);
            }
            return pricing.getHistoricalPrice(withdrawal.asset, currency, withdrawalTimeInSeconds)
        });
        return Promise.all(priceInfoPromises).then(res => {
            const items = priceInfoPromises.length;
            for (let i = 0; i < items; i++) {
                const priceInfo = res[i];
                const assetPrice = priceInfo[withdrawals[i].asset];
                const withdrawalTimeInSeconds = Math.round(withdrawals[i].applyTime / 1000);
                if (assetPrice) {
                    const historicalPrice = assetPrice[currency];
                    const cachedPrice = pricing.getCachedPrice(withdrawals[i].asset, currency, withdrawalTimeInSeconds);
                    if(!cachedPrice) {
                        pricing.cachePrice(withdrawals[i].asset, currency, withdrawalTimeInSeconds, priceInfo);
                    }
                    withdrawals[i].transactionValue = historicalPrice * withdrawals[i].amount;
                } else {
                    console.error(`No historical price found for ${withdrawals[i].asset} at ${withdrawalTimeInSeconds}`);
                }
            }
            return {withdrawals:withdrawals.map(withdrawal => withdrawal.transactionValue).reduce(sum)};
        });
    });
};

module.exports = {
    registerEndpoints(app) {
        app.get('/api/withdrawal', (req, res) =>
                getWithdrawals()
                    .then(withdrawals => res.json(withdrawals))
                    .catch((err) => {
                        Logger.error(err);
                        res.sendStatus(500).send('Fetching withdrawals failed!');
                    })
        );
    },
    getWithdrawals
};

