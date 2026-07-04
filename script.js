// ======================================================
// MultiStream
// Part 1 - Initialization & Channel Management
// ======================================================

const streamsContainer = document.getElementById("streams");
const template = document.getElementById("streamTemplate");

const channelForm = document.getElementById("channelForm");
const channelInput = document.getElementById("channelInput");

const copyLinkBtn = document.getElementById("copyLink");
const clearBtn = document.getElementById("clearAll");
const toggleChatBtn = document.getElementById("toggleChat");
const rotateBtn = document.getElementById("rotateStreams");

let channels = [];
let activeChannel = null;

const playerBase = "https://player.twitch.tv/?channel=";

// ======================================================
// Utilities
// ======================================================

function normalizeChannel(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/^(https?:\/\/)?(www\.)?twitch\.tv\//, "")
    .split(/[/?#]/)[0];
}

function unique(array) {
  return [...new Set(array)];
}

// ======================================================
// Storage
// ======================================================

function loadChannels() {
  // Read from path: /streamer1/streamer2
  // (requires a server with SPA fallback, like server.py)
  return unique(
    location.pathname
      .split("/")
      .filter(Boolean)
      .map(normalizeChannel)
      .filter(Boolean)
      .filter((ch) => ch !== "multistream" && ch !== "index.html"),
  );
}

// ======================================================
// URL
// ======================================================

function updateURL() {
  const path = channels.length === 0 ? "/" : "/" + channels.join("/");

  history.replaceState({}, "", path);
}

// ======================================================
// Rendering
// ======================================================

function render() {
  streamsContainer.innerHTML = "";

  channels.forEach((channel) => {
    createStreamCard(channel);
  });

  syncState();
}

// ======================================================
// State sync (shared after add/remove/rotate)
// ======================================================

function syncState() {
  updateGrid();
  updateURL();
  populateChatChannelSelect();
  rebuildChatFrames();
  lucide.createIcons();
  toggleEmptyState();
}

function toggleEmptyState() {
  const emptyState = document.getElementById("emptyState");
  const streams = document.getElementById("streams");
  if (!emptyState || !streams) return;

  const hasChannels = channels.length > 0;

  emptyState.classList.toggle("hidden", hasChannels);
  streams.classList.toggle("hidden", !hasChannels);
}

// ======================================================
// Channel Management (surgical – no full rebuild)
// ======================================================

function addChannels(list) {
  const incoming = list.split(",").map(normalizeChannel).filter(Boolean);

  incoming.forEach((ch) => {
    if (!channels.includes(ch)) {
      channels.push(ch);
      createStreamCard(ch);
    }
  });

  syncState();

  // Show chat frame for the selected channel if chat panel is visible
  if (chatChannelSelect && chatChannelSelect.value) {
    showChatFrame(chatChannelSelect.value);
    activeChannel = chatChannelSelect.value;
  }
}

function removeChannel(channel) {
  channels = channels.filter((c) => c !== channel);

  const card = streamsContainer.querySelector(
    `.stream-card[data-channel="${channel}"]`,
  );
  if (card) card.remove();

  syncState();
}

function clearChannels() {
  if (!confirm("Remove every stream?")) return;

  channels = [];

  streamsContainer.innerHTML = "";

  syncState();
}

function rotateChannels() {
  if (channels.length < 2) return;

  // FLIP: record current positions
  const cards = [...streamsContainer.querySelectorAll(".stream-card")];
  const rects = cards.map((c) => c.getBoundingClientRect());

  // Rotate left
  channels.push(channels.shift());

  // Reorder visually with CSS order — no DOM moves, no iframe reloads
  channels.forEach((ch, i) => {
    const card = streamsContainer.querySelector(
      `.stream-card[data-channel="${ch}"]`,
    );
    if (card) card.style.order = i;
  });

  // Reset any gridColumn override (3-stream layout)
  cards.forEach((c) => (c.style.gridColumn = ""));

  // FLIP: animate from old positions to new positions
  requestAnimationFrame(() => {
    cards.forEach((card, i) => {
      const newRect = card.getBoundingClientRect();
      const dx = rects[i].left - newRect.left;
      const dy = rects[i].top - newRect.top;

      if (dx !== 0 || dy !== 0) {
        card.style.transition = "none";
        card.style.transform = `translate(${dx}px, ${dy}px)`;

        requestAnimationFrame(() => {
          card.style.transition = "transform 0.35s ease";
          card.style.transform = "";
        });
      }
    });

    // Clean up
    setTimeout(() => {
      cards.forEach((c) => {
        c.style.transition = "";
        c.style.transform = "";
      });
    }, 400);
  });

  syncState();
}

// ======================================================
// Events
// ======================================================

// Normalize input in-place when a URL is pasted or typed
channelInput.addEventListener("input", () => {
  const raw = channelInput.value.trim();
  const normalized = normalizeChannel(raw);
  if (normalized !== raw) {
    channelInput.value = normalized;
  }
});

channelForm.addEventListener("submit", (e) => {
  e.preventDefault();

  if (!channelInput.value.trim()) return;

  addChannels(channelInput.value);

  channelInput.value = "";

  channelInput.focus();
});

clearBtn.addEventListener("click", clearChannels);

rotateBtn.addEventListener("click", rotateChannels);

copyLinkBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);

    copyLinkBtn.innerHTML = '<i data-lucide="check"></i><span>Copied</span>';
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      copyLinkBtn.innerHTML = '<i data-lucide="share-2"></i><span>Share</span>';
      if (window.lucide) lucide.createIcons();
    }, 1500);
  } catch {
    alert(location.href);
  }
});

