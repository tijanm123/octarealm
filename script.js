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
const refreshBtn = document.getElementById("refresh-btn");
const fighterSearchInput = document.getElementById("fighter-search");
const searchResultsEl = document.getElementById("search-results");
const fighterModal = document.getElementById("fighter-modal");
const closeModalBtn = document.getElementById("close-modal");
const runSimulationBtn = document.getElementById("run-simulation");
const simulationResults = document.getElementById("simulation-results");

// Hero stats elements
const upcomingEventsCount = document.getElementById("upcoming-events-count");
const analyzedFightsCount = document.getElementById("analyzed-fights-count");
const accuracyPercentage = document.getElementById("accuracy-percentage");
const correctPicksCount = document.getElementById("correct-picks-count");
const bestPickEdge = document.getElementById("best-pick-edge");
const bestPickFighter = document.getElementById("best-pick-fighter");
const bestPickConfidence = document.getElementById("best-pick-confidence");

// Simulator elements
const fighterASelect = document.getElementById("fighter-a-select");
const fighterBSelect = document.getElementById("fighter-b-select");
const resultFighterA = document.getElementById("result-fighter-a");
const resultFighterB = document.getElementById("result-fighter-b");
const fighterAWinPercent = document.getElementById("fighter-a-win-percent");
const fighterBWinPercent = document.getElementById("fighter-b-win-percent");

// Compare section elements
const compareFighterASelect = document.getElementById("compare-fighter-a");
const compareFighterBSelect = document.getElementById("compare-fighter-b");
const runComparisonBtn = document.getElementById("run-comparison");
const comparisonResults = document.getElementById("comparison-results");

// Accuracy section elements
const accuracyLast50 = document.getElementById("accuracy-last-50");
const accuracyPercent = document.getElementById("accuracy-percent");
const correctCount = document.getElementById("correct-count");
const incorrectCount = document.getElementById("incorrect-count");
const avgConfidence = document.getElementById("avg-confidence");
const bestPickRate = document.getElementById("best-pick-rate");

let refreshTimerId = null;
let allFighters = [];
let currentEvents = [];
let countdownIntervals = new Map();
let currentUser = null;
let allPredictions = [];
let allUsers = [];

// ===== Hardcoded Fallback Events =====
const HARDCODED_FALLBACK_EVENTS = [
  {
    id: "ufc-308-2024-03-15",
    name: "UFC 308: Makhachev vs. Volkanovski 2",
    date: "2024-03-15T22:00:00Z",
    location: "T-Mobile Arena, Las Vegas, NV",
    fights: [
      {
        fighterA: {
          name: "Islam Makhachev",
          record: "25-1-0",
          weightLbs: 155,
          height: "5'10\"",
          reach: "70\"",
          stance: "Southpaw",
          country: "Russia",
          imageUrl: null,
          koPct: 0.65,
          subPct: 0.25,
          decPct: 0.10
        },
        fighterB: {
          name: "Alexander Volkanovski",
          record: "26-2-0",
          weightLbs: 145,
          height: "5'6\"",
          reach: "71\"",
          stance: "Southpaw",
          country: "Australia",
          imageUrl: null,
          koPct: 0.55,
          subPct: 0.20,
          decPct: 0.25
        },
        weightClass: "Lightweight"
      },
      {
        fighterA: {
          name: "Leon Edwards",
          record: "21-3-0",
          weightLbs: 170,
          height: "5'9\"",
          reach: "74\"",
          stance: "Southpaw",
          country: "England",
          imageUrl: null,
          koPct: 0.45,
          subPct: 0.15,
          decPct: 0.40
        },
        fighterB: {
          name: "Belal Muhammad",
          record: "23-3-0",
          weightLbs: 170,
          height: "5'8\"",
          reach: "71\"",
          stance: "Orthodox",
          country: "USA",
          imageUrl: null,
          koPct: 0.40,
          subPct: 0.10,
          decPct: 0.50
        },
        weightClass: "Welterweight"
      }
    ]
  },
  {
    id: "ufc-fight-night-2024-03-20",
    name: "UFC Fight Night: Ladd vs. Dumont",
    date: "2024-03-20T20:00:00Z",
    location: "United Center, Chicago, IL",
    fights: [
      {
        fighterA: {
          name: "Julianna Pena",
          record: "11-5-0",
          weightLbs: 135,
          height: "5'7\"",
          reach: "66\"",
          stance: "Orthodox",
          country: "USA",
          imageUrl: null,
          koPct: 0.40,
          subPct: 0.35,
          decPct: 0.25
        },
        fighterB: {
          name: "Raquel Pennington",
          record: "15-8-0",
          weightLbs: 135,
          height: "5'7\"",
          reach: "68\"",
          stance: "Orthodox",
          country: "USA",
          imageUrl: null,
          koPct: 0.35,
          subPct: 0.30,
          decPct: 0.35
        },
        weightClass: "Women's Bantamweight"
      },
      {
        fighterA: {
          name: "Anthony Smith",
          record: "37-18-0",
          weightLbs: 205,
          height: "6'4\"",
          reach: "78\"",
          stance: "Orthodox",
          country: "USA",
          imageUrl: null,
          koPct: 0.55,
          subPct: 0.20,
          decPct: 0.25
        },
        fighterB: {
          name: "Dominick Reyes",
          record: "13-4-0",
          weightLbs: 205,
          height: "6'4\"",
          reach: "76\"",
          stance: "Orthodox",
          country: "USA",
          imageUrl: null,
          koPct: 0.50,
          subPct: 0.15,
          decPct: 0.35
        },
        weightClass: "Light Heavyweight"
      }
    ]
  },
  {
    id: "ufc-309-2024-03-25",
    name: "UFC 309: Jones vs. Miocic",
    date: "2024-03-25T22:00:00Z",
    location: "Madison Square Garden, New York, NY",
    fights: [
      {
        fighterA: {
          name: "Jon Jones",
          record: "27-1-0",
          weightLbs: 265,
          height: "6'4\"",
          reach: "84.5\"",
          stance: "Orthodox",
          country: "USA",
          imageUrl: null,
          koPct: 0.60,
          subPct: 0.15,
          decPct: 0.25
        },
        fighterB: {
          name: "Stipe Miocic",
          record: "20-4-0",
          weightLbs: 265,
          height: "6'4\"",
          reach: "80\"",
          stance: "Orthodox",
          country: "USA",
          imageUrl: null,
          koPct: 0.55,
          subPct: 0.10,
          decPct: 0.35
        },
        weightClass: "Heavyweight"
      },
      {
        fighterA: {
          name: "Zhang Weili",
          record: "24-3-0",
          weightLbs: 115,
          height: "5'8\"",
          reach: "63\"",
          stance: "Southpaw",
          country: "China",
          imageUrl: null,
          koPct: 0.35,
          subPct: 0.40,
          decPct: 0.25
        },
        fighterB: {
          name: "Xiaonan Yan",
          record: "17-3-0",
          weightLbs: 115,
          height: "5'4\"",
          reach: "64\"",
          stance: "Orthodox",
          country: "China",
          imageUrl: null,
          koPct: 0.40,
          subPct: 0.35,
          decPct: 0.25
        },
        weightClass: "Women's Strawweight"
      }
    ]
  }
];

// ===== User Account System =====

