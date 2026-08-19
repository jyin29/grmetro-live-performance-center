import { useEffect, useState } from "react";
export function AdminSection({ id, title, description, children, expandable = false }) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!expanded) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => { if (event.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKeyDown); };
  }, [expanded]);
  const expandedStyle = expanded ? { position:"fixed", inset:"10px", zIndex:4000, width:"auto", maxWidth:"none", height:"auto", maxHeight:"none", margin:0, padding:"18px", background:"#fff", overflow:"auto", boxSizing:"border-box", boxShadow:"0 24px 80px rgba(0,0,0,.32)" } : undefined;
  return <section className={`admin-section${expanded?" admin-section--expanded":""}`} style={expandedStyle} id={id} aria-labelledby={`${id}-title`}>
    <header className="admin-section__header"><div><p className="admin-eyebrow">Read-only</p><h2 id={`${id}-title`}>{title}</h2></div><p>{description}</p>{expandable&&<button className="admin-expand" type="button" onClick={()=>setExpanded(v=>!v)}>{expanded?"Exit full view":"View full section"}</button>}</header>
    <div className="admin-section__content" style={expanded ? { minWidth:0, overflow:"auto" } : undefined}>{children}</div>
  </section>;
}
export function StatusPill({ value }) {const normalized=String(value??"unknown").toLowerCase();const positive=["running","available","connected","live","enabled"].includes(normalized);return <span className={`admin-status admin-status--${positive?"positive":"neutral"}`}>{value??"Unknown"}</span>;}
export function DefinitionGrid({ items }) {return <dl className="admin-definition-grid">{items.map(({label,value})=><div key={label}><dt>{label}</dt><dd>{value??"Not available"}</dd></div>)}</dl>;}
export function formatDuration(milliseconds){if(milliseconds==null)return"Not available";if(milliseconds>=60000&&milliseconds%60000===0)return`${milliseconds/60000} min`;return`${milliseconds/1000} sec`;}
export function describeCondition(condition){if(condition.all||condition.any){const joiner=condition.all?" AND ":" OR ";return(condition.all||condition.any).map(describeCondition).join(joiner);}const source=condition.source==="previous"?"previous ":"";const value=Array.isArray(condition.value)?condition.value.join(", "):String(condition.value);return`${source}${condition.path} ${condition.operator} ${value}`;}
export function describeAction(action){return[action.type,action.eventType||action.behavior||action.title].filter(Boolean).join(" · ");}
