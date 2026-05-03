/**
 * The Treasure Guardian — GenLayer dApp
 * genlayer-js v1.1.7 + MetaMask wallet adapter
 * Contract:  0xaDcaA295C956B1098d6A49e83d3816133ed2902D
 * Network:   GenLayer Studionet — Chain ID 61999
 * RPC:       https://studio.genlayer.com/api
 * RPC:       https://studio.genlayer.com/api
 */

// ─────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────
const CONTRACT_ADDRESS = '0xaDcaA295C956B1098d6A49e83d3816133ed2902D';

// GenLayer Studio runs locally — transactions go to localhost:4000
// The contract was deployed on Studio local, not on a public chain.
const STUDIO_LOCAL_RPC  = 'https://studio.genlayer.com/api';
const STUDIO_LOCAL_UI   = 'https://explorer-studio.genlayer.com';   // Studio web UI to check TXs

const STUDIONET_METAMASK = {
  chainIdHex:       '0xF22F',   // 61999 decimal
  name:             'GenLayer Studionet',
  rpcUrl:           STUDIO_LOCAL_RPC,
  currencyName:     'GEN',
  currencySymbol:   'GEN',
  currencyDecimals: 18,
  explorerUrl:      STUDIO_LOCAL_UI,
};

// CDN paths for genlayer-js v1.1.7
const GL_SDK_URL    = 'https://unpkg.com/genlayer-js@1.1.7/dist/index.js';
const GL_CHAINS_URL = 'https://unpkg.com/genlayer-js@1.1.7/dist/chains/index.js';

// ─────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────
let glClient         = null;
let connectedAddress = null;

// ─────────────────────────────────────────────────────────
// GENLAYER CLIENT INIT
// ─────────────────────────────────────────────────────────
async function initClient(signerAddress) {
  if (glClient) return true;
  try {
    const [sdk, chains] = await Promise.all([
      import(GL_SDK_URL),
      import(GL_CHAINS_URL),
    ]);

    const { createClient, createAccount } = sdk;

    // Define Studionet explicitly to avoid local fallback
    const chain = {
      id: 61999,
      name: 'GenLayer Studionet',
      nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
      rpcUrls: {
        default: { http: [STUDIO_LOCAL_RPC] },
      },
    };

    // Always use an ephemeral account — Studio auto-funds new accounts
    const account = createAccount();

    glClient = createClient({ chain, account });
    console.log('[GenLayer] Client ready on localnet (Studio). Signer:', account.address);
    return true;
  } catch (err) {
    console.error('[GenLayer] SDK load failed:', err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────
// METAMASK — CONNECT
// ─────────────────────────────────────────────────────────
async function connectWallet() {
  if (!window.ethereum) {
    showToast('🦊 MetaMask not detected! Install it from metamask.io');
    return;
  }

  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts?.length) throw new Error('No accounts returned');

    await ensureStudionet();

    connectedAddress = accounts[0];

    // Re-init client with the real wallet address
    glClient = null;
    await initClient(connectedAddress);

    setWalletUI(connectedAddress);
    showToast('✅ MetaMask connected on GenLayer Studionet!');
    await checkTreasure();

  } catch (err) {
    console.error('[connectWallet]', err);
    showToast(err.code === 4001
      ? '❌ Connection rejected by user.'
      : `❌ ${err.message || err}`);
  }
}

// ─────────────────────────────────────────────────────────
// METAMASK — ENSURE CORRECT NETWORK
// ─────────────────────────────────────────────────────────
async function ensureStudionet() {
  const current = await window.ethereum.request({ method: 'eth_chainId' });
  if (current.toLowerCase() === STUDIONET_METAMASK.chainIdHex.toLowerCase()) return;

  showToast('🔄 Switching to GenLayer Studionet...');

  // Step 1: try switching (works if already in MetaMask)
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: STUDIONET_METAMASK.chainIdHex }],
    });
    return;
  } catch (switchErr) {
    if (switchErr.code !== 4902) throw switchErr;
  }

  // Step 2: not found → add it
  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId:           STUDIONET_METAMASK.chainIdHex,
        chainName:         STUDIONET_METAMASK.name,
        rpcUrls:           [STUDIONET_METAMASK.rpcUrl],
        nativeCurrency: {
          name:     STUDIONET_METAMASK.currencyName,
          symbol:   STUDIONET_METAMASK.currencySymbol,
          decimals: STUDIONET_METAMASK.currencyDecimals,
        },
        blockExplorerUrls: [STUDIONET_METAMASK.explorerUrl],
      }],
    });
  } catch (addErr) {
    // Chain already exists under a different name → just switch
    console.warn('[ensureStudionet] add failed, retrying switch:', addErr.message);
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: STUDIONET_METAMASK.chainIdHex }],
    });
  }
}

