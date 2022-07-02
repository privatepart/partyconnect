const sigUtil = require('@metamask/eth-sig-util')
const Web3Modal = require("web3modal");
const WalletConnectProvider = require("@walletconnect/web3-provider");
const Web3 = require('web3')
class Privateparty {
  constructor(o) {
    this.host = (o && o.host ? o.host : "")
    if (o && o.key) {
      this.key = o.key
    }
    if (o && o.walletconnect) {
      this.walletconnect = o.walletconnect
    }
  }
  async init() {
    if (this.walletconnect) {
      const web3Modal = new Web3Modal.default({
        providerOptions: {
          walletconnect: {
            display: { name: "Mobile" },
            package: WalletConnectProvider.default,
            options: {
              infuraId: this.walletconnect
            }
          }
        }
      });
      await web3Modal.clearCachedProvider();
      this.provider = await web3Modal.connect();
      if (this.provider.isMetaMask) {
        await this.provider.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }]
        })
      }
      let accounts = await this.provider.enable()
      this._account = accounts[0]
    } else {
      this.provider = window.ethereum
      if (this.provider.isMetaMask) {
        await this.provider.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }]
        })
      }
      let accounts = await this.provider.request({ method: 'eth_requestAccounts' })
      this._account = accounts[0]
    }
    this.web3 = new Web3(this.provider)
  }
  async party(name) {
    if (!this.parties) {
      let r = await fetch(this.host + "/privateparty", {
        credentials: (this.host === "" ? "same-origin" : "include"),
      }).then(r => r.json())
      this.parties = r.parties
      this.csrfToken = r.csrfToken
    }
    if (name) {
      return this.parties[name]
    } else {
      return this.parties
    }
  }
  async path(name, pathName) {
    let p = await this.party(name)
    return p[pathName]
  }
  // Get current session info
  async session(name) {
    let url = await this.path(name, "session")
    let r = await fetch(this.host + url, {
      credentials: (this.host === "" ? "same-origin" : "include"),
    }).then((r) => {
      return r.json()
    })
    return r[name]
  }
  account () {
    // if a private key is specified, use that to derive the account
    if (this.key) {
      return this.web3.eth.accounts.privateKeyToAccount("0x" + this.key).address
    }
    // otherwise, make an RPC request to get the account
    else {
      return this._account;
    }
  }
  async sign(str) {
    // if a private key is specified, use that to sign the message
    if (this.key) {
      let result = sigUtil.personalSign({
        data: Buffer.from(str),
        privateKey: Buffer.from(this.key, "hex")
      })
      return result
    } 
    // otherwise, sign using RPC
    else {
      let result = await this.provider.request({
        method: "personal_sign",
        params: [ this.web3.utils.fromUtf8(str), this.account() ]
      })
      //let { result } = await new Promise((resolve, reject) => {
      //  this.web3.eth.personal.sign(
      //    this.web3.utils.fromUtf8(str),
      //    this.account(),
      //    (err, r) => {
      //      if (err) reject(err)
      //      else resolve(r)
      //    }
      //  )
      //})
      //let result = await this.web3.eth.personal.sign(
      //  this.web3.utils.fromUtf8(str),
      //  this.account(),
      //)
      //let { result } = await new Promise((resolve, reject) => {
      //  this.web3.currentProvider.sendAsync({
      //    method: "personal_sign",
      //    params: [ this.web3.utils.fromUtf8(str), this.account() ]
      //  }, (err, r) => {
      //    if (err) reject(err)
      //    else resolve(r)
      //  })
      //})

      //let result = await this.web3.eth.personal.sign(this.web3.utils.fromUtf8(str), this.account()).catch((e) => { console.log("##", e) })
      //console.log("result", result)
      return result
    }
  }
  // Connect and session
  async connect(name, payload) {
    await this.init()
    const now = Date.now()
    let url = await this.path(name, "connect")
    const str = `authenticating ${this.account()} at ${now} with nonce ${this.csrfToken}`
    let sig = await this.sign(str)
    let r = await fetch(this.host + url, {
      method: "POST",
      credentials: (this.host === "" ? "same-origin" : "include"),
      headers: {
        "Content-Type": "application/json",
        'CSRF-Token': this.csrfToken,
      },
      body: JSON.stringify({
        str,
        sig,
        payload
      })
    }).then((res) => {
      if(res.ok) {
        return res.json()
      } else {
        return res.json().then((json) => {
          throw new Error(json.error)
        })
      }
    })
    this.parties = null   // clear parties so it will refetch parties and csrfToken next time
    this.csrfToken = null
    return r
  }
  // Delete session
  async disconnect(name) {
    let url = await this.path(name, "disconnect")
    let r = await fetch(this.host + url, {
      method: "POST",
      credentials: (this.host === "" ? "same-origin" : "include"),
      headers: {
        "Content-Type": "application/json",
        'CSRF-Token': this.csrfToken,
      },
      body: JSON.stringify({ name })
    }).then((res) => {
      return res.json()
    })
    this.parties = null   // clear parties so it will refetch parties and csrfToken next time
    this.csrfToken = null
    if (this.provider.disconnect) {
      try { await this.provider.disconnect() } catch (e) { }
    }
    if (this.walletconnect) {
      localStorage.removeItem("walletconnect")
    }
    this.provider = null;
    return null
  }
}
module.exports = Privateparty