// DOM references for authentication
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const userProfile = document.getElementById("user-profile");
const authButtons = document.getElementById("auth-buttons");
const userAvatar = document.getElementById("user-avatar");
const userName = document.getElementById("user-name");
const userLevel = document.getElementById("user-level");
const userMenuBtn = document.getElementById("user-menu-btn");
const userMenu = document.getElementById("user-menu");
const viewProfileBtn = document.getElementById("view-profile-btn");
const logoutBtn = document.getElementById("logout-btn");

// Initialize account system
function initializeAccountSystem() {
  // Load users and predictions from localStorage
  loadUsers();
  loadPredictions();
  
  // Check for logged in user
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showUserProfile();
  } else {
    showAuthButtons();
  }
  
  // Event listeners
  loginBtn.addEventListener("click", () => openModal('login-modal'));
  signupBtn.addEventListener("click", () => openModal('signup-modal'));
  userMenuBtn.addEventListener("click", toggleUserMenu);
  viewProfileBtn.addEventListener("click", () => openModal('user-profile-modal'));
  logoutBtn.addEventListener("click", logout);
  
  // Form submissions
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('signup-form').addEventListener('submit', handleSignup);
  
  // Close user menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!userProfile.contains(e.target)) {
      userMenu.classList.add('hidden');
    }
  });
}

function loadUsers() {
  const savedUsers = localStorage.getItem('users');
  if (savedUsers) {
    allUsers = JSON.parse(savedUsers);
  } else {
    // Create demo users for testing
    allUsers = [
      {
        username: "MMAAnalyst92",
        email: "analyst@demo.com",
        password: "demo123",
        xp: 1250,
        level: 5,
        totalPredictions: 50,
        correctPredictions: 42,
        points: 1250,
        createdAt: new Date().toISOString()
      },
      {
        username: "FightFan23",
        email: "fan@demo.com",
        password: "demo123",
        xp: 1180,
        level: 4,
        totalPredictions: 50,
        correctPredictions: 38,
        points: 1180,
        createdAt: new Date().toISOString()
      },
      {
        username: "OctaKing",
        email: "king@demo.com",
        password: "demo123",
        xp: 1050,
        level: 4,
        totalPredictions: 50,
        correctPredictions: 35,
        points: 1050,
        createdAt: new Date().toISOString()
      }
    ];
    saveUsers();
  }
}

function loadPredictions() {
  const savedPredictions = localStorage.getItem('predictions');
  if (savedPredictions) {
    allPredictions = JSON.parse(savedPredictions);
  } else {
    // Create demo predictions
    allPredictions = [];
    savePredictions();
  }
}

function saveUsers() {
  localStorage.setItem('users', JSON.stringify(allUsers));
}

function savePredictions() {
  localStorage.setItem('predictions', JSON.stringify(allPredictions));
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  const user = allUsers.find(u => u.email === email && u.password === password);
  
  if (user) {
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    showUserProfile();
    closeModal('login-modal');
    showNotification('Login successful!');
  } else {
    showNotification('Invalid email or password');
  }
}

function handleSignup(e) {
  e.preventDefault();
  const username = document.getElementById('signup-username').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('signup-confirm-password').value;
  
  if (password !== confirmPassword) {
    showNotification('Passwords do not match');
    return;
  }
  
  if (allUsers.find(u => u.email === email)) {
    showNotification('Email already exists');
    return;
  }
  
  if (allUsers.find(u => u.username === username)) {
    showNotification('Username already exists');
    return;
  }
  
  const newUser = {
    username,
    email,
    password,
    xp: 0,
    level: 1,
    totalPredictions: 0,
    correctPredictions: 0,
    points: 0,
    createdAt: new Date().toISOString()
  };
  
  allUsers.push(newUser);
  saveUsers();
  
  currentUser = newUser;
  localStorage.setItem('currentUser', JSON.stringify(newUser));
  showUserProfile();
  closeModal('signup-modal');
  showNotification('Account created successfully!');
}

function logout() {
  currentUser = null;
  localStorage.removeItem('currentUser');
  showAuthButtons();
  userMenu.classList.add('hidden');
  showNotification('Logged out successfully');
}

function showUserProfile() {
  authButtons.classList.add('hidden');
  userProfile.classList.remove('hidden');
  
  userName.textContent = currentUser.username;
  userLevel.textContent = `Level ${currentUser.level}`;
  userAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
  
  updateUserProfileModal();
}

function showAuthButtons() {
  authButtons.classList.remove('hidden');
  userProfile.classList.add('hidden');
}

function toggleUserMenu() {
  userMenu.classList.toggle('hidden');
}

function updateUserProfileModal() {
  if (!currentUser) return;
  
  document.getElementById('profile-username').textContent = currentUser.username;
  document.getElementById('profile-level-display').textContent = `Level ${currentUser.level} - getLevelName(currentUser.level)`;
  document.getElementById('profile-xp').textContent = currentUser.xp;
  document.getElementById('profile-total-predictions').textContent = currentUser.totalPredictions;
  document.getElementById('profile-correct-predictions').textContent = currentUser.correctPredictions;
  document.getElementById('profile-accuracy').textContent = currentUser.totalPredictions > 0 ? 
    `${Math.round((currentUser.correctPredictions / currentUser.totalPredictions) * 100)}%` : '0%';
  document.getElementById('profile-points').textContent = currentUser.points;
  
  // Update XP progress
  const currentLevelXP = (currentUser.level - 1) * 100;
  const nextLevelXP = currentUser.level * 100;
  const currentXP = currentUser.xp - currentLevelXP;
  const neededXP = nextLevelXP - currentLevelXP;
  const progress = (currentXP / neededXP) * 100;
  
  document.getElementById('xp-fill').style.width = `${progress}%`;
  document.getElementById('xp-text').textContent = `${currentXP} / ${neededXP} XP`;
  document.getElementById('profile-avatar').textContent = currentUser.username.charAt(0).toUpperCase();
}

function getLevelName(level) {
  const levelNames = {
    1: "Rookie",
    2: "Contender", 
    3: "Challenger",
    4: "Prospect",
    5: "Champion",
    6: "Legend"
  };
  return levelNames[Math.min(level, 6)] || "Legend";
}

function addXP(amount) {
  if (!currentUser) return;
  
  currentUser.xp += amount;
  const newLevel = Math.floor(currentUser.xp / 100) + 1;
  
  if (newLevel > currentUser.level) {
    currentUser.level = newLevel;
    showNotification(`Level up! You are now Level ${newLevel} - ${getLevelName(newLevel)}`);
  }
  
  currentUser.points = currentUser.xp;
  saveCurrentUser();
  updateUserProfileModal();
}

function saveCurrentUser() {
  if (currentUser) {
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Update user in allUsers array
    const userIndex = allUsers.findIndex(u => u.email === currentUser.email);
    if (userIndex !== -1) {
      allUsers[userIndex] = currentUser;
      saveUsers();
    }
  }
}

// ===== Prediction System =====