// ─────────────────────────────────────────────────────────
// METAMASK — DISCONNECT
// ─────────────────────────────────────────────────────────
function disconnectWallet() {
  connectedAddress = null;
  glClient = null;
  document.getElementById('btn-connect').style.display = '';
  document.getElementById('wallet-connected').style.display = 'none';
  document.getElementById('btn-wallet-gate').style.display = '';
  document.getElementById('btn-challenge').style.display = 'none';
  showToast('👋 Wallet disconnected.');
  // Re-init with anonymous client for reads
  initClient(null).then(checkTreasure);
}

// ─────────────────────────────────────────────────────────
// METAMASK — EVENT LISTENERS
// ─────────────────────────────────────────────────────────
if (window.ethereum) {
  window.ethereum.on('accountsChanged', (accounts) => {
    if (!accounts.length) { disconnectWallet(); return; }
    connectedAddress = accounts[0];
    glClient = null;
    initClient(connectedAddress);
    setWalletUI(connectedAddress);
    showToast('🔄 Account changed.');
  });

  window.ethereum.on('chainChanged', async (chainId) => {
    if (chainId.toLowerCase() !== STUDIONET_METAMASK.chainIdHex.toLowerCase()) {
      showToast('⚠️ Wrong network — switching back...');
      try { await ensureStudionet(); } catch (_) { disconnectWallet(); }
    }
  });
}

// ─────────────────────────────────────────────────────────
// UI — WALLET CONNECTED STATE
// ─────────────────────────────────────────────────────────
function setWalletUI(address) {
  document.getElementById('btn-connect').style.display = 'none';
  document.getElementById('wallet-connected').style.display = 'flex';
  document.getElementById('wallet-address').textContent = shortAddr(address);
  document.getElementById('btn-wallet-gate').style.display = 'none';
  document.getElementById('btn-challenge').style.display = '';
}

function shortAddr(addr) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';
}

