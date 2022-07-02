const Web3Modal = require("web3modal");
const WalletConnectProvider = require("@walletconnect/web3-provider");
const Web3 = require('web3')
class Privateparty {
  constructor(o) {
    this.host = (o && o.host ? o.host : "")
    if (o && o.walletconnect) {
      this.walletconnect = o.walletconnect  // infuraId
    }
  }
  async init() {
    if (this.walletconnect) {
      // Walletconnect support if "walletconnect" is specified
      const web3Modal = new Web3Modal.default({
        providerOptions: {
          walletconnect: {
            display: { name: "Mobile or desktop wallet" },
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
      this.account = accounts[0]
    } else {
      // Default browser injected wallet
      this.provider = window.ethereum
      if (this.provider.isMetaMask) {
        await this.provider.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }]
        })
      }
      let accounts = await this.provider.request({ method: 'eth_requestAccounts' })
      this.account = accounts[0]
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
  async sign(str) {
    let result = await this.provider.request({
      method: "personal_sign",
      params: [ this.web3.utils.fromUtf8(str), this.account ]
    })
    return result
  }
  // Connect and session
  async connect(name, payload) {
    await this.init()
    const now = Date.now()
    let url = await this.path(name, "connect")
    const str = `authenticating ${this.account} at ${now} with nonce ${this.csrfToken}`
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
    this.account = null;
    this.web3 = null;
    return null
  }
}
module.exports = Privateparty