function addPredictionToFightCard(fight, fightElement) {
  const predictionCard = document.createElement("div");
  predictionCard.className = "prediction-card";
  
  if (!currentUser) {
    predictionCard.innerHTML = `
      <div class="login-required">
        <a href="#" onclick="openModal('login-modal')">Log in to submit predictions</a>
      </div>
    `;
    return predictionCard;
  }
  
  // Check if user already predicted this fight
  const existingPrediction = allPredictions.find(p => 
    p.username === currentUser.username && 
    p.fighterA === fight.fighterA.name && 
    p.fighterB === fight.fighterB.name
  );
  
  predictionCard.innerHTML = `
    <div class="prediction-header">Make Your Prediction</div>
    <div class="prediction-options">
      <div class="prediction-option ${existingPrediction?.selectedWinner === fight.fighterA.name ? 'selected' : ''}" data-fighter="${fight.fighterA.name}">
        ${fight.fighterA.name}
      </div>
      <div class="prediction-option ${existingPrediction?.selectedWinner === fight.fighterB.name ? 'selected' : ''}" data-fighter="${fight.fighterB.name}">
        ${fight.fighterB.name}
      </div>
    </div>
    <button class="prediction-submit" ${existingPrediction ? 'disabled' : ''}>
      ${existingPrediction ? 'Prediction Submitted' : 'Submit Prediction'}
    </button>
  `;
  
  // Add event listeners
  const options = predictionCard.querySelectorAll('.prediction-option');
  const submitBtn = predictionCard.querySelector('.prediction-submit');
  let selectedWinner = null;
  
  options.forEach(option => {
    option.addEventListener('click', () => {
      if (existingPrediction) return;
      
      options.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
      selectedWinner = option.dataset.fighter;
    });
  });
  
  submitBtn.addEventListener('click', () => {
    if (!selectedWinner || existingPrediction) return;
    
    submitPrediction(fight, selectedWinner);
    submitBtn.disabled = true;
    submitBtn.textContent = 'Prediction Submitted';
    addXP(10); // +10 XP for submitting prediction
  });
  
  return predictionCard;
}

function submitPrediction(fight, selectedWinner) {
  const prediction = {
    username: currentUser.username,
    eventName: fight.eventName,
    fightId: `${fight.fighterA.name}-vs-${fight.fighterB.name}`,
    fighterA: fight.fighterA.name,
    fighterB: fight.fighterB.name,
    selectedWinner: selectedWinner,
    timestamp: new Date().toISOString(),
    status: 'pending'
  };
  
  allPredictions.push(prediction);
  savePredictions();
  
  currentUser.totalPredictions++;
  saveCurrentUser();
  
  showNotification('Prediction submitted successfully!');
  updateLeaderboard();
}

// ===== Demo Result Resolution =====

function resolveDemoResults() {
  // Demo results for testing
  const demoResults = [
    { fightId: "Fighter A-vs-Fighter B", winner: "Fighter A" },
    { fightId: "Fighter C-vs-Fighter D", winner: "Fighter D" },
    { fightId: "Fighter E-vs-Fighter F", winner: "Fighter E" }
  ];
  
  allPredictions.forEach(prediction => {
    if (prediction.status === 'pending') {
      const result = demoResults.find(r => r.fightId === prediction.fightId);
      if (result) {
        prediction.status = (prediction.selectedWinner === result.winner) ? 'correct' : 'wrong';
        
        // Award XP for resolved predictions
        if (prediction.username === currentUser.username) {
          if (prediction.status === 'correct') {
            currentUser.correctPredictions++;
            addXP(25); // +25 XP for correct prediction
          } else {
            addXP(5); // +5 XP for wrong prediction
          }
        }
      }
    }
  });
  
  savePredictions();
  updateLeaderboard();
}

// ===== Utilities =====

function setLiveStatus(text, mode = "idle") {
  // Status indicator functionality removed since we don't have the elements anymore
  console.log(`Status: ${text} (${mode})`);
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function getInitials(name) {
  return name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function parseRecord(record) {
  const parts = record.split("-");
  return {
    wins: parseInt(parts[0], 10) || 0,
    losses: parseInt(parts[1], 10) || 0,
    draws: parseInt(parts[2], 10) || 0,
    total: parts.reduce((sum, part) => sum + parseInt(part, 10) || 0, 0),
  };
}

// Modal utilities
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
  }
}

function switchToSignup() {
  closeModal('login-modal');
  openModal('signup-modal');
}

function switchToLogin() {
  closeModal('signup-modal');
  openModal('login-modal');
}

function showNotification(message) {
  // Simple notification system
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
    color: var(--bg-dark);
    padding: 12px 20px;
    border-radius: var(--radius-md);
    font-weight: 600;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// Add notification animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

function estimateFinishProfile(weightLbs, winPct) {
  const w = Number.parseInt(weightLbs, 10) || 170;
  const win = clamp(winPct, 0, 1);

  // Baseline by division (heavier -> more KO, lighter -> more decisions/subs)
  let baseKo, baseSub, baseDec;
  if (w >= 205) {
    baseKo = 0.55;
    baseSub = 0.15;
    baseDec = 0.3;
  } else if (w >= 170) {
    baseKo = 0.45;
    baseSub = 0.2;
    baseDec = 0.35;
  } else if (w >= 155) {
    baseKo = 0.35;
    baseSub = 0.25;
    baseDec = 0.4;
  } else {
    baseKo = 0.25;
    baseSub = 0.3;
    baseDec = 0.45;
  }

  // Adjust by win rate (higher win -> more finishes)
  const finishBonus = win * 0.15;
  const decPenalty = finishBonus * 0.5;

  return {
    koPct: clamp(baseKo + finishBonus, 0.1, 0.7),
    subPct: clamp(baseSub + finishBonus * 0.8, 0.05, 0.4),
    decPct: clamp(baseDec - decPenalty, 0.2, 0.6),
  };
}

// Countdown timer utility
function getCountdown(dateText) {
  if (!dateText || dateText === "Date TBA") return null;
  
  try {
    // Try to parse the date - this is a simplified version
    // In a real implementation, you'd need more sophisticated date parsing
    const eventDate = new Date(dateText);
    const now = new Date();
    const diff = eventDate - now;
    
    if (diff <= 0) return "Started";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `Starts in: ${days}d ${hours}h`;
    } else if (hours > 0) {
      return `Starts in: ${hours}h`;
    } else {
      return "Starts soon";
    }
  } catch (e) {
    return "Date TBA";
  }
}

// Fighter search functionality
function initializeFighterSearch() {
  fighterSearchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    if (query.length < 2) {
      searchResultsEl.classList.add("hidden");
      return;
    }
    
    const results = allFighters.filter(fighter => 
      fighter.name.toLowerCase().includes(query)
    );
    
    displaySearchResults(results.slice(0, 5));
  });
  
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-container")) {
      searchResultsEl.classList.add("hidden");
    }
  });
}

function displaySearchResults(results) {
  searchResultsEl.innerHTML = "";
  
  if (results.length === 0) {
    searchResultsEl.classList.add("hidden");
    return;
  }
  
  results.forEach(fighter => {
    const item = document.createElement("div");
    item.className = "search-result-card";
    
    // Create fighter avatar
    const avatar = document.createElement("div");
    avatar.className = "search-result-avatar";
    if (fighter.imageUrl) {
      avatar.style.backgroundImage = `url(${fighter.imageUrl})`;
    } else {
      avatar.textContent = getInitials(fighter.name);
    }
    
    // Create fighter info
    const info = document.createElement("div");
    info.className = "search-result-info";
    
    const name = document.createElement("div");
    name.className = "search-result-name";
    name.textContent = fighter.name;
    
    const details = document.createElement("div");
    details.className = "search-result-details";
    details.textContent = `${fighter.record} • ${fighter.weightLbs || 'Unknown'} lbs`;
    
    info.appendChild(name);
    info.appendChild(details);
    
    item.appendChild(avatar);
    item.appendChild(info);
    
    item.addEventListener("click", () => {
      showFighterProfile(fighter);
      searchResultsEl.classList.add("hidden");
      fighterSearchInput.value = "";
    });
    
    searchResultsEl.appendChild(item);
  });
  
  searchResultsEl.classList.remove("hidden");
}

