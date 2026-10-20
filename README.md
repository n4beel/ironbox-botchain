# Ironbox

Lock BOT until a date. No early withdrawal, for anyone.

### BOT Chain mainnet (677) — live

| | |
|---|---|
| Contract | [`0x257E01Ccebb47d9973A54785D9177d35637a1A95`](https://scan.botchain.ai/address/0x257E01Ccebb47d9973A54785D9177d35637a1A95) · source verified |
| Deploy block | 27323093 |

### Bohr testnet (968) — live

| | |
|---|---|
| Contract | [`0x7849c33234B8392435042FF93fEB54e0e234e90b`](https://scan.bohr.life/address/0x7849c33234B8392435042FF93fEB54e0e234e90b) · source verified |
| Deploy block | 27396993 |

The two addresses differ because the deployer's nonce diverged between the chains; each is this
contract on its own network. The site targets mainnet.

---

## What it does
Ironbox lets you lock BOT for a beneficiary address until a specified timestamp. Once locked, only the beneficiary can withdraw, and only after the unlock date has passed.

## What it deliberately cannot do
- **No owner**: nobody controls this contract after deployment
- **No cancel**: the sender cannot retrieve funds before or after unlockAt
- **No early withdrawal**: there is no backdoor, not even for the contract deployer
- **No address change**: the beneficiary is set at lock time and is permanent
- **No pause**: the contract runs as long as BOT Chain runs

## Gas
- `lock()`: ~71k gas (target: ~70k)
- `withdraw()`: ~32k gas

## Honest limits
- If you lock funds for the wrong beneficiary address, those funds are permanently inaccessible to you
- `block.timestamp` is set by validators and can drift by ~15 seconds; this contract is not suited for sub-minute precision
