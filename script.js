// ===== Configuration =====

// Interval in milliseconds for live updates (e.g., 3 minutes)
const REFRESH_INTERVAL_MS = 3 * 60 * 1000;

// Public MMA Fight Cards API (scrapes Tapology)
// Docs: https://github.com/onkyoh/mma-fights-api
// Hosted at:
//   https://mma-fights-api-production.up.railway.app/
const MMA_API_URL = "https://mma-fights-api-production.up.railway.app/";

// ===== DOM References =====

const eventsContainer = document.getElementById("events-container");
const emptyStateEl = document.getElementById("empty-state");
const lastUpdatedEl = document.getElementById("last-updated");
const liveStatusTextEl = document.getElementById("live-status-text");
const statusDotEl = document.querySelector(".status-dot");
const metricEventsEl = document.getElementById("metric-events");
const metricFightsEl = document.getElementById("metric-fights");
const refreshBtn = document.getElementById("refresh-btn");

let refreshTimerId = null;

// ===== Utilities =====

function setLiveStatus(text, mode = "idle") {
  liveStatusTextEl.textContent = text;
  if (mode === "loading") {
    statusDotEl.style.background = "#ffc857";
    statusDotEl.style.boxShadow = "0 0 10px rgba(255, 200, 87, 0.9)";
  } else if (mode === "live") {
    statusDotEl.style.background = "#38f9d7";
    statusDotEl.style.boxShadow = "0 0 10px rgba(56, 249, 215, 1)";
  } else if (mode === "error") {
    statusDotEl.style.background = "#ff4b81";
    statusDotEl.style.boxShadow = "0 0 10px rgba(255, 75, 129, 1)";
  } else {
    statusDotEl.style.background = "#ffc857";
    statusDotEl.style.boxShadow = "0 0 8px rgba(255, 200, 87, 0.9)";
  }
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function getInitials(name) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 3);
}

function parseRecord(record) {
  if (!record) {
    return { wins: 0, losses: 0, draws: 0, total: 0 };
  }
  const parts = record.split("-").map((p) => parseInt(p.trim(), 10));
  const wins = Number.isFinite(parts[0]) ? parts[0] : 0;
  const losses = Number.isFinite(parts[1]) ? parts[1] : 0;
  const draws = Number.isFinite(parts[2]) ? parts[2] : 0;
  const total = wins + losses + draws;
  return { wins, losses, draws, total };
}

function estimateFinishProfile(weightLbs, winPct) {
  const w = Number.parseInt(weightLbs, 10) || 170;
  const win = clamp(winPct, 0, 1);

  // Baseline by division (heavier -> more KO, lighter -> more decisions/subs)
  let baseKo, baseSub, baseDec;
  if (w >= 205) {
    baseKo = 0.55;
    baseSub = 0.2;
    baseDec = 0.25;
  } else if (w >= 170) {
    baseKo = 0.45;
    baseSub = 0.25;
    baseDec = 0.30;
  } else if (w >= 145) {
    baseKo = 0.35;
    baseSub = 0.3;
    baseDec = 0.35;
  } else if (w >= 125) {
    baseKo = 0.28;
    baseSub = 0.32;
    baseDec = 0.4;
  } else {
    baseKo = 0.25;
    baseSub = 0.35;
    baseDec = 0.4;
  }

  // Slightly push toward more finishes for high win%
  const finishBoost = (win - 0.5) * 0.3; // +/- 15%
  baseKo = clamp(baseKo + finishBoost * 0.6, 0.1, 0.7);
  baseSub = clamp(baseSub + finishBoost * 0.4, 0.1, 0.6);

  let baseFin = baseKo + baseSub;
  if (baseFin > 0.9) {
    const scale = 0.9 / baseFin;
    baseKo *= scale;
    baseSub *= scale;
  }
  baseDec = clamp(1 - (baseKo + baseSub), 0.05, 0.6);

  const sum = baseKo + baseSub + baseDec || 1;
  return {
    koPct: baseKo / sum,
    subPct: baseSub / sum,
    decisionPct: baseDec / sum
  };
}