// Modal functionality
function showFighterProfile(fighter) {
  document.getElementById("modal-fighter-name").textContent = fighter.name;
  document.getElementById("profile-record").textContent = fighter.record;
  document.getElementById("profile-weight-class").textContent = fighter.weightLbs ? `${fighter.weightLbs} lbs` : "Unknown";
  document.getElementById("profile-height").textContent = "-"; // Not available in current data
  document.getElementById("profile-reach").textContent = "-"; // Not available in current data
  document.getElementById("profile-stance").textContent = "-"; // Not available in current data
  document.getElementById("profile-country").textContent = "-"; // Not available in current data
  
  // Update stats
  document.getElementById("stat-striking-acc").textContent = "-";
  document.getElementById("stat-striking-def").textContent = "-";
  document.getElementById("stat-td-acc").textContent = "-";
  document.getElementById("stat-td-def").textContent = "-";
  document.getElementById("stat-sub-avg").textContent = "-";
  document.getElementById("stat-recent-form").textContent = "-";
  
  fighterModal.classList.remove("hidden");
}

function initializeModal() {
  closeModalBtn.addEventListener("click", () => {
    fighterModal.classList.add("hidden");
  });
  
  fighterModal.addEventListener("click", (e) => {
    if (e.target === fighterModal) {
      fighterModal.classList.add("hidden");
    }
  });
}

// Update hero stats
function updateHeroStats(events) {
  if (!events || events.length === 0) {
    upcomingEventsCount.textContent = "0";
    analyzedFightsCount.textContent = "0";
    accuracyPercentage.textContent = "0%";
    correctPicksCount.textContent = "0";
    bestPickEdge.textContent = "0%";
    bestPickFighter.textContent = "No edge available";
    return;
  }
  
  const totalFights = events.reduce((sum, event) => sum + (event.fights ? event.fights.length : 0), 0);
  
  upcomingEventsCount.textContent = events.length;
  analyzedFightsCount.textContent = totalFights;
  
  // Simulated accuracy data (in a real app, this would come from actual prediction history)
  const simulatedAccuracy = Math.floor(Math.random() * 15) + 65; // 65-80%
  const simulatedCorrect = Math.floor((simulatedAccuracy / 100) * Math.min(totalFights, 50));
  
  accuracyPercentage.textContent = `${simulatedAccuracy}%`;
  correctPicksCount.textContent = simulatedCorrect;
  
  // Find best pick
  let bestPick = null;
  let highestEdge = 0;
  
  events.forEach(event => {
    (event.fights || []).forEach(fight => {
      const analysis = calculatePrediction(fight.fighterA, fight.fighterB);
      const edge = Math.abs(analysis.fighterA.prob - analysis.fighterB.prob);
      if (edge > highestEdge && analysis.bestPick) {
        highestEdge = edge;
        bestPick = {
          fighter: analysis.winner === "A" ? fight.fighterA.name : fight.fighterB.name,
          edge: Math.round(edge * 100),
          confidence: analysis.confidence
        };
      }
    });
  });
  
  if (bestPick) {
    bestPickEdge.textContent = `${bestPick.edge}%`;
    bestPickFighter.textContent = bestPick.fighter;
    bestPickConfidence.textContent = bestPick.confidence >= 70 ? "High" : bestPick.confidence >= 50 ? "Medium" : "Low";
  } else {
    bestPickEdge.textContent = "0%";
    bestPickFighter.textContent = "No edge available";
  }
  
  // Update accuracy section
  updateAccuracySection();
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
    updateHeroStats([]);
    return;
  }

  emptyStateEl.classList.add("hidden");

  // Clear previous countdown intervals
  countdownIntervals.forEach(interval => clearInterval(interval));
  countdownIntervals.clear();

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
    
    const countdownEl = document.createElement("span");
    countdownEl.className = "countdown-timer";
    const countdownId = `countdown-${event.id}`;
    countdownEl.id = countdownId;
    
    subEl.appendChild(countdownEl);
    const dateText = document.createTextNode(`${event.dateText || "Date TBA"} • UFC Fight Card`);
    subEl.appendChild(dateText);

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
    
    // Set up countdown timer
    if (event.dateText) {
      const interval = setInterval(() => {
        const countdown = getCountdown(event.dateText);
        const el = document.getElementById(countdownId);
        if (el && countdown) {
          el.textContent = countdown;
        }
      }, 60000); // Update every minute
      
      countdownIntervals.set(countdownId, interval);
      
      // Initial countdown
      const initialCountdown = getCountdown(event.dateText);
      if (initialCountdown) {
        countdownEl.textContent = initialCountdown;
      }
    }
  });

  updateHeroStats(events);
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

  // Add odds comparison section
  const oddsSection = document.createElement("div");
  oddsSection.className = "odds-section";
  
  const oddsHeader = document.createElement("div");
  oddsHeader.className = "odds-header";
  oddsHeader.textContent = "Best Odds";
  
  const oddsGrid = document.createElement("div");
  oddsGrid.className = "odds-grid";
  
  // Generate example odds for demonstration
  const sportsbooks = [
    { name: "Bet365", oddsA: "+120", oddsB: "-140" },
    { name: "DraftKings", oddsA: "+115", oddsB: "-135" },
    { name: "FanDuel", oddsA: "+125", oddsB: "-145" }
  ];
  
  sportsbooks.forEach(sportsbook => {
    const oddsItem = document.createElement("div");
    oddsItem.className = "odds-item";
    
    const sportsbookName = document.createElement("div");
    sportsbookName.className = "sportsbook-name";
    sportsbookName.textContent = sportsbook.name;
    sportsbookName.addEventListener("click", () => {
      // Placeholder for affiliate links
      console.log(`Affiliate link for ${sportsbook.name}`);
    });
    
    const oddsValues = document.createElement("div");
    oddsValues.className = "odds-values";
    oddsValues.innerHTML = `
      <span class="odds-fighter-a">${sportsbook.oddsA}</span>
      <span class="odds-fighter-b">${sportsbook.oddsB}</span>
    `;
    
    oddsItem.appendChild(sportsbookName);
    oddsItem.appendChild(oddsValues);
    oddsGrid.appendChild(oddsItem);
  });
  
  oddsSection.appendChild(oddsHeader);
  oddsSection.appendChild(oddsGrid);
  
  // Add value bet indicator
  const aiProb = analysis.winner === "A" ? analysis.fighterA.prob : analysis.fighterB.prob;
  const bookmakerProb = 0.55; // Example bookmaker implied probability
  const isValueBet = aiProb > bookmakerProb + 0.1; // 10% threshold
  
  if (isValueBet) {
    const valueBadge = document.createElement("div");
    valueBadge.className = "value-bet-badge";
    valueBadge.textContent = "VALUE BET";
    oddsSection.appendChild(valueBadge);
  }
  
  right.append(oddsSection);

  // Add action buttons
  const actions = document.createElement("div");
  actions.className = "fight-actions";
  
  const simulateBtn = document.createElement("button");
  simulateBtn.className = "fight-action-btn";
  simulateBtn.textContent = "Simulate Fight";
  simulateBtn.addEventListener("click", () => {
    // Populate simulator with these fighters
    fighterASelect.value = fighterA.name;
    fighterBSelect.value = fighterB.name;
    // Scroll to simulator
    document.getElementById("simulator").scrollIntoView({ behavior: "smooth" });
  });
  
  const compareBtn = document.createElement("button");
  compareBtn.className = "fight-action-btn";
  compareBtn.textContent = "Compare Fighters";
  compareBtn.addEventListener("click", () => {
    showFighterProfile(fighterA);
  });
  
  const profileBtn = document.createElement("button");
  profileBtn.className = "fight-action-btn";
  profileBtn.textContent = "Open Profiles";
  profileBtn.addEventListener("click", () => {
    showFighterProfile(fighterB);
  });
  
  const shareBtn = document.createElement("button");
  shareBtn.className = "fight-action-btn";
  shareBtn.textContent = "Share Prediction";
  shareBtn.addEventListener("click", () => {
    sharePrediction(fighterA, fighterB, analysis);
  });
  
  actions.appendChild(simulateBtn);
  actions.appendChild(compareBtn);
  actions.appendChild(profileBtn);
  actions.appendChild(shareBtn);
  
  right.append(actions);
  
  // Add prediction card
  const predictionCard = addPredictionToFightCard(fight, card);
  right.append(predictionCard);
  
  card.append(left, right);

  return card;
}

