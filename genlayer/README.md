# Treasure Guardian - GenLayer Intelligent Contract

Welcome to the **Treasure Guardian**! This is an AI-powered Web3 game built on the **GenLayer** blockchain.

## Project Description

Treasure Guardian is an engaging game where you play the role of an adventurer and must convince an AI-driven "Guardian" to hand over its ancient treasure.
This does not happen on a centralized web server, but through an **Intelligent Contract** written in Python for the GenLayer blockchain, where network validators (via *Optimistic Democracy*) reach consensus on the AI output to deterministically agree if your "words" were enough to sway the Guardian.

If your arguments are valid, clever, or particularly brave, the contract will permanently release the treasure on-chain, irrevocably changing its state.

## Repository Files

- **`contract.py`**: The core dApp logic. The contract written with the GenLayer SDK (GenVM) handles on-chain state, executes non-deterministic LLM calls, and applies the Equivalence Principle to reach consensus.
- **`index.html`** / **`style.css`** / **`app.js`**: A vanilla frontend (featuring fluid animations and stunning styling) that utilizes `genlayer-js` and integrates with MetaMask to let you play the game directly from your browser.

## How the AI Validation Works

In `contract.py`, the `ask_for_treasure` method executes these main operations:
1. It initializes a prompt containing the user's phrase.
2. It executes a non-deterministic call to the LLM (`gl.nondet.exec_prompt`).
3. It launches the `validator_fn` where the rest of the nodes run their own AI evaluation. If the Leader and Validator nodes reach consensus, the state of the treasure will be permanently changed on-chain.
