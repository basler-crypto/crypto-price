const Logger = require('../logger');
const binance = require('./binance.api');

module.exports = {
    registerEndpoints(app) {
        app.get('/api/trades/:sign',
            (req, res) =>
                getTrades(req.params.sign)
                    .then(trades => res.send(trades))
                    .catch((err) => {
                        Logger.error(err);
                        res.status(500).send('Fetching trades failed!');
                    })
        );
    }
};

const adjustTimestamp = (timestamp) => {
    return Math.round(timestamp / 1000);
};
const getTrades = (sign) => {
    return Promise.all(
        [
            binance.getTrades(`${sign}ETH`),
            binance.getTrades(`${sign}BTC`),
            binance.getTrades(`${sign}BNB`),
            binance.getDeposits(sign),
            binance.getWithdrawals(sign)
        ]
    )
        .then(resultArr => {
            resultArr = resultArr.map(arr => {
                if (Array.isArray(arr)) {
                    return arr;
                } else if (Array.isArray(arr.withdrawList)) {
                    return arr.withdrawList;
                } else if (Array.isArray(arr.depositList)) {
                    return arr.depositList;
                } else {
                    return [];
                }
            });
            const trades = []
                .concat(resultArr[0].map(trade => {
                    trade.pair = {
                        from: sign,
                        to: 'ETH'
                    };
                    return trade;
                }))
                .concat(resultArr[1].map(trade => {
                    trade.pair = {
                        from: sign,
                        to: 'BTC'
                    };
                    return trade;
                }))
                .concat(resultArr[2].map(trade => {
                    trade.pair = {
                        from: sign,
                        to: 'BNB'
                    };
                    return trade;
                }));
            const deposits = resultArr[3];
            const withdrawals = resultArr[4];
            trades.forEach(trade => {
                const price = trade.qty * trade.price;
                const tradeTimeInSeconds = Math.round(trade.time / 1000);
                /*return fetch(`https://min-api.cryptocompare.com/data/pricehistorical?fsym=${sign}&tsyms=${currency}&ts=${tradeTimeInSeconds}`)
                    .then(res => res.json())
                    .then(json => {
                        const priceInfo = json[buySign] | json[] | json[];
                        sign  if (priceInfo) {
                            const historicalPrice = priceInfo[currency];
                            //console.log(price * historicalPrice);
                            console.log(buySign + "@"+ historicalPrice);
                        } else {
                            console.error(`No historical price found for ${sign} at ${tradeTimeInSeconds}`);
                        }
                    });*/
            });
            return {
                trades: trades
                    .filter(trade => trade.id)
                    .map(trade => {
                        trade.time = adjustTimestamp(trade.time);
                        return trade;
                    }),
                withdrawals: withdrawals.map(withdrawal => {
                    withdrawal.successTime = adjustTimestamp(withdrawal.successTime);
                    withdrawal.applyTime = adjustTimestamp(withdrawal.applyTime);
                    return withdrawal;
                }),
                deposits: deposits.map(deposit => {
                    deposit.insertTime = adjustTimestamp(deposit.insertTime);
                    return deposit;
                }),
            }
        })
        .catch(err => {
            Logger.error(err);
        });
};

/*const debouncedLogHistoricalPrices = (cryptoSign, buySign, credit) => {
    return limiter.removeTokens(1, (err, remRequests) => {
        return logHistoricalPrices(cryptoSign, buySign, credit);
    });
};

const logHistoricalPrices = (cryptoSign, buySign, credit) => {
    return binance.trades(`${cryptoSign}${buySign}`, (trades, symbol) => {
        if (trades.forEach)
            trades.forEach(trade => {
                const price = trade.qty * trade.price;
                const tradeTimeInSeconds = Math.round(trade.time / 1000);
                return fetch(`https://min-api.cryptocompare.com/data/pricehistorical?fsym=${buySign}&tsyms=${currency}&ts=${tradeTimeInSeconds}`)
                    .then(res => res.json())
                    .then(json => {
                        const priceInfo = json[buySign];
                        if (priceInfo) {
                            const historicalPrice = priceInfo[currency];
                            //console.log(price * historicalPrice);
                            console.log(buySign + "@"+ historicalPrice);
                        } else {
                            console.error(`No historical price found for ${symbol} at ${tradeTimeInSeconds}`);
                        }
                    });
            });
    });
};*/

