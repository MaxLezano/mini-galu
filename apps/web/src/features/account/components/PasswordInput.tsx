"use client";

import { PASSWORD_RULES } from "@mini-galu/contracts";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

type Props = {
  id: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  /** Muestra las reglas (8+, mayúscula, minúscula, número y especial) y cuáles ya cumple. */
  rules?: boolean;
};

/** Contraseña con el ojo para mostrarla (ingresar.html → .pass). */
export function PasswordInput({ id, name, autoComplete, placeholder = "••••••••", rules = false }: Props) {
  const [show, setShow] = useState(false);
  const [value, setValue] = useState("");
  return (
    <>
      <div className="pass">
        <input
          className="input"
          id={id}
          name={name}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={8}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          type="button"
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff className="i-sm" /> : <Eye className="i-sm" />}
        </button>
      </div>
      {rules && (
        <ul className="pw-rules" aria-label="La contraseña necesita">
          {PASSWORD_RULES.map((r) => (
            <li key={r.message} className={r.test(value) ? "ok" : ""}>
              {r.test(value) ? "✓" : "·"} {r.message}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
