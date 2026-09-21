import { useState } from "react";
import type { DemoIdentity } from "./api";

type Props = {
  onContinue: (identity: DemoIdentity) => void;
};

export function SignIn({ onContinue }: Props) {
  const [objectId, setObjectId] = useState("admin-1");
  const [role, setRole] = useState<"ADMIN" | "EMPLOYEE">("ADMIN");

  return (
    <main className="inventory">
      <p className="eyebrow">BorrowHub · admin</p>
      <h1>Sign in</h1>
      <p>
        Local demo identity. Microsoft Entra PKCE stays disabled until an Entra tenant exists (
        <code>P0-01</code>).
      </p>
      <form
        className="filters"
        onSubmit={(event) => {
          event.preventDefault();
          const next = objectId.trim();
          if (next.length === 0) {
            return;
          }
          onContinue({ objectId: next, role });
        }}
      >
        <label>
          Demo object id
          <input
            name="objectId"
            value={objectId}
            onChange={(event) => setObjectId(event.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <fieldset>
          <legend>Role</legend>
          <label>
            <input type="radio" name="role" checked={role === "ADMIN"} onChange={() => setRole("ADMIN")} /> Admin
          </label>
          <label>
            <input type="radio" name="role" checked={role === "EMPLOYEE"} onChange={() => setRole("EMPLOYEE")} />{" "}
            Employee (admin APIs will return 403)
          </label>
        </fieldset>
        <button type="submit">Continue</button>
      </form>
    </main>
  );
}