toggleChatBtn.addEventListener("click", () => {
  if (!globalChat) return;

  const isHidden = globalChat.classList.contains("hidden");

  if (isHidden) {
    const target = activeChannel || channels[0];
    if (target) {
      showChatFrame(target);
    }
  }

  globalChat.classList.toggle("hidden");

  syncChatLayout();
});

// ======================================================
// CHANNEL SELECTOR FOR GLOBAL CHAT
// ======================================================

const chatChannelSelect = document.getElementById("chatChannelSelect");

function populateChatChannelSelect() {
  if (!chatChannelSelect) return;

  const currentValue = chatChannelSelect.value;

  chatChannelSelect.innerHTML =
    '<option value="">— Select a channel —</option>';

  channels.forEach((channel) => {
    const opt = document.createElement("option");
    opt.value = channel;
    opt.textContent = channel;
    chatChannelSelect.appendChild(opt);
  });

  // Restore or set to active/first channel
  if (currentValue && channels.includes(currentValue)) {
    chatChannelSelect.value = currentValue;
  } else if (activeChannel && channels.includes(activeChannel)) {
    chatChannelSelect.value = activeChannel;
  } else if (channels.length > 0) {
    chatChannelSelect.value = channels[0];
  }
}

chatChannelSelect.addEventListener("change", () => {
  const channel = chatChannelSelect.value;
  if (!channel) return;

  showChatFrame(channel);

  activeChannel = channel;

  globalChat.classList.remove("hidden");

  syncChatLayout();
});

// ======================================================
// PRELOAD ALL CHAT FRAMES – SWAP VISIBILITY
// ======================================================

const chatFramesContainer = document.getElementById("chatFramesContainer");

function rebuildChatFrames() {
  if (!chatFramesContainer) return;

  const existing = [...chatFramesContainer.querySelectorAll(".chat-frame")];
  const existingChannels = existing.map((f) => f.dataset.channel);

  // Add frames for new channels
  channels.forEach((channel) => {
    if (!existingChannels.includes(channel)) {
      const frame = document.createElement("iframe");
      frame.className = "chat-frame hidden";
      frame.dataset.channel = channel;
      frame.src = `https://www.twitch.tv/embed/${channel}/chat?${twitchParents()}&darkpopout`;
      chatFramesContainer.appendChild(frame);
    }
  });

  // Remove frames for deleted channels
  existing.forEach((frame) => {
    if (!channels.includes(frame.dataset.channel)) {
      frame.remove();
    }
  });
}

function showChatFrame(channel) {
  if (!chatFramesContainer) return;

  chatFramesContainer
    .querySelectorAll(".chat-frame")
    .forEach((f) => f.classList.add("hidden"));

  const target = chatFramesContainer.querySelector(
    `.chat-frame[data-channel="${channel}"]`,
  );
  if (target) {
    target.classList.remove("hidden");
  }
}

function syncChatLayout() {
  const mainEl = document.querySelector("main");
  if (!mainEl || !globalChat) return;

  mainEl.classList.toggle(
    "chat-open",
    !globalChat.classList.contains("hidden"),
  );
}

// ======================================================
// Responsive Grid
// ======================================================

