# Ironbox

Lock BOT until a date. No early withdrawal, for anyone.

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
