import * as omnijs from "app/omnijs";
import { pendingSyncNano } from "app/omnijs/nano";
import { action, observable, runInAction, toJS } from "mobx";

interface generateKeysType {
    _new: boolean;
    _passphrase: string;
    _mnemonic?: string;
    store_mnemonic?: boolean;
    store_passphrase?: boolean;
};

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
        //this.mnemonic = "connect ritual news sand rapid scale behind swamp damp brief explain ankle";
        this.mnemonic = "";
    }

    @action
    public emptyKeys = async (forget: boolean = false) => {
        this.isUnlocked = false;
        this.keys = {};
        this.balances = {};
        if(forget){
            this.mnemonic = "";
            this.passphrase = "";
            this.configStore.setKey('passphrase', "");
            this.configStore.setKey('mnemonic', "");
        }
    }

    @action
    public generateKeys = async ({_new, _passphrase, _mnemonic, store_mnemonic, store_passphrase}: generateKeysType) => {
        let p_local = "", m_local="";
        try{ p_local = await this.configStore.getKey('passphrase') }catch(e){}
        try{ m_local = await this.configStore.getKey('mnemonic') }catch(e){}

        const config = toJS(this.configStore.config);
        let mnemonic = _new ? null : _mnemonic || this.mnemonic || m_local;
        const passphrase = _passphrase || this.passphrase || p_local;

        for (const o of Object.keys(config)) {
            const c = config[o];

            const k = omnijs.generateSeed(mnemonic, passphrase, {
                config,
                rel: o,
                base: c.base ? o : c.ofBase,
            });

            this.keys[o] = k;
            mnemonic = k.mnemonic;
        }
        if(store_mnemonic) this.configStore.setKey('mnemonic', mnemonic);
        if(store_passphrase) this.configStore.setKey('passphrase', passphrase);
        
        runInAction(() => {        
            this.mnemonic = mnemonic;
            this.passphrase = passphrase;
        
            this.isUnlocked = true;
        });
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
                const balances = await omnijs.getBalance({rel: o, base: b}, this.keys[o].address, config);
                if (b == "NANO" && balances[b].pending > 0) {
                    pendingSyncNano({ config, rb: { rel: o, base: b}, balance: balances[b].balance_raw, pending: balances[b].pending_raw, address: this.keys[o].address, options: { publicKey: this.keys[o].publicKey, wif: this.keys[o].wif } });
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