function updateGrid() {
  const count = channels.length;

  let cols = 1;

  if (count === 1) cols = 1;
  else if (count === 2) cols = 2;
  else if (count === 3) cols = 2;
  else if (count === 4) cols = 3;
  else if (count <= 9) cols = 3;
  else cols = Math.ceil(Math.sqrt(count));

  streamsContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  // For special layouts
  const cards = [...streamsContainer.querySelectorAll(".stream-card")];
  cards.forEach((c) => {
    c.style.gridColumn = "";
    c.style.gridRow = "";
    c.style.gridArea = "";
  });
  streamsContainer.style.gridTemplateAreas = "";

  if (count === 3 || count === 4) {
    // Sort by visual order (CSS order property, set by rotateChannels)
    cards.sort(
      (a, b) => (parseInt(a.style.order) || 0) - (parseInt(b.style.order) || 0),
    );
    cards[0].style.gridColumn = "1 / -1";
    // Second row gets smaller height
    streamsContainer.style.gridTemplateRows = "1fr 0.55fr";
  } else if (count === 5) {
    // 2 centered on first row, 3 fill full width on second row
    cols = 6;
    streamsContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    cards.sort(
      (a, b) => (parseInt(a.style.order) || 0) - (parseInt(b.style.order) || 0),
    );
    // Row 1: items span 2 columns each (same width as bottom row)
    cards[0].style.gridColumn = "2 / span 2";
    cards[0].style.gridRow = "1";
    cards[1].style.gridColumn = "4 / span 2";
    cards[1].style.gridRow = "1";
    // Row 2: each item spans 2 columns to fill full width
    cards[2].style.gridColumn = "1 / span 2";
    cards[2].style.gridRow = "2";
    cards[3].style.gridColumn = "3 / span 2";
    cards[3].style.gridRow = "2";
    cards[4].style.gridColumn = "5 / span 2";
    cards[4].style.gridRow = "2";
    streamsContainer.style.gridTemplateRows = "";
  } else {
    streamsContainer.style.gridTemplateRows = "";
  }
}

// ======================================================
// TomSelect – Chat Channel Selector
// ======================================================

let tomSelectInstance = null;

function initTomSelect() {
  if (typeof TomSelect === "undefined") {
    console.warn("TomSelect not loaded — falling back to native select");
    return;
  }

  if (tomSelectInstance) return;

  tomSelectInstance = new TomSelect("#chatChannelSelect", {
    create: false,
    placeholder: "— Select a channel —",
    allowEmptyOption: true,
    sortField: [{ field: "$order", direction: "asc" }],
    onChange(value) {
      if (!value) return;
      showChatFrame(value);
      activeChannel = value;
      globalChat.classList.remove("hidden");
      syncChatLayout();
    },
  });
}

// Override populateChatChannelSelect to sync TomSelect
const _origPopulateChatChannelSelect = populateChatChannelSelect;

populateChatChannelSelect = function () {
  _origPopulateChatChannelSelect();

  if (!tomSelectInstance) return;

  // Sync options with TomSelect
  tomSelectInstance.clearOptions();
  tomSelectInstance.addOption({
    value: "",
    text: "— Select a channel —",
    $order: 0,
  });

  channels.forEach((channel, i) => {
    tomSelectInstance.addOption({
      value: channel,
      text: channel,
      $order: i + 1,
    });
  });

  tomSelectInstance.refreshOptions(false);

  // Restore selected value
  const current = chatChannelSelect.value;
  if (current) {
    tomSelectInstance.setValue(current, true);
  }
};

////
// ======================================================
// Init
// ======================================================

channels = loadChannels();

initTomSelect();
render();

initTomSelect();
populateChatChannelSelect();

// Show first channel's chat frame by default
if (channels.length > 0) {
  showChatFrame(channels[0]);
  activeChannel = channels[0];
}

channelInput.focus();

// ======================================================
// MultiStream
// Part 2 - Stream Rendering (Twitch Iframes)
// ======================================================

function twitchParents() {
  const hosts = ["localhost"];

  if (
    location.hostname &&
    location.hostname !== "localhost" &&
    location.hostname !== "127.0.0.1"
  ) {
    hosts.push(location.hostname);
  }

  return hosts.map((h) => `parent=${encodeURIComponent(h)}`).join("&");
}

// ======================================================
// FULLSCREEN
// ======================================================

function toggleFullscreen(card) {
  const isFull = card.classList.contains("fullscreen");

  document
    .querySelectorAll(".stream-card")
    .forEach((c) => c.classList.remove("fullscreen"));

  if (!isFull) {
    card.classList.add("fullscreen");
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;

  document
    .querySelectorAll(".stream-card")
    .forEach((card) => card.classList.remove("fullscreen"));
});

// ======================================================
// STREAM CARD
// ======================================================

