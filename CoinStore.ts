import { toJS, runInAction, observable, action } from 'mobx';
import * as omnijs from "app/omnijs";
import { pendingSyncNano } from "app/omnijs/nano";

export class CoinStore {
    @observable keys: any;
    @observable balances: any;
    @observable mnemonic: string;
    @observable passphrase: string;

    public configStore;
    constructor(configStore) {
        this.configStore = configStore;
        
        this.keys = {};
        this.balances = {};
        this.mnemonic = "connect ritual news sand rapid scale behind swamp damp brief explain ankle";
        this.passphrase = "";
    }

    @action
    generateKeys = async () => {
        const config = toJS(this.configStore.config);
        let mnemonic = this.mnemonic || await this.configStore.getMnemonic();
        for (let o in config){
            const c = config[o];
            
            const k = omnijs.generateSeed(mnemonic, this.passphrase, { 
                config,
                rel: o,
                base: c.base ? o : c.ofBase,
            })

            this.keys[o] = k;
            mnemonic = k.mnemonic;
        }
        if(!this.mnemonic){
            this.mnemonic = mnemonic;            
            this.configStore.setMnemonic(mnemonic);
        }
        this.syncBalances();
    }
    @action
    syncBalances = () => {
        const config = toJS(this.configStore.config);
        Object.keys(config).map(async o=>{
            try{
                const c = config[o];
                const b = c.base ? o : c.ofBase
                const balances = await omnijs.getBalance(o, b, this.keys[o].address, config);
                if (b == "NANO" && balances[b].pending > 0){
                    pendingSyncNano({ config, rel: o, base: b, balance: balances[b].balance_raw, pending: balances[b].pending_raw, address: this.keys[o].address, options: { publicKey: this.keys[o].publicKey, wif: this.keys[o].wif } });
                }

                runInAction(() => {
                    Object.keys(balances).map(o=>{
                        this.balances[o] = balances[o];
                    })
                });
            }catch(e){
                //some network error
                console.error(e);
            }
        })
    }
}

export default CoinStore;