function buildFighterFromApi(raw, weightLbs, isMain) {
  const rec = parseRecord(raw.record);
  const winPct = rec.total > 0 ? rec.wins / rec.total : 0.5;
  const finishProfile = estimateFinishProfile(weightLbs, winPct);

  return {
    name: raw.name || "TBA",
    record: raw.record || "0-0",
    countryFlagUrl: raw.country || "",
    imageUrl: raw.picture || "",
    profileUrl: raw.link || "",
    weightLbs: weightLbs || "",
    isMainCard: !!isMain,
    wins: rec.wins,
    losses: rec.losses,
    draws: rec.draws,
    totalFights: rec.total,
    winPct,
    koPct: finishProfile.koPct,
    subPct: finishProfile.subPct,
    decisionPct: finishProfile.decisionPct
  };
}

// ===== Prediction Engine (record & division based) =====

function computeFighterScore(fighter) {
  const winScore = fighter.winPct * 100;

  const expScore =
    Math.log(1 + fighter.totalFights) / Math.log(1 + 40) * 100;

  const finishScore =
    (fighter.koPct * 0.6 + fighter.subPct * 0.4) * 100;

  const undefeatedBonus =
    fighter.totalFights >= 5 && fighter.losses === 0 ? 12 : 0;
  const mainCardBonus = fighter.isMainCard ? 6 : 0;

  const totalScore =
    winScore * 0.55 +
    expScore * 0.2 +
    finishScore * 0.15 +
    (undefeatedBonus + mainCardBonus) * 0.1;

  return totalScore;
}

function calculatePrediction(fA, fB) {
  const scoreA = computeFighterScore(fA);
  const scoreB = computeFighterScore(fB);

  const diff = scoreA - scoreB;
  const scaledDiff = diff / 18; // sensitivity factor
  const probA = 1 / (1 + Math.exp(-scaledDiff));
  const probB = 1 - probA;

  const winner = probA >= probB ? "A" : "B";
  const winnerProb = winner === "A" ? probA : probB;
  const confidence = Math.round(Math.abs(probA - probB) * 100);

  const bestPick =
    Math.abs(probA - probB) >= 0.35 && winnerProb >= 0.65;

  const methodsA = {
    ko: fA.koPct,
    sub: fA.subPct,
    dec: fA.decisionPct
  };
  const methodsB = {
    ko: fB.koPct,
    sub: fB.subPct,
    dec: fB.decisionPct
  };

  const primaryKeyA = Object.entries(methodsA).sort(
    (x, y) => y[1] - x[1]
  )[0][0];
  const primaryKeyB = Object.entries(methodsB).sort(
    (x, y) => y[1] - x[1]
  )[0][0];

  function methodLabel(key) {
    if (key === "ko") return "KO/TKO";
    if (key === "sub") return "Submission";
    return "Decision";
  }

  return {
    fighterA: {
      score: scoreA,
      prob: probA,
      methods: methodsA,
      primaryMethod: methodLabel(primaryKeyA)
    },
    fighterB: {
      score: scoreB,
      prob: probB,
      methods: methodsB,
      primaryMethod: methodLabel(primaryKeyB)
    },
    winner,
    winnerProb,
    confidence,
    bestPick
  };
}

// ===== Rendering =====

