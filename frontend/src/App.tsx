import { useEffect, useState } from "react";
import { EQUIPMENT_SLOTS, type GearItem, type ParsedProfile } from "@localcraft/shared";

const profileStorageKey = "localcraft.simc-profile";
const labels: Record<string, string> = {
  main_hand: "Main Hand", off_hand: "Off Hand", finger1: "Finger 1", finger2: "Finger 2",
  trinket1: "Trinket 1", trinket2: "Trinket 2",
};
const title = (value: string) => labels[value] ?? value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const itemName = (item: GearItem) => item.name ?? `Item ${item.itemId ?? "unknown"}`;

export default function App() {
  const [simcText, setSimcText] = useState(() => localStorage.getItem(profileStorageKey) ?? "");
  const [profile, setProfile] = useState<ParsedProfile>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

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

  return <main>
    <header><div className="brand">Local<span>Craft</span></div><nav><a className="active">Quick Sim</a><a>Gear Compare</a></nav></header>
    <section className="hero"><p className="eyebrow">LOCAL SIMULATIONCRAFT TOOL</p><h1>Start with your character profile.</h1><p>Paste the output from the World of Warcraft SimulationCraft addon. Simulation runs arrive in the next phase.</p></section>
    <section className="card input-card"><label htmlFor="profile">SimulationCraft profile</label><textarea id="profile" value={simcText} onChange={(event) => setSimcText(event.target.value)} placeholder="Paste /simc output here…" spellCheck={false} />
      <div className="actions"><span>{simcText.length ? `${simcText.length.toLocaleString()} characters saved locally` : "Your profile stays in this browser."}</span><button onClick={parseProfile} disabled={loading}>{loading ? "Parsing…" : "Parse profile"}</button></div>
      {error && <p className="error">{error}</p>}
    </section>
    {profile && <section className="results">
      <div className="card character"><p className="eyebrow">CHARACTER</p><h2>{profile.characterName ?? "Character not detected"}</h2><p>{[profile.specialization && title(profile.specialization), profile.characterClass && title(profile.characterClass)].filter(Boolean).join(" · ") || "Class and specialization not found"}</p>{profile.talents && <code>Talents: {profile.talents}</code>}</div>
      <div className="card"><div className="section-title"><div><p className="eyebrow">EQUIPPED GEAR</p><h2>Current equipment</h2></div><span>{profile.equippedGear.length} found</span></div><div className="gear-grid">{EQUIPMENT_SLOTS.map((slot) => { const item = profile.equippedGear.find((entry) => entry.slot === slot); return <article key={slot} className="gear-item"><span>{title(slot)}</span><strong>{item ? itemName(item) : "Not found"}</strong>{item && <small>{item.itemLevel ? `Item level ${item.itemLevel}` : "Item level unavailable"}{item.itemId && ` · ID ${item.itemId}`}</small>}</article>; })}</div></div>
      <div className="card"><div className="section-title"><div><p className="eyebrow">ALTERNATIVES</p><h2>Detected bag items</h2></div><span>{profile.bagItems.length} found</span></div>{profile.bagItems.length ? <div className="bag-list">{profile.bagItems.map((item, index) => <article key={`${item.rawDefinition}-${index}`}><strong>{itemName(item)}</strong><span>{title(item.slot)}{item.itemLevel && ` · Item level ${item.itemLevel}`}</span></article>)}</div> : <p className="empty">No alternate items were detected in the pasted profile.</p>}</div>
    </section>}
  </main>;
}