// ===== Prediction Sharing =====

let simulationHistory = [];

function sharePrediction(fighterA, fighterB, analysis) {
  const winner = analysis.winner === "A" ? fighterA.name : fighterB.name;
  const winnerProb = Math.round((analysis.winner === "A" ? analysis.fighterA.prob : analysis.fighterB.prob) * 100);
  const loserProb = Math.round((analysis.winner === "A" ? analysis.fighterB.prob : analysis.fighterA.prob) * 100);
  
  // Create shareable text
  const shareText = `🥊 OctaRealm Fight Prediction 🥊\n\n${fighterA.name} vs ${fighterB.name}\n\n🏆 Predicted Winner: ${winner}\n📊 Win Probability: ${winnerProb}% vs ${loserProb}%\n\n🔥 Powered by AI • octarealm.com`;
  
  // Create shareable card
  const shareCard = document.createElement("div");
  shareCard.className = "share-card";
  shareCard.innerHTML = `
    <div class="share-card-header">
      <h3>🥊 OctaRealm Prediction</h3>
    </div>
    <div class="share-card-content">
      <div class="prediction-fighters">
        <div class="prediction-fighter">
          <div class="fighter-name">${fighterA.name}</div>
          <div class="fighter-probability">${Math.round(analysis.fighterA.prob * 100)}%</div>
        </div>
        <div class="prediction-vs">VS</div>
        <div class="prediction-fighter">
          <div class="fighter-name">${fighterB.name}</div>
          <div class="fighter-probability">${Math.round(analysis.fighterB.prob * 100)}%</div>
        </div>
      </div>
      <div class="prediction-winner">
        <strong>🏆 Predicted Winner:</strong> ${winner}
      </div>
      <div class="prediction-confidence">
        <strong>🎯 Confidence:</strong> ${analysis.confidence}%
      </div>
    </div>
    <div class="share-card-footer">
      <div class="share-buttons">
        <button class="share-btn" onclick="copyToClipboard('${encodeURIComponent(shareText)}')">
          📋 Copy Text
        </button>
        <button class="share-btn" onclick="downloadPredictionCard()">
          📷 Download Card
        </button>
      </div>
    </div>
  `;
  
  // Show modal with share card
  const modal = document.createElement("div");
  modal.className = "modal share-modal";
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Share Prediction</h2>
        <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
      </div>
      <div class="modal-body"></div>
    </div>
  `;
  
  modal.querySelector(".modal-body").appendChild(shareCard);
  document.body.appendChild(modal);
  modal.classList.remove("hidden");
}

function copyToClipboard(text) {
  const decodedText = decodeURIComponent(text);
  navigator.clipboard.writeText(decodedText).then(() => {
    alert("Prediction copied to clipboard!");
  });
}

function downloadPredictionCard() {
  // Placeholder for download functionality
  alert("Download feature coming soon!");
}

// ===== Simulation History =====

function addToSimulationHistory(fighterA, fighterB, results) {
  const historyEntry = {
    id: Date.now(),
    fighterA: fighterA.name,
    fighterB: fighterB.name,
    fighterAWinPercent: results.fighterAWinPercent,
    fighterBWinPercent: results.fighterBWinPercent,
    timestamp: new Date().toLocaleString()
  };
  
  simulationHistory.unshift(historyEntry);
  
  // Keep only last 10 simulations
  if (simulationHistory.length > 10) {
    simulationHistory = simulationHistory.slice(0, 10);
  }
  
  updateSimulationHistoryUI();
}

function updateSimulationHistoryUI() {
  const historyContainer = document.getElementById("simulation-history");
  if (!historyContainer) return;
  
  historyContainer.innerHTML = "";
  
  if (simulationHistory.length === 0) {
    historyContainer.innerHTML = "<p>No simulations run yet.</p>";
    return;
  }
  
  simulationHistory.forEach(entry => {
    const historyItem = document.createElement("div");
    historyItem.className = "history-item";
    historyItem.innerHTML = `
      <div class="history-fighters">
        <span class="history-fighter">${entry.fighterA}</span>
        <span class="history-vs">vs</span>
        <span class="history-fighter">${entry.fighterB}</span>
      </div>
      <div class="history-results">
        <div class="history-result">
          <span class="result-fighter">${entry.fighterA}</span>
          <span class="result-percentage">${entry.fighterAWinPercent}%</span>
        </div>
        <div class="history-result">
          <span class="result-fighter">${entry.fighterB}</span>
          <span class="result-percentage">${entry.fighterBWinPercent}%</span>
        </div>
      </div>
      <div class="history-timestamp">${entry.timestamp}</div>
    `;
    historyContainer.appendChild(historyItem);
  });
}

function clearSimulationHistory() {
  if (confirm("Are you sure you want to clear your simulation history?")) {
    simulationHistory = [];
    updateSimulationHistoryUI();
  }
}

// ===== Leaderboard Functionality =====

function initializeLeaderboard() {
  const tabs = document.querySelectorAll('.leaderboard-tab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Update leaderboard content based on period
      const period = tab.dataset.period;
      updateLeaderboardContent(period);
    });
  });
  
  // Add functionality to action buttons
  const joinCompetitionBtn = document.querySelector('.leaderboard-actions .btn-primary');
  const viewAllRankingsBtn = document.querySelector('.leaderboard-actions .btn-secondary');
  
  if (joinCompetitionBtn) {
    joinCompetitionBtn.addEventListener('click', () => {
      if (!currentUser) {
        openModal('login-modal');
      } else {
        // Scroll to events section
        document.getElementById('events-section').scrollIntoView({ behavior: 'smooth' });
        showNotification('Start predicting fights to climb the leaderboard!');
      }
    });
  }
  
  if (viewAllRankingsBtn) {
    viewAllRankingsBtn.addEventListener('click', () => {
      // Expand leaderboard to show more users
      const currentData = getLeaderboardData('all-time');
      const rankingsContainer = document.querySelector('.leaderboard-rankings');
      
      if (rankingsContainer) {
        rankingsContainer.innerHTML = '';
        
        // Show top 20 users instead of top 5
        const expandedData = currentData.slice(0, 20);
        
        expandedData.forEach((user, index) => {
          const item = document.createElement('div');
          item.className = 'leaderboard-item';
          item.innerHTML = `
            <div class="rank">${index + 1}</div>
            <div class="user-info">
              <div class="username">${user.username}</div>
              <div class="user-stats">${user.correctPredictions}/${user.totalPredictions} correct • ${user.accuracy}% accuracy</div>
            </div>
            <div class="user-score">${user.points} pts</div>
          `;
          rankingsContainer.appendChild(item);
        });
        
        showNotification('Showing top 20 users');
      }
    });
  }
}

function updateLeaderboardContent(period) {
  // Get leaderboard data based on period
  const leaderboardData = getLeaderboardData(period);
  const rankingsContainer = document.querySelector('.leaderboard-rankings');
  
  if (rankingsContainer) {
    rankingsContainer.innerHTML = '';
    
    leaderboardData.forEach((user, index) => {
      const item = document.createElement('div');
      item.className = 'leaderboard-item';
      item.innerHTML = `
        <div class="rank">${index + 1}</div>
        <div class="user-info">
          <div class="username">${user.username}</div>
          <div class="user-stats">${user.correctPredictions}/${user.totalPredictions} correct • ${user.accuracy}% accuracy</div>
        </div>
        <div class="user-score">${user.points} pts</div>
      `;
      rankingsContainer.appendChild(item);
    });
  }
}

function getLeaderboardData(period) {
  const now = new Date();
  let filteredPredictions = allPredictions;
  
  // Filter predictions by period
  if (period === 'weekly') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filteredPredictions = allPredictions.filter(p => new Date(p.timestamp) > weekAgo);
  } else if (period === 'monthly') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    filteredPredictions = allPredictions.filter(p => new Date(p.timestamp) > monthAgo);
  }
  
  // Calculate user stats for this period
  const userStats = {};
  
  filteredPredictions.forEach(prediction => {
    if (!userStats[prediction.username]) {
      userStats[prediction.username] = {
        username: prediction.username,
        totalPredictions: 0,
        correctPredictions: 0,
        points: 0
      };
    }
    
    userStats[prediction.username].totalPredictions++;
    
    if (prediction.status === 'correct') {
      userStats[prediction.username].correctPredictions++;
      userStats[prediction.username].points += 25; // 25 points per correct prediction
    } else if (prediction.status === 'wrong') {
      userStats[prediction.username].points += 5; // 5 points per wrong prediction
    } else {
      userStats[prediction.username].points += 10; // 10 points per submission
    }
  });
  
  // Convert to array and calculate accuracy
  const leaderboardArray = Object.values(userStats).map(user => ({
    ...user,
    accuracy: user.totalPredictions > 0 ? Math.round((user.correctPredictions / user.totalPredictions) * 100) : 0
  }));
  
  // Sort by points, then by accuracy, then by total predictions
  leaderboardArray.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    return b.totalPredictions - a.totalPredictions;
  });
  
  // If no data for this period, use demo data
  if (leaderboardArray.length === 0) {
    return getDemoLeaderboardData(period);
  }
  
  return leaderboardArray;
}

function getDemoLeaderboardData(period) {
  // Demo data for when no real predictions exist
  const demoData = {
    weekly: [
      { username: "MMAAnalyst92", totalPredictions: 50, correctPredictions: 42, accuracy: 84, points: 1250 },
      { username: "FightFan23", totalPredictions: 50, correctPredictions: 38, accuracy: 76, points: 1180 },
      { username: "OctaKing", totalPredictions: 50, correctPredictions: 35, accuracy: 70, points: 1050 },
      { username: "BetMaster", totalPredictions: 50, correctPredictions: 33, accuracy: 66, points: 990 },
      { username: "UFCProphet", totalPredictions: 50, correctPredictions: 31, accuracy: 62, points: 930 }
    ],
    monthly: [
      { username: "PredictionGuru", totalPredictions: 200, correctPredictions: 156, accuracy: 78, points: 4680 },
      { username: "MMAAnalyst92", totalPredictions: 200, correctPredictions: 142, accuracy: 71, points: 4260 },
      { username: "FightFan23", totalPredictions: 200, correctPredictions: 138, accuracy: 69, points: 4140 },
      { username: "OctaKing", totalPredictions: 200, correctPredictions: 125, accuracy: 62.5, points: 3750 },
      { username: "BetMaster", totalPredictions: 200, correctPredictions: 118, accuracy: 59, points: 3540 }
    ],
    'all-time': [
      { username: "PredictionGuru", totalPredictions: 1200, correctPredictions: 892, accuracy: 74.3, points: 26760 },
      { username: "MMAAnalyst92", totalPredictions: 1200, correctPredictions: 845, accuracy: 70.4, points: 25350 },
      { username: "FightFan23", totalPredictions: 1200, correctPredictions: 798, accuracy: 66.5, points: 23940 },
      { username: "OctaKing", totalPredictions: 1200, correctPredictions: 756, accuracy: 63, points: 22680 },
      { username: "BetMaster", totalPredictions: 1200, correctPredictions: 712, accuracy: 59.3, points: 21360 }
    ]
  };
  
  return demoData[period] || demoData.weekly;
}

function updateLeaderboard() {
  const activeTab = document.querySelector('.leaderboard-tab.active');
  if (activeTab) {
    updateLeaderboardContent(activeTab.dataset.period);
  }
}

function initializeSimulator() {
  runSimulationBtn.addEventListener("click", runSimulation);
}

function runSimulation() {
  const fighterAName = fighterASelect.value;
  const fighterBName = fighterBSelect.value;
  
  if (!fighterAName || !fighterBName) {
    alert("Please select both fighters");
    return;
  }
  
  if (fighterAName === fighterBName) {
    alert("Please select different fighters");
    return;
  }
  
  // Find fighters from our data
  const fighterA = allFighters.find(f => f.name === fighterAName);
  const fighterB = allFighters.find(f => f.name === fighterBName);
  
  if (!fighterA || !fighterB) {
    alert("Fighter data not available");
    return;
  }
  
  // Run 1000 simulations
  const results = simulateFights(fighterA, fighterB, 1000);
  
  // Add to simulation history
  addToSimulationHistory(fighterA, fighterB, results);
  
  // Update UI with results
  resultFighterA.textContent = fighterA.name;
  resultFighterB.textContent = fighterB.name;
  fighterAWinPercent.textContent = `${results.fighterAWinPercent}%`;
  fighterBWinPercent.textContent = `${results.fighterBWinPercent}%`;
  
  // Update method breakdown
  document.getElementById("ko-percentage").style.width = `${results.koPercent}%`;
  document.getElementById("ko-percent-text").textContent = `${results.koPercent}%`;
  
  document.getElementById("sub-percentage").style.width = `${results.subPercent}%`;
  document.getElementById("sub-percent-text").textContent = `${results.subPercent}%`;
  
  document.getElementById("dec-percentage").style.width = `${results.decPercent}%`;
  document.getElementById("dec-percent-text").textContent = `${results.decPercent}%`;
  
  simulationResults.classList.remove("hidden");
}

function simulateFights(fighterA, fighterB, numSimulations) {
  const analysis = calculatePrediction(fighterA, fighterB);
  
  // Use the prediction probabilities as base
  const baseProbA = analysis.fighterA.prob;
  const baseProbB = analysis.fighterB.prob;
  
  // Add some randomness for simulation effect
  let fighterAWins = 0;
  let fighterBWins = 0;
  let koCount = 0;
  let subCount = 0;
  let decCount = 0;
  
  for (let i = 0; i < numSimulations; i++) {
    // Add random variance to base probabilities
    const variance = 0.1; // 10% variance
    const randomFactor = (Math.random() - 0.5) * variance;
    
    const probA = Math.max(0, Math.min(1, baseProbA + randomFactor));
    const probB = 1 - probA;
    
    const winner = Math.random() < probA ? 'A' : 'B';
    
    if (winner === 'A') {
      fighterAWins++;
    } else {
      fighterBWins++;
    }
    
    // Determine method based on fighter profiles
    const winnerFighter = winner === 'A' ? fighterA : fighterB;
    const rand = Math.random();
    
    if (rand < winnerFighter.koPct) {
      koCount++;
    } else if (rand < winnerFighter.koPct + winnerFighter.subPct) {
      subCount++;
    } else {
      decCount++;
    }
  }
  
  return {
    fighterAWinPercent: Math.round((fighterAWins / numSimulations) * 100),
    fighterBWinPercent: Math.round((fighterBWins / numSimulations) * 100),
    koPercent: Math.round((koCount / numSimulations) * 100),
    subPercent: Math.round((subCount / numSimulations) * 100),
    decPercent: Math.round((decCount / numSimulations) * 100)
  };
}

// ===== Fight Comparison =====

function initializeComparison() {
  runComparisonBtn.addEventListener("click", runComparison);
}

function runComparison() {
  const fighterAName = compareFighterASelect.value;
  const fighterBName = compareFighterBSelect.value;
  
  if (!fighterAName || !fighterBName) {
    alert("Please select both fighters");
    return;
  }
  
  if (fighterAName === fighterBName) {
    alert("Please select different fighters");
    return;
  }
  
  // Find fighters from our data
  const fighterA = allFighters.find(f => f.name === fighterAName);
  const fighterB = allFighters.find(f => f.name === fighterBName);
  
  if (!fighterA || !fighterB) {
    alert("Fighter data not available");
    return;
  }
  
  // Calculate prediction
  const analysis = calculatePrediction(fighterA, fighterB);
  
  // Update UI with comparison data
  updateComparisonUI(fighterA, fighterB, analysis);
  
  comparisonResults.classList.remove("hidden");
}

function updateComparisonUI(fighterA, fighterB, analysis) {
  // Update fighter A info
  document.getElementById("compare-name-a").textContent = fighterA.name;
  document.getElementById("compare-record-a").textContent = fighterA.record;
  document.getElementById("compare-height-a").textContent = "-"; // Not available in current data
  document.getElementById("compare-reach-a").textContent = "-"; // Not available in current data
  document.getElementById("compare-striking-a").textContent = `${Math.round(fighterA.koPct * 100)}%`;
  document.getElementById("compare-td-a").textContent = `${Math.round(fighterA.subPct * 100)}%`;
  
  // Update fighter B info
  document.getElementById("compare-name-b").textContent = fighterB.name;
  document.getElementById("compare-record-b").textContent = fighterB.record;
  document.getElementById("compare-height-b").textContent = "-"; // Not available in current data
  document.getElementById("compare-reach-b").textContent = "-"; // Not available in current data
  document.getElementById("compare-striking-b").textContent = `${Math.round(fighterB.koPct * 100)}%`;
  document.getElementById("compare-td-b").textContent = `${Math.round(fighterB.subPct * 100)}%`;
  
  // Update prediction
  const probA = Math.round(analysis.fighterA.prob * 100);
  const probB = Math.round(analysis.fighterB.prob * 100);
  
  document.getElementById("compare-prob-a").textContent = `${probA}%`;
  document.getElementById("compare-prob-fill-a").style.width = `${probA}%`;
  
  document.getElementById("compare-prob-b").textContent = `${probB}%`;
  document.getElementById("compare-prob-fill-b").style.width = `${probB}%`;
  
  const winner = analysis.winner === "A" ? fighterA.name : fighterB.name;
  document.getElementById("compare-winner").textContent = `Predicted Winner: ${winner}`;
}

// ===== Accuracy Tracking =====

function updateAccuracySection() {
  // Simulated accuracy data (in a real app, this would come from actual prediction history)
  const totalPredictions = 50;
  const simulatedAccuracy = Math.floor(Math.random() * 20) + 60; // 60-80%
  const correctPredictions = Math.floor((simulatedAccuracy / 100) * totalPredictions);
  const incorrectPredictions = totalPredictions - correctPredictions;
  const avgConfidence = Math.floor(Math.random() * 15) + 65; // 65-80%
  const bestPickSuccess = Math.floor(Math.random() * 25) + 70; // 70-95%
  
  // Update UI
  accuracyLast50.textContent = `${correctPredictions} / ${totalPredictions}`;
  accuracyPercent.textContent = `${simulatedAccuracy}%`;
  correctCount.textContent = correctPredictions;
  incorrectCount.textContent = incorrectPredictions;
  avgConfidence.textContent = `${avgConfidence}%`;
  bestPickRate.textContent = `${bestPickSuccess}%`;
}

function populateFighterDropdowns(fighters) {
  // Clear existing options
  fighterASelect.innerHTML = '<option value="">Select Fighter A</option>';
  fighterBSelect.innerHTML = '<option value="">Select Fighter B</option>';
  compareFighterASelect.innerHTML = '<option value="">Select Fighter A</option>';
  compareFighterBSelect.innerHTML = '<option value="">Select Fighter B</option>';
  
  // Sort fighters by name
  const sortedFighters = [...fighters].sort((a, b) => a.name.localeCompare(b.name));
  
  sortedFighters.forEach(fighter => {
    const optionA = document.createElement("option");
    optionA.value = fighter.name;
    optionA.textContent = `${fighter.name} (${fighter.record})`;
    fighterASelect.appendChild(optionA);
    
    const optionB = document.createElement("option");
    optionB.value = fighter.name;
    optionB.textContent = `${fighter.name} (${fighter.record})`;
    fighterBSelect.appendChild(optionB);
    
    const optionCompareA = document.createElement("option");
    optionCompareA.value = fighter.name;
    optionCompareA.textContent = `${fighter.name} (${fighter.record})`;
    compareFighterASelect.appendChild(optionCompareA);
    
    const optionCompareB = document.createElement("option");
    optionCompareB.value = fighter.name;
    optionCompareB.textContent = `${fighter.name} (${fighter.record})`;
    compareFighterBSelect.appendChild(optionCompareB);
  });
}

// ===== Data Fetching =====

async function fetchUpcomingEvents() {
  console.log('🚀 Starting event fetch...');
  showLoadingState();
  hideStatusBanner();
  
  try {
    // STEP 1: Render hardcoded fallback events immediately
    console.log('🎯 Rendering hardcoded fallback events immediately...');
    await renderHardcodedEvents();
    
    // STEP 2: Try to load local fallback file
    console.log('📁 Attempting to load local fallback file...');
    const localFallback = await loadLocalFallback();
    
    // STEP 3: Try to fetch live UFC API
    console.log('📡 Attempting to fetch from live API:', MMA_API_URL);
    const liveEvents = await fetchLiveAPI();
    
    // STEP 4: Use live data if successful, otherwise keep fallback
    if (liveEvents && liveEvents.length > 0) {
      console.log('✅ Live API successful, replacing with live data');
      const processedEvents = await processEvents(liveEvents);
      renderEvents(processedEvents);
      hideStatusBanner();
    } else if (localFallback && localFallback.length > 0) {
      console.log('📁 Using local fallback file data');
      const processedEvents = await processEvents(localFallback);
      renderEvents(processedEvents);
      showStatusBanner();
    } else {
      console.log('🎯 Keeping hardcoded fallback events');
      showStatusBanner();
    }
    
    hideLoadingState();
    
  } catch (error) {
    console.error('❌ Event loading failed:', error);
    console.log('🎯 Keeping hardcoded fallback events');
    showStatusBanner();
    hideLoadingState();
  }
}

async function renderHardcodedEvents() {
  console.log('🎯 Rendering hardcoded fallback events...');
  const processedEvents = await processEvents(HARDCODED_FALLBACK_EVENTS);
  renderEvents(processedEvents);
  console.log(`✅ Rendered ${processedEvents.length} hardcoded events`);
}

async function loadLocalFallback() {
  try {
    console.log('📁 Loading local fallback from ./data/fallback-events.json');
    const response = await fetch('./data/fallback-events.json');
    console.log('📁 Local fallback response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Local fallback failed: ${response.status}`);
    }
    
    const data = await response.json();
    const events = data.events || [];
    console.log('📁 Local fallback events loaded:', events.length);
    return events;
    
  } catch (error) {
    console.error('❌ Local fallback failed:', error);
    return null;
  }
}

