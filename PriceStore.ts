import axios from "axios";
import { action, observable, runInAction } from "mobx";
import { config } from "app/constants";
import { types, flow } from "mobx-state-tree";

const PriceStore = types.model({
    fiat_prices: types.optional(types.map(types.map(types.number)), {}),
    fiat: types.model({
        name: types.string,
        symbol: types.string,
    }),
}).views(self => {
    return {
        getFiatPrice(ticker: string){
            return self.fiat_prices[ticker] ? self.fiat_prices[ticker][self.fiat.name] : 0;
        }           
    }
}).actions(self => {
    const syncFiatPrices = flow(function* syncFiatPrices(){
        let allcoins = [];
        for (const x in config) {
            allcoins.push(x);
            if (config.assets) {
                allcoins = allcoins.concat(Object.keys(config.assets));
            }
        }

        const data = yield axios.get(`https://min-api.cryptocompare.com/data/pricemulti?fsyms=${([].concat.apply([], [allcoins])).join()}&tsyms=${this.fiat.name}`);
        runInAction(() => {
            Object.keys(data.data).map((o) => {
                self.fiat_prices[o] = data.data[o];
            });
        });
    })
    return {
        syncFiatPrices,
    };
});
export default PriceStore;
