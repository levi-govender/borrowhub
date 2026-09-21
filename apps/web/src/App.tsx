export function App() {
  return (
    <main>
      <p className="eyebrow">BorrowHub · admin</p>
      <h1>Workplace equipment bookings</h1>
      <p>
        Administrators will manage inventory, loans, and audit from this browser
        app. This screen is the Phase 0 starter shell.
      </p>
      <ul>
        <li>Clients talk only to the TypeScript BFF</li>
        <li>Java owns booking rules and persistence</li>
        <li>Default: separate web and mobile apps (DEC-01)</li>
      </ul>
    </main>
  );
}