async function fetchLiveAPI() {
  try {
    const response = await fetch(MMA_API_URL);
    console.log('📡 Live API response status:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📡 Raw live API response:', data);
    
    // Normalize response data
    const events = normalizeApiResponse(data);
    console.log('📡 Normalized live events count:', events.length);
    
    // Filter for UFC events
    const ufcEvents = filterUFCEvents(events);
    console.log('🥊 UFC events found in live API:', ufcEvents.length);
    
    return ufcEvents;
    
  } catch (error) {
    console.error('❌ Live API fetch failed:', error);
    return null;
  }
}

function normalizeApiResponse(data) {
  // Handle different response formats
  let events = [];
  
  if (Array.isArray(data)) {
    events = data;
  } else if (data && typeof data === 'object') {
    // Try common nested formats
    events = data.events || data.data || data.results || [];
  }
  
  console.log('📝 Normalized events from response:', events.length);
  return events;
}

function filterUFCEvents(events) {
  const ufcEvents = events.filter(event => {
    if (!event) return false;
    
    // Check multiple UFC-related fields with case-insensitive matching
    const name = (event.name || event.title || event.eventName || '').toLowerCase();
    const league = (event.league || event.organization || event.org || '').toLowerCase();
    const sport = (event.sport || '').toLowerCase();
    
    // Flexible UFC matching
    const isUFC = name.includes('ufc') || 
                  name.includes('ultimate fighting championship') ||
                  league.includes('ufc') ||
                  league.includes('ultimate fighting championship') ||
                  sport === 'mma' ||
                  name.includes('fight night');
    
    if (isUFC) {
      console.log('🥊 UFC event found:', name);
    }
    
    return isUFC;
  });
  
  return ufcEvents;
}