function renderEvents(events) {
  eventsContainer.innerHTML = "";

  if (!events || events.length === 0) {
    emptyStateEl.classList.remove("hidden");
    const p = emptyStateEl.querySelector("p");
    if (p) {
      p.textContent =
        "Live UFC data is currently unavailable or no upcoming UFC cards were found. Please try again later.";
    }
    metricEventsEl.textContent = "0";
    metricFightsEl.textContent = "0";
    return;
  }

  emptyStateEl.classList.add("hidden");

  let totalFights = 0;

  events.forEach((event, index) => {
    const card = document.createElement("article");
    card.className = "event-card";
    if (index === 0) {
      card.classList.add("expanded");
    }

    const header = document.createElement("div");
    header.className = "event-header";

    const meta = document.createElement("div");
    meta.className = "event-meta";

    const nameEl = document.createElement("div");
    nameEl.className = "event-name";
    nameEl.textContent = event.name || "UFC Event";

    const subEl = document.createElement("div");
    subEl.className = "event-sub";
    subEl.textContent = `${event.dateText || "Date TBA"} • UFC Fight Card`;

    const tags = document.createElement("div");
    tags.className = "event-meta-tags";
    const tagPrimary = document.createElement("span");
    tagPrimary.className = "event-tag event-tag-primary";
    tagPrimary.textContent = "UFC";
    const tagSecondary = document.createElement("span");
    tagSecondary.className = "event-tag";
    tagSecondary.textContent = "Tapology Feed";
    tags.appendChild(tagPrimary);
    tags.appendChild(tagSecondary);

    meta.appendChild(nameEl);
    meta.appendChild(subEl);
    meta.appendChild(tags);

    const headerRight = document.createElement("div");
    headerRight.className = "event-header-right";

    const countPill = document.createElement("div");
    countPill.className = "event-count-pill";
    const fightCount = event.fights ? event.fights.length : 0;
    totalFights += fightCount;
    countPill.textContent = `${fightCount} fights`;

    const toggleIcon = document.createElement("div");
    toggleIcon.className = "event-toggle-icon";
    toggleIcon.textContent = "▶";

    headerRight.appendChild(countPill);
    headerRight.appendChild(toggleIcon);

    header.appendChild(meta);
    header.appendChild(headerRight);
    card.appendChild(header);

    const body = document.createElement("div");
    body.className = "event-body";

    const fightsGrid = document.createElement("div");
    fightsGrid.className = "fights-grid";

    (event.fights || []).forEach((fight) => {
      const fightCard = renderFightCard(fight);
      fightsGrid.appendChild(fightCard);
    });

    body.appendChild(fightsGrid);
    card.appendChild(body);

    header.addEventListener("click", () => {
      const expanded = card.classList.toggle("expanded");
      body.style.maxHeight = expanded ? `${body.scrollHeight + 24}px` : "0";
    });

    requestAnimationFrame(() => {
      if (card.classList.contains("expanded")) {
        body.style.maxHeight = `${body.scrollHeight + 24}px`;
      } else {
        body.style.maxHeight = "0";
      }
    });

    eventsContainer.appendChild(card);
  });

  metricEventsEl.textContent = String(events.length);
  metricFightsEl.textContent = String(totalFights);
}

