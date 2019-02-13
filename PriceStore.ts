import axios from "axios";
import { config, MAX_DECIMAL_FIAT, numberWithCommas } from "app/constants";
import { types, flow, getParent } from "mobx-state-tree";
import {IWalletStore} from "./WalletStore"

const fiat_prices = types.model({
    ticker: types.identifier,
    value: types.number
});
const PriceStore = types.model({
    fiat_prices: types.map(fiat_prices),
    fiat: types.model({
        name: types.string,
        symbol: types.string,
    }),
}).views(self => {
    return {
        getFiatPrice(ticker: string){
            return self.fiat_prices.has(ticker) ? self.fiat_prices.get(ticker).value : 0;
        },
        getPriceMulBal(ticker: string): number{
            const price = this.getFiatPrice(ticker)
            const balance = (getParent(self) as IWalletStore).balance(ticker);
            return price * balance;
        },
        getBalanceFiat(ticker: string){
            return +(this.getPriceMulBal(ticker)).toFixed(MAX_DECIMAL_FIAT);
        },
        getBalanceFiatWithComma(ticker: string){
            return numberWithCommas(this.getBalanceFiat(ticker))
        }
               
    }
}).actions(self => {
    const setFiatPrice = (key, value) =>{
        self.fiat_prices.set(key, value);
    }
    return {
        setFiatPrice,
    };
});
export default PriceStore;
