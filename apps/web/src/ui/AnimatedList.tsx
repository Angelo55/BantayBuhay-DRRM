import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { cx } from "./cx";
import { DISTANCE, transition } from "./motion";

// A list whose items arrive, leave and reorder with motion, so a change in a live queue is easy
// to follow. Items already there on first render don't animate; only later changes do.
export function AnimatedList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ul className={cx("space-y-2", className)}>
      <AnimatePresence initial={false}>{children}</AnimatePresence>
    </ul>
  );
}

// One item. Give it a stable key (the record's id), as with any list item.
export function AnimatedItem({ children }: { children: ReactNode }) {
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: -DISTANCE.sm }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, transition: transition.exit }}
      transition={transition.fast}
    >
      {children}
    </motion.li>
  );
}
