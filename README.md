# Private party

Join a private club

1. `privateclub`: The backend for implementing blockchain authentication and authorization (powered by express.js)
2. `privateparty`: The frontend library for easily interacting with a `privateclub` backend

---

# Install

```
<script src="https://unpkg.com/privateparty/dist/privateparty.js"></script>
```

---

# Usage

```html
const web3 = new Web3(window.ethereum)
const party = new Privateparty({ web3 })
let session = await party.session()
await party.connect()
await party.disconnect()
```