function renderFightCard(fight) {
  const { fighterA, fighterB } = fight;
  const analysis = calculatePrediction(fighterA, fighterB);

  const card = document.createElement("div");
  card.className = "fight-card";
  if (analysis.bestPick) {
    card.classList.add("best-pick");
    const bestLabel = document.createElement("div");
    bestLabel.className = "best-pick-label";
    bestLabel.textContent = "Best Pick";
    card.appendChild(bestLabel);
  }

  const left = document.createElement("div");
  left.className = "fight-left";

  const fightersBlock = document.createElement("div");
  fightersBlock.className = "fighters-block";

  const metaRow = document.createElement("div");
  metaRow.className = "fight-meta-row";

  const weightClassEl = document.createElement("span");
  weightClassEl.className = "weight-class";
  weightClassEl.textContent = fight.weightLbs
    ? `${fight.weightLbs} lbs`
    : "Bout";

  const tagEl = document.createElement("span");
  tagEl.className = "fight-meta-tag";
  tagEl.textContent = fight.main ? "Main Card" : "Prelim";

  metaRow.appendChild(weightClassEl);
  metaRow.appendChild(tagEl);

  const fightersRow = document.createElement("div");
  fightersRow.className = "fighters-row";

  const fighterPanelA = document.createElement("div");
  fighterPanelA.className = "fighter-panel";
  const avatarA = document.createElement("div");
  avatarA.className = "fighter-avatar";
  if (fighterA.imageUrl) {
    avatarA.style.backgroundImage = `url(${fighterA.imageUrl})`;
    avatarA.textContent = "";
  } else {
    avatarA.textContent = getInitials(fighterA.name);
  }
  const infoA = document.createElement("div");
  infoA.className = "fighter-info";
  const nameA = document.createElement("div");
  nameA.className = "fighter-name";
  nameA.textContent = fighterA.name;
  const recordA = document.createElement("div");
  recordA.className = "fighter-record";
  const winPctA = (fighterA.winPct * 100).toFixed(0);
  recordA.textContent = `${fighterA.record} • Win ${winPctA}% • ${fighterA.totalFights} fights`;
  const physA = document.createElement("div");
  physA.className = "fighter-phys";
  physA.textContent = "Tapology profile";
  infoA.append(nameA, recordA, physA);
  fighterPanelA.append(avatarA, infoA);

  const vsLabel = document.createElement("div");
  vsLabel.className = "vs-label";
  vsLabel.textContent = "VS";

  const fighterPanelB = document.createElement("div");
  fighterPanelB.className = "fighter-panel";
  const avatarB = document.createElement("div");
  avatarB.className = "fighter-avatar secondary";
  if (fighterB.imageUrl) {
    avatarB.style.backgroundImage = `url(${fighterB.imageUrl})`;
    avatarB.textContent = "";
  } else {
    avatarB.textContent = getInitials(fighterB.name);
  }
  const infoB = document.createElement("div");
  infoB.className = "fighter-info";
  const nameB = document.createElement("div");
  nameB.className = "fighter-name";
  nameB.textContent = fighterB.name;
  const recordB = document.createElement("div");
  recordB.className = "fighter-record";
  const winPctB = (fighterB.winPct * 100).toFixed(0);
  recordB.textContent = `${fighterB.record} • Win ${winPctB}% • ${fighterB.totalFights} fights`;
  const physB = document.createElement("div");
  physB.className = "fighter-phys";
  physB.textContent = "Tapology profile";
  infoB.append(nameB, recordB, physB);
  fighterPanelB.append(avatarB, infoB);

  fightersRow.append(fighterPanelA, vsLabel, fighterPanelB);

  fightersBlock.append(metaRow, fightersRow);

  const statsBlock = document.createElement("div");
  statsBlock.className = "stat-groups";

  const row1 = document.createElement("div");
  row1.className = "stat-row";
  const row1Label = document.createElement("div");
  row1Label.className = "stat-label";
  row1Label.textContent = "Record / Win% / Fights";
  const row1Vals = document.createElement("div");
  row1Vals.className = "stat-values";
  const row1A = document.createElement("span");
  row1A.className = "stat-pill";
  row1A.textContent = `${fighterA.record} • ${winPctA}% • ${fighterA.totalFights}`;
  const row1B = document.createElement("span");
  row1B.className = "stat-pill";
  row1B.textContent = `${fighterB.record} • ${winPctB}% • ${fighterB.totalFights}`;
  row1Vals.append(row1A, row1B);
  row1.append(row1Label, row1Vals);

  const row2 = document.createElement("div");
  row2.className = "stat-row";
  const row2Label = document.createElement("div");
  row2Label.className = "stat-label";
  row2Label.textContent = "Bout Info (Weight / Card)";
  const row2Vals = document.createElement("div");
  row2Vals.className = "stat-values";
  const row2A = document.createElement("span");
  row2A.className = "stat-pill";
  row2A.textContent = `${fight.weightLbs || "?"} lbs • ${
    fight.main ? "Main" : "Prelim"
  }`;
  const row2B = document.createElement("span");
  row2B.className = "stat-pill";
  row2B.textContent = `${fight.weightLbs || "?"} lbs • ${
    fight.main ? "Main" : "Prelim"
  }`;
  row2Vals.append(row2A, row2B);
  row2.append(row2Label, row2Vals);

  const row3 = document.createElement("div");
  row3.className = "stat-row";
  const row3Label = document.createElement("div");
  row3Label.className = "stat-label";
  row3Label.textContent = "Estimated Finish Profile (KO/Sub/Dec)";
  const row3Vals = document.createElement("div");
  row3Vals.className = "stat-values";
  const row3A = document.createElement("span");
  row3A.className = "stat-pill";
  row3A.textContent = `${Math.round(
    fighterA.koPct * 100
  )}% / ${Math.round(fighterA.subPct * 100)}% / ${Math.round(
    fighterA.decisionPct * 100
  )}%`;
  const row3B = document.createElement("span");
  row3B.className = "stat-pill";
  row3B.textContent = `${Math.round(
    fighterB.koPct * 100
  )}% / ${Math.round(fighterB.subPct * 100)}% / ${Math.round(
    fighterB.decisionPct * 100
  )}%`;
  row3Vals.append(row3A, row3B);
  row3.append(row3Label, row3Vals);

  statsBlock.append(row1, row2, row3);

  left.append(fightersBlock, statsBlock);

  const right = document.createElement("div");
  right.className = "fight-right";

  const predHeader = document.createElement("div");
  predHeader.className = "prediction-header";

  const winnerName =
    analysis.winner === "A" ? fighterA.name : fighterB.name;
  const winnerProbPct = Math.round(analysis.winnerProb * 100);

  const winnerEl = document.createElement("div");
  winnerEl.className = "predicted-winner";
  winnerEl.textContent = `Predicted Winner: ${winnerName}`;

  const confidenceEl = document.createElement("div");
  confidenceEl.className = "confidence-pill";
  confidenceEl.textContent = `AI Confidence: ${winnerProbPct}%`;

  predHeader.append(winnerEl, confidenceEl);

  const barWrapper = document.createElement("div");
  barWrapper.className = "prediction-bar-wrapper";

  const barLabels = document.createElement("div");
  barLabels.className = "prediction-bar-labels";

  const labelA = document.createElement("div");
  labelA.textContent = `${fighterA.name} • ${(
    analysis.fighterA.prob * 100
  ).toFixed(0)}%`;
  const labelB = document.createElement("div");
  labelB.textContent = `${(analysis.fighterB.prob * 100).toFixed(
    0
  )}% • ${fighterB.name}`;
  barLabels.append(labelA, labelB);

  const bar = document.createElement("div");
  bar.className = "prediction-bar";

  const fill = document.createElement("div");
  fill.className = "prediction-fill";

  const fillA = document.createElement("div");
  fillA.className = "prediction-fill-a";
  fillA.style.width = `${analysis.fighterA.prob * 100}%`;

  const fillB = document.createElement("div");
  fillB.className = "prediction-fill-b";
  fillB.style.width = `${analysis.fighterB.prob * 100}%`;

  fill.append(fillA, fillB);

  const barSplit = document.createElement("div");
  barSplit.className = "prediction-bar-split";
  const barLabelA = document.createElement("div");
  barLabelA.className = "prediction-label-a";
  barLabelA.textContent = "A";
  const barLabelB = document.createElement("div");
  barLabelB.className = "prediction-label-b";
  barLabelB.textContent = "B";
  barSplit.append(barLabelA, barLabelB);

  bar.append(fill, barSplit);

  barWrapper.append(barLabels, bar);

  const detailRow = document.createElement("div");
  detailRow.className = "prediction-detail-row";

  const methodCol = document.createElement("div");
  methodCol.className = "detail-col";
  const methodHeading = document.createElement("div");
  methodHeading.className = "detail-heading";
  methodHeading.textContent = "Likely Method of Victory";

  const methodList = document.createElement("div");

  const addMethodChip = (key, value, primary) => {
    const chip = document.createElement("span");
    chip.className = "method-chip" + (primary ? " primary" : "");
    const dot = document.createElement("span");
    dot.className =
      "method-dot " + (key === "ko" ? "ko" : key === "sub" ? "sub" : "dec");
    const label = document.createElement("span");
    const pct = Math.round(value * 100);
    const textLabel =
      key === "ko" ? "KO/TKO" : key === "sub" ? "Submission" : "Decision";
    label.textContent = `${textLabel} ${pct}%`;
    chip.append(dot, label);
    methodList.appendChild(chip);
  };

  const primaryKey =
    analysis.winner === "A"
      ? Object.entries(analysis.fighterA.methods).sort(
          (x, y) => y[1] - x[1]
        )[0][0]
      : Object.entries(analysis.fighterB.methods).sort(
          (x, y) => y[1] - x[1]
        )[0][0];

  const methods =
    analysis.winner === "A"
      ? analysis.fighterA.methods
      : analysis.fighterB.methods;

  ["ko", "sub", "dec"].forEach((key) => {
    addMethodChip(key, methods[key], key === primaryKey);
  });

  methodCol.append(methodHeading, methodList);

  const recentCol = document.createElement("div");
  recentCol.className = "detail-col";
  const recentHeading = document.createElement("div");
  recentHeading.className = "detail-heading";
  recentHeading.textContent = "Data Source";

  const recentText = document.createElement("div");
  recentText.className = "recent-form";
  recentText.innerHTML =
    '<div><span>Fights:</span> Live upcoming UFC cards from Tapology (via MMA Fights API)</div>' +
    '<div><span>Engine:</span> AI-style score from real records, divisions, and experience</div>';

  recentCol.append(recentHeading, recentText);

  detailRow.append(methodCol, recentCol);

  right.append(predHeader, barWrapper, detailRow);

  card.append(left, right);

  return card;
}