function createStreamCard(channel) {
  const node = template.content.cloneNode(true);

  const card = node.querySelector(".stream-card");
  const title = node.querySelector(".channel-name");
  const player = node.querySelector(".player");
  const removeBtn = node.querySelector(".remove-btn");
  const fullscreenBtn = node.querySelector(".fullscreen-btn");
  const reloadBtn = node.querySelector(".reload-btn");

  title.textContent = channel;
  card.dataset.channel = channel;

  player.src = `${playerBase}${channel}&${twitchParents()}&autoplay=true&muted=true`;

  // Reload
  reloadBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const src = player.src;
    player.src = "";
    setTimeout(() => (player.src = src), 100);
  });

  // Open chat on click
  card.addEventListener("click", () => openChat(channel));

  // Remove
  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    removeChannel(channel);
  });

  // Fullscreen
  fullscreenBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFullscreen(card);
  });

  // Rename
  const editBtn = node.querySelector(".edit-btn");
  const renameForm = node.querySelector(".rename-form");
  const renameInput = node.querySelector(".rename-input");

  // Stop clicks on form elements from bubbling to card (which opens chat)
  renameForm.addEventListener("click", (e) => e.stopPropagation());
  renameInput.addEventListener("click", (e) => e.stopPropagation());

  // Normalize URL pastes in rename input
  renameInput.addEventListener("input", () => {
    const raw = renameInput.value.trim();
    const normalized = normalizeChannel(raw);
    if (normalized !== raw) {
      renameInput.value = normalized;
    }
  });

  editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    title.classList.add("hidden");
    editBtn.classList.add("hidden");
    renameForm.classList.remove("hidden");
    renameInput.value = channel;
    renameInput.focus();
    renameInput.select();
  });

  renameForm.addEventListener("submit", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const newName = normalizeChannel(renameInput.value);
    if (!newName || newName === channel) {
      // Cancel if empty or unchanged
      title.classList.remove("hidden");
      editBtn.classList.remove("hidden");
      renameForm.classList.add("hidden");
      return;
    }

    const oldName = channel;

    // Prevent duplicates
    if (channels.includes(newName) && newName !== oldName) {
      renameInput.focus();
      renameInput.select();
      return;
    }

    // Update channels array
    const idx = channels.indexOf(oldName);
    if (idx !== -1) {
      channels[idx] = newName;
    }

    // Update card
    card.dataset.channel = newName;
    title.textContent = newName;

    // Update iframe
    player.src = `${playerBase}${newName}&${twitchParents()}&autoplay=true&muted=true`;

    // Restore view
    title.classList.remove("hidden");
    editBtn.classList.remove("hidden");
    renameForm.classList.add("hidden");

    // Update active channel reference
    if (activeChannel === oldName) {
      activeChannel = newName;
    }

    channel = newName;

    syncState();

    // Show the new channel's chat if chat panel is open
    if (globalChat && !globalChat.classList.contains("hidden")) {
      showChatFrame(newName);
      if (chatChannelSelect) chatChannelSelect.value = newName;
    }
  });

  // Cancel on Escape
  renameInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      title.classList.remove("hidden");
      editBtn.classList.remove("hidden");
      renameForm.classList.add("hidden");
    }
  });

  // Cancel on blur (clicking outside)
  renameInput.addEventListener("blur", () => {
    // Small delay so submit button click registers first
    setTimeout(() => {
      if (!renameForm.classList.contains("hidden")) {
        title.classList.remove("hidden");
        editBtn.classList.remove("hidden");
        renameForm.classList.add("hidden");
      }
    }, 150);
  });

  card.addEventListener("dblclick", () => toggleFullscreen(card));

  // Hover highlight
  card.addEventListener("mouseenter", () => {
    card.style.borderColor = "#9147ff";
  });
  card.addEventListener("mouseleave", () => {
    card.style.borderColor = "#2d2d35";
  });

  // Error handling
  player.addEventListener("error", () => {
    console.warn("Stream failed:", channel);
    player.style.opacity = "0.5";
    player.title = "Stream unavailable";
  });

  streamsContainer.appendChild(node);
}

// ======================================================
// RENDER (with fullscreen cleanup)
// ======================================================

const _origRender = render;

render = function () {
  document
    .querySelectorAll(".stream-card")
    .forEach((c) => c.classList.remove("fullscreen"));

  _origRender();
};

// ======================================================
// HOTKEYS (1–9 focus stream)
// ======================================================

document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;

  const num = parseInt(e.key, 10);

  if (isNaN(num) || num < 1 || num > 9) return;

  const cards = document.querySelectorAll(".stream-card");

  const index = num - 1;

  if (!cards[index]) return;

  cards[index].scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  cards.forEach((c) => c.classList.remove("focused"));

  cards[index].classList.add("focused");
});

// ======================================================

const globalChat = document.getElementById("globalChat");

function openChat(channel) {
  if (!globalChat) return;

  showChatFrame(channel);

  globalChat.classList.remove("hidden");

  activeChannel = channel;

  if (chatChannelSelect) {
    chatChannelSelect.value = channel;
  }

  syncChatLayout();
}

// Expose openChat globally so stream cards can use it
window.openChat = openChat;