async function processEvents(events) {
  console.log('⚙️ Processing', events.length, 'events...');
  
  const processedEvents = [];
  const allFightersList = [];
  
  for (const event of events) {
    try {
      // Build event object with fallback values
      const eventObj = {
        id: event.id || event.eventId || `event-${Date.now()}`,
        name: event.name || event.title || event.eventName || 'UFC Event',
        date: event.date || event.eventDate || new Date().toISOString(),
        location: event.location || event.venue || 'TBA',
        fights: []
      };
      
      // Process fights
      if (event.fights && Array.isArray(event.fights)) {
        eventObj.fights = event.fights.map(fight => {
          const fighterA = buildFighterFromApi(fight.fighterA || fight.fighter_a || fight.fighter1);
          const fighterB = buildFighterFromApi(fight.fighterB || fight.fighter_b || fight.fighter2);
          
          // Add to fighters list
          allFightersList.push(fighterA, fighterB);
          
          return {
            fighterA,
            fighterB,
            weightClass: fight.weightClass || fight.weight_class || fight.weight || 'Unknown',
            eventName: eventObj.name,
            eventId: eventObj.id
          };
        });
      }
      
      processedEvents.push(eventObj);
      console.log(`✅ Processed event: ${eventObj.name} with ${eventObj.fights.length} fights`);
      
    } catch (error) {
      console.error('❌ Error processing event:', error, event);
    }
  }
  
  // Update global fighters list and populate dropdowns
  allFighters = removeDuplicateFighters(allFightersList);
  populateFighterDropdowns(allFighters);
  
  console.log('⚙️ Processing complete. Total fighters:', allFighters.length);
  return processedEvents;
}

