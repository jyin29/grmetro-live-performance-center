import { fetchDashboardPeriod, setDashboardPeriod } from "./api/managementApi";

const OPTIONS = [
  ["today", "Today"], ["yesterday", "Yesterday"], ["wtd", "Week to Date"], ["last-week", "Last Week"],
  ["mtd", "Month to Date"], ["last-month", "Last Month"], ["qtd", "Quarter to Date"], ["last-quarter", "Last Quarter"],
  ["ytd", "Year to Date"], ["last-year", "Last Year"], ["last-7-days", "Last 7 Days"], ["last-30-days", "Last 30 Days"]
];
const LABELS = Object.fromEntries(OPTIONS);

function install() {
  if (window.location.pathname !== "/remote") return;
  const card = document.querySelector(".dashboard-period-card");
  if (!card || card.querySelector(".dashboard-period-select")) return;
  const oldToggle = card.querySelector(".dashboard-period-toggle");
  if (!oldToggle) return;
  oldToggle.hidden = true;
  const wrap = document.createElement("label");
  wrap.className = "dashboard-period-select";
  wrap.innerHTML = `<span>Range</span><select aria-label="Select reporting period">${OPTIONS.map(([value,label])=>`<option value="${value}">${label}</option>`).join("")}</select>`;
  oldToggle.insertAdjacentElement("afterend", wrap);
  const select = wrap.querySelector("select");
  const title = card.querySelector("div:first-child strong");
  fetchDashboardPeriod().then(({period}) => { select.value = period; if (title) title.textContent = LABELS[period] || period; }).catch(()=>{});
  select.addEventListener("change", async () => {
    const previous = select.dataset.current || select.value;
    select.disabled = true;
    try {
      const result = await setDashboardPeriod(select.value);
      select.dataset.current = result.period;
      select.value = result.period;
      if (title) title.textContent = LABELS[result.period] || result.period;
      window.location.reload();
    } catch (error) {
      select.value = previous;
      select.disabled = false;
    }
  });
}

const observer = new MutationObserver(install);
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { install(); observer.observe(document.body,{childList:true,subtree:true}); });
else { install(); observer.observe(document.body,{childList:true,subtree:true}); }
