export function AppHeader({ onHide }: { onHide?: () => void }) {
  return (
    <header className="solanum-header sol:flex sol:items-center sol:justify-between sol:mb-[18px]">
      <div>
        <span className="solanum-eyebrow">A LITTLE EVERY DAY</span>
        <h1>
          Solanum <span aria-hidden="true">🍅</span>
        </h1>
      </div>
      {onHide && <button onClick={onHide}>Hide timer controls</button>}
    </header>
  );
}
