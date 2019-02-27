import { generateKeysType, config, TransactionType, syncBalances, MAX_DECIMAL_FIAT, syncTxs, syncFiatPrices, explorer_api, REFRESH_TIMEOUT } from "app/constants";
import { types, destroy, flow } from "mobx-state-tree";
import axios from "axios";
import { getKey, setKey } from "app/utils";
import * as omnijs from "app/omnijs";
import PriceStore from "./PriceStore";

const EOSES = ["EOS"];


const WalletStore = types.model({
  keys: types.optional(types.map(types.model({
    ticker: types.identifier,
    wif: types.string,
    publicKey: types.string,
    address: types.string,
  })), {}),
  balances: types.optional(types.map(types.model({
    ticker: types.identifier,
    balance: types.number,
    pending: types.number,
  })), {}),
  txs: types.optional(types.array(TransactionType), []),

  
  base: types.optional(types.string, ""),
  rel: types.optional(types.string, ""),

  mnemonic: types.optional(types.string, ""),
  passphrase: types.optional(types.string, ""),

  isUnlocked: types.optional(types.boolean, false),
  isUnlockable: types.optional(types.boolean, false),
  isAutoUnlockable: types.optional(types.boolean, false),
  pass_local: types.optional(types.string, ""),

  fees: types.optional(types.number, 0),
  gasPrice: types.optional(types.number, 3),
  gasLimit: types.optional(types.number, 21000),
  priceStore: types.optional(PriceStore,{
    fiat: {
      name: "USD",
      symbol: "$"
    }    
  }),
}).views(self => {
  return {
    getKey(rel, base){
      return self.keys.has(rel) ? self.keys.get(rel) : self.keys.get(base);
    },
    get address(){
      return this.getKey(self.rel, self.base).address
    },
    balance(ticker = self.rel){
      const balance = self.balances.has(ticker) ? self.balances.get(ticker).balance : 0;
      return +balance.toFixed(MAX_DECIMAL_FIAT)
    },
    pending(pendingStr){
      const pending = self.balances.has(self.rel) ? self.balances.get(self.rel).pending : 0;
      return pending > 0 ? `(${+pending.toFixed(MAX_DECIMAL_FIAT)} ${pendingStr})` : ""      
    },
    coinlist(sort_type: number, sort_direction: number){
      let coinlist = self.base ? ([self.base]).concat(config[self.base].forks || [], Object.keys(config[self.base].assets || {})) : [];
      
      if (sort_type == 0 && sort_direction == 0) {
        coinlist.sort((a, b) => { if (a < b) { return -1 } if (a > b) { return 1 } return 0 })
      } else if (sort_type == 0 && sort_direction == 1) {
        coinlist.sort((b, a) => { if (a < b) { return -1 } if (a > b) { return 1 } return 0 })
      } else if (sort_type == 1 && sort_direction == 0) {
        coinlist.sort((a, b) => {
          const ap = self.priceStore.getPriceMulBal(a);
          const bp = self.priceStore.getPriceMulBal(b);
          if (bp < ap) { return -1 } if (a > b) { return 1 } return 0
        })
      } else if (sort_type == 1 && sort_direction == 1) {
        coinlist.sort((b, a) => {
          const ap = self.priceStore.getPriceMulBal(a);
          const bp = self.priceStore.getPriceMulBal(b);
          if (bp < ap) { return -1 } if (a > b) { return 1 } return 0
        })
      }
      return coinlist;
    }
  }
}).actions(self => {
  const setBase = (base) => {
    self.base = base;
    if (!base) {
      destroy(self.txs);
    }
  }
  const setRel = (rel) => {
    self.rel = rel;
  }
  const fetchTxs = (doTimeout = true) => {
    if (self.base && self.rel) {
      const address = self.keys.get(self.rel) ? self.keys.get(self.rel).address : self.keys.get(self.base).address;
      syncTxs({ rel: self.rel, base: self.base, address });
      if (doTimeout){
        setTimeout(() => {
          fetchTxs()
        }, REFRESH_TIMEOUT);
      }
    }
  }

  const updatePassLocal = (pass_local: string) => {
    self.pass_local = pass_local;
  }
  const init = flow(function* init() {
    let isUnlockable = false, isAutoUnlockable = false, pass_local = "";
    try {
      yield getKey('mnemonic')
      isUnlockable = true;
    } catch (e) { }
    try {
      pass_local = yield getKey('passphrase')
      isAutoUnlockable = true;
    } catch (e) { }

    updatePassLocal(pass_local);
    self.isUnlockable = isUnlockable;
    self.isAutoUnlockable = isAutoUnlockable;
    if (isAutoUnlockable){
      generateKeys({});
    }
  })
  const destroyTxs = () => {
    destroy(self.txs);
  }
  const emptyKeys = (forget: boolean = false) => {
    self.isUnlocked = false;
    destroy(self.keys);
    destroy(self.balances);
    destroy(self.txs);
    if (forget) {
      self.mnemonic = "";
      self.passphrase = "";
      setKey('passphrase', "");
      setKey('mnemonic', "");
    }
  }  
  const get_eos_name = flow(function* (ticker, k){
    const response = yield axios.get(`${explorer_api}/eos_account_name?public_key=${k.publicKey}&ticker=${ticker}`)
    const account_name = response.data.account_name;
    self.keys.set(ticker, { ...k, ticker, address: account_name || k.publicKey  });
  })
  const generateKeys = flow(function* generateKeys({ _new, _passphrase, _mnemonic, store_mnemonic, store_passphrase }: generateKeysType) {
    let p_local = "", m_local = "";
    try { p_local = yield getKey('passphrase') } catch (e) { }
    try { m_local = yield getKey('mnemonic') } catch (e) { }

    let mnemonic = _new ? null : _mnemonic || self.mnemonic || m_local;
    const passphrase = _passphrase || self.passphrase || p_local;

    const x = omnijs.generateSeed(mnemonic, passphrase);
    const seed = x.seed;
    mnemonic = x.mnemonic;

    for (const o of Object.keys(config)) {
      const c = config[o];
      const k = omnijs.generatePKey({ rel: o, base: c.base ? o : c.ofBase }, seed);
      if (EOSES.indexOf(o) != -1){
        yield get_eos_name(o, k);
      }else{
        self.keys.set(o, {...k, ticker: o});
      }
    }
    if (store_mnemonic) setKey('mnemonic', mnemonic);
    if (store_passphrase) setKey('passphrase', passphrase);

    self.mnemonic = mnemonic;
    self.passphrase = passphrase;

    self.isUnlocked = true;
    syncBalances(self.keys);
    syncFiatPrices(self.priceStore);
    return mnemonic;
  })

  const setFees = (fees, kind = 0) => {

    if (config[self.base].dualFee) {
      switch (kind) {
        case 1:
          self.gasLimit = parseInt(fees);
          self.fees = self.gasLimit * self.gasPrice * 1000000000;
          break;
        case 2:
          self.gasPrice = parseFloat(fees);
          self.fees = self.gasLimit * self.gasPrice * 1000000000;
          break;
      }
    } else {
      self.fees = parseInt(fees) || 0;
    }
  }

  const setBalance = (key, value) => {
    self.balances.set(key, { ...value, ticker: key});
  }
  const setTxs = (txs) => {
    self.txs = txs;
  }
  return {
    setBalance,
    setTxs,
    fetchTxs,
    destroyTxs,

    setBase,
    setRel,
    init,
    updatePassLocal,
    emptyKeys,
    generateKeys,    
    setFees,
  } 
});
export type IWalletStore = typeof WalletStore.Type;
export default WalletStore;
