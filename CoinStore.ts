import * as omnijs from "app/omnijs";
import { pendingSyncNano } from "app/omnijs/nano";
import { action, observable, runInAction, toJS } from "mobx";

export class CoinStore {
    @observable public keys: any;
    @observable public balances: any;
    @observable public mnemonic: string;
    @observable public passphrase: string;
    @observable public isUnlocked: boolean;

    public configStore;
    constructor(configStore) {
        this.configStore = configStore;

        this.keys = {};
        this.isUnlocked = false;
        this.balances = {};
        this.mnemonic = "connect ritual news sand rapid scale behind swamp damp brief explain ankle";
    }

    @action
    public generateKeys = async (_new?: boolean, _passphrase?: string, _mnemonic?: string) => {
        const config = toJS(this.configStore.config);
        let mnemonic = _new ? null : _mnemonic || this.mnemonic || await this.configStore.getKey('mnemonic');
        const passphrase = _passphrase || this.passphrase;
        for (const o in config) {
            const c = config[o];

            const k = omnijs.generateSeed(mnemonic, passphrase, {
                config,
                rel: o,
                base: c.base ? o : c.ofBase,
            });

            this.keys[o] = k;
            mnemonic = k.mnemonic;
        }
        if (!this.mnemonic) {
            this.mnemonic = mnemonic;
            this.passphrase = passphrase;
            this.configStore.setKey('mnemonic', mnemonic);
        }
        this.isUnlocked = true;
        this.syncBalances();
        return mnemonic;
    }
    @action
    public syncBalances = () => {
        const config = toJS(this.configStore.config);
        Object.keys(config).map(async (o) => {
            try {
                const c = config[o];
                const b = c.base ? o : c.ofBase;
                const balances = await omnijs.getBalance(o, b, this.keys[o].address, config);
                if (b == "NANO" && balances[b].pending > 0) {
                    pendingSyncNano({ config, rel: o, base: b, balance: balances[b].balance_raw, pending: balances[b].pending_raw, address: this.keys[o].address, options: { publicKey: this.keys[o].publicKey, wif: this.keys[o].wif } });
                }

                runInAction(() => {
                    Object.keys(balances).map((o) => {
                        this.balances[o] = balances[o];
                    });
                });
            } catch (e) {
                // some network error
                console.error(e);
            }
        });
    }
}

export default CoinStore;
