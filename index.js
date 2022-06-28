const fetch = require('cross-fetch')
const sigUtil = require('@metamask/eth-sig-util')
class Privateparty {
  constructor(o) {
    this.host = (o && o.host ? o.host : "")
    if (o && o.key) {
      this.key = o.key
    }
    this.web3 = o.web3
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
  async account () {
    // if a private key is specified, use that to derive the account
    if (this.key) {
      return this.web3.eth.accounts.privateKeyToAccount("0x" + this.key).address
    }
    // otherwise, make an RPC request to get the account
    else {
      let accounts = await window.ethereum.request({method: 'eth_requestAccounts'})
      return accounts[0]
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
      let account = await this.account()
      let { result } = await new Promise((resolve, reject) => {
        this.web3.currentProvider.sendAsync({
          method: "personal_sign",
          params: [ this.web3.utils.fromUtf8(str), account ]
        }, (err, r) => {
          if (err) reject(err)
          else resolve(r)
        })
      })
      return result
    }
  }
  // Connect and session
  async connect(name, payload) {
    const account = await this.account()
    const now = Date.now()
    let url = await this.path(name, "connect")
    const str = `authenticating ${account} at ${now} with nonce ${this.csrfToken}`
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
    return null
  }
}
module.exports = Privateparty
