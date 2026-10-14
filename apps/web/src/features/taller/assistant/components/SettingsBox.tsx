import { ASSISTANT_TONES, type AssistantSettings } from "@mini-galu/contracts";

type Toggle = "whatsappFallback" | "giftcardWhenNoSize" | "onlyInStock";

const TOGGLES: [Toggle, string][] = [
  ["whatsappFallback", "Derivar a WhatsApp si no sabe"],
  ["giftcardWhenNoSize", "Ofrecer gift card cuando no hay talle"],
  ["onlyInStock", "Mostrar solo prendas con stock"],
];

type Props = { settings: AssistantSettings; busy: boolean; onChange: (s: AssistantSettings) => void };

/** Ajustes — admin-galu.html */
export function SettingsBox({ settings, busy, onChange }: Props) {
  return (
    <section className="box" style={{ display: "grid", gap: 12 }}>
      <div className="box-head" style={{ margin: 0 }}>
        <h2>Ajustes</h2>
      </div>
      {TOGGLES.map(([key, label]) => (
        <label key={key} className="switch">
          {label}
          <input
            className="tog"
            type="checkbox"
            checked={settings[key]}
            disabled={busy}
            onChange={(e) => onChange({ ...settings, [key]: e.target.checked })}
          />
        </label>
      ))}
      <div className="field">
        <label htmlFor="tone">Tono</label>
        <select
          className="input"
          id="tone"
          value={settings.tone}
          disabled={busy}
          onChange={(e) => onChange({ ...settings, tone: e.target.value as AssistantSettings["tone"] })}
        >
          {Object.entries(ASSISTANT_TONES).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