// ===== Data Fetching =====

async function fetchUpcomingEvents() {
  try {
    const res = await fetch(MMA_API_URL);
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }
    const data = await res.json();
    const rawEvents = Array.isArray(data.data) ? data.data : [];

    // Filter down to upcoming UFC events only
    const ufcEventsRaw = rawEvents.filter((ev) =>
      ev.title && ev.title.toUpperCase().startsWith("UFC ")
    );

    if (!ufcEventsRaw.length) {
      setLiveStatus("Live feed OK, but no upcoming UFC cards found.", "error");
      return [];
    }

    const events = ufcEventsRaw.map((ev, index) => {
      const fights =
        (ev.fights || []).map((fight, i) => {
          const weightLbs = fight.weight || "";
          const fighterA = buildFighterFromApi(
            fight.fighterA || {},
            weightLbs,
            !!fight.main
          );
          const fighterB = buildFighterFromApi(
            fight.fighterB || {},
            weightLbs,
            !!fight.main
          );

          return {
            id: `${index}-${i}`,
            main: !!fight.main,
            weightLbs,
            fighterA,
            fighterB
          };
        }) || [];

      return {
        id: ev.link || String(index),
        name: ev.title || "UFC Event",
        dateText: ev.date || "Date TBA",
        fights
      };
    });

    return events;
  } catch (err) {
    console.error("Failed to fetch MMA events:", err);
    setLiveStatus(
      "Live UFC data unavailable. Check your connection or try again later.",
      "error"
    );
    return [];
  }
}

async function refreshData() {
  setLiveStatus("Scanning upcoming UFC events...", "loading");
  refreshBtn.disabled = true;

  try {
    const events = await fetchUpcomingEvents();
    renderEvents(events);
    const now = new Date();
    lastUpdatedEl.textContent = now.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    if (events.length > 0) {
      setLiveStatus("Live UFC feed synced", "live");
    }
  } catch (err) {
    console.error(err);
    setLiveStatus(
      "Unexpected error while updating UFC feed.",
      "error"
    );
  } finally {
    refreshBtn.disabled = false;
  }
}

function startAutoRefresh() {
  if (refreshTimerId) {
    clearInterval(refreshTimerId);
  }
  refreshTimerId = setInterval(refreshData, REFRESH_INTERVAL_MS);
}

// ===== Init =====

document.addEventListener("DOMContentLoaded", () => {
  refreshBtn.addEventListener("click", () => {
    refreshData();
  });

  refreshData();
  startAutoRefresh();
});

