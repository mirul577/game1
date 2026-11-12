import { GameView } from "./views/GameView.js";
import { GameViewModel } from "./viewmodels/GameViewModel.js";
import { ShopViewModel } from "./viewmodels/ShopViewModel.js";

const view = new GameView();
const gameVM = new GameViewModel(view);
const shopVM = new ShopViewModel(gameVM);

document.getElementById("startButton").addEventListener("click", () => {
  const name = document.getElementById("nameInput").value.trim() || "Adventurer";
  const characterClass = document.getElementById("classInput").value;
  document.getElementById("startModal").classList.add("hidden");
  gameVM.start(name, characterClass);
});

document.getElementById("interactButton").addEventListener("click", () => gameVM.collectOrInteract());
document.getElementById("potionButton").addEventListener("click", () => gameVM.usePotion());
document.getElementById("skillButton").addEventListener("click", () => gameVM.castSkill());
document.getElementById("eatButton").addEventListener("click", () => gameVM.feed());
document.getElementById("drinkButton").addEventListener("click", () => gameVM.drink());
document.getElementById("foundKingdomButton").addEventListener("click", () => gameVM.createKingdom(document.getElementById("kingdomNameInput").value));
document.getElementById("recruitGuardButton").addEventListener("click", () => gameVM.recruitGuard());
document.getElementById("declareWarButton").addEventListener("click", () => gameVM.declareWar());
document.querySelectorAll("[data-craft]").forEach(button => {
  button.addEventListener("click", () => gameVM.craft(button.dataset.craft));
});
document.querySelectorAll("[data-buy]").forEach(button => {
  button.addEventListener("click", () => shopVM.purchase(button.dataset.buy));
});
const mapModal = document.getElementById("worldMapModal");
function toggleWorldMap(force) {
  const shouldOpen = typeof force === "boolean" ? force : mapModal.classList.contains("hidden");
  mapModal.classList.toggle("hidden", !shouldOpen);
  if (shouldOpen) view.drawWorldMap(gameVM);
}
document.getElementById("mapButton").addEventListener("click", () => toggleWorldMap());
document.getElementById("closeMapButton").addEventListener("click", () => toggleWorldMap(false));

// Quest journal (J): the view renders whatever QuestViewModel returns for the selected tab.
const journalModal = document.getElementById("questJournal");
let journalTab = "active";
function renderJournal() {
  view.renderJournal(gameVM.quests.getJournal(journalTab), journalTab, { onAbandon: id => gameVM.quests.abandon(id) });
}
function toggleJournal(force) {
  const shouldOpen = typeof force === "boolean" ? force : journalModal.classList.contains("hidden");
  journalModal.classList.toggle("hidden", !shouldOpen);
  if (shouldOpen) renderJournal();
}
gameVM.onQuestUpdate = () => { if (!journalModal.classList.contains("hidden")) renderJournal(); };
document.querySelectorAll("#journalTabs [data-tab]").forEach(button => {
  button.addEventListener("click", () => { journalTab = button.dataset.tab; renderJournal(); });
});
document.getElementById("journalButton").addEventListener("click", () => toggleJournal());
document.getElementById("openJournalButton").addEventListener("click", () => toggleJournal(true));
document.getElementById("closeJournalButton").addEventListener("click", () => toggleJournal(false));
document.getElementById("dlgClose").addEventListener("click", () => gameVM.closeDialogue());

document.addEventListener("keydown", event => {
  const target = event.target;
  const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
  if (typing) {
    if (event.key === "Escape") target.blur();
    return;
  }
  const key = event.key.toLowerCase();
  if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(key)) event.preventDefault();
  if (key === "m") { event.preventDefault(); toggleWorldMap(); return; }
  if (key === "j" && gameVM.running) { event.preventDefault(); if (!event.repeat) toggleJournal(); return; }
  if (key === "escape" && !mapModal.classList.contains("hidden")) { toggleWorldMap(false); return; }
  if (key === "escape" && !journalModal.classList.contains("hidden")) { toggleJournal(false); return; }
  if (key === "escape") gameVM.closeDialogue();
  if (!gameVM.running) return;

  // One-shot actions are triggered only once per key press, not every held frame.
  if (event.repeat && !["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(key)) return;
  gameVM.keys[key] = true;
  if (key === "e") gameVM.collectOrInteract();
  if (key === "q") gameVM.castSkill();
  if (key === "h") gameVM.usePotion();
  if (key === "f") gameVM.feed();
  if (key === "v") gameVM.drink();
  if (key === "c") gameVM.craft("potion");
  if (key === "x") gameVM.craft("sword");
  if (key === "b") gameVM.craft("camp");
  if (key === "k") gameVM.createKingdom(document.getElementById("kingdomNameInput").value);
  if (key === "r") gameVM.recruitGuard();
  if (key === "t") gameVM.declareWar();
  if (event.code === "Space") gameVM.attack();
});
document.addEventListener("keyup", event => { gameVM.keys[event.key.toLowerCase()] = false; });

// Signal successful module initialization to the startup guard.
window.MATHORIA_BOOTED = true;