function renderEvents(events) {
  console.log('🎯 Rendering events:', events.length);
  const eventsContainer = document.getElementById('events-container');
  
  if (!eventsContainer) {
    console.error('❌ Events container not found');
    return;
  }
  
  eventsContainer.innerHTML = '';
  
  if (events.length === 0) {
    console.log('⚠️ No events to render');
    eventsContainer.innerHTML = '<p class="no-events">No UFC events available</p>';
    return;
  }
  
  events.forEach(event => {
    const eventCard = renderEvent(event);
    eventsContainer.appendChild(eventCard);
    console.log(`✅ Rendered event card: ${event.name}`);
  });
  
  console.log(`✅ Successfully rendered ${events.length} events`);
}

function showLoadingState() {
  const loadingState = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');
  const eventsContainer = document.getElementById('events-container');
  
  if (loadingState) loadingState.classList.remove('hidden');
  if (emptyState) emptyState.classList.add('hidden');
  if (eventsContainer) eventsContainer.innerHTML = '';
}

function hideLoadingState() {
  const loadingState = document.getElementById('loading-state');
  if (loadingState) loadingState.classList.add('hidden');
}

function showStatusBanner() {
  const banner = document.getElementById('data-status-banner');
  if (banner) {
    banner.classList.remove('hidden');
    console.log('🚩 Status banner shown: Live UFC data unavailable — showing fallback fights');
  }
}

function hideStatusBanner() {
  const banner = document.getElementById('data-status-banner');
  if (banner) {
    banner.classList.add('hidden');
    console.log('🚩 Status banner hidden');
  }
}

function showErrorState() {
  hideLoadingState();
  const emptyState = document.getElementById('empty-state');
  const eventsContainer = document.getElementById('events-container');
  
  if (emptyState) {
    emptyState.classList.remove('hidden');
    emptyState.innerHTML = `
      <p>Unable to load UFC events. Please try refreshing the page.</p>
      <button class="btn btn-primary" onclick="fetchUpcomingEvents()">Try Again</button>
    `;
  }
  
  if (eventsContainer) eventsContainer.innerHTML = '';
}

async function refreshData() {
  console.log('🔄 Refreshing data...');
  refreshBtn.disabled = true;
  
  try {
    await fetchUpcomingEvents();
    console.log('✅ Data refreshed successfully');
  } catch (error) {
    console.error('❌ Refresh failed:', error);
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
  // Initialize all features
  refreshBtn.addEventListener("click", () => {
    refreshData();
  });

  // Initialize account system
  initializeAccountSystem();

  // Initialize search functionality
  initializeFighterSearch();
  
  // Initialize modal
  initializeModal();
  
  // Initialize simulator
  initializeSimulator();
  
  // Initialize comparison
  initializeComparison();
  
  // Initialize leaderboard
  initializeLeaderboard();
  
  // Initialize navigation
  initializeNavigation();

  // Load initial data
  refreshData();
  startAutoRefresh();
  
  // Initialize leaderboard with data
  updateLeaderboard();
  
  // Resolve demo results periodically
  setInterval(resolveDemoResults, 30000); // Check every 30 seconds
});

// Navigation functionality
function initializeNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remove active class from all links
      navLinks.forEach(l => l.classList.remove('active'));
      
      // Add active class to clicked link
      link.classList.add('active');
      
      // Scroll to section
      const targetId = link.getAttribute('href').substring(1);
      const targetSection = document.getElementById(targetId);
      
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