// ─────────────────────────────────────────────────────────
// PARTICLES
// ─────────────────────────────────────────────────────────
(function setupParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 3 + 1;
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${size}px; height: ${size}px;
      --dur: ${Math.random() * 12 + 8}s;
      --delay: ${Math.random() * 10}s;
      opacity: ${Math.random() * 0.6 + 0.1};
    `;
    if (Math.random() > 0.7) p.style.background = '#a78bfa';
    container.appendChild(p);
  }
})();

// ─────────────────────────────────────────────────────────
// CHAR COUNTER
// ─────────────────────────────────────────────────────────
const phraseInput = document.getElementById('user-phrase');
const charCount   = document.getElementById('char-count');

phraseInput.addEventListener('input', () => {
  charCount.textContent = phraseInput.value.length;
});
phraseInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); challengeGuardian(); }
});

// ─────────────────────────────────────────────────────────
// CHECK TREASURE STATE
// ─────────────────────────────────────────────────────────
async function checkTreasure() {
  const icon  = document.getElementById('status-icon');
  const value = document.getElementById('status-value');
  value.textContent = 'Checking...';
  value.className   = 'status-value';

  if (!glClient) await initClient(connectedAddress);

  try {
    let hasTreasure;
    if (glClient) {
      hasTreasure = await glClient.readContract({
        address:      CONTRACT_ADDRESS,
        functionName: 'check_treasure',
        args:         [],
      });
    } else {
      hasTreasure = true;
    }

    icon.textContent  = hasTreasure ? '💎' : '💀';
    value.textContent = hasTreasure
      ? 'The Treasure is still safely guarded!'
      : 'The Treasure has already been claimed!';
    value.className = `status-value ${hasTreasure ? 'has-treasure' : 'no-treasure'}`;

  } catch (err) {
    console.error('[checkTreasure]', err);
    icon.textContent  = '⚠️';
    value.textContent = 'Could not read state. Check connection.';
  }
}

// ─────────────────────────────────────────────────────────
// CHALLENGE THE GUARDIAN
// ─────────────────────────────────────────────────────────
async function challengeGuardian() {
  if (!connectedAddress) { showToast('🦊 Connect MetaMask first!'); return; }

  const phrase = phraseInput.value.trim();
  if (!phrase) {
    phraseInput.focus();
    phraseInput.style.borderColor = 'var(--danger)';
    setTimeout(() => (phraseInput.style.borderColor = ''), 1500);
    return;
  }

  const btn = document.getElementById('btn-challenge');
  btn.disabled = true;
  showLoading('Sending transaction to GenLayer Studionet...');

  if (!glClient) await initClient(connectedAddress);

  try {
    let success = false, txHash;

    if (glClient) {
      // ── Import TransactionStatus for waitForTransactionReceipt ──
      const { TransactionStatus } = await import(
        'https://unpkg.com/genlayer-js@1.1.7/dist/types/index.js'
      ).catch(() => ({ TransactionStatus: { FINALIZED: 'FINALIZED', ACCEPTED: 'ACCEPTED' } }));

      // Richiedi la firma su MetaMask prima di inviare la transazione vera e propria
      updateLoadingStep('Waiting for wallet confirmation in MetaMask...');
      await window.ethereum.request({
        method: 'personal_sign',
        params: [`I authenticate my challenge to the Guardian with this exact phrase:\n\n"${phrase}"`, connectedAddress]
      });

      updateLoadingStep('Leader node is executing the contract with the AI...');

      txHash = await glClient.writeContract({
        address:      CONTRACT_ADDRESS,
        functionName: 'ask_for_treasure',
        args:         [phrase],
        value:        BigInt(0),
      });

      updateLoadingStep('Validators reaching consensus (Optimistic Democracy)...');

      // Use the SDK's built-in polling helper
      try {
        await glClient.waitForTransactionReceipt({
          hash:    txHash,
          status:  TransactionStatus.FINALIZED ?? 'FINALIZED',
        });
      } catch (_) {
        // If waitForTransactionReceipt is not available, fall back to manual polling
        for (let i = 0; i < 30; i++) {
          await sleep(3000);
          try {
            const r = await glClient.getTransactionByHash({ hash: txHash });
            if (r && ['FINALIZED', 'ACCEPTED'].includes(r.status)) break;
            updateLoadingStep(`Waiting for finalization... (${i + 1}/30)`);
          } catch (_) { /* keep polling */ }
        }
      }

      // Read final state to determine outcome
      const hasTreasureNow = await glClient.readContract({
        address:      CONTRACT_ADDRESS,
        functionName: 'check_treasure',
        args:         [],
      }).catch(() => null);

      // If treasure is now gone and was there before → we won
      success = hasTreasureNow === false;


    hideLoading();

    if (success) {
      showResult('🏆', 'Victory!', 'The Guardian was convinced! The Treasure is yours!', txHash, true);
      addHistory(phrase, true);
    } else {
      showResult('⚔️', 'Rejected!', "The Guardian wasn't impressed. Your words weren't enough. Try again!", txHash, false);
      addHistory(phrase, false);
    }

    await checkTreasure();

  } catch (err) {
    console.error('[challengeGuardian]', err);
    hideLoading();
    showResult('❌', 'Error', `An error occurred: ${err?.message || String(err)}`, null, false);
  } finally {
    btn.disabled = false;
    phraseInput.value     = '';
    charCount.textContent = '0';
  }
}

// ─────────────────────────────────────────────────────────
// UI HELPERS
// ─────────────────────────────────────────────────────────
function showLoading(step) {
  document.getElementById('loading-step').textContent = step;
  const el = document.getElementById('loading-overlay');
  el.classList.add('visible');
  el.setAttribute('aria-hidden', 'false');
}
function updateLoadingStep(t) { document.getElementById('loading-step').textContent = t; }
function hideLoading() {
  const el = document.getElementById('loading-overlay');
  el.classList.remove('visible');
  el.setAttribute('aria-hidden', 'true');
}

function showResult(icon, title, message, txHash, isWin) {
  document.getElementById('result-icon').textContent    = icon;
  document.getElementById('result-title').textContent   = title;
  document.getElementById('result-message').textContent = message;
  const txEl = document.getElementById('result-tx');
  if (txHash) { txEl.textContent = `TX: ${txHash}`; txEl.classList.add('visible'); }
  else txEl.classList.remove('visible');
  document.getElementById('result-card').style.borderColor =
    isWin ? 'rgba(245,158,11,0.5)' : 'rgba(248,113,113,0.3)';
  const overlay = document.getElementById('result-overlay');
  overlay.classList.add('visible');
  overlay.setAttribute('aria-hidden', 'false');
}
function closeResult() {
  document.getElementById('result-overlay').classList.remove('visible');
  document.getElementById('result-overlay').setAttribute('aria-hidden', 'true');
}

function addHistory(phrase, won) {
  const container = document.getElementById('history-list');
  container.querySelector('.history-empty')?.remove();
  const item = document.createElement('div');
  item.className = 'history-item';
  const addr = connectedAddress
    ? `<span style="font-size:0.72rem;color:var(--text-muted);font-family:monospace">${shortAddr(connectedAddress)}</span>`
    : '';
  item.innerHTML = `
    <span class="history-emoji">${won ? '✅' : '❌'}</span>
    <span class="history-phrase" title="${phrase}">${phrase} ${addr}</span>
    <span class="history-result ${won ? 'win' : 'lose'}">${won ? 'Won' : 'Lost'}</span>
  `;
  container.prepend(item);
  const items = container.querySelectorAll('.history-item');
  if (items.length > 10) items[items.length - 1].remove();
}

function showToast(message) {
  let toast = document.getElementById('network-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'network-toast';
    toast.className = 'network-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('visible'), 3500);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─────────────────────────────────────────────────────────
// EXPLORER LINK + BOOT
// ─────────────────────────────────────────────────────────
// Point contract link to local GenLayer Studio UI
document.getElementById('contract-link').href = STUDIO_LOCAL_UI;

(async () => {
  // Check GenLayer Studio is running
  try {
    const probe = await fetch(STUDIO_LOCAL_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'net_version', params: [], id: 1 }),
    });
    if (!probe.ok) throw new Error('Studio not responding');
    console.log('[Studio] GenLayer Studio is running at', STUDIO_LOCAL_RPC);
  } catch (_) {
    showToast('⚠️ GenLayer Studio not detected at studio.genlayer.com — wait a moment!');
  }

  // Boot: init anonymous client for reads
  await initClient(null);
  await checkTreasure();

  // Show connect gate initially
  document.getElementById('btn-wallet-gate').style.display = '';
  document.getElementById('btn-challenge').style.display = 'none';

  // Auto-reconnect if MetaMask already authorized
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        connectedAddress = accounts[0];
        glClient = null;
        await initClient(connectedAddress);
        setWalletUI(connectedAddress);
        showToast('✅ MetaMask auto-connected!');
      }
    } catch (_) {}
  }
})();

// Expose for inline handlers
window.connectWallet     = connectWallet;
window.disconnectWallet  = disconnectWallet;
window.checkTreasure     = checkTreasure;
window.challengeGuardian = challengeGuardian;
window.closeResult       = closeResult;
