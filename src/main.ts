console.log("Monkey Pirate dev shell ready.");
const card = document.querySelector(".card");
if (card) {
  const p = document.createElement("p");
  p.textContent = "Tooling OK: TypeScript + Vite running. Next step: migrate systems.";
  card.appendChild(p);
}
