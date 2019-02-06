import { generateKeysType, config, explorer_api, TransactionType, syncBalances } from "app/constants";
import { types, destroy, flow } from "mobx-state-tree";
import { getKey, setKey, http2Ws } from "app/utils";
import * as omnijs from "app/omnijs";


const WalletStore = types.model({
  keys: types.optional(types.map(types.model({
    ticker: types.string,
    wif: types.string,
    publicKey: types.string,
    address: types.string,
    mnemonic: types.string,
  })), {}),
  balances: types.optional(types.map(types.model({
    balance_raw: types.string,
    pending_raw: types.string,
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
  pass_local: types.optional(types.string, ""),

  fees: types.optional(types.number, 0),
  gasPrice: types.optional(types.number, 0),
  gasLimit: types.optional(types.number, 0),
}).views(self => {
  return {
    get address(){
      return 0;
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

  const updatePassLocal = (pass_local: string) => {
    self.pass_local = pass_local;
  }
  const init = flow(function* init() {
    let isUnlockable = false, pass_local = "";
    try {
      yield getKey('mnemonic')
      isUnlockable = true;
    } catch (e) { }
    try {
      pass_local = yield getKey('passphrase')
    } catch (e) { }

    updatePassLocal(pass_local);
    self.isUnlockable = isUnlockable;
  })
  const emptyKeys = (forget: boolean = false) => {
    self.isUnlocked = false;
    destroy(self.keys);
    destroy(self.balances);
    if (forget) {
      self.mnemonic = "";
      self.passphrase = "";
      setKey('passphrase', "");
      setKey('mnemonic', "");
    }
  }  

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
      const k = omnijs.generatePKey({ rel: o, base: c.base ? o : c.ofBase }, config, seed);
      self.keys[o] = k;
    }
    if (store_mnemonic) setKey('mnemonic', mnemonic);
    if (store_passphrase) setKey('passphrase', passphrase);

    self.mnemonic = mnemonic;
    self.passphrase = passphrase;

    self.isUnlocked = true;
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
      self.fees = fees;
    }
  }

  const setBalance = (key, value) => {
    self.balances.set(key, value);
  }
  const setTxs = (txs) => {
    self.txs = txs;
  }
  return {
    setBalance,
    setTxs,

    setBase,
    setRel,
    init,
    updatePassLocal,
    emptyKeys,
    generateKeys,    
    setFees,
  } 
});
export default WalletStore;
