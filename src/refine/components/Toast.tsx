export function Toast({ msg, show }: { msg: string; show: boolean }) {
  return (
    <div className={"toast" + (show ? " show" : "")}>
      <span className="ok">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
          <path d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <span>{msg}</span>
    </div>
  );
}
