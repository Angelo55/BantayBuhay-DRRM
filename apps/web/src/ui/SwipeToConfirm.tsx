import { Check, ChevronsRight } from "lucide-react";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { cx } from "./cx";

const HANDLE = 48;
const PADDING = 8;

interface SwipeProps {
  label: string;
  doneLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
}

// A deliberate confirmation for high-stakes actions such as dispatch: drag the black handle
// to the end. WCAG 2.5.1 needs a single-tap alternative, so a plain button sits underneath,
// and the focused handle also confirms with Enter or the right arrow key.
export function SwipeToConfirm({ label, doneLabel, onConfirm, disabled }: SwipeProps) {
  const track = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [done, setDone] = useState(false);
  const reduced = useReducedMotion();

  const travel = () => (track.current ? track.current.offsetWidth - HANDLE - PADDING * 2 : 0);

  function confirm() {
    if (done || disabled) return;
    setDone(true);
    animate(x, travel(), reduced ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 32 });
    onConfirm();
  }

  return (
    <div>
      <div
        ref={track}
        className={cx(
          "relative flex h-16 items-center rounded-full p-2 transition-colors duration-200",
          done ? "bg-accent" : "bg-card-muted",
          disabled && "opacity-45",
        )}
      >
        <motion.button
          type="button"
          aria-label={done ? doneLabel : `${label}. Drag to the end, or press Enter`}
          disabled={disabled || done}
          drag={disabled || done ? false : "x"}
          dragConstraints={track}
          dragElastic={0}
          dragMomentum={false}
          style={{ x }}
          onDragEnd={() => {
            if (x.get() >= travel() * 0.85) confirm();
            else animate(x, 0, reduced ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 32 });
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "ArrowRight") {
              event.preventDefault();
              confirm();
            }
          }}
          className="relative z-10 flex h-12 w-12 cursor-grab touch-none items-center justify-center rounded-control bg-inverse text-on-inverse active:cursor-grabbing"
        >
          <Check aria-hidden="true" size={22} strokeWidth={2} />
        </motion.button>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 font-display text-[15px] font-medium text-fg-2"
        >
          {done ? (
            <span className="text-on-accent">{doneLabel}</span>
          ) : (
            <>
              <ChevronsRight size={18} strokeWidth={1.75} />
              {label}
            </>
          )}
        </span>
        <span
          aria-hidden="true"
          className="ml-auto flex h-12 w-12 items-center justify-center rounded-control bg-card text-fg-2"
        >
          <Check size={20} strokeWidth={1.75} />
        </span>
      </div>
      {!done && (
        <button
          type="button"
          disabled={disabled}
          onClick={confirm}
          className="mt-2 min-h-11 px-2 text-[13px] text-fg-2 underline underline-offset-4 hover:text-fg"
        >
          {label} without swiping
        </button>
      )}
    </div>
  );
}
