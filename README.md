# Treasure Guardian - GenLayer Intelligent Contract

Benvenuto al **Treasure Guardian**! Questo è un gioco Web3 IA-powered costruito sulla blockchain **GenLayer**.

## Descrizione del Progetto

Il Treasure Guardian è un avvincente gioco in cui tu sei l'avventuriero e devi convincere un "Guardiano" mosso dall'Intelligenza Artificiale a cederti il suo antico tesoro.
Tutto questo non avviene in modo centralizzato su un server web, ma tramite un **Intelligent Contract** scritto in Python per la blockchain GenLayer, dove i validatori della rete (tramite la *Optimistic Democracy*) si mettono d'accordo sul risultato dell'IA per decidere in modo decentralizzato se le tue "parole" sono sufficienti a convincere il Guardiano.

Se le tue argomentazioni sono valide, intelligenti o particolarmente simpatiche, il contratto rilascerà il tesoro in modo definitivo (modificando il suo stato).

## File nel Repository

- **`contract.py`**: Il cuore del dApp. Il contratto scritto con il GenLayer SDK (GenVM) che gestisce le logiche on-chain, esegue chiamate agli LLM in modo non deterministico e applica il Principio di Equivalenza per il consenso.
- **`index.html`** / **`style.css`** / **`app.js`**: Frontend vanilla (con animazioni fluide e stile accattivante) che utilizza `genlayer-js` e si connette con MetaMask per farti giocare in modo interattivo direttamente dal tuo browser.

## Come funziona la Validazione A.I.

Nel file `contract.py`, il metodo `chiedi_tesoro(phrase)` esegue queste operazioni principali:
1. Inizializza un prompt con la frase passata dall'utente.
2. Esegue una chiamata non-deterministica all'LLM (`gl.nondet.exec_prompt`).
3. Avvia la `validator_fn` dove la restate parte dei nodi esegue la propria valutazione AI. Se Leader e Validatore trovano un accordo, lo stato del tesoro varrà salvato irrevocabilmente on-chain.
