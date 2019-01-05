import * as omnijs from "app/omnijs";
import { action, observable, runInAction, toJS } from "mobx";
import { ConfigStore } from "../ConfigStore";
import { CoinStore } from "./CoinStore";
import { TransactionType } from "app/constants";

export class ExchangeStore {

  @observable public base = "";
  @observable public rel = "";

  @observable public address = "";
  @observable public publicKey = "";
  @observable public seed = "";

  @observable public wif = "";
  @observable public fees = 0;

  @observable public gasLimit = 0;
  @observable public gasPrice = 0;

  @observable public txs: TransactionType[] = [];

  public coinStore;
  public configStore;

  constructor(coinStore: CoinStore, configStore: ConfigStore) {
      this.coinStore = coinStore;
      this.configStore = configStore;
  }

  @action
  public setBase = (base) => {
    this.base = base;
    if (!base) {
      this.txs = [];
    }
  }
  @action
  public setRel = (rel) => {
    this.rel = rel;
  }

  @action
  public init = () => {

    const config = toJS(this.configStore.config);
    if (Object.keys(config).length > 0) {
      let r = this.rel;
      if (config[this.base].hasOwnProperty("assets")) {
        r = this.base;
      }

      const k = this.coinStore.keys[r];
      if(k){
        this.wif = k.wif;
        this.address = k.address;
        this.publicKey = k.publicKey;
        
        this.syncTxs();
      }
    }
  }

  @action
  public syncTxs = async (timeout = true) => {
    const config = toJS(this.configStore.config);

    const { txs } = await omnijs.getTxs({ rel: this.rel, base: this.base}, this.address, config);
    runInAction(() => {
      this.txs = txs;
    });
  }

  public send = async (address, amount, _data = ""): Promise<string> => {
    let result = "";
    const config = toJS(this.configStore.config);
    if (config[this.base].dualFee) {
        result = await omnijs.send(
          {rel: this.rel, base: this.base},
          this.address,
          address,
          amount,
          {
            wif: this.wif,
            publicKey: this.publicKey,
            fees: this.fees,
            gasLimit: Number(this.gasLimit),
            gasPrice: Number(this.gasPrice),
            config,
          });
      } else {
        result = await omnijs.send(
          { rel: this.rel, base: this.base },
          this.address,
          address,
          amount,
          {
            wif: this.wif,
            publicKey: this.publicKey,
            fees: this.fees,
            config,
            balance: this.coinStore.balances[this.rel],
          });
      }
    return result;
  }

  @action
  public setFees = (fees, kind = 0) => {
    const config = toJS(this.configStore.config);

    if (config[this.base].dualFee) {
      switch (kind) {
        case 1:
          this.gasLimit = parseInt(fees);
          this.fees = this.gasLimit * this.gasPrice * 1000000000;
          break;
        case 2:
          this.gasPrice = parseFloat(fees);
          this.fees = this.gasLimit * this.gasPrice * 1000000000;
          break;
      }
    } else {
      this.fees = fees;
    }
  }
}

export default ExchangeStore;
