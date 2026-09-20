import { useEffect, useState } from "react";
import { EQUIPMENT_SLOTS, SIMULATION_FIGHT_STYLES, type EquipmentSlot, type GearCompareResult, type GearItem, type ParsedProfile, type QuickSimResult, type SimulationSettings } from "@localcraft/shared";

const profileStorageKey = "localcraft.simc-profile";
const labels: Record<string, string> = {
  main_hand: "Main Hand", off_hand: "Off Hand", finger1: "Finger 1", finger2: "Finger 2",
  trinket1: "Trinket 1", trinket2: "Trinket 2",
  HecticAddCleave: "Hectic Add Cleave", LightMovement: "Light Movement", HeavyMovement: "Heavy Movement",
  DungeonSlice: "Dungeon Slice",
};
const title = (value: string) => labels[value] ?? value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const itemName = (item: GearItem) => item.name ?? `Item ${item.itemId ?? "unknown"}`;
const formatNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export default function App() {
  const [simcText, setSimcText] = useState(() => localStorage.getItem(profileStorageKey) ?? "");
  const [profile, setProfile] = useState<ParsedProfile>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState<string>();
  const [technicalDetails, setTechnicalDetails] = useState<string>();
  const [rawResult, setRawResult] = useState<Record<string, unknown>>();
  const [quickSimResult, setQuickSimResult] = useState<QuickSimResult>();
  const [activeView, setActiveView] = useState<"quick" | "gear">("quick");
  const [compareSlot, setCompareSlot] = useState<EquipmentSlot>();
  const [selectedCandidates, setSelectedCandidates] = useState<GearItem[]>([]);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState<string>();
  const [gearCompareResult, setGearCompareResult] = useState<GearCompareResult>();
  const [settings, setSettings] = useState<SimulationSettings>({ iterations: 10_000, fightStyle: "Patchwerk", desiredTargets: 1, maxTime: 300 });

  useEffect(() => { localStorage.setItem(profileStorageKey, simcText); }, [simcText]);

  async function parseProfile() {
    setLoading(true); setError(undefined);
    try {
      const response = await fetch("/api/profile/parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ simcText }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not parse the profile.");
      setProfile(data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not contact the LocalCraft API."); }
    finally { setLoading(false); }
  }

  async function runQuickSim() {
    setSimulating(true); setSimulationError(undefined); setTechnicalDetails(undefined); setRawResult(undefined); setQuickSimResult(undefined);
    try {
      const response = await fetch("/api/sim/quick", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ simcText, settings }) });
      const data = await response.json();
      if (!response.ok) {
        setTechnicalDetails(data.technicalDetails);
        throw new Error(data.error ?? "Could not run the simulation.");
      }
      setQuickSimResult(data.result);
      setRawResult(data.rawResult);
    } catch (cause) { setSimulationError(cause instanceof Error ? cause.message : "Could not contact the LocalCraft API."); }
    finally { setSimulating(false); }
  }

  function selectSlot(slot: EquipmentSlot) {
    setCompareSlot(slot); setSelectedCandidates([]); setGearCompareResult(undefined); setCompareError(undefined); setActiveView("gear");
  }

  function toggleCandidate(item: GearItem) {
    setSelectedCandidates((items) => items.some((entry) => entry.rawDefinition === item.rawDefinition)
      ? items.filter((entry) => entry.rawDefinition !== item.rawDefinition) : [...items, item]);
  }

  async function runGearCompare() {
    if (!compareSlot) return;
    setComparing(true); setCompareError(undefined); setGearCompareResult(undefined);
    try {
      const response = await fetch("/api/sim/gear-compare", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ simcText, slot: compareSlot, candidateItems: selectedCandidates, settings }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not run the comparison.");
      setGearCompareResult(data.result);
    } catch (cause) { setCompareError(cause instanceof Error ? cause.message : "Could not contact the LocalCraft API."); }
    finally { setComparing(false); }
  }

  const equippedItem = compareSlot ? profile?.equippedGear.find((item) => item.slot === compareSlot) : undefined;
  const candidates = compareSlot ? profile?.bagItems.filter((item) => item.slot === compareSlot) ?? [] : [];

  return <main>
    <header><div className="brand">Local<span>Craft</span></div><nav><button className={activeView === "quick" ? "nav-active" : "nav-button"} onClick={() => setActiveView("quick")}>Quick Sim</button><button className={activeView === "gear" ? "nav-active" : "nav-button"} onClick={() => setActiveView("gear")}>Gear Compare</button></nav></header>
    <section className="hero"><p className="eyebrow">LOCAL SIMULATIONCRAFT TOOL</p><h1>{activeView === "quick" ? "Run a quick simulation." : "Compare your gear."}</h1><p>{activeView === "quick" ? "Paste the output from the World of Warcraft SimulationCraft addon, choose your settings, and run SimulationCraft locally through Docker." : "Choose an equipped slot and test bag alternatives in one SimulationCraft profileset run."}</p></section>
    <section className="card input-card"><label htmlFor="profile">SimulationCraft profile</label><textarea id="profile" value={simcText} onChange={(event) => setSimcText(event.target.value)} placeholder="Paste /simc output here…" spellCheck={false} />
      <div className="actions"><span>{simcText.length ? `${simcText.length.toLocaleString()} characters saved locally` : "Your profile stays in this browser."}</span><button onClick={parseProfile} disabled={loading}>{loading ? "Parsing…" : "Parse profile"}</button></div>
      {error && <p className="error">{error}</p>}
    </section>
    {activeView === "quick" && <section className="card simulation-card"><div className="section-title"><div><p className="eyebrow">QUICK SIM</p><h2>Simulation settings</h2></div><span>Docker-backed</span></div>
      <div className="settings-grid"><label>Iterations<input type="number" min="1" value={settings.iterations} onChange={(event) => setSettings({ ...settings, iterations: Number(event.target.value) })} /></label><label>Simulation method<select value={settings.fightStyle} onChange={(event) => setSettings({ ...settings, fightStyle: event.target.value })}>{SIMULATION_FIGHT_STYLES.map((style) => <option key={style} value={style}>{title(style)}</option>)}</select></label><label>Targets<input type="number" min="1" value={settings.desiredTargets} onChange={(event) => setSettings({ ...settings, desiredTargets: Number(event.target.value) })} /></label><label>Max time (seconds)<input type="number" min="1" value={settings.maxTime} onChange={(event) => setSettings({ ...settings, maxTime: Number(event.target.value) })} /></label></div>
      <div className="actions"><span>Uses {settings.iterations.toLocaleString()} iterations with the local SimulationCraft image.</span><button onClick={runQuickSim} disabled={simulating || !simcText.trim()}>{simulating ? "Running simulation…" : "Run Quick Sim"}</button></div>
      {simulationError && <p className="error">{simulationError}</p>}
      {technicalDetails && <details className="details"><summary>Technical details</summary><pre>{technicalDetails}</pre></details>}
      {quickSimResult && <section className="quick-result" aria-live="polite"><div className="result-summary"><p className="eyebrow">TOTAL DPS</p><strong>{formatNumber.format(quickSimResult.dps)}</strong><span>DPS{quickSimResult.dpsError !== undefined && ` ± ${formatNumber.format(quickSimResult.dpsError)}`}</span><p>{[quickSimResult.characterName, quickSimResult.specialization, quickSimResult.durationSeconds && `${quickSimResult.durationSeconds.toFixed(0)} sec simulation`].filter(Boolean).join(" · ")}</p></div><div className="damage-card"><div className="section-title"><div><p className="eyebrow">DAMAGE</p><h2>Damage breakdown</h2></div><span>{quickSimResult.damageBreakdown.length} abilities</span></div>{quickSimResult.damageBreakdown.length ? <div className="damage-list">{quickSimResult.damageBreakdown.map((entry) => <article key={entry.name}><div><strong>{entry.name}</strong><span>{formatNumber.format(entry.damage)} damage</span></div><b>{entry.percentage.toFixed(1)}%</b><i><em style={{ width: `${Math.min(entry.percentage, 100)}%` }} /></i></article>)}</div> : <p className="empty">SimulationCraft did not provide an ability-level damage breakdown.</p>}</div></section>}
      {rawResult && <details className="details"><summary>Raw result (debugging)</summary><pre>{JSON.stringify(rawResult, null, 2)}</pre></details>}
    </section>}
    {activeView === "gear" && <section className="card simulation-card"><div className="section-title"><div><p className="eyebrow">GEAR COMPARE</p><h2>{compareSlot ? `Compare ${title(compareSlot)}` : "Choose a gear slot"}</h2></div><span>Profileset run</span></div>
      <div className="settings-grid compare-settings"><label>Iterations<input type="number" min="1" value={settings.iterations} onChange={(event) => setSettings({ ...settings, iterations: Number(event.target.value) })} /></label><label>Simulation method<select value={settings.fightStyle} onChange={(event) => setSettings({ ...settings, fightStyle: event.target.value })}>{SIMULATION_FIGHT_STYLES.map((style) => <option key={style} value={style}>{title(style)}</option>)}</select></label><label>Targets<input type="number" min="1" value={settings.desiredTargets} onChange={(event) => setSettings({ ...settings, desiredTargets: Number(event.target.value) })} /></label><label>Max time (seconds)<input type="number" min="1" value={settings.maxTime} onChange={(event) => setSettings({ ...settings, maxTime: Number(event.target.value) })} /></label></div>
      {!profile ? <p className="empty">Parse a SimulationCraft profile first to discover your equipped and bag gear.</p> : <><div className="slot-picker">{EQUIPMENT_SLOTS.map((slot) => <button key={slot} className={compareSlot === slot ? "slot-selected" : "slot-button"} disabled={!profile.equippedGear.some((item) => item.slot === slot)} onClick={() => selectSlot(slot)}>{title(slot)}</button>)}</div>
      {compareSlot && <div className="compare-panel"><p><span className="muted">Current</span><strong>{equippedItem ? itemName(equippedItem) : "No equipped item found"}</strong></p>{candidates.length ? <div className="candidate-list">{candidates.map((item, index) => <label key={`${item.rawDefinition}-${index}`}><input type="checkbox" checked={selectedCandidates.some((entry) => entry.rawDefinition === item.rawDefinition)} onChange={() => toggleCandidate(item)} /><span><strong>{itemName(item)}</strong><small>{item.itemLevel && `Item level ${item.itemLevel}`}</small></span></label>)}</div> : <p className="empty">No alternative items were found for this slot.</p>}<div className="actions"><span>{selectedCandidates.length} candidate{selectedCandidates.length === 1 ? "" : "s"} selected</span><button disabled={!selectedCandidates.length || comparing} onClick={runGearCompare}>{comparing ? "Running comparison…" : "Run comparison"}</button></div></div>}
      {compareError && <p className="error">{compareError}</p>}{gearCompareResult && <div className="comparison-results"><article className="comparison-row baseline"><span>Current</span><strong>{itemName(gearCompareResult.baseline.item)}</strong><b>{formatNumber.format(gearCompareResult.baseline.dps)} DPS</b></article>{gearCompareResult.candidates.map((entry, index) => <article className="comparison-row" key={`${entry.item.rawDefinition}-${index}`}><span>Candidate</span><strong>{itemName(entry.item)}</strong><b>{formatNumber.format(entry.dps)} DPS <i className={entry.difference >= 0 ? "positive" : "negative"}>{entry.difference >= 0 ? "+" : ""}{formatNumber.format(entry.difference)} · {entry.percentageDifference >= 0 ? "+" : ""}{entry.percentageDifference.toFixed(2)}%</i></b></article>)}</div>}</>}</section>}
    {profile && <section className="results">
      <div className="card character"><p className="eyebrow">CHARACTER</p><h2>{profile.characterName ?? "Character not detected"}</h2><p>{[profile.specialization && title(profile.specialization), profile.characterClass && title(profile.characterClass)].filter(Boolean).join(" · ") || "Class and specialization not found"}</p>{profile.talents && <code>Talents: {profile.talents}</code>}</div>
      <div className="card"><div className="section-title"><div><p className="eyebrow">EQUIPPED GEAR</p><h2>Current equipment</h2></div><span>{profile.equippedGear.length} found</span></div><div className="gear-grid">{EQUIPMENT_SLOTS.map((slot) => { const item = profile.equippedGear.find((entry) => entry.slot === slot); return <article key={slot} className="gear-item" onClick={() => item && selectSlot(slot)}><span>{title(slot)}</span><strong>{item ? itemName(item) : "Not found"}</strong>{item && <small>{item.itemLevel ? `Item level ${item.itemLevel}` : "Item level unavailable"}{item.itemId && ` · ID ${item.itemId}`}</small>}</article>; })}</div></div>
      <div className="card"><div className="section-title"><div><p className="eyebrow">ALTERNATIVES</p><h2>Detected bag items</h2></div><span>{profile.bagItems.length} found</span></div>{profile.bagItems.length ? <div className="bag-list">{profile.bagItems.map((item, index) => <article key={`${item.rawDefinition}-${index}`}><strong>{itemName(item)}</strong><span>{title(item.slot)}{item.itemLevel && ` · Item level ${item.itemLevel}`}</span></article>)}</div> : <p className="empty">No alternate items were detected in the pasted profile.</p>}</div>
    </section>}
  </main>;
}
