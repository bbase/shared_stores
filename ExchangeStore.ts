import * as omnijs from "app/omnijs";
import {ethers} from "ethers";
import { action, observable, runInAction, toJS } from "mobx";
import { ConfigStore } from "../ConfigStore";
import { CoinStore } from "./CoinStore";

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

  @observable public txs = [];

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
      this.wif = k.wif;
      this.address = k.address;
      this.publicKey = k.publicKey;

      this.syncTxs();
    }
  }

  @action
  public syncTxs = async (timeout = true) => {
    const config = toJS(this.configStore.config);

    // @ts-ignore
    const { txs } = await omnijs.getTxs(this.rel, this.base, this.address, config);
    runInAction(() => {
      this.txs = txs;
    });
  }

  public send = async (address, amount, _data = "") => {
    let result;
    const config = toJS(this.configStore.config);
    if (config[this.base].dualFee) {
        result = await omnijs.send(
          this.rel,
          this.base,
          this.address,
          address,
          amount,
          this.wif,
          {
            fees: this.fees,
            gasLimit: ethers.utils.hexlify(this.gasLimit.toString()),
            gasPrice: ethers.utils.hexlify(this.gasPrice.toString()),
            config,
          });
      } else {
        result = await omnijs.send(
          this.rel,
          this.base,
          this.address,
          address,
          amount,
          this.wif,
          {
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
