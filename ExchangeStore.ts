import { observable, action, runInAction, toJS } from 'mobx';
import * as omnijs from "app/omnijs"
import { CoinStore } from './CoinStore';
import { ConfigStore } from '../ConfigStore';
import Web3Utils from 'web3-utils';


export class ExchangeStore {
  
  @observable base = "";
  @observable rel = "";

  @observable address = "";
  @observable publicKey = "";
  @observable seed = "";
  
  @observable wif = "";
  @observable fees = 0;
  
  @observable gasLimit = 0;
  @observable gasPrice = 0;

  @observable txs = [];


  public coinStore;
  public configStore;

  constructor(coinStore: CoinStore, configStore: ConfigStore){
      this.coinStore = coinStore;
      this.configStore = configStore;
  }

  @action 
  setBase = (base) => {
    this.base = base;
    if(!base){
      this.txs = [];
    }
  }
  @action 
  setRel = (rel) => {
    this.rel = rel;
  }

  @action 
  init = () => {
    
    const config = toJS(this.configStore.config)
    if (Object.keys(config).length > 0){
      let r = this.rel;
      if (config[this.base].hasOwnProperty("assets")){
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
  syncTxs = async (timeout = true) => {
    const config = toJS(this.configStore.config)

    //@ts-ignore
    const { txs } = await omnijs.getTxs(this.rel, this.base, this.address, config);
    runInAction(() => {
      this.txs = txs;
    });    
  }

  send = async (address, amount, _data = "") => {
    let result;
    const config = toJS(this.configStore.config)
    if (config[this.base].dualFee){
        result = await omnijs.send(
          this.rel,
          this.base,
          this.address,
          address,
          amount,
          this.wif,
          {
            fees: this.fees,
            gasLimit: Web3Utils.toHex(this.gasLimit.toString()),
            gasPrice: Web3Utils.toHex(this.gasPrice.toString()),
            config: config
          });
      }else {
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
            config: config,
            balance: this.coinStore.balances[this.rel]
          });
      }
      return result
  }





  @action
  setFees = (fees, kind = 0) => {
    const config = toJS(this.configStore.config)

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
